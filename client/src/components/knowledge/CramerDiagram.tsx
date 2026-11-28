import { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

export type CramerVector = readonly [number, number];
/** Two matrix rows, not columns. */
export type CramerMatrix = readonly [CramerVector, CramerVector];
export interface CramerFraction {
  numerator: number;
  denominator: number;
}
export interface CramerModel {
  matrix: CramerMatrix;
  b: CramerVector;
  columns: readonly [CramerVector, CramerVector];
  replacements: readonly [CramerMatrix, CramerMatrix];
  determinant: number;
  replacementDeterminants: readonly [number, number];
  solution: readonly [CramerFraction, CramerFraction] | null;
  solutionType: "unique" | "infinite" | "none";
}
export const CRAMER_STEP_COUNT = 5;
export const CRAMER_PRESETS = [
  {
    id: "standard",
    matrix: [
      [2, 1],
      [1, 3],
    ],
    b: [5, 10],
    zh: "標準例子",
    en: "Standard example",
  },
  {
    id: "negative",
    matrix: [
      [1, 2],
      [3, 1],
    ],
    b: [5, 10],
    zh: "負行列式",
    en: "Negative determinant",
  },
  {
    id: "fractional",
    matrix: [
      [2, 1],
      [1, 3],
    ],
    b: [1, 0],
    zh: "分數解",
    en: "Fractional solution",
  },
  {
    id: "singular",
    matrix: [
      [2, 4],
      [1, 2],
    ],
    b: [6, 3],
    zh: "奇異：無限多解",
    en: "Singular: infinitely many",
  },
  {
    id: "inconsistent",
    matrix: [
      [2, 4],
      [1, 2],
    ],
    b: [5, 10],
    zh: "奇異：無解",
    en: "Singular: no solution",
  },
] as const satisfies readonly {
  id: string;
  matrix: CramerMatrix;
  b: CramerVector;
  zh: string;
  en: string;
}[];

export function cramerDeterminant(matrix: CramerMatrix): number {
  return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

export function replaceCramerColumn(
  matrix: CramerMatrix,
  b: CramerVector,
  column: 0 | 1
): CramerMatrix {
  if (column !== 0 && column !== 1)
    throw new RangeError("Column must be 0 or 1.");
  return column === 0
    ? [
        [b[0], matrix[0][1]],
        [b[1], matrix[1][1]],
      ]
    : [
        [matrix[0][0], b[0]],
        [matrix[1][0], b[1]],
      ];
}

export function cramerFraction(
  numerator: number,
  denominator: number
): CramerFraction {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    denominator === 0
  ) {
    throw new RangeError(
      "A fraction requires safe integers and a nonzero denominator."
    );
  }
  let a = Math.abs(numerator);
  let b = Math.abs(denominator);
  while (b !== 0) [a, b] = [b, a % b];
  const sign = denominator < 0 ? -1 : 1;
  return {
    numerator: numerator === 0 ? 0 : (sign * numerator) / a,
    denominator: Math.abs(denominator) / a,
  };
}

export function createCramerModel(
  matrix: CramerMatrix,
  b: CramerVector
): CramerModel {
  if (
    ![...matrix[0], ...matrix[1], ...b].every(
      value => Number.isInteger(value) && Math.abs(value) <= 12
    )
  ) {
    throw new RangeError(
      "This demonstration uses integer entries between -12 and 12."
    );
  }
  const copy: CramerMatrix = [[...matrix[0]], [...matrix[1]]];
  const rhs: CramerVector = [...b];
  const columns: readonly [CramerVector, CramerVector] = [
    [copy[0][0], copy[1][0]],
    [copy[0][1], copy[1][1]],
  ];
  const replacements = [
    replaceCramerColumn(copy, rhs, 0),
    replaceCramerColumn(copy, rhs, 1),
  ] as const;
  const determinant = cramerDeterminant(copy);
  const replacementDeterminants = replacements.map(cramerDeterminant) as [
    number,
    number,
  ];
  const solution =
    determinant === 0
      ? null
      : ([
          cramerFraction(replacementDeterminants[0], determinant),
          cramerFraction(replacementDeterminants[1], determinant),
        ] as const);
  const zeroMatrix = [...copy[0], ...copy[1]].every(value => value === 0);
  const inconsistent =
    replacementDeterminants.some(value => value !== 0) ||
    (zeroMatrix && rhs.some(value => value !== 0));
  return {
    matrix: copy,
    b: rhs,
    columns,
    replacements,
    determinant,
    replacementDeterminants,
    solution,
    solutionType:
      determinant !== 0 ? "unique" : inconsistent ? "none" : "infinite",
  };
}

export function cramerParallelogram(
  first: CramerVector,
  second: CramerVector
): readonly CramerVector[] {
  return [[0, 0], first, [first[0] + second[0], first[1] + second[1]], second];
}

const mix = (a: CramerVector, b: CramerVector, t: number): CramerVector => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const scale = (a: CramerVector, t: number): CramerVector => [
  a[0] * t,
  a[1] * t,
];

/** Endpoint equations are exact; only this geometry is interpolated. No independent clock. */
export function getCramerFrame(
  model: CramerModel,
  frame: Pick<KnowledgeFrame, "stage" | "progress">
) {
  const stage = Number.isFinite(frame.stage)
    ? Math.max(0, Math.min(4, Math.floor(frame.stage)))
    : 0;
  const progress = Number.isFinite(frame.progress)
    ? Math.max(0, Math.min(1, frame.progress))
    : 0;
  const phase = (index: number) =>
    stage < index ? 0 : stage === index ? progress : 1;
  const [first, second] = model.columns;
  const baseColumns = [
    scale(first, phase(0)),
    scale(second, phase(0)),
  ] as const;
  const replacement1 = [mix(first, model.b, phase(2)), second] as const;
  const replacement2 = [first, mix(second, model.b, phase(3))] as const;
  const solutionValues = model.solution?.map(
    value => value.numerator / value.denominator
  );
  const firstTerm = solutionValues
    ? scale(first, solutionValues[0] * phase(4))
    : ([0, 0] as const);
  const sum = solutionValues ? scale(model.b, phase(4)) : ([0, 0] as const);
  return {
    stage,
    progress,
    baseColumns,
    replacement1,
    replacement2,
    fills: [phase(1), phase(2), phase(3)] as const,
    visible: [phase(0), phase(2), phase(3)] as const,
    firstTerm,
    sum,
    reconstruction: solutionValues ? phase(4) : 0,
  };
}

/** One common uniform scale makes areas comparable across all three panels. */
export function cramerViewport(model: CramerModel) {
  const [first, second] = model.columns;
  const points = [
    ...cramerParallelogram(first, second),
    ...cramerParallelogram(model.b, second),
    ...cramerParallelogram(first, model.b),
    model.b,
  ];
  if (model.solution)
    points.push(
      scale(first, model.solution[0].numerator / model.solution[0].denominator)
    );
  const minX = Math.min(0, ...points.map(p => p[0]));
  const maxX = Math.max(0, ...points.map(p => p[0]));
  const minY = Math.min(0, ...points.map(p => p[1]));
  const maxY = Math.max(0, ...points.map(p => p[1]));
  const unit = Math.min(
    220 / Math.max(1, maxX - minX),
    170 / Math.max(1, maxY - minY)
  );
  const origin: CramerVector = [
    150 - ((minX + maxX) * unit) / 2,
    130 + ((minY + maxY) * unit) / 2,
  ];
  return { minX, maxX, minY, maxY, unit, origin };
}

export function cramerFractionLatex(value: CramerFraction): string {
  return value.denominator === 1
    ? `${value.numerator}`
    : `${value.numerator < 0 ? "-" : ""}\\frac{${Math.abs(value.numerator)}}{${value.denominator}}`;
}
const matrixLatex = (a: CramerMatrix) =>
  String.raw`\begin{pmatrix}${a[0][0]}&${a[0][1]}\\${a[1][0]}&${a[1][1]}\end{pmatrix}`;
const vectorLatex = (v: CramerVector) =>
  String.raw`\begin{pmatrix}${v[0]}\\${v[1]}\end{pmatrix}`;
const determinantLatex = (a: CramerMatrix) =>
  String.raw`(${a[0][0]})(${a[1][1]})-(${a[0][1]})(${a[1][0]})`;

export function cramerLessonSteps(
  model: CramerModel,
  lang: "zh" | "en"
): DerivationStep[] {
  const zh = lang === "zh";
  const [d1, d2] = model.replacementDeterminants;
  const singularText =
    model.solutionType === "none"
      ? zh
        ? "此例無解；克拉默法則不能使用。"
        : "This example has no solution; Cramer's rule is not applicable."
      : zh
        ? "此例有無限多解；0/0 不能決定未知數。"
        : "This example has infinitely many solutions; 0/0 cannot determine the unknowns.";
  const final = model.solution
    ? String.raw`\begin{aligned}x_1&=\frac{\det(A_1)}{\det(A)}=\frac{${d1}}{${model.determinant}}=${cramerFractionLatex(model.solution[0])}\\x_2&=\frac{\det(A_2)}{\det(A)}=\frac{${d2}}{${model.determinant}}=${cramerFractionLatex(model.solution[1])}\\${matrixLatex(model.matrix)}\begin{pmatrix}${cramerFractionLatex(model.solution[0])}\\${cramerFractionLatex(model.solution[1])}\end{pmatrix}&=${vectorLatex(model.b)}\end{aligned}`
    : String.raw`\det(A)=0\quad\Longrightarrow\quad\text{Cramer's rule is not applicable}`;
  return [
    {
      description: zh
        ? "數值示範：A 的兩個直行向量為 c₁、c₂。方程組是 x₁c₁+x₂c₂=b。"
        : "Numerical demonstration: the columns of A are c₁ and c₂. The system is x₁c₁ + x₂c₂ = b.",
      latex: String.raw`A=${matrixLatex(model.matrix)},\quad b=${vectorLatex(model.b)},\quad A\begin{pmatrix}x_1\\x_2\end{pmatrix}=b`,
    },
    {
      description: zh
        ? "由 c₁、c₂ 圍成平行四邊形；行列式是有向面積，幾何面積是其絕對值。"
        : "The columns c₁ and c₂ span a parallelogram. Its signed area is the determinant; its geometric area is the absolute value.",
      latex: String.raw`\det(A)=${determinantLatex(model.matrix)}=${model.determinant},\quad |\det(A)|=${Math.abs(model.determinant)}`,
    },
    {
      description: zh
        ? "只將第一個直行 c₁ 替換為 b，保持 c₂ 不變，形成 A₁=[b c₂]。"
        : "Replace only the first column c₁ with b, keeping c₂ fixed: A₁ = [b c₂].",
      latex: String.raw`A_1=${matrixLatex(model.replacements[0])},\quad\det(A_1)=${determinantLatex(model.replacements[0])}=${d1}`,
    },
    {
      description: zh
        ? "從原矩陣 A 出發，只將第二個直行 c₂ 替換為 b，保持 c₁ 不變。"
        : "Start from the original A and replace only the second column c₂ with b, keeping c₁ fixed.",
      latex: String.raw`A_2=${matrixLatex(model.replacements[1])},\quad\det(A_2)=${determinantLatex(model.replacements[1])}=${d2}`,
    },
    {
      description: model.solution
        ? zh
          ? "用有向面積的比值求解；不可把行列式換成絕對值。最後以首尾相接的 x₁c₁、x₂c₂ 驗證 b。"
          : "Divide signed areas, not their absolute values. Finally, the tip-to-tail vectors x₁c₁ and x₂c₂ verify b."
        : singularText,
      latex: final,
    },
  ];
}

const FIRST = "var(--color-blue-600, #2563eb)";
const SECOND = "var(--color-emerald-600, #059669)";
const RHS = "var(--color-amber-600, #d97706)";

export default function CramerDiagram({
  lang,
  variant = "ls-cramer",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [presetId, setPresetId] = useState<string>("standard");
  const preset =
    CRAMER_PRESETS.find(item => item.id === presetId) ?? CRAMER_PRESETS[0];
  const model = createCramerModel(preset.matrix, preset.b);
  const uniqueId = useId().replace(/:/g, "");
  const view = cramerViewport(model);
  const project = (v: CramerVector): CramerVector => [
    view.origin[0] + v[0] * view.unit,
    view.origin[1] - v[1] * view.unit,
  ];
  const coordinate = (v: CramerVector) => project(v).join(",");
  const targetColumns = [
    model.columns,
    [model.b, model.columns[1]],
    [model.columns[0], model.b],
  ] as const;
  const names = ["A = [c₁ c₂]", "A₁ = [b c₂]", "A₂ = [c₁ b]"];
  const determinants = [model.determinant, ...model.replacementDeterminants];
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${preset.id}`}
      lang={lang}
      title={
        zh ? "克拉默法則：有向面積比" : "Cramer's rule: signed area ratios"
      }
      steps={cramerLessonSteps(model, lang)}
      testId="knowledge-cramer"
      controls={
        <div className="space-y-2">
          <label className="flex flex-wrap items-center gap-2 text-xs">
            <span>{zh ? "數值示範" : "Numerical demo"}</span>
            <select
              aria-label={zh ? "克拉默法則例子" : "Cramer example"}
              value={preset.id}
              onChange={event => setPresetId(event.target.value)}
              className="min-h-10 max-w-full rounded-md border border-border bg-card px-2 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {CRAMER_PRESETS.map(item => (
                <option key={item.id} value={item.id}>
                  {zh ? item.zh : item.en}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            {zh
              ? "三圖使用相同座標比例。藍：c₁；綠：c₂；橙：b。虛線表示依直行順序的邊界方向。"
              : "All three plots use the same scale. Blue: c₁; green: c₂; amber: b. Dashed arrows show the ordered boundary direction."}
          </p>
        </div>
      }
    >
      {frame => {
        const state = getCramerFrame(model, frame);
        const panels = [
          state.baseColumns,
          state.replacement1,
          state.replacement2,
        ];
        return (
          <div className="space-y-2 p-2 sm:p-3">
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-3">
              {panels.map((columns, index) => {
                const [first, second] = columns;
                const vertices = cramerParallelogram(first, second);
                const marker1 = `${uniqueId}-c${index}-first`;
                const marker2 = `${uniqueId}-c${index}-second`;
                const markerB = `${uniqueId}-c${index}-rhs`;
                const titleId = `${uniqueId}-c${index}-title`;
                const descId = `${uniqueId}-c${index}-desc`;
                const [firstPoint, secondPoint] = [
                  project(first),
                  project(second),
                ];
                const rhsPoint = project(model.b);
                const active = index === 0 || state.stage >= index + 1;
                const firstLabel =
                  index === 1
                    ? state.stage === 2 && state.progress < 1
                      ? "c₁ → b"
                      : state.stage >= 2
                        ? "b"
                        : "c₁"
                    : "c₁";
                const secondLabel =
                  index === 2
                    ? state.stage === 3 && state.progress < 1
                      ? "c₂ → b"
                      : state.stage >= 3
                        ? "b"
                        : "c₂"
                    : "c₂";
                const firstColor =
                  index === 1 && state.stage >= 2 ? RHS : FIRST;
                const secondColor =
                  index === 2 && state.stage >= 3 ? RHS : SECOND;
                const vector = (
                  start: CramerVector,
                  end: CramerVector,
                  color: string,
                  marker: string,
                  width = 3
                ) => {
                  const a = project(start);
                  const b = project(end);
                  return (
                    <line
                      x1={a[0]}
                      y1={a[1]}
                      x2={b[0]}
                      y2={b[1]}
                      stroke={color}
                      strokeWidth={width}
                      markerEnd={
                        Math.hypot(end[0] - start[0], end[1] - start[1]) > 1e-8
                          ? `url(#${marker})`
                          : undefined
                      }
                    />
                  );
                };
                return (
                  <div
                    key={names[index]}
                    className={`min-w-0 rounded-lg border p-2 ${active ? "border-primary/30 bg-background" : "border-border bg-secondary/20"}`}
                  >
                    <p className="text-center text-sm font-semibold">
                      {names[index]}
                    </p>
                    <p className="mt-1 text-center text-xs text-muted-foreground">
                      {zh ? "目標有向面積" : "Target signed area"}:{" "}
                      {determinants[index]} · {zh ? "面積" : "area"}:{" "}
                      {Math.abs(determinants[index])}
                    </p>
                    <svg
                      viewBox="0 0 300 260"
                      width="100%"
                      className="block h-auto text-foreground"
                      role="img"
                      aria-labelledby={`${titleId} ${descId}`}
                    >
                      <title id={titleId}>
                        {zh
                          ? `${names[index]} 的直行替換平行四邊形`
                          : `Column-replacement parallelogram for ${names[index]}`}
                      </title>
                      <desc id={descId}>
                        {zh
                          ? `目標直行向量為 (${targetColumns[index][0].join(",")}) 和 (${targetColumns[index][1].join(",")})，有向面積 ${determinants[index]}。圖像與步驟同步；中途形狀只是插值。`
                          : `Target column vectors are (${targetColumns[index][0].join(",")}) and (${targetColumns[index][1].join(",")}), with signed area ${determinants[index]}. Geometry follows the lesson clock; intermediate shapes are interpolated.`}
                      </desc>
                      <defs>
                        {[
                          [marker1, firstColor],
                          [marker2, secondColor],
                          [markerB, RHS],
                        ].map(([id, color]) => (
                          <marker
                            key={id}
                            id={id}
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
                      <g stroke="currentColor" opacity="0.07">
                        {Array.from(
                          {
                            length:
                              Math.ceil(view.maxX) - Math.floor(view.minX) + 1,
                          },
                          (_, i) => Math.floor(view.minX) + i
                        ).map(x => (
                          <line
                            key={`x${x}`}
                            x1={project([x, 0])[0]}
                            y1="25"
                            x2={project([x, 0])[0]}
                            y2="225"
                          />
                        ))}
                        {Array.from(
                          {
                            length:
                              Math.ceil(view.maxY) - Math.floor(view.minY) + 1,
                          },
                          (_, i) => Math.floor(view.minY) + i
                        ).map(y => (
                          <line
                            key={`y${y}`}
                            x1="25"
                            y1={project([0, y])[1]}
                            x2="275"
                            y2={project([0, y])[1]}
                          />
                        ))}
                      </g>
                      <g stroke="currentColor" opacity="0.3">
                        <line
                          x1="25"
                          x2="275"
                          y1={view.origin[1]}
                          y2={view.origin[1]}
                        />
                        <line
                          x1={view.origin[0]}
                          x2={view.origin[0]}
                          y1="25"
                          y2="225"
                        />
                      </g>
                      <text
                        x="278"
                        y={view.origin[1] + 14}
                        fontSize="12"
                        fill="currentColor"
                      >
                        u
                      </text>
                      <text
                        x={view.origin[0] + 7}
                        y="22"
                        fontSize="12"
                        fill="currentColor"
                      >
                        v
                      </text>
                      <text
                        x={view.origin[0] - 12}
                        y={view.origin[1] + 14}
                        fontSize="12"
                        fill="currentColor"
                      >
                        0
                      </text>
                      <polygon
                        points={cramerParallelogram(...model.columns)
                          .map(coordinate)
                          .join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray="3 4"
                        opacity="0.18"
                      />
                      <g
                        opacity={
                          index === 0 ? 1 : 0.2 + 0.8 * state.visible[index]
                        }
                      >
                        <polygon
                          data-testid={`cramer-polygon-${index}`}
                          points={vertices.map(coordinate).join(" ")}
                          fill={index === 0 ? FIRST : RHS}
                          fillOpacity={0.16 * state.fills[index]}
                          stroke={index === 0 ? FIRST : RHS}
                          strokeOpacity={state.fills[index]}
                          strokeWidth="1.5"
                        />
                        <polyline
                          points={[first, vertices[2], second]
                            .map(coordinate)
                            .join(" ")}
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="4 3"
                          strokeWidth="1.5"
                          opacity={state.fills[index]}
                          markerEnd={
                            Math.hypot(...first) > 1e-8
                              ? `url(#${marker1})`
                              : undefined
                          }
                        />
                        {vector([0, 0], first, firstColor, marker1)}
                        {vector([0, 0], second, secondColor, marker2)}
                        <text
                          x={firstPoint[0] - 8}
                          y={firstPoint[1] - 11}
                          textAnchor="end"
                          fontSize="15"
                          fontWeight="600"
                          fill={firstColor}
                        >
                          {firstLabel}
                        </text>
                        <text
                          x={secondPoint[0] + 9}
                          y={secondPoint[1] + 15}
                          fontSize="15"
                          fontWeight="600"
                          fill={secondColor}
                        >
                          {secondLabel}
                        </text>
                      </g>
                      {index === 0 && (
                        <g opacity={state.visible[0]}>
                          <circle
                            cx={rhsPoint[0]}
                            cy={rhsPoint[1]}
                            r="4"
                            fill={RHS}
                          />
                          <text
                            x={rhsPoint[0] + 8}
                            y={rhsPoint[1] - 8}
                            fontSize="15"
                            fontWeight="600"
                            fill={RHS}
                          >
                            b
                          </text>
                          <g opacity={state.reconstruction}>
                            {vector([0, 0], state.firstTerm, FIRST, marker1, 4)}
                            {vector(
                              state.firstTerm,
                              state.sum,
                              SECOND,
                              marker2,
                              4
                            )}
                            <circle
                              cx={project(state.sum)[0]}
                              cy={project(state.sum)[1]}
                              r="6"
                              fill="none"
                              stroke={RHS}
                              strokeWidth="2"
                            />
                          </g>
                        </g>
                      )}
                      <text
                        x="150"
                        y="249"
                        textAnchor="middle"
                        fontSize="13"
                        fill="currentColor"
                      >
                        {index === 0 && state.stage === 4
                          ? model.solution
                            ? "x₁c₁ + x₂c₂ = b"
                            : zh
                              ? "det(A) = 0：不可除以零"
                              : "det(A) = 0: no division"
                          : index === 0
                            ? "c₁ + c₂"
                            : index === 1
                              ? "c₁ → b"
                              : "c₂ → b"}
                      </text>
                    </svg>
                    <p className="text-center text-xs text-muted-foreground">
                      {zh ? "目標方向：" : "Target orientation: "}
                      {determinants[index] === 0
                        ? zh
                          ? "退化（面積零）"
                          : "collapsed (zero area)"
                        : determinants[index] > 0
                          ? zh
                            ? "逆時針（正）"
                            : "counterclockwise (+)"
                          : zh
                            ? "順時針（負）"
                            : "clockwise (−)"}
                    </p>
                  </div>
                );
              })}
            </div>
            <p
              className={`rounded-md p-2 text-xs leading-relaxed ${model.solution ? "bg-secondary/30 text-muted-foreground" : "border border-destructive/30 bg-destructive/5 text-foreground"}`}
            >
              {model.solution
                ? zh
                  ? "det(A) ≠ 0，克拉默法則可用。橙色頂點是 b；最後一步的粗藍、綠箭頭是 x₁c₁、x₂c₂。此圖是具體數值示範，不是一般證明。"
                  : "det(A) ≠ 0, so Cramer's rule applies. The amber point is b; the final thick blue and green arrows are x₁c₁ and x₂c₂. This is a numerical demonstration, not a general proof."
                : zh
                  ? "此預設的 A 是奇異矩陣：det(A)=0。不可計算行列式比值；行列式為零本身不能判斷有無解。"
                  : "The preset matrix A is singular: det(A) = 0. Determinant ratios are undefined; a zero determinant alone does not distinguish no solution from infinitely many."}
            </p>
          </div>
        );
      }}
    </AnimatedKnowledgeLesson>
  );
}
