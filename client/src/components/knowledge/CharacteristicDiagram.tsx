import { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

export type CharacteristicPoint = readonly [number, number];
export const CHARACTERISTIC_MATRIX = [
  [4, 1],
  [2, 3],
] as const;
export const CHARACTERISTIC_ROOTS = [2, 5] as const;
export const CHARACTERISTIC_PRESETS = [0, 3, 2, 5] as const;
export const CHARACTERISTIC_STEP_COUNT = 6;

/** The characteristic polynomial of the fixed numerical demo, not a root solver. */
export function characteristicValue(lambda: number): number {
  if (!Number.isFinite(lambda)) throw new RangeError("Lambda must be finite.");
  const value = (lambda - 2) * (lambda - 5);
  if (!Number.isFinite(value))
    throw new RangeError("Polynomial value overflow.");
  return value === 0 ? 0 : value;
}

export function characteristicModel(lambda: number) {
  const determinant = characteristicValue(lambda);
  const matrix = [
    [4 - lambda, 1],
    [2, 3 - lambda],
  ] as const;
  const columns: readonly [CharacteristicPoint, CharacteristicPoint] = [
    [matrix[0][0], matrix[1][0]],
    [matrix[0][1], matrix[1][1]],
  ];
  const kernel: CharacteristicPoint | null =
    lambda === 2 ? [1, -2] : lambda === 5 ? [1, 1] : null;
  return {
    lambda,
    matrix,
    columns,
    determinant,
    area: Math.abs(determinant),
    singular: determinant === 0,
    rank: determinant === 0 ? 1 : 2,
    orientation:
      determinant === 0 ? "zero" : determinant > 0 ? "positive" : "negative",
    kernel,
  } as const;
}

function presetValue(value: number): number {
  return CHARACTERISTIC_PRESETS.some(preset => preset === value) ? value : 5;
}

/** Guard incoming frames and keep polynomial and columns on the same lambda. */
export function characteristicFrame(
  frame: Pick<KnowledgeFrame, "stage" | "progress">,
  selectedLambda = 5
) {
  const stage = Number.isFinite(frame.stage)
    ? Math.max(0, Math.min(5, Math.floor(frame.stage)))
    : 0;
  const progress = Number.isFinite(frame.progress)
    ? Math.max(0, Math.min(1, frame.progress))
    : 0;
  const selected = presetValue(selectedLambda);
  const starts = [0, 0, 1, 6, 2, 5];
  const targets = [0, 1, 6, 2, 5, selected];
  const target = targets[stage];
  const lambda = starts[stage] + (target - starts[stage]) * progress;
  const curveEnd =
    stage === 0 ? 0 : stage === 1 ? progress : stage === 2 ? lambda : 6;
  return {
    ...characteristicModel(lambda),
    stage,
    progress,
    target,
    curveEnd,
    columnOpacity: stage === 0 ? progress : 1,
    firstRootOpacity: stage < 3 ? 0 : stage === 3 ? progress : 1,
    secondRootOpacity: stage < 4 ? 0 : stage === 4 ? progress : 1,
    summaryOpacity: stage === 5 ? progress : 0,
    settled: progress === 1,
  };
}

export function characteristicCurvePoints(endLambda = 6, samples = 80) {
  const end = Number.isFinite(endLambda)
    ? Math.max(0, Math.min(6, endLambda))
    : 0;
  const count = Number.isFinite(samples)
    ? Math.max(1, Math.min(200, Math.floor(samples)))
    : 80;
  return Array.from({ length: count + 1 }, (_, index) => {
    const lambda = (end * index) / count;
    return [lambda, characteristicValue(lambda)] as CharacteristicPoint;
  });
}

export function characteristicSteps(
  lang: "zh" | "en",
  selectedLambda = 5
): DerivationStep[] {
  const zh = lang === "zh";
  const selected = presetValue(selectedLambda);
  const model = characteristicModel(selected);
  return [
    {
      description: zh
        ? "數值示範：固定矩陣 A，λ 是待尋找的特徵值。先看 λ=0 時的兩個列向量。"
        : "Numerical demo: fix A and let lambda be the candidate eigenvalue. Begin with its two columns at lambda = 0.",
      latex: String.raw`A=\begin{bmatrix}4&1\\2&3\end{bmatrix},\quad p(\lambda)=\det(A-\lambda I),\quad p(0)=10`,
    },
    {
      description: zh
        ? "減去 λI 只改變對角元素。列向量隨 λ 改變；先移至 λ=1，面積為 4。"
        : "Subtracting lambda I changes only the diagonal entries. Move to lambda = 1: the column parallelogram has area 4.",
      latex: String.raw`A-\lambda I=\begin{bmatrix}4-\lambda&1\\2&3-\lambda\end{bmatrix},\quad p(1)=3\cdot2-1\cdot2=4`,
    },
    {
      description: zh
        ? "展開行列式並描繪多項式曲線。左圖的點與右圖的列向量使用同一個 λ；行列式可為負，面積為其絕對值。"
        : "Expand the determinant and trace its polynomial. The curve marker and columns use the same lambda. Determinants may be negative; area is their absolute value.",
      latex: String.raw`p(\lambda)=(4-\lambda)(3-\lambda)-2=\lambda^2-7\lambda+10=(\lambda-2)(\lambda-5)`,
    },
    {
      description: zh
        ? "移至第一個根 λ=2：兩列共線，平行四邊形塌成線段，A−2I 奇異且不可逆。"
        : "Move to the first root, lambda = 2. Both columns lie on one line, the parallelogram collapses, and A - 2I is singular.",
      latex: String.raw`A-2I=\begin{bmatrix}2&1\\2&1\end{bmatrix},\quad p(2)=0,\quad (A-2I)\begin{bmatrix}1\\-2\end{bmatrix}=\mathbf0`,
    },
    {
      description: zh
        ? "移至第二個根 λ=5：两列反向共線，面積仍為零。非零向量 (1,1) 被 A−5I 映至零向量。"
        : "Move to the second root, lambda = 5. The columns are opposite and collinear, so area is zero. A - 5I sends the nonzero vector (1,1) to zero.",
      latex: String.raw`A-5I=\begin{bmatrix}-1&1\\2&-2\end{bmatrix},\quad p(5)=0,\quad (A-5I)\begin{bmatrix}1\\1\end{bmatrix}=\mathbf0`,
    },
    {
      description: zh
        ? `本例恰有兩個實根 2、5。所選 λ=${selected} 的 det=${model.determinant}，面積=${model.area}；A−λI${model.singular ? "奇異（不可逆）" : "可逆"}。一般矩陣的特徵值未必全為實數，這張實曲線不是一般求根證明。`
        : `This example has exactly two real roots, 2 and 5. At the selected lambda = ${selected}, det = ${model.determinant} and area = ${model.area}; A - lambda I is ${model.singular ? "singular (not invertible)" : "invertible"}. General matrices need not have only real eigenvalues; this real plot is not a general root-finding proof.`,
      latex: String.raw`p(\lambda)=0\iff\lambda\in\{2,5\},\quad A-${selected}I=\begin{bmatrix}${4 - selected}&1\\2&${3 - selected}\end{bmatrix},\quad p(${selected})=${model.determinant},\quad |p(${selected})|=${model.area}`,
    },
  ];
}

const BLUE = "var(--color-blue-500, #3b82f6)";
const AMBER = "var(--color-amber-500, #f59e0b)";
const ROOT = "var(--color-emerald-500, #10b981)";
const NEGATIVE = "var(--color-rose-500, #f43f5e)";

function plotPoint([lambda, value]: CharacteristicPoint): CharacteristicPoint {
  return [34 + lambda * 34, 190 - value * 12];
}

function columnPoint([x, y]: CharacteristicPoint): CharacteristicPoint {
  return [132 + x * 19, 160 - y * 19];
}

export default function CharacteristicDiagram({
  lang,
  variant = "matrix-char-poly",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [selected, setSelected] = useState<number>(5);
  const id = useId().replace(/:/g, "");
  const labels = zh
    ? ["正值 λ=0", "負值 λ=3", "奇異 λ=2", "奇異 λ=5"]
    : ["Positive: λ=0", "Negative: λ=3", "Singular: λ=2", "Singular: λ=5"];
  const controls = (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        {zh ? "最後一步的檢查值（固定 A）" : "Final-step check (A stays fixed)"}
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={zh ? "λ 檢查值" : "Lambda check presets"}
      >
        {CHARACTERISTIC_PRESETS.map((value, index) => (
          <button
            key={value}
            type="button"
            aria-pressed={selected === value}
            onClick={() => setSelected(value)}
            className={`min-h-10 rounded-lg border px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}
          >
            {labels[index]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${selected}`}
      lang={lang}
      title={
        zh
          ? "特徵多項式：根與列向量塌縮"
          : "Characteristic polynomial: roots and column collapse"
      }
      steps={characteristicSteps(lang, selected)}
      controls={controls}
      testId="knowledge-characteristic"
    >
      {frame => {
        const visual = characteristicFrame(frame, selected);
        const curve = characteristicCurvePoints(visual.curveEnd)
          .map(point => plotPoint(point).join(","))
          .join(" ");
        const [markerX, markerY] = plotPoint([
          visual.lambda,
          visual.determinant,
        ]);
        const [first, second] = visual.columns;
        const origin = columnPoint([0, 0]);
        const firstEnd = columnPoint(first);
        const secondEnd = columnPoint(second);
        const sumEnd = columnPoint([
          first[0] + second[0],
          first[1] + second[1],
        ]);
        const polygon = [origin, firstEnd, sumEnd, secondEnd]
          .map(point => point.join(","))
          .join(" ");
        const statusColor = visual.singular
          ? ROOT
          : visual.determinant < 0
            ? NEGATIVE
            : BLUE;
        const lambdaLabel = visual.settled
          ? `λ = ${visual.target}`
          : `λ → ${visual.target}`;
        const status = visual.settled
          ? zh
            ? `det = ${visual.determinant}；面積 = ${visual.area}`
            : `det = ${visual.determinant}; area = ${visual.area}`
          : zh
            ? "中間畫面：連續示意"
            : "Intermediate frame: illustrative";
        return (
          <div className="p-2 sm:p-3" data-variant={variant}>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-lg bg-secondary/30 p-2 text-foreground">
                <p className="text-sm font-medium">
                  {zh ? "行列式曲線" : "Determinant curve"}
                </p>
                <svg
                  width="100%"
                  viewBox="0 0 280 270"
                  role="img"
                  aria-labelledby={`${id}-curve-title ${id}-curve-desc`}
                  className="block h-auto w-full text-foreground"
                >
                  <title id={`${id}-curve-title`}>
                    {zh
                      ? "p(λ)=(λ−2)(λ−5) 的實數曲線"
                      : "Real plot of p(lambda) = (lambda - 2)(lambda - 5)"}
                  </title>
                  <desc id={`${id}-curve-desc`}>
                    {zh
                      ? "移動點標示與右圖相同的 λ。根 2、5 依步驟顯示，對應零行列式。"
                      : "The moving point uses the same lambda as the column diagram. Roots 2 and 5 are revealed with the zero determinant steps."}
                  </desc>
                  <defs>
                    <marker
                      id={`${id}-axis`}
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {[0, 5, 10].map(value => (
                    <g key={value} opacity="0.45">
                      <line
                        x1="34"
                        x2="238"
                        y1={190 - value * 12}
                        y2={190 - value * 12}
                        stroke="currentColor"
                        strokeWidth="0.6"
                        strokeDasharray="3 5"
                      />
                      <text
                        x="27"
                        y={195 - value * 12}
                        fontSize="13"
                        textAnchor="end"
                        fill="currentColor"
                      >
                        {value}
                      </text>
                    </g>
                  ))}
                  <line
                    x1="34"
                    y1="190"
                    x2="254"
                    y2="190"
                    stroke="currentColor"
                    strokeWidth="1"
                    markerEnd={`url(#${id}-axis)`}
                  />
                  <line
                    x1="34"
                    y1="233"
                    x2="34"
                    y2="45"
                    stroke="currentColor"
                    strokeWidth="1"
                    markerEnd={`url(#${id}-axis)`}
                  />
                  <text x="13" y="32" fontSize="14" fill="currentColor">
                    p(λ)
                  </text>
                  <text x="260" y="194" fontSize="15" fill="currentColor">
                    λ
                  </text>
                  {[0, 1, 2, 3, 4, 5, 6].map(value => (
                    <g key={value}>
                      <line
                        x1={34 + value * 34}
                        x2={34 + value * 34}
                        y1="190"
                        y2="195"
                        stroke="currentColor"
                      />
                      <text
                        x={34 + value * 34}
                        y="210"
                        fontSize="13"
                        fill="currentColor"
                        textAnchor="middle"
                      >
                        {value}
                      </text>
                    </g>
                  ))}
                  <polyline
                    points={curve}
                    fill="none"
                    stroke={BLUE}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    opacity={visual.stage === 0 ? 0 : 1}
                    data-testid="characteristic-curve"
                  />
                  {[
                    { lambda: 2, opacity: visual.firstRootOpacity },
                    { lambda: 5, opacity: visual.secondRootOpacity },
                  ].map(root => (
                    <g
                      key={root.lambda}
                      opacity={root.opacity}
                      data-testid={`characteristic-root-${root.lambda}`}
                    >
                      <circle
                        cx={34 + root.lambda * 34}
                        cy="190"
                        r="8"
                        fill="var(--card)"
                        stroke={ROOT}
                        strokeWidth="3"
                      />
                      <text
                        x={34 + root.lambda * 34}
                        y="229"
                        textAnchor="middle"
                        fontSize="13"
                        fill="currentColor"
                      >{`p(${root.lambda})=0`}</text>
                    </g>
                  ))}
                  <line
                    x1={markerX}
                    y1="190"
                    x2={markerX}
                    y2={markerY}
                    stroke={statusColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity={visual.stage === 0 ? 0 : 0.75}
                  />
                  <circle
                    cx={markerX}
                    cy={markerY}
                    r="5"
                    fill={statusColor}
                    opacity={visual.columnOpacity}
                    data-testid="characteristic-curve-marker"
                  />
                  <text
                    x="140"
                    y="257"
                    textAnchor="middle"
                    fontSize="14"
                    fill="currentColor"
                  >
                    {lambdaLabel}
                  </text>
                </svg>
              </div>
              <div className="min-w-0 rounded-lg bg-secondary/30 p-2 text-foreground">
                <p className="text-sm font-medium">
                  {zh ? "A−λI 的列向量" : "Columns of A - λI"}
                </p>
                <svg
                  width="100%"
                  viewBox="0 0 280 270"
                  role="img"
                  aria-labelledby={`${id}-columns-title ${id}-columns-desc`}
                  className="block h-auto w-full text-foreground"
                >
                  <title id={`${id}-columns-title`}>
                    {zh
                      ? "列向量平行四邊形與行列式"
                      : "Column parallelogram and determinant"}
                  </title>
                  <desc id={`${id}-columns-desc`}>
                    {zh
                      ? "第一列 (4−λ,2) 為藍色；第二列 (1,3−λ) 為琥珀色。面積等於行列式絕對值，根處共線塌縮。"
                      : "Column one (4 - lambda, 2) is blue; column two (1, 3 - lambda) is amber. Area is the absolute determinant; the columns become collinear at each root."}
                  </desc>
                  <defs>
                    <marker
                      id={`${id}-c1`}
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={BLUE} />
                    </marker>
                    <marker
                      id={`${id}-c2`}
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={AMBER} />
                    </marker>
                  </defs>
                  {[-4, -2, 0, 2, 4].map(value => (
                    <g key={value} opacity="0.18">
                      <line
                        x1={132 + value * 19}
                        y1="52"
                        x2={132 + value * 19}
                        y2="232"
                        stroke="currentColor"
                        strokeWidth="0.6"
                      />
                      <line
                        x1="44"
                        y1={160 - value * 19}
                        x2="238"
                        y2={160 - value * 19}
                        stroke="currentColor"
                        strokeWidth="0.6"
                      />
                    </g>
                  ))}
                  <line
                    x1="40"
                    y1="160"
                    x2="245"
                    y2="160"
                    stroke="currentColor"
                    strokeWidth="0.9"
                    opacity="0.5"
                  />
                  <line
                    x1="132"
                    y1="235"
                    x2="132"
                    y2="44"
                    stroke="currentColor"
                    strokeWidth="0.9"
                    opacity="0.5"
                  />
                  <text x="246" y="165" fontSize="13" fill="currentColor">
                    x
                  </text>
                  <text x="129" y="35" fontSize="13" fill="currentColor">
                    y
                  </text>
                  <text x="119" y="177" fontSize="12" fill="currentColor">
                    0
                  </text>
                  <text
                    x="169"
                    y="176"
                    fontSize="12"
                    fill="currentColor"
                    opacity="0.7"
                  >
                    2
                  </text>
                  <text
                    x="114"
                    y="126"
                    fontSize="12"
                    fill="currentColor"
                    opacity="0.7"
                  >
                    2
                  </text>
                  <g opacity={visual.columnOpacity}>
                    <polygon
                      points={polygon}
                      fill={statusColor}
                      fillOpacity="0.18"
                      stroke={statusColor}
                      strokeWidth="1.6"
                      data-testid="characteristic-parallelogram"
                    />
                    <line
                      x1={firstEnd[0]}
                      y1={firstEnd[1]}
                      x2={sumEnd[0]}
                      y2={sumEnd[1]}
                      stroke={AMBER}
                      strokeWidth="1.7"
                      strokeDasharray="4 3"
                    />
                    <line
                      x1={secondEnd[0]}
                      y1={secondEnd[1]}
                      x2={sumEnd[0]}
                      y2={sumEnd[1]}
                      stroke={BLUE}
                      strokeWidth="1.7"
                      strokeDasharray="4 3"
                    />
                    <line
                      x1={origin[0]}
                      y1={origin[1]}
                      x2={firstEnd[0]}
                      y2={firstEnd[1]}
                      stroke={BLUE}
                      strokeWidth="3"
                      markerEnd={`url(#${id}-c1)`}
                      data-testid="characteristic-column-one"
                    />
                    <line
                      x1={origin[0]}
                      y1={origin[1]}
                      x2={secondEnd[0]}
                      y2={secondEnd[1]}
                      stroke={AMBER}
                      strokeWidth="3"
                      markerEnd={`url(#${id}-c2)`}
                      data-testid="characteristic-column-two"
                    />
                    <text
                      x={firstEnd[0] + 8}
                      y={firstEnd[1] - 8}
                      fontSize="14"
                      fill="currentColor"
                    >
                      c₁
                    </text>
                    <text
                      x={secondEnd[0] + 8}
                      y={secondEnd[1] + 17}
                      fontSize="14"
                      fill="currentColor"
                    >
                      c₂
                    </text>
                    <circle
                      cx={origin[0]}
                      cy={origin[1]}
                      r="3"
                      fill="currentColor"
                    />
                  </g>
                  <text
                    x="140"
                    y="257"
                    fontSize="13"
                    textAnchor="middle"
                    fill="currentColor"
                  >
                    {status}
                  </text>
                </svg>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span style={{ color: BLUE }}>━ </span>
                {zh ? "第一列 c₁=(4−λ,2)" : "Column c₁=(4−λ,2)"}
              </span>
              <span>
                <span style={{ color: AMBER }}>━ </span>
                {zh ? "第二列 c₂=(1,3−λ)" : "Column c₂=(1,3−λ)"}
              </span>
            </div>
            {visual.stage === 5 && (
              <div
                className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"
                style={{ opacity: visual.summaryOpacity }}
              >
                <div className="rounded-md border border-border bg-card p-2 text-card-foreground">
                  {zh
                    ? "根 2：c₁=2c₂，rank(A−2I)=1"
                    : "Root 2: c₁=2c₂; rank(A−2I)=1"}
                </div>
                <div className="rounded-md border border-border bg-card p-2 text-card-foreground">
                  {zh
                    ? "根 5：c₁=−c₂，rank(A−5I)=1"
                    : "Root 5: c₁=−c₂; rank(A−5I)=1"}
                </div>
              </div>
            )}
          </div>
        );
      }}
    </AnimatedKnowledgeLesson>
  );
}
