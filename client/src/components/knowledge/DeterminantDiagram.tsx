import { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

export type Matrix2 = readonly [
  readonly [number, number],
  readonly [number, number],
];
export type Matrix3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];
export type DeterminantMatrix = Matrix2 | Matrix3;
export type Vector3 = readonly [number, number, number];
export type DeterminantPreset = "positive" | "negative" | "zero" | "shear";
export const DETERMINANT_STEP_COUNT = 6;

/** Row-major, bounded integral demos; the default 2D matrix matches the card. */
export const DETERMINANT_PRESETS_2D: Record<DeterminantPreset, Matrix2> = {
  positive: [
    [2, 1],
    [5, 3],
  ],
  negative: [
    [1, 2],
    [3, 5],
  ],
  zero: [
    [2, 1],
    [4, 2],
  ],
  shear: [
    [1, 2],
    [0, 1],
  ],
};
export const DETERMINANT_PRESETS_3D: Record<DeterminantPreset, Matrix3> = {
  positive: [
    [2, 1, 0],
    [0, 1, 1],
    [0, 0, 2],
  ],
  negative: [
    [1, 2, 0],
    [1, 0, 1],
    [0, 0, 2],
  ],
  zero: [
    [2, 1, 3],
    [0, 1, 1],
    [0, 0, 0],
  ],
  shear: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
  ],
};

function assertMatrix(matrix: DeterminantMatrix): void {
  const size = matrix.length;
  if (
    (size !== 2 && size !== 3) ||
    matrix.some(
      row =>
        row.length !== size ||
        row.some(value => !Number.isInteger(value) || Math.abs(value) > 6)
    )
  ) {
    throw new RangeError(
      "The determinant demo requires a 2x2 or 3x3 integer matrix with entries in [-6, 6]."
    );
  }
}

