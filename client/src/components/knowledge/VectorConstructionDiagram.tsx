import { useId, useState } from "react";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";
import type { DerivationStep } from "@/lib/derivationPlayback";

export type Vector2 = readonly [number, number];
export type VectorOperation = "add" | "subtract";
export type VectorConstructionVariant =
  | "vec-def"
  | "vec-add"
  | "vec-magnitude"
  | "vec-unit";

export const VECTOR_CONSTRUCTION_VARIANTS: VectorConstructionVariant[] = [
  "vec-def",
  "vec-add",
  "vec-magnitude",
  "vec-unit",
];
export const VECTOR_CONSTRUCTION_STEP_COUNT = 5;
export const VECTOR_CONSTRUCTION_PRESETS = [
  {
    id: "sample",
    zh: "課本例子",
    en: "Card example",
    v: [3, 4],
    a: [3, 1],
    b: [1, 4],
  },
  {
    id: "signed",
    zh: "負分量",
    en: "Signed components",
    v: [-3, 4],
    a: [-3, 1],
    b: [1, -4],
  },
  {
    id: "axis",
    zh: "軸向／抵消",
    en: "Axis / cancellation",
    v: [0, -4],
    a: [3, 1],
    b: [-3, -1],
  },
  {
    id: "zero",
    zh: "零向量",
    en: "Zero vector",
    v: [0, 0],
    a: [0, 0],
    b: [0, 0],
  },
] as const;

/** The demo domain is bounded integral 2D coordinates, never unchecked input. */
function assertVector(vector: Vector2): void {
  if (!vector.every(value => Number.isInteger(value) && Math.abs(value) <= 6)) {
    throw new RangeError(
      "Vector components must be finite integers between -6 and 6."
    );
  }
}
export function addVectors(a: Vector2, b: Vector2): Vector2 {
  assertVector(a);
  assertVector(b);
  return [a[0] + b[0], a[1] + b[1]];
}
export function subtractVectors(a: Vector2, b: Vector2): Vector2 {
  assertVector(a);
  assertVector(b);
  return [a[0] - b[0], a[1] - b[1]];
}
export function vectorMagnitude(vector: Vector2): number {
  assertVector(vector);
  return Math.hypot(...vector);
}
export function normalizeVector(vector: Vector2): Vector2 | null {
  const magnitude = vectorMagnitude(vector);
  return magnitude === 0
    ? null
    : [vector[0] / magnitude, vector[1] / magnitude];
}
export interface VectorConstructionModel {
  a: Vector2;
  b: Vector2;
  result: Vector2;
  squaredLength: number;
  magnitude: number;
  unit: Vector2 | null;
  operation: VectorOperation;
}
export function buildVectorConstructionModel(
  a: Vector2,
  b: Vector2 = [0, 0],
  operation: VectorOperation = "add"
): VectorConstructionModel {
  assertVector(a);
  assertVector(b);
  return {
    a,
    b,
    operation,
    result: operation === "subtract" ? subtractVectors(a, b) : addVectors(a, b),
    squaredLength: a[0] ** 2 + a[1] ** 2,
    magnitude: vectorMagnitude(a),
    unit: normalizeVector(a),
  };
}
export function exactVectorLengthLatex(vector: Vector2): string {
  assertVector(vector);
  const squared = vector[0] ** 2 + vector[1] ** 2;
  if (squared === 0) return "0";
  let factor = Math.floor(Math.sqrt(squared));
  while (squared % (factor * factor) !== 0) factor--;
  const radicand = squared / (factor * factor);
  return radicand === 1
    ? `${factor}`
    : `${factor === 1 ? "" : factor}\\sqrt{${radicand}}`;
}
function fractionLatex(numerator: number, denominator: number): string {
  if (numerator === 0) return "0";
  let a = Math.abs(numerator),
    b = denominator;
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  const top = Math.abs(numerator) / a,
    bottom = denominator / a;
  return `${numerator < 0 ? "-" : ""}${bottom === 1 ? top : `\\frac{${top}}{${bottom}}`}`;
}
export function exactUnitVectorLatex(vector: Vector2): string | null {
  const length = exactVectorLengthLatex(vector);
  if (length === "0") return null;
  const magnitude = vectorMagnitude(vector);
  const entries = vector.map(value =>
    value === 0
      ? "0"
      : Number.isInteger(magnitude)
        ? fractionLatex(value, magnitude)
        : `\\frac{${value}}{${length}}`
  );
  return `\\begin{pmatrix}${entries[0]}\\\\${entries[1]}\\end{pmatrix}`;
}
function vectorLatex(vector: Vector2): string {
  return `\\begin{pmatrix}${vector[0]}\\\\${vector[1]}\\end{pmatrix}`;
}

