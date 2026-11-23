import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Expand,
  Hand,
  Minus,
  Move3D,
  Plus,
  RotateCcw,
  Scan,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  boundsRelayout3D,
  createPlot3DQueue,
  dataBounds3D,
  fitCamera3D,
  presetCamera3D,
  sceneLayout3D,
  zoomCamera3D,
  type Camera3D,
  type Projection3D,
  type View3D,
} from "@/lib/plot3dControls";

export interface Plot3DSceneProps {
  data: any[];
  layout?: any;
  /** Optional full construction geometry keeps fit/ranges stable during playback. */
  boundsData?: any[];
  lang?: "zh" | "en";
  name?: string;
  /** Change deliberately to reset the saved camera, not on every calculation. */
  uirevision?: string;
  height?: number;
  className?: string;
  /** Disabled by default so wheel scrolling continues to scroll the page. */
  scrollZoom?: boolean;
}

let plotlyPromise: Promise<any> | undefined;
function loadPlotly() {
  if (!plotlyPromise) {
    plotlyPromise = import("plotly.js-dist-min")
      .then(module => module.default ?? module)
      .catch(error => {
        plotlyPromise = undefined;
        throw error;
      });
  }
  return plotlyPromise;
}

type Action =
  | "fit"
  | "reset"
  | "in"
  | "out"
  | View3D
  | { patch: Record<string, any> };
interface Controller {
  action: (action: Action) => Promise<void>;
  resize: () => void;
}
interface CanvasProps extends Plot3DSceneProps {
  cameraRef: { current: Camera3D };
  controllerRef: { current: Controller | null };
  axes: boolean;
  grid: boolean;
  dragmode: "orbit" | "pan";
  dark: boolean;
  active: boolean;
  onCameraChange: () => void;
}

