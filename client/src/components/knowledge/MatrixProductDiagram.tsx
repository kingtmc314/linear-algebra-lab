import { useId, useMemo, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
} from "./AnimatedKnowledgeLesson";

export type ProductMatrix = readonly (readonly number[])[];
export type MatrixProductPresetId = "card" | "signed" | "zero" | "rectangular";

export const MATRIX_PRODUCT_PRESETS: Record<
  MatrixProductPresetId,
  { a: ProductMatrix; b: ProductMatrix; zh: string; en: string }
> = {
  card: {
    a: [
      [1, 2],
      [3, 4],
    ],
    b: [
      [5, 6],
      [7, 8],
    ],
    zh: "原卡例題",
    en: "Card example",
  },
  signed: {
    a: [
      [1, 2],
      [0, 3],
    ],
    b: [
      [2, 1],
      [-1, 0],
    ],
    zh: "正負與抵消",
    en: "Signed / cancellation",
  },
  zero: {
    a: [
      [0, 0],
      [0, 0],
    ],
    b: [
      [5, 6],
      [7, 8],
    ],
    zh: "零矩陣",
    en: "Zero matrix",
  },
  rectangular: {
    a: [
      [1, 0, 2],
      [-1, 3, 1],
    ],
    b: [
      [2, 1],
      [1, 0],
      [0, -1],
    ],
    zh: "長方矩陣",
    en: "Rectangular matrices",
  },
};

/** Empty, ragged and non-finite inputs are not mathematical matrices here. */
export function matrixProductDimensions(
  matrix: ProductMatrix
): [number, number] {
  if (!matrix.length || !matrix[0]?.length) {
    throw new RangeError("A matrix must have at least one row and column.");
  }
  const columns = matrix[0].length;
  if (
    matrix.some(
      row => row.length !== columns || row.some(x => !Number.isFinite(x))
    )
  ) {
    throw new RangeError("Matrix entries must be finite and rows rectangular.");
  }
  return [matrix.length, columns];
}

export function matrixProductTerms(
  a: ProductMatrix,
  b: ProductMatrix,
  row: number,
  column: number
): number[] {
  const [m, n] = matrixProductDimensions(a);
  const [q, p] = matrixProductDimensions(b);
  if (n !== q) throw new RangeError("Inner matrix dimensions must match.");
  if (
    !Number.isInteger(row) ||
    row < 0 ||
    row >= m ||
    !Number.isInteger(column) ||
    column < 0 ||
    column >= p
  ) {
    throw new RangeError("Output cell index is out of range.");
  }
  const terms = a[row].map((value, k) => value * b[k][column]);
  if (terms.some(value => !Number.isFinite(value))) {
    throw new RangeError("Matrix product exceeds finite numeric range.");
  }
  return terms;
}

export function multiplyProductMatrices(
  a: ProductMatrix,
  b: ProductMatrix
): number[][] {
  const [m, n] = matrixProductDimensions(a);
  const [q, p] = matrixProductDimensions(b);
  if (n !== q) throw new RangeError("Inner matrix dimensions must match.");
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      const sum = matrixProductTerms(a, b, i, j).reduce(
        (total, value) => total + value,
        0
      );
      if (!Number.isFinite(sum))
        throw new RangeError("Matrix sum exceeds finite numeric range.");
      return Object.is(sum, -0) ? 0 : sum;
    })
  );
}

export function productMatricesEqual(
  a: ProductMatrix,
  b: ProductMatrix
): boolean {
  const [m, n] = matrixProductDimensions(a);
  const [q, p] = matrixProductDimensions(b);
  return (
    m === q &&
    n === p &&
    a.every((row, i) => row.every((value, j) => value === b[i][j]))
  );
}

export function productMatrixLatex(matrix: ProductMatrix): string {
  matrixProductDimensions(matrix);
  return String.raw`\begin{bmatrix}${matrix.map(row => row.join("&")).join(String.raw`\\`)}\end{bmatrix}`;
}

const signedFactor = (value: number) =>
  value < 0 ? `(${value})` : String(value);

