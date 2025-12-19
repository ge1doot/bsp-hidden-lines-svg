import { HC_IN, HC_OUT, HC_ON, HC_SPANNING, EPSILON } from "./constants.js";
import { v4 } from "../math/vec4.js";

export const polygon = {
	createIndexed(p, list) {
		const points = [];
		for (const index of list) points.push(p[index]);
		points.plane = this.definePlane(points);
		return points;
	},

	create(p) {
		p.plane = this.definePlane(p);
		return p;
	},

	definePlane(poly) {
		// Newell normal (3D)
		let nx = 0,
			ny = 0,
			nz = 0;
		for (let i = 0, last = poly.length - 1; i < poly.length; last = i, i++) {
			const A = poly[last]; // expects CCW
			const B = poly[i];
			nx += (A[1] - B[1]) * (A[2] + B[2]);
			ny += (A[2] - B[2]) * (A[0] + B[0]);
			nz += (A[0] - B[0]) * (A[1] + B[1]);
		}

		const len = Math.hypot(nx, ny, nz);
		if (len < 1e-12 || !isFinite(len)) {
			// fallback safe (should not happen in your scene)
			return [0, 0, 1, 0];
		}
		const inv = 1 / len;
		nx *= inv;
		ny *= inv;
		nz *= inv;

		const p = poly[0];
		const d = -(nx * p[0] + ny * p[1] + nz * p[2]); // <-- NO w term

		return [nx, ny, nz, d];
	},

	split(poly, plane) {
		const outpts = [],
			inpts = [];
		let outp,
			inp,
			out_c = 0,
			in_c = 0,
			poly_class = HC_ON;

		let ptA = poly[poly.length - 1];
		let sideA = v4.dotProduct(ptA, plane);

		for (const ptB of poly) {
			const sideB = v4.dotProduct(ptB, plane);

			if (sideB > EPSILON) {
				if (poly_class === HC_ON) poly_class = HC_OUT;
				else if (poly_class !== HC_OUT) poly_class = HC_SPANNING;

				if (sideA < -EPSILON) {
					const v = v4.subtract(ptB, ptA);
					outpts[out_c++] = inpts[in_c++] = v4.add(
						ptA,
						v4.multiplyScalar(
							v,
							-v4.dotProduct(ptA, plane) / v4.dotProduct(v, plane)
						)
					);
					poly_class = HC_SPANNING;
				}
				outpts[out_c++] = ptB;
			} else if (sideB < -EPSILON) {
				if (poly_class === HC_ON) poly_class = HC_IN;
				else if (poly_class !== HC_IN) poly_class = HC_SPANNING;

				if (sideA > EPSILON) {
					const v = v4.subtract(ptB, ptA);
					outpts[out_c++] = inpts[in_c++] = v4.add(
						ptA,
						v4.multiplyScalar(
							v,
							-v4.dotProduct(ptA, plane) / v4.dotProduct(v, plane)
						)
					);
					poly_class = HC_SPANNING;
				}
				inpts[in_c++] = ptB;
			} else {
				outpts[out_c++] = inpts[in_c++] = ptB;
			}

			ptA = ptB;
			sideA = sideB;
		}

		switch (poly_class) {
			case HC_OUT:
				outp = poly;
				break;
			case HC_IN:
				inp = poly;
				break;
			case HC_SPANNING:
				outp = this.create(outpts);
				inp = this.create(inpts);
				break;
		}
		return [outp, inp, poly_class];
	}
};
