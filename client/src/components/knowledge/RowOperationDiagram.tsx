import React, { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
} from "./AnimatedKnowledgeLesson";

export type EquationRow = readonly [number, number, number];
export type RowPoint = readonly [number, number];
export interface RowBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
export type RowPresetId = "example" | "negative" | "dependent";
export interface RowPreset {
  id: RowPresetId;
  first: EquationRow;
  second: EquationRow;
}
export const ROW_OPERATION_PRESETS: readonly RowPreset[] = [
  { id: "example", first: [2, 1, 5], second: [1, 3, 10] },
  { id: "negative", first: [-2, -1, -5], second: [1, 3, 10] },
  { id: "dependent", first: [2, 1, 5], second: [1, 1 / 2, 5 / 2] },
];
export const ROW_OPERATION_STEP_COUNT = 6;
const EPSILON = 1e-10;
const PLOT_BOUNDS: RowBounds = { minX: -1, maxX: 6, minY: -1, maxY: 6 };

function assertFinite(values: readonly number[]) {
  if (!values.every(Number.isFinite)) {
    throw new RangeError("Row-operation values must be finite.");
  }
}

/** Add a multiple of a DIFFERENT, unchanged source row to the target row. */
export function replaceEquationRow(
  source: EquationRow,
  target: EquationRow,
  multiple: number
): EquationRow {
  assertFinite([...source, ...target, multiple]);
  const row: EquationRow = [
    target[0] + multiple * source[0],
    target[1] + multiple * source[1],
    target[2] + multiple * source[2],
  ];
  assertFinite(row);
  return row;
}

export function eliminateFirstEntry(first: EquationRow, second: EquationRow) {
  assertFinite([...first, ...second]);
  if (Math.abs(first[0]) < EPSILON) {
    return { kind: "zero-pivot" as const, multiple: null, row: second };
  }
  const multiple = -second[0] / first[0];
  return {
    kind: "eliminated" as const,
    multiple,
    row: replaceEquationRow(first, second, multiple),
  };
}

export type RowSolution =
  | { kind: "unique"; point: RowPoint }
  | { kind: "infinite" }
  | { kind: "none" };

/** Classify zero rows too; never divide by a missing pivot. */
export function solveRowSystem(
  first: EquationRow,
  second: EquationRow
): RowSolution {
  assertFinite([...first, ...second]);
  const [a, b, c] = first;
  const [d, e, f] = second;
  const determinant = a * e - b * d;
  assertFinite([determinant, a * f - c * d, b * f - c * e]);
  if (Math.abs(determinant) >= EPSILON) {
    const point: RowPoint = [
      (c * e - b * f) / determinant,
      (a * f - c * d) / determinant,
    ];
    assertFinite(point);
    return { kind: "unique", point };
  }
  const contradictoryZeroRow = ([x, y, constant]: EquationRow) =>
    Math.abs(x) < EPSILON &&
    Math.abs(y) < EPSILON &&
    Math.abs(constant) >= EPSILON;
  if (
    contradictoryZeroRow(first) ||
    contradictoryZeroRow(second) ||
    Math.abs(a * f - c * d) >= EPSILON ||
    Math.abs(b * f - c * e) >= EPSILON
  )
    return { kind: "none" };
  return { kind: "infinite" };
}

/** Clip ax+by=c without slope division: vertical, horizontal and zero rows are safe. */
export function clipEquationLine(
  row: EquationRow,
  bounds: RowBounds
): readonly [RowPoint, RowPoint] | null {
  assertFinite([...row, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]);
  if (bounds.minX >= bounds.maxX || bounds.minY >= bounds.maxY) {
    throw new RangeError("Line bounds must have positive width and height.");
  }
  const [a, b, c] = row;
  if (Math.abs(a) < EPSILON && Math.abs(b) < EPSILON) return null;
  const points: RowPoint[] = [];
  const add = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (
      x < bounds.minX - EPSILON ||
      x > bounds.maxX + EPSILON ||
      y < bounds.minY - EPSILON ||
      y > bounds.maxY + EPSILON
    )
      return;
    if (!points.some(p => Math.hypot(p[0] - x, p[1] - y) < EPSILON))
      points.push([x, y]);
  };
  if (Math.abs(b) >= EPSILON) {
    add(bounds.minX, (c - a * bounds.minX) / b);
    add(bounds.maxX, (c - a * bounds.maxX) / b);
  }
  if (Math.abs(a) >= EPSILON) {
    add((c - b * bounds.minY) / a, bounds.minY);
    add((c - b * bounds.maxY) / a, bounds.maxY);
  }
  if (points.length < 2) return null;
  return [points[0], points[1]];
}

