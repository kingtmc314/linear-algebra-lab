import React, { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

export const MATRIX_ENTRIES_VARIANTS = [
  "matrix-def",
  "matrix-add",
  "matrix-transpose",
  "matrix-identity",
] as const;
export type MatrixEntriesVariant = (typeof MATRIX_ENTRIES_VARIANTS)[number];
export type EntriesPreset = "card" | "signed" | "zero";
export type EntryMatrix = readonly (readonly number[])[];
export const MATRIX_ENTRIES_STAGE_COUNT = 6;

/** Empty matrices are supported; nonempty matrices must be rectangular and finite. */
export function entryMatrixShape(matrix: EntryMatrix): {
  rows: number;
  columns: number;
} {
  const columns = matrix[0]?.length ?? 0;
  if (matrix.length && !columns)
    throw new RangeError("A nonempty matrix needs columns");
  for (const row of matrix) {
    if (row.length !== columns || row.some(value => !Number.isFinite(value))) {
      throw new RangeError("Matrix entries must be finite and rectangular");
    }
  }
  return { rows: matrix.length, columns };
}

export function entryAt(
  matrix: EntryMatrix,
  row: number,
  column: number
): number {
  const shape = entryMatrixShape(matrix);
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 1 ||
    column < 1 ||
    row > shape.rows ||
    column > shape.columns
  ) {
    throw new RangeError("Entry indices are one-based and must be in bounds");
  }
  return matrix[row - 1][column - 1];
}

export function addEntries(a: EntryMatrix, b: EntryMatrix): number[][] {
  const sa = entryMatrixShape(a);
  const sb = entryMatrixShape(b);
  if (sa.rows !== sb.rows || sa.columns !== sb.columns)
    throw new RangeError("Addition requires equal dimensions");
  const result = a.map((row, i) => row.map((value, j) => value + b[i][j]));
  entryMatrixShape(result);
  return result;
}

export function transposeEntries(matrix: EntryMatrix): number[][] {
  const { rows, columns } = entryMatrixShape(matrix);
  return Array.from({ length: columns }, (_, j) =>
    Array.from({ length: rows }, (_, i) => matrix[i][j])
  );
}

export function identityEntries(size: number): number[][] {
  if (!Number.isInteger(size) || size < 0 || size > 32)
    throw new RangeError("Identity size must be an integer from 0 to 32");
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => Number(i === j))
  );
}

export interface EntriesExample {
  variant: MatrixEntriesVariant;
  a: EntryMatrix;
  b: EntryMatrix;
  result: EntryMatrix;
}

export function matrixEntriesExample(
  variant: MatrixEntriesVariant,
  preset: EntriesPreset = "card"
): EntriesExample {
  let a: number[][];
  if (variant === "matrix-def")
    a = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
  else if (variant === "matrix-transpose")
    a = [
      [1, 2, 3],
      [4, 5, 6],
    ];
  else
    a = [
      [1, 2],
      [3, 4],
    ];
  if (preset === "signed")
    a = a.map((row, i) =>
      row.map((value, j) => ((i + j) % 2 ? -value : value))
    );
  if (preset === "zero") a = a.map(row => row.map(() => 0));
  const b =
    preset === "signed"
      ? a.map(row => row.map(value => -value))
      : preset === "zero"
        ? [
            [0, 0],
            [0, 0],
          ]
        : [
            [5, 6],
            [7, 8],
          ];
  if (variant === "matrix-identity")
    return {
      variant,
      a: identityEntries(2),
      b: identityEntries(3),
      result: identityEntries(3),
    };
  return {
    variant,
    a,
    b,
    result:
      variant === "matrix-add"
        ? addEntries(a, b)
        : variant === "matrix-transpose"
          ? transposeEntries(a)
          : a,
  };
}

export function entryMatrixLatex(matrix: EntryMatrix): string {
  entryMatrixShape(matrix);
  if (!matrix.length) return String.raw`\varnothing`;
  return (
    String.raw`\begin{bmatrix}` +
    matrix.map(row => row.join("&")).join(String.raw`\\`) +
    String.raw`\end{bmatrix}`
  );
}

