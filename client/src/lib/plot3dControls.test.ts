import { describe, expect, it, vi } from "vitest";
import {
  boundsRelayout3D,
  createPlot3DQueue,
  dataBounds3D,
  fitCamera3D,
  presetCamera3D,
  sceneLayout3D,
  zoomCamera3D,
} from "./plot3dControls";
import { buildVectorPlot3DData } from "../components/VectorPlot3D";

const vectors = [
  { x: -30, y: 40, z: -50, color: "blue", label: "a" },
  { x: 70, y: -80, z: 90, color: "red", label: "b" },
];
const trace = (x: unknown[], y: unknown[], z: unknown[]) => ({
  type: "scatter3d",
  x,
  y,
  z,
});
const settings = {
  uirevision: "stable",
  camera: presetCamera3D(),
  axes: true,
  grid: true,
  dragmode: "orbit" as const,
};

describe("3D bounds", () => {
  it("contains negative coordinates and mesh arrowhead vertices with padding", () => {
    const data = [
      trace([-100, 2], [-3, 20], [0, 8]),
      { type: "mesh3d", x: [-120, -110], y: [-5, 4], z: [-6, -2] },
    ];
    const bounds = dataBounds3D(data);
    expect(bounds.x[0]).toBeLessThan(-120);
    expect(bounds.x[1]).toBeGreaterThan(2);
    expect(bounds.y[0]).toBeLessThan(-5);
    expect(bounds.z[0]).toBeLessThan(-6);
  });
  it("ignores null separators, numeric strings, invalid tuples and invisible traces", () => {
    const bounds = dataBounds3D([
      trace(
        [10, null, "-9999", -9999, NaN, Infinity],
        [12, null, 3, null, 4, 5],
        [15, null, 2, 4, 5, 6]
      ),
      { ...trace([-9999], [-9999], [-9999]), visible: false },
      { ...trace([-9999], [-9999], [-9999]), visible: "legendonly" },
    ]);
    expect(bounds.x[0]).toBeGreaterThan(9);
    expect(bounds.y[0]).toBeGreaterThan(11);
    expect(bounds.z[0]).toBeGreaterThan(14);
  });
  it("handles typed arrays and finite fallback ranges for empty and planar data", () => {
    expect(dataBounds3D([])).toEqual({ x: [-1, 1], y: [-1, 1], z: [-1, 1] });
    const bounds = dataBounds3D([
      {
        type: "mesh3d",
        x: new Float64Array([-20, 30]),
        y: new Float64Array([0, 0]),
        z: new Float64Array([5, 5]),
      },
    ]);
    expect(bounds.x[0]).toBeLessThan(-20);
    expect(bounds.x[1]).toBeGreaterThan(30);
    expect(bounds.y[0]).toBeLessThan(0);
    expect(bounds.y[1]).toBeGreaterThan(0);
    expect(bounds.z[0]).toBeLessThan(5);
    expect(bounds.z[1]).toBeGreaterThan(5);
  });
  it("includes surface coordinates and data-coordinate cone tips", () => {
    const bounds = dataBounds3D([
      {
        type: "surface",
        x: [-200, 300],
        y: [10, 20],
        z: [
          [1, 2],
          [3, 4],
        ],
      },
      { type: "cone", x: [0], y: [0], z: [0], u: [900], v: [-500], w: [-700] },
    ]);
    expect(bounds.x[0]).toBeLessThan(-200);
    expect(bounds.x[1]).toBeGreaterThan(900);
    expect(bounds.y[0]).toBeLessThan(-500);
    expect(bounds.z[0]).toBeLessThan(-700);
  });
  it("does not replace explicit null surface coordinates with array indices", () => {
    const bounds = dataBounds3D([
      { type: "surface", x: [10, null], y: [20], z: [[30, -99999]] },
    ]);
    expect(bounds.x[0]).toBeGreaterThan(9);
    expect(bounds.z[0]).toBeGreaterThan(29);
  });
});

