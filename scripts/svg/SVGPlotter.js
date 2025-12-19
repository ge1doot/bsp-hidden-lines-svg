import { createHersheyText } from "./hershey.js";
import { optimizePathGreedy } from "./optimizePath.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function el(name) {
	return document.createElementNS(SVG_NS, name);
}

function clamp(v, a, b) {
	return v < a ? a : v > b ? b : v;
}

// Port (adapted) from TurtleToy turtlesvg.js polyline clipping
function intersect(pint, a, b, c, d) {
	const e = (d[1] - c[1]) * (b[0] - a[0]) - (d[0] - c[0]) * (b[1] - a[1]);
	if (e === 0) return false;
	const ua =
		((d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0])) / e;
	const ub =
		((b[0] - a[0]) * (a[1] - c[1]) - (b[1] - a[1]) * (a[0] - c[0])) / e;
	if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
		pint[0] = a[0] + ua * (b[0] - a[0]);
		pint[1] = a[1] + ua * (b[1] - a[1]);
		return true;
	}
	return false;
}

function clipPolyline(polyline, left, size) {
	const pint = [0, 0];
	const clip = [left, left, left, size, size, size, size, left, left, left];

	const nps = [];
	let np = [];

	let pcx = polyline[0];
	let pcy = polyline[1];
	let inside = pcx > left && pcx < size && pcy > left && pcy < size;
	if (inside) np.push(pcx, pcy);

	for (let j = 0; j < polyline.length; j += 2) {
		const cx = polyline[j];
		const cy = polyline[j + 1];
		if (cx === pcx && cy === pcy && j < polyline.length - 2) continue;

		if (cx > left && cx < size && cy > left && cy < size) {
			if (inside) np.push(cx, cy);
			else {
				for (let i = 0; i < 8; i += 2) {
					if (
						intersect(
							pint,
							[pcx, pcy],
							[cx, cy],
							[clip[i], clip[i + 1]],
							[clip[i + 2], clip[i + 3]]
						)
					)
						break;
				}
				np.push(pint[0], pint[1], cx, cy);
			}
			inside = true;
		} else {
			if (inside) {
				for (let i = 0; i < 8; i += 2) {
					if (
						intersect(
							pint,
							[pcx, pcy],
							[cx, cy],
							[clip[i], clip[i + 1]],
							[clip[i + 2], clip[i + 3]]
						)
					)
						break;
				}
				np.push(pint[0], pint[1]);
				nps.push(np);
				np = [];
			} else {
				const ips = [];
				for (let i = 0; i < 8; i += 2) {
					if (
						intersect(
							pint,
							[pcx, pcy],
							[cx, cy],
							[clip[i], clip[i + 1]],
							[clip[i + 2], clip[i + 3]]
						)
					) {
						ips.push(pint[0], pint[1]);
					}
				}
				if (ips.length === 4) nps.push(ips);
			}
			inside = false;
		}

		pcx = cx;
		pcy = cy;
	}

	if (np.length > 0) nps.push(np);
	return nps;
}

