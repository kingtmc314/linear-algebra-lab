import { useId, useState } from "react";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";
import type { DerivationStep } from "@/lib/derivationPlayback";

export type DotVector2 = readonly [number, number];
export type DotPresetId =
  | "positive"
  | "orthogonal"
  | "negative"
  | "parallel"
  | "opposite"
  | "zero-a"
  | "zero-b";

export const DOT_PRODUCT_CARD_LATEX = String.raw`(1,2,3)\cdot(4,5,6)=4+10+18=32`;
export const DOT_PRODUCT_STEP_COUNT = 5;

export const DOT_PRODUCT_PRESETS: readonly {
  id: DotPresetId;
  a: DotVector2;
  b: DotVector2;
  zh: string;
  en: string;
}[] = [
  {
    id: "positive",
    a: [1, 0],
    b: [1, 1],
    zh: "正投影 · 45°",
    en: "Positive · 45°",
  },
  {
    id: "orthogonal",
    a: [1, 0],
    b: [0, 1],
    zh: "垂直 · 90°",
    en: "Orthogonal · 90°",
  },
  {
    id: "negative",
    a: [1, 0],
    b: [-1, 1],
    zh: "負投影 · 135°",
    en: "Negative · 135°",
  },
  {
    id: "parallel",
    a: [1, 0],
    b: [1, 0],
    zh: "同向 · 0°",
    en: "Same direction · 0°",
  },
  {
    id: "opposite",
    a: [1, 0],
    b: [-1, 0],
    zh: "反向 · 180°",
    en: "Opposite · 180°",
  },
  { id: "zero-a", a: [0, 0], b: [1, 1], zh: "a 為零向量", en: "Zero vector a" },
  { id: "zero-b", a: [1, 0], b: [0, 0], zh: "b 為零向量", en: "Zero vector b" },
];

/** Reject invalid input instead of allowing NaN/Infinity into SVG attributes. */
export function dotProduct(a: readonly number[], b: readonly number[]): number {
  if (!a.length || a.length !== b.length) {
    throw new RangeError("Dot products require equal, nonempty dimensions.");
  }
  if (![...a, ...b].every(Number.isFinite)) {
    throw new RangeError("Vector components must be finite.");
  }
  const result = a.reduce((sum, value, index) => sum + value * b[index], 0);
  if (!Number.isFinite(result))
    throw new RangeError("Dot product exceeds the finite numeric range.");
  return result === 0 ? 0 : result;
}

export interface DotGeometry {
  a: DotVector2;
  b: DotVector2;
  dot: number;
  magnitudeA: number;
  magnitudeB: number;
  cosine: number | null;
  angle: number | null;
  signedProjection: number | null;
  projection: DotVector2 | null;
  perpendicular: DotVector2 | null;
  sign: "positive" | "zero" | "negative" | "undefined";
}

/** Project b onto a; a zero vector has no direction, so its projection is undefined. */
export function dotGeometry(a: DotVector2, b: DotVector2): DotGeometry {
  const dot = dotProduct(a, b);
  const magnitudeA = Math.hypot(...a);
  const magnitudeB = Math.hypot(...b);
  if (![magnitudeA, magnitudeB].every(Number.isFinite)) {
    throw new RangeError("Vector magnitude exceeds the finite numeric range.");
  }
  const signedProjection = magnitudeA === 0 ? null : dot / magnitudeA;
  const projection: DotVector2 | null =
    signedProjection === null
      ? null
      : [
          (a[0] / magnitudeA) * signedProjection,
          (a[1] / magnitudeA) * signedProjection,
        ];
  // Divide in stages, avoiding overflow in the product of the two magnitudes.
  const cosine =
    magnitudeA === 0 || magnitudeB === 0
      ? null
      : Math.max(-1, Math.min(1, dot / magnitudeA / magnitudeB));
  return {
    a,
    b,
    dot,
    magnitudeA,
    magnitudeB,
    cosine,
    angle: cosine === null ? null : Math.acos(cosine),
    signedProjection,
    projection,
    perpendicular:
      projection === null ? null : [b[0] - projection[0], b[1] - projection[1]],
    sign:
      signedProjection === null
        ? "undefined"
        : signedProjection > 0
          ? "positive"
          : signedProjection < 0
            ? "negative"
            : "zero",
  };
}

