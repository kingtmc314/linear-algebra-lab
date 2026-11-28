import { useId, useMemo, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

export type InverseMatrix2 = readonly [
  readonly [number, number],
  readonly [number, number],
];
export type InversePoint2 = readonly [number, number];
export const INVERSE_STEP_COUNT = 5;
export const INVERSE_PRESETS = [
  {
    id: "rational",
    zh: "分數逆矩陣",
    en: "Rational inverse",
    matrix: [
      [2, 1],
      [1, 2],
    ],
  },
  {
    id: "negative",
    zh: "負行列式",
    en: "Negative determinant",
    matrix: [
      [1, 2],
      [2, 1],
    ],
  },
  {
    id: "singular",
    zh: "奇異：壓成直線",
    en: "Singular: collapse to a line",
    matrix: [
      [1, 1],
      [2, 2],
    ],
  },
  {
    id: "zero",
    zh: "零矩陣：壓成一點",
    en: "Zero: collapse to a point",
    matrix: [
      [0, 0],
      [0, 0],
    ],
  },
] as const satisfies readonly {
  id: string;
  zh: string;
  en: string;
  matrix: InverseMatrix2;
}[];

const IDENTITY: InverseMatrix2 = [
  [1, 0],
  [0, 1],
];
const SQUARE: readonly InversePoint2[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

export function inverseDeterminant(matrix: InverseMatrix2): number {
  return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

export function inverseTransform(
  matrix: InverseMatrix2,
  point: InversePoint2
): InversePoint2 {
  return [
    matrix[0][0] * point[0] + matrix[0][1] * point[1],
    matrix[1][0] * point[0] + matrix[1][1] * point[1],
  ];
}

/** Return null, never a fictitious inverse, for singular or non-finite input. */
export function invertMatrix2(matrix: InverseMatrix2): InverseMatrix2 | null {
  if (!matrix.flat().every(Number.isFinite)) return null;
  const determinant = inverseDeterminant(matrix);
  if (determinant === 0 || !Number.isFinite(determinant)) return null;
  const inverse: InverseMatrix2 = [
    [matrix[1][1] / determinant, -matrix[0][1] / determinant],
    [-matrix[1][0] / determinant, matrix[0][0] / determinant],
  ];
  return inverse.flat().every(Number.isFinite) ? inverse : null;
}

/** Exact reduced fraction formatting for the bounded integer examples. */
export function inverseFractionLatex(
  numerator: number,
  denominator = 1
): string {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new RangeError("Exact fractions require safe integers.");
  }
  if (denominator === 0)
    throw new RangeError("A fraction cannot divide by zero.");
  if (numerator === 0) return "0";
  const sign = numerator * Math.sign(denominator) < 0 ? "-" : "";
  let a = Math.abs(numerator);
  let b = Math.abs(denominator);
  while (b !== 0) [a, b] = [b, a % b];
  const top = Math.abs(numerator) / a;
  const bottom = Math.abs(denominator) / a;
  return bottom === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${bottom}}`;
}

function matrixLatex(matrix: InverseMatrix2, denominator = 1): string {
  const entry = (value: number) => inverseFractionLatex(value, denominator);
  return String.raw`\begin{bmatrix}${entry(matrix[0][0])}&${entry(matrix[0][1])}\\${entry(matrix[1][0])}&${entry(matrix[1][1])}\end{bmatrix}`;
}

function pointLatex(point: InversePoint2): string {
  return String.raw`\begin{bmatrix}${point[0]}\\${point[1]}\end{bmatrix}`;
}

export interface InverseModel {
  matrix: InverseMatrix2;
  determinant: number;
  inverse: InverseMatrix2 | null;
  source: readonly InversePoint2[];
  transformed: readonly InversePoint2[];
  /** Distinct integer points P, Q with AP=AQ, only for singular input. */
  collision: readonly [InversePoint2, InversePoint2] | null;
}

export function buildInverseModel(matrix: InverseMatrix2): InverseModel {
  if (
    !matrix
      .flat()
      .every(value => Number.isInteger(value) && Math.abs(value) <= 8)
  ) {
    throw new RangeError("The demo requires integer entries from -8 to 8.");
  }
  const determinant = inverseDeterminant(matrix);
  const inverse = invertMatrix2(matrix);
  let collision: InverseModel["collision"] = null;
  if (!inverse) {
    const row = matrix[0].some(value => value !== 0) ? matrix[0] : matrix[1];
    const kernel: InversePoint2 = row.every(value => value === 0)
      ? [1, -1]
      : [row[1], -row[0]];
    collision = [
      [Math.max(kernel[0], 0), Math.max(kernel[1], 0)],
      [Math.max(-kernel[0], 0), Math.max(-kernel[1], 0)],
    ];
  }
  return {
    matrix,
    determinant,
    inverse,
    source: SQUARE,
    transformed: SQUARE.map(point => inverseTransform(matrix, point)),
    collision,
  };
}

function clampProgress(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function blendMatrix(
  from: InverseMatrix2,
  to: InverseMatrix2,
  t: number
): InverseMatrix2 {
  return [
    [
      from[0][0] + (to[0][0] - from[0][0]) * t,
      from[0][1] + (to[0][1] - from[0][1]) * t,
    ],
    [
      from[1][0] + (to[1][0] - from[1][0]) * t,
      from[1][1] + (to[1][1] - from[1][1]) * t,
    ],
  ];
}

/** Geometry uses the shared clock; interpolation is not a claim about exact matrices. */
export function inverseDiagramFrame(
  model: InverseModel,
  frame: Pick<KnowledgeFrame, "stage" | "progress">
) {
  const stage = Number.isFinite(frame.stage)
    ? Math.max(0, Math.min(INVERSE_STEP_COUNT - 1, Math.trunc(frame.stage)))
    : 0;
  const p = clampProgress(frame.progress);
  const t = p * p * (3 - 2 * p);
  const forwardProgress = stage === 0 ? 0 : stage === 1 ? t : 1;
  const returnProgress = model.inverse
    ? stage < 3
      ? 0
      : stage === 3
        ? t
        : 1
    : 0;
  const forward = blendMatrix(IDENTITY, model.matrix, forwardProgress);
  const returnMap = model.inverse
    ? blendMatrix(IDENTITY, model.inverse, returnProgress)
    : IDENTITY;
  const mapPoint = (point: InversePoint2): InversePoint2 => {
    if (returnProgress === 1) return point;
    return inverseTransform(returnMap, inverseTransform(forward, point));
  };
  return {
    stage,
    progress: p,
    vertices: model.source.map(mapPoint),
    columns: [mapPoint([1, 0]), mapPoint([0, 1])] as const,
    collisionPoints: model.collision?.map(mapPoint) ?? [],
    forwardProgress,
    returnProgress,
    correspondenceReveal: stage < 2 ? 0 : stage === 2 ? p : 1,
    resultReveal: stage === 4 ? p : 0,
    sourceReveal: stage === 0 ? p : 1,
    returnAvailable: model.inverse !== null,
  };
}

export function inverseLessonSteps(
  model: InverseModel,
  lang: "zh" | "en"
): DerivationStep[] {
  const zh = lang === "zh";
  const a = matrixLatex(model.matrix);
  const image = matrixLatex([
    [model.transformed[1][0], model.transformed[3][0]],
    [model.transformed[1][1], model.transformed[3][1]],
  ]);
  const source = String.raw`S=\{(s,t):0\le s,t\le1\},\quad e_1=\begin{bmatrix}1\\0\end{bmatrix},\quad e_2=\begin{bmatrix}0\\1\end{bmatrix}`;
  const start: DerivationStep[] = [
    {
      description: zh
        ? "數值示範：從單位正方形 S 開始，藍色虛線保留原圖。此例並非任意矩陣的一般證明。"
        : "Numerical demo: start with the unit square S. The dashed blue outline keeps the original visible; this is not a general proof for arbitrary matrices.",
      latex: String.raw`A=${a},\quad ${source}`,
    },
    {
      description: zh
        ? "先施加 A：兩條單位邊變為 A 的兩個欄向量，整個正方形一起移動。公式列出這一步的精確終點。"
        : "Apply A first: the unit edges become its two columns and the whole square deforms together. The equation gives this step's exact endpoint.",
      latex: String.raw`[Ae_1\;Ae_2]=${image},\quad \det(A)=${model.determinant}`,
    },
  ];
  if (model.inverse) {
    const adjugate: InverseMatrix2 = [
      [model.matrix[1][1], -model.matrix[0][1]],
      [-model.matrix[1][0], model.matrix[0][0]],
    ];
    const inverse = matrixLatex(adjugate, model.determinant);
    return [
      ...start,
      {
        description: zh
          ? "目標矩陣的行列式不為零，所以逆矩陣存在。綠色路徑連接兩個變換後的邊端點與它們的原位置。"
          : "The target matrix has nonzero determinant, so its inverse exists. Green paths connect the transformed edge endpoints to their original positions.",
        latex: String.raw`\det(A)=${model.determinant}\ne0,\quad A^{-1}=${inverse}`,
      },
      {
        description: zh
          ? "再施加 A⁻¹：橙色平行四邊形連續返回原來的單位正方形，並轉為綠色。中間幀只是兩端點之間的插值。"
          : "Next apply A⁻¹: the orange parallelogram returns to the original unit square and turns green. Intermediate frames only interpolate between endpoints.",
        latex: String.raw`A^{-1}(Ae_1)=e_1,\quad A^{-1}(Ae_2)=e_2,\quad A^{-1}(AS)=S`,
      },
      {
        description: zh
          ? "精確終點：每個點都返回原位，兩種乘法次序都得到單位矩陣。正、負行列式的可逆矩陣都可以還原。"
          : "Exact endpoint: every point is restored, and either multiplication order gives the identity. Invertible matrices with either determinant sign can be undone.",
        latex: String.raw`A^{-1}A=${inverse}${a}=I_2,\quad AA^{-1}=I_2,\quad I_2=\begin{bmatrix}1&0\\0&1\end{bmatrix}`,
      },
    ];
  }
  const [p, q] = model.collision!;
  const collisionImage = inverseTransform(model.matrix, p);
  return [
    ...start,
    {
      description: zh
        ? "行列式等於零，面積壓成零。紅色叉號表示不能施加不存在的逆矩陣；不會播放虛假的返回動畫。"
        : "The determinant is zero, so the area collapses to zero. The red cross blocks a nonexistent inverse; no false return animation is played.",
      latex: String.raw`\det(A)=0,\quad A^{-1}\text{ does not exist}`,
    },
    {
      description: zh
        ? "原圖中不同的 P、Q 被 A 映到同一點。紅色連線揭示遺失的資訊：無法從同一輸出分辨兩個輸入。"
        : "Distinct original points P and Q have the same image. Red paths reveal the lost information: one output cannot distinguish these two inputs.",
      latex: String.raw`P=${pointLatex(p)},\quad Q=${pointLatex(q)},\quad P\ne Q,\quad AP=AQ=${pointLatex(collisionImage)}`,
    },
    {
      description: zh
        ? "奇異終點維持壓縮後的圖形。若有逆矩陣，同一輸出必須同時還原為兩個不同輸入，矛盾。因此 A 不可逆。"
        : "The singular endpoint stays collapsed. An inverse would have to restore the same output to two different inputs, a contradiction. A is not invertible.",
      latex: String.raw`AP=AQ,\quad P\ne Q\quad\Longrightarrow\quad \nexists\,A^{-1}`,
    },
  ];
}

export default function InverseDiagram({
  lang,
  variant = "matrix-inverse",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [presetId, setPresetId] = useState<string>("rational");
  const preset =
    INVERSE_PRESETS.find(item => item.id === presetId) ?? INVERSE_PRESETS[0];
  const model = useMemo(() => buildInverseModel(preset.matrix), [preset]);
  const steps = useMemo(() => inverseLessonSteps(model, lang), [model, lang]);
  const uniqueId = useId().replace(/:/g, "");
  const titleId = `inverse-title-${uniqueId}`;
  const descId = `inverse-desc-${uniqueId}`;
  const arrowId = `inverse-arrow-${uniqueId}`;
  const extent = Math.max(2, ...model.transformed.flat().map(Math.abs));
  const scale = 190 / extent;
  const origin: InversePoint2 = [150, 272];
  const project = ([x, y]: InversePoint2): InversePoint2 => [
    origin[0] + scale * x,
    origin[1] - scale * y,
  ];
  const polygon = (points: readonly InversePoint2[]) =>
    points.map(point => project(point).join(",")).join(" ");
  const controls = (
    <>
      <label className="flex flex-wrap items-center gap-2 text-sm text-foreground">
        <span>{zh ? "示範矩陣" : "Demo matrix"}</span>
        <select
          aria-label={zh ? "逆矩陣示範預設" : "Inverse matrix demo preset"}
          value={presetId}
          onChange={event => setPresetId(event.target.value)}
          className="min-h-11 max-w-full rounded-lg border border-border bg-card px-3 text-sm text-card-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {INVERSE_PRESETS.map(item => (
            <option key={item.id} value={item.id}>
              {zh ? item.zh : item.en}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {zh
          ? "獨立數值示範（預設 det A = 3），與卡片例子的數值不同。圖中行列式始終指目標 A；插值途中即使壓縮，也不表示目標 A 不可逆。"
          : "Separate numerical demo (default det A = 3), with different values from the card. The displayed determinant always belongs to target A; an interpolation may collapse without making target A singular."}
      </p>
    </>
  );
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${preset.id}`}
      lang={lang}
      title={zh ? "逆矩陣：變換，再還原" : "Inverse: transform, then restore"}
      steps={steps}
      controls={controls}
      testId="knowledge-inverse"
    >
      {frame => {
        const scene = inverseDiagramFrame(model, frame);
        const returning = model.inverse !== null && scene.stage >= 3;
        const currentColor = !model.inverse
          ? "var(--destructive)"
          : returning
            ? "var(--color-emerald-600)"
            : "var(--color-amber-600)";
        const operation =
          scene.stage === 0
            ? zh
              ? "起點 S"
              : "Start S"
            : scene.stage < 3
              ? "S → AS"
              : model.inverse
                ? "AS → A⁻¹(AS) = S"
                : zh
                  ? "AS：不能還原"
                  : "AS: no inverse";
        const collide = model.inverse === null && scene.forwardProgress === 1;
        const [p1, p2] = scene.columns.map(project);
        const axes = [-1, 0, 1, 2, 3, 4].filter(value => value <= extent);
        return (
          <>
            <svg
              viewBox="0 0 560 340"
              width="100%"
              className="block h-auto text-foreground"
              role="img"
              aria-labelledby={`${titleId} ${descId}`}
              data-testid="inverse-svg"
            >
              <title id={titleId}>
                {zh
                  ? "矩陣及逆矩陣作用於單位正方形"
                  : "A matrix and its inverse acting on the unit square"}
              </title>
              <desc id={descId}>
                {zh
                  ? `目標行列式 ${model.determinant}。藍色虛線是原圖，實線是當前圖形。${model.inverse ? "先施加 A，再施加逆矩陣，返回正方形。" : "不同頂點合併，逆矩陣不存在。"}`
                  : `Target determinant ${model.determinant}. Blue dashes show the original and solid edges show the current shape. ${model.inverse ? "Apply A, then its inverse, to restore the square." : "Distinct vertices merge; no inverse exists."}`}
              </desc>
              <defs>
                <marker
                  id={arrowId}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                </marker>
              </defs>
              <text
                x="24"
                y="30"
                fontSize="20"
                fontWeight="600"
                fill="currentColor"
              >
                {operation}
              </text>
              <text
                x="536"
                y="30"
                textAnchor="end"
                fontSize="18"
                fill="currentColor"
              >
                det(A) = {model.determinant}
              </text>
              <g stroke="var(--border)" strokeWidth="1">
                {axes.map(value => {
                  const [x, y] = project([value, value]);
                  return (
                    <g key={value}>
                      <line x1={x} y1="66" x2={x} y2="310" />
                      <line x1="75" y1={y} x2="472" y2={y} />
                    </g>
                  );
                })}
              </g>
              <g
                stroke="var(--muted-foreground)"
                strokeWidth="1.5"
                markerEnd={`url(#${arrowId})`}
              >
                <line x1="75" y1={origin[1]} x2="478" y2={origin[1]} />
                <line x1={origin[0]} y1="311" x2={origin[0]} y2="60" />
              </g>
              <g fill="var(--muted-foreground)" fontSize="17">
                <text x="484" y={origin[1] + 6}>
                  x
                </text>
                <text x={origin[0] - 16} y="60">
                  y
                </text>
                <text x={origin[0] - 20} y={origin[1] + 22}>
                  0
                </text>
                {axes
                  .filter(value => value > 0)
                  .map(value => (
                    <g key={value}>
                      <text
                        x={project([value, 0])[0]}
                        y={origin[1] + 24}
                        textAnchor="middle"
                      >
                        {value}
                      </text>
                      <text
                        x={origin[0] - 14}
                        y={project([0, value])[1] + 6}
                        textAnchor="end"
                      >
                        {value}
                      </text>
                    </g>
                  ))}
              </g>
              <polygon
                points={polygon(model.source)}
                fill="var(--primary)"
                fillOpacity="0.06"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeDasharray="6 5"
              />
              {model.inverse &&
                scene.stage >= 2 &&
                model.transformed
                  .filter((_, index) => index === 1 || index === 3)
                  .map((point, index) => {
                    const start = project(point);
                    const end = project(model.source[index === 0 ? 1 : 3]);
                    const x =
                      start[0] +
                      (end[0] - start[0]) * scene.correspondenceReveal;
                    const y =
                      start[1] +
                      (end[1] - start[1]) * scene.correspondenceReveal;
                    return (
                      <line
                        key={index}
                        x1={start[0]}
                        y1={start[1]}
                        x2={x}
                        y2={y}
                        stroke="var(--color-emerald-600)"
                        strokeWidth="2"
                        strokeDasharray="5 5"
                        opacity="0.7"
                        markerEnd={`url(#${arrowId})`}
                      />
                    );
                  })}
              <polygon
                data-testid="inverse-current-shape"
                points={polygon(scene.vertices)}
                fill={currentColor}
                fillOpacity="0.16"
                stroke={currentColor}
                strokeWidth="3.5"
                opacity={scene.sourceReveal}
              />
              <g
                stroke={currentColor}
                strokeWidth="3"
                markerEnd={`url(#${arrowId})`}
                opacity={scene.sourceReveal}
              >
                <line x1={origin[0]} y1={origin[1]} x2={p1[0]} y2={p1[1]} />
                <line x1={origin[0]} y1={origin[1]} x2={p2[0]} y2={p2[1]} />
              </g>
              {!collide && (
                <g
                  fill={currentColor}
                  fontSize="18"
                  fontWeight="600"
                  opacity={scene.sourceReveal}
                >
                  <circle cx={p1[0]} cy={p1[1]} r="5" />
                  <circle cx={p2[0]} cy={p2[1]} r="5" />
                  <text x={p1[0] + 10} y={p1[1] + 15}>
                    {scene.forwardProgress === 0 || scene.returnProgress === 1
                      ? "e₁"
                      : scene.forwardProgress === 1 &&
                          scene.returnProgress === 0
                        ? "Ae₁"
                        : "v₁(t)"}
                  </text>
                  <text x={p2[0] - 10} y={p2[1] - 12} textAnchor="end">
                    {scene.forwardProgress === 0 || scene.returnProgress === 1
                      ? "e₂"
                      : scene.forwardProgress === 1 &&
                          scene.returnProgress === 0
                        ? "Ae₂"
                        : "v₂(t)"}
                  </text>
                </g>
              )}
              {!model.inverse && scene.stage >= 2 && (
                <g
                  stroke="var(--destructive)"
                  strokeWidth="3"
                  opacity={scene.correspondenceReveal}
                >
                  <line x1="411" y1="80" x2="443" y2="112" />
                  <line x1="443" y1="80" x2="411" y2="112" />
                  <text
                    x="427"
                    y="138"
                    fill="var(--destructive)"
                    stroke="none"
                    fontSize="19"
                    textAnchor="middle"
                  >
                    A⁻¹ ∄
                  </text>
                </g>
              )}
              {!model.inverse &&
                scene.stage >= 3 &&
                model.collision?.map((point, index) => {
                  const original = project(point);
                  const image = project(inverseTransform(model.matrix, point));
                  const reveal = scene.stage === 3 ? scene.progress : 1;
                  return (
                    <g key={index}>
                      <line
                        x1={original[0]}
                        y1={original[1]}
                        x2={original[0] + (image[0] - original[0]) * reveal}
                        y2={original[1] + (image[1] - original[1]) * reveal}
                        stroke="var(--destructive)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx={original[0]}
                        cy={original[1]}
                        r="6"
                        fill="var(--card)"
                        stroke="var(--primary)"
                        strokeWidth="2"
                      />
                      <text
                        x={original[0] + 12}
                        y={original[1] + 20}
                        fill="var(--primary)"
                        fontSize="18"
                      >
                        {index === 0 ? "P" : "Q"}
                      </text>
                    </g>
                  );
                })}
              {collide && (
                <g fill="var(--destructive)">
                  <circle cx={p1[0]} cy={p1[1]} r="7" />
                  <text x={p1[0] + 12} y={p1[1] - 14} fontSize="18">
                    Ae₁ = Ae₂
                  </text>
                </g>
              )}
              {scene.stage === 4 && (
                <g opacity={scene.resultReveal}>
                  <rect
                    x="350"
                    y="184"
                    width="185"
                    height="42"
                    rx="10"
                    fill="var(--secondary)"
                  />
                  <text
                    x="442"
                    y="211"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="600"
                    fill={currentColor}
                  >
                    {model.inverse ? "A⁻¹A = I₂" : "det(A) = 0"}
                  </text>
                </g>
              )}
            </svg>
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs text-foreground">
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 border-t-2 border-dashed border-primary" />
                {zh ? "原圖 S" : "Original S"}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block w-5 border-t-[3px]"
                  style={{ borderColor: currentColor }}
                />
                {model.inverse
                  ? returning
                    ? zh
                      ? "還原中的圖形"
                      : "Returning shape"
                    : zh
                      ? "施加 A 的圖形"
                      : "Shape under A"
                  : zh
                    ? "壓縮後的圖形"
                    : "Collapsed shape"}
              </span>
            </div>
          </>
        );
      }}
    </AnimatedKnowledgeLesson>
  );
}