/** Each partial sum is labelled s, never falsely presented as the finished c. */
export function matrixProductSteps(
  a: ProductMatrix,
  b: ProductMatrix,
  lang: "zh" | "en"
): DerivationStep[] {
  const [m, n] = matrixProductDimensions(a);
  const [q, p] = matrixProductDimensions(b);
  const ab = multiplyProductMatrices(a, b);
  // This engine's presets deliberately allow both orders; rectangular orders can have different sizes.
  const ba = multiplyProductMatrices(b, a);
  const zh = lang === "zh";
  const steps: DerivationStep[] = [
    {
      description: zh
        ? `數值示範：A 為 ${m}×${n}，B 為 ${q}×${p}。內側維度 ${n} 相同，所以 AB 為 ${m}×${p}；每格要配對 A 的一行與 B 的一列。`
        : `Numerical demo: A is ${m}×${n} and B is ${q}×${p}. The matching inner dimension ${n} makes AB a ${m}×${p} matrix. Each output cell pairs one row of A with one column of B.`,
      latex: String.raw`A=${productMatrixLatex(a)},\quad B=${productMatrixLatex(b)},\qquad (${m}\times\underbrace{${n}}_{n})\,(\underbrace{${q}}_{n}\times${p})\longrightarrow ${m}\times${p}`,
    },
  ];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      const terms = matrixProductTerms(a, b, i, j);
      for (let k = 0; k < n; k++) {
        const done = k === n - 1;
        const partial = terms
          .slice(0, k + 1)
          .reduce((sum, value) => sum + value, 0);
        const expanded = a[i]
          .slice(0, k + 1)
          .map(
            (value, t) => `${signedFactor(value)}\\cdot${signedFactor(b[t][j])}`
          )
          .join("+");
        const numeric = terms
          .slice(0, k + 1)
          .map(signedFactor)
          .join("+");
        steps.push({
          description: zh
            ? `第 ${i + 1} 行 × 第 ${j + 1} 列：配對第 ${k + 1} 項，${a[i][k]} × ${b[k][j]} = ${terms[k]}。${done ? `累加完成，c${i + 1}${j + 1} = ${partial}。` : `部分和為 ${partial}，仍未完成此格。`}`
            : `Row ${i + 1} × column ${j + 1}: pair term ${k + 1}, ${a[i][k]} × ${b[k][j]} = ${terms[k]}. ${done ? `The sum is complete: c${i + 1}${j + 1} = ${partial}.` : `The partial sum is ${partial}; this output cell is not finished yet.`}`,
          latex: `${done ? `c_{${i + 1}${j + 1}}` : `s_{${i + 1}${j + 1}}^{(${k + 1})}`}=${expanded}=${numeric}=${partial}`,
        });
      }
    }
  }
  steps.push({
    description: zh
      ? "所有輸出格都完成：每一格是行與列的點積，並非對應位置相乘。"
      : "Every output cell is complete: each is a row–column dot product, not an entrywise product.",
    latex: `AB=${productMatrixLatex(a)}${productMatrixLatex(b)}=${productMatrixLatex(ab)}`,
  });
  const equal = productMatricesEqual(ab, ba);
  steps.push({
    description: zh
      ? equal
        ? "交換因子，再算 BA。這個零矩陣示範恰好 AB = BA；不滿足交換律並不是說所有矩陣對都不相等。"
        : m !== q || p !== n
          ? `交換因子：BA 為 ${q}×${n}，而 AB 為 ${m}×${p}，連輸出維度都不同。這是不能任意交換乘法次序的數值示範。`
          : "交換因子，再算 BA。圖中框出的格與 AB 不同，所以本例 AB ≠ BA；這是反例，不是宣稱所有矩陣對都不相等。"
      : equal
        ? "Swap the factors and calculate BA. This zero-matrix example happens to have AB = BA. Noncommutativity does not mean every pair gives unequal products."
        : m !== q || p !== n
          ? `Swapping gives BA of size ${q}×${n}, whereas AB is ${m}×${p}: even their output dimensions differ. This numerical example shows why factor order matters.`
          : "Swap the factors and calculate BA. Outlined cells differ from AB, so AB ≠ BA in this example. This is a counterexample, not a claim that every pair has unequal products.",
    latex: String.raw`AB=${productMatrixLatex(ab)}\;${equal ? "=" : String.raw`\ne`}\;BA=${productMatrixLatex(ba)}`,
  });
  return steps;
}

const clamp = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** A single deterministic geometry clock; partial accumulators always remain exact integers. */
export function matrixProductFrame(
  a: ProductMatrix,
  b: ProductMatrix,
  stage: number,
  progress: number
) {
  const ab = multiplyProductMatrices(a, b);
  const [m, n] = matrixProductDimensions(a);
  const [, p] = matrixProductDimensions(b);
  const termCount = m * p * n;
  const last = termCount + 2;
  const step = Number.isFinite(stage)
    ? Math.max(0, Math.min(last, Math.floor(stage)))
    : 0;
  const t = clamp(progress);
  const phase =
    step === 0
      ? "dimensions"
      : step <= termCount
        ? "dot"
        : step === termCount + 1
          ? "product"
          : "swap";
  const index = Math.max(0, Math.min(termCount - 1, step - 1));
  const cell = Math.floor(index / n);
  const row = Math.floor(cell / p);
  const column = cell % p;
  const term = index % n;
  const completedTerms =
    phase === "dot"
      ? term + (t >= 0.9 ? 1 : 0)
      : phase === "dimensions"
        ? 0
        : n;
  const accumulated = matrixProductTerms(a, b, row, column)
    .slice(0, completedTerms)
    .reduce((sum, value) => sum + value, 0);
  const previousCell = Math.max(0, cell - (term === 0 ? 1 : 0));
  const move = clamp(t * 3);
  const swap = phase === "swap" ? t : 0;
  return {
    phase,
    stage: step,
    progress: t,
    row,
    column,
    term,
    cell,
    completedTerms,
    accumulated,
    highlightedRow:
      Math.floor(previousCell / p) +
      (row - Math.floor(previousCell / p)) * move,
    highlightedColumn:
      (previousCell % p) + (column - (previousCell % p)) * move,
    pairTravel: clamp(t / 0.55),
    resultTravel: clamp((t - 0.55) / 0.35),
    fillTravel: term === n - 1 ? (t === 1 ? 1 : clamp((t - 0.9) / 0.1)) : 0,
    cellReveal: term === n - 1 ? (t === 1 ? 1 : clamp((t - 0.95) / 0.05)) : 0,
    dimensionReveal: phase === "dimensions" ? t : 1,
    leftCenter: 100 + 180 * swap,
    rightCenter: 280 - 180 * swap,
    leftOffsetY: -20 * Math.sin(Math.PI * swap),
    rightOffsetY: 20 * Math.sin(Math.PI * swap),
    swap,
    result: ab,
  };
}

