import { describe, expect, it } from "vitest";
import {
  Phase20matrixActiveResultLatex,
  Phase20matrixAdaptSteps,
  Phase20matrixExpressionLiteralsAreExact,
  Phase20matrixExpressionSteps,
  Phase20matrixInput,
  Phase20matrixInputIsExact,
  Phase20matrixInverseLatex,
  Phase20matrixParseCell,
  Phase20matrixSafeArithmetic,
} from "./Phase20matrix";
import { parseExprFull, mValToLatex } from "./matrixExprParser";
import { matAdd, matSub, matMul, matTranspose, matScalar, matDeterminant, matInverse } from "./matrixMath";
import { rat, ratMatLatex } from "./rational";

const A = [[1, 2], [3, 4]];
const B = [[2, 0], [1, 2]];
const C = [[1, 1], [0, 1]];

function expectExpression(expression: string, expectedLatex: string) {
  const parsed = parseExprFull(expression, { A, B, C });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error(parsed.error);
  expect(mValToLatex(parsed.value)).toBe(expectedLatex);
  const frames = Phase20matrixExpressionSteps(parsed.steps, mValToLatex(parsed.value));
  // The library's exact simplified LaTeX appears unchanged and in the same order.
  const original = frames.filter(frame => frame.descriptionEn.startsWith("Substep "));
  expect(original.map(frame => frame.latex)).toEqual(parsed.steps.map(step => step.latex));
  expect(frames.at(-1)?.latex).toBe(expectedLatex);
  expect(frames.every(frame => frame.contextZh && frame.contextEn && frame.descriptionZh && frame.descriptionEn)).toBe(true);
}

const intLatex = (values: number[][]) => ratMatLatex(values.map(row => row.map(value => rat(value))));

describe("Phase20matrix expression derivation adapter", () => {
  it("preserves addition, subtraction, scalar multiplication and chain results", () => {
    expectExpression("A+B+C", intLatex([[4, 3], [4, 7]]));
    expectExpression("A-B-C", intLatex([[-2, 1], [2, 1]]));
    expectExpression("2A-B+3*C", intLatex([[3, 7], [5, 9]]));
    expectExpression("A - 1/2*B", ratMatLatex([[rat(0), rat(2)], [rat(5, 2), rat(3)]]));
  });
  it("preserves ordered matrix products and parsing of parentheses", () => {
    expectExpression("A*B*C", intLatex([[4, 8], [10, 18]]));
    expectExpression("(A+B)*C", intLatex([[3, 5], [4, 10]]));
  });
  it("preserves transpose, inverse and powers", () => {
    expectExpression("A^T", intLatex([[1, 3], [2, 4]]));
    expectExpression("A'", intLatex([[1, 3], [2, 4]]));
    expectExpression("inv(A)", ratMatLatex([[rat(-2), rat(1)], [rat(3, 2), rat(-1, 2)]]));
    expectExpression("A^(-1)*B", ratMatLatex([[rat(-3), rat(2)], [rat(5, 2), rat(-1)]]));
    expectExpression("A^2", intLatex([[7, 10], [15, 22]]));
    expectExpression("A^0", intLatex([[1, 0], [0, 1]]));
  });
  it("preserves scalar-returning paths, including parser paths with no steps", () => {
    expectExpression("det(A)", "-2");
    expectExpression("tr(A)", "5");
    expectExpression("det(A)*B", intLatex([[-4, 0], [-2, -4]]));
    expectExpression("-(2)", "-2");
    expectExpression("2^3", "8");
  });
  it("retains existing errors for undefined names, dimensions and singular inverse", () => {
    expect(parseExprFull("D+A", { A }).ok).toBe(false);
    expect(parseExprFull("A+B", { A, B: [[1, 2, 3]] }).ok).toBe(false);
    expect(parseExprFull("inv(A)", { A: [[1, 2], [2, 4]] }).ok).toBe(false);
  });
});

