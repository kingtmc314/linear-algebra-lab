export type View3D = "xy" | "yz" | "xz" | "iso";
export type Projection3D = "perspective" | "orthographic";
export type Point3D = { x: number; y: number; z: number };
export interface Camera3D {
  eye: Point3D;
  up: Point3D;
  center: Point3D;
  projection: { type: Projection3D };
}
export type Bounds3D = Record<"x" | "y" | "z", [number, number]>;

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const array = (value: unknown): any[] =>
  Array.isArray(value) || ArrayBuffer.isView(value)
    ? Array.from(value as ArrayLike<any>)
    : [];
const rowLike = (value: unknown) =>
  Array.isArray(value) || ArrayBuffer.isView(value);

/** Only complete finite points contribute; null separators must not become zeroes. */
export function dataBounds3D(data: any[], includeOrigin = false): Bounds3D {
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];
  const add = (x: unknown, y: unknown, z: unknown) => {
    if (!finite(x) || !finite(y) || !finite(z)) return;
    [x, y, z].forEach((value, axis) => {
      mins[axis] = Math.min(mins[axis], value);
      maxs[axis] = Math.max(maxs[axis], value);
    });
  };
  if (includeOrigin) add(0, 0, 0);
  for (const trace of data) {
    if (!trace || trace.visible === false || trace.visible === "legendonly")
      continue;
    const xs = array(trace.x),
      ys = array(trace.y),
      zs = array(trace.z);
    if (trace.type === "surface") {
      zs.forEach((row, j) =>
        array(row).forEach((z, i) => {
          const x =
            trace.x == null ? i : rowLike(xs[j]) ? array(xs[j])[i] : xs[i];
          const y =
            trace.y == null ? j : rowLike(ys[j]) ? array(ys[j])[i] : ys[j];
          add(x, y, z);
        })
      );
    } else {
      const us = array(trace.u),
        vs = array(trace.v),
        ws = array(trace.w);
      for (let i = 0; i < Math.min(xs.length, ys.length, zs.length); i++) {
        add(xs[i], ys[i], zs[i]);
        if (
          trace.type === "cone" &&
          finite(xs[i]) &&
          finite(ys[i]) &&
          finite(zs[i]) &&
          finite(us[i]) &&
          finite(vs[i]) &&
          finite(ws[i])
        ) {
          add(xs[i] + us[i], ys[i] + vs[i], zs[i] + ws[i]);
        }
      }
    }
  }
  if (!Number.isFinite(mins[0])) return { x: [-1, 1], y: [-1, 1], z: [-1, 1] };
  const longest = Math.max(...maxs.map((max, i) => max - mins[i]), 1);
  const ranges = mins.map((min, i): [number, number] => {
    const span = maxs[i] - min;
    // Give planar/collinear geometry a finite depth without stretching its units.
    const padding = Math.max(span * 0.1, longest * 0.025);
    return [min - padding, maxs[i] + padding];
  });
  return { x: ranges[0], y: ranges[1], z: ranges[2] };
}

export function presetCamera3D(
  view: View3D = "iso",
  projection: Projection3D = "perspective"
): Camera3D {
  const eye =
    view === "xy"
      ? { x: 0, y: 0, z: 2.5 }
      : view === "yz"
        ? { x: 2.5, y: 0, z: 0 }
        : view === "xz"
          ? { x: 0, y: -2.5, z: 0 }
          : { x: 1.6, y: 1.6, z: 1.3 };
  return {
    eye,
    up: view === "xy" ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 },
    center: { x: 0, y: 0, z: 0 },
    projection: { type: projection },
  };
}

export function zoomCamera3D(camera: Camera3D, factor: number): Camera3D {
  const distance = Math.hypot(camera.eye.x, camera.eye.y, camera.eye.z);
  if (
    !Number.isFinite(distance) ||
    distance === 0 ||
    !Number.isFinite(factor) ||
    factor <= 0
  )
    return presetCamera3D("iso", camera.projection.type);
  const scale = Math.min(12, Math.max(0.25, distance * factor)) / distance;
  return {
    ...camera,
    eye: {
      x: camera.eye.x * scale,
      y: camera.eye.y * scale,
      z: camera.eye.z * scale,
    },
  };
}

export function fitCamera3D(camera: Camera3D): Camera3D {
  const distance = Math.hypot(camera.eye.x, camera.eye.y, camera.eye.z);
  return {
    ...zoomCamera3D(camera, distance > 0 ? 2.6 / distance : 1),
    center: { x: 0, y: 0, z: 0 },
  };
}

export function boundsRelayout3D(bounds: Bounds3D): Record<string, any> {
  const update: Record<string, any> = { "scene.aspectmode": "data" };
  for (const axis of ["x", "y", "z"] as const) {
    update[`scene.${axis}axis.range`] = bounds[axis];
    update[`scene.${axis}axis.autorange`] = false;
  }
  return update;
}

interface LayoutSettings3D {
  uirevision: string;
  camera: Camera3D;
  axes: boolean;
  grid: boolean;
  dragmode: "orbit" | "pan";
  dark?: boolean;
}

/** Keep scene annotations/styling, but never let caller ranges clip actual geometry. */
export function sceneLayout3D(
  data: any[],
  layout: any = {},
  settings: LayoutSettings3D
): any {
  const bounds = dataBounds3D(data);
  const scene = layout.scene ?? {};
  const bg = settings.dark ? "#171d2a" : "#f8fafc";
  const color = settings.dark ? "#cbd5e1" : "#475569";
  const axes: Record<string, any> = {};
  for (const axis of ["x", "y", "z"] as const) {
    const override = scene[`${axis}axis`] ?? {};
    const supplied = override.range;
    const range: [number, number] =
      Array.isArray(supplied) && supplied.length === 2 && supplied.every(finite)
        ? [
            Math.min(bounds[axis][0], ...supplied),
            Math.max(bounds[axis][1], ...supplied),
          ]
        : bounds[axis];
    axes[`${axis}axis`] = {
      title: { text: axis },
      tickfont: { size: 10 },
      gridcolor: settings.dark ? "#334155" : "#dbe2ea",
      zerolinecolor: "#94a3b8",
      showbackground: false,
      ...override,
      range,
      autorange: false,
      visible: settings.axes,
      showgrid: settings.grid,
    };
  }
  return {
    paper_bgcolor: bg,
    font: { family: "IBM Plex Sans, sans-serif", color },
    margin: { l: 0, r: 0, t: 10, b: 10 },
    legend: { orientation: "h", x: 0, y: 1.08, font: { size: 10 } },
    ...layout,
    autosize: true,
    width: undefined,
    height: undefined,
    uirevision: settings.uirevision,
    dragmode: settings.dragmode,
    scene: {
      bgcolor: bg,
      ...scene,
      ...axes,
      aspectmode: "data",
      uirevision: settings.uirevision,
      dragmode: settings.dragmode,
      camera: settings.camera,
    },
  };
}

/** Plotly rendering, relayout, resize and purge must never race each other. */
export function createPlot3DQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(operation: () => T | Promise<T>): Promise<T> {
    const next = tail.then(operation, operation);
    tail = next.catch(() => undefined);
    return next;
  };
}