export function matrixEntriesSteps(
  example: EntriesExample,
  lang: "zh" | "en"
): DerivationStep[] {
  const zh = lang === "zh";
  const { variant, a, b, result } = example;
  const A = entryMatrixLatex(a),
    B = entryMatrixLatex(b),
    C = entryMatrixLatex(result);
  const step = (cn: string, en: string, latex: string): DerivationStep => ({
    description: zh ? cn : en,
    latex,
  });
  if (variant === "matrix-def")
    return [
      step(
        "數值示例：A 有 3 行、2 列；索引從 1 開始。",
        "Numerical demo: A has 3 rows and 2 columns; indices start at 1.",
        `A=${A},\\quad A\\in\\mathbb{R}^{3\\times2}`
      ),
      step(
        "先選第 2 行；第一個索引 i 表示行。",
        "Select row 2. The first index i identifies the row.",
        `i=2:\\quad a_{21}=${a[1][0]},\\quad a_{22}=${a[1][1]}`
      ),
      step(
        "再選第 2 列；第二個索引 j 表示列。",
        "Select column 2. The second index j identifies the column.",
        `j=2:\\quad a_{12}=${a[0][1]},\\quad a_{22}=${a[1][1]},\\quad a_{32}=${a[2][1]}`
      ),
      step(
        "行與列的交點就是元素 a₂₂。",
        "The row-column intersection is entry a22.",
        `a_{22}=${a[1][1]}`
      ),
      step(
        "沿第 2 列移到第 3 行，索引變成 a₃₂。",
        "Move along column 2 to row 3: the entry becomes a32.",
        `a_{32}=${a[2][1]}`
      ),
      step(
        "這個 3×2 示例共有 6 個元素；a₃₂ 位於第 3 行第 2 列，也是 Ae₂ 的第 3 個輸出座標。上圖的映射是 R²→R³。",
        "This 3 by 2 demo has 6 entries; a32 is in row 3, column 2, and is coordinate 3 of Ae₂. The map above goes from R² to R³.",
        `A=${A},\\quad m=3,\\ n=2,\\ mn=6,\\ a_{32}=${a[2][1]}`
      ),
    ];
  if (variant === "matrix-add")
    return [
      step(
        "數值示例：A、B 都是 2×2，才可逐項相加。",
        "Numerical demo: both A and B are 2 by 2, so corresponding entries can be added.",
        `A=${A},\\quad B=${B}`
      ),
      ...a.flat().map((_, k) => {
        const i = Math.floor(k / 2),
          j = k % 2;
        return step(
          `配對第 ${i + 1} 行第 ${j + 1} 列的兩個元素，再填入同一位置。`,
          `Pair the two entries in row ${i + 1}, column ${j + 1}, then fill the same output position.`,
          `c_{${i + 1}${j + 1}}=a_{${i + 1}${j + 1}}+b_{${i + 1}${j + 1}}=${a[i][j]}+(${b[i][j]})=${result[i][j]}`
        );
      }),
      step(
        "四個對應位置已完成；不是矩陣乘法。上圖以相同輸入 e₁ 示範 Ae₁ 與 Be₁ 首尾相接，得到 (A+B)e₁。",
        "All four corresponding positions are complete. This is addition, not matrix multiplication. Above, Ae₁ and Be₁ join tip-to-tail to give (A+B)e₁ for the same input e₁.",
        `${A}+${B}=${C}`
      ),
    ];
  if (variant === "matrix-transpose")
    return [
      step(
        "數值示例：轉置把 2×3 的排列改為 3×2；數值不變。",
        "Numerical demo: transpose changes a 2 by 3 layout into 3 by 2 without changing values.",
        `A=${A},\\quad A^T\\in\\mathbb{R}^{3\\times2}`
      ),
      step(
        "原矩陣第 1 行移到轉置的第 1 列。",
        "Row 1 of the original moves into column 1 of the transpose.",
        String.raw`a_{1j}=(A^T)_{j1},\quad j=1,2,3`
      ),
      step(
        "原矩陣第 2 行移到轉置的第 2 列。",
        "Row 2 of the original moves into column 2 of the transpose.",
        String.raw`a_{2j}=(A^T)_{j2},\quad j=1,2,3`
      ),
      step(
        "追蹤 a₁₂：索引 (1,2) 交換成 (2,1)。",
        "Track a12: index (1,2) swaps to (2,1).",
        `a_{12}=${a[0][1]}=(A^T)_{21}`
      ),
      step(
        "追蹤 a₂₃：索引 (2,3) 交換成 (3,2)。",
        "Track a23: index (2,3) swaps to (3,2).",
        `a_{23}=${a[1][2]}=(A^T)_{32}`
      ),
      step(
        "示例完成：每個元素交換行、列索引。上圖的 A:R³→R² 與 Aᵀ:R²→R³ 以內積相對應；不是旋轉或一般平面鏡射。",
        "Demo complete: entries swap row and column indices. Above, A:R³→R² and Aᵀ:R²→R³ correspond through inner products, not a rotation or general plane reflection.",
        `${A}^{T}=${C}`
      ),
    ];
  return [
    step(
      "數值示例：建立 I₂、I₃ 的方形位置網格。",
      "Numerical demo: set up the square entry grids for I2 and I3.",
      String.raw`I_2\in\mathbb{R}^{2\times2},\quad I_3\in\mathbb{R}^{3\times3}`
    ),
    step(
      "非對角位置 i≠j 全部填 0。",
      "Fill every off-diagonal position i not equal to j with 0.",
      String.raw`(I_n)_{ij}=0\quad(i\ne j)`
    ),
    step(
      "I₂ 的第一個對角位置 (1,1) 填 1。",
      "Fill the first diagonal position (1,1) of I2 with 1.",
      String.raw`(I_2)_{11}=1`
    ),
    step(
      "I₂ 的第二個對角位置 (2,2) 也填 1。",
      "Fill the second diagonal position (2,2) of I2 with 1.",
      `I_2=${A}`
    ),
    step(
      "I₃ 同樣沿 i=j 的主對角線填 1。",
      "For I3, likewise fill the main diagonal i=j with 1.",
      String.raw`(I_3)_{11}=(I_3)_{22}=(I_3)_{33}=1`
    ),
    step(
      "示例完成：主對角線為 1，其餘為 0。上圖的向量與單位正方形始終固定，只有施工線在畫出；零矩陣不是單位矩陣。",
      "Demo complete: diagonal entries are 1 and all others are 0. The vector and unit square above remain fixed; only guides are constructed. The zero matrix is not the identity.",
      `I_2=${A},\\quad I_3=${B}`
    ),
  ];
}

const unit = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
export function entryAnimationFrame(frame: KnowledgeFrame) {
  const stage = Number.isFinite(frame.stage)
    ? Math.max(
        0,
        Math.min(MATRIX_ENTRIES_STAGE_COUNT - 1, Math.floor(frame.stage))
      )
    : 0;
  return { stage, progress: unit(frame.progress) };
}
export function entryStageProgress(
  frame: KnowledgeFrame,
  stage: number
): number {
  const safe = entryAnimationFrame(frame);
  return safe.stage > stage ? 1 : safe.stage < stage ? 0 : safe.progress;
}
export function entryCellPosition(
  row: number,
  column: number,
  x: number,
  y: number,
  size: number
) {
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 1 ||
    column < 1 ||
    ![x, y, size].every(Number.isFinite) ||
    size <= 0
  )
    throw new RangeError(
      "Cell geometry needs valid indices and a positive finite size"
    );
  const point = { x: x + (column - 0.5) * size, y: y + (row - 0.5) * size };
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw new RangeError("Cell geometry overflow");
  return point;
}
export function entryMotionPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress: number
) {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite))
    throw new RangeError("Motion endpoints must be finite");
  const p = unit(progress);
  // Convex interpolation keeps entry values unchanged; only their display positions move.
  return {
    x: from.x * (1 - p) + to.x * p,
    y: from.y * (1 - p) + to.y * p - 28 * Math.sin(Math.PI * p),
  };
}

const primary = "var(--primary)";
const columnColor = "#d97706";
const foreground = "var(--foreground)";
const border = "var(--border)";
const resultColor = "#059669";

