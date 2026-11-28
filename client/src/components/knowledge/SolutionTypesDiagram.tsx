import { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

export type EquationRow = readonly [number, number, number];
export type TwoEquationSystem = readonly [EquationRow, EquationRow];
export type SolutionKind = "unique" | "infinite" | "none";
export interface ExactFraction {
  numerator: number;
  denominator: number;
}
export interface SolutionClassification {
  kind: SolutionKind;
  rankA: number;
  rankAugmented: number;
  determinant: number;
  exactPoint: readonly [ExactFraction, ExactFraction] | null;
  point: readonly [number, number] | null;
}

function fraction(numerator: number, denominator: number): ExactFraction {
  let a = Math.abs(numerator);
  let b = Math.abs(denominator);
  while (b !== 0) [a, b] = [b, a % b];
  const divisor = a || 1;
  const sign = denominator < 0 ? -1 : 1;
  return {
    numerator: (sign * numerator) / divisor || 0,
    denominator: (sign * denominator) / divisor,
  };
}

/** Exact rank decisions for bounded integer examples, including zero equations. */
export function classifySolutionSystem(
  rows: TwoEquationSystem
): SolutionClassification {
  if (
    rows.length !== 2 ||
    rows.some(
      row =>
        row.length !== 3 ||
        row.some(
          value => !Number.isSafeInteger(value) || Math.abs(value) > 1000
        )
    )
  ) {
    throw new RangeError(
      "Use two rows of three integers between -1000 and 1000."
    );
  }
  const [[a, b, c], [d, e, f]] = rows;
  const determinant = a * e - b * d;
  const rankA = determinant !== 0 ? 2 : a || b || d || e ? 1 : 0;
  const augmentedMinor = a * f - c * d;
  const otherMinor = b * f - c * e;
  const rankAugmented =
    determinant !== 0 || augmentedMinor !== 0 || otherMinor !== 0
      ? 2
      : rows.some(row => row.some(value => value !== 0))
        ? 1
        : 0;
  const kind: SolutionKind =
    rankA < rankAugmented ? "none" : rankA === 2 ? "unique" : "infinite";
  const exactPoint =
    kind === "unique"
      ? ([
          fraction(c * e - b * f, determinant),
          fraction(a * f - c * d, determinant),
        ] as const)
      : null;
  return {
    kind,
    rankA,
    rankAugmented,
    determinant,
    exactPoint,
    point: exactPoint
      ? [
          exactPoint[0].numerator / exactPoint[0].denominator,
          exactPoint[1].numerator / exactPoint[1].denominator,
        ]
      : null,
  };
}

export const SOLUTION_TYPES_PRESETS = {
  unique: {
    rows: [
      [2, 1, 5],
      [1, 3, 10],
    ],
    echelon: [
      [2, 1, 5],
      [0, 5, 15],
    ],
    rowOperation: String.raw`R_2\leftarrow 2R_2-R_1`,
    labels: ["2x + y = 5", "x + 3y = 10"],
  },
  infinite: {
    rows: [
      [1, 1, 2],
      [2, 2, 4],
    ],
    echelon: [
      [1, 1, 2],
      [0, 0, 0],
    ],
    rowOperation: String.raw`R_2\leftarrow R_2-2R_1`,
    labels: ["x + y = 2", "2x + 2y = 4"],
  },
  none: {
    rows: [
      [1, 1, 2],
      [2, 2, 5],
    ],
    echelon: [
      [1, 1, 2],
      [0, 0, 1],
    ],
    rowOperation: String.raw`R_2\leftarrow R_2-2R_1`,
    labels: ["x + y = 2", "2x + 2y = 5"],
  },
} as const;

export const SOLUTION_TYPES_STEP_COUNT = 5;

function augmentedLatex(rows: TwoEquationSystem): string {
  return String.raw`\left[\begin{array}{cc|c}${rows[0].join("&")}\\${rows[1].join("&")}\end{array}\right]`;
}

function fractionLatex(value: ExactFraction): string {
  return value.denominator === 1
    ? String(value.numerator)
    : String.raw`\frac{${value.numerator}}{${value.denominator}}`;
}

/** The exact result is derived from the same rows used to draw the lines. */
export function solutionTypesFinalLatex(kind: SolutionKind): string {
  const model = classifySolutionSystem(SOLUTION_TYPES_PRESETS[kind].rows);
  const ranks = String.raw`\operatorname{rank}(A)=${model.rankA},\quad\operatorname{rank}([A\mid b])=${model.rankAugmented},\quad n=2`;
  const result = model.exactPoint
    ? String.raw`\mathcal S=\{(${fractionLatex(model.exactPoint[0])},${fractionLatex(model.exactPoint[1])})\}`
    : kind === "infinite"
      ? String.raw`\mathcal S=\{(t,2-t):t\in\mathbb R\}`
      : String.raw`0=1\;\text{is impossible},\quad\mathcal S=\varnothing`;
  return String.raw`\begin{gathered}${ranks}\\${result}\end{gathered}`;
}

export function solutionTypesSteps(
  kind: SolutionKind,
  lang: KnowledgeDiagramProps["lang"]
): DerivationStep[] {
  const zh = lang === "zh";
  const preset = SOLUTION_TYPES_PRESETS[kind];
  const descriptions = zh
    ? [
        "數值示範：x、y 是兩個實數未知數；此預設是一個固定方程組。",
        "先畫第一個方程的所有解：藍色直線 L₁。線段只是視窗內的部分。",
        kind === "unique"
          ? "再畫第二條直線 L₂：兩條直線相交。"
          : kind === "infinite"
            ? "第二個方程是第一個的兩倍；橙色虛線與藍線完全重合。"
            : "第二條直線平行但不重合；兩個常數不相容。",
        kind === "unique"
          ? "只對這個固定方程組消去：兩個係數主元，所以兩個秩都是 2。圖中原方程的直線不變。"
          : kind === "infinite"
            ? "消去後第二行是 0=0，不增加限制；兩個秩都是 1，小於未知數個數 2。"
            : "消去後第二行是 0=1：係數行為零，但增廣行非零，所以兩個秩不相同。",
        kind === "unique"
          ? "綠點是唯一共同解 (1,3)，代回兩個原方程都成立。"
          : kind === "infinite"
            ? "共同解是整條直線 (t,2−t)，t 可取任何實數；移動綠點只示範其中一些解。"
            : "兩條平行直線沒有共同點：解集為空。標示的是兩條原直線的垂直距離。",
      ]
    : [
        "Numerical demo: x and y are two real unknowns. This preset is one fixed system.",
        "Draw all solutions of the first equation: the blue line L₁. Only its visible segment is shown.",
        kind === "unique"
          ? "Draw the second line L₂. The two lines intersect."
          : kind === "infinite"
            ? "The second equation is twice the first. The dashed amber line lies exactly on the blue line."
            : "The second line is parallel and distinct: the constants are incompatible.",
        kind === "unique"
          ? "Eliminate within this fixed system: two coefficient pivots give both ranks as 2. The original equation lines stay fixed."
          : kind === "infinite"
            ? "The second row becomes 0=0 and adds no constraint. Both ranks are 1, less than the two unknowns."
            : "The second row becomes 0=1: zero coefficients but a nonzero augmented entry. The ranks differ.",
        kind === "unique"
          ? "The green point is the only common solution (1,3); it satisfies both original equations."
          : kind === "infinite"
            ? "Every point (t,2−t), for any real t, is a common solution. The moving green point samples only some solutions."
            : "The parallel lines have no common point: the solution set is empty. The marked distance is perpendicular to the original lines.",
      ];
  const firstEquation = preset.labels[0].replaceAll(" ", "");
  const secondEquation = preset.labels[1].replaceAll(" ", "");
  const formulas = [
    String.raw`x,y\in\mathbb R,\quad\begin{cases}${firstEquation}\\${secondEquation}\end{cases}`,
    String.raw`L_1:\;${firstEquation}`,
    String.raw`\begin{cases}L_1:\;${firstEquation}\\L_2:\;${secondEquation}\end{cases}`,
    String.raw`${augmentedLatex(preset.rows)}\xrightarrow{${preset.rowOperation}}${augmentedLatex(preset.echelon)}`,
    solutionTypesFinalLatex(kind),
  ];
  return descriptions.map((description, index) => ({
    description,
    latex: formulas[index],
  }));
}

export interface LineBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
export type LineSegment = readonly [
  readonly [number, number],
  readonly [number, number],
];

/** Clip ax+by=c without slope division, handling vertical and zero equations. */
export function clipEquationLine(
  row: EquationRow,
  box: LineBox
): LineSegment | null {
  const [a, b, c] = row;
  if (
    ![a, b, c, box.xMin, box.xMax, box.yMin, box.yMax].every(Number.isFinite) ||
    box.xMin >= box.xMax ||
    box.yMin >= box.yMax ||
    (a === 0 && b === 0)
  )
    return null;
  const points: [number, number][] = [];
  const add = (x: number, y: number) => {
    const epsilon = 1e-9;
    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= box.xMin - epsilon &&
      x <= box.xMax + epsilon &&
      y >= box.yMin - epsilon &&
      y <= box.yMax + epsilon &&
      !points.some(
        point =>
          Math.abs(point[0] - x) < epsilon && Math.abs(point[1] - y) < epsilon
      )
    )
      points.push([
        Math.max(box.xMin, Math.min(box.xMax, x)),
        Math.max(box.yMin, Math.min(box.yMax, y)),
      ]);
  };
  if (b !== 0) {
    add(box.xMin, (c - a * box.xMin) / b);
    add(box.xMax, (c - a * box.xMax) / b);
  }
  if (a !== 0) {
    add((c - b * box.yMin) / a, box.yMin);
    add((c - b * box.yMax) / a, box.yMax);
  }
  return points.length >= 2 ? [points[0], points[1]] : null;
}

