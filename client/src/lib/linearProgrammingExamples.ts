import {
  lpRational,
  solveLinearProgram,
  solveConstantTarget,
  solveCoefficientTarget,
  type LPGoal,
  type LPInput,
  type LPConstraintInput,
} from "./linearProgramming";
import { ratToStr, type Rational } from "./rational";

export type LPTask = "optimize" | "constant" | "coefficient";
export interface LPExample {
  id: string;
  titleZh: string;
  titleEn: string;
  input: LPInput;
  task: LPTask;
  goal: LPGoal;
  target: string;
  parameter: string;
  coefficient: "a" | "b";
  choices: string[];
  uncertain?: boolean;
  noteZh?: string;
  noteEn?: string;
  difficulty?: 1 | 2 | 3;
}

const constraint = (
  id: string,
  a: number,
  b: number,
  relation: LPConstraintInput["relation"],
  rhs: number
): LPConstraintInput => ({ id, a, b, relation, rhs });

/** User-supplied examples; all answers are calculated, not stored answer letters. */
export const linearProgrammingExamples: LPExample[] = [
  {
    id: "dse-2020-q36",
    titleZh: "2020 Q36 · 由最小值反求 k",
    titleEn: "2020 Q36 · Find k from the minimum",
    input: {
      constraints: [
        constraint("x-lower", 1, 0, ">=", 0),
        constraint("x-upper", 1, 0, "<=", 2),
        constraint("lower-line", 2, 1, ">=", -3),
        constraint("upper-line", 1, 1, "<=", -1),
      ],
      objective: { a: 4, b: 3, c: 0 },
    },
    task: "constant",
    goal: "min",
    target: "24",
    parameter: "k",
    coefficient: "a",
    choices: ["25", "27", "37", "53"],
    noteZh:
      "依所提供題目：0≤x≤2，2x+y+3≥0，x+y+1≤0。先求 4x+3y 的最小值，再求使最小值為 24 的 k。",
    noteEn:
      "From the supplied question: 0≤x≤2, 2x+y+3≥0, x+y+1≤0. Find the minimum of 4x+3y, then the k that makes the minimum 24.",
  },
  {
    id: "dse-2023-q37",
    titleZh: "2023 Q37 · 由最大值反求 β 範圍",
    titleEn: "2023 Q37 · Find the range of β",
    input: {
      constraints: [
        constraint("left", 1, 0, ">=", -3),
        constraint("upper", 2, 3, "<=", 12),
        constraint("lower", 5, -3, "<=", -12),
      ],
      objective: { a: 4, b: 6, c: 0 },
    },
    task: "coefficient",
    goal: "max",
    target: "24",
    parameter: "β",
    coefficient: "a",
    choices: [
      String.raw`\beta\le-10`,
      String.raw`\beta\ge-10`,
      String.raw`\beta\le4`,
      String.raw`\beta\ge4`,
    ],
    noteZh:
      "目標函數為 βx+6y。所選係數是待求參數，並非固定數值；範圍解答須同時控制所有可行頂點，且能取得最大值 24。",
    noteEn:
      "The objective is βx+6y. Its selected coefficient is an unknown parameter, not a fixed number. The answer must control every feasible vertex and attain maximum 24.",
  },
  {
    id: "dse-2024-q37",
    titleZh: "2024 Q37 · 由最小值反求 c",
    titleEn: "2024 Q37 · Find c from the minimum",
    input: {
      constraints: [
        constraint("line-1", 1, -2, "<=", 1),
        constraint("line-2", 1, 4, "<=", 13),
        constraint("line-3", 2, -1, ">=", -1),
      ],
      objective: { a: 5, b: -2, c: 0 },
    },
    task: "constant",
    goal: "min",
    target: "22",
    parameter: "c",
    coefficient: "a",
    choices: ["1", "23", "25", "29"],
    noteZh:
      "反光位置的目標式已依公開 2024 題解核對為 5x−2y+c，最小值為 22。固定常數項設為 0；另求加法常數 c。所有輸入仍可修改。",
    noteEn:
      "The obscured objective was checked against a public 2024 solution: 5x−2y+c, with minimum 22. Keep the fixed term at 0 and solve for the additional constant c. Every input remains editable.",
  },
];

