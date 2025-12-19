/* =============================================================
 *  BSP adapted from C++ BSP Tree Demo (Bretton Wade, 1994-97)
 *  http://www.gamers.org/dhs/helpdocs/bsp_faq.html
 * ============================================================= */

import { HC_IN, HC_OUT, HC_ON, HC_SPANNING, EPSILON } from "./constants.js";
import { polygon } from "./polygon.js";

export class BspTree {
	constructor() {
		this.node = null;
	}

	insert(list, keep, cur = keep) {
		if (list.length === 0) return;

		if (this.node) {
			this.node.insert(list, keep);
		} else {
			if (cur === keep || keep === HC_SPANNING) {
				this.node = new BspNode(list.pop());
				if (list.length) this.node.insert(list, HC_SPANNING);
			}
		}
	}

	pushPoly(poly, result, keep, cur) {
		if (this.node !== null) this.node.pushPoly(poly, result, keep);
		else if (cur === keep) result.push(poly);
	}

	pushList(list, result, keep, cur) {
		if (list.length === 0) return;
		if (this.node !== null) this.node.pushList(list, result, keep);
		else if (cur === keep) result.push.apply(result, list);
	}

	reduce() {
		if (this.node !== null) this.node.reduce();
	}
}

class BspNode {
	constructor(poly) {
		this.plane = poly.plane;
		this.on = [poly];
		this.in = new BspTree();
		this.out = new BspTree();
	}

	insert(list, keep) {
		const inside = [],
			outside = [];

		for (const poly of list) {
			const [outp, inp, sgn] = polygon.split(poly, this.plane);
			if (sgn === HC_ON) this.on.push(poly);
			else {
				if (sgn === HC_IN || sgn === HC_SPANNING) inside.push(inp);
				if (sgn === HC_OUT || sgn === HC_SPANNING) outside.push(outp);
			}
		}

		if (inside.length !== 0) this.in.insert(inside, keep, HC_IN);
		if (outside.length !== 0) this.out.insert(outside, keep, HC_OUT);
	}

	pushPoly(poly, result, keep) {
		const [outp, inp, sgn] = polygon.split(poly, this.plane);
		if (sgn === HC_ON) result.push(poly);
		else {
			if (sgn === HC_IN || sgn === HC_SPANNING)
				this.in.pushPoly(inp, result, keep, HC_IN);
			if (sgn === HC_OUT || sgn === HC_SPANNING)
				this.out.pushPoly(outp, result, keep, HC_OUT);
		}
	}

	pushList(list, result, keep) {
		const inside = [],
			outside = [];

		for (const poly of list) {
			const [outp, inp, sgn] = polygon.split(poly, this.plane);
			if (sgn === HC_ON) result.push(poly);
			else {
				if (sgn === HC_IN || sgn === HC_SPANNING) inside.push(inp);
				if (sgn === HC_OUT || sgn === HC_SPANNING) outside.push(outp);
			}
		}

		if (inside.length !== 0) this.in.pushList(inside, result, keep, HC_IN);
		if (outside.length !== 0) this.out.pushList(outside, result, keep, HC_OUT);
	}

	reduce() {
		// "Extrude" negative parts: compute boundary polys
		const results = [],
			boundary = [];

		for (const poly of this.on) {
			// if plane differs, choose which side to treat as inside/outside
			if (Math.abs(poly.plane[3] + this.plane[3]) > EPSILON) {
				this.in.pushPoly(poly, results, HC_IN, HC_IN);
				this.out.pushList(results, boundary, HC_OUT, HC_OUT);
			} else {
				this.out.pushPoly(poly, results, HC_OUT, HC_OUT);
				this.in.pushList(results, boundary, HC_IN, HC_IN);
			}
		}

		this.on = boundary;
		this.in.reduce();
		this.out.reduce();
	}
}