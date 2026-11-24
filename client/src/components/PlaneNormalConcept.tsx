import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import KatexRenderer from "@/components/KatexRenderer";
import Plot3DScene from "@/components/Plot3DScene";
import StepDisplay from "@/components/StepDisplay";
import {
  computePlaneNormalConcept,
  planeNormalScene,
  planeNormalSteps,
} from "@/lib/planeNormalConcept";
import type { PointSpatialResult } from "@/lib/pointSpatialAngles";
import { ratToLatex } from "@/lib/rational";
import { spatialVectorLatex } from "@/lib/spatialAngles";

type Lang = "zh" | "en";
const text = (lang: Lang, en: string, zh: string) => (lang === "zh" ? zh : en);
const touchButton =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 aria-pressed:border-primary/60 aria-pressed:bg-primary/10";

function AngleReadout({
  testId,
  label,
  symbol,
  latex,
  degrees,
  explanation,
}: {
  testId: string;
  label: string;
  symbol: string;
  latex: string;
  degrees: number;
  explanation: string;
}) {
  return (
    <div
      className="min-w-0 rounded-xl border border-border bg-background p-3"
      data-testid={testId}
    >
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="overflow-x-auto py-2 text-lg text-foreground">
        <KatexRenderer latex={`${symbol}=${latex}`} />
      </div>
      <p className="text-xs text-muted-foreground">≈ {degrees.toFixed(2)}°</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {explanation}
      </p>
    </div>
  );
}