/** 50 distinct cases per level; arithmetic templates are bounded and exactly solvable. */
export function generateLPPractice(level: 1 | 2 | 3, index: number): LPExample {
  if (![1, 2, 3].includes(level) || !Number.isSafeInteger(index) || index < 0) {
    throw new Error(
      "Choose a difficulty from 1 to 3 and a nonnegative safe question index."
    );
  }
  const i = index % 50;
  const cycle = Math.floor(index / 50);
  const shift = Math.floor(i / 10) - 2 + cycle;
  const width = 1 + (i % 5);
  const height = 1 + ((i + 2) % 5);
  const a = 1 + (i % 7);
  const b = 1 + ((i * 3) % 7);
  const k = 5 + i + cycle;
  const goal: LPGoal = i % 2 ? "max" : "min";
  let input: LPInput;
  let task: LPTask;
  let parameter = "k";
  let target: string;
  let choices: string[];
  if (level === 1) {
    const bottom = -3 + Math.floor(i / 5);
    input = {
      constraints: [
        constraint("left", 1, 0, ">=", shift),
        constraint("right", 1, 0, "<=", shift + width),
        constraint("bottom", 0, 1, ">=", bottom),
        constraint("top", 0, 1, "<=", bottom + height),
      ],
      objective: { a, b, c: 0 },
    };
    task = i % 3 === 0 ? "optimize" : "constant";
    const extreme =
      goal === "min"
        ? a * shift + b * bottom
        : a * (shift + width) + b * (bottom + height);
    target = String(task === "constant" ? extreme + k : extreme);
    const answer = task === "constant" ? k : extreme;
    choices = distractors(answer, i);
  } else if (level === 2) {
    const sx = 1 + (i % 4);
    const sy = 1 + ((i + 1) % 3);
    const tx = shift;
    const ty = -2 + Math.floor(i / 5);
    // In u=(x−tx)/sx, v=(y−ty)/sy the reference triangle is
    // u−2v≤1, u+4v≤13, 2u−v≥−1. Integer coefficients preserve exact input.
    input = {
      constraints: [
        constraint(
          "edge-1",
          sy,
          -2 * sx,
          "<=",
          sx * sy + sy * tx - 2 * sx * ty
        ),
        constraint(
          "edge-2",
          sy,
          4 * sx,
          "<=",
          13 * sx * sy + sy * tx + 4 * sx * ty
        ),
        constraint(
          "edge-3",
          2 * sy,
          -sx,
          ">=",
          -sx * sy + 2 * sy * tx - sx * ty
        ),
      ],
      objective: { a: 5 + (i % 5), b: -2 - (i % 3), c: 0 },
    };
    task = "constant";
    const candidates = [
      [-1, -1],
      [1, 3],
      [5, 2],
    ].map(
      ([u, v]) =>
        Number(input.objective.a) * (sx * u + tx) +
        Number(input.objective.b) * (sy * v + ty)
    );
    const extreme =
      goal === "min" ? Math.min(...candidates) : Math.max(...candidates);
    target = String(extreme + k);
    choices = distractors(k, i);
  } else {
    const length = 1 + (i % 5);
    const h = 2 + Math.floor(i / 5) + cycle;
    const slope = 1 + (i % 7);
    const fixed = 1 + (i % 6);
    const offset = Math.floor(i / 10) - 2;
    // Upper segment joins (−length,h+slope*length) to (0,h).
    // beta*x + fixed*y reaches fixed*h+offset exactly iff beta≥fixed*slope.
    input = {
      constraints: [
        constraint("left", 1, 0, ">=", -length),
        constraint("right", 1, 0, "<=", 0),
        constraint("bottom", 0, 1, ">=", h - height),
        constraint("top", slope, 1, "<=", h),
      ],
      objective: { a: fixed * slope, b: fixed, c: offset },
    };
    task = "coefficient";
    parameter = "β";
    target = String(fixed * h + offset);
    const threshold = fixed * slope;
    const intervals = [
      String.raw`\beta\le` + threshold,
      String.raw`\beta\ge` + threshold,
      String.raw`\beta\ge` + (threshold - fixed),
      String.raw`\beta\le` + (threshold + fixed),
    ];
    choices = rotate(intervals, i % 4);
  }
  return {
    id: `generated-lp-${level}-${index}`,
    titleZh: `原創變式 · 難度 ${level} · 題 ${index + 1}`,
    titleEn: `Original variant · Level ${level} · Question ${index + 1}`,
    input,
    task,
    goal: level === 3 ? "max" : goal,
    target,
    parameter,
    coefficient: "a",
    choices,
    difficulty: level,
    noteZh:
      "原創 HKDSE-style 變式，並非官方試題。按輸入自動計算精確答案；答錯後會安排一個後續練習。",
    noteEn:
      "An original HKDSE-style variant, not an official exam question. Exact answers are calculated from the inputs; an incorrect answer adds one follow-up exercise.",
  };
}

