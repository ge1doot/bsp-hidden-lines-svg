/* ===========================================================
 * BSP + Hidden-Line (true 3D, no 2D clipper)
 * =========================================================== */

import { v4 } from "../math/vec4.js";
import { m4 } from "../math/mat4.js";

export class Cad {
	constructor(world, camera, plotter) {
		this.bsp = world; // root BSP
		this.camera = camera;
		this.plot = plotter;

		this.polys = [];
		this.edges = []; // { a, b, faces:[p0,p1?] }

		// topology tolerances
		this.epsKey = 1 / 10000; // vertex quantization
		this.epsN = 1 / 10000; // plane normal epsilon
		this.epsD = 1 / 10000; // plane d epsilon

		// hidden-line params
		this.epsHit = 1 / 100000; // ray-plane epsilon
		this.pixelTol = 0.6; // screen-space tolerance
		this.maxSplit = 14; // recursion cap
		this.wMin = 0.05; // near-plane safety

		// temps (no allocs in hot loops)
		this._O = new Float64Array(4);
		this._D = new Float64Array(4);
		this._Q = new Float64Array(4);
		this._p2 = new Float64Array(2);
		this._p2a = new Float64Array(2);
		this._p2b = new Float64Array(2);
		this._p2m = new Float64Array(2);
		this._mid = Array.from(
			{ length: this.maxSplit + 2 },
			() => new Float64Array(4)
		);
		// stack traversal (BSP)
		this._stackNode = new Array(4096);
		this._stackT0   = new Float64Array(4096);
		this._stackT1   = new Float64Array(4096);
	}

	/* ===================== Private helpers ===================== */