export function createVectorConstructionSteps(
  variant: VectorConstructionVariant,
  model: VectorConstructionModel,
  lang: "zh" | "en"
): DerivationStep[] {
  const zh = lang === "zh";
  const { a, b, result, operation, squaredLength, magnitude } = model;
  const v = vectorLatex(a),
    length = exactVectorLengthLatex(a);
  const step = (cn: string, en: string, latex: string): DerivationStep => ({
    description: zh ? cn : en,
    latex,
  });
  if (variant === "vec-add") {
    const subtract = operation === "subtract",
      sign = subtract ? "-" : "+";
    const second = subtract ? ([-b[0], -b[1]] as Vector2) : b;
    return [
      step(
        "二維示例：先把兩向量放在同一原點。",
        "2D demo: place both vectors at the same origin.",
        String.raw`\mathbf a=${v},\quad\mathbf b=${vectorLatex(b)}`
      ),
      step(
        subtract
          ? "先反轉 b 得到 −b，再把它平移到 a 的終點。"
          : "把 b 平移到 a 的終點；方向與長度不變。",
        subtract
          ? "Reverse b to obtain -b, then move its tail to the tip of a."
          : "Move the tail of b to the tip of a without changing its direction or length.",
        String.raw`\mathbf a${sign}\mathbf b=\mathbf a+${subtract ? String.raw`(-\mathbf b)` : String.raw`\mathbf b`},\quad ${subtract ? String.raw`-\mathbf b` : String.raw`\mathbf b`}=${vectorLatex(second)}`
      ),
      step(
        "由原點連到首尾相接的終點，得到結果向量。",
        "Connect the origin to the tip of the translated vector to obtain the result.",
        String.raw`\mathbf r=\mathbf a${sign}\mathbf b=${vectorLatex(result)}`
      ),
      step(
        "水平與垂直分量分別相加或相減。",
        "Add or subtract the horizontal and vertical components separately.",
        String.raw`\mathbf r=\begin{pmatrix}${a[0]}${sign}(${b[0]})\\${a[1]}${sign}(${b[1]})\end{pmatrix}=${vectorLatex(result)}`
      ),
      step(
        subtract
          ? "紫色箭頭由 b 的終點指向 a 的終點：位移正是 a−b。"
          : "虛線補成平行四邊形；對角線是 a+b。零結果沒有方向。",
        subtract
          ? "The purple arrow runs from the tip of b to the tip of a: its displacement is a-b."
          : "The dashed edges complete the parallelogram; its diagonal is a+b. A zero result has no direction.",
        subtract
          ? String.raw`\overrightarrow{BA}=\mathbf a-\mathbf b=${vectorLatex(result)}`
          : String.raw`\mathbf a+\mathbf b=${vectorLatex(result)}`
      ),
    ];
  }
  const steps = [
    step(
      "二維示例：有向箭頭由原點 O 指向向量終點。",
      "2D demo: the directed arrow starts at O and ends at the vector tip.",
      String.raw`\mathbf v=${v}`
    ),
    step(
      "先畫水平分量；分量可為負，也可為零。",
      "Construct the horizontal component; it may be negative or zero.",
      String.raw`\mathbf v_x=\begin{pmatrix}${a[0]}\\0\end{pmatrix}`
    ),
    step(
      "再首尾相接畫垂直分量，得到同一個終點。",
      "Append the vertical component to reach the same tip.",
      String.raw`\mathbf v=\begin{pmatrix}${a[0]}\\0\end{pmatrix}+\begin{pmatrix}0\\${a[1]}\end{pmatrix}=${v}`
    ),
  ];
  const lengthEquation = String.raw`\lVert\mathbf v\rVert=\sqrt{(${a[0]})^2+(${a[1]})^2}=\sqrt{${squaredLength}}=${length}`;
  if (variant === "vec-unit") {
    const unit = exactUnitVectorLatex(a);
    steps.push(
      step(
        unit
          ? "沿同一方向縮短到原長度的倒數倍。"
          : "零向量長度為零，不能除以零。",
        unit
          ? "Scale by the reciprocal length, preserving the direction."
          : "The zero vector has length zero, so division by its length is undefined.",
        unit
          ? String.raw`\lVert\mathbf v\rVert=${length},\quad\hat{\mathbf v}=\frac{1}{${length}}${v}=${unit}`
          : String.raw`\lVert\mathbf0\rVert=0,\quad\hat{\mathbf0}\text{ is undefined}`
      )
    );
    steps.push(
      step(
        unit
          ? "綠色箭頭落在單位圓上，長度恰好是 1。"
          : "零向量沒有方向，也沒有對應的單位向量。",
        unit
          ? "The green arrow ends on the unit circle and has length exactly 1."
          : "The zero vector has no direction and cannot be normalized.",
        unit
          ? String.raw`\hat{\mathbf v}=${unit},\quad\lVert\hat{\mathbf v}\rVert^2=\frac{${squaredLength}}{${squaredLength}}=1`
          : String.raw`\mathbf v=\mathbf0\quad\Longrightarrow\quad\text{no unit vector}`
      )
    );
  } else {
    steps.push(
      step(
        magnitude === 0
          ? "零向量長度為零；不形成非退化三角形。"
          : "以分量作直角三角形的兩邊，箭頭是斜邊。",
        magnitude === 0
          ? "The zero vector has length zero; no nondegenerate triangle is formed."
          : "The components form the legs of a right triangle; the arrow is its hypotenuse.",
        lengthEquation
      )
    );
    steps.push(
      variant === "vec-def"
        ? step(
            "平移箭頭不改變向量：P 到 Q 的位移仍是 v。",
            "Translation preserves the vector: the displacement from P to Q remains v.",
            String.raw`\overrightarrow{PQ}=\mathbf v=${v},\quad\lVert\mathbf v\rVert=${length}`
          )
        : step(
            "將金色長度線旋轉到水平尺上；旋轉不改變長度。",
            "Rotate the gold length segment onto the horizontal ruler; rotation preserves length.",
            lengthEquation
          )
    );
  }
  return steps;
}

