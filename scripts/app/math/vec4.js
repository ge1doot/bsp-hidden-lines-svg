export const v4 = {
	multiplyScalar(v, s) {
		return [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
	},
	subtract(v, p) {
		return [v[0] - p[0], v[1] - p[1], v[2] - p[2], v[3] - p[3]];
	},
	add(v, p) {
		return [v[0] + p[0], v[1] + p[1], v[2] + p[2], v[3] + p[3]];
	},

	multiplyMatrix(v, m) {
		const px = v[0],
			py = v[1],
			pz = v[2],
			pw = v[3];
		return [
			px * m[0] + py * m[4] + pz * m[8] + pw * m[12],
			px * m[1] + py * m[5] + pz * m[9] + pw * m[13],
			px * m[2] + py * m[6] + pz * m[10] + pw * m[14],
			px * m[3] + py * m[7] + pz * m[11] + pw * m[15]
		];
	},

	crossProduct(v, p) {
		return [
			v[1] * p[2] - v[2] * p[1],
			v[2] * p[0] - v[0] * p[2],
			v[0] * p[1] - v[1] * p[0],
			0
		];
	},

	dotProduct(v, p) {
		return v[0] * p[0] + v[1] * p[1] + v[2] * p[2] + v[3] * p[3];
	},

	normalize(v) {
		const n = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3]);
		return [v[0] / n, v[1] / n, v[2] / n, v[3] / n];
	}
};