describe("Phase20matrix standard operation adapters", () => {
  it("keeps every original standard-operation equation and result", () => {
    const results = [matAdd(A, B), matSub(A, B), matMul(A, B), matTranspose(A), matScalar(A, 2), matDeterminant(A), matInverse(A)];
    for (const result of results) {
      const adapted = Phase20matrixAdaptSteps(result.steps, "具名輸入與累積結果", "Named inputs and accumulator");
      expect(adapted.map(step => step.latex)).toEqual(result.steps.map(step => step.latex));
      expect(adapted.map(step => step.matrix)).toEqual(result.steps.map(step => step.matrix));
      expect(adapted.every(step => step.contextEn && step.contextZh)).toBe(true);
    }
    expect(matAdd(A, B).result).toEqual([[3, 2], [4, 6]]);
    expect(matSub(A, B).result).toEqual([[-1, 2], [2, 2]]);
    expect(matMul(A, B).result).toEqual([[4, 4], [10, 8]]);
    expect(matDeterminant(A).scalarLatex).toBe("-2");
  });
  it("uses the exact inverse equation instead of reconstructing floating results", () => {
    const inverse = matInverse([[97, 1], [1, 97]]);
    const expected = ratMatLatex([[rat(97, 9408), rat(-1, 9408)], [rat(-1, 9408), rat(97, 9408)]]);
    expect(Phase20matrixInverseLatex(inverse.steps)).toBe(expected);
    expect(Phase20matrixInverseLatex([])).toBeUndefined();
  });
  it("retains the exact result through a following verification or rule frame", () => {
    const inverse = matInverse(A);
    const frames = Phase20matrixAdaptSteps(inverse.steps, "A 是輸入矩陣", "A is the input matrix");
    expect(Phase20matrixActiveResultLatex(frames, frames.length - 1)).toBe(Phase20matrixInverseLatex(inverse.steps));
    const parsed = parseExprFull("A+B+C", { A, B, C });
    if (!parsed.ok) throw new Error(parsed.error);
    const expressionFrames = Phase20matrixExpressionSteps(parsed.steps, mValToLatex(parsed.value));
    const ruleIndex = expressionFrames.findIndex(frame => frame.descriptionEn.startsWith("i indexes rows"));
    expect(Phase20matrixActiveResultLatex(expressionFrames, ruleIndex)).toBe(intLatex(B));
  });
  it("retains singular inverse explanation steps for shared playback", () => {
    const singular = matInverse([[1, 2], [2, 4]]);
    expect(singular.error).toBe("singular");
    expect(Phase20matrixAdaptSteps(singular.steps, "數值容差不是精確證明", "Numerical tolerance is not an exact proof").length).toBe(singular.steps.length);
  });
});

describe("Phase20matrix precision policy", () => {
  it("validates full numeric literals instead of silently accepting invalid prefixes", () => {
    expect(Phase20matrixParseCell("")).toBe(0);
    expect(Phase20matrixParseCell("-3/4")).toBe(-0.75);
    expect(Phase20matrixParseCell("1e-3")).toBe(0.001);
    for (const value of ["1/0", "2oops", "1/2/3", "NaN", "Infinity"]) {
      expect(Phase20matrixParseCell(value)).toBeNull();
    }
  });
  it("certifies fractions by exact cross multiplication, never tolerance", () => {
    expect(Phase20matrixInputIsExact("1/2", 0.5)).toBe(true);
    expect(Phase20matrixInputIsExact("2/6", 1 / 3)).toBe(true);
    expect(Phase20matrixInputIsExact("0.1", 0.1)).toBe(true);
    expect(Phase20matrixInputIsExact("0.3333333333333333", 1 / 3)).toBe(false);
    expect(Phase20matrixInputIsExact("0.0000000000001", 1e-13)).toBe(false);
    expect(Phase20matrixInputIsExact("1001", 1001)).toBe(false);
  });
  it("shows written input separately when the numeric rational model differs", () => {
    const snapshot = Phase20matrixInput("A", [[1 / 3]], [["0.3333333333333333"]], true);
    expect(snapshot.latex).toContain("3333333333333333");
    expect(snapshot.modelLatex).toContain("\\frac{1}{3}");
    expect(Phase20matrixInput("B", [[0.5]], [["1/2"]], true).modelLatex).toBeUndefined();
  });
  it("rejects unsafe expression scalar literals from exact claims", () => {
    expect(Phase20matrixExpressionLiteralsAreExact("A - 1/2*B + 3*C")).toBe(true);
    expect(Phase20matrixExpressionLiteralsAreExact("9007199254740993*A")).toBe(false);
  });
  it("only certifies proven safe integer standard arithmetic", () => {
    expect(Phase20matrixSafeArithmetic("add", A, B)).toBe(true);
    expect(Phase20matrixSafeArithmetic("sub", A, B)).toBe(true);
    expect(Phase20matrixSafeArithmetic("mul", A, B)).toBe(true);
    expect(Phase20matrixSafeArithmetic("transpose", A)).toBe(true);
    expect(Phase20matrixSafeArithmetic("scalar", A, undefined, 2)).toBe(true);
    expect(Phase20matrixSafeArithmetic("scalar", A, undefined, 0.1)).toBe(false);
    expect(Phase20matrixSafeArithmetic("add", [[0.1]], [[0.2]])).toBe(false);
    expect(Phase20matrixSafeArithmetic("add", [[Number.MAX_SAFE_INTEGER]], [[1]])).toBe(false);
    expect(Phase20matrixSafeArithmetic("mul", [[Number.MAX_SAFE_INTEGER, 1]], [[1], [1]])).toBe(false);
  });
});