const scale = (vector: Vector2, factor: number): Vector2 => [
  vector[0] * factor || 0,
  vector[1] * factor || 0,
];
const plus = (a: Vector2, b: Vector2): Vector2 => [a[0] + b[0], a[1] + b[1]];
const lerp = (a: Vector2, b: Vector2, t: number): Vector2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
export function vectorStageProgress(
  frame: KnowledgeFrame,
  stage: number
): number {
  const current = Number.isFinite(frame.stage)
    ? Math.max(0, Math.min(4, Math.floor(frame.stage)))
    : 0;
  const progress = Number.isFinite(frame.progress)
    ? Math.max(0, Math.min(1, frame.progress))
    : 0;
  return current < stage ? 0 : current > stage ? 1 : progress;
}
/** All moving points use the same stage/progress as the exact equation. */
export function vectorConstructionGeometry(
  variant: VectorConstructionVariant,
  model: VectorConstructionModel,
  frame: KnowledgeFrame
) {
  const p = (stage: number) => vectorStageProgress(frame, stage);
  const { a, b, result, unit, magnitude, operation } = model;
  const t = p(1);
  const direction =
    operation === "subtract" ? scale(b, 1 - 2 * Math.min(1, t * 2)) : b;
  const secondTail = scale(
    a,
    operation === "subtract" ? Math.max(0, t * 2 - 1) : t
  );
  const shift: Vector2 = [-1, 1];
  const angle = Math.atan2(a[1], a[0]) * (1 - p(4));
  const displayedVector =
    variant === "vec-unit" && unit ? lerp(a, unit, p(3)) : a;
  return {
    vectorTip: scale(displayedVector, p(0)),
    horizontalTip: scale([a[0], 0], p(1)),
    verticalTip: plus([a[0], 0], scale([0, a[1]], p(2))),
    secondTail,
    secondTip: plus(secondTail, scale(direction, p(0))),
    resultTip: scale(result, p(2)),
    resultHorizontalTip: scale([result[0], 0], p(3)),
    resultVerticalTip: plus([result[0], 0], scale([0, result[1]], p(3))),
    translatedTail: scale(shift, p(4)),
    translatedTip: plus(scale(shift, p(4)), a),
    measurementTip: [
      magnitude * Math.cos(angle),
      magnitude * Math.sin(angle),
    ] as Vector2,
    tipDifferenceTip: plus(b, scale(result, p(4))),
    horizontalOpacity: p(1),
    verticalOpacity: p(2),
    lengthOpacity: p(3),
    finalOpacity: p(4),
    resultOpacity: p(2),
    componentOpacity: p(3),
    unitCircleOpacity: variant === "vec-unit" && unit ? p(4) : 0,
  };
}