function clampProgress(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export interface DotVisualFrame {
  vectorA: DotVector2;
  vectorB: DotVector2;
  foot: DotVector2;
  dropStart: DotVector2;
  dropEnd: DotVector2;
  projectionEnd: DotVector2;
  arcAngle: number;
  arcRadius: number;
  arcOpacity: number;
  dropOpacity: number;
  projectionOpacity: number;
  resultOpacity: number;
}

/** All visual construction uses the shared stage/progress clock, never its own timer. */
export function dotVisualFrame(
  model: DotGeometry,
  frame: Pick<KnowledgeFrame, "stage" | "progress">
): DotVisualFrame {
  const stage = Number.isFinite(frame.stage)
    ? Math.max(0, Math.min(4, Math.floor(frame.stage)))
    : 0;
  const progress = clampProgress(frame.progress);
  const reveal = (step: number) =>
    stage > step ? 1 : stage < step ? 0 : progress;
  const vectorReveal = reveal(0);
  const foot = model.projection ?? [0, 0];
  const dropReveal = model.projection === null ? 0 : reveal(2);
  const projectionReveal = model.projection === null ? 0 : reveal(3);
  return {
    vectorA: [model.a[0] * vectorReveal, model.a[1] * vectorReveal],
    vectorB: [model.b[0] * vectorReveal, model.b[1] * vectorReveal],
    foot,
    dropStart: model.b,
    dropEnd: [
      model.b[0] + (foot[0] - model.b[0]) * dropReveal,
      model.b[1] + (foot[1] - model.b[1]) * dropReveal,
    ],
    projectionEnd: [foot[0] * projectionReveal, foot[1] * projectionReveal],
    arcAngle: (model.angle ?? 0) * reveal(1),
    arcRadius: 34 + 8 * reveal(4),
    arcOpacity: model.angle === null ? 0 : reveal(1),
    dropOpacity: dropReveal,
    projectionOpacity: projectionReveal,
    resultOpacity: reveal(4),
  };
}

export function dotAngleArc(
  angle: number,
  radius: number,
  startAngle = 0
): string {
  const theta = Number.isFinite(angle)
    ? Math.max(0, Math.min(Math.PI, angle))
    : 0;
  const r = Number.isFinite(radius) ? Math.max(0, Math.min(100, radius)) : 0;
  const start = Number.isFinite(startAngle) ? startAngle : 0;
  if (theta === 0 || r === 0) return "";
  return `M ${r * Math.cos(start)} ${-r * Math.sin(start)} A ${r} ${r} 0 0 0 ${r * Math.cos(start + theta)} ${-r * Math.sin(start + theta)}`;
}

const EXACT: Record<
  DotPresetId,
  { lengthB: string; cosine: string; angle: string; degrees: string }
> = {
  positive: {
    lengthB: String.raw`\sqrt{2}`,
    cosine: String.raw`\frac{\sqrt{2}}{2}`,
    angle: String.raw`45^\circ`,
    degrees: "45°",
  },
  orthogonal: {
    lengthB: "1",
    cosine: "0",
    angle: String.raw`90^\circ`,
    degrees: "90°",
  },
  negative: {
    lengthB: String.raw`\sqrt{2}`,
    cosine: String.raw`-\frac{\sqrt{2}}{2}`,
    angle: String.raw`135^\circ`,
    degrees: "135°",
  },
  parallel: {
    lengthB: "1",
    cosine: "1",
    angle: String.raw`0^\circ`,
    degrees: "0°",
  },
  opposite: {
    lengthB: "1",
    cosine: "-1",
    angle: String.raw`180^\circ`,
    degrees: "180°",
  },
  "zero-a": {
    lengthB: String.raw`\sqrt{2}`,
    cosine: String.raw`\text{undefined}`,
    angle: String.raw`\text{undefined}`,
    degrees: "",
  },
  "zero-b": {
    lengthB: "0",
    cosine: String.raw`\text{undefined}`,
    angle: String.raw`\text{undefined}`,
    degrees: "",
  },
};

export function dotProductSteps(
  id: DotPresetId,
  lang: "zh" | "en",
  variant = "vec-dot"
): DerivationStep[] {
  const preset =
    DOT_PRODUCT_PRESETS.find(item => item.id === id) ?? DOT_PRODUCT_PRESETS[0];
  const model = dotGeometry(preset.a, preset.b);
  const exact = EXACT[preset.id];
  const zh = lang === "zh";
  const text = (cn: string, en: string) => (zh ? cn : en);
  const vector = (v: DotVector2) => String.raw`(${v[0]},${v[1]})`;
  const validAngle = model.angle !== null;
  const finalLatex = !validAngle
    ? String.raw`\mathbf a\cdot\mathbf b=0,\qquad \theta=\text{undefined}`
    : variant === "vec-angle"
      ? String.raw`\cos\theta=\frac{\mathbf a\cdot\mathbf b}{|\mathbf a||\mathbf b|}=\frac{${model.dot}}{1\cdot ${exact.lengthB}}=${exact.cosine},\quad \theta=${exact.angle}`
      : String.raw`\mathbf a\cdot\mathbf b=|\mathbf a||\mathbf b|\cos\theta=1\cdot ${exact.lengthB}\cdot\left(${exact.cosine}\right)=${model.dot}`;
  return [
    {
      description: text(
        "定義本圖的二維示範向量；這不是上方三維算術例子的投影。",
        "Define this separate 2D demonstration; it is not a projection of the card's 3D arithmetic example."
      ),
      latex: String.raw`\mathbf a=${vector(preset.a)},\qquad \mathbf b=${vector(preset.b)}`,
    },
    {
      description: validAngle
        ? text(
            "量度兩個向量的長度，弧線標示它們的夾角 θ。",
            "Measure both lengths; the arc marks their angle θ."
          )
        : text(
            "零向量沒有方向，因此夾角未定義，不能使用反餘弦公式。",
            "A zero vector has no direction: its angle is undefined, so the arccosine formula cannot be used."
          ),
      latex: String.raw`|\mathbf a|=${model.magnitudeA},\quad |\mathbf b|=${exact.lengthB}${validAngle ? "" : String.raw`,\quad \theta=\text{undefined}`}`,
    },
    {
      description:
        model.projection === null
          ? text(
              "不能投影到零向量的方向；此時投影未定義。",
              "Projection onto a zero vector is undefined because it has no direction."
            )
          : text(
              "從 b 的終點落垂線到 a 所在的直線，得到投影足 p。",
              "Drop a perpendicular from the tip of b to the line through a, locating the projection foot p."
            ),
      latex:
        model.projection === null
          ? String.raw`\operatorname{proj}_{\mathbf a}\mathbf b=\text{undefined}`
          : String.raw`\mathbf p=\operatorname{proj}_{\mathbf a}\mathbf b=\frac{\mathbf a\cdot\mathbf b}{|\mathbf a|^2}\mathbf a=${vector(model.projection)}`,
    },
    {
      description:
        model.signedProjection === null
          ? text(
              "雖然投影未定義，分量乘積之和仍為零。",
              "Although projection is undefined, the sum of component products is still zero."
            )
          : text(
              "橙色箭頭沿 a 的方向量度有號投影：同向為正、反向為負、垂直為零。",
              "The orange arrow measures signed projection along a: positive forward, negative backward, zero when orthogonal."
            ),
      latex:
        model.signedProjection === null
          ? String.raw`\mathbf a\cdot\mathbf b=0\cdot ${preset.b[0]}+0\cdot ${preset.b[1]}=0`
          : String.raw`s=\frac{\mathbf a\cdot\mathbf b}{|\mathbf a|}=${model.signedProjection},\qquad \mathbf a\cdot\mathbf b=${preset.a[0]}\cdot(${preset.b[0]})+${preset.a[1]}\cdot(${preset.b[1]})=${model.dot}`,
    },
    {
      description: !validAngle
        ? text(
            "精確結果：點積為零，但不能把零向量說成與另一向量形成 90°。",
            "Exact result: the dot product is zero, but a zero vector does not form a 90° angle with the other vector."
          )
        : variant === "vec-angle"
          ? text(
              "把有號點積除以兩個非零長度，得到精確餘弦值及夾角。",
              "Divide the signed dot product by the two nonzero lengths to obtain the exact cosine and angle."
            )
          : text(
              "點積等於 a 的長度乘以 b 的有號投影；這也就是長度乘積乘以 cos θ。",
              "The dot product is the length of a times the signed projection of b, equivalently the length product times cos θ."
            ),
      latex: finalLatex,
    },
  ];
}

const BLUE = "#2563eb";
const PURPLE = "#a855f7";
const ORANGE = "#d97706";
const ORIGIN: DotVector2 = [280, 230];
const SCALE = 108;
const screen = (v: DotVector2): DotVector2 => [
  ORIGIN[0] + SCALE * v[0],
  ORIGIN[1] - SCALE * v[1],
];

export default function DotProductDiagram({
  lang,
  variant = "vec-dot",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [id, setId] = useState<DotPresetId>("positive");
  const uniqueId = useId().replace(/:/g, "");
  const preset =
    DOT_PRODUCT_PRESETS.find(item => item.id === id) ?? DOT_PRODUCT_PRESETS[0];
  const model = dotGeometry(preset.a, preset.b);
  const steps = dotProductSteps(id, lang, variant);
  const controls = (
    <>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {zh
          ? "獨立二維數值示範（非一般證明）。原卡三維例子："
          : "Separate 2D numerical demo (not a general proof). Card's 3D example: "}
        <span className="font-mono">(1,2,3) · (4,5,6) = 4 + 10 + 18 = 32</span>
      </p>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={zh ? "點積示範預設" : "Dot product demo presets"}
      >
        {DOT_PRODUCT_PRESETS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setId(item.id)}
            aria-pressed={item.id === id}
            className={`min-h-10 rounded-lg border px-2.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${item.id === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}
          >
            {zh ? item.zh : item.en}
          </button>
        ))}
      </div>
    </>
  );
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${id}:${lang}`}
      lang={lang}
      title={
        zh
          ? variant === "vec-angle"
            ? "有號投影與向量夾角"
            : "點積：長度 × 有號投影"
          : variant === "vec-angle"
            ? "Signed projection and vector angle"
            : "Dot product: length × signed projection"
      }
      steps={steps}
      controls={controls}
      testId="knowledge-dot-product"
    >
      {frame => {
        const visual = dotVisualFrame(model, frame);
        const a = screen(visual.vectorA);
        const b = screen(visual.vectorB);
        const foot = screen(visual.foot);
        const dropStart = screen(visual.dropStart);
        const dropEnd = screen(visual.dropEnd);
        const projectionEnd = screen(visual.projectionEnd);
        const bTarget = screen(preset.b);
        const coincident =
          preset.a[0] === preset.b[0] && preset.a[1] === preset.b[1];
        const arc = dotAngleArc(visual.arcAngle, visual.arcRadius);
        const signLabel =
          model.sign === "positive"
            ? zh
              ? "正投影"
              : "Positive projection"
            : model.sign === "negative"
              ? zh
                ? "負投影"
                : "Negative projection"
              : model.sign === "zero"
                ? zh
                  ? "零投影"
                  : "Zero projection"
                : zh
                  ? "投影未定義"
                  : "Projection undefined";
        return (
          <svg
            viewBox="0 0 560 340"
            width="100%"
            className="block h-auto text-foreground"
            role="img"
            aria-labelledby={`${uniqueId}-title ${uniqueId}-desc`}
            data-testid="dot-product-svg"
          >
            <title id={`${uniqueId}-title`}>
              {zh
                ? "點積、投影及夾角的二維動畫"
                : "Animated 2D dot product, projection and angle"}
            </title>
            <desc id={`${uniqueId}-desc`}>
              {zh
                ? `示範 a=(${preset.a})，b=(${preset.b})。藍色為 a、紫色為 b、橙色為 b 到 a 的有號投影。點積為 ${model.dot}。${model.angle === null ? "零向量的夾角未定義。" : `最終夾角 ${EXACT[id].degrees}。`}`
                : `Demo a=(${preset.a}), b=(${preset.b}). Blue is a; purple is b; orange is the signed projection of b onto a. Dot product ${model.dot}. ${model.angle === null ? "The angle with a zero vector is undefined." : `Final angle ${EXACT[id].degrees}.`}`}
            </desc>
            <defs>
              {[
                ["a", BLUE],
                ["b", PURPLE],
                ["p", ORANGE],
              ].map(([name, color]) => (
                <marker
                  key={name}
                  id={`${uniqueId}-${name}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
              ))}
            </defs>
            <text x="24" y="27" fontSize="14" fill="currentColor">
              {zh
                ? "二維示範 · 精確值見步驟公式"
                : "2D demo · exact values in step equations"}
            </text>
            <g fontSize="15" fill="currentColor">
              <circle cx="32" cy="52" r="5" fill={BLUE} />
              <text x="44" y="57">
                a
              </text>
              <circle cx="90" cy="52" r="5" fill={PURPLE} />
              <text x="102" y="57">
                b
              </text>
              <circle cx="150" cy="52" r="5" fill={ORANGE} />
              <text x="162" y="57">
                {zh ? "有號投影 s" : "Signed projection s"}
              </text>
            </g>
            <g stroke="currentColor" opacity="0.17" strokeWidth="1">
              <line x1="90" y1="230" x2="470" y2="230" />
              <line x1="280" y1="78" x2="280" y2="275" />
              {[172, 388].map(x => (
                <line key={x} x1={x} y1="226" x2={x} y2="234" />
              ))}
              <line x1="276" y1="122" x2="284" y2="122" />
            </g>
            <g fontSize="14" fill="currentColor" opacity="0.7">
              <text x="480" y="235">
                x
              </text>
              <text x="290" y="87">
                y
              </text>
              <text x="263" y="251">
                0
              </text>
              <text x="164" y="251">
                −1
              </text>
              <text x="384" y="251">
                1
              </text>
              <text x="260" y="128">
                1
              </text>
            </g>
            {model.angle === null && (
              <text
                x="280"
                y="91"
                textAnchor="middle"
                fontSize="16"
                fill="currentColor"
              >
                {zh ? "零向量：θ 未定義" : "Zero vector: θ undefined"}
              </text>
            )}
            <g opacity={visual.dropOpacity} stroke={ORANGE} fill="none">
              <line
                x1={dropStart[0]}
                y1={dropStart[1]}
                x2={dropEnd[0]}
                y2={dropEnd[1]}
                strokeDasharray="6 5"
                strokeWidth="2"
              />
              <circle cx={dropEnd[0]} cy={dropEnd[1]} r="4" fill={ORANGE} />
              {model.perpendicular &&
                Math.hypot(...model.perpendicular) > 0 && (
                  <path
                    d={`M ${foot[0] + (model.dot < 0 ? 10 : -10)} ${foot[1]} v -10 h ${model.dot < 0 ? -10 : 10}`}
                    strokeWidth="1.5"
                    opacity={frame.stage > 2 ? 1 : frame.progress === 1 ? 1 : 0}
                  />
                )}
            </g>
            <line
              x1={ORIGIN[0]}
              y1={ORIGIN[1]}
              x2={a[0]}
              y2={a[1]}
              stroke={BLUE}
              strokeWidth="4"
              markerEnd={
                model.magnitudeA > 0 ? `url(#${uniqueId}-a)` : undefined
              }
            />
            <line
              x1={ORIGIN[0]}
              y1={ORIGIN[1]}
              x2={b[0]}
              y2={b[1]}
              stroke={PURPLE}
              strokeWidth={coincident ? 2 : 4}
              strokeDasharray={coincident ? "8 5" : undefined}
              markerEnd={
                model.magnitudeB > 0 ? `url(#${uniqueId}-b)` : undefined
              }
            />
            <line
              x1={ORIGIN[0]}
              y1={ORIGIN[1]}
              x2={projectionEnd[0]}
              y2={projectionEnd[1]}
              stroke={ORANGE}
              strokeWidth={5 + 2 * visual.resultOpacity}
              opacity={visual.projectionOpacity * 0.75}
              markerEnd={
                model.signedProjection ? `url(#${uniqueId}-p)` : undefined
              }
            />
            <circle cx={ORIGIN[0]} cy={ORIGIN[1]} r="4" fill="currentColor" />
            <g opacity={visual.arcOpacity}>
              <path
                transform={`translate(${ORIGIN.join(" ")})`}
                d={arc}
                fill="none"
                stroke={PURPLE}
                strokeWidth={2 + visual.resultOpacity}
              />
              <text
                x={ORIGIN[0] + 56 * Math.cos((model.angle ?? 0) / 2)}
                y={ORIGIN[1] - 56 * Math.sin((model.angle ?? 0) / 2) - 6}
                fontSize="16"
                fill={PURPLE}
              >
                θ
                {frame.stage === 4 && frame.progress === 1
                  ? ` = ${EXACT[id].degrees}`
                  : ""}
              </text>
            </g>
            <g fill="currentColor" fontSize="15">
              <text x="408" y="221">
                a = ({preset.a.join(",")})
              </text>
              <text
                x={bTarget[0] + (preset.b[0] < 0 ? -16 : 12)}
                y={bTarget[1] - (coincident ? 42 : 17)}
                textAnchor={preset.b[0] < 0 ? "end" : "start"}
              >
                b = ({preset.b.join(",")})
              </text>
              {model.magnitudeA === 0 && (
                <circle
                  cx={ORIGIN[0]}
                  cy={ORIGIN[1]}
                  r="8"
                  fill="none"
                  stroke={BLUE}
                  strokeWidth="2"
                />
              )}
              {model.magnitudeB === 0 && (
                <circle
                  cx={ORIGIN[0]}
                  cy={ORIGIN[1]}
                  r="12"
                  fill="none"
                  stroke={PURPLE}
                  strokeWidth="2"
                />
              )}
            </g>
            <g opacity={visual.projectionOpacity}>
              <circle cx={foot[0]} cy={foot[1]} r="4" fill={ORANGE} />
              <text
                x={foot[0]}
                y="277"
                textAnchor="middle"
                fontSize="15"
                fill={ORANGE}
              >
                p = ({visual.foot.join(",")}); s = {model.signedProjection}
              </text>
            </g>
            <g opacity={visual.resultOpacity}>
              <rect
                x="24"
                y="298"
                width="512"
                height="30"
                rx="8"
                fill="currentColor"
                opacity="0.055"
              />
              <text
                x="280"
                y="318"
                textAnchor="middle"
                fontSize="16"
                fill="currentColor"
              >
                {signLabel} · a · b = {model.dot}
                {model.angle === null
                  ? zh
                    ? " · θ 未定義"
                    : " · θ undefined"
                  : ` · θ = ${EXACT[id].degrees}`}
              </text>
            </g>
          </svg>
        );
      }}
    </AnimatedKnowledgeLesson>
  );
}
