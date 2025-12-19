import { v4 } from "../math/vec4.js";
import { m4 } from "../math/mat4.js";

export const camera = {
	frame: 1,
	aspect: 100,

	look(e, to, zoom) {
		this.posEye = [e[0], e[1], e[2], 1];
		this.zoom = zoom;

		const vpn = v4.normalize(v4.subtract(this.posEye, [to[0], to[1], to[2], 1]));

		// build orthonormal basis (store it!)
		let u = v4.crossProduct([0, 1, 0, 0], vpn);
		u = v4.normalize(u);

		let v = v4.crossProduct(vpn, u);
		v = v4.normalize(v);

		const vrp = v4.add(this.posEye, v4.multiplyScalar(vpn, -zoom));

		this.u = u; // vec4
		this.v = v; // vec4
		this.n = vpn; // vec4
		this.vrp = vrp; // vec4

		this.view = m4.multiply(
			this.viewMatrix(u, v, vpn, vrp),
			this.perspective(zoom)
		);
	},

	perspective(distance) {
		// w = 1 - z / distance  (so projection is x/w, y/w)
		return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / distance, 0, 0, 0, 1];
	},

	viewMatrix(u, v, n, r) {
		return [
			u[0],
			v[0],
			n[0],
			0,
			u[1],
			v[1],
			n[1],
			0,
			u[2],
			v[2],
			n[2],
			0,
			-(r[0] * u[0] + r[1] * u[1] + r[2] * u[2] + r[3] * u[3]),
			-(r[0] * v[0] + r[1] * v[1] + r[2] * v[2] + r[3] * v[3]),
			-(r[0] * n[0] + r[1] * n[1] + r[2] * n[2] + r[3] * n[3]),
			1
		];
	}
};