export function vectorConstructionViewport(points: readonly Vector2[]) {
  const safe = points.filter(point => point.every(Number.isFinite));
  const xs = [0, ...safe.map(point => point[0])],
    ys = [0, ...safe.map(point => point[1])];
  const minX = Math.min(...xs) - 1.25,
    maxX = Math.max(...xs) + 1.25;
  const minY = Math.min(...ys) - 1.25,
    maxY = Math.max(...ys) + 1.25;
  const unitScale = Math.min(440 / (maxX - minX), 236 / (maxY - minY));
  const origin: Vector2 = [
    280 - ((minX + maxX) * unitScale) / 2,
    165 + ((minY + maxY) * unitScale) / 2,
  ];
  const project = (point: Vector2): Vector2 => [
    origin[0] + point[0] * unitScale,
    origin[1] - point[1] * unitScale,
  ];
  return { minX, maxX, minY, maxY, unitScale, origin, project };
}

export default function VectorConstructionDiagram({
  lang,
  variant = "vec-def",
}: KnowledgeDiagramProps) {
  const supported = VECTOR_CONSTRUCTION_VARIANTS.includes(
    variant as VectorConstructionVariant
  )
    ? (variant as VectorConstructionVariant)
    : "vec-def";
  // A changed item ID gets its own preset/operation state and resets shared playback.
  return (
    <VectorConstructionLesson key={supported} lang={lang} variant={supported} />
  );
}