export type EntryVector = readonly number[];
function finiteVector(vector: EntryVector) {
  if (!vector.length || vector.some(value => !Number.isFinite(value)))
    throw new RangeError("Vectors must be nonempty and finite");
  return vector;
}
export function applyEntriesMatrix(matrix: EntryMatrix, vector: EntryVector) {
  const { columns } = entryMatrixShape(matrix);
  finiteVector(vector);
  if (columns !== vector.length)
    throw new RangeError("Matrix input dimension must match the vector");
  const result = matrix.map(row =>
    row.reduce((sum, value, i) => sum + value * vector[i], 0)
  );
  finiteVector(result);
  return result;
}
export function entryDot(a: EntryVector, b: EntryVector) {
  finiteVector(a);
  finiteVector(b);
  if (a.length !== b.length)
    throw new RangeError("Dot product dimensions differ");
  const value = a.reduce((sum, item, i) => sum + item * b[i], 0);
  if (!Number.isFinite(value)) throw new RangeError("Dot product overflow");
  return value;
}
export function entryBasis(dimension: number, index: number) {
  if (
    ![2, 3].includes(dimension) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= dimension
  )
    throw new RangeError(
      "The diagram basis needs dimension 2 or 3 and an in-bounds index"
    );
  return Array.from({ length: dimension }, (_, i) => Number(i === index));
}
const vectorScale = (vector: EntryVector, amount: number) =>
  vector.map(value => value * unit(amount));
const vectorSum = (a: EntryVector, b: EntryVector) => {
  if (a.length !== b.length) throw new RangeError("Vector dimensions differ");
  return finiteVector(a.map((value, i) => value + b[i]));
};

/** R³ is explicitly a 2D isometric drawing, not a planar transformation.
 * Projected coordinate axes have equal unit scale; screen lengths/angles are not 3D measurements. */
export function entryProject(vector: EntryVector) {
  finiteVector(vector);
  if (vector.length !== 2 && vector.length !== 3)
    throw new RangeError("Only R² and labelled R³ projections are drawn");
  const point =
    vector.length === 2
      ? { x: vector[0], y: vector[1] }
      : {
          x: ((vector[0] + vector[1]) * Math.sqrt(3)) / 2,
          y: vector[2] - (vector[0] - vector[1]) / 2,
        };
  if (![point.x, point.y].every(Number.isFinite))
    throw new RangeError("Projection overflow");
  return point;
}
export function entryViewport(
  vectors: readonly EntryVector[],
  width = 320,
  height = 260
) {
  if (
    !vectors.length ||
    ![width, height].every(Number.isFinite) ||
    width <= 100 ||
    height <= 100
  )
    throw new RangeError("A viewport needs vectors and finite usable bounds");
  const dimension = vectors[0].length;
  if (vectors.some(vector => vector.length !== dimension))
    throw new RangeError("Viewport dimensions differ");
  const axisExtent = Math.max(
    1,
    ...vectors.flatMap(vector =>
      [...finiteVector(vector)].map(value => Math.abs(value) * 0.6)
    )
  );
  const axes = Array.from({ length: dimension }, (_, i) =>
    entryBasis(dimension, i).map(value => value * axisExtent)
  );
  const points = [
    ...vectors,
    ...axes,
    ...axes.map(vector => vector.map(value => -value)),
  ].map(entryProject);
  const xs = [0, ...points.map(point => point.x)],
    ys = [0, ...points.map(point => point.y)];
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const span = Math.max(2, maxX - minX, maxY - minY);
  const scale = Math.min(width - 84, height - 72) / span;
  const viewport = {
    origin: {
      x: width / 2 - (minX / 2 + maxX / 2) * scale,
      y: height / 2 + (minY / 2 + maxY / 2) * scale,
    },
    scale,
    axisExtent,
    dimension,
  };
  if (
    ![viewport.origin.x, viewport.origin.y, scale, axisExtent, span].every(
      Number.isFinite
    ) ||
    scale <= 0
  )
    throw new RangeError("Viewport overflow");
  return viewport;
}
export function entryScreenPoint(
  vector: EntryVector,
  viewport: ReturnType<typeof entryViewport>
) {
  if (vector.length !== viewport.dimension)
    throw new RangeError("Screen projection dimension differs");
  const point = entryProject(vector);
  const result = {
    x: viewport.origin.x + point.x * viewport.scale,
    y: viewport.origin.y - point.y * viewport.scale,
  };
  if (![result.x, result.y].every(Number.isFinite))
    throw new RangeError("Screen coordinates overflow");
  return result;
}

/** All endpoints use the shared player frame. Growing arrows are construction guides,
 * not intermediate matrices or a claim that a rectangular map acts within a plane. */
export function entryGeometricFrame(
  example: EntriesExample,
  frame: KnowledgeFrame
) {
  const { variant, a, b } = example;
  const { rows: outputDimension, columns: inputDimension } =
    entryMatrixShape(a);
  const expected =
    variant === "matrix-def"
      ? [3, 2]
      : variant === "matrix-transpose"
        ? [2, 3]
        : [2, 2];
  if (outputDimension !== expected[0] || inputDimension !== expected[1])
    throw new RangeError(
      "This numerical diagram requires the example dimensions"
    );
  const at = (stage: number) => entryStageProgress(frame, stage);
  const dimensions = { inputDimension, outputDimension };
  if (variant === "matrix-add") {
    const e1 = entryBasis(2, 0),
      ae1 = applyEntriesMatrix(a, e1),
      be1 = applyEntriesMatrix(b, e1);
    const sum = applyEntriesMatrix(addEntries(a, b), e1);
    const aEnd = vectorScale(ae1, at(1));
    return {
      variant,
      ...dimensions,
      e1,
      ae1,
      be1,
      sum,
      aEnd,
      bStart: aEnd,
      bEnd: vectorSum(aEnd, vectorScale(be1, at(2))),
      sumEnd: vectorScale(sum, at(4)),
      guideEnd: vectorSum(be1, vectorScale(ae1, at(3))),
    };
  }
  if (variant === "matrix-identity") {
    const x = [2, -1],
      ix = applyEntriesMatrix(a, x);
    // The vector and square never move. Only these coordinate/construction guides grow.
    return {
      variant,
      ...dimensions,
      x,
      ix,
      guideCorner: [2 * at(2), 0],
      guideEnd: [2, -at(3)],
      squareGuideEnd: [1, at(4)],
    };
  }
  if (variant === "matrix-transpose") {
    const x = [1, -1, 2],
      y = [1, 2];
    const ax = applyEntriesMatrix(a, x),
      aty = applyEntriesMatrix(transposeEntries(a), y);
    return {
      variant,
      ...dimensions,
      x,
      y,
      ax,
      aty,
      lhs: entryDot(ax, y),
      rhs: entryDot(x, aty),
      axEnd: vectorScale(ax, at(1)),
      atyEnd: vectorScale(aty, at(2)),
      guideStart: [aty[0], aty[1], 0],
      guideEnd: [aty[0], aty[1], aty[2] * at(4)],
    };
  }
  const basis = [entryBasis(2, 0), entryBasis(2, 1)];
  const columns = basis.map(vector => applyEntriesMatrix(a, vector));
  const guideStart = [columns[1][0], columns[1][1], 0];
  return {
    variant,
    ...dimensions,
    basis,
    columns,
    ends: columns.map((column, j) => vectorScale(column, at(j + 1))),
    guideStart,
    guideEnd: [columns[1][0], columns[1][1], columns[1][2] * at(4)],
  };
}

