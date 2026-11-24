import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  Trash2,
  Calculator,
  SlidersHorizontal,
  ListChecks,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import KatexRenderer from "@/components/KatexRenderer";
import StepDisplay from "@/components/StepDisplay";
import LinearProgrammingPlot from "@/components/LinearProgrammingPlot";
import {
  solveLinearProgram,
  solveConstantTarget,
  solveCoefficientTarget,
  linearProgramSteps,
  lpConstraintLatex,
  lpObjectiveLatex,
  lpPointLatex,
  lpRational,
  lpErrorMessage,
  type LPInput,
  type LPGoal,
  type LPNames,
  type LPConstraintInput,
  type LPResult,
  type LPConstantResult,
  type LPCoefficientResult,
} from "@/lib/linearProgramming";
import {
  linearProgrammingExamples,
  generateLPPractice,
  lpChoiceMatches,
  type LPExample,
  type LPTask,
} from "@/lib/linearProgrammingExamples";
import {
  add,
  mul,
  ratToLatex,
  ratToStr,
  toNumber,
  type Rational,
} from "@/lib/rational";

const fieldClass =
  "block min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40";
const panelClass = "min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5";
const greek: Record<string, string> = {
  α: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  ε: "epsilon",
  ζ: "zeta",
  η: "eta",
  θ: "theta",
  ι: "iota",
  κ: "kappa",
  λ: "lambda",
  μ: "mu",
  ν: "nu",
  ξ: "xi",
  ο: "omicron",
  π: "pi",
  ρ: "rho",
  σ: "sigma",
  τ: "tau",
  υ: "upsilon",
  φ: "phi",
  χ: "chi",
  ψ: "psi",
  ω: "omega",
  ϵ: "varepsilon",
  ϑ: "vartheta",
  ϕ: "varphi",
  ϱ: "varrho",
  ς: "varsigma",
  ϖ: "varpi",
};
const safeName = (s: string) => /^[a-zA-Z]$/.test(s) || Object.hasOwn(greek, s);
const nameLatex = (s: string) =>
  greek[s] ? (s === "ο" ? "o" : `\\${greek[s]}`) : s;
const equal = (a: Rational, b: Rational) => a.n * b.d === b.n * a.d;
const copyInput = (input: LPInput): LPInput => ({
  constraints: input.constraints.map(c => ({
    ...c,
    a: String(c.a),
    b: String(c.b),
    rhs: String(c.rhs),
  })),
  objective: {
    a: String(input.objective.a),
    b: String(input.objective.b),
    c: String(input.objective.c),
  },
});
const initialExample = linearProgrammingExamples[0];
const fallback: LPInput = {
  constraints: [
    { id: "left", a: "1", b: "0", relation: ">=", rhs: "0" },
    { id: "bottom", a: "0", b: "1", relation: ">=", rhs: "0" },
    { id: "upper", a: "1", b: "1", relation: "<=", rhs: "6" },
  ],
  objective: { a: "2", b: "3", c: "0" },
};

function symbolicObjective(
  input: LPInput,
  task: LPTask,
  coefficient: "a" | "b",
  names: Required<LPNames>
): string {
  const terms: { negative: boolean; latex: string }[] = [];
  for (const [key, variable] of [
    ["a", names.x],
    ["b", names.y],
  ] as const) {
    if (task === "coefficient" && coefficient === key) {
      terms.push({
        negative: false,
        latex: `${nameLatex(names.parameter)} ${nameLatex(variable)}`,
      });
      continue;
    }
    const q = lpRational(input.objective[key]);
    if (!q.n) continue;
    const magnitude = { n: q.n < 0n ? -q.n : q.n, d: q.d };
    terms.push({
      negative: q.n < 0n,
      latex: `${magnitude.n === magnitude.d ? "" : ratToLatex(magnitude)}${nameLatex(variable)}`,
    });
  }
  const c = lpRational(input.objective.c);
  if (c.n)
    terms.push({
      negative: c.n < 0n,
      latex: ratToLatex({ n: c.n < 0n ? -c.n : c.n, d: c.d }),
    });
  if (task === "constant")
    terms.push({ negative: false, latex: nameLatex(names.constant) });
  return terms.length
    ? terms
        .map((t, i) => `${t.negative ? "-" : i ? "+" : ""}${t.latex}`)
        .join(" ")
    : "0";
}
function optimumLatex(result: LPResult, goal: LPGoal): string {
  const extreme = result[goal];
  if (extreme.value !== null) return ratToLatex(extreme.value);
  return extreme.status === "unbounded"
    ? goal === "min"
      ? "-\\infty"
      : "+\\infty"
    : "\\varnothing";
}
function Field({
  label,
  value,
  onChange,
  testId,
  disabled = false,
  ariaLabel,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  testId: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <label className="block min-w-0 space-y-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <input
        type="text"
        spellCheck={false}
        autoComplete="off"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel || label}
        data-testid={testId}
        className={fieldClass}
      />
    </label>
  );
}

type Calculation =
  | {
      result: LPResult;
      constant?: LPConstantResult;
      coefficient?: LPCoefficientResult;
      error?: never;
    }
  | { result?: never; constant?: never; coefficient?: never; error: string };

