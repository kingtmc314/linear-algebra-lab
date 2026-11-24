import { describe, expect, it } from "vitest";
import katex from "katex";
import { rat, ratToStr, type Rational } from "./rational";
import {
  LPError,
  lpRational,
  lpErrorMessage,
  solveLinearProgram,
  solveConstantTarget,
  solveCoefficientTarget,
  linearProgramSteps,
  lpConstraintLatex,
  lpObjectiveLatex,
  lpPointLatex,
  type LPConstraintInput,
  type LPInput,
  type LPPoint,
  type LPCoefficientResult,
} from "./linearProgramming";
const c = (
  a: string | number,
  b: string | number,
  relation: LPConstraintInput["relation"],
  rhs: string | number
): LPConstraintInput => ({ id: "constraint", a, b, relation, rhs });
const input = (
  constraints: LPConstraintInput[],
  a: string | number = 1,
  b: string | number = 1,
  constant: string | number = 0
): LPInput => ({ constraints, objective: { a, b, c: constant } });
const s = (r: Rational | null | undefined): string | null =>
  r ? ratToStr(r) : null;
const ps = (p: LPPoint): string => `${s(p.x)},${s(p.y)}`;
const vertices = (r: ReturnType<typeof solveLinearProgram>): string[] =>
  r.vertices.map(ps).sort();
const intervals = (r: LPCoefficientResult) =>
  r.intervals.map(i => [s(i.lower), s(i.upper), i.lowerClosed, i.upperClosed]);
function renders(steps: { latex?: string }[]) {
  expect(steps).toHaveLength(6);
  for (const step of steps)
    if (step.latex) {
      expect(step.latex).not.toMatch(/[\u3400-\u9fff]/);
      expect(() =>
        katex.renderToString(step.latex!, {
          throwOnError: true,
          strict: "error",
        })
      ).not.toThrow();
    }
}
const official2020 = input(
  [c(1, 0, ">=", 0), c(1, 0, "<=", 2), c(2, 1, ">=", -3), c(1, 1, "<=", -1)],
  4,
  3
);
const official2023 = input(
  [c(1, 0, ">=", -3), c(2, 3, "<=", 12), c(5, -3, "<=", -12)],
  0,
  6
);
const official2024 = input(
  [c(1, -2, "<=", 1), c(1, 4, "<=", 13), c(2, -1, ">=", -1)],
  5,
  -2
);
const box = [
  c(1, 0, ">=", 0),
  c(1, 0, "<=", 2),
  c(0, 1, ">=", 0),
  c(0, 1, "<=", 3),
];

// A separate integer-only oracle: comparisons use cross-products and Cramer's rule;
// it does not call lpRational or the solver's arithmetic/projection routines.
interface Q {
  n: bigint;
  d: bigint;
}
const q = (n: bigint, d = 1n): Q => (d < 0n ? { n: -n, d: -d } : { n, d });
const qadd = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d);
const qmul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d);
const qcmp = (a: Q, b: Q): number =>
  a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0;
