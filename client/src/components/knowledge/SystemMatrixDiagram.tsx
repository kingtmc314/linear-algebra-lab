import { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

type Pair = readonly [number, number];
type Matrix2 = readonly [Pair, Pair];
export type SystemMatrixVariant = "ls-def" | "ls-augmented";
export const SYSTEM_MATRIX_STEP_COUNT = 6;

export const SYSTEM_MATRIX_PRESETS = [
  {
    id: "example",
    zh: "原例",
    en: "Original",
    A: [
      [2, 1],
      [1, 3],
    ],
    b: [5, 10],
  },
  {
    id: "signed",
    zh: "負係數",
    en: "Signed",
    A: [
      [2, -1],
      [-1, 3],
    ],
    b: [-1, 8],
  },
  {
    id: "zero",
    zh: "零係數",
    en: "Zero entries",
    A: [
      [0, 1],
      [2, 0],
    ],
    b: [3, 2],
  },
  {
    id: "dependent",
    zh: "相依方程",
    en: "Dependent",
    A: [
      [2, 1],
      [4, 2],
    ],
    b: [5, 10],
  },
] as const;

export interface ExactFraction {
  numerator: number;
  denominator: number;
}
export interface SystemMatrixModel {
  A: Matrix2;
  b: Pair;
  augmented: readonly [
    readonly [number, number, number],
    readonly [number, number, number],
  ];
  determinant: number;
  kind: "unique" | "infinite" | "none";
  solution: readonly [ExactFraction, ExactFraction] | null;
}

/** Small bounded integer examples keep every displayed fraction exact. */
export function systemMatrixFraction(
  numerator: number,
  denominator: number
): ExactFraction {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    denominator === 0
  ) {
    throw new RangeError(
      "An exact fraction needs safe integers and a nonzero denominator."
    );
  }
  let a = Math.abs(numerator);
  let b = Math.abs(denominator);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  const divisor = a || 1;
  const sign = denominator < 0 ? -1 : 1;
  return {
    numerator: numerator === 0 ? 0 : (sign * numerator) / divisor,
    denominator: Math.abs(denominator) / divisor,
  };
}

export function systemMatrixFractionLatex(value: ExactFraction): string {
  const fraction = systemMatrixFraction(value.numerator, value.denominator);
  return fraction.denominator === 1
    ? String(fraction.numerator)
    : `${fraction.numerator < 0 ? "-" : ""}\\frac{${Math.abs(fraction.numerator)}}{${fraction.denominator}}`;
}

export function createSystemMatrixModel(
  A: Matrix2,
  b: Pair
): SystemMatrixModel {
  const entries = [...A[0], ...A[1], ...b];
  if (
    entries.length !== 6 ||
    entries.some(value => !Number.isSafeInteger(value) || Math.abs(value) > 20)
  ) {
    throw new RangeError(
      "The demo requires integer entries between -20 and 20."
    );
  }
  const [[a, c], [d, e]] = A;
  const [f, g] = b;
  const determinant = a * e - c * d;
  const nonzeroA = A.some(row => row.some(value => value !== 0));
  const inconsistent = !nonzeroA
    ? f !== 0 || g !== 0
    : a * g - d * f !== 0 || c * g - e * f !== 0;
  const kind =
    determinant !== 0 ? "unique" : inconsistent ? "none" : "infinite";
  return {
    A: [
      [a, c],
      [d, e],
    ],
    b: [f, g],
    augmented: [
      [a, c, f],
      [d, e, g],
    ],
    determinant,
    kind,
    solution:
      kind === "unique"
        ? [
            systemMatrixFraction(f * e - c * g, determinant),
            systemMatrixFraction(a * g - f * d, determinant),
          ]
        : null,
  };
}

