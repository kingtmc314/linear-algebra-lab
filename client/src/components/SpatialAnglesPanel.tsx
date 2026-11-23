import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Box, Info, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import KatexRenderer from "@/components/KatexRenderer";
import StepDisplay from "@/components/StepDisplay";
import Plot3DScene from "@/components/Plot3DScene";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  computePointSpatialAngle,
  PointSpatialError,
  pointSpatialErrorMessage,
  pointSpatialSteps,
  pointSpatialScene,
  pointSpatialDefinitionLatex,
  type PointSpatialInput,
  type PointSpatialResult,
} from "@/lib/pointSpatialAngles";
import {
  spatialPlaneLatex,
  type SpatialLang,
  type SpatialScene,
} from "@/lib/spatialAngles";

type Mode = PointSpatialInput["mode"];
type EditableVec = [string, string, string];
interface GivenPointDraft {
  id: string;
  label: string;
  coordinates: EditableVec;
}
interface PointWorkspaceDraft {
  points: GivenPointDraft[];
  plane1: string[];
  plane2: string[];
  line: [string, string];
}
type PointPreset =
  | "right"
  | "sloping"
  | "inclined"
  | "cube"
  | "parallel"
  | "perpendicular";
const axes = ["x", "y", "z"] as const;
const pointLabelPattern = /^[A-Zα-ω]$/u;
const fieldClass =
  "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const text = (lang: SpatialLang, en: string, zh: string) =>
  lang === "zh" ? zh : en;
const emptyScene: SpatialScene = { data: [], layout: {}, note: "" };

function pointPreset(which: PointPreset): PointWorkspaceDraft {
  const cube =
    which === "cube" || which === "parallel" || which === "perpendicular";
  const coordinates: [number, number, number][] = cube
    ? [
        [0, 0, 0],
        [2, 0, 0],
        [2, 2, 0],
        [0, 2, 0],
        [0, 0, 2],
        [2, 0, 2],
        [2, 2, 2],
        [0, 2, 2],
      ]
    : which === "inclined"
      ? [
          [1, 1, 1],
          [3, 1, 3],
          [1, 3, 3],
          [3, 3, 1],
        ]
      : [
          [0, 0, 0],
          [2, 0, 0],
          [0, 2, 0],
          which === "sloping" ? [0, 2, 2] : [0, 0, 2],
        ];
  const points = coordinates.map((coordinate, index) => ({
    id: `given-${index}`,
    label: String.fromCharCode(65 + index),
    coordinates: coordinate.map(String) as EditableVec,
  }));
  const ids = (...indices: number[]) => indices.map(index => points[index].id);
  return {
    points,
    plane1: cube ? ids(0, 1, 2, 3) : ids(0, 1, 2),
    plane2:
      which === "parallel"
        ? ids(4, 5, 6, 7)
        : which === "perpendicular"
          ? ids(0, 3, 7, 4)
          : cube
            ? ids(0, 1, 5, 4)
            : ids(0, 1, 3),
    // Cube E–G is deliberately independent of the bottom face's selected vertices.
    line:
      cube && which !== "perpendicular"
        ? [points[4].id, points[6].id]
        : [points[0].id, points[cube ? 4 : 3].id],
  };
}