const WORLD_BOX: LineBox = { xMin: -3, xMax: 7, yMin: -1, yMax: 5 };
const toSvg = ([x, y]: readonly [number, number]): readonly [
  number,
  number,
] => [60 + (x + 3) * 44, 310 - (y + 1) * 44];
const segmentPath = (segment: LineSegment | null) => {
  if (!segment) return "";
  const start = toSvg(segment[0]);
  const end = toSvg(segment[1]);
  return `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`;
};

/** Deterministic shared-clock geometry; no timers or interpolation between systems. */
export function solutionTypesFrame(stage: number, progress: number) {
  const safeStage = Number.isFinite(stage)
    ? Math.max(0, Math.min(4, Math.floor(stage)))
    : 0;
  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const reveal = (target: number) =>
    safeStage > target ? 1 : safeStage === target ? safeProgress : 0;
  return {
    axes: 0.25 + 0.75 * reveal(0),
    firstLine: reveal(1),
    secondLine: reveal(2),
    rowCheck: reveal(3),
    result: reveal(4),
    sampleT: -1 + 3 * reveal(4),
  };
}

const BLUE = "#2563eb";
const AMBER = "#d97706";
const GREEN = "#059669";

function SolutionScene({
  kind,
  lang,
  frame,
  id,
}: {
  kind: SolutionKind;
  lang: KnowledgeDiagramProps["lang"];
  frame: KnowledgeFrame;
  id: string;
}) {
  const zh = lang === "zh";
  const preset = SOLUTION_TYPES_PRESETS[kind];
  const model = classifySolutionSystem(preset.rows);
  const geometry = solutionTypesFrame(frame.stage, frame.progress);
  const firstPath = segmentPath(clipEquationLine(preset.rows[0], WORLD_BOX));
  const secondPath = segmentPath(clipEquationLine(preset.rows[1], WORLD_BOX));
  const point = toSvg(model.point ?? [geometry.sampleT, 2 - geometry.sampleT]);
  const gapStart = toSvg([1, 1]);
  const gapEnd = toSvg([1.25, 1.25]);
  const names = zh
    ? { unique: "唯一解", infinite: "無限多解", none: "無解" }
    : {
        unique: "Unique solution",
        infinite: "Infinitely many solutions",
        none: "No solution",
      };
  return (
    <div className="min-w-0 text-foreground">
      <svg
        viewBox="0 0 560 350"
        width="100%"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        className="block w-full"
      >
        <title id={`${id}-title`}>
          {zh
            ? `解的類型數值示範：${names[kind]}`
            : `Solution-types numerical demo: ${names[kind]}`}
        </title>
        <desc id={`${id}-description`}>
          {zh
            ? `${preset.labels.join("；")}。藍線為第一個方程；橙色虛線為第二個方程。${names[kind]}。`
            : `${preset.labels.join("; ")}. Blue is the first equation; dashed amber is the second. ${names[kind]}.`}
        </desc>
        <defs>
          <marker
            id={`${id}-axis`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
          <marker
            id={`${id}-gap`}
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="3"
            markerHeight="3"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={GREEN} />
          </marker>
        </defs>
        <g fontSize="17" fontWeight="600">
          <text x="28" y="25" fill={BLUE}>
            L₁: {preset.labels[0]}
          </text>
          <text x="285" y="25" fill={AMBER}>
            L₂: {preset.labels[1]}
          </text>
        </g>
        <g opacity={geometry.axes}>
          {[-1, 0, 1, 2, 3, 4, 5].map(y => (
            <line
              key={`y${y}`}
              x1="60"
              x2="500"
              y1={toSvg([0, y])[1]}
              y2={toSvg([0, y])[1]}
              stroke="currentColor"
              strokeOpacity="0.09"
            />
          ))}
          {[-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(x => (
            <line
              key={`x${x}`}
              x1={toSvg([x, 0])[0]}
              x2={toSvg([x, 0])[0]}
              y1="46"
              y2="310"
              stroke="currentColor"
              strokeOpacity="0.09"
            />
          ))}
          <path
            d="M 60 266 H 510 M 192 310 V 36"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.5"
            markerEnd={`url(#${id}-axis)`}
          />
          <g fill="currentColor" fontSize="16">
            <text x="515" y="271">
              x
            </text>
            <text x="183" y="34">
              y
            </text>
            <text x="177" y="284">
              0
            </text>
            {[1, 2, 3, 4, 5, 6].map(x => (
              <text key={x} x={toSvg([x, 0])[0]} y="287" textAnchor="middle">
                {x}
              </text>
            ))}
            {[1, 2, 3, 4, 5].map(y => (
              <text key={y} x="180" y={toSvg([0, y])[1] + 5} textAnchor="end">
                {y}
              </text>
            ))}
          </g>
        </g>
        <path
          d={firstPath}
          fill="none"
          stroke={BLUE}
          strokeWidth="4"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - geometry.firstLine}
          opacity={geometry.firstLine > 0 ? 1 : 0}
        />
        <g opacity={geometry.secondLine}>
          <path
            d={secondPath}
            fill="none"
            stroke={AMBER}
            strokeWidth="4"
            strokeDasharray="10 8"
          />
          <path
            d={secondPath}
            fill="none"
            stroke={AMBER}
            strokeWidth="1"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - geometry.secondLine}
          />
        </g>
        {kind === "unique" && (
          <g opacity={geometry.result}>
            <path
              d={`M ${point[0]} 266 V ${point[1]} H 192`}
              fill="none"
              stroke={GREEN}
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <circle
              cx={point[0]}
              cy={point[1]}
              r={6 + 8 * (1 - geometry.result)}
              fill={GREEN}
              stroke="var(--card)"
              strokeWidth="2"
            />
            <text
              x={point[0] + 15}
              y={point[1] - 13}
              fontSize="19"
              fontWeight="700"
              fill={GREEN}
            >
              (1, 3)
            </text>
          </g>
        )}
        {kind === "infinite" && (
          <g opacity={geometry.result}>
            <path
              d={firstPath}
              fill="none"
              stroke={GREEN}
              strokeWidth="8"
              strokeOpacity="0.3"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - geometry.result}
            />
            <circle
              cx={point[0]}
              cy={point[1]}
              r="7"
              fill={GREEN}
              stroke="var(--card)"
              strokeWidth="2"
            />
            <text x="305" y="110" fontSize="19" fontWeight="700" fill={GREEN}>
              (t, 2−t), t ∈ ℝ
            </text>
          </g>
        )}
        {kind === "none" && (
          <g opacity={geometry.result}>
            <path
              d={`M ${gapStart[0]} ${gapStart[1]} L ${gapEnd[0]} ${gapEnd[1]}`}
              stroke={GREEN}
              strokeWidth="2"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - geometry.result}
              markerStart={`url(#${id}-gap)`}
              markerEnd={`url(#${id}-gap)`}
            />
            <text x="285" y="208" fontSize="19" fontWeight="700" fill={GREEN}>
              d = √2 / 4
            </text>
          </g>
        )}
        <text
          x="280"
          y="338"
          textAnchor="middle"
          fontSize="19"
          fill="currentColor"
          opacity={geometry.result}
        >
          {names[kind]}
        </text>
      </svg>
      <div className="border-t border-border px-3 py-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {zh
            ? "同一方程組的消去結果（直線保持原方程）"
            : "Elimination within this system (lines show the original equations)"}
        </p>
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
          style={{ opacity: 0.3 + 0.7 * geometry.rowCheck }}
        >
          <div
            className="rounded-md border border-border bg-secondary/40 px-3 py-2 font-mono text-sm tabular-nums"
            aria-label={
              zh
                ? "消去後增廣矩陣的兩行"
                : "Two rows of the augmented echelon matrix"
            }
          >
            {preset.echelon.map((row, index) => (
              <div
                key={index}
                className="flex gap-3"
                style={{
                  color:
                    index === 1 ? (kind === "none" ? AMBER : BLUE) : undefined,
                }}
              >
                <span>{row[0]}</span>
                <span>{row[1]}</span>
                <span className="border-l border-border pl-3">{row[2]}</span>
              </div>
            ))}
          </div>
          <div className="text-sm leading-relaxed">
            <p>rank(A) = {model.rankA}</p>
            <p>rank([A|b]) = {model.rankAugmented}</p>
            <p>n = 2</p>
          </div>
          <p
            className="text-sm font-semibold"
            style={{ opacity: geometry.rowCheck }}
          >
            {kind === "unique"
              ? zh
                ? "兩個主元"
                : "Two pivots"
              : kind === "infinite"
                ? "0 = 0"
                : "0 = 1"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SolutionTypesDiagram({
  lang,
  variant = "ls-solution-types",
}: KnowledgeDiagramProps) {
  const [kind, setKind] = useState<SolutionKind>("unique");
  const id = `solution-types-${useId().replace(/:/g, "")}`;
  const zh = lang === "zh";
  const labels: Record<SolutionKind, string> = zh
    ? { unique: "相交：唯一解", infinite: "重合：無限多解", none: "平行：無解" }
    : {
        unique: "Intersect: unique",
        infinite: "Coincide: infinite",
        none: "Parallel: none",
      };
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${kind}:${lang}`}
      lang={lang}
      title={zh ? "直線與解的類型" : "Lines and solution types"}
      testId="knowledge-solution-types"
      steps={solutionTypesSteps(kind, lang)}
      controls={
        <>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={
              zh ? "選擇固定方程組示範" : "Choose a fixed-system demo"
            }
          >
            {(["unique", "infinite", "none"] as const).map(option => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${kind === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}
              >
                {labels[option]}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {zh
              ? "三個獨立數值預設；切換會重設播放，並不是把不同方程組變成等價方程組。"
              : "Three separate numerical presets. Switching resets playback; it is not an equivalence transformation between systems."}
          </p>
        </>
      }
    >
      {frame => <SolutionScene kind={kind} lang={lang} frame={frame} id={id} />}
    </AnimatedKnowledgeLesson>
  );
}