function VectorConstructionLesson({
  lang,
  variant,
}: {
  lang: "zh" | "en";
  variant: VectorConstructionVariant;
}) {
  const zh = lang === "zh";
  const [presetId, setPresetId] = useState("sample");
  const [operation, setOperation] = useState<VectorOperation>("add");
  const preset =
    VECTOR_CONSTRUCTION_PRESETS.find(item => item.id === presetId) ??
    VECTOR_CONSTRUCTION_PRESETS[0];
  const model = buildVectorConstructionModel(
    variant === "vec-add" ? preset.a : preset.v,
    variant === "vec-add" ? preset.b : [0, 0],
    operation
  );
  const steps = createVectorConstructionSteps(variant, model, lang);
  const titles = {
    "vec-def": zh ? "分量與有向位移" : "Components and directed displacement",
    "vec-add": zh ? "首尾相接與終點之差" : "Tip-to-tail and tip difference",
    "vec-magnitude": zh ? "分量三角形與長度" : "Component triangle and length",
    "vec-unit": zh ? "保持方向，縮放至單位長度" : "Same direction, unit length",
  };
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${presetId}:${operation}`}
      lang={lang}
      title={titles[variant]}
      steps={steps}
      testId="knowledge-vector-construction"
      controls={
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {zh
              ? "二維數值示例，不是任意向量的一般證明。"
              : "A numerical 2D demonstration, not a general proof for arbitrary vectors."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-10 items-center gap-2 text-xs">
              {zh ? "示例" : "Example"}
              <select
                value={presetId}
                onChange={event => setPresetId(event.target.value)}
                aria-label={zh ? "向量示例" : "Vector example"}
                className="min-h-10 max-w-full rounded-md border border-border bg-card px-2 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {VECTOR_CONSTRUCTION_PRESETS.map(item => (
                  <option key={item.id} value={item.id}>
                    {zh ? item.zh : item.en}
                  </option>
                ))}
              </select>
            </label>
            {variant === "vec-add" && (
              <div
                role="group"
                aria-label={zh ? "向量運算" : "Vector operation"}
                className="flex gap-1"
              >
                {(["add", "subtract"] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={operation === value}
                    onClick={() => setOperation(value)}
                    className={`min-h-10 rounded-md border px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${operation === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
                  >
                    {value === "add"
                      ? zh
                        ? "加法 a+b"
                        : "Add a+b"
                      : zh
                        ? "減法 a−b"
                        : "Subtract a-b"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      }
    >
      {frame => (
        <VectorConstructionScene
          lang={lang}
          variant={variant}
          model={model}
          frame={frame}
        />
      )}
    </AnimatedKnowledgeLesson>
  );
}