function equationsLatex(model: SystemMatrixModel): string {
  return String.raw`\begin{cases}${model.A[0][0]}x+(${model.A[0][1]})y=${model.b[0]}\\${model.A[1][0]}x+(${model.A[1][1]})y=${model.b[1]}\end{cases}`;
}
function matrixLatex(model: SystemMatrixModel): string {
  return String.raw`\begin{bmatrix}${model.A[0][0]}&${model.A[0][1]}\\${model.A[1][0]}&${model.A[1][1]}\end{bmatrix}`;
}
function vectorLatex(values: readonly (string | number)[]): string {
  return String.raw`\begin{bmatrix}${values[0]}\\${values[1]}\end{bmatrix}`;
}
export function systemMatrixFinalLatex(model: SystemMatrixModel): string {
  if (model.solution) {
    const [x, y] = model.solution.map(systemMatrixFractionLatex);
    return String.raw`x=${x},\quad y=${y},\qquad ${matrixLatex(model)}${vectorLatex([x, y])}=${vectorLatex(model.b)}`;
  }
  return String.raw`\det(A)=0,\quad A\mathbf{x}=\mathbf{b}\quad\text{${model.kind === "infinite" ? "infinitely many solutions" : "no solution"}}`;
}

export function systemMatrixSteps(
  model: SystemMatrixModel,
  lang: "zh" | "en",
  variant: SystemMatrixVariant = "ls-def"
): DerivationStep[] {
  const zh = lang === "zh";
  const axb = String.raw`${matrixLatex(model)}${vectorLatex(["x", "y"])}=${vectorLatex(model.b)}`;
  const augmented = String.raw`[A\mid\mathbf b]=\left[\begin{array}{cc|c}${model.augmented[0].join("&")}\\${model.augmented[1].join("&")}\end{array}\right]`;
  const verified = model.solution
    ? model.A.map(
        (row, i) =>
          `${row[0]}\\left(${systemMatrixFractionLatex(model.solution![0])}\\right)+(${row[1]})\\left(${systemMatrixFractionLatex(model.solution![1])}\\right)=${model.b[i]}`
      ).join(String.raw`\\`)
    : axb;
  return [
    {
      description: zh
        ? "數值示例：x、y 是未知數。每個方程的係數依 x、y 的固定次序排列；右側是常數。"
        : "Numerical demo: x and y are unknowns. Each equation lists coefficients in the fixed order x, y; its right side is a constant.",
      latex: String.raw`\mathbf{x}=${vectorLatex(["x", "y"])},\qquad ${equationsLatex(model)}`,
    },
    {
      description: zh
        ? "把兩個方程的係數移入 A：一個方程對應一行；第一列對應 x，第二列對應 y。零係數也必須保留位置。"
        : "Move the coefficients into A: one equation per row, x in the first column and y in the second. A zero coefficient still keeps its place.",
      latex: String.raw`A=${matrixLatex(model)}`,
    },
    {
      description: zh
        ? "把右側常數依相同行次序放入 b，並加上分隔線得到增廣矩陣 [A|b]。分隔線不是運算符號。"
        : "Place the constants in b in the same row order. The divider gives the augmented matrix [A|b]; it is not an operation.",
      latex: augmented,
    },
    {
      description: zh
        ? variant === "ls-augmented"
          ? "增廣矩陣儲存 A 和 b，但不把未知數向量當作另一列。把未知數向量放在 A 右側，還原 Ax=b。"
          : "把未知數向量放在 A 右側。矩陣乘法的每一行恰好還原一個方程，所以 Ax=b 與原方程组相同。"
        : variant === "ls-augmented"
          ? "The augmented matrix stores A and b, not an extra column of unknowns. Put the unknown vector to the right of A to recover Ax=b."
          : "Put the unknown vector to the right of A. Each matrix-product row recovers one equation, so Ax=b is the same system.",
      latex: axb,
    },
    {
      description: zh
        ? model.solution
          ? "以精確解逐行檢查：A 的一行乘未知數向量，必須得到 b 中同一行的常數。"
          : "方程相依仍可使用相同的矩陣表示。這一步只檢查行與常數的對應，不假設 A 可逆。"
        : model.solution
          ? "Check the exact solution row by row: a row of A times the unknown vector must equal the constant in the matching row of b."
          : "Dependent equations use the same matrix encoding. Check row-to-constant correspondence without assuming A is invertible.",
      latex: model.solution
        ? String.raw`\begin{aligned}${verified}\end{aligned}`
        : axb,
    },
    {
      description: zh
        ? model.solution
          ? "本例的精確解如式所示；原例為 x=1、y=3，兩者並不相等。動畫只示範表示與驗算，不是任意方程組的求解證明。"
          : "本相依示例有無限多解，沒有唯一的 x、y。增廣矩陣表示仍然有效；奇異矩陣不能直接求逆。"
        : model.solution
          ? "The exact solution is shown below. In the original example x=1 and y=3, not equal values. This demo illustrates encoding and verification, not a general solving proof."
          : "This dependent demo has infinitely many solutions, not a unique x and y. Augmented-matrix encoding remains valid; a singular matrix has no inverse.",
      latex: systemMatrixFinalLatex(model),
    },
  ];
}

