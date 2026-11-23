import { useCallback, useId, useMemo, useState } from "react";
import { Box, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import KatexRenderer from "@/components/KatexRenderer";
import StepDisplay from "@/components/StepDisplay";
import Plot3DScene from "@/components/Plot3DScene";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  buildSpatialAngleScene,
  computeSpatialAngle,
  spatialAngleSteps,
  spatialErrorMessage,
  spatialLineLatex,
  spatialPlaneLatex,
  SpatialAngleError,
  type LineInput,
  type PlaneInput,
  type SpatialAngleInput,
  type SpatialLang,
} from "@/lib/spatialAngles";

type Mode = SpatialAngleInput["mode"];
type EditableVec = [string, string, string];
interface PlaneDraft {
  kind: PlaneInput["kind"];
  normal: EditableVec;
  offset: string;
  points: [EditableVec, EditableVec, EditableVec];
}
interface LineDraft {
  kind: LineInput["kind"];
  point: EditableVec;
  direction: EditableVec;
  secondPoint: EditableVec;
}
const vector = (x: number, y: number, z: number): EditableVec => [
  String(x),
  String(y),
  String(z),
];
const plane = (
  normal: EditableVec,
  points: PlaneDraft["points"],
  offset = "0"
): PlaneDraft => ({ kind: "equation", normal, offset, points });
const defaultPlane1 = () =>
  plane(vector(0, 0, 1), [vector(0, 0, 0), vector(2, 0, 0), vector(0, 2, 0)]);
const defaultPlane2 = () =>
  plane(vector(1, 0, 1), [vector(0, 0, 0), vector(0, 2, 0), vector(2, 0, -2)]);
const defaultLine = (): LineDraft => ({
  kind: "direction",
  point: vector(-1, 0, -1),
  direction: vector(1, 0, 1),
  secondPoint: vector(1, 0, 1),
});
const planeInput = (draft: PlaneDraft): PlaneInput =>
  draft.kind === "equation"
    ? { kind: "equation", normal: draft.normal, offset: draft.offset }
    : { kind: "points", points: draft.points };
const lineInput = (draft: LineDraft): LineInput =>
  draft.kind === "direction"
    ? { kind: "direction", point: draft.point, direction: draft.direction }
    : { kind: "points", points: [draft.point, draft.secondPoint] };
const fieldClass =
  "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const label = (lang: SpatialLang, en: string, zh: string) =>
  lang === "zh" ? zh : en;

function VectorFields({
  value,
  onChange,
  name,
  lang,
  symbols = ["x", "y", "z"],
}: {
  value: EditableVec;
  onChange: (v: EditableVec) => void;
  name: string;
  lang: SpatialLang;
  symbols?: string[];
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-3 gap-2">
      {value.map((coordinate, index) => (
        <label
          key={index}
          htmlFor={`${id}-${index}`}
          className="min-w-0 space-y-1"
        >
          <span className="block text-[11px] font-mono text-muted-foreground">
            {symbols[index]}
          </span>
          <input
            id={`${id}-${index}`}
            aria-label={label(
              lang,
              `${name}: ${symbols[index]}`,
              `${name}：${symbols[index]}`
            )}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={coordinate}
            onChange={event => {
              const next = [...value] as EditableVec;
              next[index] = event.target.value;
              onChange(next);
            }}
            className={fieldClass}
          />
        </label>
      ))}
    </div>
  );
}