function boundedProgress(progress: number) {
  return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
}

/** One clock drives the exact row replacement and its equation-line geometry. */
export function rowOperationFrame(
  preset: RowPreset,
  stage: number,
  progress: number
) {
  const safeStage = Number.isFinite(stage)
    ? Math.max(0, Math.min(5, Math.floor(stage)))
    : 0;
  const p = boundedProgress(progress);
  const elimination = eliminateFirstEntry(preset.first, preset.second);
  const amount = safeStage < 2 ? 0 : safeStage === 2 ? p : 1;
  const currentRow = replaceEquationRow(
    preset.first,
    preset.second,
    (elimination.multiple ?? 0) * amount
  );
  const solution = solveRowSystem(preset.first, preset.second);
  return {
    stage: safeStage,
    progress: p,
    amount,
    currentRow,
    targetRow: elimination.row,
    multiple: elimination.multiple,
    segment: clipEquationLine(currentRow, PLOT_BOUNDS),
    yReveal:
      solution.kind === "unique"
        ? safeStage < 3
          ? 0
          : safeStage === 3
            ? p
            : 1
        : 0,
    xReveal:
      solution.kind === "unique"
        ? safeStage < 4
          ? 0
          : safeStage === 4
            ? p
            : 1
        : 0,
    solution,
  };
}

/** These demos use only integers and halves, so labels never show rounded decimals. */
export function rowExactNumber(value: number, latex = true): string {
  assertFinite([value]);
  if (Number.isInteger(value)) return String(Object.is(value, -0) ? 0 : value);
  if (!Number.isInteger(value * 2))
    throw new RangeError("Demo labels require integers or exact halves.");
  const sign = value < 0 ? "-" : "";
  return latex
    ? `${sign}\\frac{${Math.abs(value * 2)}}{2}`
    : `${sign}${Math.abs(value * 2)}/2`;
}

function matrixLatex(first: EquationRow, second: EquationRow) {
  return String.raw`\left[\begin{array}{cc|c}${first.map(n => rowExactNumber(n)).join("&")}\\${second.map(n => rowExactNumber(n)).join("&")}\end{array}\right]`;
}