function VectorConstructionScene({
  lang,
  variant,
  model,
  frame,
}: {
  lang: "zh" | "en";
  variant: VectorConstructionVariant;
  model: VectorConstructionModel;
  frame: KnowledgeFrame;
}) {
  const zh = lang === "zh",
    addition = variant === "vec-add";
  const id = useId().replace(/:/g, "");
  const geometry = vectorConstructionGeometry(variant, model, frame);
  const { a, b, result, unit, magnitude } = model;
  const negativeB = scale(b, -1);
  const points: Vector2[] = addition
    ? [[0, 0], a, b, result, negativeB]
    : [[0, 0], a];
  if (variant === "vec-def") points.push([-1, 1], plus([-1, 1], a));
  if (variant === "vec-magnitude") points.push([magnitude, 0]);
  if (variant === "vec-unit") points.push([-1, -1], [1, 1]);
  const viewport = vectorConstructionViewport(points);
  const { project, origin, unitScale } = viewport;
  const marker = (color: string) => `url(#${id}-${color})`;
  const colors = {
    blue: "text-blue-600 dark:text-blue-300",
    orange: "text-orange-600 dark:text-orange-300",
    green: "text-emerald-600 dark:text-emerald-300",
    purple: "text-violet-600 dark:text-violet-300",
    gold: "text-amber-600 dark:text-amber-300",
  };
  const arrow = (
    start: Vector2,
    end: Vector2,
    color: keyof typeof colors,
    opacity = 1,
    dashed = false
  ) => {
    if (Math.hypot(end[0] - start[0], end[1] - start[1]) < 1e-8) return null;
    const s = project(start),
      e = project(end);
    return (
      <line
        x1={s[0]}
        y1={s[1]}
        x2={e[0]}
        y2={e[1]}
        stroke="currentColor"
        strokeWidth={dashed ? 2 : 3}
        strokeDasharray={dashed ? "5 4" : undefined}
        opacity={opacity}
        markerEnd={marker(color)}
        className={colors[color]}
      />
    );
  };
  const label = (
    point: Vector2,
    text: string,
    color: keyof typeof colors,
    opacity = 1,
    dx = 10,
    dy = -10
  ) => {
    const p = project(point);
    return (
      <text
        x={p[0] + dx}
        y={p[1] + dy}
        fontSize={16}
        fontWeight={600}
        fill="currentColor"
        className={colors[color]}
        opacity={opacity}
      >
        {text}
      </text>
    );
  };
  const desc = addition
    ? zh
      ? "藍色為 a，橙色為 b。加法平移 b 並連接結果；減法反轉 b，紫色箭頭由 b 終點指向 a 終點。"
      : "Blue is a and orange is b. Addition translates b and connects the result. Subtraction reverses b; the purple arrow runs from the tip of b to the tip of a."
    : zh
      ? "藍色箭頭及水平、垂直分量隨播放構造。金色顯示長度，綠色單位箭頭保持原方向。零向量不能正規化。"
      : "Playback constructs the blue arrow and its horizontal and vertical components. Gold indicates length; the green unit arrow preserves direction. The zero vector cannot be normalized.";
  const zero = addition ? result[0] === 0 && result[1] === 0 : magnitude === 0;
  const showZero = zero && (!addition || geometry.resultOpacity > 0);
  return (
    <div className="text-foreground">
      <svg
        viewBox="0 0 560 340"
        width="100%"
        className="block h-auto"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        data-testid="vector-construction-svg"
        data-variant={variant}
      >
        <title id={`${id}-title`}>
          {zh ? "向量構造動畫" : "Animated vector construction"}
        </title>
        <desc id={`${id}-desc`}>{desc}</desc>
        <defs>
          {(Object.keys(colors) as (keyof typeof colors)[]).map(color => (
            <marker
              key={color}
              id={`${id}-${color}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="10"
              markerHeight="10"
              orient="auto"
              markerUnits="userSpaceOnUse"
              className={colors[color]}
            >
              <path d="M 0 1 L 9 5 L 0 9 Z" fill="currentColor" />
            </marker>
          ))}
        </defs>
        <text
          x="24"
          y="26"
          fontSize="15"
          fill="currentColor"
          className="text-muted-foreground"
        >
          {zh ? "同一比例尺 · 二維示例" : "Equal axis scale · 2D demo"}
        </text>
        <g className="text-border" stroke="currentColor" strokeWidth="1">
          {Array.from(
            {
              length: Math.max(
                0,
                Math.floor(viewport.maxX) - Math.ceil(viewport.minX) + 1
              ),
            },
            (_, i) => Math.ceil(viewport.minX) + i
          ).map(x => (
            <line
              key={`x${x}`}
              x1={project([x, 0])[0]}
              y1="47"
              x2={project([x, 0])[0]}
              y2="283"
            />
          ))}
          {Array.from(
            {
              length: Math.max(
                0,
                Math.floor(viewport.maxY) - Math.ceil(viewport.minY) + 1
              ),
            },
            (_, i) => Math.ceil(viewport.minY) + i
          ).map(y => (
            <line
              key={`y${y}`}
              x1="60"
              y1={project([0, y])[1]}
              x2="500"
              y2={project([0, y])[1]}
            />
          ))}
        </g>
        <g
          stroke="currentColor"
          className="text-muted-foreground"
          strokeWidth="1.4"
        >
          <line x1="60" y1={origin[1]} x2="510" y2={origin[1]} />
          <line x1={origin[0]} y1="42" x2={origin[0]} y2="290" />
        </g>
        <g fontSize="15" fill="currentColor" className="text-muted-foreground">
          <text x="516" y={origin[1] + 5}>
            x
          </text>
          <text x={origin[0] - 15} y="43">
            y
          </text>
          <text x={origin[0] - 17} y={origin[1] + 19}>
            O
          </text>
        </g>
        {Array.from(
          {
            length: Math.max(
              0,
              Math.floor(viewport.maxX) - Math.ceil(viewport.minX) + 1
            ),
          },
          (_, i) => Math.ceil(viewport.minX) + i
        )
          .filter(x => x !== 0)
          .map(x => (
            <text
              key={`tick${x}`}
              x={project([x, 0])[0]}
              y={origin[1] + 18}
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
              className="text-muted-foreground"
            >
              {x}
            </text>
          ))}
        {Array.from(
          {
            length: Math.max(
              0,
              Math.floor(viewport.maxY) - Math.ceil(viewport.minY) + 1
            ),
          },
          (_, i) => Math.ceil(viewport.minY) + i
        )
          .filter(y => y !== 0)
          .map(y => (
            <text
              key={`tickY${y}`}
              x={origin[0] - 10}
              y={project([0, y])[1] + 4}
              textAnchor="end"
              fontSize="12"
              fill="currentColor"
              className="text-muted-foreground"
            >
              {y}
            </text>
          ))}
        <circle cx={origin[0]} cy={origin[1]} r="3" fill="currentColor" />
        {addition ? (
          <>
            {arrow([0, 0], b, "orange", 0.28, true)}
            {arrow([0, 0], geometry.vectorTip, "blue")}
            {label(a, "a", "blue", vectorStageProgress(frame, 0))}
            {arrow(geometry.secondTail, geometry.secondTip, "orange")}
            {label(
              geometry.secondTip,
              model.operation === "subtract" &&
                vectorStageProgress(frame, 1) >= 0.5
                ? "−b"
                : "b",
              "orange",
              vectorStageProgress(frame, 0)
            )}
            {arrow([0, 0], geometry.resultTip, "green", geometry.resultOpacity)}
            {label(result, "r", "green", geometry.resultOpacity)}
            {arrow(
              [0, 0],
              geometry.resultHorizontalTip,
              "purple",
              geometry.componentOpacity,
              true
            )}
            {arrow(
              [result[0], 0],
              geometry.resultVerticalTip,
              "purple",
              geometry.componentOpacity,
              true
            )}
            {model.operation === "subtract" ? (
              <>
                {arrow(
                  b,
                  geometry.tipDifferenceTip,
                  "purple",
                  geometry.finalOpacity
                )}
                {label(b, "B", "orange", geometry.finalOpacity, -18, -10)}
                {label(a, "A", "blue", geometry.finalOpacity, 10, 20)}
                {label(lerp(b, a, 0.5), "a−b", "purple", geometry.finalOpacity)}
              </>
            ) : (
              arrow(b, result, "blue", geometry.finalOpacity * 0.6, true)
            )}
          </>
        ) : (
          <>
            {variant === "vec-unit" &&
              arrow([0, 0], a, "blue", geometry.lengthOpacity * 0.25, true)}
            {arrow(
              [0, 0],
              geometry.horizontalTip,
              "orange",
              geometry.horizontalOpacity,
              true
            )}
            {arrow(
              [a[0], 0],
              geometry.verticalTip,
              "orange",
              geometry.verticalOpacity,
              true
            )}
            {label(
              [a[0] / 2, 0],
              `x = ${a[0]}`,
              "orange",
              geometry.horizontalOpacity,
              -22,
              34
            )}
            {label(
              [a[0], a[1] / 2],
              `y = ${a[1]}`,
              "orange",
              geometry.verticalOpacity,
              a[0] >= 0 ? 12 : -62,
              3
            )}
            {a[0] !== 0 && a[1] !== 0 && (
              <path
                d={`M ${project([a[0] - Math.sign(a[0]) * 0.3, 0])[0]} ${origin[1]} v ${-Math.sign(a[1]) * unitScale * 0.3} h ${Math.sign(a[0]) * unitScale * 0.3}`}
                fill="none"
                stroke="currentColor"
                className="text-orange-600 dark:text-orange-300"
                opacity={geometry.verticalOpacity}
              />
            )}
            {arrow(
              [0, 0],
              geometry.vectorTip,
              variant === "vec-unit" && geometry.lengthOpacity > 0
                ? "green"
                : "blue"
            )}
            {label(
              geometry.vectorTip,
              variant === "vec-unit" && geometry.lengthOpacity === 1 && unit
                ? "v̂"
                : "v",
              variant === "vec-unit" && geometry.lengthOpacity > 0
                ? "green"
                : "blue",
              vectorStageProgress(frame, 0)
            )}
            {variant === "vec-unit" ? (
              <>
                <circle
                  cx={origin[0]}
                  cy={origin[1]}
                  r={unitScale}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  className="text-emerald-600 dark:text-emerald-300"
                  opacity={geometry.unitCircleOpacity}
                />
                {unit &&
                  label(
                    [-1, 0],
                    zh ? "長度 1" : "Length 1",
                    "green",
                    geometry.unitCircleOpacity,
                    -18,
                    -12
                  )}
              </>
            ) : variant === "vec-magnitude" ? (
              <>
                {arrow(
                  [0, 0],
                  geometry.measurementTip,
                  "gold",
                  geometry.lengthOpacity
                )}
                {label(
                  scale(geometry.measurementTip, 0.5),
                  `|v| = ${exactVectorLengthLatex(a).includes("sqrt") ? `√${model.squaredLength}` : exactVectorLengthLatex(a)}`,
                  "gold",
                  geometry.lengthOpacity,
                  -18,
                  -15
                )}
              </>
            ) : (
              <>
                {label(
                  scale(a, 0.5),
                  `|v| = ${exactVectorLengthLatex(a)}`,
                  "gold",
                  geometry.lengthOpacity,
                  -36,
                  -13
                )}
                {arrow(
                  geometry.translatedTail,
                  geometry.translatedTip,
                  "purple",
                  geometry.finalOpacity
                )}
                {label(
                  geometry.translatedTail,
                  "P",
                  "purple",
                  geometry.finalOpacity,
                  -20,
                  -8
                )}
                {label(
                  geometry.translatedTip,
                  "Q",
                  "purple",
                  geometry.finalOpacity
                )}
              </>
            )}
          </>
        )}
        {showZero && (
          <g opacity={addition ? geometry.resultOpacity : 1}>
            <circle
              cx={origin[0]}
              cy={origin[1]}
              r="7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-violet-600 dark:text-violet-300"
            />
            <text
              x="280"
              y="316"
              textAnchor="middle"
              fontSize="16"
              fill="currentColor"
            >
              {zh
                ? "零向量：長度 0，沒有方向"
                : "Zero vector: length 0, no direction"}
            </text>
          </g>
        )}
        {!showZero && (
          <text
            x="280"
            y="316"
            textAnchor="middle"
            fontSize="15"
            fill="currentColor"
            className="text-muted-foreground"
          >
            {addition
              ? model.operation === "subtract"
                ? zh
                  ? "紫：b 終點 → a 終點"
                  : "Purple: tip of b → tip of a"
                : zh
                  ? "藍：a · 橙：b · 綠：a+b"
                  : "Blue: a · Orange: b · Green: a+b"
              : variant === "vec-unit"
                ? zh
                  ? "橙：原分量 · 綠：縮放後的箭頭"
                  : "Orange: original components · Green: scaled arrow"
                : zh
                  ? "橙：分量 · 金：幾何長度"
                  : "Orange: components · Gold: geometric length"}
          </text>
        )}
      </svg>
      {variant === "vec-unit" && !unit && (
        <p
          className="px-3 pb-3 text-center text-sm font-medium text-destructive"
          role="status"
        >
          {zh
            ? "無法正規化：不能除以零。"
            : "Normalization is undefined: division by zero is not allowed."}
        </p>
      )}
    </div>
  );
}
