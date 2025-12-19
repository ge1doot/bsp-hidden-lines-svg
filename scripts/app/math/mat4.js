export const m4 = {
	identity() {
		return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
	},

	multiply(m, n) {
		const m1XX = m[0],
			m1XY = m[1],
			m1XZ = m[2],
			m1XW = m[3],
			m1YX = m[4],
			m1YY = m[5],
			m1YZ = m[6],
			m1YW = m[7],
			m1ZX = m[8],
			m1ZY = m[9],
			m1ZZ = m[10],
			m1ZW = m[11],
			m1WX = m[12],
			m1WY = m[13],
			m1WZ = m[14],
			m1WW = m[15],
			m2XX = n[0],
			m2XY = n[1],
			m2XZ = n[2],
			m2XW = n[3],
			m2YX = n[4],
			m2YY = n[5],
			m2YZ = n[6],
			m2YW = n[7],
			m2ZX = n[8],
			m2ZY = n[9],
			m2ZZ = n[10],
			m2ZW = n[11],
			m2WX = n[12],
			m2WY = n[13],
			m2WZ = n[14],
			m2WW = n[15];

		return [
			m1XX * m2XX + m1XY * m2YX + m1XZ * m2ZX + m1XW * m2WX,
			m1XX * m2XY + m1XY * m2YY + m1XZ * m2ZY + m1XW * m2WY,
			m1XX * m2XZ + m1XY * m2YZ + m1XZ * m2ZZ + m1XW * m2WZ,
			m1XX * m2XW + m1XY * m2YW + m1XZ * m2ZW + m1XW * m2WW,

			m1YX * m2XX + m1YY * m2YX + m1YZ * m2ZX + m1YW * m2WX,
			m1YX * m2XY + m1YY * m2YY + m1YZ * m2ZY + m1YW * m2WY,
			m1YX * m2XZ + m1YY * m2YZ + m1YZ * m2ZZ + m1YW * m2WZ,
			m1YX * m2XW + m1YY * m2YW + m1YZ * m2ZW + m1YW * m2WW,

			m1ZX * m2XX + m1ZY * m2YX + m1ZZ * m2ZX + m1ZW * m2WX,
			m1ZX * m2XY + m1ZY * m2YY + m1ZZ * m2ZY + m1ZW * m2WY,
			m1ZX * m2XZ + m1ZY * m2YZ + m1ZZ * m2ZZ + m1ZW * m2WZ,
			m1ZX * m2XW + m1ZY * m2YW + m1ZZ * m2ZW + m1ZW * m2WW,

			m1WX * m2XX + m1WY * m2YX + m1WZ * m2ZX + m1WW * m2WX,
			m1WX * m2XY + m1WY * m2YY + m1WZ * m2ZY + m1WW * m2WY,
			m1WX * m2XZ + m1WY * m2YZ + m1WZ * m2ZZ + m1WW * m2WZ,
			m1WX * m2XW + m1WY * m2YW + m1WZ * m2ZW + m1WW * m2WW
		];
	},

	inverse(m) {
		const a00 = m[0],
			a01 = m[1],
			a02 = m[2],
			a03 = m[3],
			a10 = m[4],
			a11 = m[5],
			a12 = m[6],
			a13 = m[7],
			a20 = m[8],
			a21 = m[9],
			a22 = m[10],
			a23 = m[11],
			a30 = m[12],
			a31 = m[13],
			a32 = m[14],
			a33 = m[15],
			b00 = a00 * a11 - a01 * a10,
			b01 = a00 * a12 - a02 * a10,
			b02 = a00 * a13 - a03 * a10,
			b03 = a01 * a12 - a02 * a11,
			b04 = a01 * a13 - a03 * a11,
			b05 = a02 * a13 - a03 * a12,
			b06 = a20 * a31 - a21 * a30,
			b07 = a20 * a32 - a22 * a30,
			b08 = a20 * a33 - a23 * a30,
			b09 = a21 * a32 - a22 * a31,
			b10 = a21 * a33 - a23 * a31,
			b11 = a22 * a33 - a23 * a32;

		let det =
			b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
		if (!det) return this;
		det = 1.0 / det;

		return [
			(a11 * b11 - a12 * b10 + a13 * b09) * det,
			(a02 * b10 - a01 * b11 - a03 * b09) * det,
			(a31 * b05 - a32 * b04 + a33 * b03) * det,
			(a22 * b04 - a21 * b05 - a23 * b03) * det,

			(a12 * b08 - a10 * b11 - a13 * b07) * det,
			(a00 * b11 - a02 * b08 + a03 * b07) * det,
			(a32 * b02 - a30 * b05 - a33 * b01) * det,
			(a20 * b05 - a22 * b02 + a23 * b01) * det,

			(a10 * b10 - a11 * b08 + a13 * b06) * det,
			(a01 * b08 - a00 * b10 - a03 * b06) * det,
			(a30 * b04 - a31 * b02 + a33 * b00) * det,
			(a21 * b02 - a20 * b04 - a23 * b00) * det,

			(a11 * b07 - a10 * b09 - a12 * b06) * det,
			(a00 * b09 - a01 * b07 + a02 * b06) * det,
			(a31 * b01 - a30 * b03 - a32 * b00) * det,
			(a20 * b03 - a21 * b01 + a22 * b00) * det
		];
	},

	rotateXYZ(angleX, angleY, angleZ) {
		const cw = Math.cos(angleX),
			sw = Math.sin(angleX);
		const cy = Math.cos(angleY),
			sy = Math.sin(angleY);
		const ck = angleZ ? Math.cos(angleZ) : 1;
		const sk = angleZ ? Math.sin(angleZ) : 0;
		return [
			cy * ck,
			cw * sk + sw * sy * ck,
			sw * sk - cw * sy * ck,
			0,
			-cy * sk,
			cw * ck - sw * sy * sk,
			sw * ck + cw * sy * sk,
			0,
			sy,
			-sw * cy,
			cw * cy,
			0,
			0,
			0,
			0,
			1
		];
	},

	scale(m, x, y, z) {
		return this.multiply(m, [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);
	},

	translate(m, x, y, z) {
		return this.multiply(m, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
	},

	rotateX(m, angle) {
		angle = angle * (Math.PI / 180);
		const c = Math.cos(angle),
			s = Math.sin(angle);
		return this.multiply(m, [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
	},

	rotateY(m, angle) {
		angle = angle * (Math.PI / 180);
		const c = Math.cos(angle),
			s = Math.sin(angle);
		return this.multiply(m, [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
	},

	rotateZ(m, angle) {
		angle = angle * (Math.PI / 180);
		const c = Math.cos(angle),
			s = Math.sin(angle);
		return this.multiply(m, [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	}
};

/* ------------------------- mat4 chaining (builder) ------------------------- */

class Mat4 {
	constructor() {
		this.m = m4.identity();
	}
	scale(x, y, z) {
		this.m = m4.scale(this.m, x, y, z);
		return this;
	}
	translate(x, y, z) {
		this.m = m4.translate(this.m, x, y, z);
		return this;
	}
	rotateX(a) {
		this.m = m4.rotateX(this.m, a);
		return this;
	}
	rotateY(a) {
		this.m = m4.rotateY(this.m, a);
		return this;
	}
	rotateZ(a) {
		this.m = m4.rotateZ(this.m, a);
		return this;
	}
}

export const mat4 = () => new Mat4();