export function createSVGPlotter(svgElem, opt = {}) {
	// ---- Options (sane defaults) ----
	const viewBox = opt.viewBox || [0, 0, 200, 210]; // allow footer
	const sizeMM = opt.sizeMM ?? 200;
	const margin = opt.margin ?? 5;

	const bg = opt.background ?? "#fff";
	const stroke = opt.stroke ?? "#000";
	const strokeWidth = opt.strokeWidth ?? 0.2;
	const opacity = opt.opacity ?? 1;

	// drawing-space to svg-space mapping
	// if centerOrigin => user coords in [-100..100] map to [margin..200-margin]
	const centerOrigin = !!opt.centerOrigin;
	const drawScale = opt.drawScale ?? 0.95;

	const boxW = viewBox[2];
	const boxH = viewBox[3];

	// TurtleToy-like: coords dessin sont centrées, puis on squeeze 0.95, puis +100.
	// PAS de +margin ici.
	const originX = centerOrigin ? boxW * 0.5 : margin;
	const originY = centerOrigin ? boxW * 0.5 : margin;

	// offset “turtle” = 95 quand boxW=200 et margin=5
	// mais en pratique: offset = origin - margin (=> 95)
	const baseOffsetX = centerOrigin ? originX - margin : 0;
	const baseOffsetY = centerOrigin ? originY - margin : 0;

	// IMPORTANT: pas de +margin à la fin (sinon tu rajoutes 5 une 2e fois)
	const mapX = (x) => x * drawScale + baseOffsetX;
	const mapY = (y) => y * drawScale + baseOffsetY;

	// inverse map cohérent
	const unmapX = (sx) => (sx - baseOffsetX) / drawScale;
	const unmapY = (sy) => (sy - baseOffsetY) / drawScale;

	// clip box (inchangé, c’est bien un max)
	const clipLeft = margin - 1; // 4
	const clipMax = boxW - margin + 1; // 196

	// ---- DOM init ----
	svgElem.setAttribute("viewBox", viewBox.join(" "));
	svgElem.setAttribute("width", `${sizeMM}mm`);
	svgElem.setAttribute("height", `${sizeMM}mm`);
	svgElem.style.background = bg;

	// background rect (for export stability)
	const bgRect = el("rect");
	bgRect.setAttribute("x", 0);
	bgRect.setAttribute("y", 0);
	bgRect.setAttribute("width", boxW);
	bgRect.setAttribute("height", boxH);
	bgRect.setAttribute("fill", bg);
	bgRect.setAttribute("stroke", "none");

	// groups
	const gInside = el("g");
	gInside.setAttribute("fill", "none");
	gInside.setAttribute("stroke", stroke);
	gInside.setAttribute("stroke-width", String(strokeWidth));
	gInside.setAttribute("opacity", String(opacity));
	gInside.setAttribute("stroke-linejoin", "round");

	const gOutside = el("g");
	gOutside.setAttribute("fill", "none");
	gOutside.setAttribute("stroke", stroke);
	gOutside.setAttribute("stroke-width", String(Math.max(0.3, strokeWidth)));

	const gUI = el("g");
	gUI.setAttribute("fill", "none");
	gUI.setAttribute("stroke", stroke);
	gUI.setAttribute("stroke-width", String(Math.max(0.3, strokeWidth)));
	gUI.setAttribute("opacity", "1");

	// rebuild root
	svgElem.innerHTML = "";
	svgElem.appendChild(bgRect);
	svgElem.appendChild(gInside);
	svgElem.appendChild(gOutside);
	svgElem.appendChild(gUI);

	// ---- State ----
	let target = gInside;
	let px = NaN,
		py = NaN;

	let polyline = [];
	const polylines = []; // only inside (for save optimize)
	const tmp2 = [];

	// text helper (Hershey)
	const text = createHersheyText({
		moveTo: (x, y) => api.moveTo(x, y),
		lineTo: (x, y) => api.lineTo(x, y)
	});

	// ---- Core polyline flush ----
	function flushPolyline({ reduce = false, doClip = true } = {}) {
		if (polyline.length <= 2) {
			polyline.length = 0;
			return;
		}

		// map points to SVG space
		tmp2.length = polyline.length;
		for (let i = 0; i < polyline.length; i += 2) {
			tmp2[i] = mapX(polyline[i]);
			tmp2[i + 1] = mapY(polyline[i + 1]);
		}

		const paths =
			doClip && target === gInside
				? clipPolyline(tmp2, clipLeft, clipMax)
				: [tmp2];

		for (let k = 0; k < paths.length; k++) {
			const pts = paths[k];
			if (pts.length <= 2) continue;

			const poly = el("polyline");

			// points string
			// (toFixed) keeps filesize reasonable
			let s = "";
			for (let i = 0; i < pts.length; i += 2) {
				const x = reduce ? +pts[i].toFixed(2) : +pts[i].toFixed(2);
				const y = reduce ? +pts[i + 1].toFixed(2) : +pts[i + 1].toFixed(2);
				s += x + "," + y + (i < pts.length - 2 ? " " : "");
			}
			poly.setAttribute("points", s);
			target.appendChild(poly);

			// store only inside polylines for save optimization
			if (target === gInside) {
				// store raw svg-space points (already mapped)
				polylines.push(pts.slice(0));
			}
		}

		polyline.length = 0;
	}

	// ---- Public drawing API ----
	function moveTo(x, y) {
		if (Array.isArray(x)) {
			y = x[1];
			x = x[0];
		}
		px = x;
		py = y;
		if (polyline.length > 0) flushPolyline({ reduce: true, doClip: true });
		polyline.push(px, py);
	}

	function lineTo(x, y) {
		if (Array.isArray(x)) {
			y = x[1];
			x = x[0];
		}
		px = x;
		py = y;

		// axis-aligned colinear reduction (your old trick, kept)
		const L = polyline.length;
		if (L >= 4) {
			const x1 = polyline[L - 2],
				y1 = polyline[L - 1];
			const x0 = polyline[L - 4],
				y0 = polyline[L - 3];

			// horizontal colinear
			if (y === y1 && y === y0) {
				polyline[L - 2] = x; // extend previous point
				return;
			}
			// vertical colinear
			if (x === x1 && x === x0) {
				polyline[L - 1] = y;
				return;
			}
		}

		polyline.push(px, py);
	}

	function line(x0, y0, x1, y1) {
		if (Array.isArray(x0)) {
			if (Array.isArray(y0)) {
				x1 = y0[0];
				y1 = y0[1];
				y0 = x0[1];
				x0 = x0[0];
			} else {
				x1 = y0;
				y1 = x1;
				y0 = x0[1];
				x0 = x0[0];
			}
		}
		if (x0 !== px || y0 !== py) moveTo(x0, y0);
		lineTo(x1, y1);
	}

	function rect(x0, y0, w, h = w) {
		moveTo(x0, y0);
		lineTo(x0 + w, y0);
		lineTo(x0 + w, y0 + h);
		lineTo(x0, y0 + h);
		lineTo(x0, y0);
	}

	function fillRect(x0, y0, w, h = w) {
		const step = strokeWidth;
		for (let x = x0; x <= x0 + w; x += step) {
			moveTo(x, y0);
			lineTo(x, y0 + h);
		}
	}

	function quadraticCurveTo(cx, cy, x1, y1, steps = 20) {
		const s = 1 / steps;
		const x0 = px,
			y0 = py;
		for (let t = 0; t < 1; t += s) {
			lineTo(
				(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
				(1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1
			);
		}
		lineTo(x1, y1);
	}

	function ellipse(x, y, w, h = w, start = 0, end = Math.PI * 2) {
		const step = Math.PI / 36;
		moveTo(x + Math.cos(start) * w * 0.5, y - Math.sin(start) * h * 0.5);
		for (let a = start + step; a <= end + 1e-9; a += step) {
			lineTo(x + Math.cos(a) * w * 0.5, y - Math.sin(a) * h * 0.5);
		}
	}

	// ---- UI + Save ----
	function setTargetInside() {
		flushPolyline();
		target = gInside;
	}
	function setTargetOutside() {
		flushPolyline();
		target = gOutside;
	}

	function clear() {
		polyline.length = 0;
		polylines.length = 0;
		gInside.innerHTML = "";
		gOutside.innerHTML = "";
		gUI.innerHTML = "";
		target = gInside;
		px = NaN;
		py = NaN;
	}

	function addCropMarks({ len = 6, inset = 0 } = {}) {
		// coins du carré de dessin : [margin .. boxW - margin]
		const x0 = margin + inset;
		const y0 = margin + inset;
		const x1 = boxW - margin - inset;
		const y1 = boxW - margin - inset; // carré (boxW), footer en dessous

		// helper: dessiner en coords SVG direct sans te battre avec map/unmap
		function uiMoveTo(sx, sy) {
			flushPolyline({ doClip: false });
			polyline.push(unmapX(sx), unmapY(sy));
			px = polyline[polyline.length - 2];
			py = polyline[polyline.length - 1];
		}
		function uiLineTo(sx, sy) {
			polyline.push(unmapX(sx), unmapY(sy));
			px = polyline[polyline.length - 2];
			py = polyline[polyline.length - 1];
		}

		const savedTarget = target;
		target = gOutside;

		// TL
		uiMoveTo(x0, y0 + len);
		uiLineTo(x0, y0);
		uiLineTo(x0 + len, y0);

		// TR
		uiMoveTo(x1 - len, y0);
		uiLineTo(x1, y0);
		uiLineTo(x1, y0 + len);

		// BR
		uiMoveTo(x1, y1 - len);
		uiLineTo(x1, y1);
		uiLineTo(x1 - len, y1);

		// BL
		uiMoveTo(x0 + len, y1);
		uiLineTo(x0, y1);
		uiLineTo(x0, y1 - len);

		flushPolyline({ doClip: false });
		target = savedTarget;
	}

	function addFooter({ name = "Sketch", author = "", showSave = true } = {}) {
		setTargetOutside();
		target = gUI;

		function uiMoveTo(sx, sy) {
			flushPolyline({ doClip: false });
			polyline.push(unmapX(sx), unmapY(sy));
			px = polyline[polyline.length - 2];
			py = polyline[polyline.length - 1];
		}
		function uiLineTo(sx, sy) {
			polyline.push(unmapX(sx), unmapY(sy));
			px = polyline[polyline.length - 2];
			py = polyline[polyline.length - 1];
		}

		const t2 = createHersheyText({ moveTo: uiMoveTo, lineTo: uiLineTo });

		const d = new Date();
		const ds = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

		const label = `${name}. ${ds}${author ? ". " + author : ""}`; // ✅ ICI

		const scale = 0.75;
		const w = text.measure(label, scale);

		t2.draw(label, boxW - margin - w, boxW + 4.4, scale);

		if (showSave) {
			t2.draw("<Save SVG>", margin, boxW + 4.4, scale);

			const hit = el("rect");
			hit.setAttribute("x", String(margin));
			hit.setAttribute("y", String(boxW + 0.5));
			hit.setAttribute("width", String(34));
			hit.setAttribute("height", String(8));
			hit.setAttribute("fill", bg);
			hit.setAttribute("opacity", "0");
			hit.style.cursor = "pointer";
			hit.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				e.stopPropagation();
				api.save();
			});
			gUI.appendChild(hit);
		}

		t2.draw("<Refresh>", margin + 70, boxW + 4.4, scale);

		const hitR = el("rect");
		hitR.setAttribute("x", String(margin + 68));
		hitR.setAttribute("y", String(boxW + 0.5));
		hitR.setAttribute("width", String(34));
		hitR.setAttribute("height", String(8));
		hitR.setAttribute("fill", bg);
		hitR.setAttribute("opacity", "0");
		hitR.style.cursor = "pointer";
		hitR.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (typeof opt.onRefresh === "function") opt.onRefresh();
		});
		gUI.appendChild(hitR);

		flushPolyline({ doClip: false });
		target = gInside;
	}

	function serializeSVG() {
		svgElem.setAttribute("xmlns", SVG_NS);
		return svgElem.outerHTML;
	}

	function downloadText(
		filename,
		textContent,
		mime = "image/svg+xml;charset=utf-8"
	) {
		const preface =
			'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\r\n';
		const blob = new Blob([preface, textContent], { type: mime });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function save({ filename } = {}) {
		flushPolyline();
		// optional pen-lift optimization (reorders + merges)
		const doOptimize = opt.optimize !== false;
		if (doOptimize && polylines.length) {
			const merged = optimizePathGreedy(polylines, strokeWidth);
			gInside.innerHTML = "";
			polylines.length = 0;
			for (let i = 0; i < merged.length; i++) {
				// merged are svg-space points already, so we re-inject as DOM polys directly
				const pts = merged[i];
				const poly = el("polyline");
				let s = "";
				for (let k = 0; k < pts.length; k += 2) {
					s +=
						+pts[k].toFixed(2) +
						"," +
						+pts[k + 1].toFixed(2) +
						(k < pts.length - 2 ? " " : "");
				}
				poly.setAttribute("points", s);
				gInside.appendChild(poly);
			}
		}

		const name =
			filename ||
			`${(opt.name || "sketch").toLowerCase().replace(/\s+/g, "-")}.svg`;
		downloadText(name, serializeSVG());
	}

	function finalize(meta = {}) {
		flushPolyline();
		addCropMarks({ len: 6, inset: 0 }); 
		addFooter({
			name: meta.name ?? opt.name ?? "Sketch",
			author: meta.author ?? opt.author ?? "",
			showSave: meta.showSave ?? true
		});
	}

	const api = {
		// state
		getX: () => px,
		getY: () => py,

		// drawing primitives
		moveTo: (x, y) => {
			moveTo(x, y);
			return api;
		},
		lineTo: (x, y) => {
			lineTo(x, y);
			return api;
		},
		line,
		rect,
		fillRect,
		quadraticCurveTo,
		ellipse,
		circle: (x, y, w) => ellipse(x, y, w, w, 0, Math.PI * 2),
		arc: (x, y, w, s, e) => ellipse(x, y, w, w, s, e),

		// text
		text: (str, x, y, scale = 1) => {
			text.draw(str, x, y, scale);
			return api;
		},
		textSize: (str, scale = 1) => text.measure(str, scale),

		// lifecycle / target / export
		clear,
		setTargetInside,
		setTargetOutside,
		flush: flushPolyline,
		finalize,
		save,
		serialize: serializeSVG
	};

	return api;
}