export type ProductPoint = readonly [number, number];
export const PRODUCT_UNIT_SQUARE: readonly ProductPoint[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/** Column-vector convention: the columns are the images of e1 and e2. */
export function transformProductPolygon(
  matrix: ProductMatrix,
  points: readonly ProductPoint[] = PRODUCT_UNIT_SQUARE
): ProductPoint[] {
  const [rows, columns] = matrixProductDimensions(matrix);
  if (rows !== 2 || columns !== 2)
    throw new RangeError("A planar polygon requires a 2×2 matrix.");
  return points.map(([x, y]) => {
    const point: ProductPoint = [
      matrix[0][0] * x + matrix[0][1] * y,
      matrix[1][0] * x + matrix[1][1] * y,
    ];
    if (![x, y, ...point].every(Number.isFinite))
      throw new RangeError("Polygon coordinates must remain finite.");
    return point.map(value => (Object.is(value, -0) ? 0 : value)) as [
      number,
      number,
    ];
  });
}

/** This is ((1−t)I+tM) applied to the source, not a fake exact intermediate M. */
export function interpolateProductPolygon(
  from: readonly ProductPoint[],
  to: readonly ProductPoint[],
  progress: number
): ProductPoint[] {
  if (from.length !== to.length || !from.length)
    throw new RangeError("Polygons need matching nonempty vertex lists.");
  const t = clamp(progress);
  return from.map(([x, y], i) => {
    const [u, v] = to[i];
    const point: ProductPoint =
      t === 0
        ? [x, y]
        : t === 1
          ? [u, v]
          : [(1 - t) * x + t * u, (1 - t) * y + t * v];
    if (![x, y, u, v, ...point].every(Number.isFinite))
      throw new RangeError("Polygon interpolation must remain finite.");
    return point;
  });
}

/** Two actual maps share the existing accumulation clock; no extra timer. */
export function matrixProductGeometryFrame(
  a: ProductMatrix,
  b: ProductMatrix,
  stage: number,
  progress: number
) {
  const frame = matrixProductFrame(a, b, stage, progress);
  if (
    [a, b].some(matrix =>
      matrixProductDimensions(matrix).some(size => size !== 2)
    )
  )
    return null;
  const swapped = frame.phase === "swap";
  const firstMatrix = swapped ? a : b;
  const secondMatrix = swapped ? b : a;
  const firstEndpoint = transformProductPolygon(firstMatrix);
  const endpoint = transformProductPolygon(secondMatrix, firstEndpoint);
  const ab = transformProductPolygon(multiplyProductMatrices(a, b));
  const ba = transformProductPolygon(multiplyProductMatrices(b, a));
  const firstProgress = swapped
    ? clamp(frame.progress * 2)
    : frame.phase === "dimensions"
      ? frame.progress
      : 1;
  const termCount = a.length * b[0].length * a[0].length;
  const secondProgress = swapped
    ? clamp(frame.progress * 2 - 1)
    : frame.phase === "dimensions"
      ? 0
      : frame.phase === "dot"
        ? clamp((frame.stage - 1 + frame.progress) / termCount)
        : 1;
  const first = interpolateProductPolygon(
    PRODUCT_UNIT_SQUARE,
    firstEndpoint,
    firstProgress
  );
  const second =
    firstProgress < 1
      ? first
      : interpolateProductPolygon(firstEndpoint, endpoint, secondProgress);
  return {
    swapped,
    order: swapped ? "BA" : "AB",
    firstName: swapped ? "A" : "B",
    secondName: swapped ? "B" : "A",
    firstProgress,
    secondProgress,
    first,
    second,
    firstEndpoint,
    endpoint,
    ab,
    ba,
  };
}

/** Fit real coordinates with ONE scale for both axes, including degenerate images. */
export function fitProductGeometry(
  points: readonly ProductPoint[],
  width = 320,
  height = 230,
  padding = 32
) {
  if (
    !points.length ||
    !points.flat().every(Number.isFinite) ||
    ![width, height, padding].every(Number.isFinite) ||
    padding < 0 ||
    width <= 2 * padding ||
    height <= 2 * padding
  )
    throw new RangeError(
      "A geometry viewport requires finite coordinates and usable dimensions."
    );
  const minX = Math.min(0, ...points.map(point => point[0]));
  const maxX = Math.max(1, ...points.map(point => point[0]));
  const minY = Math.min(0, ...points.map(point => point[1]));
  const maxY = Math.max(1, ...points.map(point => point[1]));
  const scale = Math.min(
    (width - 2 * padding) / (maxX - minX),
    (height - 2 * padding) / (maxY - minY)
  );
  const originX = width / 2 - ((minX + maxX) / 2) * scale;
  const originY = height / 2 + ((minY + maxY) / 2) * scale;
  if (![scale, originX, originY].every(Number.isFinite) || scale <= 0)
    throw new RangeError("Geometry exceeds finite viewport range.");
  return { scale, originX, originY, minX, maxX, minY, maxY };
}

const CELL = 36;
const Y = 76;
const ROW_COLOR = "var(--primary)";
const COLUMN_COLOR = "var(--chart-3)";
const RESULT_COLOR = "var(--foreground)";

function ProductGeometryPlot({
  points,
  source,
  endpoint,
  comparison,
  title,
  desc,
  id,
}: {
  points: readonly ProductPoint[];
  source: readonly ProductPoint[];
  endpoint: readonly ProductPoint[];
  comparison?: readonly ProductPoint[];
  title: string;
  desc: string;
  id: string;
}) {
  // The entire linear interpolation is inside the endpoint hull: keep the camera fixed.
  const fit = fitProductGeometry([
    ...PRODUCT_UNIT_SQUARE,
    ...source,
    ...endpoint,
    ...(comparison ?? []),
  ]);
  const screen = ([x, y]: ProductPoint): ProductPoint => [
    fit.originX + x * fit.scale,
    fit.originY - y * fit.scale,
  ];
  const polygon = (vertices: readonly ProductPoint[]) =>
    vertices.map(point => screen(point).join(",")).join(" ");
  const origin = screen([0, 0]);
  const collapsed = points.every(([x, y]) => x === 0 && y === 0);
  const mesh = [0.25, 0.5, 0.75].flatMap(
    t =>
      [
        [
          [points[1][0] * t, points[1][1] * t],
          [points[3][0] + points[1][0] * t, points[3][1] + points[1][1] * t],
        ],
        [
          [points[3][0] * t, points[3][1] * t],
          [points[1][0] + points[3][0] * t, points[1][1] + points[3][1] * t],
        ],
      ] as ProductPoint[][]
  );
  return (
    <svg
      viewBox="0 0 320 230"
      width="100%"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      className="block h-auto text-foreground"
      data-testid="matrix-product-geometry-plot"
      data-scale={fit.scale}
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{desc}</desc>
      <defs>
        {[ROW_COLOR, COLUMN_COLOR].map((color, i) => (
          <marker
            key={i}
            id={`${id}-basis-${i}`}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>
      <rect
        x={1}
        y={1}
        width={318}
        height={228}
        rx={10}
        fill="var(--secondary)"
      />
      <g stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.6}>
        <line x1={16} y1={origin[1]} x2={304} y2={origin[1]} />
        <line x1={origin[0]} y1={16} x2={origin[0]} y2={214} />
        <line
          x1={origin[0] + fit.scale}
          y1={origin[1] - 3}
          x2={origin[0] + fit.scale}
          y2={origin[1] + 3}
        />
        <line
          x1={origin[0] - 3}
          y1={origin[1] - fit.scale}
          x2={origin[0] + 3}
          y2={origin[1] - fit.scale}
        />
      </g>
      <text x={305} y={origin[1] - 7} textAnchor="end" fontSize={13}>
        x
      </text>
      <text x={origin[0] + 8} y={17} fontSize={13}>
        y
      </text>
      <text x={origin[0] - 6} y={origin[1] + 15} textAnchor="end" fontSize={12}>
        0
      </text>
      <polygon
        points={polygon(source)}
        fill="var(--muted-foreground)"
        fillOpacity={0.04}
        stroke="var(--muted-foreground)"
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <polygon
        points={polygon(endpoint)}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={1}
        strokeDasharray="2 4"
        opacity={0.4}
      />
      {comparison && (
        <polygon
          data-testid="matrix-product-ab-reference"
          points={polygon(comparison)}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeDasharray="7 5"
        />
      )}
      <polygon
        data-testid="matrix-product-moving-polygon"
        points={polygon(points)}
        fill={ROW_COLOR}
        fillOpacity={0.18}
        stroke={ROW_COLOR}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <g stroke={ROW_COLOR} strokeWidth={0.8} opacity={0.65}>
        {mesh.map(([from, to], i) => {
          const start = screen(from);
          const end = screen(to);
          return (
            <line key={i} x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} />
          );
        })}
      </g>
      {[points[1], points[3]].map((point, i) => {
        const end = screen(point);
        const color = i === 0 ? ROW_COLOR : COLUMN_COLOR;
        const zero = point[0] === 0 && point[1] === 0;
        return (
          <g key={i}>
            <line
              data-testid={`matrix-product-basis-${i + 1}`}
              x1={origin[0]}
              y1={origin[1]}
              x2={end[0]}
              y2={end[1]}
              stroke={color}
              strokeWidth={2.5}
              strokeDasharray={i ? "5 2" : undefined}
              markerEnd={zero ? undefined : `url(#${id}-basis-${i})`}
            />
            {!zero && (
              <text
                x={end[0] + (i ? -8 : 8)}
                y={end[1] + (i ? -8 : 16)}
                textAnchor={i ? "end" : "start"}
                fill={color}
                fontSize={14}
                fontWeight={700}
              >
                {i ? "v₂" : "v₁"}
              </text>
            )}
          </g>
        );
      })}
      <circle
        cx={origin[0]}
        cy={origin[1]}
        r={collapsed ? 5 : 2.5}
        fill={collapsed ? ROW_COLOR : "var(--foreground)"}
        data-testid={collapsed ? "matrix-product-collapse" : undefined}
      />
    </svg>
  );
}

function ProductCompositionScene({
  a,
  b,
  lang,
  stage,
  progress,
  id,
}: {
  a: ProductMatrix;
  b: ProductMatrix;
  lang: "zh" | "en";
  stage: number;
  progress: number;
  id: string;
}) {
  const zh = lang === "zh";
  const geometry = matrixProductGeometryFrame(a, b, stage, progress);
  const frame = matrixProductFrame(a, b, stage, progress);
  if (!geometry) {
    const [m, n] = matrixProductDimensions(a);
    const [q, p] = matrixProductDimensions(b);
    const swapped = frame.phase === "swap";
    const sizes = swapped ? [n, m, q] : [p, q, m];
    const names = swapped ? ["A", "B"] : ["B", "A"];
    const order = swapped ? "BA" : "AB";
    const termCount = m * p * n;
    const travel = swapped
      ? frame.progress
      : frame.phase === "dimensions"
        ? frame.progress / 2
        : frame.phase === "dot"
          ? 0.5 + (frame.stage - 1 + frame.progress) / (2 * termCount)
          : 1;
    return (
      <div className="space-y-2 p-3" data-testid="matrix-product-space-mapping">
        <h4 className="text-sm font-semibold">
          {zh
            ? "長方矩陣：座標空間合成"
            : "Rectangular maps: coordinate spaces"}
        </h4>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {zh
            ? `映射經過 ℝ${sizes[0]} → ℝ${sizes[1]} → ℝ${sizes[2]}，涉及三維空間，不能當作同一平面的正方形變形。箭頭顯示映射次序，不是 2D 幾何軌跡。`
            : `The maps pass through ℝ${sizes[0]} → ℝ${sizes[1]} → ℝ${sizes[2]}, involving a three-dimensional space. This is not a square deforming in one plane; arrows show map order, not a 2D trajectory.`}
        </p>
        <svg
          viewBox="0 0 340 155"
          width="100%"
          role="img"
          aria-labelledby={`${id}-spaces-title ${id}-spaces-desc`}
          className="block h-auto text-foreground"
        >
          <title id={`${id}-spaces-title`}>
            {zh ? `${order} 的維度映射` : `Dimension mapping for ${order}`}
          </title>
          <desc
            id={`${id}-spaces-desc`}
          >{`ℝ${sizes[0]} → ${names[0]} → ℝ${sizes[1]} → ${names[1]} → ℝ${sizes[2]}`}</desc>
          {["2", "3"].map((_, i) => (
            <path
              key={i}
              d={`M ${76 + i * 120} 78 H ${142 + i * 120} l -7 -5 m 7 5 l -7 5`}
              fill="none"
              stroke={ROW_COLOR}
              strokeWidth={2}
            />
          ))}
          {sizes.map((size, i) => (
            <g key={i}>
              <rect
                x={10 + i * 120}
                y={46}
                width={66}
                height={62}
                rx={10}
                fill="var(--secondary)"
                stroke="var(--border)"
              />
              <text x={43 + i * 120} y={73} textAnchor="middle" fontSize={22}>
                ℝ
                <tspan baselineShift="super" fontSize={14}>
                  {size}
                </tspan>
              </text>
              <text x={43 + i * 120} y={96} textAnchor="middle" fontSize={12}>
                {i === 0 ? "x" : i === 1 ? `${names[0]}x` : `${order}x`}
              </text>
            </g>
          ))}
          {names.map((name, i) => (
            <text
              key={i}
              x={109 + i * 120}
              y={35}
              textAnchor="middle"
              fontSize={16}
              fontWeight={700}
            >
              {name}
            </text>
          ))}
          <circle cx={43 + 240 * travel} cy={121} r={5} fill={ROW_COLOR} />
          <text
            x={170}
            y={150}
            textAnchor="middle"
            fontSize={14}
          >{`${order}: ℝ${sizes[0]} → ℝ${sizes[2]}`}</text>
        </svg>
      </div>
    );
  }
  const { firstName, secondName, order } = geometry;
  const done = geometry.secondProgress === 1;
  const collapsed = geometry.endpoint.every(([x, y]) => x === 0 && y === 0);
  const area =
    geometry.endpoint[1][0] * geometry.endpoint[3][1] -
    geometry.endpoint[1][1] * geometry.endpoint[3][0];
  const firstTitle = `S → ${firstName}(S)`;
  const secondTitle = `${firstName}(S) → ${secondName}(${firstName}(S)) = ${order}(S)`;
  return (
    <div
      className="space-y-3 p-3"
      data-testid="matrix-product-composition"
      data-order={order}
      data-first-progress={geometry.firstProgress}
      data-second-progress={geometry.secondProgress}
    >
      <div>
        <h4 className="text-sm font-semibold">
          {zh
            ? `幾何合成：先 ${firstName}，再 ${secondName}`
            : `Geometric composition: ${firstName} first, then ${secondName}`}
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {zh
            ? "S 是單位正方形；矩陣作用在列向量，乘法從右往左。兩圖各自自動取景，x、y 使用相同比例。"
            : "S is the unit square. Matrices act on column vectors, right to left. Each plot auto-fits separately with equal x/y scale."}
        </p>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        <figure className="min-w-0 space-y-1">
          <figcaption className="text-xs font-semibold">
            {firstTitle}
          </figcaption>
          <ProductGeometryPlot
            points={geometry.first}
            source={PRODUCT_UNIT_SQUARE}
            endpoint={geometry.firstEndpoint}
            title={firstTitle}
            desc={
              zh
                ? `單位正方形的四個頂點與兩支基底箭頭，連續變形成 ${firstName} 的像。`
                : `Four unit-square vertices and both basis arrows continuously deform into the image under ${firstName}.`
            }
            id={`${id}-first`}
          />
          <p className="text-xs text-muted-foreground">
            {geometry.firstProgress === 1
              ? zh
                ? `${firstName} 作用完成`
                : `${firstName} map complete`
              : zh
                ? `正在施作 ${firstName}（連續插值）`
                : `Applying ${firstName} (continuous interpolation)`}
          </p>
        </figure>
        <figure className="min-w-0 space-y-1">
          <figcaption className="text-xs font-semibold">
            {secondTitle}
          </figcaption>
          <ProductGeometryPlot
            points={geometry.second}
            source={geometry.firstEndpoint}
            endpoint={geometry.endpoint}
            comparison={geometry.swapped ? geometry.ab : undefined}
            title={secondTitle}
            desc={
              zh
                ? `第一個映射完成後，再將整個像及其基底箭頭施作 ${secondName}。最終頂點等於 ${order} 直接作用的結果。交換時黑色虛線保留 AB 作比較；零向量以原點表示。`
                : `After the first map, apply ${secondName} to the entire image and its basis arrows. Endpoint vertices equal a direct ${order} map. During the swap a black dashed AB outline remains for comparison; zero vectors are shown at the origin.`
            }
            id={`${id}-second`}
          />
          <p className="text-xs text-muted-foreground">
            {done
              ? zh
                ? `已完成：${secondName}(${firstName}(S)) = ${order}(S)`
                : `Complete: ${secondName}(${firstName}(S)) = ${order}(S)`
              : geometry.firstProgress < 1
                ? zh
                  ? `先施作 ${firstName}，尚未施作 ${secondName}`
                  : `${firstName} first; ${secondName} has not started`
                : zh
                  ? `正在施作 ${secondName}（連續插值，尚未完成）`
                  : `Applying ${secondName} (interpolating, not finished)`}
          </p>
        </figure>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {zh
          ? "實線 v₁、虛線 v₂ 是兩支基底的像；網格隨同一線性映射變形。灰虛線是來源，淡點線是精確終點。"
          : "Solid v₁ / dashed v₂ are the basis images; the mesh follows the same linear map. Gray dashes mark the source; faint dots mark the exact endpoint."}
      </p>
      {geometry.swapped && (
        <p className="text-xs font-medium">
          {zh
            ? `黑虛線：AB(S)；藍實線：${done ? "BA(S)" : "正在施作 A 再 B"}。${productMatricesEqual(geometry.ab, geometry.ba) ? "此例兩者相等。" : "本例終點不同，次序很重要。"}`
            : `Black dashes: AB(S); blue solid: ${done ? "BA(S)" : "applying A then B"}. ${productMatricesEqual(geometry.ab, geometry.ba) ? "This pair gives equal images." : "The endpoints differ: order matters."}`}
        </p>
      )}
      {done && area === 0 && (
        <p className="text-xs font-medium">
          {zh
            ? collapsed
              ? "零映射：整個正方形與兩支基底都塌縮至原點。"
              : "奇異映射：正方形塌縮為線段，面積為零。"
            : collapsed
              ? "Zero map: the square and both basis vectors collapse to the origin."
              : "Singular map: the square collapses to a segment with zero area."}
        </p>
      )}
    </div>
  );
}

function MatrixGlyph({
  matrix,
  center,
  label,
  opacity = 1,
  offsetY = 0,
  rowHighlight,
  columnHighlight,
  reveal,
  different,
}: {
  matrix: ProductMatrix;
  center: number;
  label: string;
  opacity?: number;
  offsetY?: number;
  rowHighlight?: number;
  columnHighlight?: number;
  reveal?: (row: number, column: number) => number;
  different?: (row: number, column: number) => boolean;
}) {
  const [rows, columns] = matrixProductDimensions(matrix);
  const x = center - (columns * CELL) / 2;
  const height = rows * CELL;
  return (
    <g transform={`translate(0 ${offsetY})`} opacity={opacity}>
      <text
        x={center}
        y={29}
        textAnchor="middle"
        fontSize={19}
        fontWeight={700}
      >
        {label}
      </text>
      <text x={center} y={52} textAnchor="middle" fontSize={16}>
        {rows} × {columns}
      </text>
      {rowHighlight !== undefined && (
        <rect
          x={x - 2}
          y={Y + rowHighlight * CELL}
          width={columns * CELL + 4}
          height={CELL}
          rx={6}
          fill={ROW_COLOR}
          fillOpacity={0.13}
          stroke={ROW_COLOR}
          strokeWidth={2}
        />
      )}
      {columnHighlight !== undefined && (
        <rect
          x={x + columnHighlight * CELL}
          y={Y - 2}
          width={CELL}
          height={height + 4}
          rx={6}
          fill={COLUMN_COLOR}
          fillOpacity={0.12}
          stroke={COLUMN_COLOR}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
      <path
        d={`M ${x - 5} ${Y - 3} h -7 v ${height + 6} h 7 M ${x + columns * CELL + 5} ${Y - 3} h 7 v ${height + 6} h -7`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      {matrix.map((row, i) =>
        row.map((value, j) => {
          const visible = reveal ? clamp(reveal(i, j)) : 1;
          return (
            <g key={`${i}:${j}`}>
              {different?.(i, j) && (
                <rect
                  x={x + j * CELL + 1}
                  y={Y + i * CELL + 1}
                  width={CELL - 2}
                  height={CELL - 2}
                  rx={5}
                  fill="none"
                  stroke={ROW_COLOR}
                  strokeWidth={2}
                />
              )}
              {reveal && (
                <text
                  x={x + (j + 0.5) * CELL}
                  y={Y + (i + 0.5) * CELL + 6}
                  textAnchor="middle"
                  fontSize={18}
                  opacity={1 - visible}
                >
                  ·
                </text>
              )}
              <text
                x={x + (j + 0.5) * CELL}
                y={Y + (i + 0.5) * CELL + 6}
                textAnchor="middle"
                fontSize={18}
                fontWeight={600}
                opacity={visible}
              >
                {value}
              </text>
            </g>
          );
        })
      )}
    </g>
  );
}

function ProductScene({
  a,
  b,
  lang,
  stage,
  progress,
  id,
}: {
  a: ProductMatrix;
  b: ProductMatrix;
  lang: "zh" | "en";
  stage: number;
  progress: number;
  id: string;
}) {
  const zh = lang === "zh";
  const frame = matrixProductFrame(a, b, stage, progress);
  const [m, n] = matrixProductDimensions(a);
  const [q, p] = matrixProductDimensions(b);
  const ba = multiplyProductMatrices(b, a);
  const equal = productMatricesEqual(frame.result, ba);
  const sameSize = m === q && p === n;
  const active = frame.phase === "dot";
  const swapping = frame.phase === "swap";
  const terms = matrixProductTerms(a, b, frame.row, frame.column);
  const chipWidth = (318 - 12 * (n - 1)) / n;
  const chipX = (k: number) => 34 + k * (chipWidth + 12);
  const chipCenter = (k: number) => chipX(k) + chipWidth / 2;
  const outputReveal = (i: number, j: number) =>
    frame.phase === "dimensions"
      ? 0
      : active
        ? i * p + j < frame.cell
          ? 1
          : i * p + j === frame.cell
            ? frame.cellReveal
            : 0
        : 1;
  const pair = (
    k: number,
    sourceX: number,
    sourceY: number,
    targetX: number,
    value: number,
    color: string
  ) => {
    const t = frame.pairTravel;
    return (
      <g
        key={`pair:${k}:${targetX}`}
        opacity={active && k === frame.term ? 1 - frame.resultTravel : 0}
      >
        <path
          d={`M ${sourceX} ${sourceY} Q ${sourceX} 205 ${targetX} 248`}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="3 4"
          opacity={0.45}
        />
        <g
          transform={`translate(${sourceX + (targetX - sourceX) * t} ${sourceY + (248 - sourceY) * t})`}
        >
          <circle r={15} fill="var(--card)" stroke={color} strokeWidth={2} />
          <text
            y={5}
            textAnchor="middle"
            fontSize={15}
            fontWeight={700}
            fill="var(--foreground)"
          >
            {value}
          </text>
        </g>
      </g>
    );
  };
  return (
    <svg
      viewBox="0 0 560 370"
      width="100%"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      className="block h-auto text-foreground"
      data-testid="matrix-product-svg"
      data-phase={frame.phase}
    >
      <title id={`${id}-title`}>
        {zh
          ? "矩陣乘法：行列配對與累加"
          : "Matrix multiplication: row–column matching and accumulation"}
      </title>
      <desc id={`${id}-desc`}>
        {zh
          ? "數值示範。實線框選 A 的行，虛線框選 B 的列；配對元素移到乘積格，再累加到輸出格。最後交換因子比較 AB 與 BA。"
          : "Numerical demonstration. A solid outline selects a row of A and a dashed outline selects a column of B. Matching entries move into product boxes and accumulate in the output cell. Finally the factors swap to compare AB with BA."}
      </desc>
      <defs>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={ROW_COLOR} />
        </marker>
      </defs>
      <MatrixGlyph
        matrix={a}
        center={frame.leftCenter}
        label="A"
        offsetY={frame.leftOffsetY}
        rowHighlight={active ? frame.highlightedRow : undefined}
      />
      <MatrixGlyph
        matrix={b}
        center={frame.rightCenter}
        label="B"
        offsetY={frame.rightOffsetY}
        columnHighlight={active ? frame.highlightedColumn : undefined}
      />
      <text x={190} y={123} textAnchor="middle" fontSize={25}>
        ×
      </text>
      <text x={370} y={123} textAnchor="middle" fontSize={25}>
        =
      </text>
      <MatrixGlyph
        matrix={frame.result}
        center={460}
        label="C = AB"
        opacity={swapping ? 1 - clamp(frame.swap * 2) : 1}
        reveal={outputReveal}
      />
      {swapping && (
        <MatrixGlyph
          matrix={ba}
          center={460}
          label="D = BA"
          opacity={frame.swap}
          reveal={(i, j) => clamp(frame.swap * (q * n + 1) - (i * n + j))}
          different={(i, j) =>
            frame.swap > 0.8 && sameSize && frame.result[i][j] !== ba[i][j]
          }
        />
      )}
      {frame.phase === "dimensions" ? (
        <g>
          <path
            d="M 110 181 H 275"
            fill="none"
            stroke={ROW_COLOR}
            strokeWidth={3}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - frame.dimensionReveal}
            markerEnd={`url(#${id}-arrow)`}
          />
          <text x={280} y={218} textAnchor="middle" fontSize={18}>
            {zh
              ? `內側 ${n} = ${q}：可以相乘`
              : `Inner sizes ${n} = ${q}: compatible`}
          </text>
          <rect
            x={30}
            y={242}
            width={500}
            height={89}
            rx={10}
            fill="var(--secondary)"
          />
          <text x={280} y={277} textAnchor="middle" fontSize={20}>
            ({m} × {n}) × ({q} × {p}) → {m} × {p}
          </text>
          <text x={280} y={308} textAnchor="middle" fontSize={17}>
            {zh
              ? "輸出：A 的行數 × B 的列數"
              : "Output: rows of A × columns of B"}
          </text>
        </g>
      ) : swapping ? (
        <g opacity={clamp(frame.swap * 2)}>
          <rect
            x={30}
            y={215}
            width={500}
            height={114}
            rx={10}
            fill="var(--secondary)"
          />
          <text
            x={280}
            y={244}
            textAnchor="middle"
            fontSize={19}
            fontWeight={700}
          >
            {equal ? "AB = BA" : "AB ≠ BA"}
          </text>
          <text x={280} y={276} textAnchor="middle" fontSize={17}>
            {sameSize
              ? zh
                ? equal
                  ? "此例相等；並非所有矩陣對都不相等"
                  : "框出的格不同：乘法次序很重要"
                : equal
                  ? "This pair commutes; not all pairs do"
                  : "Outlined cells differ: order matters"
              : `AB: ${m} × ${p}     BA: ${q} × ${n}`}
          </text>
          <text x={280} y={309} textAnchor="middle" fontSize={16}>
            {zh
              ? "交換因子後，重新配對行與列"
              : "Swapped factors require new row–column pairings"}
          </text>
        </g>
      ) : active ? (
        <g>
          <text
            x={280}
            y={209}
            textAnchor="middle"
            fontSize={18}
            fontWeight={600}
          >
            {zh
              ? `第 ${frame.row + 1} 行 × 第 ${frame.column + 1} 列 → c${frame.row + 1}${frame.column + 1}`
              : `Row ${frame.row + 1} × column ${frame.column + 1} → c${frame.row + 1}${frame.column + 1}`}
          </text>
          {terms.map((value, k) => (
            <g
              key={k}
              opacity={
                k < frame.term
                  ? 1
                  : k === frame.term
                    ? 0.35 + 0.65 * frame.pairTravel
                    : 0.25
              }
            >
              <rect
                x={chipX(k)}
                y={229}
                width={chipWidth}
                height={43}
                rx={7}
                fill="var(--secondary)"
                stroke={k === frame.term ? ROW_COLOR : "var(--border)"}
                strokeWidth={k === frame.term ? 2 : 1}
              />
              <text x={chipCenter(k)} y={255} textAnchor="middle" fontSize={16}>
                {k <= frame.term
                  ? `${signedFactor(a[frame.row][k])}×${signedFactor(b[k][frame.column])}=${value}`
                  : `k = ${k + 1}`}
              </text>
              <text x={chipCenter(k)} y={296} textAnchor="middle" fontSize={15}>
                {zh ? `配對 ${k + 1}` : `Pair ${k + 1}`}
              </text>
            </g>
          ))}
          <path
            d="M 366 250 H 403"
            fill="none"
            stroke={ROW_COLOR}
            strokeWidth={2}
            markerEnd={`url(#${id}-arrow)`}
          />
          <rect
            x={414}
            y={229}
            width={110}
            height={43}
            rx={8}
            fill="var(--primary)"
            fillOpacity={0.1}
            stroke={ROW_COLOR}
            strokeWidth={2}
          />
          <text
            x={469}
            y={257}
            textAnchor="middle"
            fontSize={22}
            fontWeight={700}
          >
            {frame.accumulated}
          </text>
          <text x={469} y={296} textAnchor="middle" fontSize={16}>
            {zh ? "已累加" : "Sum so far"}
          </text>
          <text x={280} y={329} textAnchor="middle" fontSize={16}>
            {frame.completedTerms === n
              ? zh
                ? "點積完成 → 填入輸出格"
                : "Dot product complete → fill output cell"
              : zh
                ? "部分和，不是此格的最終值"
                : "Partial sum, not the finished cell"}
          </text>
          {pair(
            frame.term,
            100 - (n * CELL) / 2 + (frame.term + 0.5) * CELL,
            Y + (frame.row + 0.5) * CELL,
            chipCenter(frame.term) - 22,
            a[frame.row][frame.term],
            ROW_COLOR
          )}
          {pair(
            frame.term,
            280 - (p * CELL) / 2 + (frame.column + 0.5) * CELL,
            Y + (frame.term + 0.5) * CELL,
            chipCenter(frame.term) + 22,
            b[frame.term][frame.column],
            COLUMN_COLOR
          )}
          <g
            opacity={frame.resultTravel > 0 && frame.resultTravel < 1 ? 1 : 0}
            transform={`translate(${chipCenter(frame.term) + (469 - chipCenter(frame.term)) * frame.resultTravel} 250)`}
          >
            <rect
              x={-22}
              y={-17}
              width={44}
              height={34}
              rx={7}
              fill="var(--card)"
              stroke={RESULT_COLOR}
            />
            <text y={6} textAnchor="middle" fontSize={18} fontWeight={700}>
              {terms[frame.term]}
            </text>
          </g>
          <g
            opacity={frame.fillTravel > 0 && frame.fillTravel < 1 ? 1 : 0}
            transform={`translate(${469 + (460 - (p * CELL) / 2 + (frame.column + 0.5) * CELL - 469) * frame.fillTravel} ${250 + (Y + (frame.row + 0.5) * CELL - 250) * frame.fillTravel})`}
          >
            <rect
              x={-22}
              y={-17}
              width={44}
              height={34}
              rx={7}
              fill="var(--card)"
              stroke={ROW_COLOR}
              strokeWidth={2}
            />
            <text y={6} textAnchor="middle" fontSize={18} fontWeight={700}>
              {frame.result[frame.row][frame.column]}
            </text>
          </g>
        </g>
      ) : (
        <g>
          <rect
            x={30}
            y={220}
            width={500}
            height={108}
            rx={10}
            fill="var(--secondary)"
          />
          <path
            d={`M 60 247 H ${60 + 435 * frame.progress}`}
            fill="none"
            stroke={ROW_COLOR}
            strokeWidth={4}
            markerEnd={`url(#${id}-arrow)`}
          />
          <text
            x={280}
            y={278}
            textAnchor="middle"
            fontSize={20}
            fontWeight={700}
          >
            {zh ? "所有行列點積完成" : "All row–column dot products complete"}
          </text>
          <text x={280} y={307} textAnchor="middle" fontSize={17}>
            {zh ? "不是對應元素相乘" : "Not an entrywise product"}
          </text>
        </g>
      )}
      <text
        x={280}
        y={355}
        textAnchor="middle"
        fontSize={15}
        fill="var(--muted-foreground)"
      >
        {zh
          ? "數值示範；移動中的位置只作示意"
          : "Numerical demo; moving positions are illustrative"}
      </text>
    </svg>
  );
}

export default function MatrixProductDiagram({
  lang,
  variant = "matrix-mul",
}: KnowledgeDiagramProps) {
  const [presetId, setPresetId] = useState<MatrixProductPresetId>("card");
  const id = `matrix-product-${useId().replace(/:/g, "")}`;
  const preset = MATRIX_PRODUCT_PRESETS[presetId];
  const steps = useMemo(
    () => matrixProductSteps(preset.a, preset.b, lang),
    [preset, lang]
  );
  const zh = lang === "zh";
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${presetId}`}
      lang={lang}
      title={
        zh
          ? "矩陣乘法：幾何合成與行 × 列"
          : "Matrix product: composition and row × column"
      }
      testId="knowledge-matrix-product"
      steps={steps}
      controls={
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            {zh
              ? "選擇獨立的數值示範（切換後重設播放）"
              : "Choose a separate numerical demo (resets playback)"}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={zh ? "矩陣乘法示範" : "Matrix product examples"}
          >
            {(
              Object.keys(MATRIX_PRODUCT_PRESETS) as MatrixProductPresetId[]
            ).map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={presetId === value}
                onClick={() => setPresetId(value)}
                className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${presetId === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}
              >
                {zh
                  ? MATRIX_PRODUCT_PRESETS[value].zh
                  : MATRIX_PRODUCT_PRESETS[value].en}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {frame => (
        <div className="min-w-0">
          <ProductCompositionScene
            a={preset.a}
            b={preset.b}
            lang={lang}
            stage={frame.stage}
            progress={frame.progress}
            id={`${id}-geometry`}
          />
          <div className="min-w-0 border-t border-border">
            <h4 className="px-3 pt-3 text-xs font-semibold text-muted-foreground">
              {zh
                ? "計算細節：逐項行列點積"
                : "Calculation detail: row–column accumulation"}
            </h4>
            <ProductScene
              a={preset.a}
              b={preset.b}
              lang={lang}
              stage={frame.stage}
              progress={frame.progress}
              id={id}
            />
          </div>
        </div>
      )}
    </AnimatedKnowledgeLesson>
  );
}