describe("real scene control updates", () => {
  it("returns perpendicular camera orientations with non-parallel up vectors", () => {
    const front = presetCamera3D("xy");
    expect(front.eye).toEqual({ x: 0, y: 0, z: 2.5 });
    expect(front.up).toEqual({ x: 0, y: 1, z: 0 });
    expect(presetCamera3D("yz").eye).toEqual({ x: 2.5, y: 0, z: 0 });
    expect(presetCamera3D("xz").eye).toEqual({ x: 0, y: -2.5, z: 0 });
    expect(presetCamera3D("iso", "orthographic").projection.type).toBe(
      "orthographic"
    );
  });
  it("zooms along the existing viewing direction and clamps extreme zoom", () => {
    const camera = presetCamera3D("iso", "orthographic");
    const original = structuredClone(camera);
    const closer = zoomCamera3D(camera, 0.8);
    expect(Math.hypot(...Object.values(closer.eye))).toBeLessThan(
      Math.hypot(...Object.values(camera.eye))
    );
    expect(closer.eye.x / closer.eye.z).toBeCloseTo(
      camera.eye.x / camera.eye.z
    );
    expect(closer.projection.type).toBe("orthographic");
    expect(
      Math.hypot(...Object.values(zoomCamera3D(camera, 1e-20).eye))
    ).toBeCloseTo(0.25);
    expect(
      Math.hypot(...Object.values(zoomCamera3D(camera, 1e20).eye))
    ).toBeCloseTo(12);
    expect(camera).toEqual(original);
  });
  it("fit recenters the camera and writes explicit ranges with equal-unit aspect mode", () => {
    const camera = { ...presetCamera3D("yz"), center: { x: 1, y: -2, z: 3 } };
    const fitted = fitCamera3D(camera);
    expect(fitted.center).toEqual({ x: 0, y: 0, z: 0 });
    expect(Math.hypot(...Object.values(fitted.eye))).toBeCloseTo(2.6);
    const bounds = dataBounds3D([trace([-1000, 2000], [0, 1], [2, 4])]);
    const update = boundsRelayout3D(bounds);
    expect(update["scene.aspectmode"]).toBe("data");
    expect(update["scene.xaxis.range"]).toEqual(bounds.x);
    expect(update["scene.zaxis.autorange"]).toBe(false);
  });
  it("preserves annotations/style but does not accept clipping ranges or cube aspect", () => {
    const annotations = [{ x: -200, y: 0, z: 1, text: "a×b" }];
    const layout = {
      scene: {
        annotations,
        camera: presetCamera3D("xy"),
        aspectmode: "cube",
        xaxis: {
          range: [-1, 1],
          title: { text: "custom x" },
          gridcolor: "red",
        },
      },
      width: 800,
      height: 600,
    };
    const original = structuredClone(layout);
    const merged = sceneLayout3D(
      [trace([-200, 300], [0, 1], [0, 1])],
      layout,
      settings
    );
    expect(merged.scene.xaxis.range[0]).toBeLessThan(-200);
    expect(merged.scene.xaxis.range[1]).toBeGreaterThan(300);
    expect(merged.scene.xaxis.title.text).toBe("custom x");
    expect(merged.scene.xaxis.gridcolor).toBe("red");
    expect(merged.scene.annotations).toEqual(annotations);
    expect(merged.scene.camera).toEqual(settings.camera);
    expect(merged.scene.aspectmode).toBe("data");
    expect(merged.scene.uirevision).toBe("stable");
    expect(merged.width).toBeUndefined();
    expect(layout).toEqual(original);
  });
  it("honors axes/grid/pan switches and expands caller-provided wider ranges", () => {
    const merged = sceneLayout3D(
      [trace([0, 1], [0, 1], [0, 1])],
      { scene: { xaxis: { range: [-100, 200] } } },
      { ...settings, axes: false, grid: false, dragmode: "pan" }
    );
    expect(merged.scene.xaxis.range).toEqual([-100, 200]);
    expect(merged.scene.yaxis.visible).toBe(false);
    expect(merged.scene.zaxis.showgrid).toBe(false);
    expect(merged.scene.dragmode).toBe("pan");
  });
});

