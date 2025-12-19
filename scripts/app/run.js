import { createSVGPlotter } from "../svg/SVGPlotter.js";
import { buildDemoWorld } from "./scene/demoScene.js";
import { camera } from "./core/camera.js";
import { Cad } from "./core/cadHiddenLine.js";
import { RoomHL } from "./scene/roomHL.js";

export function run() {
	const svgEl = document.querySelector("svg");
	const plot = createSVGPlotter(svgEl, {
		name: "BSP Tree",
		sizeMM: 200,
		viewBox: [0, 0, 200, 210],
		margin: 5,
		background: "#ffefd8",
		stroke: "#000",
		strokeWidth: 0.2,
		opacity: 1,
		centerOrigin: true,
		onRefresh: () => renderOnce()
	});

	function renderOnce() {
		const t0 = performance.now();
		plot.clear();
		const world = buildDemoWorld();

		camera.look([0, 0, 8], [0, 0, 0], 3);

		const cad = new Cad(world, camera, plot);
		cad.collectPolys();

		const room = new RoomHL(10, 5, 10);
		cad.addOccluderPolys(room.polys);
		cad.buildEdges();
		const edges0 = cad.edges.length;
		cad.filterSplitEdges();
		const edges1 = cad.edges.length;
		cad.purgeTJunctionEdges();
		cad.addDrawableEdges(room.edges);

		cad.setRotation(
			-0.15 * Math.PI + Math.random() * 0.3 * Math.PI,
			Math.random() * 2 * Math.PI,
			0
		);

		cad.drawHiddenEdges();
		plot.finalize();
		const t1 = performance.now();
		console.log(
			`render ${(t1 - t0).toFixed(1)} ms | polys=${
				cad.polys.length
			} | edges build=${edges0} afterFilter=${edges1}`
		);
	}
	renderOnce();

	svgEl.addEventListener(
		"pointerdown",
		(e) => {
			if (e.button !== 0) return;
			renderOnce();
		},
		{ passive: true }
	);

	svgEl.addEventListener("contextmenu", (e) => {
		e.stopPropagation();
	});
}
