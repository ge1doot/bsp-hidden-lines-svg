import { v4 } from "../math/vec4.js";
import { polygon } from "../bsp/polygon.js";

export const cube = (transform) => {
	const p = [
		v4.multiplyMatrix([1, 1, 1, 1], transform),
		v4.multiplyMatrix([-1, 1, 1, 1], transform),
		v4.multiplyMatrix([-1, -1, 1, 1], transform),
		v4.multiplyMatrix([1, -1, 1, 1], transform),
		v4.multiplyMatrix([1, 1, -1, 1], transform),
		v4.multiplyMatrix([-1, 1, -1, 1], transform),
		v4.multiplyMatrix([-1, -1, -1, 1], transform),
		v4.multiplyMatrix([1, -1, -1, 1], transform)
	];
	return [
		polygon.createIndexed(p, [0, 1, 2, 3]),
		polygon.createIndexed(p, [7, 6, 5, 4]),
		polygon.createIndexed(p, [0, 3, 7, 4]),
		polygon.createIndexed(p, [0, 4, 5, 1]),
		polygon.createIndexed(p, [5, 6, 2, 1]),
		polygon.createIndexed(p, [3, 2, 6, 7])
	];
};

export const pyramid = (transform) => {
	const p = [
		v4.multiplyMatrix([1, 0, 1, 1], transform),
		v4.multiplyMatrix([-1, 0, 1, 1], transform),
		v4.multiplyMatrix([-1, 0, -1, 1], transform),
		v4.multiplyMatrix([1, 0, -1, 1], transform),
		v4.multiplyMatrix([0, 2, 0, 1], transform)
	];
	return [
		polygon.createIndexed(p, [0, 1, 2, 3]),
		polygon.createIndexed(p, [4, 1, 0]),
		polygon.createIndexed(p, [4, 0, 3]),
		polygon.createIndexed(p, [4, 2, 1]),
		polygon.createIndexed(p, [4, 3, 2])
	];
};

export const diamond = (transform) => {
	const p = [
		v4.multiplyMatrix([1, 0, 1, 1], transform),
		v4.multiplyMatrix([-1, 0, 1, 1], transform),
		v4.multiplyMatrix([-1, 0, -1, 1], transform),
		v4.multiplyMatrix([1, 0, -1, 1], transform),
		v4.multiplyMatrix([0, 1, 0, 1], transform),
		v4.multiplyMatrix([0, -1, 0, 1], transform)
	];
	return [
		polygon.createIndexed(p, [4, 1, 0]),
		polygon.createIndexed(p, [4, 0, 3]),
		polygon.createIndexed(p, [4, 2, 1]),
		polygon.createIndexed(p, [4, 3, 2]),
		polygon.createIndexed(p, [0, 1, 5]),
		polygon.createIndexed(p, [3, 0, 5]),
		polygon.createIndexed(p, [1, 2, 5]),
		polygon.createIndexed(p, [2, 3, 5])
	];
};