export default function LinearProgrammingPage() {
  const { lang } = useLanguage();
  const zh = lang === "zh";
  const text = (zhText: string, enText: string) => (zh ? zhText : enText);
  const [input, setInput] = useState<LPInput>(() =>
    copyInput(initialExample?.input || fallback)
  );
  const [task, setTask] = useState<LPTask>(initialExample?.task || "optimize");
  const [goal, setGoal] = useState<LPGoal>(initialExample?.goal || "min");
  const [target, setTarget] = useState(initialExample?.target || "24");
  const [coefficient, setCoefficient] = useState<"a" | "b">(
    initialExample?.coefficient || "a"
  );
  const [xName, setXName] = useState("x"),
    [yName, setYName] = useState("y");
  const [parameterName, setParameterName] = useState(
    initialExample?.task === "coefficient" ? initialExample.parameter : "β"
  );
  const [constantName, setConstantName] = useState(
    initialExample?.task === "constant" ? initialExample.parameter : "k"
  );
  const [parameterValue, setParameterValue] = useState(
    String(
      initialExample?.input.objective[initialExample?.coefficient || "a"] || "0"
    )
  );
  const [selectedExample, setSelectedExample] = useState<LPExample | null>(
    initialExample || null
  );
  const [presetId, setPresetId] = useState(initialExample?.id || "custom");
  const [edited, setEdited] = useState(false);
  const [stepIndex, setStepIndex] = useState(5);
  const [plotRevision, setPlotRevision] = useState(0);
  const [level, setLevel] = useState(0);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [questionIndex, setQuestionIndex] = useState("1");
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<
    "correct" | "incorrect" | "unmatched" | null
  >(null);
  const [score, setScore] = useState({ correct: 0, checked: 0 });
  const [followUps, setFollowUps] = useState<
    { level: 1 | 2 | 3; index: number }[]
  >([]);
  const wrongAssigned = useRef(new Set<string>()),
    scored = useRef(new Set<string>());
  const followupCounter = useRef(50),
    rowCounter = useRef(20);
  const names = useMemo<Required<LPNames>>(
    () => ({
      x: xName,
      y: yName,
      parameter: task === "coefficient" ? parameterName : "β",
      constant: task === "constant" ? constantName : "k",
    }),
    [xName, yName, parameterName, constantName, task]
  );

  const calculation = useMemo<Calculation>(() => {
    try {
      const labels = [
        names.x,
        names.y,
        ...(task === "coefficient"
          ? [names.parameter]
          : task === "constant"
            ? [names.constant]
            : []),
      ];
      if (labels.some(name => !safeName(name)))
        return {
          error: zh
            ? "符號須為單一拉丁字母或小寫希臘字母。"
            : "Labels must be one Latin letter or a supported lowercase Greek letter.",
        };
      if (new Set(labels).size !== labels.length)
        return {
          error: zh
            ? "本模式使用的變數與未知數名稱必須互不相同。"
            : "Variables and the unknown used in this mode must have distinct names.",
        };
      const result = solveLinearProgram(input);
      if (task === "constant")
        return {
          result,
          constant: solveConstantTarget(result, goal, target, lang, names),
        };
      if (task === "coefficient")
        return {
          result,
          coefficient: solveCoefficientTarget(
            input,
            goal,
            target,
            coefficient,
            lang,
            names
          ),
        };
      return { result };
    } catch (error) {
      return { error: lpErrorMessage(error, lang) };
    }
  }, [input, task, goal, target, coefficient, lang, names, zh]);

  const currentParameter = useMemo<{
    result?: LPResult;
    error?: string;
  }>(() => {
    if (task !== "coefficient" || !calculation.result) return {};
    try {
      lpRational(parameterValue);
      return {
        result: solveLinearProgram({
          ...input,
          objective: { ...input.objective, [coefficient]: parameterValue },
        }),
      };
    } catch (error) {
      return { error: lpErrorMessage(error, lang) };
    }
  }, [task, calculation, input, coefficient, parameterValue, lang]);
  const plottedResult =
    task === "coefficient" ? currentParameter.result : calculation.result;
  const steps = useMemo(
    () =>
      calculation.constant?.steps ||
      calculation.coefficient?.steps ||
      (calculation.result
        ? linearProgramSteps(calculation.result, goal, lang, names)
        : []),
    [calculation, goal, lang, names]
  );
  const preview = useMemo(() => {
    if (!calculation.result) return null;
    return {
      constraints: input.constraints.map(c => lpConstraintLatex(c, names)),
      objective: symbolicObjective(input, task, coefficient, names),
    };
  }, [calculation, input, task, coefficient, names]);
  const parameterBounds = useMemo(() => {
    const values = (calculation.coefficient?.breakpoints || [])
      .map(toNumber)
      .filter(Number.isFinite);
    const initial = Number(input.objective[coefficient]);
    if (Number.isFinite(initial)) values.push(initial);
    const lo = values.length ? Math.min(...values) : -10,
      hi = values.length ? Math.max(...values) : 10;
    const padding = Math.max(10, (hi - lo) / 2);
    return { min: lo - padding, max: hi + padding };
  }, [calculation.coefficient, input.objective, coefficient]);
  let parameterNumeric: number | null = null;
  try {
    const value = toNumber(lpRational(parameterValue));
    if (Number.isFinite(value)) parameterNumeric = value;
  } catch {
    /* Invalid previews are cleared below. */
  }

  useEffect(() => {
    if (!plottedResult) return;
    const q = plottedResult[goal].value;
    const visualValue = q ? toNumber(q) : 0;
    setLevel(
      Number.isFinite(visualValue) && Math.abs(visualValue) <= 1e100
        ? visualValue
        : 0
    );
  }, [plottedResult, goal]);
  const onStepChange = useCallback(
    (index: number, mode: "all" | "playback") =>
      setStepIndex(mode === "all" ? 5 : index),
    []
  );
  function markEdited() {
    setEdited(true);
    setSelectedChoice(null);
    setFeedback(null);
    setStepIndex(5);
  }
  function updateObjective(key: "a" | "b" | "c", value: string) {
    markEdited();
    setInput(previous => ({
      ...previous,
      objective: { ...previous.objective, [key]: value },
    }));
  }
  function updateConstraint(
    id: string,
    key: "a" | "b" | "relation" | "rhs",
    value: string
  ) {
    markEdited();
    setInput(previous => ({
      ...previous,
      constraints: previous.constraints.map(c =>
        c.id === id ? ({ ...c, [key]: value } as LPConstraintInput) : c
      ),
    }));
  }
  function loadExample(example: LPExample, preset = false) {
    setInput(copyInput(example.input));
    setTask(example.task);
    setGoal(example.goal);
    setTarget(example.target);
    setCoefficient(example.coefficient);
    setXName("x");
    setYName("y");
    setParameterName(example.task === "coefficient" ? example.parameter : "β");
    setConstantName(example.task === "constant" ? example.parameter : "k");
    setParameterValue(String(example.input.objective[example.coefficient]));
    setSelectedExample(example);
    setPresetId(preset ? example.id : "custom");
    setEdited(false);
    setSelectedChoice(null);
    setFeedback(null);
    setStepIndex(5);
    setPlotRevision(revision => revision + 1);
  }
  function loadPractice(index = Number(questionIndex) - 1, level = difficulty) {
    if (!Number.isSafeInteger(index) || index < 0 || index > 1000000) return;
    setQuestionIndex(String(index + 1));
    loadExample(generateLPPractice(level, index));
  }
  const currentExample = useMemo<LPExample | null>(
    () =>
      selectedExample && calculation.result
        ? {
            ...selectedExample,
            input,
            task,
            goal,
            target,
            coefficient,
            parameter: task === "constant" ? constantName : parameterName,
          }
        : null,
    [
      selectedExample,
      calculation,
      input,
      task,
      goal,
      target,
      coefficient,
      constantName,
      parameterName,
    ]
  );
  const correctChoices = useMemo(
    () =>
      currentExample
        ? currentExample.choices.flatMap((choice, i) =>
            lpChoiceMatches(currentExample, choice) ? [i] : []
          )
        : [],
    [currentExample]
  );
  const answerKey = `${selectedExample?.id || "custom"}:${JSON.stringify(input)}:${task}:${goal}:${target}:${coefficient}`;
  function checkAnswer() {
    if (selectedChoice === null || !currentExample) return;
    if (!correctChoices.length) {
      setFeedback("unmatched");
      return;
    }
    const correct = correctChoices.includes(selectedChoice);
    setFeedback(correct ? "correct" : "incorrect");
    if (!scored.current.has(answerKey)) {
      scored.current.add(answerKey);
      setScore(s => ({
        correct: s.correct + Number(correct),
        checked: s.checked + 1,
      }));
    }
    if (!correct && !wrongAssigned.current.has(answerKey)) {
      wrongAssigned.current.add(answerKey);
      // Exactly one queue item for a wrong source question, even after repeated checks.
      const next = {
        level: selectedExample?.difficulty || difficulty,
        index: followupCounter.current++,
      };
      setFollowUps(queue => [...queue, next]);
    }
  }
  function nextFollowup() {
    const next = followUps[0];
    if (!next) return;
    setFollowUps(queue => queue.slice(1));
    setDifficulty(next.level);
    setQuestionIndex(String(next.index + 1));
    loadExample(generateLPPractice(next.level, next.index));
    setPracticeOpen(true);
  }
  const exactAnswer = calculation.result
    ? task === "constant"
      ? calculation.constant?.latex || "\\varnothing"
      : task === "coefficient"
        ? calculation.coefficient?.latex || "\\varnothing"
        : `\\${goal} F=${optimumLatex(calculation.result, goal)}`
    : null;
  const statusText = (status: "finite" | "unbounded" | "infeasible") =>
    status === "finite"
      ? text("有限且可取得", "Finite and attained")
      : status === "unbounded"
        ? text("目標無界", "Objective unbounded")
        : text("不可行", "Infeasible");
  const result = calculation.result;
  const tableResult = task === "coefficient" ? currentParameter.result : result;
  const currentTargetMatches =
    currentParameter.result?.[goal].value !== null &&
    currentParameter.result?.[goal].value !== undefined
      ? equal(currentParameter.result[goal].value!, lpRational(target))
      : false;
  const stepSignature = `${JSON.stringify(input)}:${task}:${goal}:${target}:${coefficient}:${task === "coefficient" ? parameterValue : ""}:${Object.values(names).join(":")}`;

  return (
    <main className="min-w-0 space-y-5" data-testid="lp-simulator">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {text(
              "數學實驗 · 線性規劃",
              "Math experiment · Linear programming"
            )}
          </p>
          <h1
            className="text-2xl font-bold sm:text-3xl"
            style={{ fontFamily: "'IBM Plex Serif', serif" }}
          >
            {text(
              "讓不等式變成看得見的答案",
              "Turn inequalities into visible answers"
            )}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {text(
              "編輯約束、移動目標直線，再用精確分數解讀最值、加法常數與係數範圍。",
              "Edit constraints, move objective lines, and explore extrema, additive constants, and coefficient ranges with exact fractions."
            )}
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
          {text(
            "精確運算 · 近似繪圖",
            "Exact arithmetic · visual approximation"
          )}
        </span>
      </header>

      <section className={`${panelClass} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="block min-w-0 flex-1 space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>{text("載入題目示例", "Load an example")}</span>
            <select
              className={fieldClass}
              data-testid="lp-preset-selector"
              aria-label={text(
                "線性規劃預設題目",
                "Linear programming preset selector"
              )}
              value={presetId}
              onChange={e => {
                const example = linearProgrammingExamples.find(
                  x => x.id === e.target.value
                );
                if (example) loadExample(example, true);
                else {
                  setPresetId("custom");
                  setSelectedExample(null);
                  setEdited(true);
                }
              }}
            >
              <option value="custom">
                {text("自訂 / 原創練習", "Custom / original practice")}
              </option>
              {linearProgrammingExamples.map(example => (
                <option key={example.id} value={example.id}>
                  {zh ? example.titleZh : example.titleEn}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${buttonClass} mt-5`}
            onClick={() => setPracticeOpen(!practiceOpen)}
            aria-expanded={practiceOpen}
          >
            <ListChecks size={16} />
            {text("小練習", "Quick practice")}
            <ChevronDown size={14} />
          </button>
        </div>
        {selectedExample && (
          <div
            className={`rounded-lg border p-3 text-xs leading-relaxed ${selectedExample.uncertain ? "border-amber-300 bg-amber-50 text-amber-900" : "border-border bg-secondary/35 text-muted-foreground"}`}
            data-testid="lp-source-note"
          >
            <strong className="mr-1 text-foreground">
              {selectedExample.difficulty
                ? text(
                    "原創變式，非官方試題。",
                    "Original variant, not an official question."
                  )
                : selectedExample.uncertain
                  ? text(
                      "依所提供照片重構，尚待確認，非官方答案。",
                      "Reconstructed from the supplied photo; unconfirmed, not an official answer."
                    )
                  : text(
                      "依所提供照片 / 已核對重構。",
                      "From the supplied photo / source-checked reconstruction."
                    )}
            </strong>
            {zh ? selectedExample.noteZh : selectedExample.noteEn}
            {edited && (
              <span className="ml-1 font-semibold">
                {text(
                  "輸入已修改；以下答案按目前輸入重算。",
                  "Inputs edited; answers below are recalculated from the current inputs."
                )}
              </span>
            )}
          </div>
        )}
        {practiceOpen && (
          <div
            className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
            data-testid="lp-practice"
          >
            <p className="text-xs leading-relaxed text-muted-foreground">
              {text(
                "每級至少 50 個可重現原創變式。練習是可選的；每題首次答錯只安排一個後續題。",
                "At least 50 reproducible original variants per level. Practice is optional; a first wrong answer queues just one follow-up for that question."
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
              <label className="min-w-0 space-y-1.5 text-xs font-medium">
                <span>{text("難度", "Level")}</span>
                <select
                  className={fieldClass}
                  aria-label={text("練習難度", "Practice difficulty")}
                  data-testid="lp-practice-level"
                  value={difficulty}
                  onChange={e => {
                    const d = Number(e.target.value) as 1 | 2 | 3;
                    setDifficulty(d);
                    loadPractice(0, d);
                  }}
                >
                  <option value={1}>
                    {text("1 · 基礎", "1 · Foundation")}
                  </option>
                  <option value={2}>
                    {text("2 · 應用", "2 · Application")}
                  </option>
                  <option value={3}>
                    {text("3 · 係數範圍", "3 · Coefficient range")}
                  </option>
                </select>
              </label>
              <label className="min-w-0 space-y-1.5 text-xs font-medium">
                <span>{text("題號（1 起）", "Question index (from 1)")}</span>
                <input
                  type="number"
                  min={1}
                  max={1000001}
                  className={fieldClass}
                  value={questionIndex}
                  onChange={e => setQuestionIndex(e.target.value)}
                  aria-label={text("練習題號", "Practice question index")}
                  data-testid="lp-practice-index"
                />
              </label>
              <button
                type="button"
                className={buttonClass}
                disabled={
                  !Number.isSafeInteger(Number(questionIndex)) ||
                  Number(questionIndex) < 1 ||
                  Number(questionIndex) > 1000001
                }
                onClick={() => loadPractice()}
              >
                {text("載入", "Load")}
              </button>
              <button
                type="button"
                className={buttonClass}
                data-testid="lp-next-question"
                onClick={() =>
                  loadPractice(
                    Number.isSafeInteger(Number(questionIndex)) &&
                      Number(questionIndex) >= 1 &&
                      Number(questionIndex) < 1000001
                      ? Number(questionIndex)
                      : 0
                  )
                }
              >
                {text("下一題", "Next question")}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={text("計算模式", "Calculation mode")}
        >
          {(
            [
              {
                id: "optimize",
                icon: Calculator,
                label: text("求最值", "Optimize"),
              },
              {
                id: "constant",
                icon: Plus,
                label: text("反求常數", "Find constant"),
              },
              {
                id: "coefficient",
                icon: SlidersHorizontal,
                label: text("係數範圍", "Coefficient range"),
              },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              type="button"
              key={id}
              data-testid={`lp-mode-${id}`}
              aria-pressed={task === id}
              className={`${buttonClass} flex-1 ${task === id ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              onClick={() => {
                markEdited();
                setTask(id);
                if (id === "coefficient")
                  setParameterValue(String(input.objective[coefficient]));
              }}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 space-y-4">
          <section className={`${panelClass} space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">
                {text("01 · 變數與約束", "01 · Variables and constraints")}
              </h2>
              <span className="text-xs font-mono text-muted-foreground">
                {input.constraints.length}/12
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={text("變數 1", "Variable 1")}
                value={xName}
                onChange={v => {
                  markEdited();
                  setXName(v);
                }}
                testId="lp-variable-1"
              />
              <Field
                label={text("變數 2", "Variable 2")}
                value={yName}
                onChange={v => {
                  markEdited();
                  setYName(v);
                }}
                testId="lp-variable-2"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {text(
                "可輸入整數、小數、分數（如 -3/2）與科學記號（如 1e-3）。空白不是 0。變數可取任何實數；只有下面列出的約束生效。只支援閉約束 ≤、≥、=；不支援嚴格不等式 <、>。",
                "Use integers, decimals, fractions (such as -3/2), or scientific notation (such as 1e-3). Blank is not zero. Variables are real: only listed constraints apply. Only closed constraints ≤, ≥, and = are supported; strict inequalities < and > are not supported."
              )}
            </p>
            <div className="space-y-3" data-testid="lp-constraint-rows">
              {input.constraints.map((c, i) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-secondary/20 p-3"
                  data-testid={`lp-constraint-row-${i}`}
                  data-constraint-id={c.id}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {text("約束", "Constraint")} {i + 1}
                    </span>
                    <button
                      type="button"
                      className={`${buttonClass} min-w-11 px-2`}
                      aria-label={text(
                        `刪除約束 ${i + 1}`,
                        `Remove constraint ${i + 1}`
                      )}
                      data-testid={`lp-remove-constraint-${i}`}
                      onClick={() => {
                        markEdited();
                        setInput(p => ({
                          ...p,
                          constraints: p.constraints.filter(
                            row => row.id !== c.id
                          ),
                        }));
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-4">
                    <Field
                      label={`a · ${xName}`}
                      value={String(c.a)}
                      onChange={v => updateConstraint(c.id, "a", v)}
                      testId={`lp-constraint-${i}-a`}
                      ariaLabel={text(
                        `約束 ${i + 1}，變數 1 係數 a`,
                        `Constraint ${i + 1}, variable 1 coefficient a`
                      )}
                    />
                    <Field
                      label={`b · ${yName}`}
                      value={String(c.b)}
                      onChange={v => updateConstraint(c.id, "b", v)}
                      testId={`lp-constraint-${i}-b`}
                      ariaLabel={text(
                        `約束 ${i + 1}，變數 2 係數 b`,
                        `Constraint ${i + 1}, variable 2 coefficient b`
                      )}
                    />
                    <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                      <span>{text("關係", "Relation")}</span>
                      <select
                        className={fieldClass}
                        value={c.relation}
                        onChange={e =>
                          updateConstraint(c.id, "relation", e.target.value)
                        }
                        data-testid={`lp-constraint-${i}-relation`}
                        aria-label={text(
                          `約束 ${i + 1} 的關係`,
                          `Constraint ${i + 1} relation`
                        )}
                      >
                        <option value="<=">≤</option>
                        <option value=">=">≥</option>
                        <option value="=">=</option>
                      </select>
                    </label>
                    <Field
                      label={text("右側常數", "Right-hand side")}
                      value={String(c.rhs)}
                      onChange={v => updateConstraint(c.id, "rhs", v)}
                      testId={`lp-constraint-${i}-rhs`}
                      ariaLabel={text(
                        `約束 ${i + 1} 右側常數`,
                        `Constraint ${i + 1} right-hand side`
                      )}
                    />
                  </div>
                  {preview && (
                    <div
                      className="mt-3 overflow-x-auto text-sm"
                      data-testid={`lp-constraint-preview-${i}`}
                    >
                      <KatexRenderer latex={preview.constraints[i]} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {!input.constraints.length && (
              <p className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                {text(
                  "沒有約束：可行區域為整個實數平面，不隱藏加入 x≥0 或 y≥0。",
                  "No constraints: the whole real plane is feasible. Neither x≥0 nor y≥0 is silently added."
                )}
              </p>
            )}
            <button
              type="button"
              className={`${buttonClass} w-full border-dashed`}
              data-testid="lp-add-constraint"
              disabled={input.constraints.length >= 12}
              onClick={() => {
                markEdited();
                setInput(p => ({
                  ...p,
                  constraints: [
                    ...p.constraints,
                    {
                      id: `user-${rowCounter.current++}`,
                      a: "1",
                      b: "1",
                      relation: "<=",
                      rhs: "6",
                    },
                  ],
                }));
              }}
            >
              <Plus size={16} />
              {text("新增約束", "Add constraint")}
            </button>
          </section>
          <section className={`${panelClass} space-y-4`}>
            <h2 className="text-sm font-semibold">
              {text("02 · 目標函數", "02 · Objective function")}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <Field
                label={
                  task === "coefficient" && coefficient === "a"
                    ? text("a · 由參數取代", "a · replaced by parameter")
                    : `a · ${xName}`
                }
                value={String(input.objective.a)}
                onChange={v => updateObjective("a", v)}
                testId="lp-objective-a"
                disabled={task === "coefficient" && coefficient === "a"}
              />
              <Field
                label={
                  task === "coefficient" && coefficient === "b"
                    ? text("b · 由參數取代", "b · replaced by parameter")
                    : `b · ${yName}`
                }
                value={String(input.objective.b)}
                onChange={v => updateObjective("b", v)}
                testId="lp-objective-b"
                disabled={task === "coefficient" && coefficient === "b"}
              />
              <Field
                label={text("固定項 c", "Fixed term c")}
                value={String(input.objective.c)}
                onChange={v => updateObjective("c", v)}
                testId="lp-objective-c"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{text("求解方向", "Goal")}</span>
                <select
                  className={fieldClass}
                  value={goal}
                  onChange={e => {
                    markEdited();
                    setGoal(e.target.value as LPGoal);
                  }}
                  data-testid="lp-goal"
                  aria-label={text("最小值或最大值", "Minimum or maximum")}
                >
                  <option value="min">{text("最小值", "Minimum")}</option>
                  <option value="max">{text("最大值", "Maximum")}</option>
                </select>
              </label>
              {task !== "optimize" && (
                <Field
                  label={text("已知目標最值", "Known extreme value")}
                  value={target}
                  onChange={v => {
                    markEdited();
                    setTarget(v);
                  }}
                  testId="lp-target"
                />
              )}
            </div>
            {task === "constant" && (
              <div className="space-y-3 rounded-lg bg-secondary/35 p-3">
                <Field
                  label={text(
                    "未知加法常數（另外加入）",
                    "Unknown additive constant (added separately)"
                  )}
                  value={constantName}
                  onChange={v => {
                    markEdited();
                    setConstantName(v);
                  }}
                  testId="lp-constant-name"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {text(
                    "固定 c 不變；求使 ax+by+c 加上未知常數後，最值等於已知目標的常數。未知符號與變數 / 參數須不同。",
                    "The fixed c is unchanged. Solve the extra additive constant so that the extremum of ax+by+c plus that constant equals the target. Unknown labels must be distinct."
                  )}
                </p>
              </div>
            )}
            {task === "coefficient" && (
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/35 p-3">
                <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                  <span>
                    {text(
                      "被參數取代的係數",
                      "Coefficient replaced by parameter"
                    )}
                  </span>
                  <select
                    className={fieldClass}
                    value={coefficient}
                    onChange={e => {
                      const which = e.target.value as "a" | "b";
                      markEdited();
                      setCoefficient(which);
                      setParameterValue(String(input.objective[which]));
                    }}
                    data-testid="lp-parameter-coefficient"
                    aria-label={text(
                      "選擇未知係數 a 或 b",
                      "Select unknown coefficient a or b"
                    )}
                  >
                    <option value="a">a · {xName}</option>
                    <option value="b">b · {yName}</option>
                  </select>
                </label>
                <Field
                  label={text("參數符號", "Parameter label")}
                  value={parameterName}
                  onChange={v => {
                    markEdited();
                    setParameterName(v);
                  }}
                  testId="lp-parameter-name"
                />
              </div>
            )}
            {preview && (
              <div
                className="overflow-x-auto rounded-lg border border-primary/15 bg-primary/5 p-3"
                data-testid="lp-objective-preview"
              >
                <KatexRenderer latex={`F=${preview.objective}`} displayMode />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {text(
                "輸入有效時即時精確重算。修改會停止目前推導 / 圖形掃描；無效輸入會清除舊結果。",
                "Valid inputs recalculate exactly. Edits stop derivation and graph sweeps; invalid inputs clear old results."
              )}
            </p>
          </section>
        </div>
        <div className="min-w-0 space-y-4">
          {calculation.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              data-testid="lp-error"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{calculation.error}</p>
            </div>
          )}
          {result && (
            <section
              className={`${panelClass} space-y-4 border-primary/25 bg-primary/[0.035]`}
              data-testid="lp-result"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-primary">
                  {text("03 · 精確答案", "03 · Exact answer")}
                </h2>
                <span className="text-xs font-mono text-muted-foreground">
                  {task === "coefficient"
                    ? text("完整參數範圍", "Entire parameter range")
                    : text("有理數精確值", "Exact rational value")}
                </span>
              </div>
              {exactAnswer && (
                <div
                  className="overflow-x-auto py-2 text-lg"
                  data-testid="lp-exact-answer"
                >
                  <KatexRenderer latex={exactAnswer} displayMode />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border bg-card p-3">
                  <span className="block text-muted-foreground">
                    {text("可行性", "Feasibility")}
                  </span>
                  <strong className="mt-1 block">
                    {result.feasible
                      ? text("有可行點", "Feasible")
                      : text("無可行點", "Infeasible")}
                  </strong>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <span className="block text-muted-foreground">
                    {text("區域", "Region")}
                  </span>
                  <strong className="mt-1 block">
                    {!result.feasible
                      ? "—"
                      : result.regionBounded
                        ? text("有界", "Bounded")
                        : text("無界", "Unbounded")}
                  </strong>
                </div>
                {(["min", "max"] as const).map(g => (
                  <div
                    key={g}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <span className="block text-muted-foreground">
                      {g === "min"
                        ? text("最小值", "Minimum")
                        : text("最大值", "Maximum")}
                    </span>
                    <div className="mt-1 overflow-x-auto font-semibold">
                      <KatexRenderer latex={optimumLatex(result, g)} />
                    </div>
                    <span className="mt-1 block text-muted-foreground">
                      {statusText(result[g].status)}
                    </span>
                  </div>
                ))}
              </div>
              {task !== "optimize" && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {task === "constant"
                    ? text(
                        "上列最值屬於已知的 ax+by+c，尚未加上未知常數；精確答案為另外需要加入的常數。",
                        "The extrema above belong to the known ax+by+c before adding the unknown constant; the exact answer is the extra constant required."
                      )
                    : text(
                        "上列最值只對應原有數值係數。完整範圍答案取代所選係數；下方滑桿會顯示目前參數的真正最值。",
                        "The extrema above use the original numeric coefficients. The full range replaces the selected coefficient; the slider below shows the actual extrema at its current parameter."
                      )}
                </p>
              )}
              {task === "optimize" && result[goal].multiple && (
                <p className="text-xs font-medium text-primary">
                  {text(
                    "不只一個最優點：可能為整條邊、射線、線或全部可行點。",
                    "Multiple optima: an edge, ray, line, or every feasible point may be optimal."
                  )}
                </p>
              )}
            </section>
          )}
          {task === "coefficient" && result && (
            <section
              className={`${panelClass} space-y-3`}
              data-testid="lp-parameter-explorer"
            >
              <h2 className="text-sm font-semibold">
                {text(
                  "係數實驗 · 改變斜率",
                  "Coefficient experiment · Change the slope"
                )}
              </h2>
              <Field
                label={text(
                  `目前 ${parameterName}（精確輸入）`,
                  `Current ${parameterName} (exact input)`
                )}
                value={parameterValue}
                onChange={setParameterValue}
                testId="lp-parameter-value"
              />
              <input
                type="range"
                data-testid="lp-parameter-slider"
                aria-label={text(
                  `近似 ${parameterName} 視覺滑桿`,
                  `Approximate ${parameterName} visual slider`
                )}
                min={Math.min(parameterBounds.min, parameterNumeric ?? 0)}
                max={Math.max(parameterBounds.max, parameterNumeric ?? 0)}
                step={(parameterBounds.max - parameterBounds.min) / 500}
                value={parameterNumeric ?? 0}
                onChange={e => setParameterValue(e.target.value)}
                className="block min-h-11 w-full accent-[#287c80]"
              />
              <p className="text-xs text-muted-foreground">
                {text(
                  "滑桿為近似視覺操作；上方參數可輸入精確分數。完整範圍答案不會被目前滑桿值取代。",
                  "The slider is an approximate visual control; the field accepts exact fractions. The full range answer is never replaced by the current slider value."
                )}
              </p>
              {!!calculation.coefficient?.breakpoints.length && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {text(
                      "最優頂點轉換 / 範圍端點（精確）",
                      "Optimal-vertex switches / interval endpoints (exact)"
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {calculation.coefficient.breakpoints.map(q => (
                      <button
                        key={ratToStr(q)}
                        type="button"
                        className={buttonClass}
                        onClick={() => setParameterValue(ratToStr(q))}
                        aria-label={text(
                          `設定參數為 ${ratToStr(q)}`,
                          `Set parameter to ${ratToStr(q)}`
                        )}
                      >
                        <KatexRenderer
                          latex={`${nameLatex(parameterName)}=${ratToLatex(q)}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {currentParameter.error && (
                <p
                  role="alert"
                  className="text-xs text-destructive"
                  data-testid="lp-parameter-error"
                >
                  {currentParameter.error}
                </p>
              )}
              {currentParameter.result && (
                <div
                  className="rounded-lg border border-border bg-secondary/30 p-3 text-xs"
                  data-testid="lp-parameter-current-result"
                >
                  <div className="overflow-x-auto">
                    <KatexRenderer
                      latex={`F=${lpObjectiveLatex(currentParameter.result.objective, names)}`}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {(["min", "max"] as const).map(g => (
                      <div key={g}>
                        <span className="block text-muted-foreground">
                          {g === "min"
                            ? text("目前最小值", "Current minimum")
                            : text("目前最大值", "Current maximum")}
                        </span>
                        <div className="mt-1 overflow-x-auto">
                          <KatexRenderer
                            latex={optimumLatex(currentParameter.result!, g)}
                          />
                        </div>
                        <span className="block mt-1 text-muted-foreground">
                          {statusText(currentParameter.result![g].status)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p
                    className={`mt-3 font-semibold ${currentTargetMatches ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {currentTargetMatches
                      ? text(
                          "目前參數符合已知最值。",
                          "This parameter attains the known extreme."
                        )
                      : text(
                          "目前參數不符合已知最值。",
                          "This parameter does not attain the known extreme."
                        )}
                  </p>
                  {currentParameter.result[goal].points.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <KatexRenderer
                        latex={currentParameter.result[goal].points
                          .map(lpPointLatex)
                          .join(",\\quad ")}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
          {plottedResult ? (
            <LinearProgrammingPlot
              key={plotRevision}
              result={plottedResult}
              goal={goal}
              lang={lang}
              stepIndex={stepIndex}
              level={level}
              onLevelChange={setLevel}
              names={names}
              parameterMode={task === "coefficient"}
            />
          ) : (
            <div
              className={`${panelClass} border-dashed py-12 text-center text-sm text-muted-foreground`}
              data-testid="lp-plot-empty"
            >
              {text(
                "請修正輸入以重新繪圖；不顯示過時結果。",
                "Correct the inputs to redraw; stale results are not shown."
              )}
            </div>
          )}
        </div>
      </div>

      {selectedExample?.choices.length && result ? (
        <section
          className={`${panelClass} space-y-3`}
          data-testid="lp-mc-panel"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {text("可選：多項選擇核對", "Optional: multiple-choice check")}
            </h2>
            <p
              className="text-xs font-mono text-muted-foreground"
              data-testid="lp-score"
            >
              {text("首次核對得分", "First-check score")} {score.correct}/
              {score.checked} · {text("待做後續題", "Follow-ups queued")}{" "}
              <span data-testid="lp-followup-count">{followUps.length}</span>
            </p>
          </div>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
            role="group"
            aria-label={text("多項選擇答案", "Multiple-choice answers")}
          >
            {selectedExample.choices.map((choice, i) => (
              <button
                type="button"
                key={`${i}:${choice}`}
                className={`${buttonClass} justify-start ${selectedChoice === i ? "border-primary bg-primary/10" : ""}`}
                aria-pressed={selectedChoice === i}
                data-testid={`lp-choice-${String.fromCharCode(65 + i)}`}
                onClick={() => {
                  setSelectedChoice(i);
                  setFeedback(null);
                }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 overflow-x-auto">
                  <KatexRenderer latex={choice} />
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${buttonClass} border-primary bg-primary text-primary-foreground hover:bg-primary/90`}
              disabled={selectedChoice === null || !correctChoices.length}
              data-testid="lp-check-answer"
              onClick={checkAnswer}
            >
              <Check size={15} />
              {text("核對答案", "Check answer")}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!followUps.length}
              data-testid="lp-next-followup"
              onClick={nextFollowup}
            >
              {text("下一個後續題", "Next follow-up")}
              <ArrowRight size={14} />
            </button>
          </div>
          <p
            className="text-xs text-muted-foreground"
            data-testid="lp-correct-letters"
          >
            {correctChoices.length
              ? `${text("按目前輸入計算的正確選項", "Computed correct option(s)")}: ${correctChoices.map(i => String.fromCharCode(65 + i)).join(", ")}`
              : text(
                  "目前輸入的精確答案不匹配任何所列選項；請參考精確結果，不猜答案字母。",
                  "The current exact answer matches none of the listed choices. Use the exact result; no answer letter is guessed."
                )}
          </p>
          {feedback && (
            <p
              role="status"
              className={`text-sm font-semibold ${feedback === "correct" ? "text-primary" : "text-amber-700"}`}
              data-testid="lp-answer-status"
            >
              {feedback === "correct"
                ? text(
                    "正確，精確運算已驗證。",
                    "Correct — verified by exact arithmetic."
                  )
                : feedback === "incorrect"
                  ? text(
                      "再試一次。此題已安排一個後續練習，重複核對不會重複加入。",
                      "Try again. One follow-up has been assigned; repeated checks do not add duplicates."
                    )
                  : text(
                      "沒有匹配選項，請參考精確答案。",
                      "No matching option; refer to the exact answer."
                    )}
            </p>
          )}
        </section>
      ) : null}

      {tableResult && result && (
        <section
          className={`${panelClass} space-y-3`}
          data-testid="lp-vertex-table"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {text(
                "真正頂點 · 代入目標函數",
                "True vertices · Evaluate the objective"
              )}
            </h2>
            {task === "coefficient" && (
              <span className="text-xs text-muted-foreground">
                {text("依目前參數值", "At the current parameter")}
              </span>
            )}
          </div>
          {tableResult.vertices.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-3">{text("頂點", "Vertex")}</th>
                    <th className="px-2 py-3">
                      ({xName}, {yName})
                    </th>
                    <th className="px-2 py-3">
                      <KatexRenderer
                        latex={lpObjectiveLatex(tableResult.objective, names)}
                      />
                    </th>
                    <th className="px-2 py-3">
                      {text("最優性", "Optimality")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableResult.vertices.map((p, i) => {
                    const value = add(
                      add(
                        mul(tableResult.objective.a, p.x),
                        mul(tableResult.objective.b, p.y)
                      ),
                      tableResult.objective.c
                    );
                    const optimal =
                      tableResult[goal].status === "finite" &&
                      tableResult[goal].value !== null &&
                      equal(value, tableResult[goal].value!);
                    return (
                      <tr
                        key={i}
                        className="border-b border-border/60 last:border-0"
                        data-testid={`lp-vertex-table-row-${i}`}
                        data-x={ratToStr(p.x)}
                        data-y={ratToStr(p.y)}
                        data-value={ratToStr(value)}
                      >
                        <td className="px-2 py-3 font-mono">V{i + 1}</td>
                        <td className="px-2 py-3">
                          <KatexRenderer latex={lpPointLatex(p)} />
                        </td>
                        <td className="px-2 py-3">
                          <KatexRenderer latex={ratToLatex(value)} />
                        </td>
                        <td className="px-2 py-3 text-xs text-primary">
                          {optimal ? text("最優", "Optimal") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {tableResult.feasible
                ? text(
                    "沒有真正頂點；不把視窗角點當作頂點。請利用支撐線及精確可行性 / 目標結果判斷。",
                    "No true vertices. Viewport corners are not substituted. Use the support line and exact feasibility / objective results."
                  )
                : text(
                    "不可行：沒有頂點或最優點。",
                    "Infeasible: no vertices or optimal points."
                  )}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {text(
              "只有求解器的真正頂點列於此表；區域無界時，頂點數值本身不足以保證有限最值。",
              "Only true solver vertices appear here. In an unbounded region, vertex values alone do not guarantee a finite optimum."
            )}
          </p>
        </section>
      )}
      {result && steps.length > 0 && (
        <section className="min-w-0 space-y-3" data-testid="lp-steps">
          <h2 className="text-sm font-semibold">
            {text(
              "六步推導 · 與圖形同步",
              "Six-step derivation · Linked to the graph"
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            {text(
              "用單步 / 播放控制逐步顯示約束、可行區域、真正頂點、目標線及最優支撐。最後一步依目前精確引擎結果推導。",
              "Step or play through constraints, feasible region, true vertices, objective lines, and optimal support. The final step is derived from the current exact engine result."
            )}
          </p>
          <StepDisplay
            key={stepSignature}
            steps={steps}
            title={text("完整六步計算", "Complete six-step calculation")}
            onStepChange={onStepChange}
          />
        </section>
      )}
    </main>
  );
}