function unit(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
function stageProgress(frame: KnowledgeFrame, stage: number): number {
  const current = Number.isFinite(frame.stage)
    ? Math.max(0, Math.min(5, Math.trunc(frame.stage)))
    : 0;
  const p = current < stage ? 0 : current > stage ? 1 : unit(frame.progress);
  return p * p * (3 - 2 * p);
}
function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** The six number tiles follow equation -> augmented -> product coordinates. */
export function systemMatrixGeometry(frame: KnowledgeFrame) {
  const coefficients = stageProgress(frame, 1);
  const constants = stageProgress(frame, 2);
  const product = stageProgress(frame, 3);
  const verification = stageProgress(frame, 4);
  const result = stageProgress(frame, 5);
  const tiles = [0, 1].flatMap(row =>
    [0, 1, 2].map(column => {
      const t = column === 2 ? constants : coefficients;
      const sourceX = [86, 201, 351][column];
      const augmentedX = [215, 275, 351][column];
      const productX = [161, 215, 441][column];
      return {
        row,
        column,
        x: mix(mix(sourceX, augmentedX, t), productX, product),
        y: mix(98 + row * 50, 230 + row * 48, t),
      };
    })
  );
  const row = verification < 0.5 ? 0 : 1;
  const rowProgress = unit(
    verification < 0.5 ? verification * 2 : (verification - 0.5) * 2
  );
  return {
    tiles,
    coefficients,
    constants,
    product,
    verification,
    result,
    bracketLeft: mix(187, 134, product),
    bracketRight: mix(mix(302, 378, constants), 242, product),
    separatorX: 311,
    row,
    rowProgress,
    probeX: mix(161, 441, rowProgress),
    probeY: 230 + row * 48 - Math.sin(rowProgress * Math.PI) * 25,
  };
}

const colors = ["var(--primary)", "var(--chart-4)", "var(--foreground)"];
function bracket(left: number, right: number, top = 205, bottom = 303): string {
  return `M ${left + 9} ${top} H ${left} V ${bottom} H ${left + 9} M ${right - 9} ${top} H ${right} V ${bottom} H ${right - 9}`;
}
function fractionText(value: ExactFraction): string {
  return value.denominator === 1
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
}

export function SystemMatrixScene({
  lang,
  model,
  frame,
}: {
  lang: "zh" | "en";
  model: SystemMatrixModel;
  frame: KnowledgeFrame;
}) {
  const zh = lang === "zh";
  const id = `system-matrix-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const geometry = systemMatrixGeometry(frame);
  const { coefficients, constants, product, verification, result } = geometry;
  const verifyVisible = verification > 0 && model.solution !== null;
  return (
    <svg
      viewBox="0 0 560 380"
      width="100%"
      className="block text-foreground"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      data-testid="system-matrix-svg"
    >
      <title id={`${id}-title`}>
        {zh
          ? "方程、增廣矩陣與 Ax=b 的對應動畫"
          : "Animated correspondence of equations, augmented matrix, and Ax=b"}
      </title>
      <desc id={`${id}-desc`}>
        {zh
          ? "每個方程的 x、y 係數移到同一行的兩列；常數移到分隔線右側，再組成矩陣乘法。原例的精確解為 x=1、y=3。"
          : "The x and y coefficients move to two columns in the matching row; constants move to the right of a divider, then form a matrix product. The original demo has exact solution x=1, y=3."}
      </desc>
      <defs>
        <marker
          id={`${id}-arrow`}
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0 0 L7 3.5 L0 7 Z" fill="var(--primary)" />
        </marker>
      </defs>
      <text x="28" y="30" fontSize="18" fontWeight="600" fill="currentColor">
        {zh ? "方程 · 數值示例" : "Equations · numerical demo"}
      </text>
      <text x="86" y="65" textAnchor="middle" fontSize="16" fill={colors[0]}>
        {zh ? "x 係數" : "x coeff."}
      </text>
      <text x="201" y="65" textAnchor="middle" fontSize="16" fill={colors[1]}>
        {zh ? "y 係數" : "y coeff."}
      </text>
      <text
        x="351"
        y="65"
        textAnchor="middle"
        fontSize="16"
        fill="currentColor"
      >
        {zh ? "常數" : "constant"}
      </text>
      {[0, 1].map(row => (
        <g key={row}>
          <rect
            x="27"
            y={77 + row * 50}
            width="359"
            height="42"
            rx="8"
            fill="var(--secondary)"
            stroke="var(--border)"
          />
          <text
            x="43"
            y={104 + row * 50}
            fontSize="14"
            fill="var(--muted-foreground)"
          >
            {row + 1}
          </text>
          <text x="113" y={105 + row * 50} fontSize="22" fill="currentColor">
            x
          </text>
          <text x="155" y={105 + row * 50} fontSize="22" fill="currentColor">
            +
          </text>
          <text x="228" y={105 + row * 50} fontSize="22" fill="currentColor">
            y
          </text>
          <text x="289" y={105 + row * 50} fontSize="22" fill="currentColor">
            =
          </text>
          {model.augmented[row].map((value, column) => (
            <text
              key={column}
              x={[86, 201, 351][column]}
              y={105 + row * 50}
              textAnchor="middle"
              fontSize="20"
              fill={colors[column]}
              opacity={column === 2 ? constants * 0.3 : coefficients * 0.3}
            >
              {value < 0 ? `(${value})` : value}
            </text>
          ))}
        </g>
      ))}
      <g opacity={coefficients}>
        {[0, 1].map(row => (
          <rect
            key={row}
            x="126"
            y={211 + row * 48}
            width="347"
            height="38"
            rx="6"
            fill="var(--secondary)"
            opacity={verifyVisible && geometry.row === row ? 1 : 0.4}
          />
        ))}
        <path
          d={bracket(geometry.bracketLeft, geometry.bracketRight)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1={geometry.separatorX}
          x2={geometry.separatorX}
          y1="209"
          y2="299"
          stroke="currentColor"
          strokeWidth="2"
          opacity={constants * (1 - product)}
        />
        <text
          x={mix(245, 188, product)}
          y="194"
          textAnchor="middle"
          fontSize="18"
          fill="currentColor"
        >
          A
        </text>
        <text
          x={mix(351, 441, product)}
          y="194"
          textAnchor="middle"
          fontSize="18"
          fill="currentColor"
          opacity={constants}
        >
          b
        </text>
        <text
          x="405"
          y="258"
          fontSize="16"
          fill="var(--muted-foreground)"
          opacity={constants * (1 - product)}
        >
          [A | b]
        </text>
      </g>
      <g opacity={product}>
        <path
          d={bracket(277, 330)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d={bracket(414, 468)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text
          x="305"
          y="194"
          textAnchor="middle"
          fontSize="18"
          fill="currentColor"
        >
          {zh ? "未知數" : "unknowns"}
        </text>
        <text
          x="369"
          y="260"
          fontSize="25"
          textAnchor="middle"
          fill="currentColor"
        >
          =
        </text>
        {["x", "y"].map((symbol, row) => (
          <g key={symbol}>
            <text
              x="305"
              y={237 + row * 48}
              fontSize="22"
              textAnchor="middle"
              fill="currentColor"
              opacity={model.solution ? 1 - result : 1}
            >
              {symbol}
            </text>
            {model.solution && (
              <text
                x="305"
                y={237 + row * 48}
                fontSize="22"
                textAnchor="middle"
                fill="var(--primary)"
                opacity={result}
              >
                {fractionText(model.solution[row])}
              </text>
            )}
          </g>
        ))}
      </g>
      {geometry.tiles.map(tile => (
        <g
          key={`${tile.row}-${tile.column}`}
          data-testid={`system-tile-${tile.row}-${tile.column}`}
          transform={`translate(${tile.x} ${tile.y})`}
        >
          <rect
            x="-23"
            y="-18"
            width="46"
            height="36"
            rx="7"
            fill="var(--card)"
            stroke={colors[tile.column]}
            strokeWidth="1.8"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="21"
            fontWeight="600"
            fill={colors[tile.column]}
          >
            {model.augmented[tile.row][tile.column] < 0 &&
            (tile.column === 2 ? constants : coefficients) === 0
              ? `(${model.augmented[tile.row][tile.column]})`
              : model.augmented[tile.row][tile.column]}
          </text>
        </g>
      ))}
      {verifyVisible && (
        <g opacity={verification}>
          <path
            d={`M 245 ${230 + geometry.row * 48} Q 348 ${184 + geometry.row * 48} 410 ${230 + geometry.row * 48}`}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd={`url(#${id}-arrow)`}
          />
          {result === 0 && (
            <circle
              cx={geometry.probeX}
              cy={geometry.probeY}
              r="4"
              fill="var(--primary)"
            />
          )}
          <text
            x="280"
            y="332"
            textAnchor="middle"
            fontSize="18"
            fill="currentColor"
          >
            {model.A[geometry.row][0]}({fractionText(model.solution![0])}) + (
            {model.A[geometry.row][1]})({fractionText(model.solution![1])}) ={" "}
            {model.b[geometry.row]}
          </text>
        </g>
      )}
      <text
        x="280"
        y="362"
        textAnchor="middle"
        fontSize="18"
        fontWeight="600"
        fill="var(--primary)"
        opacity={result}
      >
        {model.solution
          ? `x = ${fractionText(model.solution[0])}, y = ${fractionText(model.solution[1])}`
          : zh
            ? "相依方程：沒有唯一解"
            : "Dependent equations: no unique solution"}
      </text>
    </svg>
  );
}