export function determinant2D(matrix: Matrix2): number {
  assertMatrix(matrix);
  return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

export function crossDeterminantColumns(u: Vector3, v: Vector3): Vector3 {
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
}

function columnsOf(matrix: DeterminantMatrix): Vector3[] {
  return Array.from(
    { length: matrix.length },
    (_, column) =>
      [
        matrix[0][column],
        matrix[1][column],
        matrix.length === 3 ? matrix[2][column] : 0,
      ] as Vector3
  );
}

export function determinant3D(matrix: Matrix3): number {
  assertMatrix(matrix);
  const [u, v, w] = columnsOf(matrix);
  const n = crossDeterminantColumns(u, v);
  return n[0] * w[0] + n[1] * w[1] + n[2] * w[2];
}

export function determinantFacts(matrix: DeterminantMatrix) {
  assertMatrix(matrix);
  const determinant =
    matrix.length === 2 ? determinant2D(matrix) : determinant3D(matrix);
  return {
    determinant,
    measure: Math.abs(determinant),
    singular: determinant === 0,
    orientation:
      determinant > 0
        ? ("preserved" as const)
        : determinant < 0
          ? ("reversed" as const)
          : ("collapsed" as const),
  };
}

function clampProgress(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function add(u: Vector3, v: Vector3): Vector3 {
  return [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
}

function verticesOf(columns: readonly Vector3[]): Vector3[] {
  if (columns.length === 2)
    return [[0, 0, 0], columns[0], add(columns[0], columns[1]), columns[1]];
  return Array.from({ length: 8 }, (_, index) =>
    columns.reduce<Vector3>(
      (sum, column, j) => (index & (1 << j) ? add(sum, column) : sum),
      [0, 0, 0]
    )
  );
}

/** The column maps use the player's clock, not an independent animation timer. */
export function determinantGeometry(
  matrix: DeterminantMatrix,
  frame: Pick<KnowledgeFrame, "stage" | "progress">
) {
  assertMatrix(matrix);
  const stage = Number.isFinite(frame.stage)
    ? Math.max(0, Math.min(5, Math.floor(frame.stage)))
    : 0;
  const progress = clampProgress(frame.progress);
  const targetColumns = columnsOf(matrix);
  const sourceColumns = targetColumns.map(
    (_, j) => [j === 0 ? 1 : 0, j === 1 ? 1 : 0, j === 2 ? 1 : 0] as Vector3
  );
  const columns = targetColumns.map((column, j) => {
    const amount = stage > j + 1 ? 1 : stage === j + 1 ? progress : 0;
    return column.map(
      (value, k) => sourceColumns[j][k] + amount * (value - sourceColumns[j][k])
    ) as unknown as Vector3;
  });
  return {
    columns,
    vertices: verticesOf(columns),
    sourceVertices: verticesOf(sourceColumns),
    targetVertices: verticesOf(targetColumns),
    normal:
      matrix.length === 3
        ? crossDeterminantColumns(targetColumns[0], targetColumns[1])
        : ([0, 0, 0] as Vector3),
    normalReveal: stage > 4 ? 1 : stage === 4 ? progress : 0,
    boundaryReveal: stage > 3 ? 1 : stage === 3 ? progress : 0,
    resultReveal: stage === 5 ? progress : 0,
    targetReached:
      stage >= matrix.length + 1 || (stage === matrix.length && progress === 1),
  };
}

/** Equal-axis isometric projection: projected area is NOT spatial volume. */
export function projectDeterminantPoint(
  point: Vector3,
  dimension: 2 | 3
): readonly [number, number] {
  return dimension === 2
    ? [point[0], -point[1]]
    : [
        (Math.sqrt(3) / 2) * (point[0] - point[1]),
        (point[0] + point[1]) / 2 - point[2],
      ];
}

const matrixLatex = (matrix: DeterminantMatrix) =>
  String.raw`\begin{bmatrix}${matrix.map(row => row.join("&")).join(String.raw`\\`)}\end{bmatrix}`;
const vectorLatex = (vector: readonly number[]) =>
  String.raw`\begin{bmatrix}${vector.join(String.raw`\\`)}\end{bmatrix}`;
const factor = (value: number) => (value < 0 ? `(${value})` : String(value));

export function determinantSteps(
  matrix: DeterminantMatrix,
  lang: "zh" | "en"
): DerivationStep[] {
  assertMatrix(matrix);
  const zh = lang === "zh";
  const dimension = matrix.length;
  const [u, v, w] = columnsOf(matrix);
  const facts = determinantFacts(matrix);
  const n = dimension === 3 ? crossDeterminantColumns(u, v) : null;
  const vector = (value: Vector3) => vectorLatex(value.slice(0, dimension));
  const orientation = facts.singular
    ? zh
      ? "塌縮；沒有定向"
      : "collapsed; no orientation"
    : facts.determinant > 0
      ? zh
        ? "保留定向"
        : "orientation preserved"
      : zh
        ? "反轉定向"
        : "orientation reversed";
  const status = facts.singular
    ? zh
      ? "奇異（不可逆）"
      : "singular (not invertible)"
    : zh
      ? "非奇異（可逆）"
      : "nonsingular (invertible)";
  const detCalculation =
    dimension === 2
      ? String.raw`\det(A)=ad-bc=${factor(matrix[0][0])}\cdot${factor(matrix[1][1])}-${factor(matrix[0][1])}\cdot${factor(matrix[1][0])}=${facts.determinant}`
      : String.raw`\begin{aligned}n&=u\times v=${vector(n!)}\\\det(A)&=(u\times v)\cdot w=${n!.map((value, j) => `${factor(value)}\\cdot${factor(w[j])}`).join("+")}=${facts.determinant}\end{aligned}`;
  return [
    {
      description: zh
        ? `數值示範（不是一般證明）：A 的列向量依序是 u、v${dimension === 3 ? "、w" : ""}。虛線是單位${dimension === 3 ? "立方體，體積" : "正方形，面積"} 1。`
        : `Numerical demo, not a general proof: the ordered columns of A are u, v${dimension === 3 ? ", w" : ""}. The dashed unit ${dimension === 3 ? "cube has volume" : "square has area"} 1.`,
      latex: String.raw`A=${matrixLatex(matrix)},\quad \det(I_${dimension})=1`,
    },
    {
      description: zh
        ? "先將第一個單位向量映到第一列 u；中間形狀只表示插值。"
        : "Map the first unit vector to column u. Intermediate shapes represent interpolation only.",
      latex: String.raw`Ae_1=u=${vector(u)}`,
    },
    {
      description: zh
        ? "再將第二個單位向量映到第二列 v，兩列張成底面平行四邊形。"
        : "Map the second unit vector to column v. These ordered columns span the base parallelogram.",
      latex: String.raw`Ae_2=v=${vector(v)},\quad u+v=${vector(add(u, v))}`,
    },
    {
      description:
        dimension === 2
          ? zh
            ? "沿 0 → u → u+v → v → 0 描繪邊界；這個次序決定帶符號面積的正負。"
            : "Trace 0 → u → u+v → v → 0. This order determines the sign of the oriented area."
          : zh
            ? "將第三個單位向量映到 w，底面沿 w 推成平行六面體；共面時體積為零。"
            : "Map the third unit vector to w, extending the base into a parallelepiped. Coplanar columns have zero volume.",
      latex:
        dimension === 2
          ? String.raw`P=\{su+tv:0\le s,t\le1\}`
          : String.raw`Ae_3=w=${vector(w)},\quad P=\{su+tv+rw:0\le s,t,r\le1\}`,
    },
    {
      description:
        dimension === 2
          ? zh
            ? "以列向量的有向面積計算 ad−bc。行列式可以為負，但幾何面積不會為負。"
            : "Compute the columns' signed area as ad−bc. A determinant may be negative; geometric area cannot."
          : zh
            ? "金色法向量 n=u×v 垂直底面。與 w 的點積是有向體積，不是投影圖上的面積。"
            : "The gold normal n=u×v is perpendicular to the base. Its dot product with w is signed volume, not area in the projected drawing.",
      latex: detCalculation,
    },
    {
      description: zh
        ? `最終目標矩陣：${orientation}；${status}。${dimension === 3 ? "體積" : "面積"}取行列式的絕對值。`
        : `Final target matrix: ${orientation}; ${status}. ${dimension === 3 ? "Volume" : "Area"} is the absolute determinant.`,
      latex: String.raw`\det(A)=${facts.determinant},\quad |\det(A)|=${facts.measure},\quad ${dimension === 3 ? "V" : "S"}=${facts.measure},\quad \det(A)${facts.singular ? "=" : "\\ne"}0`,
    },
  ];
}

function orientationText(matrix: DeterminantMatrix, zh: boolean): string {
  const facts = determinantFacts(matrix);
  if (facts.singular)
    return zh ? "塌縮 · 無定向" : "Collapsed · no orientation";
  if (matrix.length === 2)
    return facts.determinant > 0
      ? zh
        ? "逆時針 · 保留定向"
        : "Counterclockwise · preserved"
      : zh
        ? "順時針 · 反轉定向"
        : "Clockwise · reversed";
  return facts.determinant > 0
    ? zh
      ? "右手定向 · 保留"
      : "Right-handed · preserved"
    : zh
      ? "左手定向 · 反轉"
      : "Left-handed · reversed";
}

function DeterminantScene({
  matrix,
  frame,
  lang,
  id,
}: {
  matrix: DeterminantMatrix;
  frame: KnowledgeFrame;
  lang: "zh" | "en";
  id: string;
}) {
  const zh = lang === "zh";
  const dimension = matrix.length as 2 | 3;
  const geometry = determinantGeometry(matrix, frame);
  const facts = determinantFacts(matrix);
  const axisPoints: Vector3[] =
    dimension === 2
      ? [
          [1, 0, 0],
          [0, 1, 0],
        ]
      : [
          [2, 0, 0],
          [0, 2, 0],
          [0, 0, 2],
        ];
  const extent = [
    ...geometry.sourceVertices,
    ...geometry.targetVertices,
    ...axisPoints,
    [0, 0, 0] as Vector3,
    ...(dimension === 3 ? [geometry.normal] : []),
  ].map(point => projectDeterminantPoint(point, dimension));
  const xs = extent.map(point => point[0]);
  const ys = extent.map(point => point[1]);
  const minX = Math.min(...xs) - 0.65;
  const maxX = Math.max(...xs) + 0.65;
  const minY = Math.min(...ys) - 0.65;
  const maxY = Math.max(...ys) + 0.65;
  const scale = Math.min(440 / (maxX - minX), 210 / (maxY - minY));
  const screen = (point: Vector3) => {
    const projected = projectDeterminantPoint(point, dimension);
    return [
      280 + (projected[0] - (minX + maxX) / 2) * scale,
      161 + (projected[1] - (minY + maxY) / 2) * scale,
    ] as const;
  };
  const polygon = (points: readonly Vector3[]) =>
    points.map(point => screen(point).join(",")).join(" ");
  const origin = screen([0, 0, 0]);
  const colors = [
    "var(--color-blue-500)",
    "var(--color-emerald-500)",
    "var(--color-violet-500)",
  ];
  const faces = [
    [0, 1, 3, 2],
    [0, 1, 5, 4],
    [2, 0, 4, 6],
    [1, 3, 7, 5],
    [3, 2, 6, 7],
    [4, 5, 7, 6],
  ];
  const title = zh
    ? `行列式：${dimension} 維單位${dimension === 2 ? "正方形" : "立方體"}的線性變換`
    : `Determinant: linear image of a ${dimension}D unit ${dimension === 2 ? "square" : "cube"}`;
  const description = zh
    ? `藍色 u、綠色 v${dimension === 3 ? "、紫色 w；金色 n 是底面法向量。三維以等軸投影顯示，投影面積不等於體積" : " 按列向量次序構造平行四邊形"}。最終行列式 ${facts.determinant}，${dimension === 2 ? "面積" : "體積"} ${facts.measure}。`
    : `Blue u and green v${dimension === 3 ? ", purple w; gold n is the base normal. This is an isometric projection of 3D coordinates; projected area is not volume" : " construct the parallelogram in column order"}. Final determinant ${facts.determinant}; ${dimension === 2 ? "area" : "volume"} ${facts.measure}.`;
  return (
    <div>
      <svg
        viewBox="0 0 560 340"
        width="100%"
        className="block text-foreground"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        data-testid="determinant-svg"
        data-dimension={dimension}
        data-target-reached={geometry.targetReached}
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>{description}</desc>
        <defs>
          {colors.map((color, j) => (
            <marker
              key={j}
              id={`${id}-arrow-${j}`}
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0 0 L7 3.5 L0 7 Z" fill={color} />
            </marker>
          ))}
          <marker
            id={`${id}-normal`}
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0 0 L7 3.5 L0 7 Z" fill="var(--color-amber-500)" />
          </marker>
        </defs>
        <text x="20" y="29" fontSize="17" fill="currentColor">
          {zh ? "虛線：單位圖形" : "Dashed: unit shape"}
        </text>
        <text x="540" y="29" textAnchor="end" fontSize="17" fill="currentColor">
          {dimension === 3
            ? zh
              ? "3D 等軸投影"
              : "3D isometric view"
            : zh
              ? "2D 等比例座標"
              : "2D equal-axis scale"}
        </text>
        {dimension === 2 && (
          <g stroke="currentColor" opacity="0.1" strokeWidth="1">
            {Array.from(
              { length: Math.ceil(maxX) - Math.floor(minX) + 1 },
              (_, j) => Math.floor(minX) + j
            ).map(x => {
              const a = screen([x, -minY, 0]);
              const b = screen([x, -maxY, 0]);
              return (
                <line key={`x${x}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
              );
            })}
            {Array.from(
              { length: Math.ceil(maxY) - Math.floor(minY) + 1 },
              (_, j) => Math.floor(minY) + j
            ).map(y => {
              const a = screen([minX, -y, 0]);
              const b = screen([maxX, -y, 0]);
              return (
                <line key={`y${y}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
              );
            })}
          </g>
        )}
        <g stroke="currentColor" strokeWidth="1.3" opacity="0.4">
          {axisPoints.map((point, j) => {
            const end = screen(point);
            return (
              <g key={j}>
                <line x1={origin[0]} y1={origin[1]} x2={end[0]} y2={end[1]} />
                <text
                  x={end[0] + 8}
                  y={end[1] - 4}
                  fill="currentColor"
                  stroke="none"
                  fontSize="15"
                >
                  {["x", "y", "z"][j]}
                </text>
              </g>
            );
          })}
        </g>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          opacity="0.55"
        >
          {dimension === 2 ? (
            <polygon points={polygon(geometry.sourceVertices)} />
          ) : (
            faces.map((face, j) => (
              <polygon
                key={j}
                points={polygon(
                  face.map(index => geometry.sourceVertices[index])
                )}
              />
            ))
          )}
        </g>
        <g
          data-testid="determinant-moving-shape"
          fill="var(--color-blue-500)"
          fillOpacity="0.16"
          stroke="var(--color-blue-500)"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          {dimension === 2 ? (
            <polygon points={polygon(geometry.vertices)} />
          ) : (
            faces.map((face, j) => (
              <polygon
                key={j}
                fillOpacity={j === 0 ? 0.22 : 0.08}
                points={polygon(face.map(index => geometry.vertices[index]))}
              />
            ))
          )}
        </g>
        {dimension === 2 && geometry.boundaryReveal > 0 && (
          <polyline
            points={polygon([...geometry.vertices, geometry.vertices[0]])}
            pathLength="1"
            fill="none"
            stroke="var(--color-amber-500)"
            strokeWidth="4"
            strokeDasharray={`${geometry.boundaryReveal} 1`}
            data-testid="determinant-oriented-boundary"
          />
        )}
        {geometry.columns.map((column, j) => {
          const end = screen(column);
          return (
            <g key={j}>
              <line
                x1={origin[0]}
                y1={origin[1]}
                x2={end[0]}
                y2={end[1]}
                stroke={colors[j]}
                strokeWidth="3"
                markerEnd={
                  column.some(value => value !== 0)
                    ? `url(#${id}-arrow-${j})`
                    : undefined
                }
              />
              <text
                x={end[0] + (j === 0 ? -12 : 12)}
                y={end[1] + (j === 1 ? 19 : -11)}
                textAnchor={j === 0 ? "end" : "start"}
                fontSize="20"
                fontWeight="600"
                fill={colors[j]}
              >
                {["u", "v", "w"][j]}
              </text>
            </g>
          );
        })}
        {dimension === 3 && (
          <g
            opacity={geometry.normalReveal}
            data-testid="determinant-base-normal"
          >
            <line
              x1={origin[0]}
              y1={origin[1]}
              x2={
                origin[0] +
                (screen(geometry.normal)[0] - origin[0]) * geometry.normalReveal
              }
              y2={
                origin[1] +
                (screen(geometry.normal)[1] - origin[1]) * geometry.normalReveal
              }
              stroke="var(--color-amber-500)"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              markerEnd={
                geometry.normal.some(value => value !== 0)
                  ? `url(#${id}-normal)`
                  : undefined
              }
            />
            <text
              x={screen(geometry.normal)[0] - 12}
              y={screen(geometry.normal)[1] - 9}
              textAnchor="end"
              fontSize="18"
              fill="var(--color-amber-500)"
            >
              n
            </text>
          </g>
        )}
        <circle cx={origin[0]} cy={origin[1]} r="3" fill="currentColor" />
        <text
          x={origin[0] - 12}
          y={origin[1] + 17}
          textAnchor="end"
          fontSize="15"
          fill="currentColor"
        >
          0
        </text>
        <g opacity={geometry.resultReveal}>
          <text
            x="280"
            y="302"
            textAnchor="middle"
            fontSize="19"
            fontWeight="600"
            fill="currentColor"
          >
            {orientationText(matrix, zh)}
          </text>
        </g>
      </svg>
      <div
        className="border-t border-border px-3 py-2 text-sm"
        data-testid="determinant-result"
      >
        {frame.stage === 5 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-semibold">det(A) = {facts.determinant}</span>
            <span>
              {zh
                ? dimension === 2
                  ? "面積"
                  : "體積"
                : dimension === 2
                  ? "Area"
                  : "Volume"}{" "}
              = |det(A)| = {facts.measure}
            </span>
            <span>
              {facts.singular
                ? zh
                  ? "奇異（不可逆）"
                  : "Singular (not invertible)"
                : zh
                  ? "非奇異（可逆）"
                  : "Nonsingular (invertible)"}
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {zh
              ? "正依步驟構造；精確目標結果於最後一步顯示。"
              : "Building by steps; exact target results appear in the last step."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DeterminantDiagram({
  lang,
  variant = "matrix-det",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [dimension, setDimension] = useState<2 | 3>(2);
  const [preset, setPreset] = useState<DeterminantPreset>("positive");
  const id = `determinant-${useId().replace(/:/g, "")}`;
  const matrix =
    dimension === 2
      ? DETERMINANT_PRESETS_2D[preset]
      : DETERMINANT_PRESETS_3D[preset];
  const labels: Record<DeterminantPreset, string> = zh
    ? {
        positive: "正行列式",
        negative: "負行列式",
        zero: "零 · 奇異",
        shear: "剪切 · 保持大小",
      }
    : {
        positive: "Positive",
        negative: "Negative",
        zero: "Zero · singular",
        shear: "Shear · same size",
      };
  const controls = (
    <>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={zh ? "行列式維度" : "Determinant dimension"}
      >
        {([2, 3] as const).map(value => (
          <button
            key={value}
            type="button"
            aria-pressed={dimension === value}
            onClick={() => setDimension(value)}
            className={`min-h-10 rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring ${dimension === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}
          >
            {value}D{" "}
            {zh
              ? value === 2
                ? "面積"
                : "體積"
              : value === 2
                ? "area"
                : "volume"}
          </button>
        ))}
        <label className="flex min-h-10 flex-wrap items-center gap-2 text-sm">
          <span>{zh ? "數值預設" : "Demo preset"}</span>
          <select
            value={preset}
            onChange={event => {
              const value = event.target.value;
              if (
                value === "positive" ||
                value === "negative" ||
                value === "zero" ||
                value === "shear"
              )
                setPreset(value);
            }}
            className="min-h-10 max-w-full rounded-md border border-border bg-card px-2 text-card-foreground"
            aria-label={zh ? "行列式數值預設" : "Determinant numerical preset"}
          >
            {(Object.keys(labels) as DeterminantPreset[]).map(value => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {zh
          ? "數值示範：切換預設會重設圖解。中途插值即使塌縮，也不代表目標 A 奇異；以最終 det(A) 判斷。"
          : "Numerical demo: changing presets resets the lesson. An interpolated collapse does not make the target A singular; use its final det(A)."}
      </p>
    </>
  );
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${dimension}:${preset}`}
      lang={lang}
      title={
        zh
          ? "行列式：帶符號的面積與體積"
          : "Determinant: signed area and volume"
      }
      steps={determinantSteps(matrix, lang)}
      controls={controls}
      testId="knowledge-determinant"
    >
      {frame => (
        <DeterminantScene matrix={matrix} frame={frame} lang={lang} id={id} />
      )}
    </AnimatedKnowledgeLesson>
  );
}