/** One lifecycle per DOM chart; no purge in the data-update effect. */
function PlotCanvas({
  data,
  boundsData,
  layout,
  uirevision = "plot3d-scene",
  height = 400,
  name,
  lang = "zh",
  scrollZoom = false,
  cameraRef,
  controllerRef,
  axes,
  grid,
  dragmode,
  dark,
  active,
  onCameraChange,
}: CanvasProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const queue = useRef(createPlot3DQueue()).current;
  const lifecycle = useRef<{
    active: boolean;
    plotly?: any;
    listener?: () => void;
  } | null>(null);
  const latest = useRef({ data: boundsData ?? data, active });
  latest.current = { data: boundsData ?? data, active };
  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const element = elementRef.current as any;
    if (!element) return;
    const token: NonNullable<typeof lifecycle.current> = { active: true };
    lifecycle.current = token;
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        void queue(async () => {
          if (
            !token.active ||
            !token.plotly ||
            !element.isConnected ||
            !element.clientWidth
          )
            return;
          await token.plotly.Plots.resize(element);
        }).catch(() => undefined);
      });
    };
    const controller: Controller = {
      resize,
      action: action =>
        queue(async () => {
          if (!token.active || !token.plotly || !element.layout) return;
          const current = element.layout.scene?.camera ?? cameraRef.current;
          let patch: Record<string, any>;
          if (typeof action === "object") patch = action.patch;
          else if (action === "fit" || action === "reset") {
            const camera =
              action === "reset"
                ? presetCamera3D(
                    "iso",
                    current.projection?.type ?? "perspective"
                  )
                : fitCamera3D(current);
            patch = {
              ...boundsRelayout3D(dataBounds3D(latest.current.data)),
              "scene.camera": camera,
            };
          } else {
            const camera =
              action === "in" || action === "out"
                ? zoomCamera3D(current, action === "in" ? 0.8 : 1.25)
                : presetCamera3D(
                    action,
                    current.projection?.type ?? "perspective"
                  );
            patch = { "scene.camera": camera };
          }
          await token.plotly.relayout(element, patch);
          if (
            token.active &&
            latest.current.active &&
            element.layout?.scene?.camera
          )
            cameraRef.current = element.layout.scene.camera;
        }),
    };
    controllerRef.current = controller;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : undefined;
    observer?.observe(element);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      token.active = false;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      if (controllerRef.current === controller) controllerRef.current = null;
      // Serialize purge after any in-flight react/relayout. Capture the element,
      // rather than reading a ref that React has already cleared on unmount.
      void queue(() => {
        if (token.listener)
          element.removeListener?.("plotly_relayout", token.listener);
        token.plotly?.purge(element);
      }).catch(() => undefined);
    };
  }, [queue, cameraRef, controllerRef]);

  useEffect(() => {
    const token = lifecycle.current;
    const element = elementRef.current as any;
    if (!token || !element) return;
    void queue(async () => {
      if (!token.active || !active || !latest.current.active) return;
      const Plotly = await loadPlotly();
      if (!token.active || !latest.current.active) return;
      token.plotly = Plotly;
      // The relayout listener owns this ref; it also survives modal transitions.
      const camera = cameraRef.current;
      const nextLayout = sceneLayout3D(boundsData ?? data, layout, {
        axes,
        grid,
        dragmode,
        dark,
        uirevision,
        camera,
      });
      await Plotly.react(element, data, nextLayout, {
        responsive: true,
        displaylogo: false,
        displayModeBar: false,
        scrollZoom,
        doubleClick: false,
        showTips: false,
      });
      if (!token.active) return;
      if (!token.listener) {
        token.listener = () => {
          if (!token.active || !latest.current.active) return;
          const camera = element.layout?.scene?.camera;
          if (camera) cameraRef.current = camera;
          onCameraChangeRef.current();
        };
        element.on?.("plotly_relayout", token.listener);
      }
      setStatus("ready");
    }).catch(() => {
      if (token.active) setStatus("error");
    });
  }, [
    data,
    boundsData,
    layout,
    axes,
    grid,
    dragmode,
    dark,
    uirevision,
    scrollZoom,
    retry,
    queue,
    cameraRef,
    active,
  ]);

  useEffect(() => {
    if (!active) return;
    // Opening/closing the overlay restores the shared camera on the inline chart.
    const camera = cameraRef.current;
    void controllerRef.current
      ?.action({ patch: { "scene.camera": camera } })
      .catch(() => undefined);
    controllerRef.current?.resize();
  }, [active, controllerRef, cameraRef]);

  return (
    <div
      className="relative min-h-0 w-full"
      style={{ height }}
      aria-busy={status === "loading"}
    >
      <div
        ref={elementRef}
        className="h-full w-full"
        role="img"
        aria-label={
          name ?? (lang === "zh" ? "可互動三維圖" : "Interactive 3D chart")
        }
      />
      {status === "loading" && (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-0 top-8 text-center text-sm text-muted-foreground"
        >
          {lang === "zh" ? "載入三維圖…" : "Loading 3D chart…"}
        </p>
      )}
      {status === "error" && (
        <div
          role="alert"
          className="absolute inset-x-3 top-8 rounded-lg border bg-background p-4 text-sm"
        >
          <p>
            {lang === "zh"
              ? "三維圖載入失敗，可重試或使用下方數值結果。"
              : "The 3D chart could not load. Retry or use the numeric results below."}
          </p>
          <button
            type="button"
            className="mt-2 min-h-11 rounded-md border px-4"
            onClick={() => {
              setStatus("loading");
              setRetry(value => value + 1);
            }}
          >
            {lang === "zh" ? "重試" : "Retry"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Plot3DScene({
  data,
  boundsData,
  layout,
  lang = "zh",
  name,
  uirevision = "plot3d-scene",
  height = 400,
  className = "",
  scrollZoom = false,
}: Plot3DSceneProps) {
  const title = name ?? (lang === "zh" ? "三維圖" : "3D scene");
  const initialCamera = presetCamera3D();
  const suppliedCamera = layout?.scene?.camera;
  const cameraRef = useRef<Camera3D>({
    ...initialCamera,
    ...suppliedCamera,
    eye: { ...initialCamera.eye, ...suppliedCamera?.eye },
    up: { ...initialCamera.up, ...suppliedCamera?.up },
    center: { ...initialCamera.center, ...suppliedCamera?.center },
    projection: { ...initialCamera.projection, ...suppliedCamera?.projection },
  });
  const inlineController = useRef<Controller | null>(null);
  const overlayController = useRef<Controller | null>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const revisionRef = useRef(uirevision);
  const [expanded, setExpanded] = useState(false);
  const [axes, setAxes] = useState(true);
  const [grid, setGrid] = useState(true);
  const [dragmode, setDragmode] = useState<"orbit" | "pan">("orbit");
  const [projection, setProjection] = useState<Projection3D>(
    cameraRef.current.projection.type
  );
  const [wheel, setWheel] = useState(scrollZoom);
  const [controlError, setControlError] = useState(false);
  const [dark, setDark] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState(height);
  useEffect(() => setWheel(scrollZoom), [scrollZoom]);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (revisionRef.current === uirevision) return;
    revisionRef.current = uirevision;
    cameraRef.current = presetCamera3D("iso", projection);
    void inlineController.current
      ?.action("reset")
      .catch(() => setControlError(true));
    void overlayController.current
      ?.action("reset")
      .catch(() => setControlError(true));
  }, [uirevision, projection]);
  useEffect(() => {
    if (!expanded) return;
    const measure = () =>
      setOverlayHeight(
        Math.max(
          160,
          (window.visualViewport?.height ?? window.innerHeight) - 255
        )
      );
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [expanded]);

  const execute = (action: Action) => {
    setControlError(false);
    const controller = expanded
      ? overlayController.current
      : inlineController.current;
    void controller?.action(action).catch(() => setControlError(true));
  };
  const onCameraChange = useCallback(() => undefined, []);
  const labels = useMemo(
    () =>
      lang === "zh"
        ? {
            xy: "XY 視角",
            yz: "YZ 視角",
            xz: "XZ 視角",
            iso: "等角",
            orbit: "旋轉",
            pan: "平移",
            zoomIn: "放大",
            zoomOut: "縮小",
            fit: "完整顯示",
            reset: "重設",
            axes: "座標軸",
            grid: "網格",
            perspective: "透視",
            orthographic: "正交",
            expand: "展開",
            close: "收起",
            wheel: "滾輪縮放",
            hint: "拖曳旋轉／平移；雙指縮放。用視角按鈕快速對齊；滾輪預設捲動頁面。",
          }
        : {
            xy: "XY view",
            yz: "YZ view",
            xz: "XZ view",
            iso: "Isometric",
            orbit: "Orbit",
            pan: "Pan",
            zoomIn: "Zoom in",
            zoomOut: "Zoom out",
            fit: "Fit all",
            reset: "Reset",
            axes: "Axes",
            grid: "Grid",
            perspective: "Perspective",
            orthographic: "Orthographic",
            expand: "Expand",
            close: "Collapse",
            wheel: "Wheel zoom",
            hint: "Drag to orbit/pan; pinch to zoom. View buttons align the scene. Wheel scrolling moves the page by default.",
          },
    [lang]
  );
  const buttonClass =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary/10 aria-pressed:border-primary/50";
  const controls = (overlay = false) => (
    <div className="space-y-2 border-b border-border bg-background/95 p-2.5">
      <div
        role="group"
        aria-label={lang === "zh" ? "三維視角" : "3D viewpoints"}
        className="flex flex-wrap gap-1.5"
      >
        {(["xy", "yz", "xz", "iso"] as const).map(view => (
          <button
            key={view}
            type="button"
            className={buttonClass}
            onClick={() => execute(view)}
            title={labels[view]}
            aria-label={labels[view]}
          >
            {labels[view]}
          </button>
        ))}
        <button
          type="button"
          className={buttonClass}
          aria-pressed={dragmode === "orbit"}
          onClick={() => {
            setDragmode("orbit");
            execute({
              patch: { "scene.dragmode": "orbit", dragmode: "orbit" },
            });
          }}
        >
          <Move3D size={16} aria-hidden="true" />
          {labels.orbit}
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-pressed={dragmode === "pan"}
          onClick={() => {
            setDragmode("pan");
            execute({ patch: { "scene.dragmode": "pan", dragmode: "pan" } });
          }}
        >
          <Hand size={16} aria-hidden="true" />
          {labels.pan}
        </button>
        {!overlay && (
          <button
            ref={expandButton}
            type="button"
            className={`${buttonClass} ml-auto`}
            onClick={() => setExpanded(true)}
            aria-label={labels.expand}
            title={labels.expand}
          >
            <Expand size={17} aria-hidden="true" />
            <span className="hidden sm:inline">{labels.expand}</span>
          </button>
        )}
      </div>
      <div
        role="group"
        aria-label={lang === "zh" ? "三維圖顯示控制" : "3D display controls"}
        className="flex flex-wrap gap-1.5"
      >
        <button
          type="button"
          className={buttonClass}
          aria-label={labels.zoomIn}
          title={labels.zoomIn}
          onClick={() => execute("in")}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-label={labels.zoomOut}
          title={labels.zoomOut}
          onClick={() => execute("out")}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => execute("fit")}
        >
          <Scan size={16} aria-hidden="true" />
          {labels.fit}
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => execute("reset")}
        >
          <RotateCcw size={16} aria-hidden="true" />
          {labels.reset}
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-pressed={projection === "orthographic"}
          onClick={() => {
            const next =
              projection === "perspective" ? "orthographic" : "perspective";
            setProjection(next);
            execute({ patch: { "scene.camera.projection.type": next } });
          }}
        >
          {projection === "perspective"
            ? labels.perspective
            : labels.orthographic}
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-pressed={axes}
          onClick={() => {
            setAxes(!axes);
            execute({
              patch: {
                "scene.xaxis.visible": !axes,
                "scene.yaxis.visible": !axes,
                "scene.zaxis.visible": !axes,
              },
            });
          }}
        >
          {labels.axes}
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-pressed={grid}
          onClick={() => {
            setGrid(!grid);
            execute({
              patch: {
                "scene.xaxis.showgrid": !grid,
                "scene.yaxis.showgrid": !grid,
                "scene.zaxis.showgrid": !grid,
              },
            });
          }}
        >
          {labels.grid}
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-pressed={wheel}
          onClick={() => setWheel(!wheel)}
        >
          {labels.wheel}
        </button>
      </div>
    </div>
  );
  const canvasProps = {
    data,
    boundsData,
    layout,
    lang,
    name: title,
    uirevision,
    cameraRef,
    axes,
    grid,
    dragmode,
    dark,
    scrollZoom: wheel,
    onCameraChange,
  };
  return (
    <section
      className={`w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background ${className}`}
      aria-label={title}
    >
      <div style={{ display: expanded ? "none" : undefined }}>
        {controls()}
        <PlotCanvas
          {...canvasProps}
          height={height}
          controllerRef={inlineController}
          active={!expanded}
        />
        <p className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground">
          {labels.hint}
        </p>
      </div>
      {expanded && (
        <div className="flex min-h-24 items-center justify-center p-4 text-sm text-muted-foreground">
          {lang === "zh" ? "三維圖已展開" : "3D scene expanded"}
        </div>
      )}
      {controlError && (
        <p role="alert" className="px-3 pb-2 text-xs text-destructive">
          {lang === "zh"
            ? "無法更新視角，請重試。"
            : "The view could not update. Please retry."}
        </p>
      )}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[96dvh] w-[calc(100vw-1rem)] max-w-none flex-col gap-2 overflow-y-auto p-2 sm:max-w-[1100px] sm:p-3"
          onCloseAutoFocus={event => {
            event.preventDefault();
            expandButton.current?.focus();
          }}
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <DialogTitle className="text-sm">{title}</DialogTitle>
            <button
              type="button"
              className={buttonClass}
              onClick={() => setExpanded(false)}
              aria-label={labels.close}
            >
              <X size={18} aria-hidden="true" />
              {labels.close}
            </button>
          </div>
          <DialogDescription className="sr-only">
            {labels.hint}
          </DialogDescription>
          {controls(true)}
          <PlotCanvas
            {...canvasProps}
            height={overlayHeight}
            controllerRef={overlayController}
            active={expanded}
          />
          <p className="px-2 pb-1 text-xs text-muted-foreground">
            {labels.hint}
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