function integerOracle(i: LPInput): { min: Q; max: Q; points: [Q, Q][] } {
  const cs = i.constraints.map(c => ({
    a: BigInt(c.a),
    b: BigInt(c.b),
    r: BigInt(c.rhs),
    rel: c.relation,
  }));
  const points: [Q, Q][] = [];
  for (let j = 0; j < cs.length; j++)
    for (let k = j + 1; k < cs.length; k++) {
      const p = cs[j],
        r = cs[k],
        determinant = p.a * r.b - r.a * p.b;
      if (!determinant) continue;
      const x = q(p.r * r.b - r.r * p.b, determinant),
        y = q(p.a * r.r - r.a * p.r, determinant);
      if (
        cs.every(h => {
          const compare = qcmp(qadd(qmul(q(h.a), x), qmul(q(h.b), y)), q(h.r));
          return h.rel === "="
            ? compare === 0
            : h.rel === "<="
              ? compare <= 0
              : compare >= 0;
        })
      )
        points.push([x, y]);
    }
  const values = points
    .map(([x, y]) =>
      qadd(
        qadd(
          qmul(q(BigInt(i.objective.a)), x),
          qmul(q(BigInt(i.objective.b)), y)
        ),
        q(BigInt(i.objective.c))
      )
    )
    .sort(qcmp);
  if (!values.length)
    throw new Error("Oracle expects bounded nonempty test polygon");
  return { min: values[0], max: values[values.length - 1], points };
}
function assertOracle(i: LPInput) {
  const oracle = integerOracle(i),
    actual = solveLinearProgram(i);
  expect(actual.feasible).toBe(true);
  expect(actual.regionBounded).toBe(true);
  expect(qcmp(actual.min.value!, oracle.min)).toBe(0);
  expect(qcmp(actual.max.value!, oracle.max)).toBe(0);
  for (const optimum of [actual.min, actual.max]) {
    expect(optimum.status).toBe("finite");
    const witness = optimum.witness!;
    for (const h of i.constraints) {
      const comparison = qcmp(
        qadd(qmul(q(BigInt(h.a)), witness.x), qmul(q(BigInt(h.b)), witness.y)),
        q(BigInt(h.rhs))
      );
      expect(
        h.relation === "="
          ? comparison === 0
          : h.relation === "<="
            ? comparison <= 0
            : comparison >= 0
      ).toBe(true);
    }
  }
}

describe("exact scalar parsing and safe mathematical labels", () => {
  it.each([
    ["0.1", "1/10"],
    [".125", "1/8"],
    ["-12.50", "-25/2"],
    ["+2.", "2"],
    ["1.25e-3", "1/800"],
    ["-2.5E+4", "-25000"],
    ["1e120", "1" + "0".repeat(120)],
    ["3/6", "1/2"],
    ["0.2 / 1e-1", "2"],
    ["1/-2", "-1/2"],
    ["−7/14", "-1/2"],
    ["9007199254740993", "9007199254740993"],
    ["1e-120", "1/" + "1" + "0".repeat(120)],
  ])("parses %s exactly as %s", (v, expected) =>
    expect(s(lpRational(v))).toBe(expected)
  );
  it("uses decimal spelling for finite number inputs without approximating", () => {
    expect(lpRational(0.1)).toEqual(rat(1n, 10n));
    expect(s(lpRational(1e-7))).toBe("1/10000000");
  });
  it.each([
    "",
    "1/0",
    "1/0e3",
    "1/2/3",
    "NaN",
    "Infinity",
    "0x10",
    "1e121",
    "1e-121",
    "9".repeat(121),
    "2 + 3",
    "\\frac{1}{2}",
  ])("rejects malformed or excessive scalar %s", v =>
    expect(() => lpRational(v)).toThrow(LPError)
  );
  it("validates runtime inputs and localizes errors", () => {
    expect(() => lpRational(Infinity)).toThrow(LPError);
    expect(() =>
      solveLinearProgram(
        input(Array.from({ length: 13 }, () => c(0, 0, "<=", 1)))
      )
    ).toThrow(LPError);
    expect(() => solveLinearProgram(input([c(1, 0, "<" as "<=", 0)]))).toThrow(
      LPError
    );
    expect(lpErrorMessage(new LPError("zeroDenominator"), "en")).toContain(
      "denominator"
    );
    expect(lpErrorMessage(new Error("unsafe raw text"), "zh")).not.toContain(
      "unsafe"
    );
  });
  it("renders supported Greek and Latin names without unsafe LaTeX interpolation", () => {
    for (const name of ["β", "alpha", "\\theta", "ϕ", "ο", "x"]) {
      const names = { x: name, y: "y", parameter: "β", constant: "κ" };
      const r = solveLinearProgram(official2020);
      renders(linearProgramSteps(r, "min", "zh", names));
      renders(solveConstantTarget(r, "min", 24, "en", names).steps);
      renders(
        solveCoefficientTarget(official2023, "max", 24, "a", "en", names).steps
      );
    }
    expect(() =>
      lpConstraintLatex(c(1, 1, "<=", 3), { x: "x}\\htmlClass{bad}{" })
    ).toThrow(LPError);
    expect(lpObjectiveLatex({ a: -1, b: "1/2", c: 0 })).toBe(
      "-x+\\frac{1}{2}y"
    );
    expect(lpPointLatex({ x: rat(-1n, 3n), y: rat(2n) })).toContain(
      "-\\frac{1}{3}"
    );
  });
});