describe("vector derivation stages", () => {
  it("shows the cross parallelogram at stage 1 but not stage 0, preserving full bounds", () => {
    const zero = buildVectorPlot3DData({
      vectors,
      op: "cross",
      constructionStage: 0,
    });
    const one = buildVectorPlot3DData({
      vectors,
      op: "cross",
      constructionStage: 1,
    });
    const two = buildVectorPlot3DData({ vectors, op: "cross" });
    expect(zero.plotData[0].visible).toBe(false);
    expect(one.plotData[0].visible).not.toBe(false);
    expect(two.plotData[0].opacity).toBe(0.18);
    expect(two.plotData[0].k).toEqual([2, 3]);
    expect(dataBounds3D(zero.boundsData)).toEqual(dataBounds3D(two.boundsData));
    const bounds = dataBounds3D(zero.boundsData);
    // a×b = (-400,-800,-400); fit must not only include input ±90.
    expect(bounds.y[0]).toBeLessThan(-800);
    expect(two.annotations3d.some(a => a.text.includes("Area"))).toBe(false);
  });
  it("shows plane then projection/drop at stages 1 and 2 with stable ranges", () => {
    const args = {
      vectors,
      op: "projection",
      projVector: [12, -15, 18],
      perpVector: [-42, 55, -68],
    };
    const one = buildVectorPlot3DData({ ...args, constructionStage: 1 });
    const two = buildVectorPlot3DData({ ...args, constructionStage: 2 });
    expect(one.plotData[0].visible).not.toBe(false);
    expect(one.plotData.find(t => t.line?.color === "#F59E0B")?.visible).toBe(
      false
    );
    expect(
      two.plotData.find(t => t.line?.color === "#F59E0B")?.visible
    ).not.toBe(false);
    expect(
      two.plotData.find(t => t.line?.dash === "dash")?.line.width
    ).toBeGreaterThanOrEqual(4);
    expect(dataBounds3D(one.boundsData)).toEqual(dataBounds3D(two.boundsData));
    expect(one.annotations3d.some(a => a.text.includes("proj"))).toBe(false);
    expect(two.annotations3d.some(a => a.text.includes("proj"))).toBe(true);
  });
  it("hides supplied result arrows before stage 2 and labels decimal approximations", () => {
    const input = [
      ...vectors,
      { x: 0.3333333, y: -0.6666667, z: 1, color: "green", label: "r" },
    ];
    const one = buildVectorPlot3DData({ vectors: input, constructionStage: 1 });
    const two = buildVectorPlot3DData({ vectors: input });
    expect(one.plotData.find(t => t.name === "結果向量")?.visible).toBe(false);
    expect(
      two.plotData.find(t => t.name === "結果向量")?.hovertemplate
    ).toContain("≈");
    expect(one.annotations3d.some(a => a.text === "<b>r</b>")).toBe(false);
    expect(dataBounds3D(one.boundsData)).toEqual(dataBounds3D(two.boundsData));
  });
  it("keeps tip-to-tail dashed auxiliaries and negative computed sums inside the fit", () => {
    const data = buildVectorPlot3DData({ vectors, op: "sub" });
    const auxiliary = data.plotData.find(t => t.line?.dash === "dash");
    expect(auxiliary?.line.width).toBe(5);
    expect(auxiliary?.x).toEqual([-30, -100]);
    expect(dataBounds3D(data.boundsData).x[0]).toBeLessThan(-100);
  });
});

describe("Plotly operation queue", () => {
  it("serializes a slow react, relayout, resize and cleanup", async () => {
    const enqueue = createPlot3DQueue();
    const order: string[] = [];
    let release!: () => void;
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    const react = enqueue(async () => {
      order.push("react start");
      await blocked;
      order.push("react end");
    });
    const relayout = enqueue(() => order.push("relayout"));
    const resize = enqueue(() => order.push("resize"));
    const purge = enqueue(() => order.push("purge"));
    await Promise.resolve();
    expect(order).toEqual(["react start"]);
    release();
    await Promise.all([react, relayout, resize, purge]);
    expect(order).toEqual([
      "react start",
      "react end",
      "relayout",
      "resize",
      "purge",
    ]);
  });
  it("continues after rejected operations", async () => {
    const enqueue = createPlot3DQueue();
    await expect(
      enqueue(() => Promise.reject(new Error("failed load")))
    ).rejects.toThrow("failed load");
    const success = vi.fn(() => "ready");
    await expect(enqueue(success)).resolves.toBe("ready");
    expect(success).toHaveBeenCalledOnce();
  });
});