function PlaneEditor({
  value,
  onChange,
  title,
  lang,
}: {
  value: PlaneDraft;
  onChange: (v: PlaneDraft) => void;
  title: string;
  lang: SpatialLang;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0 rounded-xl border border-border bg-card p-4">
      <legend className="px-1.5 text-sm font-semibold text-foreground">
        {title}
      </legend>
      <label
        className="mb-3 block space-y-1 text-xs text-muted-foreground"
        htmlFor={`${id}-kind`}
      >
        <span>{label(lang, "Plane definition", "平面定義方式")}</span>
        <select
          id={`${id}-kind`}
          value={value.kind}
          onChange={event =>
            onChange({
              ...value,
              kind: event.target.value as PlaneDraft["kind"],
            })
          }
          className={fieldClass}
        >
          <option value="equation">
            {label(
              lang,
              "Equation: ax + by + cz = k",
              "方程：ax + by + cz = k"
            )}
          </option>
          <option value="points">
            {label(lang, "Three vertices A, B, C", "三個頂點 A、B、C")}
          </option>
        </select>
      </label>
      {value.kind === "equation" ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {label(
              lang,
              "n = (a,b,c) is the plane normal. At least one coefficient must be nonzero; k shifts the plane without changing its tilt.",
              "n = (a,b,c) 是平面法向量。至少一個係數須非零；k 只平移平面，不改變傾斜方向。"
            )}
          </p>
          <VectorFields
            value={value.normal}
            onChange={normal => onChange({ ...value, normal })}
            name={`${title} n`}
            symbols={["a", "b", "c"]}
            lang={lang}
          />
          <label htmlFor={`${id}-offset`} className="block space-y-1">
            <span className="text-[11px] font-mono text-muted-foreground">
              {label(lang, "k · offset", "k · 偏移常數")}
            </span>
            <input
              id={`${id}-offset`}
              aria-label={`${title} k`}
              value={value.offset}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              onChange={event =>
                onChange({ ...value, offset: event.target.value })
              }
              className={fieldClass}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {label(
              lang,
              "n = (B−A) × (C−A). The vertices must not be collinear. Vertex and equation inputs are stored independently.",
              "n = (B−A) × (C−A)。頂點不可共線。頂點輸入與方程輸入分開保存。"
            )}
          </p>
          {value.points.map((point, index) => (
            <div key={index} className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                {["A", "B", "C"][index]}
              </p>
              <VectorFields
                value={point}
                name={`${title} ${["A", "B", "C"][index]}`}
                lang={lang}
                onChange={next => {
                  const points = [...value.points] as PlaneDraft["points"];
                  points[index] = next;
                  onChange({ ...value, points });
                }}
              />
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}
function LineEditor({
  value,
  onChange,
  lang,
}: {
  value: LineDraft;
  onChange: (v: LineDraft) => void;
  lang: SpatialLang;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0 rounded-xl border border-border bg-card p-4">
      <legend className="px-1.5 text-sm font-semibold text-foreground">
        {label(lang, "Line ℓ", "直線 ℓ")}
      </legend>
      <label
        htmlFor={`${id}-kind`}
        className="mb-3 block space-y-1 text-xs text-muted-foreground"
      >
        <span>{label(lang, "Line definition", "直線定義方式")}</span>
        <select
          id={`${id}-kind`}
          value={value.kind}
          onChange={event =>
            onChange({
              ...value,
              kind: event.target.value as LineDraft["kind"],
            })
          }
          className={fieldClass}
        >
          <option value="direction">
            {label(lang, "Point P + direction d", "點 P ＋ 方向 d")}
          </option>
          <option value="points">
            {label(lang, "Two points P, Q", "兩點 P、Q")}
          </option>
        </select>
      </label>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {value.kind === "direction"
          ? label(
              lang,
              "r = P + t d, t ∈ ℝ. P sets the position; d sets the direction and must be nonzero.",
              "r = P + t d，t ∈ ℝ。P 決定位置；d 決定方向且必須非零。"
            )
          : label(
              lang,
              "d = Q − P. Choose two distinct points. The stored direction is independent of Q.",
              "d = Q − P。請選擇兩個不同的點。保存的方向向量與 Q 分開存放。"
            )}
      </p>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold">P</p>
          <VectorFields
            name="P"
            lang={lang}
            value={value.point}
            onChange={point => onChange({ ...value, point })}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold">
            {value.kind === "direction" ? "d" : "Q"}
          </p>
          <VectorFields
            name={value.kind === "direction" ? "d" : "Q"}
            lang={lang}
            value={
              value.kind === "direction" ? value.direction : value.secondPoint
            }
            onChange={next =>
              onChange(
                value.kind === "direction"
                  ? { ...value, direction: next }
                  : { ...value, secondPoint: next }
              )
            }
          />
        </div>
      </div>
    </fieldset>
  );
}

/** Drop-in workspace for /vector?tab=spatial; no parent-page props are required. */
export default function SpatialAnglesPanel() {
  const { lang } = useLanguage();
  const [mode, setMode] = useState<Mode>("plane-plane");
  const [plane1, setPlane1] = useState<PlaneDraft>(defaultPlane1);
  const [plane2, setPlane2] = useState<PlaneDraft>(defaultPlane2);
  const [line, setLine] = useState<LineDraft>(defaultLine);
  const [supplementary, setSupplementary] = useState(false);
  const [approximate, setApproximate] = useState(false);
  const [visibleStep, setVisibleStep] = useState(5);
  const onStepChange = useCallback(
    (index: number, playbackMode: "all" | "playback") => {
      setVisibleStep(playbackMode === "all" ? 5 : index);
    },
    []
  );
  const evaluation = useMemo(() => {
    try {
      const input: SpatialAngleInput =
        mode === "plane-plane"
          ? { mode, plane1: planeInput(plane1), plane2: planeInput(plane2) }
          : { mode, plane: planeInput(plane1), line: lineInput(line) };
      return { result: computeSpatialAngle(input), error: undefined };
    } catch (error) {
      return {
        result: undefined,
        error:
          error instanceof SpatialAngleError
            ? spatialErrorMessage(error.code, lang)
            : spatialErrorMessage("input", lang),
      };
    }
  }, [mode, plane1, plane2, line, lang]);
  const result = evaluation.result;
  const steps = useMemo(
    () =>
      result
        ? spatialAngleSteps(
            result,
            lang,
            mode === "plane-plane" && supplementary
          )
        : [],
    [result, lang, mode, supplementary]
  );
  const scene = useMemo(
    () =>
      result
        ? buildSpatialAngleScene(result, {
            lang,
            stepIndex: visibleStep,
            supplementary: mode === "plane-plane" && supplementary,
          })
        : undefined,
    [result, lang, visibleStep, mode, supplementary]
  );

  function preset(
    which: "horizontal" | "tilted" | "parallel" | "perpendicular"
  ) {
    setVisibleStep(5);
    setSupplementary(false);
    if (which === "horizontal") {
      setPlane1(defaultPlane1());
      setPlane2(defaultPlane2());
      setLine(defaultLine());
    } else if (which === "tilted") {
      setPlane1(
        plane(
          vector(1, 1, 1),
          [vector(0, 0, 1), vector(1, 0, 0), vector(0, 1, 0)],
          "1"
        )
      );
      setPlane2(
        plane(
          vector(1, -1, 2),
          [vector(1, 0, 0), vector(0, -1, 0), vector(-1, 0, 1)],
          "1"
        )
      );
      setLine({
        kind: "direction",
        point: vector(1, -1, 0),
        direction: vector(2, -1, 1),
        secondPoint: vector(3, -2, 1),
      });
    } else if (which === "parallel") {
      setPlane1(defaultPlane1());
      setPlane2(
        plane(
          vector(0, 0, -2),
          [vector(0, 0, 1), vector(2, 0, 1), vector(0, 2, 1)],
          "-2"
        )
      );
      setLine({
        kind: "direction",
        point: vector(0, 0, 1),
        direction: vector(1, 1, 0),
        secondPoint: vector(1, 1, 1),
      });
    } else {
      setPlane1(defaultPlane1());
      setPlane2(
        plane(vector(1, 0, 0), [
          vector(0, 0, 0),
          vector(0, 2, 0),
          vector(0, 0, 2),
        ])
      );
      setLine({
        kind: "direction",
        point: vector(1, 0, -1),
        direction: vector(0, 0, 2),
        secondPoint: vector(1, 0, 1),
      });
    }
  }

  return (
    <section
      className="space-y-5"
      aria-label={label(lang, "Spatial angles workspace", "空間夾角工作區")}
    >
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="mb-1.5 flex items-center gap-2">
          <Box size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            {label(lang, "Angles in space", "空間夾角")}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {label(
            lang,
            "Inclined planes, exact geometry, and a 3D derivation you can play one step at a time. The plane angle uses normals; the line–plane angle uses the line's in-plane projection.",
            "任意傾斜平面、精確幾何，以及可逐步播放的 3D 推導。兩平面夾角用法向量計算；直線與平面夾角用直線的平面內投影理解。"
          )}
        </p>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={label(lang, "Choose angle type", "選擇夾角類型")}
      >
        {(["plane-plane", "line-plane"] as Mode[]).map(value => (
          <Button
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
              ? label(lang, "Two planes", "兩平面夾角")
              : label(lang, "Line & plane", "直線與平面夾角")}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">
          {label(lang, "Examples", "範例")}
        </span>
        {(["horizontal", "tilted", "parallel", "perpendicular"] as const).map(
          value => (
            <Button
              size="sm"
              variant="outline"
              key={value}
              className="min-h-10 text-xs"
              onClick={() => preset(value)}
            >
              {value === "horizontal"
                ? label(lang, "Horizontal + inclined", "水平 ＋ 傾斜")
                : value === "tilted"
                  ? label(lang, "Both inclined", "兩者均傾斜")
                  : value === "parallel"
                    ? label(lang, "Parallel", "平行")
                    : label(lang, "Perpendicular", "垂直")}
            </Button>
          )
        )}
        <Button
          size="sm"
          variant="ghost"
          className="min-h-10 gap-1.5 text-xs"
          onClick={() => {
            preset("horizontal");
            setApproximate(false);
          }}
        >
          <RotateCcw size={13} />
          {label(lang, "Reset", "重設")}
        </Button>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <PlaneEditor
          value={plane1}
          onChange={setPlane1}
          title={
            mode === "plane-plane"
              ? label(lang, "Plane Π₁", "平面 Π₁")
              : label(lang, "Plane Π", "平面 Π")
          }
          lang={lang}
        />
        {mode === "plane-plane" ? (
          <PlaneEditor
            value={plane2}
            onChange={setPlane2}
            title={label(lang, "Plane Π₂", "平面 Π₂")}
            lang={lang}
          />
        ) : (
          <LineEditor value={line} onChange={setLine} lang={lang} />
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {label(
          lang,
          "All fields accept finite decimals or scientific notation, interpreted exactly as entered; |value| ≤ 10⁶. Nonzero |value| ≥ 10⁻¹². Changing coefficients, offsets or points updates the actual geometry immediately.",
          "所有欄位接受有限小數或科學記數法，輸入值按原文精確計算；|數值| ≤ 10⁶，非零 |數值| ≥ 10⁻¹²。修改係數、偏移或點的位置會即時更新實際幾何。"
        )}
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {mode === "plane-plane" && (
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={supplementary}
              onChange={event => setSupplementary(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {label(
              lang,
              "Show supplementary opening π − θ",
              "顯示補角開口 π − θ"
            )}
          </label>
        )}
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={approximate}
            onChange={event => setApproximate(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {label(lang, "Also show a decimal approximation", "另顯示小數近似值")}
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
      {result && scene && (
        <>
          <div
            className="rounded-xl border border-primary/25 bg-card p-4 sm:p-5"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-primary">
                {label(lang, "Exact result", "精確結果")}
              </h3>
              <span className="text-xs text-muted-foreground">
                {mode === "line-plane"
                  ? label(
                      lang,
                      "Line–plane angle, not normal angle",
                      "直線與平面夾角，並非法向量夾角"
                    )
                  : supplementary
                    ? label(
                        lang,
                        "Supplementary opening selected",
                        "已選補角開口"
                      )
                    : label(
                        lang,
                        "Acute dihedral convention · 0° to 90°",
                        "銳二面角定義 · 0° 至 90°"
                      )}
              </span>
            </div>
            <div className="overflow-x-auto">
              <KatexRenderer
                displayMode
                latex={
                  mode === "plane-plane" && supplementary
                    ? `\\theta_s=\\pi-\\theta=${result.supplementaryLatex}`
                    : `\\theta=${result.angleLatex}`
                }
              />
            </div>
            {mode === "line-plane" && (
              <div className="overflow-x-auto text-sm text-muted-foreground">
                <KatexRenderer
                  displayMode
                  latex={`\\beta=\\frac{\\pi}{2}-\\theta=${result.normalAngleLatex}`}
                />
              </div>
            )}
            {approximate && (
              <p className="mt-2 text-center text-xs font-mono text-muted-foreground">
                {label(lang, "Approximation only", "僅為近似值")} ·{" "}
                {mode === "plane-plane" && supplementary ? "θₛ" : "θ"} ≈{" "}
                {(mode === "plane-plane" && supplementary
                  ? 180 - result.degrees
                  : result.degrees
                ).toFixed(6)}
                °
              </p>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">
                {label(
                  lang,
                  "3D geometry · synchronized with derivation",
                  "3D 幾何 · 與推導同步"
                )}
              </h3>
              <div className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                <KatexRenderer
                  latex={spatialPlaneLatex(
                    result.plane1,
                    mode === "plane-plane" ? "\\Pi_1" : "\\Pi"
                  )}
                />
                {result.plane2 && (
                  <div className="mt-1">
                    <KatexRenderer
                      latex={spatialPlaneLatex(result.plane2, "\\Pi_2")}
                    />
                  </div>
                )}
                {result.line && (
                  <div className="mt-1">
                    <KatexRenderer latex={spatialLineLatex(result.line)} />
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 p-2 sm:p-3">
              <Plot3DScene
                data={scene.data}
                layout={scene.layout}
                lang={lang}
                name={label(lang, "Spatial angle geometry", "空間夾角幾何")}
              />
            </div>
            <div className="flex items-start gap-2 border-t border-border bg-secondary/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>
                {scene.note}{" "}
                {label(
                  lang,
                  "Finite patches represent infinite planes; arrows show scaled directions, not vector magnitudes. Use the shared 3D controls for desktop or touch navigation.",
                  "有限圖塊代表無限平面；箭頭顯示縮放方向，並非向量實際長度。可用共用 3D 控制於桌面或觸控裝置操作。"
                )}
              </p>
            </div>
          </div>
          <StepDisplay
            steps={steps}
            title={label(
              lang,
              "Derivation & variable context",
              "詳細推導與變量定義"
            )}
            onStepChange={onStepChange}
          />
        </>
      )}
    </section>
  );
}