/** Optional supplement to the parent's point-first projection, never its replacement. */
export default function PlaneNormalConcept({
  result,
  lang,
  supplementary = false,
}: {
  result: PointSpatialResult;
  lang: Lang;
  supplementary?: boolean;
}) {
  const contentId = useId();
  const rotationId = useId();
  const openingName = useId();
  const [opened, setOpened] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [flipFirst, setFlipFirst] = useState(false);
  const [flipSecond, setFlipSecond] = useState(false);
  // Deliberately local and independent: a normal flip never selects an opening.
  const [chooseSupplementary, setChooseSupplementary] = useState(supplementary);
  const [stepIndex, setStepIndex] = useState(5);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playerSession, setPlayerSession] = useState(0);
  const geometrySignature = JSON.stringify(
    {
      points: result.points.map(point => [point.id, point.label, point.exact]),
      plane1: result.input.plane1,
      plane2: result.input.plane2,
    },
    (_, value) => (typeof value === "bigint" ? value.toString() : value)
  );
  const concept = useMemo(
    () =>
      computePlaneNormalConcept(result, {
        flipFirst,
        flipSecond,
        supplementary: chooseSupplementary,
      }),
    [result, flipFirst, flipSecond, chooseSupplementary]
  );
  const steps = useMemo(() => planeNormalSteps(concept, lang), [concept, lang]);
  const scene = useMemo(
    () =>
      everOpened
        ? planeNormalScene(concept, { lang, stepIndex, rotationDegrees })
        : undefined,
    [concept, lang, stepIndex, rotationDegrees, everOpened]
  );
  const boundsData = useMemo(() => {
    if (!everOpened) return undefined;
    // Math supplies an opacity-zero conservative envelope for every stage,
    // flip, opening and ALL angles of the turn, not only 0/45/90 samples.
    // Keep this independent of the interactive settings and preserve camera.
    return planeNormalScene(computePlaneNormalConcept(result), {
      lang,
      stepIndex: 5,
      rotationDegrees: 0,
    }).data;
  }, [result, lang, everOpened]);
  const onStepChange = useCallback(
    (index: number, mode: "all" | "playback") => {
      setStepIndex(mode === "all" ? 5 : Math.max(0, Math.min(5, index)));
    },
    []
  );

  useEffect(() => {
    setPlaying(false);
    setRotationDegrees(0);
    setPlayerSession(value => value + 1);
  }, [geometrySignature]);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(query.matches);
      if (query.matches) {
        setPlaying(false);
        // Shared StepDisplay has no reduced-motion prop; remount cancels its timer.
        setPlayerSession(value => value + 1);
      }
    };
    update();
    query.addEventListener("change", update);
    const onHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      query.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
  useEffect(() => {
    if (!playing || !opened || reducedMotion || document.hidden) return;
    if (rotationDegrees >= 90) {
      setPlaying(false);
      return;
    }
    // At most ten scene updates/second: do not queue a Plotly render every frame.
    const timer = window.setTimeout(
      () => setRotationDegrees(value => Math.min(90, value + 2)),
      100
    );
    return () => window.clearTimeout(timer);
  }, [playing, opened, reducedMotion, rotationDegrees]);

  const stageNames =
    lang === "zh"
      ? [
          "已知點與平面內方向 a₁、b₁、a₂、b₂",
          "第一平面的法向量 n₁（叉積）",
          "第二平面的法向量 n₂（叉積）",
          "垂直截面、共同軸 h 與成對轉動方向 r₁、r₂",
          "法向量原始角 φ 與不變的較小平面角 θ",
          "獨立選定的開口 δ：θ 或 π−θ",
        ]
      : [
          "Given points and in-plane directions a₁, b₁, a₂, b₂",
          "First-plane normal n₁ (cross product)",
          "Second-plane normal n₂ (cross product)",
          "Perpendicular section, common axis h and paired turning directions r₁, r₂",
          "Raw normal angle φ and invariant smaller plane angle θ",
          "Independently selected opening δ: θ or π−θ",
        ];
  const normalFormulas = [result.plane1, result.plane2!].map((plane, index) => {
    const flipped = index === 0 ? flipFirst : flipSecond;
    const n = index === 0 ? concept.n1 : concept.n2;
    return `\\mathbf n_${index + 1}=${flipped ? "-\\left(" : ""}\\mathbf a_${index + 1}\\times\\mathbf b_${index + 1}${flipped ? "\\right)" : ""}=${flipped ? "-\\left(" : ""}${spatialVectorLatex(plane.a)}\\times${spatialVectorLatex(plane.b)}${flipped ? "\\right)" : ""}=${spatialVectorLatex(n)}`;
  });
  const dotSubstitution = concept.n1
    .map(
      (value, index) =>
        `\\left(${ratToLatex(value)}\\right)\\left(${ratToLatex(concept.n2[index])}\\right)`
    )
    .join("+");

  return (
    <details
      data-testid="plane-normal-concept"
      className="group min-w-0 overflow-hidden rounded-xl border border-primary/25 bg-card text-card-foreground"
      onToggle={event => {
        const isOpen = event.currentTarget.open;
        setOpened(isOpen);
        if (isOpen) setEverOpened(true);
        else setPlaying(false);
      }}
    >
      <summary
        aria-controls={contentId}
        className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">
            {text(
              lang,
              "Optional concept · plane normals and dihedral openings",
              "選讀概念 · 平面法向量與二面角開口"
            )}
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            {text(
              lang,
              `Live vector-only explanation from your current ${result.points.length} points; the main projection stays unchanged.`,
              `沿用目前 ${result.points.length} 個已知點的即時純向量解說；主要投影解法保持不變。`
            )}
          </span>
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div
        id={contentId}
        className="min-w-0 space-y-4 border-t border-border p-3 sm:p-4"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {text(
            lang,
            "Cross two independent directions in each point-defined plane to obtain n₁ and n₂. Their signed dot product gives φ; its absolute value gives the smaller plane angle θ. No Cartesian plane equations or separate geometry inputs are used.",
            "在各個由已知點定義的平面內，將兩個獨立方向作叉積，得到 n₁、n₂。帶符號的內積給出 φ；取絕對值則給出較小平面角 θ。不使用平面直角座標方程式，也不另設幾何輸入。"
          )}
        </p>

        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          <AngleReadout
            testId="normal-raw-angle"
            label={text(lang, "Raw normal angle", "法向量原始角")}
            symbol="\\varphi"
            latex={concept.rawAngleLatex}
            degrees={concept.rawDegrees}
            explanation={text(
              lang,
              "0°–180°; reversing one normal replaces φ by 180°−φ.",
              "0°–180°；反轉一個法向量會把 φ 換成 180°−φ。"
            )}
          />
          <AngleReadout
            testId="normal-smaller-angle"
            label={text(
              lang,
              "Invariant smaller plane angle",
              "不變的較小平面角"
            )}
            symbol="\\theta"
            latex={concept.smallerAngleLatex}
            degrees={concept.smallerDegrees}
            explanation={text(
              lang,
              "0°–90°; unchanged by either normal flip.",
              "0°–90°；任一法向量反轉都不會改變此角。"
            )}
          />
          <AngleReadout
            testId="normal-selected-angle"
            label={text(
              lang,
              "Chosen opening (not automatic interior)",
              "所選開口（非自動判定內角）"
            )}
            symbol="\\delta"
            latex={concept.openingAngleLatex}
            degrees={concept.openingDegrees}
            explanation={
              chooseSupplementary
                ? text(
                    lang,
                    "You selected π−θ independently of the normals.",
                    "你獨立於法向量選取了 π−θ。"
                  )
                : text(
                    lang,
                    "You selected θ independently of the normals.",
                    "你獨立於法向量選取了 θ。"
                  )
            }
          />
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <fieldset className="min-w-0 rounded-xl border border-border p-3">
            <legend className="px-1 text-xs font-semibold">
              {text(lang, "Normal orientation only", "只改變法向量方向")}
            </legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="normal-flip-1"
                aria-pressed={flipFirst}
                className={touchButton}
                onClick={() => {
                  setPlaying(false);
                  setFlipFirst(value => !value);
                }}
              >
                <ArrowUpDown size={16} aria-hidden="true" />
                {text(lang, "Flip n₁", "反轉 n₁")}
              </button>
              <button
                type="button"
                data-testid="normal-flip-2"
                aria-pressed={flipSecond}
                className={touchButton}
                onClick={() => {
                  setPlaying(false);
                  setFlipSecond(value => !value);
                }}
              >
                <ArrowUpDown size={16} aria-hidden="true" />
                {text(lang, "Flip n₂", "反轉 n₂")}
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {text(
                lang,
                "Reversing point order or a normal changes orientation, not either plane or θ. Display arrows are scaled directions; formulas retain exact vectors.",
                "反轉頂點順序或法向量只改變方向，不改變兩平面或 θ。圖中箭頭是縮放後的方向；公式保留精確向量。"
              )}
            </p>
          </fieldset>
          <fieldset
            data-testid="normal-opening-choice"
            className="min-w-0 rounded-xl border border-border p-3"
          >
            <legend className="px-1 text-xs font-semibold">
              {text(lang, "Independent opening choice", "獨立選取開口")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {[false, true].map(value => (
                <label
                  key={String(value)}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary/60 has-[:checked]:bg-primary/10"
                >
                  <input
                    type="radio"
                    name={openingName}
                    value={value ? "supplementary" : "smaller"}
                    checked={chooseSupplementary === value}
                    onChange={() => {
                      setPlaying(false);
                      setChooseSupplementary(value);
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>
                    {value
                      ? text(lang, "Supplementary π−θ", "補角 π−θ")
                      : text(lang, "Smaller θ", "較小角 θ")}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {text(
                lang,
                "An interior opening needs specified half-planes or an outward-normal convention. An arbitrary flip cannot identify it. With specified outward normals of a convex solid, the interior is π−φ.",
                "內角開口須有指定的半平面或外向法向量慣例，不能靠任意反轉判定。若已指定凸立體的外向法向量，內角才是 π−φ。"
              )}
            </p>
          </fieldset>
        </div>

        <div className="min-w-0 space-y-2 rounded-xl border border-border bg-secondary/25 p-3">
          <p className="text-xs font-semibold">
            {text(
              lang,
              "Exact cross products and signed dot substitution",
              "精確叉積與帶符號內積代入"
            )}
          </p>
          {normalFormulas.map((latex, index) => (
            <div key={index} className="overflow-x-auto py-1 text-sm">
              <KatexRenderer latex={latex} />
            </div>
          ))}
          <div className="overflow-x-auto py-1 text-sm">
            <KatexRenderer
              latex={`\\mathbf n_1\\cdot\\mathbf n_2=${dotSubstitution}=${ratToLatex(concept.dot)}`}
            />
          </div>
          <div className="overflow-x-auto py-1 text-sm">
            <KatexRenderer
              latex={`\\|\\mathbf n_1\\|^2=${ratToLatex(concept.norm1Squared)},\\quad\\|\\mathbf n_2\\|^2=${ratToLatex(concept.norm2Squared)},\\quad\\cos\\varphi=\\frac{\\mathbf n_1\\cdot\\mathbf n_2}{\\|\\mathbf n_1\\|\\|\\mathbf n_2\\|}=${concept.signedCosineLatex},\\quad\\cos\\theta=|\\cos\\varphi|`}
            />
          </div>
        </div>

        {everOpened && scene && (
          <figure
            className="min-w-0 space-y-3 rounded-xl border border-border bg-background p-2"
            data-testid="normal-graph"
            data-stage={stepIndex}
            data-rotation={rotationDegrees}
          >
            <figcaption className="px-2 pt-1 text-sm font-medium">
              {text(
                lang,
                `Stage ${stepIndex + 1}/6 · `,
                `階段 ${stepIndex + 1}/6 · `
              )}
              {stageNames[stepIndex]}
            </figcaption>
            <div
              className="flex flex-wrap gap-x-4 gap-y-2 px-2 text-xs text-muted-foreground"
              aria-label={text(lang, "Diagram colour key", "圖中顏色色鍵")}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-[#0f766e]" aria-hidden="true" />
                Π₁{stepIndex >= 1 ? " · n₁" : ""}
                {stepIndex >= 3 ? " · r₁" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-[#b7791f]" aria-hidden="true" />
                Π₂{stepIndex >= 2 ? " · n₂" : ""}
                {stepIndex >= 3 ? " · r₂" : ""}
              </span>
              {stepIndex >= 4 && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-0.5 w-5 bg-[#b45360]"
                      aria-hidden="true"
                    />
                    φ{stepIndex >= 5 ? " · δ" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-0.5 w-5 bg-[#6479b2]"
                      aria-hidden="true"
                    />
                    θ
                  </span>
                </>
              )}
            </div>
            <Plot3DScene
              data={scene.data}
              boundsData={boundsData}
              layout={scene.layout}
              lang={lang}
              height={360}
              uirevision="plane-normal-concept-camera"
              name={text(
                lang,
                "Live point-defined plane normals concept",
                "已知點平面法向量即時概念圖"
              )}
            />
            <p className="px-2 text-xs leading-relaxed text-muted-foreground">
              {scene.note}
            </p>
            <p className="px-2 text-xs leading-relaxed text-muted-foreground">
              {stepIndex < 3
                ? text(
                    lang,
                    "Normal n₁ is added at stage 2 and n₂ at stage 3; the section and rotating rays appear at stage 4.",
                    "階段 2 加入法向量 n₁，階段 3 加入 n₂；階段 4 才顯示截面與轉動射線。"
                  )
                : text(
                    lang,
                    "Solid n₁/n₂ remain the normals. Dashed r₁/r₂ are turning directions, not intermediate normals; at 0° they align with the normals, and at 90° they lie in their respective planes. The section is perpendicular to h. φ appears at stage 5; the selected δ arc appears at stage 6.",
                    "實線 n₁／n₂ 始終是法向量；虛線 r₁／r₂ 是轉動方向，途中不是法向量。0° 時與法向量同向，90° 時位於各自平面內。截面垂直 h；階段 5 顯示 φ，階段 6 顯示所選 δ 的弧線。"
                  )}
            </p>
            {concept.parallel && (
              <p className="mx-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs leading-relaxed">
                {text(
                  lang,
                  "Parallel or coincident planes: θ=0; the supplementary 180° opening is degenerate. The turn axis is a demonstration direction, not a unique intersection edge or point.",
                  "兩平面平行或重合：θ=0；補角 180° 是退化開口。轉軸只是示範方向，不是唯一交線或交點。"
                )}
              </p>
            )}
          </figure>
        )}

        <section
          className="min-w-0 space-y-3 rounded-xl border border-border p-3"
          aria-label={text(
            lang,
            "Paired normal-direction turn",
            "成對法向量方向轉動"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={rotationId} className="text-sm font-semibold">
              {text(
                lang,
                "Turn both directions about fixed h",
                "繞固定 h 同向轉動兩個方向"
              )}
            </label>
            <output
              htmlFor={rotationId}
              className="font-mono text-sm tabular-nums"
            >
              {rotationDegrees}° / 90°
            </output>
          </div>
          <input
            id={rotationId}
            data-testid="normal-rotation"
            type="range"
            min={0}
            max={90}
            step={1}
            value={rotationDegrees}
            aria-valuetext={`${rotationDegrees}°`}
            className="h-11 w-full cursor-pointer accent-primary"
            onChange={event => {
              setPlaying(false);
              setRotationDegrees(Number(event.target.value));
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="normal-turn-play"
              disabled={playing || reducedMotion}
              className={touchButton}
              onClick={() => {
                if (document.hidden || reducedMotion) return;
                if (rotationDegrees >= 90) setRotationDegrees(0);
                setPlaying(true);
              }}
            >
              <Play size={16} aria-hidden="true" />
              {text(lang, "Play turn", "播放轉動")}
            </button>
            <button
              type="button"
              data-testid="normal-turn-pause"
              disabled={!playing}
              className={touchButton}
              onClick={() => setPlaying(false)}
            >
              <Pause size={16} aria-hidden="true" />
              {text(lang, "Pause", "暫停")}
            </button>
            <button
              type="button"
              data-testid="normal-turn-reset"
              className={touchButton}
              onClick={() => {
                setPlaying(false);
                setRotationDegrees(0);
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              {text(lang, "Reset turn", "重設轉動")}
            </button>
            <button
              type="button"
              className={touchButton}
              onClick={() => {
                setPlaying(false);
                setRotationDegrees(90);
              }}
            >
              {text(lang, "90° endpoint", "90° 終點")}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {text(
              lang,
              "This is a visual rotation only. Both rays turn in the same sense; their signed angle φ stays fixed, and θ and δ keep their exact answers. Section directions at 90° are parallel to h×n₁ and h×n₂. At early stages the slider is saved until the rays are shown.",
              "這只是視覺轉動。兩射線同向轉動，帶符號角 φ 保持不變，θ 與 δ 的精確答案亦不變。90° 時截面方向分別平行 h×n₁、h×n₂。較早階段只儲存滑桿角度，待顯示射線時套用。"
            )}
          </p>
          {reducedMotion && (
            <p role="status" className="text-xs text-muted-foreground">
              {text(
                lang,
                "Reduced motion: automatic playback is off. Use the slider and manual step controls.",
                "減少動態效果：已停用自動播放，請使用滑桿及手動步驟控制。"
              )}
            </p>
          )}
        </section>

        {opened && (
          <div
            data-testid="normal-steps"
            className="min-w-0 [&_button]:min-h-11 [&_button]:min-w-11 [&_select]:min-h-11"
            onClickCapture={event => {
              // Keep shared manual stepping, but do not start its timed playback when motion is reduced.
              if (!reducedMotion && !document.hidden) return;
              const button = (event.target as HTMLElement).closest("button");
              const label = button?.getAttribute("aria-label");
              if (
                label === "Play derivation" ||
                label === "Replay derivation" ||
                label === "播放推導" ||
                label === "重播推導"
              ) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            <StepDisplay
              key={playerSession}
              steps={steps}
              onStepChange={onStepChange}
              title={text(
                lang,
                "Six linked vector-only stages",
                "六個同步純向量階段"
              )}
            />
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            {text(
              lang,
              "Why the angles agree: in the perpendicular section, the same 90° turn sends each normal direction into its plane. A common rotation preserves the signed dot angle; absolute value then removes orientation.",
              "為何夾角相同：在垂直截面內，同一個 90° 轉動將各法向量方向送入相應平面；共同旋轉保留帶符號的內積角，絕對值則消除方向影響。"
            )}
          </p>
          <div className="overflow-x-auto py-1">
            <KatexRenderer latex="(\\mathbf h\\times\\mathbf n_1)\\cdot(\\mathbf h\\times\\mathbf n_2)=\\|\\mathbf h\\|^2(\\mathbf n_1\\cdot\\mathbf n_2),\\quad\\mathbf h\\perp\\mathbf n_1,\\mathbf n_2" />
          </div>
          <a
            href="https://www.instagram.com/p/DfhH1rriuXq/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink size={14} aria-hidden="true" />
            {text(
              lang,
              "Source concept: chalet_dsemath · Instagram public caption",
              "概念來源：chalet_dsemath · Instagram 公開說明文字"
            )}
          </a>
          <p>
            {text(
              lang,
              "Original interactive diagram built from your current points, following the caption's cross-product / absolute-dot / supplementary-opening concept. The full carousel and its example coordinates were not read; this is not a coordinate reconstruction of that post.",
              "這是依照公開說明中的叉積、內積絕對值及補角開口概念，利用你目前的點建立的原創互動圖。未讀取完整輪播圖片或其例題座標；並非該貼文座標的重建。"
            )}
          </p>
        </div>
      </div>
    </details>
  );
}