const subscript = (n: number) =>
  String(n).replace(/\d/g, digit => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]);

interface GridProps {
  matrix: EntryMatrix;
  x: number;
  y: number;
  size: number;
  label: string;
  reveal?: (row: number, column: number) => number;
  highlight?: (row: number, column: number) => number;
  dim?: (row: number, column: number) => boolean;
}
function EntryGrid({
  matrix,
  x,
  y,
  size,
  label,
  reveal = () => 1,
  highlight = () => 0,
  dim = () => false,
}: GridProps) {
  const { rows, columns } = entryMatrixShape(matrix);
  const width = columns * size,
    height = rows * size;
  return (
    <g>
      <text
        x={x + width / 2}
        y={y - 39}
        textAnchor="middle"
        fontSize="19"
        fontWeight="600"
      >
        {label}
      </text>
      {Array.from({ length: columns }, (_, j) => (
        <text
          key={j}
          x={x + (j + 0.5) * size}
          y={y - 15}
          textAnchor="middle"
          fontSize="13"
          fill={columnColor}
        >
          {j + 1}
        </text>
      ))}
      {matrix.map((row, i) => (
        <g key={i}>
          <text
            x={x - 23}
            y={y + (i + 0.5) * size + 5}
            textAnchor="middle"
            fontSize="13"
            fill={primary}
          >
            {i + 1}
          </text>
          {row.map((value, j) => {
            const point = entryCellPosition(i + 1, j + 1, x, y, size);
            const opacity = unit(reveal(i, j));
            const focus = unit(highlight(i, j));
            return (
              <g key={j} data-entry={`${i + 1},${j + 1}`}>
                <rect
                  x={x + j * size + 2}
                  y={y + i * size + 2}
                  width={size - 4}
                  height={size - 4}
                  rx="7"
                  fill={primary}
                  fillOpacity={0.05 + 0.17 * focus}
                  stroke={focus > 0 ? primary : border}
                  strokeOpacity={focus > 0 ? 0.4 + 0.6 * focus : 1}
                />
                {opacity < 1 && (
                  <text
                    x={point.x}
                    y={point.y + 6}
                    textAnchor="middle"
                    fontSize="19"
                    opacity={1 - opacity}
                    fill="var(--muted-foreground)"
                  >
                    ·
                  </text>
                )}
                <text
                  x={point.x}
                  y={point.y + 7}
                  textAnchor="middle"
                  fontSize="22"
                  fontWeight={focus > 0 ? 650 : 500}
                  opacity={opacity * (dim(i, j) ? 0.3 : 1)}
                >
                  {value}
                </text>
              </g>
            );
          })}
        </g>
      ))}
      <path
        d={`M${x - 3},${y - 7}h-7v${height + 14}h7 M${x + width + 3},${y - 7}h7v${height + 14}h-7`}
        stroke={foreground}
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}

interface GeometricArrow {
  key: string;
  from?: EntryVector;
  to: EntryVector;
  color: string;
  dashed?: boolean;
  width?: number;
}
function CoordinatePlot({
  vectors,
  arrows,
  id,
  label,
  square = false,
}: {
  vectors: readonly EntryVector[];
  arrows: GeometricArrow[];
  id: string;
  label: string;
  square?: boolean;
}) {
  const viewport = entryViewport(vectors);
  const zero = Array(viewport.dimension).fill(0) as number[];
  const screen = (vector: EntryVector) => entryScreenPoint(vector, viewport);
  const origin = screen(zero);
  const squarePoints = square
    ? [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ].map(screen)
    : [];
  return (
    <svg
      viewBox="0 0 320 260"
      width="100%"
      className="block h-auto text-foreground"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      data-geometry-plot={viewport.dimension}
    >
      <title id={`${id}-title`}>{label}</title>
      <desc id={`${id}-desc`}>{label}</desc>
      <defs>
        <marker
          id={`${id}-head`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,0L10,5L0,10z" fill="context-stroke" />
        </marker>
      </defs>
      <g fontFamily="inherit" fill={foreground}>
        {Array.from({ length: viewport.dimension }, (_, i) => {
          const axis = entryBasis(viewport.dimension, i).map(
            value => value * viewport.axisExtent
          );
          const end = screen(axis),
            start = screen(axis.map(value => -value));
          return (
            <g key={i}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={border}
                strokeWidth="1.3"
              />
              <text x={end.x + 7} y={end.y - 7} fontSize="13">
                x{subscript(i + 1)}
              </text>
              <circle
                cx={screen(entryBasis(viewport.dimension, i)).x}
                cy={screen(entryBasis(viewport.dimension, i)).y}
                r="2"
                fill="var(--muted-foreground)"
              />
            </g>
          );
        })}
        {square && (
          <polygon
            points={squarePoints
              .map(point => `${point.x},${point.y}`)
              .join(" ")}
            fill={primary}
            fillOpacity=".08"
            stroke={primary}
            strokeWidth="2"
            data-geometry-fixed="unit-square"
          />
        )}
        {arrows.map(arrow => {
          const start = screen(arrow.from ?? zero),
            end = screen(arrow.to);
          const collapsed = Math.hypot(end.x - start.x, end.y - start.y) < 0.01;
          const zeroVector = arrow.to.every(
            (value, i) => value === (arrow.from ?? zero)[i]
          );
          return (
            <g key={arrow.key}>
              <line
                data-geo-arrow={arrow.key}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={arrow.color}
                strokeWidth={arrow.width ?? 2.8}
                strokeDasharray={arrow.dashed ? "5 4" : undefined}
                markerEnd={collapsed ? undefined : `url(#${id}-head)`}
              />
              {collapsed && (
                <circle
                  cx={end.x}
                  cy={end.y}
                  r="4"
                  fill="var(--card)"
                  stroke={arrow.color}
                  strokeWidth="2"
                  data-geometry-zero={zeroVector ? arrow.key : undefined}
                  data-geometry-projection-overlap={
                    !zeroVector ? arrow.key : undefined
                  }
                />
              )}
            </g>
          );
        })}
        <circle cx={origin.x} cy={origin.y} r="2.5" fill={foreground} />
        <text x={origin.x - 14} y={origin.y + 18} fontSize="13">
          0
        </text>
      </g>
    </svg>
  );
}

const vectorLabel = (vector: EntryVector) => `(${vector.join(", ")})`;
function GeometryPanel({
  example,
  frame,
  lang,
  id,
}: {
  example: EntriesExample;
  frame: KnowledgeFrame;
  lang: "zh" | "en";
  id: string;
}) {
  const zh = lang === "zh";
  const model = entryGeometricFrame(example, frame);
  const titles = {
    "matrix-def": zh
      ? "列向量，就是基底的像"
      : "Columns are images of basis vectors",
    "matrix-add": zh
      ? "向量首尾相接：加法的幾何"
      : "Tip-to-tail: the geometry of addition",
    "matrix-transpose": zh
      ? "轉置：兩個方向的映射與內積"
      : "Transpose: opposite directions, paired inner products",
    "matrix-identity": zh
      ? "單位矩陣：每個向量原地不動"
      : "Identity: every vector stays fixed",
  };
  const plot = (
    name: string,
    label: string,
    vectors: readonly EntryVector[],
    arrows: GeometricArrow[],
    square = false
  ) => (
    <div className="min-w-0 rounded-lg border border-border bg-background/50 p-2">
      <h5 className="text-center text-sm font-semibold">{label}</h5>
      <CoordinatePlot
        id={`${id}-geo-${name}`}
        label={label}
        vectors={vectors}
        arrows={arrows}
        square={square}
      />
    </div>
  );
  let body;
  if (model.variant === "matrix-add") {
    body = (
      <>
        <p className="text-sm">
          {zh
            ? "同一個輸入 e₁ = (1, 0)。橙色 Be₁ 平移到藍色 Ae₁ 的箭頭端；綠色箭頭從原點指向總和。"
            : "Use the same input e₁ = (1, 0). Translate orange Be₁ to the tip of blue Ae₁; green points from the origin to their sum."}
        </p>
        <div className="mx-auto w-full max-w-sm">
          {plot(
            "sum",
            "ℝ² → ℝ² · (A + B)e₁",
            [model.e1, model.ae1, model.be1, model.sum],
            [
              {
                key: "input-e1",
                to: model.e1,
                color: foreground,
                dashed: true,
                width: 1.6,
              },
              {
                key: "be1-origin",
                to: model.be1,
                color: columnColor,
                dashed: true,
                width: 1.5,
              },
              { key: "ae1", to: model.aEnd, color: primary },
              {
                key: "be1-tip",
                from: model.bStart,
                to: model.bEnd,
                color: columnColor,
              },
              {
                key: "parallelogram-guide",
                from: model.be1,
                to: model.guideEnd,
                color: primary,
                dashed: true,
                width: 1.3,
              },
              { key: "sum", to: model.sumEnd, color: resultColor, width: 3.4 },
            ]
          )}
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-3">
          <p style={{ color: primary }}>Ae₁ = {vectorLabel(model.ae1)}</p>
          <p style={{ color: columnColor }}>Be₁ = {vectorLabel(model.be1)}</p>
          <p style={{ color: resultColor }}>
            (A+B)e₁ = {vectorLabel(model.sum)}
          </p>
        </div>
        {model.sum.every(value => value === 0) && (
          <p className="text-sm">
            {zh
              ? "總和是零向量：終點就在原點，沒有方向；空心圓標出退化箭頭。"
              : "The sum is the zero vector: its endpoint is the origin, with no direction. A ring marks a collapsed arrow."}
          </p>
        )}
      </>
    );
  } else if (model.variant === "matrix-def") {
    body = (
      <>
        <p className="text-sm">
          A : ℝ² → ℝ³ ·{" "}
          {zh
            ? "兩個輸入座標，三個輸出座標；不是平面內的變換。"
            : "Two input coordinates, three output coordinates; not a transformation within a plane."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {plot(
            "basis",
            zh ? "ℝ² 輸入基底" : "ℝ² input basis",
            model.basis,
            model.basis.map((to, j) => ({
              key: `basis-${j + 1}`,
              to,
              color: j ? columnColor : primary,
            }))
          )}
          {plot(
            "columns",
            zh ? "ℝ³ 輸出 · 等軸投影" : "ℝ³ output · isometric projection",
            [
              ...model.columns,
              model.guideStart,
              ...Array.from({ length: 3 }, (_, i) => entryBasis(3, i)),
            ],
            [
              ...model.ends.map((to, j) => ({
                key: `column-${j + 1}`,
                to,
                color: j ? columnColor : primary,
              })),
              {
                key: "third-coordinate-guide",
                from: model.guideStart,
                to: model.guideEnd,
                color: columnColor,
                dashed: true,
                width: 1.5,
              },
            ]
          )}
        </div>
        <div className="grid gap-1 text-sm sm:grid-cols-2">
          <p style={{ color: primary }}>
            e₁ = (1, 0) → Ae₁ = {vectorLabel(model.columns[0])}
          </p>
          <p style={{ color: columnColor }}>
            e₂ = (0, 1) → Ae₂ = {vectorLabel(model.columns[1])}
          </p>
        </div>
        <p className="text-sm">
          {zh
            ? "第 j 列 = Aeⱼ；列中的三個元素是三個輸出座標。虛線施工線補出第 3 座標。"
            : "Column j = Aeⱼ: its three entries are the three output coordinates. The dashed construction guide adds coordinate 3."}
        </p>
      </>
    );
  } else if (model.variant === "matrix-transpose") {
    body = (
      <>
        <div className="grid gap-1 text-sm sm:grid-cols-2">
          <p>A : ℝ³ → ℝ²</p>
          <p>Aᵀ : ℝ² → ℝ³</p>
        </div>
        <p className="text-sm">
          {zh
            ? "不是一般的平面鏡射，也不是旋轉。兩側是不同維度的空間；對應的是內積，而非畫面形狀。"
            : "Not a general plane reflection or rotation. These are spaces of different dimensions; inner products correspond, not screen shapes."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {plot(
            "r3",
            zh ? "ℝ³ · 等軸投影" : "ℝ³ · isometric projection",
            [model.x, model.aty, model.guideStart],
            [
              { key: "x", to: model.x, color: primary, dashed: true },
              { key: "aty", to: model.atyEnd, color: columnColor },
              {
                key: "adjoint-coordinate-guide",
                from: model.guideStart,
                to: model.guideEnd,
                color: columnColor,
                dashed: true,
                width: 1.3,
              },
            ]
          )}
          {plot(
            "r2",
            "ℝ²",
            [model.y, model.ax],
            [
              { key: "y", to: model.y, color: columnColor, dashed: true },
              { key: "ax", to: model.axEnd, color: primary },
            ]
          )}
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p style={{ color: primary }}>x = {vectorLabel(model.x)} ∈ ℝ³</p>
            <p style={{ color: columnColor }}>
              Aᵀy = {vectorLabel(model.aty)} ∈ ℝ³
            </p>
          </div>
          <div>
            <p style={{ color: columnColor }}>
              y = {vectorLabel(model.y)} ∈ ℝ²
            </p>
            <p style={{ color: primary }}>Ax = {vectorLabel(model.ax)} ∈ ℝ²</p>
          </div>
        </div>
        <div className="rounded-lg bg-primary/10 p-3 text-sm">
          <p className="font-semibold">⟨Ax, y⟩ = ⟨x, Aᵀy⟩ = {model.lhs}</p>
          <p>
            {vectorLabel(model.ax)} · {vectorLabel(model.y)} = {model.lhs}
          </p>
          <p>
            {vectorLabel(model.x)} · {vectorLabel(model.aty)} = {model.rhs}
          </p>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-sm">
          I₂ : ℝ² → ℝ² · x = {vectorLabel(model.x)} · I₂x ={" "}
          {vectorLabel(model.ix)}
        </p>
        <div className="mx-auto w-full max-w-sm">
          {plot(
            "identity",
            zh ? "x 與 I₂x 完全重合" : "x and I₂x coincide exactly",
            [model.x, [1, 1]],
            [
              {
                key: "identity-input-fixed",
                to: model.x,
                color: primary,
                width: 5,
              },
              {
                key: "identity-output-fixed",
                to: model.ix,
                color: resultColor,
                width: 2.6,
              },
              {
                key: "identity-x-guide",
                to: model.guideCorner,
                color: columnColor,
                dashed: true,
                width: 1.5,
              },
              {
                key: "identity-y-guide",
                from: [2, 0],
                to: model.guideEnd,
                color: columnColor,
                dashed: true,
                width: 1.5,
              },
              {
                key: "identity-square-guide",
                from: [1, 0],
                to: model.squareGuideEnd,
                color: columnColor,
                dashed: true,
                width: 1.5,
              },
            ],
            true
          )}
        </div>
        <p className="text-sm">
          {zh
            ? "藍色輸入、綠色輸出一直重合；單位正方形也固定。只有橙色虛線逐段畫出座標施工線，並沒有把向量移走。I₃ 在三維同樣保持每個向量不變。"
            : "Blue input and green output always coincide; the unit square stays fixed too. Only orange coordinate guides are constructed, without moving the vector. I₃ likewise fixes every vector in three dimensions."}
        </p>
      </>
    );
  }
  return (
    <section
      data-testid="matrix-entry-geometry"
      data-geometry-variant={model.variant}
      className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3 sm:p-4"
    >
      <h4 className="text-base font-semibold">{titles[model.variant]}</h4>
      {body}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {zh
          ? "箭頭端點使用上方同一數值示例；動畫僅畫出向量及施工線。每個圖的座標軸採相同單位尺度，但不同圖可能縮放不同。ℝ³ 為等軸投影：不可由螢幕上的長度或夾角判斷三維的長度或夾角。"
          : "Endpoints use the same numerical example above; animation constructs vectors and guides. Axes within each plot have equal unit scale, but plots may use different zoom. ℝ³ is an isometric projection: screen lengths and angles do not measure 3D lengths or angles."}
      </p>
    </section>
  );
}

function EntriesScene({
  example,
  frame,
  lang,
  id,
}: {
  example: EntriesExample;
  frame: KnowledgeFrame;
  lang: "zh" | "en";
  id: string;
}) {
  const zh = lang === "zh";
  const { stage, progress } = entryAnimationFrame(frame);
  const safeFrame = { ...frame, stage, progress };
  const at = (n: number) => entryStageProgress(safeFrame, n);
  const { variant, a, b, result } = example;
  const title = zh
    ? "矩陣元素位置的動畫數值示例"
    : "Animated numerical demo of matrix entry positions";
  const desc = zh
    ? "行索引用藍色，列索引用橙色。元素的位置與顯示會依目前公式步驟變化。中間位置僅為示意。"
    : "Row indices are blue and column indices orange. Entry positions and reveals follow the current equation step. Intermediate positions are illustrative.";
  let body;
  if (variant === "matrix-def") {
    const x = 113,
      y = 87,
      size = 48;
    const move = at(4),
      activeY = y + (1 + move) * size;
    body = (
      <>
        <EntryGrid
          matrix={a}
          x={x}
          y={y}
          size={size}
          label="A · 3 × 2"
          reveal={() => 0.3 + 0.7 * at(0)}
          highlight={(i, j) =>
            j === 1 && i === (stage >= 4 ? 2 : 1) ? at(3) : 0
          }
        />
        <rect
          x={x}
          y={y + size}
          width={2 * size * at(1)}
          height={size}
          rx="8"
          fill={primary}
          fillOpacity=".11"
          stroke={primary}
          strokeOpacity={at(1)}
        />
        <rect
          x={x + size}
          y={y}
          width={size}
          height={3 * size * at(2)}
          rx="8"
          fill={columnColor}
          fillOpacity=".09"
          stroke={columnColor}
          strokeOpacity={at(2)}
        />
        <rect
          x={x + size + 3}
          y={activeY + 3}
          width={size - 6}
          height={size - 6}
          rx="7"
          fill="none"
          stroke={primary}
          strokeWidth="3"
          opacity={at(3)}
        />
        <path
          d={`M${x + 2 * size + 14},${activeY + size / 2}H282`}
          stroke={primary}
          strokeWidth="2"
          markerEnd={`url(#${id}-arrow)`}
          opacity={at(3)}
        />
        <g transform="translate(298 101)">
          <text fontSize="18" fill={primary}>
            {zh ? "行 i" : "Row i"}: {stage >= 4 ? 3 : 2}
          </text>
          <text y="38" fontSize="18" fill={columnColor}>
            {zh ? "列 j" : "Column j"}: 2
          </text>
          <text y="82" fontSize="23" fontWeight="650" opacity={at(3)}>
            a{subscript(stage >= 4 ? 3 : 2)}₂ = {a[stage >= 4 ? 2 : 1][1]}
          </text>
          <text y="126" fontSize="16" opacity={at(5)}>
            m × n = 3 × 2 = 6
          </text>
        </g>
        <text x="280" y="290" textAnchor="middle" fontSize="16">
          {zh ? "aᵢⱼ：先讀行 i，再讀列 j" : "aᵢⱼ: row i first, then column j"}
        </text>
      </>
    );
  } else if (variant === "matrix-add") {
    const k = Math.max(0, Math.min(3, stage - 1)),
      i = Math.floor(k / 2),
      j = k % 2;
    const amount = stage >= 1 && stage <= 4 ? progress : 1;
    const sourceA = entryCellPosition(i + 1, j + 1, 37, 98, 44);
    const sourceB = entryCellPosition(i + 1, j + 1, 215, 98, 44);
    const target = entryCellPosition(i + 1, j + 1, 393, 98, 44);
    const focus = (row: number, column: number) =>
      stage === 0
        ? 0
        : stage === 5
          ? 0.4 * progress
          : row === i && column === j
            ? 0.35 + 0.65 * progress
            : 0;
    body = (
      <>
        <EntryGrid
          matrix={a}
          x={37}
          y={98}
          size={44}
          label="A · 2 × 2"
          highlight={focus}
        />
        <EntryGrid
          matrix={b}
          x={215}
          y={98}
          size={44}
          label="B · 2 × 2"
          highlight={focus}
        />
        <EntryGrid
          matrix={result}
          x={393}
          y={98}
          size={44}
          label="C · 2 × 2"
          highlight={focus}
          reveal={(r, c) => at(1 + r * 2 + c)}
        />
        <text x="170" y="150" fontSize="27" textAnchor="middle">
          +
        </text>
        <text x="348" y="150" fontSize="27" textAnchor="middle">
          =
        </text>
        {stage >= 1 && stage <= 4 && (
          <>
            <path
              d={`M${sourceA.x},${sourceA.y + 22}Q278,242 ${target.x},${target.y + 22}`}
              fill="none"
              stroke={primary}
              strokeWidth="2"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - amount}
              opacity=".65"
              markerEnd={`url(#${id}-arrow)`}
            />
            {[sourceA, sourceB].map((source, index) => {
              const point = entryMotionPoint(source, target, amount);
              return (
                <g
                  key={index}
                  transform={`translate(${point.x} ${point.y})`}
                  opacity={Math.sin(Math.PI * amount)}
                >
                  <rect
                    x="-19"
                    y="-19"
                    width="38"
                    height="38"
                    rx="8"
                    fill="var(--card)"
                    stroke={index ? columnColor : primary}
                    strokeWidth="2"
                  />
                  <text y="7" textAnchor="middle" fontSize="20">
                    {index ? b[i][j] : a[i][j]}
                  </text>
                </g>
              );
            })}
          </>
        )}
        <text
          x="280"
          y="266"
          textAnchor="middle"
          fontSize="20"
          fontWeight="600"
        >
          {stage === 0
            ? "C = A + B"
            : stage === 5
              ? zh
                ? "同位置相加，維度不變"
                : "Same positions, same dimensions"
              : `c${subscript(i + 1)}${subscript(j + 1)} = ${a[i][j]} + (${b[i][j]}) = ${result[i][j]}`}
        </text>
        <text x="280" y="299" textAnchor="middle" fontSize="15">
          {zh
            ? "每一對元素都保留相同的索引 (i,j)"
            : "Each pair keeps the same index (i,j)"}
        </text>
      </>
    );
  } else if (variant === "matrix-transpose") {
    const active = stage === 4 ? { i: 1, j: 2 } : { i: 0, j: 1 };
    const source = entryCellPosition(active.i + 1, active.j + 1, 51, 108, 48);
    const target = entryCellPosition(active.j + 1, active.i + 1, 385, 84, 48);
    const focus = (i: number, j: number) =>
      stage >= 5
        ? 0.45 * progress
        : stage >= 3 && i === active.i && j === active.j
          ? progress
          : 0;
    body = (
      <>
        <EntryGrid
          matrix={a}
          x={51}
          y={108}
          size={48}
          label="A · 2 × 3"
          highlight={focus}
          dim={i => at(i + 1) === 1 && stage < 3}
        />
        <EntryGrid
          matrix={result}
          x={385}
          y={84}
          size={48}
          label="Aᵀ · 3 × 2"
          reveal={(_, j) => at(j + 1)}
          highlight={(i, j) => focus(j, i)}
        />
        <text x="282" y="75" textAnchor="middle" fontSize="17" fill={primary}>
          {zh ? "行 → 列" : "Row → column"}
        </text>
        <path
          d="M232,123H337"
          stroke={primary}
          strokeWidth="2"
          markerEnd={`url(#${id}-arrow)`}
        />
        {a.map((row, i) =>
          row.map((value, j) => {
            const p = at(i + 1);
            if (p <= 0 || p >= 1) return null;
            const point = entryMotionPoint(
              entryCellPosition(i + 1, j + 1, 51, 108, 48),
              entryCellPosition(j + 1, i + 1, 385, 84, 48),
              p
            );
            return (
              <g
                key={`${i},${j}`}
                transform={`translate(${point.x} ${point.y})`}
              >
                <rect
                  x="-19"
                  y="-19"
                  width="38"
                  height="38"
                  rx="8"
                  fill="var(--card)"
                  stroke={i ? columnColor : primary}
                  strokeWidth="2"
                />
                <text y="7" textAnchor="middle" fontSize="21">
                  {value}
                </text>
              </g>
            );
          })
        )}
        {stage >= 3 && stage <= 4 && (
          <path
            d={`M${source.x},${source.y + 23}Q280,264 ${target.x},${target.y + 23}`}
            fill="none"
            stroke={columnColor}
            strokeWidth="2"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - progress}
            markerEnd={`url(#${id}-column-arrow)`}
          />
        )}
        <text
          x="280"
          y="277"
          textAnchor="middle"
          fontSize="19"
          fontWeight="600"
        >
          {stage >= 3 && stage <= 4
            ? `a${subscript(active.i + 1)}${subscript(active.j + 1)} = ${a[active.i][active.j]} → (Aᵀ)${subscript(active.j + 1)}${subscript(active.i + 1)} = ${a[active.i][active.j]}`
            : "(i,j) → (j,i)"}
        </text>
        <text x="280" y="309" textAnchor="middle" fontSize="15">
          {zh
            ? "只交換位置，不改變數值"
            : "Positions swap; values stay unchanged"}
        </text>
      </>
    );
  } else {
    const reveal2 = (i: number, j: number) => (i !== j ? at(1) : at(i + 2));
    const reveal3 = (i: number, j: number) =>
      i !== j ? at(1) : unit(at(4) * 3 - i);
    body = (
      <>
        <EntryGrid
          matrix={a}
          x={85}
          y={110}
          size={48}
          label="I₂ · 2 × 2"
          reveal={reveal2}
          highlight={(i, j) => (i === j ? reveal2(i, j) : 0)}
        />
        <EntryGrid
          matrix={b}
          x={337}
          y={86}
          size={48}
          label="I₃ · 3 × 3"
          reveal={reveal3}
          highlight={(i, j) => (i === j ? reveal3(i, j) : 0)}
        />
        <path
          d="M109,134L157,182"
          pathLength="1"
          stroke={primary}
          strokeWidth="3"
          strokeDasharray="1"
          strokeDashoffset={1 - at(3)}
          opacity=".4"
        />
        <path
          d="M361,110L457,206"
          pathLength="1"
          stroke={primary}
          strokeWidth="3"
          strokeDasharray="1"
          strokeDashoffset={1 - at(4)}
          opacity=".4"
        />
        <text
          x="280"
          y="276"
          textAnchor="middle"
          fontSize="20"
          fontWeight="600"
        >
          {zh ? "主對角線 i = j：1" : "Main diagonal i = j: 1"}
        </text>
        <text x="280" y="307" textAnchor="middle" fontSize="17">
          {zh ? "其餘位置 i ≠ j：0" : "Other positions i ≠ j: 0"}
        </text>
      </>
    );
  }
  return (
    <svg
      viewBox="0 0 560 340"
      width="100%"
      className="block h-auto text-foreground"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      data-variant={variant}
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{desc}</desc>
      <defs>
        {[
          ["arrow", primary],
          ["column-arrow", columnColor],
        ].map(([name, color]) => (
          <marker
            key={name}
            id={`${id}-${name}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0L10,5L0,10z" fill={color} />
          </marker>
        ))}
      </defs>
      <g fill={foreground} fontFamily="inherit">
        {body}
      </g>
    </svg>
  );
}

export default function MatrixEntriesDiagram({
  lang,
  variant = "matrix-def",
}: KnowledgeDiagramProps) {
  const resolved: MatrixEntriesVariant = MATRIX_ENTRIES_VARIANTS.includes(
    variant as MatrixEntriesVariant
  )
    ? (variant as MatrixEntriesVariant)
    : "matrix-def";
  const [preset, setPreset] = useState<EntriesPreset>("card");
  const id = `matrix-entries-${useId().replace(/:/g, "")}`;
  const example = matrixEntriesExample(resolved, preset);
  const zh = lang === "zh";
  const titles = {
    "matrix-def": zh ? "行、列與元素索引" : "Rows, columns and entry indices",
    "matrix-add": zh
      ? "對應位置的矩陣加法"
      : "Addition at corresponding positions",
    "matrix-transpose": zh
      ? "轉置：交換行列索引"
      : "Transpose: swap row and column indices",
    "matrix-identity": zh
      ? "單位矩陣的對角位置"
      : "Diagonal positions of the identity",
  };
  const controls = (
    <>
      <p className="text-xs text-muted-foreground">
        {zh
          ? "以下是確切的小型數值示例，並非任意矩陣的通用證明。"
          : "These are exact small numerical demonstrations, not a general proof for arbitrary matrices."}
      </p>
      {resolved !== "matrix-identity" && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={zh ? "數值示例預設" : "Numerical example presets"}
        >
          {(["card", "signed", "zero"] as const).map(value => (
            <button
              key={value}
              type="button"
              aria-pressed={preset === value}
              onClick={() => setPreset(value)}
              className={`min-h-10 rounded-lg border px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${preset === value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground"}`}
            >
              {value === "card"
                ? zh
                  ? "原卡片示例"
                  : "Card example"
                : value === "signed"
                  ? zh
                    ? "正負數／相消"
                    : "Signed / cancellation"
                  : zh
                    ? "全零示例"
                    : "All-zero example"}
            </button>
          ))}
        </div>
      )}
    </>
  );
  return (
    <AnimatedKnowledgeLesson
      key={`${resolved}:${preset}`}
      lang={lang}
      title={titles[resolved]}
      steps={matrixEntriesSteps(example, lang)}
      controls={controls}
      testId="knowledge-matrix-entries"
    >
      {frame => (
        <div className="space-y-4">
          <GeometryPanel example={example} frame={frame} lang={lang} id={id} />
          <section
            className="space-y-2"
            aria-label={zh ? "元素位置與公式" : "Entry positions and formulas"}
          >
            <h4 className="text-sm font-semibold text-muted-foreground">
              {zh
                ? "對照：行列元素的位置"
                : "Reference: row and column entry positions"}
            </h4>
            <EntriesScene example={example} frame={frame} lang={lang} id={id} />
          </section>
        </div>
      )}
    </AnimatedKnowledgeLesson>
  );
}