function SelectedPointPlane({
  points,
  selected,
  onChange,
  title,
  lang,
}: {
  points: GivenPointDraft[];
  selected: string[];
  onChange: (ids: string[]) => void;
  title: string;
  lang: SpatialLang;
}) {
  const helpId = useId();
  const vertices = selected
    .map(id => points.find(point => point.id === id)?.label)
    .filter(Boolean);
  return (
    <fieldset
      className="min-w-0 rounded-xl border border-border bg-card p-4"
      aria-describedby={helpId}
    >
      <legend className="px-1.5 text-sm font-semibold text-foreground">
        {title}
      </legend>
      <p className="mb-2 break-words text-sm font-medium text-primary">
        {text(lang, "Selected vertices", "已選頂點")} ·{" "}
        {vertices.length ? vertices.join("、") : text(lang, "None", "尚未選擇")}
        <span className="ml-2 text-xs text-muted-foreground">
          ({selected.length})
        </span>
      </p>
      <p
        id={helpId}
        className="mb-3 text-xs leading-relaxed text-muted-foreground"
      >
        {text(
          lang,
          "Choose 3 or more points. They must include three non-collinear points; every additional vertex must lie in the same plane.",
          "選擇 3 個或以上的點，須包含三個不共線的點；其餘已選頂點必須與它們共面。"
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {points.map((point, index) => {
          const checked = selected.includes(point.id);
          const name =
            point.label || text(lang, `Point ${index + 1}`, `點 ${index + 1}`);
          return (
            <label
              key={point.id}
              className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary/30 ${checked ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:bg-secondary/50"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                aria-label={text(
                  lang,
                  `${title}: select point ${name}`,
                  `${title}：選擇點 ${name}`
                )}
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter(id => id !== point.id)
                      : [...selected, point.id]
                  )
                }
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span>{name}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Shared given vertices are the only editable geometry in the main workspace. */
export default function SpatialAnglesPanel() {
  const { lang } = useLanguage();
  const poolHelpId = useId();
  const [mode, setMode] = useState<Mode>("plane-plane");
  const [draft, setDraft] = useState<PointWorkspaceDraft>(() =>
    pointPreset("right")
  );
  const nextPointId = useRef(26);
  const [removalNotice, setRemovalNotice] = useState<{
    label: string;
    used: boolean;
  }>();
  const [supplementary, setSupplementary] = useState(false);
  const [approximate, setApproximate] = useState(false);
  const [visibleStep, setVisibleStep] = useState(5);
  const onStepChange = useCallback(
    (index: number, playbackMode: "all" | "playback") => {
      setVisibleStep(
        playbackMode === "all" ? 5 : Math.max(0, Math.min(5, index))
      );
    },
    []
  );

  const evaluation = useMemo<{
    result?: PointSpatialResult;
    error?: string;
  }>(() => {
    const labels = draft.points.map(point => point.label);
    if (labels.some(name => !pointLabelPattern.test(name))) {
      return {
        error: text(
          lang,
          "Name each point with one uppercase Latin letter A–Z or one lowercase Greek letter (for example α).",
          "每個點請用一個大寫拉丁字母 A–Z 或小寫希臘字母（例如 α）命名。"
        ),
      };
    }
    if (new Set(labels).size !== labels.length) {
      return {
        error: text(
          lang,
          "Point names must be unique. Rename the repeated labels; your vertex selections are preserved.",
          "點名稱不能重複。請更改重複名稱；已選的頂點會保留。"
        ),
      };
    }
    if (
      draft.plane1.length < 3 ||
      (mode === "plane-plane" && draft.plane2.length < 3)
    ) {
      return {
        error: text(
          lang,
          "Each plane needs at least three selected vertices. Select more points from the shared pool.",
          "每個平面至少須選三個頂點，請從共用點池補選。"
        ),
      };
    }
    if (mode === "line-plane" && (!draft.line[0] || !draft.line[1])) {
      return {
        error: text(
          lang,
          "Choose both line endpoints from the remaining given points.",
          "請從現有已知點重新選擇直線的兩個端點。"
        ),
      };
    }
    try {
      const input: PointSpatialInput = {
        mode,
        points: draft.points.map(point => ({
          ...point,
          coordinates: [...point.coordinates] as EditableVec,
        })),
        plane1: draft.plane1,
        ...(mode === "plane-plane"
          ? { plane2: draft.plane2 }
          : { line: draft.line }),
      };
      return { result: computePointSpatialAngle(input) };
    } catch (error) {
      return {
        error:
          error instanceof PointSpatialError
            ? pointSpatialErrorMessage(error, lang)
            : text(
                lang,
                "Check the given point coordinates and vertex selections.",
                "請檢查已知點座標與頂點選擇。"
              ),
      };
    }
  }, [draft, mode, lang]);
  const result = evaluation.result;
  const angle = result?.angle;
  const selectedSupplement = mode === "plane-plane" && supplementary;
  const steps = useMemo(
    () => (result ? pointSpatialSteps(result, lang, selectedSupplement) : []),
    [result, lang, selectedSupplement]
  );
  const scene = useMemo(
    () =>
      result
        ? pointSpatialScene(result, {
            lang,
            stepIndex: visibleStep,
            supplementary: selectedSupplement,
          })
        : emptyScene,
    [result, lang, visibleStep, selectedSupplement]
  );
  const fullScene = useMemo(
    () =>
      result
        ? pointSpatialScene(result, {
            lang,
            stepIndex: 5,
            supplementary: selectedSupplement,
          })
        : emptyScene,
    [result, lang, selectedSupplement]
  );
  const definitions = useMemo(
    () => (result ? pointSpatialDefinitionLatex(result) : []),
    [result]
  );

  function loadPreset(which: PointPreset) {
    setDraft(pointPreset(which));
    setRemovalNotice(undefined);
    setVisibleStep(5);
    setSupplementary(false);
  }
  function editPoint(
    id: string,
    change: Partial<Pick<GivenPointDraft, "label" | "coordinates">>
  ) {
    setDraft(previous => ({
      ...previous,
      points: previous.points.map(point =>
        point.id === id ? { ...point, ...change } : point
      ),
    }));
    setRemovalNotice(undefined);
    setVisibleStep(5);
  }
  function addPoint() {
    if (draft.points.length >= 26) return;
    const names = new Set(draft.points.map(point => point.label));
    const name = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      .split("")
      .find(candidate => !names.has(candidate))!;
    // Propose a distinct point without converting the user's stored exact strings.
    let candidateX = 0;
    while (
      draft.points.some(point =>
        point.coordinates.every(
          (coordinate, axis) =>
            coordinate.trim() !== "" &&
            Number(coordinate) === (axis === 0 ? candidateX : 0)
        )
      )
    )
      candidateX++;
    const coordinates: EditableVec = [String(candidateX), "0", "0"];
    const id = `given-${nextPointId.current++}`;
    setDraft(previous => ({
      ...previous,
      points: [...previous.points, { id, label: name, coordinates }],
    }));
    setRemovalNotice(undefined);
    setVisibleStep(5);
  }
  function removePoint(id: string) {
    if (draft.points.length <= 4) return;
    const point = draft.points.find(candidate => candidate.id === id);
    if (!point) return;
    const used =
      draft.plane1.includes(id) ||
      draft.plane2.includes(id) ||
      draft.line.includes(id);
    setRemovalNotice({ label: point.label, used });
    setDraft(previous => ({
      ...previous,
      points: previous.points.filter(candidate => candidate.id !== id),
      plane1: previous.plane1.filter(vertex => vertex !== id),
      plane2: previous.plane2.filter(vertex => vertex !== id),
      // Empty placeholders exist in both dropdowns; removed IDs never remain as options.
      line: [
        previous.line[0] === id ? "" : previous.line[0],
        previous.line[1] === id ? "" : previous.line[1],
      ],
    }));
    setVisibleStep(5);
  }
  const presetLabels: Record<PointPreset, [string, string]> = {
    right: ["Right tetrahedron · 90°", "直角四面體 · 90°"],
    sloping: ["Sloping shared edge · 45°", "共邊斜面 · 45°"],
    inclined: ["Both planes inclined · 4 points", "兩斜平面 · 四點"],
    cube: ["Cube · 8 points / 4-vertex faces", "立方體 · 八點／四頂點平面"],
    parallel: ["Cube · parallel faces / line", "立方體 · 平行面／線"],
    perpendicular: ["Cube · perpendicular faces / line", "立方體 · 垂直面／線"],
  };

  return (
    <section
      className="min-w-0 space-y-5"
      aria-label={text(lang, "Spatial angles workspace", "空間夾角工作區")}
    >
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="mb-1.5 flex items-center gap-2">
          <Box size={18} className="text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">
            {text(
              lang,
              "Spatial angles from given points",
              "由已知點求空間夾角"
            )}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {text(
            lang,
            "Given four or more points, construct vectors such as AB = B − A. Choose vertices for two planes, or a plane and two line endpoints, then derive the angle using vectors only: dot products, cross products and projections. Shared-edge planes use a perpendicular section whenever possible.",
            "給定四個或以上的點，先構造 AB = B − A 等向量。選擇兩個平面的頂點，或一個平面與直線兩端點，再只用向量的內積、叉積與投影推導夾角。兩平面有共邊時，優先取垂直於共邊的截面。"
          )}
        </p>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={text(lang, "Choose angle type", "選擇夾角類型")}
      >
        {(["plane-plane", "line-plane"] as Mode[]).map(value => (
          <Button
            type="button"
            key={value}
            variant={mode === value ? "default" : "outline"}
            aria-pressed={mode === value}
            className="min-h-11"
            onClick={() => {
              setMode(value);
              setVisibleStep(5);
            }}
          >
            {value === "plane-plane"
              ? text(lang, "Two planes", "兩平面夾角")
              : text(lang, "Line & plane", "直線與平面夾角")}
          </Button>
        ))}
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={text(lang, "Point-based examples", "已知點範例")}
      >
        <span className="mr-1 text-xs font-semibold text-muted-foreground">
          {text(lang, "Examples", "範例")}
        </span>
        {(Object.keys(presetLabels) as PointPreset[]).map(which => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            key={which}
            className="min-h-11 max-w-full whitespace-normal text-left text-xs"
            onClick={() => loadPreset(which)}
          >
            {text(lang, ...presetLabels[which])}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11 gap-1.5 text-xs"
          onClick={() => {
            loadPreset("right");
            setApproximate(false);
          }}
        >
          <RotateCcw size={13} aria-hidden="true" />
          {text(lang, "Reset", "重設")}
        </Button>
      </div>

      <fieldset
        className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4"
        aria-describedby={poolHelpId}
      >
        <legend className="px-1.5 text-sm font-semibold">
          {text(lang, "Shared given points", "共用已知點")} ·{" "}
          {draft.points.length} {text(lang, "points", "點")}
        </legend>
        <p
          id={poolHelpId}
          className="mb-4 text-xs leading-relaxed text-muted-foreground"
        >
          {text(
            lang,
            "Keep 4–26 points in one shared pool. Names may be A–Z or lowercase Greek letters and must be unique. Renaming a point preserves every selection. Coordinates accept finite decimals or scientific notation exactly as typed (up to 24 significant digits); |value| ≤ 10⁶, and nonzero |value| ≥ 10⁻¹².",
            "共用點池保留 4–26 個點，每點只輸入一次。名稱可用 A–Z 或小寫希臘字母，不可重複；改名不會改變選擇。座標接受有限小數或科學記數法，按原文精確計算（最多 24 位有效數字）；|數值| ≤ 10⁶，非零 |數值| ≥ 10⁻¹²。"
          )}
        </p>
        <div className="space-y-3">
          {draft.points.map((point, pointIndex) => (
            <div
              key={point.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-end gap-2 rounded-lg border border-border/70 bg-background/50 p-2.5 sm:grid-cols-[5rem_minmax(0,1fr)_44px]"
            >
              <label className="min-w-0 space-y-1">
                <span className="block text-[11px] text-muted-foreground">
                  {text(lang, "Point name", "點名稱")}
                </span>
                <input
                  type="text"
                  aria-label={`Point ${point.label || pointIndex + 1} label`}
                  aria-describedby={poolHelpId}
                  autoComplete="off"
                  spellCheck={false}
                  value={point.label}
                  onChange={event =>
                    editPoint(point.id, { label: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <div className="col-span-2 row-start-2 grid min-w-0 grid-cols-3 gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                {axes.map((axis, coordinateIndex) => (
                  <label key={axis} className="min-w-0 space-y-1">
                    <span className="block text-[11px] font-mono text-muted-foreground">
                      {axis}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`${point.label}: ${axis}`}
                      autoComplete="off"
                      spellCheck={false}
                      value={point.coordinates[coordinateIndex]}
                      onChange={event => {
                        const coordinates = [
                          ...point.coordinates,
                        ] as EditableVec;
                        coordinates[coordinateIndex] = event.target.value;
                        editPoint(point.id, { coordinates });
                      }}
                      className={fieldClass}
                    />
                  </label>
                ))}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="col-start-2 row-start-1 min-h-11 min-w-11 text-muted-foreground sm:col-start-3"
                disabled={draft.points.length <= 4}
                aria-label={text(
                  lang,
                  `Remove point ${point.label || pointIndex + 1}`,
                  `刪除點 ${point.label || pointIndex + 1}`
                )}
                title={
                  draft.points.length <= 4
                    ? text(
                        lang,
                        "At least four given points are required",
                        "至少保留四個已知點"
                      )
                    : text(
                        lang,
                        "Remove this point and its selections",
                        "刪除此點及其選擇"
                      )
                }
                onClick={() => removePoint(point.id)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-1.5"
            disabled={draft.points.length >= 26}
            onClick={addPoint}
          >
            <Plus size={16} aria-hidden="true" />
            {text(lang, "Add given point", "新增已知點")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {text(lang, "Minimum 4 · maximum 26", "最少 4 點 · 最多 26 點")}
          </span>
        </div>
        {removalNotice && (
          <p
            role="status"
            className="mt-3 text-xs leading-relaxed text-muted-foreground"
          >
            {removalNotice.used
              ? text(
                  lang,
                  `Point ${removalNotice.label} was removed from the pool and all selections. Re-select any missing plane vertices or line endpoints below.`,
                  `點 ${removalNotice.label} 已從點池及所有選擇中刪除。請於下方補選不足的平面頂點或直線端點。`
                )
              : text(
                  lang,
                  `Point ${removalNotice.label} was removed.`,
                  `已刪除點 ${removalNotice.label}。`
                )}
          </p>
        )}
      </fieldset>

      <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">
        <SelectedPointPlane
          points={draft.points}
          selected={draft.plane1}
          lang={lang}
          title={
            mode === "plane-plane"
              ? text(lang, "Plane Π₁", "平面 Π₁")
              : text(lang, "Plane Π", "平面 Π")
          }
          onChange={plane1 => {
            setDraft(previous => ({ ...previous, plane1 }));
            setVisibleStep(5);
          }}
        />
        {mode === "plane-plane" ? (
          <SelectedPointPlane
            points={draft.points}
            selected={draft.plane2}
            lang={lang}
            title={text(lang, "Plane Π₂", "平面 Π₂")}
            onChange={plane2 => {
              setDraft(previous => ({ ...previous, plane2 }));
              setVisibleStep(5);
            }}
          />
        ) : (
          <fieldset className="min-w-0 rounded-xl border border-border bg-card p-4">
            <legend className="px-1.5 text-sm font-semibold">
              {text(lang, "Line ℓ", "直線 ℓ")}
            </legend>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {text(
                lang,
                "Choose two distinct given points. The endpoints do not have to be among the plane's selected vertices. Construct the line vector by subtracting the start point from the end point.",
                "選擇兩個不同的已知點，端點不必屬於平面的已選頂點。用終點減起點構造直線方向向量。"
              )}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([0, 1] as const).map(endpoint => (
                <label key={endpoint} className="min-w-0 space-y-1">
                  <span className="block text-xs text-muted-foreground">
                    {endpoint === 0
                      ? text(lang, "Start point", "起點")
                      : text(lang, "End point", "終點")}
                  </span>
                  <select
                    aria-label={
                      endpoint === 0 ? "Line start point" : "Line end point"
                    }
                    value={draft.line[endpoint]}
                    onChange={event => {
                      const line = [...draft.line] as [string, string];
                      line[endpoint] = event.target.value;
                      setDraft(previous => ({ ...previous, line }));
                      setVisibleStep(5);
                    }}
                    className={fieldClass}
                  >
                    <option value="">
                      {text(lang, "Choose point", "請選點")}
                    </option>
                    {draft.points.map((point, index) => (
                      <option key={point.id} value={point.id}>
                        {point.label ||
                          text(lang, `Point ${index + 1}`, `點 ${index + 1}`)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm font-medium text-primary">
              {text(lang, "Selected line", "已選直線")} ·{" "}
              {draft.line
                .map(
                  id =>
                    draft.points.find(point => point.id === id)?.label || "—"
                )
                .join(" → ")}
            </p>
          </fieldset>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {mode === "plane-plane" && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={supplementary}
              onChange={event => setSupplementary(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {text(
              lang,
              "Show supplementary opening π − θ",
              "顯示補角開口 π − θ"
            )}
          </label>
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={approximate}
            onChange={event => setApproximate(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {text(lang, "Also show a decimal approximation", "另顯示小數近似值")}
        </label>
      </div>
      {evaluation.error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {evaluation.error}
        </div>
      )}
      {angle && (
        <div
          className="rounded-xl border border-primary/25 bg-card p-4 sm:p-5"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-primary">
              {text(lang, "Exact result", "精確結果")}
            </h3>
            <span className="text-xs text-muted-foreground">
              {mode === "line-plane"
                ? text(
                    lang,
                    "Line–plane angle, not normal angle",
                    "直線與平面夾角，並非法向量夾角"
                  )
                : selectedSupplement
                  ? text(lang, "Supplementary opening selected", "已選補角開口")
                  : text(
                      lang,
                      "Smaller dihedral angle · 0° to 90°",
                      "較小二面角 · 0° 至 90°"
                    )}
            </span>
          </div>
          <div className="overflow-x-auto">
            <KatexRenderer
              displayMode
              latex={
                selectedSupplement
                  ? `\\theta_s=\\pi-\\theta=${angle.supplementaryLatex}`
                  : `\\theta=${angle.angleLatex}`
              }
            />
          </div>
          {approximate && (
            <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
              {text(lang, "Approximation only", "僅為近似值")} ·{" "}
              {selectedSupplement ? "θₛ" : "θ"} ≈{" "}
              {(selectedSupplement
                ? 180 - angle.degrees
                : angle.degrees
              ).toFixed(6)}
              °
            </p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">
            {text(
              lang,
              "3D geometry · synchronized with six vector stages",
              "3D 幾何 · 與六階段向量推導同步"
            )}
          </h3>
          {definitions.length > 0 && (
            <div className="mt-2 space-y-1 overflow-x-auto text-xs text-muted-foreground">
              {definitions.map((latex, index) => (
                <div key={index}>
                  <KatexRenderer latex={latex} />
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Keep the shared camera/controller mounted even during an incomplete edit.
            Clear all traces and cover the chart rather than presenting old geometry. */}
        <div className="relative min-w-0 p-2 sm:p-3">
          <div
            aria-hidden={!result || undefined}
            inert={!result ? true : undefined}
          >
            <Plot3DScene
              data={scene.data}
              boundsData={fullScene.data}
              layout={scene.layout}
              lang={lang}
              uirevision="plot3d-scene"
              name={text(lang, "Spatial angle geometry", "空間夾角幾何")}
            />
          </div>
          {!result && (
            <div className="absolute inset-0 flex items-center justify-center bg-background px-5 py-8 text-center text-sm leading-relaxed text-muted-foreground">
              <p>
                {text(
                  lang,
                  "The 3D construction is hidden until the points and selections are valid. Correct the input above; your camera view is preserved.",
                  "點與選擇有效後才顯示 3D 構造。請修正上方輸入；原有視角會保留。"
                )}
              </p>
            </div>
          )}
        </div>
        {result && (
          <div className="flex items-start gap-2 border-t border-border bg-secondary/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              {scene.note}{" "}
              {text(
                lang,
                "Point labels refer to the shared given points. Finite vertex outlines represent infinite planes. Vectors constructed from the actual points retain their lengths; only arrows explicitly marked as directions are scaled. Use the shared 3D controls for desktop or touch navigation.",
                "點標籤均對應共用已知點。有限頂點輪廓代表無限平面。由實際點構造的向量保留其長度；只有明確標示方向的箭頭才縮放。可用共用 3D 控制於桌面或觸控裝置操作。"
              )}
            </p>
          </div>
        )}
      </div>
      {result && (
        <StepDisplay
          steps={steps}
          title={text(
            lang,
            "Six-stage vector derivation & variable definitions",
            "六階段向量推導與變量定義"
          )}
          onStepChange={onStepChange}
        />
      )}
      {angle && (
        <details className="min-w-0 rounded-xl border border-border bg-card">
          <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-muted-foreground">
            {text(
              lang,
              "Enrichment: plane equations and normals",
              "課外知識：平面方程與法向量"
            )}
          </summary>
          <div className="space-y-3 border-t border-border p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {text(
                lang,
                "Optional, read-only equivalents of the planes determined by your selected vertices. These equations are not input fields and are not needed for the six-stage vector derivation above. A cross-product normal is perpendicular to its plane.",
                "以下為已選頂點所確定平面的等價方程，僅供課外閱讀。此處沒有計算輸入欄，亦不需要用這些方程完成上方六階段向量推導。叉積得到的法向量垂直於其平面。"
              )}
            </p>
            <div className="overflow-x-auto">
              <KatexRenderer
                latex={spatialPlaneLatex(
                  angle.plane1,
                  mode === "plane-plane" ? "\\Pi_1" : "\\Pi"
                )}
              />
            </div>
            {angle.plane2 && (
              <div className="overflow-x-auto">
                <KatexRenderer
                  latex={spatialPlaneLatex(angle.plane2, "\\Pi_2")}
                />
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