	#collectNode(node) {
		for (const p of node.on) this.polys.push(p);
		if (node.in && node.in.node) this.#collectNode(node.in.node);
		if (node.out && node.out.node) this.#collectNode(node.out.node);
	}

	#key3(v, eps) {
		const x = Math.round(v[0] / eps);
		const y = Math.round(v[1] / eps);
		const z = Math.round(v[2] / eps);
		return x + "," + y + "," + z;
	}

	#coplanarPlanes(p0, p1) {
		const dot = p0[0] * p1[0] + p0[1] * p1[1] + p0[2] * p1[2];

		const epsN = 3 * this.epsN;
		const epsD = 10 * this.epsD;

		if (Math.abs(dot - 1) < epsN) return Math.abs(p0[3] - p1[3]) < epsD;
		if (Math.abs(dot + 1) < epsN) return Math.abs(p0[3] + p1[3]) < epsD;
		return false;
	}

	#clipWorldSegToWMin(A, B) {
		const wMin = this.wMin;

		// camera space endpoints
		const Ac = v4.multiplyMatrix(A, this.camera.viewing);
		const Bc = v4.multiplyMatrix(B, this.camera.viewing);

		const wa = Ac[3];
		const wb = Bc[3];

		const ina = wa >= wMin;
		const inb = wb >= wMin;

		if (ina && inb) return [A, B];
		if (!ina && !inb) return null;

		// t where w(t) = wMin in camera space
		const t = (wMin - wa) / (wb - wa);

		// interpolate in WORLD space (camera transform is linear)
		const C = [
			A[0] + (B[0] - A[0]) * t,
			A[1] + (B[1] - A[1]) * t,
			A[2] + (B[2] - A[2]) * t,
			1
		];

		return ina ? [A, C] : [C, B];
	}

	#edgeOnPolyBoundary(A, B, poly, plane) {
		// project everything to a stable 2D basis on the plane,
		// then test if AB matches some polygon boundary edge (colinear + overlap).

		const n = [plane[0], plane[1], plane[2], 0];

		let ux = 0,
			uy = 0,
			uz = 0;
		if (Math.abs(n[0]) < 0.9) {
			ux = 1;
			uy = 0;
			uz = 0;
		} else {
			ux = 0;
			uy = 1;
			uz = 0;
		}

		const u = v4.normalize(v4.crossProduct([ux, uy, uz, 0], n));
		const v = v4.normalize(v4.crossProduct(n, u));

		const ax = A[0] * u[0] + A[1] * u[1] + A[2] * u[2];
		const ay = A[0] * v[0] + A[1] * v[1] + A[2] * v[2];
		const bx = B[0] * u[0] + B[1] * u[1] + B[2] * u[2];
		const by = B[0] * v[0] + B[1] * v[1] + B[2] * v[2];

		const eps = 1 / 5000;

		const m = poly.length;
		for (let i = 0; i < m; i++) {
			const P = poly[i];
			const Q = poly[(i + 1) % m];

			const px = P[0] * u[0] + P[1] * u[1] + P[2] * u[2];
			const py = P[0] * v[0] + P[1] * v[1] + P[2] * v[2];
			const qx = Q[0] * u[0] + Q[1] * u[1] + Q[2] * u[2];
			const qy = Q[0] * v[0] + Q[1] * v[1] + Q[2] * v[2];

			const abx = bx - ax,
				aby = by - ay;
			const apx = px - ax,
				apy = py - ay;
			const aqx = qx - ax,
				aqy = qy - ay;

			const c1 = abx * apy - aby * apx;
			const c2 = abx * aqy - aby * aqx;
			if (Math.abs(c1) > eps || Math.abs(c2) > eps) continue;

			const denom = abx * abx + aby * aby;
			if (denom < eps) continue;

			const tp = (apx * abx + apy * aby) / denom;
			const tq = (aqx * abx + aqy * aby) / denom;

			const mn = Math.min(tp, tq);
			const mx = Math.max(tp, tq);

			if (mn <= 0 + 5 * eps && mx >= 1 - 5 * eps) return true;
		}

		return false;
	}

	#pointInConvexPoly3D(Q, poly, plane) {
		// winding-agnostic half-space test:
		// inside if all edge tests have same sign (within eps)
		const nx = plane[0],
			ny = plane[1],
			nz = plane[2];
		const n = poly.length;

		let pos = false,
			neg = false;

		for (let i = 0; i < n; i++) {
			const A = poly[i];
			const B = poly[(i + 1) % n];

			const abx = B[0] - A[0],
				aby = B[1] - A[1],
				abz = B[2] - A[2];
			const aqx = Q[0] - A[0],
				aqy = Q[1] - A[1],
				aqz = Q[2] - A[2];

			const cx = aby * aqz - abz * aqy;
			const cy = abz * aqx - abx * aqz;
			const cz = abx * aqy - aby * aqx;

			const s = cx * nx + cy * ny + cz * nz;

			if (s > this.epsHit) pos = true;
			else if (s < -this.epsHit) neg = true;

			if (pos && neg) return false;
		}
		return true;
	}

	#bspAnyHitBeforeIter(tree, O, D, tMax, f0, f1) {
  if (!tree || !tree.node) return false;

  const eps = this.epsHit;

  const stNode = this._stackNode;
  const stT0   = this._stackT0;
  const stT1   = this._stackT1;

  let sp = 0;
  stNode[0] = tree.node;
  stT0[0] = eps;
  stT1[0] = tMax - eps;

  while (sp >= 0) {
    const node = stNode[sp];
    const t0 = stT0[sp];
    const t1 = stT1[sp];
    sp--;

    if (!node || t0 >= t1) continue;

    // 1) test polygons lying ON this node plane
    if (this.#testNodeOnPolys(node, O, D, tMax, f0, f1)) return true;

    const pl = node.plane;
    const nx = pl[0], ny = pl[1], nz = pl[2], d = pl[3];

    const sO = nx * O[0] + ny * O[1] + nz * O[2] + d;
    const nd = nx * D[0] + ny * D[1] + nz * D[2];

    // side at interval start
    const s0 = sO + nd * t0;

    // parallel: no crossing, just go down the start side
    if (Math.abs(nd) < eps) {
      const child = (s0 < 0) ? (node.in && node.in.node) : (node.out && node.out.node);
      if (child) {
        if (++sp >= stNode.length) return false; // or throw
        stNode[sp] = child; stT0[sp] = t0; stT1[sp] = t1;
      }
      continue;
    }

    const tPlane = -sO / nd;

    // no crossing inside [t0..t1]
    if (tPlane <= t0 || tPlane >= t1) {
      const child = (s0 < 0) ? (node.in && node.in.node) : (node.out && node.out.node);
      if (child) {
        if (++sp >= stNode.length) return false;
        stNode[sp] = child; stT0[sp] = t0; stT1[sp] = t1;
      }
      continue;
    }

    // crossing: traverse start side then other side
    const first  = (s0 < 0) ? (node.in && node.in.node) : (node.out && node.out.node);
    const second = (s0 < 0) ? (node.out && node.out.node) : (node.in && node.in.node);

    // push second then first (LIFO)
    if (second) {
      if (++sp >= stNode.length) return false;
      stNode[sp] = second; stT0[sp] = tPlane; stT1[sp] = t1;
    }
    if (first) {
      if (++sp >= stNode.length) return false;
      stNode[sp] = first; stT0[sp] = t0; stT1[sp] = tPlane;
    }
  }

  return false;
}

	

	#testNodeOnPolys(node, O, D, tMax, f0, f1) {
		for (const poly of node.on) {
			if (poly === f0 || poly === f1) continue;

			const pl = poly.plane; // IMPORTANT: poly.plane, not node.plane
			const nx = pl[0],
				ny = pl[1],
				nz = pl[2],
				d = pl[3];

			const nd = nx * D[0] + ny * D[1] + nz * D[2];
			// front-facing occluders only (same as ton ancien code)
			if (nd >= -this.epsHit) continue;

			const no = nx * O[0] + ny * O[1] + nz * O[2] + d;
			const tHit = -no / nd;

			if (tHit <= this.epsHit) continue;
			if (tHit >= tMax - this.epsHit) continue;

			const Q = this._Q;
			Q[0] = O[0] + D[0] * tHit;
			Q[1] = O[1] + D[1] * tHit;
			Q[2] = O[2] + D[2] * tHit;
			Q[3] = 1;

			if (this.#pointInConvexPoly3D(Q, poly, pl)) return true;
		}
		return false;
	}

	#isOccludedPoint(P, f0, f1, p2cached) {
		const p2 = p2cached || this.projectInto(P, this._p2);
		const x = p2[0],
			y = p2[1];

		// rayon (no alloc)
		this.rayFromScreenInto(x, y, this._O, this._D);

		const O = this._O,
			D = this._D;

		// distance de P le long du rayon
		const tP =
			(P[0] - O[0]) * D[0] + (P[1] - O[1]) * D[1] + (P[2] - O[2]) * D[2];

		if (tP <= this.epsHit) return false;

		return this.#bspAnyHitBeforeIter(this.bsp, O, D, tP, f0, f1);
	}

	#isVisiblePoint(P, f0, f1, p2cached) {
		return !this.#isOccludedPoint(P, f0, f1, p2cached);
	}

	#splitDrawEdge(A, B, f0, f1, depth) {
		// near-plane safety: clip segment before any projection
		const clipped = this.#clipWorldSegToWMin(A, B);
		if (!clipped) return;
		A = clipped[0];
		B = clipped[1];

		const a2 = this._p2a;
		const b2 = this._p2b;
		this.projectInto(A, a2);
		this.projectInto(B, b2);

		const dx = b2[0] - a2[0];
		const dy = b2[1] - a2[1];
		const d2 = dx * dx + dy * dy;

		const visA = this.#isVisiblePoint(A, f0, f1, a2);
		const visB = this.#isVisiblePoint(B, f0, f1, b2);

		// fast accept
		if (
			visA &&
			visB &&
			(d2 <= this.pixelTol * this.pixelTol || depth >= this.maxSplit)
		) {
			const p = this.plot;
			p.moveTo(a2[0], a2[1]);
			p.lineTo(b2[0], b2[1]);
			return;
		}

		// fast reject
		const smallOrMax =
			d2 <= this.pixelTol * this.pixelTol || depth >= this.maxSplit;

		if (!visA && !visB && smallOrMax) {
			const M = this._mid[depth];
			M[0] = (A[0] + B[0]) * 0.5;
			M[1] = (A[1] + B[1]) * 0.5;
			M[2] = (A[2] + B[2]) * 0.5;
			M[3] = 1;

			const m2 = this._p2m;
			this.projectInto(M, m2);

			const visM = this.#isVisiblePoint(M, f0, f1, m2);

			if (visM) {
				const p = this.plot;
				p.moveTo(a2[0], a2[1]);
				p.lineTo(b2[0], b2[1]);
			}
			return;
		}

		// split
		const M = this._mid[depth];
		M[0] = (A[0] + B[0]) * 0.5;
		M[1] = (A[1] + B[1]) * 0.5;
		M[2] = (A[2] + B[2]) * 0.5;
		M[3] = 1;

		const m2 = this._p2m;
		this.projectInto(M, m2);

		const visM = this.#isVisiblePoint(M, f0, f1, m2);

		// if all same state but still large, keep splitting
		if (visA === visM && visM === visB && depth < this.maxSplit) {
			this.#splitDrawEdge(A, M, f0, f1, depth + 1);
			this.#splitDrawEdge(M, B, f0, f1, depth + 1);
			return;
		}

		// mixed states => split adaptively
		if (depth < this.maxSplit) {
			this.#splitDrawEdge(A, M, f0, f1, depth + 1);
			this.#splitDrawEdge(M, B, f0, f1, depth + 1);
		} else {
			// fallback: draw if midpoint visible
			if (visM) {
				const p = this.plot;
				p.moveTo(a2[0], a2[1]);
				p.lineTo(b2[0], b2[1]);
			}
		}
	}

	// --- robust coplanarity test ---
	#polysCoplanarRobust(p0, p1) {
		const pl0 = p0.plane;
		const pl1 = p1.plane;

		// 1) normals nearly parallel
		const dot = pl0[0] * pl1[0] + pl0[1] * pl1[1] + pl0[2] * pl1[2];
		const ad = Math.abs(dot);

		// angle epsilon (tight)
		if (ad < 0.999999) return false; // ~0.0018° ; adjust if needed

		// 2) vertex-to-plane distances small
		// world scale here is ~units 0..10, so 1e-5..1e-4 is reasonable
		const eps = 1e-5;

		// helper: signed plane distance (plane already normalized)
		const dist = (pl, v) => pl[0] * v[0] + pl[1] * v[1] + pl[2] * v[2] + pl[3];

		let max0 = 0;
		for (let i = 0; i < p0.length; i++) {
			const d = Math.abs(dist(pl1, p0[i]));
			if (d > max0) {
				max0 = d;
				if (max0 > eps) return false;
			}
		}

		let max1 = 0;
		for (let i = 0; i < p1.length; i++) {
			const d = Math.abs(dist(pl0, p1[i]));
			if (d > max1) {
				max1 = d;
				if (max1 > eps) return false;
			}
		}

		return true;
	}

	/* ====================== Public API ======================= */

	setRotation(rx, ry, rz) {
		// recompute camera transforms + rotated basis for ray casting
		this.camera.frame++;

		const r = m4.rotateXYZ(rx, ry, rz);
		const invr = m4.inverse(r);

		this.camera.viewing = m4.multiply(r, this.camera.view);
		this.camera.eye = v4.multiplyMatrix(this.camera.posEye, invr);

		// rotate camera basis + vrp the same way (world space)
		this.uR = v4.normalize(v4.multiplyMatrix(this.camera.u, invr));
		this.vR = v4.normalize(v4.multiplyMatrix(this.camera.v, invr));
		this.vrpR = v4.multiplyMatrix(this.camera.vrp, invr);
	}

	projectInto(p4, out2) {
		const m = this.camera.viewing;

		const x = p4[0],
			y = p4[1],
			z = p4[2],
			w = p4[3];

		// p = p4 * m  (inline multiplyMatrix, zéro alloc)
		const px = x * m[0] + y * m[4] + z * m[8] + w * m[12];
		const py = x * m[1] + y * m[5] + z * m[9] + w * m[13];
		const pw = x * m[3] + y * m[7] + z * m[11] + w * m[15];

		const invw = 1 / pw;
		const a = this.camera.aspect;

		out2[0] = px * invw * a;
		out2[1] = py * invw * -a;
		return out2;
	}

	// compat
	project(p4) {
		const out = [0, 0];
		return this.projectInto(p4, out);
	}

	rayFromScreenInto(x, y, O, D) {
		// O = camera.eye (pas d'alloc)
		const eye = this.camera.eye;
		O[0] = eye[0];
		O[1] = eye[1];
		O[2] = eye[2];
		O[3] = 1;

		// normalized screen coords (turtle units)
		const invAsp = 1 / this.camera.aspect;
		const nx = x * invAsp;
		const ny = -y * invAsp;

		// Pw = vrpR + uR*nx + vR*ny  (tout inline)
		const u = this.uR,
			v = this.vR,
			vrp = this.vrpR;

		const px = vrp[0] + u[0] * nx + v[0] * ny;
		const py = vrp[1] + u[1] * nx + v[1] * ny;
		const pz = vrp[2] + u[2] * nx + v[2] * ny;

		// D = normalize(Pw - O)
		let dx = px - O[0];
		let dy = py - O[1];
		let dz = pz - O[2];

		const invLen = 1 / Math.hypot(dx, dy, dz);
		dx *= invLen;
		dy *= invLen;
		dz *= invLen;

		D[0] = dx;
		D[1] = dy;
		D[2] = dz;
		D[3] = 0;
	}

	rayFromScreen(x, y) {
		const O = [0, 0, 0, 1],
			D = [0, 0, 0, 0];
		this.rayFromScreenInto(x, y, O, D);
		return [O, D];
	}

	collectPolys() {
		this.polys.length = 0;
		if (!this.bsp || !this.bsp.node) return this.polys;
		this.#collectNode(this.bsp.node);
		return this.polys;
	}

	buildEdges() {
		const map = new Map();
		const eps = this.epsKey;

		for (const poly of this.polys) {
			const n = poly.length;
			for (let i = 0; i < n; i++) {
				const a = poly[i];
				const b = poly[(i + 1) % n];

				const ka = this.#key3(a, eps);
				const kb = this.#key3(b, eps);
				const ek = ka < kb ? ka + "|" + kb : kb + "|" + ka;

				let e = map.get(ek);
				if (!e) {
					e = { a: a, b: b, faces: [poly] };
					map.set(ek, e);
				} else {
					if (e.faces.length < 2) e.faces.push(poly);
				}
			}
		}

		this.edges.length = 0;
		for (const e of map.values()) this.edges.push(e);
		return this.edges;
	}

	filterSplitEdges() {
		// remove edges between truly coplanar adjacent polygons (BSP split artifacts)
		const out = [];
		for (const e of this.edges) {
			if (e.faces.length === 1) {
				out.push(e);
				continue;
			}

			const p0 = e.faces[0];
			const p1 = e.faces[1];

			if (!this.#polysCoplanarRobust(p0, p1)) out.push(e);
		}
		this.edges = out;
		return this.edges;
	}

	purgeTJunctionEdges() {
		// remove "internal" edges caused by T-junctions on coplanar faces
		// (keeps the silhouette / boundary lines only)

		const buckets = new Map();
		const pe = 1 / 2000; // plane quantization

		const pkey = (pl) => {
			const nx = Math.round(pl[0] / pe);
			const ny = Math.round(pl[1] / pe);
			const nz = Math.round(pl[2] / pe);
			const d = Math.round(pl[3] / (pe * 10));
			if (nx < 0 || (nx === 0 && (ny < 0 || (ny === 0 && nz < 0)))) {
				return -nx + "," + -ny + "," + -nz + "," + -d;
			}
			return nx + "," + ny + "," + nz + "," + d;
		};

		for (const poly of this.polys) {
			const k = pkey(poly.plane);
			let b = buckets.get(k);
			if (!b) buckets.set(k, (b = []));
			b.push(poly);
		}

		const out = [];
		for (const e of this.edges) {
			// only ambiguous ones: single-face edges
			if (e.faces.length !== 1) {
				out.push(e);
				continue;
			}

			const owner = e.faces[0];
			const k = pkey(owner.plane);
			const candidates = buckets.get(k);

			let kill = false;
			if (candidates && candidates.length > 1) {
				for (const q of candidates) {
					if (q === owner) continue;
					if (this.#edgeOnPolyBoundary(e.a, e.b, q, owner.plane)) {
						kill = true;
						break;
					}
				}
			}

			if (!kill) out.push(e);
		}

		this.edges = out;
		return this.edges;
	}

	#cacheScreenXY(p4) {
		const m = this.camera.viewing;

		const x = p4[0],
			y = p4[1],
			z = p4[2],
			w = p4[3];

		// px, py, pw (inline multiplyMatrix)
		const px = x * m[0] + y * m[4] + z * m[8] + w * m[12];
		const py = x * m[1] + y * m[5] + z * m[9] + w * m[13];
		const pw = x * m[3] + y * m[7] + z * m[11] + w * m[15];

		const invw = 1 / pw;
		const a = this.camera.aspect;

		p4.x = px * invw * a;
		p4.y = py * invw * -a;
	}

	preparePolys2D() {
		// compute per-poly screen AABB (cheap cull for occlusion tests)
		for (const poly of this.polys) {
			let minx = 1e30,
				miny = 1e30;
			let maxx = -1e30,
				maxy = -1e30;

			for (const p0 of poly) {
				if (p0.frame !== this.camera.frame) {
					p0.frame = this.camera.frame;
					this.#cacheScreenXY(p0);
				}
				const x = p0.x,
					y = p0.y;
				if (x < minx) minx = x;
				if (y < miny) miny = y;
				if (x > maxx) maxx = x;
				if (y > maxy) maxy = y;
			}

			poly._bb0 = minx;
			poly._bb1 = miny;
			poly._bb2 = maxx;
			poly._bb3 = maxy;
		}
	}

	drawHiddenEdges() {
		this.preparePolys2D();
		for (const e of this.edges) {
			const f0 = e.faces[0] || null;
			const f1 = e.faces[1] || null;
			this.#splitDrawEdge(e.a, e.b, f0, f1, 0);
		}
	}

	addOccluderPolys(list) {
		for (const p of list) this.polys.push(p);
	}

	addDrawableEdges(pairs) {
		// pairs = [[A,B],[A,B]...] with A,B vec4
		for (const e of pairs) {
			this.edges.push({ a: e[0], b: e[1], faces: [] });
		}
	}
}