export function rowOperationSteps(
  lang: "zh" | "en",
  presetId: RowPresetId = "example",
  variant = "ls-row-ops"
): DerivationStep[] {
  const zh = lang === "zh";
  const preset =
    ROW_OPERATION_PRESETS.find(item => item.id === presetId) ??
    ROW_OPERATION_PRESETS[0];
  const result = eliminateFirstEntry(preset.first, preset.second);
  const m = result.multiple ?? 0;
  const operation = String.raw`R_2\leftarrow R_2${m < 0 ? "-" : "+"}${rowExactNumber(Math.abs(m))}R_1`;
  const dependent = preset.id === "dependent";
  const original =
    preset.id === "negative"
      ? String.raw`\begin{cases}-2x-y=-5\\x+3y=10\end{cases}`
      : dependent
        ? String.raw`\begin{cases}2x+y=5\\x+\frac12y=\frac52\end{cases}`
        : String.raw`\begin{cases}2x+y=5\\x+3y=10\end{cases}`;
  const firstX = rowExactNumber(preset.first[0]);
  const descriptions = zh
    ? [
        "數值示範：每行代表一條方程。藍線與橙線都通過 (1,3)；不是任意方程組的通用證明。",
        variant === "ls-gaussian"
          ? `選第一行的非零主元 ${firstX}，計算消去第二行 x 係數所需的倍數。`
          : "將另一行的倍數加到第二行；第一行保持不變。此操作可逆，所以保留整個解集。",
        "同時更新第二行的兩個係數和常數。橙線隨行組合轉動，(1,3) 始終不動；虛線是原第二行。",
        dependent
          ? "第二行變為 0=0，沒有新的限制；不可除以零來回代。"
          : "得到行階梯形式；由第二行的非零主元回代，求得 y=3。",
        dependent
          ? "只剩第一行的限制。整條藍線都是解，可令 x=t，y=5−2t。"
          : "把 y=3 代回未改變的第一行，得到 x=1。垂直與水平輔助線定位共同交點。",
        dependent
          ? "解集仍為整條直線，而非唯一點。(1,3) 只是其中一個示例解。"
          : "精確解為 (x,y)=(1,3)。代回原方程驗證，行變換前後的共同解完全相同。",
      ]
    : [
        "Numerical demo: each row is an equation. Both lines contain (1,3); this example is not a general proof.",
        variant === "ls-gaussian"
          ? `Choose the nonzero first pivot ${firstX}; compute the multiple that eliminates the second x coefficient.`
          : "Add a multiple of the unchanged first row to the second. The operation is reversible, so the whole solution set is preserved.",
        "Update both coefficients AND the constant. The orange line rotates through the fixed point (1,3); the dashed line is the original second row.",
        dependent
          ? "The second row becomes 0=0 and adds no constraint. Do not divide by zero to back-substitute."
          : "The matrix is in row echelon form. Back-substitute using the second nonzero pivot to get y=3.",
        dependent
          ? "Only the first constraint remains. The entire blue line is the solution set: x=t, y=5-2t."
          : "Substitute y=3 into the unchanged first equation to get x=1. The guides locate the common intersection.",
        dependent
          ? "The solution set is still the whole line, not one point. (1,3) is just one sample solution."
          : "The exact solution is (x,y)=(1,3). Check both original equations: row replacement preserved their common solution.",
      ];
  const equations = [
    String.raw`${original}\quad [A\mid b]=${matrixLatex(preset.first, preset.second)}`,
    String.raw`m=-\frac{a_{21}}{a_{11}}=${rowExactNumber(m)},\qquad ${operation}`,
    String.raw`${matrixLatex(preset.first, preset.second)}\xrightarrow{${operation}}${matrixLatex(preset.first, result.row)}`,
    dependent
      ? String.raw`0x+0y=0\quad\Longrightarrow\quad 0=0`
      : String.raw`\frac52 y=\frac{15}{2}\quad\Longrightarrow\quad y=\frac{15/2}{5/2}=3`,
    dependent
      ? String.raw`2x+y=5\quad\Longrightarrow\quad (x,y)=(t,5-2t),\ t\in\mathbb R`
      : preset.id === "negative"
        ? String.raw`-2x-3=-5\quad\Longrightarrow\quad x=1`
        : String.raw`2x+3=5\quad\Longrightarrow\quad x=1`,
    dependent
      ? String.raw`\mathcal S_{\rm before}=\mathcal S_{\rm after}=\{(t,5-2t):t\in\mathbb R\}`
      : preset.id === "negative"
        ? String.raw`(x,y)=(1,3),\quad -2(1)-3=-5,\quad 1+3(3)=10`
        : String.raw`(x,y)=(1,3),\quad 2(1)+3=5,\quad 1+3(3)=10`,
  ];
  return equations.map((latex, index) => ({
    description: descriptions[index],
    latex,
  }));
}

function plotPoint([x, y]: RowPoint): RowPoint {
  return [294 + (x + 1) * 32, 282 - (y + 1) * 32];
}
function lineCoordinates(segment: readonly [RowPoint, RowPoint]) {
  const start = plotPoint(segment[0]);
  const end = plotPoint(segment[1]);
  return { x1: start[0], y1: start[1], x2: end[0], y2: end[1] };
}