describe("independently checked official transcriptions", () => {
  it("2020: all four vertices give base minimum -13 and k = 37", () => {
    const result = solveLinearProgram(official2020);
    expect(vertices(result)).toEqual(["0,-1", "0,-3", "2,-3", "2,-7"].sort());
    expect(s(result.min.value)).toBe("-13");
    expect(s(result.max.value)).toBe("-1");
    expect(result.min.points.map(ps)).toEqual(["2,-7"]);
    const constant = solveConstantTarget(result, "min", 24, "en");
    expect(s(constant.value)).toBe("37");
    assertOracle(official2020);
    renders(constant.steps);
  });
  it("2023: ALL vertices imply beta >= 4; beta >= -10 alone is wrong", () => {
    const result = solveLinearProgram(official2023);
    expect(vertices(result)).toEqual(["-3,-1", "-3,6", "0,4"].sort());
    const answer = solveCoefficientTarget(official2023, "max", 24, "a", "zh");
    expect(intervals(answer)).toEqual([["4", null, true, false]]);
    for (const beta of ["-10", "0", "3.999", "4", "5", "1000000"]) {
      const actual = solveLinearProgram({
        ...official2023,
        objective: { a: beta, b: 6, c: 0 },
      });
      const expected = lpRational(beta).n >= 4n * lpRational(beta).d;
      expect(s(actual.max.value) === "24").toBe(expected);
    }
    const tied = solveLinearProgram({
      ...official2023,
      objective: { a: 4, b: 6, c: 0 },
    });
    expect(tied.max.multiple).toBe(true);
    expect(tied.max.points.map(ps).sort()).toEqual(["-3,6", "0,4"].sort());
    expect(answer.steps[3].latex).toContain("36");
    renders(answer.steps);
    assertOracle(official2023);
  });
  it("2024 confirmed coefficient 5 gives minimum -3 and additive c = 25", () => {
    const result = solveLinearProgram(official2024);
    expect(vertices(result)).toEqual(["-1,-1", "1,3", "5,2"].sort());
    expect(s(result.min.value)).toBe("-3");
    expect(s(result.max.value)).toBe("21");
    expect(
      s(solveConstantTarget(result, "min", 22, "zh", { constant: "c" }).value)
    ).toBe("25");
    assertOracle(official2024);
  });
  it.each([-7, -2, 0, 1, 2, 5, 9])(
    "2024 generic coefficient %s is computed rather than assumed",
    a => {
      const result = solveLinearProgram({
        ...official2024,
        objective: { a, b: -2, c: 0 },
      });
      const expectedMin = Math.min(-a + 2, a - 6, 5 * a - 4);
      expect(s(result.min.value)).toBe(String(expectedMin));
      expect(s(solveConstantTarget(result, "min", 22, "en").value)).toBe(
        String(22 - expectedMin)
      );
      assertOracle({ ...official2024, objective: { a, b: -2, c: 0 } });
    }
  );
});

