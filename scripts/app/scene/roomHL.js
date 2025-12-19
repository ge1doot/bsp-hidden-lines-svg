import { v4 } from "../math/vec4.js";
import { m4 } from "../math/mat4.js";
import { polygon } from "../bsp/polygon.js";

export class RoomHL {
	constructor(sx = 10, sy = 5, sz = 10) {
		this.sx = sx;
		this.sy = sy;
		this.sz = sz;
		this.m = m4.identity();
		this.polys = [];
		this.edges = [];
		this.#build();
	}

	translate(x, y, z) {
		this.m = m4.translate(this.m, x, y, z);
		this.#build();
		return this;
	}

	#pt(x, y, z) {
		return v4.multiplyMatrix([x, y, z, 1], this.m);
	}

	#build() {
		const sx = this.sx,
			sy = this.sy,
			sz = this.sz;

		const P = [
			this.#pt(-sx, -sy, -sz),
			this.#pt(sx, -sy, -sz),
			this.#pt(sx, sy, -sz),
			this.#pt(-sx, sy, -sz),
			this.#pt(-sx, -sy, sz),
			this.#pt(sx, -sy, sz),
			this.#pt(sx, sy, sz),
			this.#pt(-sx, sy, sz)
		];

		// 6 quads, CCW as seen from INSIDE the room (important for back-face cull)
		this.polys = [
			polygon.createIndexed(P, [0, 1, 2, 3]), // back  (-z)
			polygon.createIndexed(P, [4, 7, 6, 5]), // front (+z)
			polygon.createIndexed(P, [0, 4, 5, 1]), // bottom(-y)
			polygon.createIndexed(P, [3, 2, 6, 7]), // top   (+y)
			polygon.createIndexed(P, [0, 3, 7, 4]), // left  (-x)
			polygon.createIndexed(P, [1, 5, 6, 2]) // right (+x)
		];

		// 12 edges as indices
		this.edges = [
			[P[0], P[1]],
			[P[1], P[2]],
			[P[2], P[3]],
			[P[3], P[0]],
			[P[4], P[5]],
			[P[5], P[6]],
			[P[6], P[7]],
			[P[7], P[4]],
			[P[0], P[4]],
			[P[1], P[5]],
			[P[2], P[6]],
			[P[3], P[7]]
		];
	}
}