export default function RowOperationDiagram({
  lang,
  variant = "ls-row-ops",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [presetId, setPresetId] = useState<RowPresetId>("example");
  const preset =
    ROW_OPERATION_PRESETS.find(item => item.id === presetId) ??
    ROW_OPERATION_PRESETS[0];
  const id = useId().replace(/:/g, "");
  const steps = rowOperationSteps(lang, presetId, variant);
  const firstSegment = clipEquationLine(preset.first, PLOT_BOUNDS);
  const originalSegment = clipEquationLine(preset.second, PLOT_BOUNDS);
  const solutionPoint = plotPoint([1, 3]);
  const dependent = presetId === "dependent";
  const labels = zh
    ? ["標準示例", "負主元", "相依行（零行）"]
    : ["Standard demo", "Negative pivot", "Dependent rows"];
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${presetId}`}
      lang={lang}
      title={
        zh
          ? variant === "ls-gaussian"
            ? "消去與回代：解集不變"
            : "行組合：交點保持不動"
          : variant === "ls-gaussian"
            ? "Eliminate and back-substitute"
            : "Row replacement keeps the intersection"
      }
      steps={steps}
      testId="knowledge-row-operations"
      controls={
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={zh ? "行變換示例" : "Row-operation demos"}
        >
          {ROW_OPERATION_PRESETS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={presetId === item.id}
              onClick={() => setPresetId(item.id)}
              className={`min-h-10 rounded-lg border px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${presetId === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}
            >
              {labels[index]}
            </button>
          ))}
        </div>
      }
    >
      {({ stage, progress }) => {
        const frame = rowOperationFrame(preset, stage, progress);
        const p = frame.progress;
        const amount = frame.amount;
        const originalOpacity = frame.stage === 0 ? 0 : 0.35;
        const currentOpacity = frame.stage === 0 ? 0.25 + 0.75 * p : 1;
        const opText = `R₂ ← R₂ ${frame.multiple !== null && frame.multiple < 0 ? "−" : "+"} ½ R₁`;
        const targetLabel = dependent
          ? zh
            ? "R₂′: 0 = 0（無直線）"
            : "R₂′: 0 = 0 (no line)"
          : "R₂′: (5/2)y = 15/2";
        const currentLabel =
          frame.stage < 2
            ? dependent
              ? "R₂: x + y/2 = 5/2"
              : "R₂: x + 3y = 10"
            : frame.stage === 2 && p < 1
              ? zh
                ? "R₂(t)：行組合中的示意線"
                : "R₂(t): intermediate row"
              : targetLabel;
        return (
          <div className="text-foreground">
            <svg
              viewBox="0 0 560 352"
              width="100%"
              className="block h-auto"
              role="img"
              aria-labelledby={`${id}-title ${id}-desc`}
              data-row-amount={amount}
            >
              <title id={`${id}-title`}>
                {zh
                  ? "行變換的矩陣與直線同步圖解"
                  : "Synchronized row-operation matrix and equation lines"}
              </title>
              <desc id={`${id}-desc`}>
                {zh
                  ? "第一行不變；第二行加上第一行的倍數，矩陣數值改變，橙線轉動但示例解 (1,3) 固定。零行不畫成直線。"
                  : "The first row stays fixed. The second row receives its multiple; entries change and the orange line rotates while the sample solution (1,3) remains fixed. A zero row is not drawn as a line."}
              </desc>
              <defs>
                <clipPath id={`${id}-clip`}>
                  <rect x="294" y="58" width="224" height="224" />
                </clipPath>
                <marker
                  id={`${id}-arrow`}
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
              <text
                x="18"
                y="28"
                fontSize="16"
                fontWeight="600"
                fill="currentColor"
              >
                {zh ? "增廣矩陣 [A|b]" : "Augmented matrix [A|b]"}
              </text>
              <text
                x="284"
                y="28"
                fontSize="16"
                fontWeight="600"
                fill="currentColor"
              >
                {zh ? "同一解集 · 數值示範" : "Same solution set · demo"}
              </text>
              <rect
                x="12"
                y="46"
                width="252"
                height="288"
                rx="12"
                fill="var(--secondary)"
                stroke="var(--border)"
              />
              <rect
                x="278"
                y="46"
                width="270"
                height="288"
                rx="12"
                fill="var(--background)"
                stroke="var(--border)"
              />
              {["x", "y", "b"].map((label, col) => (
                <text
                  key={label}
                  x={[70, 138, 216][col]}
                  y="69"
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--muted-foreground)"
                >
                  {label}
                </text>
              ))}
              <path
                d="M 45 81 H 37 V 166 H 45 M 239 81 H 247 V 166 H 239"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="180"
                y1="81"
                x2="180"
                y2="166"
                stroke="var(--muted-foreground)"
              />
              <rect
                x="49"
                y="83"
                width="41"
                height="34"
                rx="7"
                fill="var(--primary)"
                opacity={frame.stage === 1 ? 0.12 + 0.18 * p : 0.1}
              />
              <rect
                x="47"
                y="128"
                width="189"
                height="35"
                rx="7"
                fill="#d97706"
                opacity={
                  frame.stage >= 2
                    ? 0.1 + 0.08 * (frame.stage === 2 ? p : 1)
                    : 0.04
                }
              />
              {preset.first.map((n, col) => (
                <text
                  key={`first-${col}`}
                  x={[70, 138, 216][col]}
                  y="106"
                  textAnchor="middle"
                  fontSize="20"
                  fontWeight="600"
                  fill="var(--primary)"
                >
                  {rowExactNumber(n, false)}
                </text>
              ))}
              {preset.second.map((n, col) => (
                <g key={`second-${col}`} data-cell={col}>
                  <text
                    x={[70, 138, 216][col]}
                    y={151 - 14 * amount}
                    textAnchor="middle"
                    fontSize="20"
                    fill="#b45309"
                    opacity={1 - amount}
                  >
                    {rowExactNumber(n, false)}
                  </text>
                  <text
                    x={[70, 138, 216][col]}
                    y={151 + 14 * (1 - amount)}
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="600"
                    fill="#b45309"
                    opacity={amount}
                  >
                    {rowExactNumber(frame.targetRow[col], false)}
                  </text>
                  {frame.stage === 2 && (
                    <text
                      x={[70, 138, 216][col]}
                      y={108 + 39 * p}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#b45309"
                      opacity={Math.sin(Math.PI * p)}
                    >
                      {rowExactNumber(
                        (frame.multiple ?? 0) * preset.first[col],
                        false
                      )}
                    </text>
                  )}
                </g>
              ))}
              <text
                x="138"
                y="190"
                textAnchor="middle"
                fontSize="17"
                fontWeight="600"
                fill="currentColor"
              >
                {frame.stage === 0
                  ? zh
                    ? "每行 = 一條方程"
                    : "Each row = one equation"
                  : opText}
              </text>
              {frame.stage <= 2 ? (
                preset.second.map((n, col) => {
                  const change = (frame.multiple ?? 0) * preset.first[col];
                  const reveal =
                    frame.stage < 2
                      ? 0.4
                      : Math.max(0.4, Math.min(1, p * 3 - col + 0.4));
                  return (
                    <text
                      key={`arithmetic-${col}`}
                      x="28"
                      y={222 + col * 29}
                      fontSize="16"
                      fill="currentColor"
                      opacity={reveal}
                    >{`${rowExactNumber(n, false)} ${change < 0 ? "−" : "+"} ${rowExactNumber(Math.abs(change), false)} = ${rowExactNumber(frame.targetRow[col], false)}`}</text>
                  );
                })
              ) : (
                <g>
                  <text x="28" y="224" fontSize="17" fill="#b45309">
                    {dependent ? "0 = 0" : "(5/2)y = 15/2 → y = 3"}
                  </text>
                  <text
                    x="28"
                    y="258"
                    fontSize="17"
                    fill="var(--primary)"
                    opacity={frame.stage === 3 ? 0 : frame.stage === 4 ? p : 1}
                  >
                    {dependent
                      ? "x = t,  y = 5 − 2t"
                      : presetId === "negative"
                        ? "−2x − 3 = −5 → x = 1"
                        : "2x + 3 = 5 → x = 1"}
                  </text>
                  <text
                    x="28"
                    y="296"
                    fontSize="15"
                    fontWeight="600"
                    fill="currentColor"
                    opacity={frame.stage === 5 ? p : 0}
                  >
                    {dependent
                      ? zh
                        ? "整條藍線都是解"
                        : "Every point on the blue line"
                      : "(x, y) = (1, 3)"}
                  </text>
                </g>
              )}
              <g clipPath={`url(#${id}-clip)`}>
                {Array.from({ length: 8 }, (_, i) => i - 1).map(n => (
                  <g key={`grid-${n}`} stroke="var(--border)" strokeWidth="0.8">
                    <line
                      x1={plotPoint([n, -1])[0]}
                      y1="58"
                      x2={plotPoint([n, 6])[0]}
                      y2="282"
                    />
                    <line
                      x1="294"
                      y1={plotPoint([-1, n])[1]}
                      x2="518"
                      y2={plotPoint([6, n])[1]}
                    />
                  </g>
                ))}
                <g stroke="currentColor" opacity="0.55">
                  <line
                    x1="294"
                    y1="250"
                    x2="517"
                    y2="250"
                    markerEnd={`url(#${id}-arrow)`}
                  />
                  <line
                    x1="326"
                    y1="282"
                    x2="326"
                    y2="59"
                    markerEnd={`url(#${id}-arrow)`}
                  />
                </g>
                {originalSegment && (
                  <line
                    {...lineCoordinates(originalSegment)}
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    opacity={originalOpacity}
                  />
                )}
                {firstSegment && (
                  <line
                    {...lineCoordinates(firstSegment)}
                    stroke="var(--primary)"
                    strokeWidth={dependent && frame.stage >= 3 ? 4 + p : 3}
                    opacity={currentOpacity}
                  />
                )}
                {frame.segment && (
                  <line
                    {...lineCoordinates(frame.segment)}
                    stroke="#d97706"
                    strokeWidth="3"
                    opacity={currentOpacity}
                    data-testid="row-operation-moving-line"
                  />
                )}
                <line
                  x1="326"
                  y1={solutionPoint[1]}
                  x2={326 + (solutionPoint[0] - 326) * frame.yReveal}
                  y2={solutionPoint[1]}
                  stroke="#b45309"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  opacity={frame.yReveal}
                />
                <line
                  x1={solutionPoint[0]}
                  y1="250"
                  x2={solutionPoint[0]}
                  y2={250 + (solutionPoint[1] - 250) * frame.xReveal}
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  opacity={frame.xReveal}
                />
                <circle
                  cx={solutionPoint[0]}
                  cy={solutionPoint[1]}
                  r={frame.stage === 5 ? 7 + 7 * p : 9}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  opacity={frame.stage === 5 ? p : 0.4}
                />
                <circle
                  cx={solutionPoint[0]}
                  cy={solutionPoint[1]}
                  r="4.5"
                  fill="var(--foreground)"
                  stroke="var(--background)"
                  strokeWidth="1.5"
                  data-testid="row-operation-fixed-solution"
                />
              </g>
              {[1, 3, 5].map(n => (
                <g
                  key={`tick-${n}`}
                  fill="var(--muted-foreground)"
                  fontSize="12"
                >
                  <text x={plotPoint([n, 0])[0]} y="266" textAnchor="middle">
                    {n}
                  </text>
                  <text x="319" y={plotPoint([0, n])[1] + 4} textAnchor="end">
                    {n}
                  </text>
                </g>
              ))}
              <text x="522" y="254" fontSize="14" fill="currentColor">
                x
              </text>
              <text x="330" y="57" fontSize="14" fill="currentColor">
                y
              </text>
              <rect
                x="369"
                y="143"
                width="69"
                height="21"
                rx="5"
                fill="var(--background)"
                opacity="0.95"
              />
              <text
                x="374"
                y="158"
                fontSize="14"
                fontWeight="600"
                fill="currentColor"
              >
                (1, 3)
              </text>
              <text x="290" y="308" fontSize="14" fill="#b45309">
                {currentLabel}
              </text>
              <text
                x="290"
                y="326"
                fontSize="12"
                fill="var(--muted-foreground)"
              >
                {dependent
                  ? zh
                    ? "固定示例點 ≠ 唯一解"
                    : "Fixed sample point ≠ unique solution"
                  : zh
                    ? "共同交點固定；不是改換方程組"
                    : "Fixed intersection; equivalent systems"}
              </text>
            </svg>
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <span>
                <span className="mr-1 inline-block h-0.5 w-4 bg-primary align-middle" />
                {zh ? "R₁：保持不變" : "R₁: unchanged"}
              </span>
              <span>
                <span className="mr-1 inline-block h-0.5 w-4 bg-amber-600 align-middle" />
                {zh ? "R₂：當前行組合" : "R₂: current combination"}
              </span>
              <span>{zh ? "虛線：原 R₂" : "Dashed: original R₂"}</span>
            </div>
          </div>
        );
      }}
    </AnimatedKnowledgeLesson>
  );
}