export default function SystemMatrixDiagram({
  lang,
  variant = "ls-def",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [presetId, setPresetId] = useState<string>("example");
  const preset =
    SYSTEM_MATRIX_PRESETS.find(item => item.id === presetId) ??
    SYSTEM_MATRIX_PRESETS[0];
  const model = createSystemMatrixModel(preset.A, preset.b);
  const mode: SystemMatrixVariant =
    variant === "ls-augmented" ? "ls-augmented" : "ls-def";
  return (
    <AnimatedKnowledgeLesson
      key={`${mode}:${preset.id}:${lang}`}
      lang={lang}
      title={
        zh
          ? mode === "ls-augmented"
            ? "方程如何編成增廣矩陣"
            : "從方程到 Ax=b"
          : mode === "ls-augmented"
            ? "Encoding an augmented matrix"
            : "From equations to Ax=b"
      }
      steps={systemMatrixSteps(model, lang, mode)}
      testId="knowledge-system-matrix"
      controls={
        <div className="space-y-2">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={zh ? "數值示例預設" : "Numerical demo presets"}
          >
            {SYSTEM_MATRIX_PRESETS.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={preset.id === item.id}
                onClick={() => setPresetId(item.id)}
                className={`min-h-10 rounded-lg border px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${preset.id === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}
              >
                {zh ? item.zh : item.en}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {zh
              ? "固定次序：第一列是 x，第二列是 y。預設是不同的數值示例，不是互相等價的列變換。"
              : "Fixed order: first column x, second column y. Presets are different numerical demos, not equivalent row operations."}
          </p>
        </div>
      }
    >
      {frame => <SystemMatrixScene lang={lang} model={model} frame={frame} />}
    </AnimatedKnowledgeLesson>
  );
}