describe("general polyhedra, no artificial nonnegativity or vertices", () => {
  it("whole plane has no vertices and nonconstant objective is unbounded both ways", () => {
    const r = solveLinearProgram(input([], 2, -3, 7));
    expect(r.feasible).toBe(true);
    expect(r.regionBounded).toBe(false);
    expect(r.vertices).toEqual([]);
    expect(r.min.status).toBe("unbounded");
    expect(r.max.status).toBe("unbounded");
    expect(ps(r.witness!)).toBe("0,0");
    renders(linearProgramSteps(r, "max", "en"));
  });
  it("constant objective on whole plane is finite, attained everywhere, with no fake vertices", () => {
    const r = solveLinearProgram(input([], 0, 0, "-7/3"));
    expect(s(r.min.value)).toBe("-7/3");
    expect(s(r.max.value)).toBe("-7/3");
    expect(r.min.multiple).toBe(true);
    expect(r.min.points).toEqual([]);
    expect(s(solveConstantTarget(r, "max", "2/3", "zh").value)).toBe("3");
    renders(linearProgramSteps(r, "min", "zh"));
  });
  it("strip has finite attained extrema without any vertices", () => {
    const r = solveLinearProgram(
      input([c(1, 0, ">=", -2), c(1, 0, "<=", 3)], 2, 0, 1)
    );
    expect(r.vertices).toEqual([]);
    expect(r.regionBounded).toBe(false);
    expect(s(r.min.value)).toBe("-3");
    expect(s(r.max.value)).toBe("7");
    expect(ps(r.min.witness!)).toBe("-2,0");
    expect(ps(r.max.witness!)).toBe("3,0");
    expect(r.min.points).toEqual([]);
    expect(r.max.multiple).toBe(true);
    renders(linearProgramSteps(r, "max", "en"));
  });
  it("tilted strip requires exact projection and has finite objective despite unbounded coordinates", () => {
    const r = solveLinearProgram(
      input([c(2, 3, ">=", "-1/3"), c(2, 3, "<=", "7/5")], 4, 6, "2/7")
    );
    expect(r.vertices).toEqual([]);
    expect(s(r.min.value)).toBe("-8/21");
    expect(s(r.max.value)).toBe("108/35");
    expect(r.regionBounded).toBe(false);
    expect(r.min.multiple).toBe(true);
    renders(linearProgramSteps(r, "min", "en"));
  });
  it("half-plane can have a finite optimum on an unbounded face", () => {
    const r = solveLinearProgram(input([c(1, 2, ">=", 5)], 1, 2));
    expect(r.vertices).toEqual([]);
    expect(s(r.min.value)).toBe("5");
    expect(r.max.status).toBe("unbounded");
    expect(r.min.multiple).toBe(true);
  });
  it("a full affine line has no vertices, a constant-along-line objective, and lineality", () => {
    const r = solveLinearProgram(input([c(2, -3, "=", 7)], 4, -6, 5));
    expect(r.vertices).toEqual([]);
    expect(s(r.min.value)).toBe("19");
    expect(s(r.max.value)).toBe("19");
    expect(r.min.multiple).toBe(true);
    expect(r.regionBounded).toBe(false);
    renders(linearProgramSteps(r, "min", "en"));
  });
  it("a line segment has only endpoint vertices and an optimizer edge", () => {
    const r = solveLinearProgram(
      input([c(1, 1, "=", -3), c(1, 0, ">=", -5), c(1, 0, "<=", 2)], 2, 2)
    );
    expect(vertices(r)).toEqual(["-5,2", "2,-5"]);
    expect(r.regionBounded).toBe(true);
    expect(s(r.min.value)).toBe("-6");
    expect(r.min.multiple).toBe(true);
    expect(r.max.points).toHaveLength(2);
  });
  it("a singleton point is bounded and constant objective does not mean multiple optimizers", () => {
    const r = solveLinearProgram(
      input([c(1, 1, "=", 1), c(2, -1, "=", 5)], 0, 0, 9)
    );
    expect(vertices(r)).toEqual(["2,-1"]);
    expect(r.regionBounded).toBe(true);
    expect(r.min.multiple).toBe(false);
  });
  it("a ray has one true endpoint vertex and finite minimum, unbounded maximum", () => {
    const r = solveLinearProgram(
      input([c(1, -1, "=", 2), c(1, 0, ">=", 3)], 1, 1)
    );
    expect(vertices(r)).toEqual(["3,1"]);
    expect(s(r.min.value)).toBe("4");
    expect(r.max.status).toBe("unbounded");
    expect(r.min.multiple).toBe(false);
  });
  it("quadrant with one vertex has unbounded region but finite objective minimum", () => {
    const r = solveLinearProgram(
      input([c(1, 0, ">=", -3), c(0, 1, ">=", -4)], 2, 3, 1)
    );
    expect(vertices(r)).toEqual(["-3,-4"]);
    expect(s(r.min.value)).toBe("-17");
    expect(r.max.status).toBe("unbounded");
  });
  it("objective may be unbounded with two true vertices despite a finite corner maximum", () => {
    const r = solveLinearProgram(
      input([c(1, 0, ">=", 0), c(1, 0, "<=", 1), c(0, 1, ">=", 0)], 0, 1)
    );
    expect(vertices(r)).toEqual(["0,0", "1,0"]);
    expect(r.max.status).toBe("unbounded");
    expect(s(r.min.value)).toBe("0");
  });
  it("zero-coefficient constraints are exact tautologies or contradictions", () => {
    for (const h of [c(0, 0, "<=", 1), c(0, 0, ">=", -1), c(0, 0, "=", 0)])
      expect(solveLinearProgram(input([h])).feasible).toBe(true);
    for (const h of [
      c(0, 0, "<=", "-1e-120"),
      c(0, 0, ">=", 1),
      c(0, 0, "=", 2),
    ]) {
      const r = solveLinearProgram(input([h], 0, 0, 7));
      expect(r.feasible).toBe(false);
      expect(r.regionBounded).toBe(false);
      expect(r.min.status).toBe("infeasible");
      expect(solveConstantTarget(r, "min", 1, "en").status).toBe("infeasible");
      expect(
        solveCoefficientTarget(input([h]), "min", 1, "a", "en").status
      ).toBe("infeasible");
      renders(linearProgramSteps(r, "min", "en"));
    }
  });
  it("contradictory parallel bounds and disjoint lines are infeasible without vertices", () => {
    for (const constraints of [
      [c(1, 0, "<=", -2), c(1, 0, ">=", 3)],
      [c(1, 2, "=", 3), c(2, 4, "=", 7)],
    ]) {
      const r = solveLinearProgram(input(constraints));
      expect(r.feasible).toBe(false);
      expect(r.vertices).toEqual([]);
      expect(r.witness).toBeUndefined();
    }
  });
  it("redundant, parallel, coincident and equality constraints deduplicate true vertices", () => {
    const r = solveLinearProgram(
      input([...box, c(2, 0, "<=", 4), c(1, 0, "<=", 9), c(0, 0, "=", 0)])
    );
    expect(vertices(r)).toEqual(["0,0", "0,3", "2,0", "2,3"]);
  });
  it("invalid intersections are explicitly rejected and every vertex is compared", () => {
    const r = solveLinearProgram(input([...box, c(1, 1, "<=", 4)], 2, -1));
    const steps = linearProgramSteps(r, "max", "en");
    expect(steps[2].latex).toContain("\\times");
    expect((steps[3].latex!.match(/F\(P_/g) ?? []).length).toBe(
      r.vertices.length
    );
    renders(steps);
  });
  it("fractional coordinates and tiny determinants stay exact", () => {
    const r = solveLinearProgram(
      input(
        [
          c("1/3", "2/7", "=", "1/11"),
          c("1/3", "2/7.0000000000000000001", "=", "1/13"),
        ],
        "2/3",
        "-7/5",
        "1/2"
      )
    );
    expect(r.feasible).toBe(true);
    expect(r.regionBounded).toBe(true);
    expect(r.vertices).toHaveLength(1);
    expect(r.vertices[0].x.n.toString().length).toBeGreaterThan(18);
    expect(r.min.value).toEqual(r.max.value);
  });
});

describe("parameter target requires global bound AND exact attainment", () => {
  it("constant anchor can make a complete half-infinite interval", () => {
    const answer = solveCoefficientTarget(
      input(box, 0, 1),
      "max",
      3,
      "a",
      "en"
    );
    expect(intervals(answer)).toEqual([[null, "0", false, true]]);
    renders(answer.steps);
  });
  it("one-corner target without a constant attaining anchor gives an isolated value", () => {
    const answer = solveCoefficientTarget(
      input([c(1, 0, ">=", 1), c(1, 0, "<=", 2), c(0, 1, "=", 0)], 0, 0),
      "max",
      4,
      "a",
      "en"
    );
    expect(intervals(answer)).toEqual([["2", "2", true, true]]);
  });
  it("both signs can give two distinct isolated solutions", () => {
    const answer = solveCoefficientTarget(
      input([c(1, 0, ">=", -1), c(1, 0, "<=", 1), c(0, 1, "=", 0)], 0, 0),
      "max",
      2,
      "a",
      "en"
    );
    expect(intervals(answer)).toEqual([
      ["-2", "-2", true, true],
      ["2", "2", true, true],
    ]);
    renders(answer.steps);
  });
  it("an impossible target gives empty, not just a loose bound interval", () => {
    const answer = solveCoefficientTarget(
      input(box, 0, 1),
      "max",
      4,
      "a",
      "en"
    );
    expect(intervals(answer)).toEqual([["1/2", "1/2", true, true]]);
    const empty = solveCoefficientTarget(
      input([c(1, 0, "=", 0), c(0, 1, "=", 0)], 0, 0),
      "max",
      1,
      "a",
      "en"
    );
    expect(empty.status).toBe("empty");
    expect(empty.intervals).toEqual([]);
  });
  it("whole real line of parameter values when objective is independent of the replaced coordinate", () => {
    const answer = solveCoefficientTarget(
      input([c(1, 0, "=", 0), c(0, 1, "<=", 3)], 0, 2, 1),
      "max",
      7,
      "a",
      "en"
    );
    expect(intervals(answer)).toEqual([[null, null, false, false]]);
    renders(answer.steps);
  });
  it("a no-vertex strip yields isolated parameters using true boundary anchors", () => {
    const i = input([c(1, 0, ">=", -1), c(1, 0, "<=", 1)], 0, 0);
    expect(solveLinearProgram(i).vertices).toEqual([]);
    expect(intervals(solveCoefficientTarget(i, "max", 2, "a", "en"))).toEqual([
      ["-2", "-2", true, true],
      ["2", "2", true, true],
    ]);
    renders(solveCoefficientTarget(i, "max", 2, "a", "zh").steps);
  });
  it("whole plane forces zero slopes by opposite recession rays", () => {
    expect(
      intervals(solveCoefficientTarget(input([], 0, 0, 3), "min", 3, "a", "en"))
    ).toEqual([["0", "0", true, true]]);
    expect(
      solveCoefficientTarget(input([], 0, 1, 3), "min", 3, "a", "en").status
    ).toBe("empty");
    expect(
      solveCoefficientTarget(input([], 0, 0, 3), "max", 4, "a", "en").status
    ).toBe("empty");
  });
  it("slanted affine line requires cancellation and fixed constant preservation", () => {
    const i = input([c(1, -2, "=", 3)], 0, -4, 1);
    expect(intervals(solveCoefficientTarget(i, "min", 7, "a", "en"))).toEqual([
      ["2", "2", true, true],
    ]);
    expect(solveCoefficientTarget(i, "min", 8, "a", "en").status).toBe("empty");
  });
  it("ray and quadrant recession conditions give entire intervals and reject bad slopes", () => {
    const ray = input([c(1, 0, ">=", 0), c(0, 1, "=", 2)], 0, 3, 1);
    expect(intervals(solveCoefficientTarget(ray, "min", 7, "a", "en"))).toEqual(
      [["0", null, true, false]]
    );
    expect(intervals(solveCoefficientTarget(ray, "max", 7, "a", "en"))).toEqual(
      [[null, "0", false, true]]
    );
    expect(
      intervals(
        solveCoefficientTarget(
          input([c(1, 0, ">=", 0), c(0, 1, ">=", 0)], 0, -2),
          "max",
          0,
          "a",
          "en"
        )
      )
    ).toEqual([[null, "0", false, true]]);
  });
  it("an unbounded region with true vertices needs recession restrictions too", () => {
    const i = input(
      [c(1, 0, ">=", 0), c(1, 0, "<=", 1), c(0, 1, ">=", 0)],
      0,
      1
    );
    expect(solveCoefficientTarget(i, "max", 1, "a", "en").status).toBe("empty");
    expect(intervals(solveCoefficientTarget(i, "min", 0, "a", "en"))).toEqual([
      ["0", null, true, false],
    ]);
  });
  it("replacing b is symmetric and preserves a and the additive constant", () => {
    const swapped = input(
      official2023.constraints.map(h => c(h.b, h.a, h.relation, h.rhs)),
      6,
      "not used",
      2
    );
    expect(
      intervals(
        solveCoefficientTarget(swapped, "max", 26, "b", "en", {
          parameter: "λ",
        })
      )
    ).toEqual([["4", null, true, false]]);
    renders(
      solveCoefficientTarget(swapped, "max", 26, "b", "en", { parameter: "λ" })
        .steps
    );
  });
  it("finite closed parameter interval from two vertex inequalities and target attainment", () => {
    const i = input(
      [
        c(1, 0, ">=", -1),
        c(1, 0, "<=", 1),
        c(1, 1, "<=", 0),
        c(-1, 1, "<=", 0),
        c(0, 1, ">=", -1),
      ],
      0,
      1
    );
    expect(intervals(solveCoefficientTarget(i, "max", 0, "a", "en"))).toEqual([
      ["-1", "1", true, true],
    ]);
  });
  it("additive target uses fixed c once and cannot fix an unbounded objective", () => {
    const r = solveLinearProgram(input(box, 1, 1, 5));
    expect(s(solveConstantTarget(r, "max", 24, "en").value)).toBe("14");
    const u = solveLinearProgram(input([], 1, 0));
    expect(solveConstantTarget(u, "max", 24, "en").status).toBe("unbounded");
  });
});

describe("independent oracle across 150 deterministic varied samples", () => {
  for (const level of [1, 2, 3])
    for (let j = 0; j < 50; j++) {
      it(`level ${level} sample ${j}: exact extrema, feasible optimizer, numerical corner cross-check`, () => {
        const left = -2 - (j % 5),
          right = 1 + (j % 7),
          bottom = -3 - (j % 4),
          top = 2 + (j % 6);
        const constraints = [
          c(1, 0, ">=", left),
          c(1, 0, "<=", right),
          c(0, 1, ">=", bottom),
          c(0, 1, "<=", top),
        ];
        if (level >= 2)
          constraints.push(
            c(1 + (j % 3), 1 + (j % 2), "<=", Math.max(1, right + top - 1))
          );
        if (level >= 3)
          constraints.push(
            c(-2, 3, "<=", 3 + (j % 9)),
            c(3, -1, "<=", 4 + (j % 8))
          );
        const i = input(
          constraints,
          ((j * 7) % 13) - 6,
          ((j * 11) % 17) - 8,
          (j % 9) - 4
        );
        assertOracle(i);
        const r = solveLinearProgram(i),
          oracle = integerOracle(i);
        const numericValues = oracle.points.map(
          ([x, y]) =>
            (Number(i.objective.a) * Number(x.n)) / Number(x.d) +
            (Number(i.objective.b) * Number(y.n)) / Number(y.d) +
            Number(i.objective.c)
        );
        expect(Number(r.min.value!.n) / Number(r.min.value!.d)).toBeCloseTo(
          Math.min(...numericValues),
          10
        );
        expect(Number(r.max.value!.n) / Number(r.max.value!.d)).toBeCloseTo(
          Math.max(...numericValues),
          10
        );
        if (j % 10 === 0)
          renders(
            linearProgramSteps(
              r,
              j % 2 ? "min" : "max",
              level % 2 ? "zh" : "en"
            )
          );
      });
    }
});