function rotate<T>(items: T[], count: number): T[] {
  return [...items.slice(count), ...items.slice(0, count)];
}
function distractors(answer: number, index: number): string[] {
  return rotate([answer - 2, answer + 2, answer, answer + 6], index % 4).map(
    String
  );
}
const equal = (a: Rational, b: Rational) => a.n * b.d === b.n * a.d;

/** Compare the mathematical choice with computed results, not stored answer letters. */
export function lpChoiceMatches(example: LPExample, choice: string): boolean {
  try {
    if (example.task === "coefficient") {
      const answer = solveCoefficientTarget(
        example.input,
        example.goal,
        example.target,
        example.coefficient,
        "en",
        { parameter: example.parameter }
      );
      if (answer.status !== "solved" || answer.intervals.length !== 1)
        return false;
      const expression = choice.replace(/\s|\{|\}/g, "");
      const match = expression.match(
        /^(?:\\[A-Za-z]+|[A-Za-zα-ω])((?:\\(?:geq?|leq?))|>=|<=|≥|≤|=)(.+)$/u
      );
      if (!match) return false;
      const value = lpRational(match[2]);
      const interval = answer.intervals[0];
      const operator = match[1];
      if ([String.raw`\ge`, String.raw`\geq`, ">=", "≥"].includes(operator)) {
        return (
          interval.upper === null &&
          interval.lower !== null &&
          interval.lowerClosed &&
          equal(value, interval.lower)
        );
      }
      if ([String.raw`\le`, String.raw`\leq`, "<=", "≤"].includes(operator)) {
        return (
          interval.lower === null &&
          interval.upper !== null &&
          interval.upperClosed &&
          equal(value, interval.upper)
        );
      }
      return (
        interval.lower !== null &&
        interval.upper !== null &&
        interval.lowerClosed &&
        interval.upperClosed &&
        equal(interval.lower, value) &&
        equal(interval.upper, value)
      );
    }
    const result = solveLinearProgram(example.input);
    const answer =
      example.task === "constant"
        ? solveConstantTarget(result, example.goal, example.target, "en", {
            constant: example.parameter,
          }).value
        : result[example.goal].value;
    if (answer === null) return false;
    return equal(lpRational(choice), answer);
  } catch {
    return false;
  }
}
export function lpExampleCorrectChoice(example: LPExample): number {
  const matches = example.choices
    .map((choice, index) => (lpChoiceMatches(example, choice) ? index : -1))
    .filter(index => index >= 0);
  return matches.length === 1 ? matches[0] : -1;
}
export function lpExampleNumericAnswer(example: LPExample): string | null {
  if (example.task === "coefficient") return null;
  const result = solveLinearProgram(example.input);
  const value =
    example.task === "constant"
      ? solveConstantTarget(result, example.goal, example.target, "en", {
          constant: example.parameter,
        }).value
      : result[example.goal].value;
  return value === null ? null : ratToStr(value);
}
