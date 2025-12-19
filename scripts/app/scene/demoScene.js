import { mat4 } from "../math/mat4.js";
import { BspTree } from "../bsp/bspTree.js";
import { cube, diamond, pyramid } from "../scene/primitives.js";

export function buildDemoWorld() {
	const world = new BspTree();

	// Main "machine"
	world.insert(cube(mat4().m), 1); // base cube
	world.insert(
		cube(mat4().scale(-1.5, -0.875, -1.5).translate(0.625, 0, 0).m),
		-1
	); // C cutout

	world.insert(
		cube(mat4().scale(0.15, 0.4, 0.4).translate(-0.95, 0, 0).rotateX(45).m),
		1
	); // window frame
	world.insert(
		cube(mat4().scale(-0.3, -0.3, -0.3).translate(-1, 0, 0).rotateX(45).m),
		-1
	); // window hole

	world.insert(
		cube(mat4().scale(0.15, 0.4, 0.4).translate(0.8, 0, 0).rotateX(45).m),
		1
	); // window frame
	world.insert(cube(mat4().scale(0.0625, 1.8, 0.0625).translate(0.8, 0, 0).m), 1); // support
	world.insert(
		cube(mat4().scale(-1.5, -0.3, -0.3).translate(0.8, 0, 0).rotateX(45).m),
		-1
	); // window hole

	world.insert(diamond(mat4().rotateZ(90).scale(4, 0.15, 0.15).rotateX(45).m), 1); // long diamond
	world.insert(
		pyramid(mat4().scale(0.5, 0.5, 0.5).translate(0, -1.25, 0).rotateZ(180).m),
		1
	); // pyramid
	world.insert(pyramid(mat4().scale(0.5, 0.5, 0.5).translate(0, -1.25, 0).m), 1); // pyramid

	world.insert(cube(mat4().scale(0.5, 0.05, 0.5).translate(0, -1.4, 0).m), 1); // slab
	world.insert(cube(mat4().scale(0.51, 0.05, 0.51).translate(0, -1.6, 0).m), 1); // slab
	world.insert(cube(mat4().scale(0.5, 0.05, 0.5).translate(0, 1.4, 0).m), 1); // slab
	world.insert(cube(mat4().scale(0.51, 0.05, 0.51).translate(0, 1.6, 0).m), 1); // slab

	world.reduce(); // compute boundary polys
	
	return world;
}