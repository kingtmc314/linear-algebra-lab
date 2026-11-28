import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import katex from "katex";
import type { KnowledgeFrame } from "./AnimatedKnowledgeLesson";
import MatrixEntriesDiagram, {
  MATRIX_ENTRIES_STAGE_COUNT,
  MATRIX_ENTRIES_VARIANTS,
  addEntries,
  applyEntriesMatrix,
  entryAnimationFrame,
  entryAt,
  entryBasis,
  entryCellPosition,
  entryDot,
  entryGeometricFrame,
  entryMatrixLatex,
  entryMatrixShape,
  entryMotionPoint,
  entryProject,
  entryScreenPoint,
  entryStageProgress,
  entryViewport,
  identityEntries,
  matrixEntriesExample,
  matrixEntriesSteps,
  transposeEntries,
  type EntriesPreset,
} from "./MatrixEntriesDiagram";

const playback = vi.hoisted(() => ({ stage: 5, progress: 1, playing: false }));
vi.mock("./AnimatedKnowledgeLesson", () => ({
  default: ({
    children,
    controls,
    testId,
    steps,
  }: {
    children: (frame: KnowledgeFrame) => ReactNode;
    controls?: ReactNode;
    testId: string;
    steps: { description?: string; latex?: string }[];
  }) =>
    createElement(
      "section",
      { "data-testid": testId },
      controls,
      children(playback),
      createElement("p", null, steps[playback.stage]?.description)
    ),
}));

function scene(
  variant: string,
  stage = 5,
  progress = 1,
  lang: "zh" | "en" = "en"
) {
  Object.assign(playback, { stage, progress, playing: false });
  return renderToStaticMarkup(
    createElement(MatrixEntriesDiagram, { variant, lang })
  );
}

describe("MatrixEntriesDiagram numeric entry model", () => {
  it("uses one-based row and column indices for the original 3 by 2 example", () => {
    const { a } = matrixEntriesExample("matrix-def");
    expect(a).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    expect(entryMatrixShape(a)).toEqual({ rows: 3, columns: 2 });
    expect(entryAt(a, 2, 2)).toBe(4);
    expect(entryAt(a, 3, 2)).toBe(6);
  });
  it("computes the exact card addition without mutating operands", () => {
    const { a, b, result } = matrixEntriesExample("matrix-add");
    expect(result).toEqual([
      [6, 8],
      [10, 12],
    ]);
    expect(a).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(b).toEqual([
      [5, 6],
      [7, 8],
    ]);
    expect(addEntries(b, a)).toEqual(result);
  });
  it("handles negative-entry cancellation and all-zero degeneracy", () => {
    expect(matrixEntriesExample("matrix-add", "signed").result).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(matrixEntriesExample("matrix-def", "signed").a).toEqual([
      [1, -2],
      [-3, 4],
      [5, -6],
    ]);
    expect(matrixEntriesExample("matrix-add", "zero").result).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(matrixEntriesExample("matrix-transpose", "zero").result).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
  });
  it("transposes the rectangular card example and swaps indices exactly", () => {
    const { a, result } = matrixEntriesExample("matrix-transpose");
    expect(a).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(result).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
    expect(entryMatrixShape(result)).toEqual({ rows: 3, columns: 2 });
    expect(entryAt(result, 2, 1)).toBe(entryAt(a, 1, 2));
    expect(transposeEntries(result)).toEqual(a);
  });
  it("preserves values in single-row, single-column and symmetric transpose cases", () => {
    expect(transposeEntries([[0, -2, 3]])).toEqual([[0], [-2], [3]]);
    expect(transposeEntries([[0], [-2], [3]])).toEqual([[0, -2, 3]]);
    expect(
      transposeEntries([
        [1, -2],
        [-2, 0],
      ])
    ).toEqual([
      [1, -2],
      [-2, 0],
    ]);
  });
  it("constructs both card identities, including the one-dimensional boundary", () => {
    const { a, b } = matrixEntriesExample("matrix-identity");
    expect(a).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(b).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(identityEntries(1)).toEqual([[1]]);
    expect(matrixEntriesExample("matrix-identity", "zero").a).toEqual(a);
  });
  it("supports the empty-matrix boundary deterministically", () => {
    expect(entryMatrixShape([])).toEqual({ rows: 0, columns: 0 });
    expect(transposeEntries([])).toEqual([]);
    expect(addEntries([], [])).toEqual([]);
    expect(identityEntries(0)).toEqual([]);
    expect(entryMatrixLatex([])).toBe(String.raw`\varnothing`);
  });
  it("rejects mismatched, ragged, nonfinite and overflowed addition models", () => {
    expect(() => addEntries([[1]], [[1, 2]])).toThrow(RangeError);
    expect(() => addEntries([], [[1]])).toThrow(RangeError);
    expect(() => entryMatrixShape([[1, 2], [3]])).toThrow(RangeError);
    expect(() => entryMatrixShape([[]])).toThrow(RangeError);
    expect(() => transposeEntries([[Infinity]])).toThrow(RangeError);
    expect(() => entryMatrixLatex([[NaN]])).toThrow(RangeError);
    expect(() =>
      addEntries([[Number.MAX_VALUE]], [[Number.MAX_VALUE]])
    ).toThrow(RangeError);
  });
  it("rejects invalid entry indices and unsafe identity dimensions", () => {
    for (const [i, j] of [
      [0, 1],
      [1, 0],
      [2, 1],
      [1, 2],
      [1.5, 1],
      [NaN, 1],
      [1, Infinity],
    ]) {
      expect(() => entryAt([[4]], i, j)).toThrow(RangeError);
    }
    for (const n of [-1, 1.5, Infinity, NaN, 33])
      expect(() => identityEntries(n)).toThrow(RangeError);
  });
});

describe("MatrixEntriesDiagram synchronized motion helpers", () => {
  it("bounds malformed player frames to finite supported stages and progress", () => {
    expect(
      entryAnimationFrame({ stage: -4, progress: -1, playing: false })
    ).toEqual({ stage: 0, progress: 0 });
    expect(
      entryAnimationFrame({ stage: 99, progress: 8, playing: true })
    ).toEqual({ stage: 5, progress: 1 });
    expect(
      entryAnimationFrame({ stage: NaN, progress: Infinity, playing: false })
    ).toEqual({ stage: 0, progress: 0 });
    expect(
      entryAnimationFrame({ stage: 2.9, progress: 0.5, playing: false })
    ).toEqual({ stage: 2, progress: 0.5 });
  });
  it("reveals only the active stage while completed cells remain complete", () => {
    const frame = { stage: 2, progress: 0.4, playing: true };
    expect(entryStageProgress(frame, 1)).toBe(1);
    expect(entryStageProgress(frame, 2)).toBe(0.4);
    expect(entryStageProgress(frame, 3)).toBe(0);
  });
  it("maps indexed cells to finite exact SVG centers", () => {
    expect(entryCellPosition(1, 2, 51, 108, 48)).toEqual({ x: 123, y: 132 });
    expect(entryCellPosition(2, 1, 385, 84, 48)).toEqual({ x: 409, y: 156 });
    expect(() => entryCellPosition(0, 1, 0, 0, 48)).toThrow(RangeError);
    expect(() => entryCellPosition(1, 1, Infinity, 0, 48)).toThrow(RangeError);
    expect(() => entryCellPosition(1, 1, 0, 0, 0)).toThrow(RangeError);
    expect(() =>
      entryCellPosition(3, 3, Number.MAX_VALUE, 0, Number.MAX_VALUE)
    ).toThrow(RangeError);
  });
  it("moves a transpose cell between its exact indexed endpoints", () => {
    const from = { x: 123, y: 132 },
      to = { x: 409, y: 156 };
    expect(entryMotionPoint(from, to, 0)).toEqual(from);
    const end = entryMotionPoint(from, to, 1);
    expect(end.x).toBe(to.x);
    expect(end.y).toBeCloseTo(to.y);
    expect(entryMotionPoint(from, to, 0.5)).toEqual({ x: 266, y: 116 });
    expect(entryMotionPoint(from, to, -1)).toEqual(from);
    expect(entryMotionPoint(from, to, NaN)).toEqual(from);
    expect(() => entryMotionPoint({ x: NaN, y: 0 }, to, 0.5)).toThrow(
      RangeError
    );
  });
  it("keeps signed and degenerate examples finite at every animation stage", () => {
    for (const variant of MATRIX_ENTRIES_VARIANTS)
      for (const preset of ["card", "signed", "zero"] as EntriesPreset[]) {
        const example = matrixEntriesExample(variant, preset);
        for (let stage = 0; stage < MATRIX_ENTRIES_STAGE_COUNT; stage++)
          for (const progress of [0, 0.25, 0.5, 1]) {
            const reveal = entryStageProgress(
              { stage, progress, playing: true },
              2
            );
            for (const [i, row] of example.a.entries())
              for (const j of row.keys()) {
                const point = entryMotionPoint(
                  entryCellPosition(i + 1, j + 1, 40, 70, 44),
                  entryCellPosition(j + 1, i + 1, 360, 70, 44),
                  reveal
                );
                expect(
                  Number.isFinite(point.x) && Number.isFinite(point.y)
                ).toBe(true);
              }
          }
      }
  });
});

describe("MatrixEntriesDiagram equations and responsive SVG", () => {
  it("uses six steps with valid KaTeX and no CJK in any English preset", () => {
    for (const variant of MATRIX_ENTRIES_VARIANTS)
      for (const preset of ["card", "signed", "zero"] as EntriesPreset[])
        for (const lang of ["en", "zh"] as const) {
          const steps = matrixEntriesSteps(
            matrixEntriesExample(variant, preset),
            lang
          );
          expect(steps).toHaveLength(MATRIX_ENTRIES_STAGE_COUNT);
          for (const step of steps) {
            expect(step.description).toBeTruthy();
            expect(() =>
              katex.renderToString(step.latex!, { throwOnError: true })
            ).not.toThrow();
            if (lang === "en")
              expect(step.description + step.latex).not.toMatch(
                /[\u3400-\u9fff]/
              );
          }
        }
  });
  it("matches final formulas to exact card values", () => {
    const final = (variant: (typeof MATRIX_ENTRIES_VARIANTS)[number]) =>
      matrixEntriesSteps(matrixEntriesExample(variant), "en")[5].latex;
    expect(final("matrix-def")).toContain("a_{32}=6");
    expect(final("matrix-add")).toContain(
      String.raw`\begin{bmatrix}6&8\\10&12\end{bmatrix}`
    );
    expect(final("matrix-transpose")).toContain(
      String.raw`\begin{bmatrix}1&4\\2&5\\3&6\end{bmatrix}`
    );
    expect(final("matrix-identity")).toContain(
      String.raw`I_3=\begin{bmatrix}1&0&0\\0&1&0\\0&0&1\end{bmatrix}`
    );
  });
  it.each(MATRIX_ENTRIES_VARIANTS)(
    "renders accessible responsive and genuinely stage-changing geometry for %s",
    variant => {
      const initial = scene(variant, 0, 0);
      const middle = scene(
        variant,
        variant === "matrix-def" ? 4 : variant === "matrix-identity" ? 4 : 2,
        0.4
      );
      const final = scene(variant);
      expect(final).toContain('viewBox="0 0 560 340"');
      expect(final).toContain('width="100%"');
      expect(final).toContain('role="img"');
      expect(final).toContain("aria-labelledby=");
      expect(final).toContain('data-testid="knowledge-matrix-entries"');
      const svg = (html: string) =>
        html.match(/<svg[^>]*data-variant[^>]*>[\s\S]*?<\/svg>/)?.[0];
      expect(svg(initial)).not.toBe(svg(middle));
      expect(svg(middle)).not.toBe(svg(final));
      expect(final).not.toMatch(/[\u3400-\u9fff]|NaN|Infinity/);
    }
  );
  it.each(MATRIX_ENTRIES_VARIANTS)(
    "updates actual SVG geometry within the current stage for %s",
    variant => {
      const stage =
        variant === "matrix-def" ? 4 : variant === "matrix-identity" ? 4 : 2;
      const before = scene(variant, stage, 0.1).match(
        /<svg[^>]*data-variant[^>]*>[\s\S]*?<\/svg>/
      )?.[0];
      const after = scene(variant, stage, 0.9).match(
        /<svg[^>]*data-variant[^>]*>[\s\S]*?<\/svg>/
      )?.[0];
      expect(before).not.toBe(after);
    }
  );
  it("localizes SVG descriptions and uses distinct marker IDs across instances", () => {
    const html = scene("matrix-transpose", 5, 1, "zh");
    expect(html).toContain("行索引用藍色，列索引用橙色");
    Object.assign(playback, { stage: 5, progress: 1 });
    const pair = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(MatrixEntriesDiagram, {
          lang: "en",
          variant: "matrix-add",
        }),
        createElement(MatrixEntriesDiagram, {
          lang: "en",
          variant: "matrix-transpose",
        })
      )
    );
    const markers = [...pair.matchAll(/<marker[^>]*id="([^"]+)"/g)].map(
      match => match[1]
    );
    expect(markers).toHaveLength(7);
    expect(new Set(markers).size).toBe(7);
  });
  it("falls back safely to matrix definition for an unsupported variant", () => {
    expect(scene("not-a-matrix-item")).toContain('data-variant="matrix-def"');
  });
});

describe("MatrixEntriesDiagram actual geometric models", () => {
  const frame = (stage = 5, progress = 1): KnowledgeFrame => ({
    stage,
    progress,
    playing: false,
  });

  it("maps R² input basis into the exact R³ columns, with growing numeric endpoints", () => {
    const example = matrixEntriesExample("matrix-def");
    const initial = entryGeometricFrame(example, frame(0, 0));
    const middle = entryGeometricFrame(example, frame(2, 0.5));
    const final = entryGeometricFrame(example, frame());
    if (
      initial.variant !== "matrix-def" ||
      middle.variant !== "matrix-def" ||
      final.variant !== "matrix-def"
    )
      throw new Error("Wrong variant");
    expect(final.inputDimension).toBe(2);
    expect(final.outputDimension).toBe(3);
    expect(final.basis).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(final.columns).toEqual([
      [1, 3, 5],
      [2, 4, 6],
    ]);
    expect(initial.ends).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
    expect(middle.ends).toEqual([
      [1, 3, 5],
      [1, 2, 3],
    ]);
    expect(final.ends).toEqual(final.columns);
    expect(final.guideEnd).toEqual(final.columns[1]);
  });

  it("constructs Ae₁ + Be₁ tip-to-tail and reaches the actual sum endpoint", () => {
    const example = matrixEntriesExample("matrix-add");
    const half = entryGeometricFrame(example, frame(2, 0.5));
    const end = entryGeometricFrame(example, frame());
    if (half.variant !== "matrix-add" || end.variant !== "matrix-add")
      throw new Error("Wrong variant");
    expect(end.e1).toEqual([1, 0]);
    expect(end.ae1).toEqual([1, 3]);
    expect(end.be1).toEqual([5, 7]);
    expect(end.sum).toEqual([6, 10]);
    expect(half.bStart).toEqual(end.ae1);
    expect(half.bEnd).toEqual([3.5, 6.5]);
    expect(end.bEnd).toEqual(end.sum);
    expect(end.sumEnd).toEqual(end.sum);
    expect(end.guideEnd).toEqual(end.sum);
    const viewport = entryViewport([end.e1, end.ae1, end.be1, end.sum]);
    expect(entryScreenPoint(end.bEnd, viewport)).toEqual(
      entryScreenPoint(end.sumEnd, viewport)
    );
    expect(entryScreenPoint(end.sum, viewport)).toEqual({
      x: viewport.origin.x + 6 * viewport.scale,
      y: viewport.origin.y - 10 * viewport.scale,
    });
  });

  it("handles signed cancellation and zero arrows without invented directions", () => {
    for (const preset of ["signed", "zero"] as const) {
      const model = entryGeometricFrame(
        matrixEntriesExample("matrix-add", preset),
        frame()
      );
      if (model.variant !== "matrix-add") throw new Error("Wrong variant");
      expect(model.sum).toEqual([0, 0]);
      expect(model.bEnd).toEqual([0, 0]);
      expect(model.sumEnd).toEqual([0, 0]);
      expect(model.be1.map((value, i) => value + model.ae1[i])).toEqual([0, 0]);
      const viewport = entryViewport([model.ae1, model.be1, model.sum]);
      expect(entryScreenPoint(model.sumEnd, viewport)).toEqual(viewport.origin);
      expect(viewport.scale).toBeGreaterThan(0);
    }
  });

  it("keeps the nontrivial identity vector fixed for every frame; only guides grow", () => {
    const example = matrixEntriesExample("matrix-identity");
    const viewport = entryViewport([
      [2, -1],
      [1, 1],
    ]);
    for (let stage = 0; stage < 6; stage++)
      for (const progress of [0, 0.3, 0.7, 1]) {
        const model = entryGeometricFrame(example, frame(stage, progress));
        if (model.variant !== "matrix-identity")
          throw new Error("Wrong variant");
        expect(model.x).toEqual([2, -1]);
        expect(model.ix).toEqual(model.x);
        expect(entryScreenPoint(model.ix, viewport)).toEqual(
          entryScreenPoint(model.x, viewport)
        );
      }
    const before = entryGeometricFrame(example, frame(4, 0));
    const after = entryGeometricFrame(example, frame(4, 1));
    if (
      before.variant !== "matrix-identity" ||
      after.variant !== "matrix-identity"
    )
      throw new Error("Wrong variant");
    expect(before.squareGuideEnd).toEqual([1, 0]);
    expect(after.squareGuideEnd).toEqual([1, 1]);
  });

  it("computes the rectangular transpose adjoint equality in correctly dimensioned spaces", () => {
    for (const [preset, ax, aty, dot] of [
      ["card", [5, 11], [9, 12, 15], 27],
      ["signed", [9, -21], [-7, 8, -9], -33],
      ["zero", [0, 0], [0, 0, 0], 0],
    ] as const) {
      const example = matrixEntriesExample("matrix-transpose", preset);
      const model = entryGeometricFrame(example, frame());
      if (model.variant !== "matrix-transpose")
        throw new Error("Wrong variant");
      expect(model.inputDimension).toBe(3);
      expect(model.outputDimension).toBe(2);
      expect(model.x).toEqual([1, -1, 2]);
      expect(model.y).toEqual([1, 2]);
      expect(model.ax).toEqual(ax);
      expect(model.aty).toEqual(aty);
      expect(model.axEnd).toEqual(ax);
      expect(model.atyEnd).toEqual(aty);
      expect(model.lhs).toBe(dot);
      expect(model.rhs).toBe(dot);
      expect(entryDot(applyEntriesMatrix(example.a, model.x), model.y)).toBe(
        entryDot(model.x, applyEntriesMatrix(example.result, model.y))
      );
    }
  });

  it("uses equal projected unit axis lengths without identifying R³ with planar coordinates", () => {
    const axes = [0, 1, 2].map(i => entryProject(entryBasis(3, i)));
    expect(axes[0].x).toBeCloseTo(Math.sqrt(3) / 2);
    expect(axes[0].y).toBeCloseTo(-0.5);
    expect(axes[1].x).toBeCloseTo(Math.sqrt(3) / 2);
    expect(axes[1].y).toBeCloseTo(0.5);
    expect(axes[2]).toEqual({ x: 0, y: 1 });
    for (const axis of axes) expect(Math.hypot(axis.x, axis.y)).toBeCloseTo(1);
    expect(entryProject([1, 3, 5])).not.toEqual(entryProject([2, 4, 6]));
    const viewport = entryViewport([
      [-2, 3],
      [6, 10],
    ]);
    const origin = entryScreenPoint([0, 0], viewport);
    const e1 = entryScreenPoint([1, 0], viewport),
      e2 = entryScreenPoint([0, 1], viewport);
    expect(e1.x - origin.x).toBeCloseTo(origin.y - e2.y);
  });

  it("rejects dimension errors, unsafe projections and numeric overflow", () => {
    expect(() => applyEntriesMatrix([[1, 2]], [1])).toThrow(RangeError);
    expect(() => applyEntriesMatrix([[Number.MAX_VALUE]], [2])).toThrow(
      RangeError
    );
    expect(() => entryDot([1, 2], [1])).toThrow(RangeError);
    expect(() => entryDot([Number.MAX_VALUE], [2])).toThrow(RangeError);
    expect(() => entryBasis(4, 0)).toThrow(RangeError);
    expect(() => entryBasis(3, 3)).toThrow(RangeError);
    expect(() => entryProject([1, 2, 3, 4])).toThrow(RangeError);
    expect(() => entryProject([NaN, 0])).toThrow(RangeError);
    expect(() => entryViewport([])).toThrow(RangeError);
    expect(() =>
      entryViewport([
        [1, 2],
        [1, 2, 3],
      ])
    ).toThrow(RangeError);
    expect(() => entryViewport([[0, 0]], Infinity)).toThrow(RangeError);
    expect(() => entryScreenPoint([1, 2, 3], entryViewport([[0, 0]]))).toThrow(
      RangeError
    );
    expect(() =>
      entryGeometricFrame(
        {
          ...matrixEntriesExample("matrix-def"),
          a: [
            [1, 2],
            [3, 4],
          ],
        },
        frame()
      )
    ).toThrow(RangeError);
  });

  it("keeps all model values and projected frame endpoints finite and in usable bounds", () => {
    const inspect = (value: unknown): void => {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      else if (Array.isArray(value)) value.forEach(inspect);
      else if (value && typeof value === "object")
        Object.values(value).forEach(inspect);
    };
    for (const variant of MATRIX_ENTRIES_VARIANTS)
      for (const preset of ["card", "signed", "zero"] as const) {
        const example = matrixEntriesExample(variant, preset);
        for (let stage = 0; stage < 6; stage++)
          for (const progress of [0, 0.25, 0.5, 1, NaN, Infinity]) {
            const model = entryGeometricFrame(example, frame(stage, progress));
            inspect(model);
            const groups: number[][][] =
              model.variant === "matrix-def"
                ? [
                    model.basis,
                    [
                      ...model.columns,
                      ...model.ends,
                      model.guideStart,
                      model.guideEnd,
                    ],
                  ]
                : model.variant === "matrix-add"
                  ? [
                      [
                        model.e1,
                        model.ae1,
                        model.be1,
                        model.sum,
                        model.aEnd,
                        [...model.bStart],
                        [...model.bEnd],
                        model.sumEnd,
                        [...model.guideEnd],
                      ],
                    ]
                  : model.variant === "matrix-transpose"
                    ? [
                        [
                          model.x,
                          model.aty,
                          model.atyEnd,
                          model.guideStart,
                          model.guideEnd,
                        ],
                        [model.y, model.ax, model.axEnd],
                      ]
                    : [
                        [
                          model.x,
                          model.ix,
                          model.guideCorner,
                          model.guideEnd,
                          model.squareGuideEnd,
                          [1, 1],
                        ],
                      ];
            for (const vectors of groups) {
              const viewport = entryViewport(vectors);
              for (const vector of vectors) {
                const point = entryScreenPoint(vector, viewport);
                expect(point.x).toBeGreaterThanOrEqual(30);
                expect(point.x).toBeLessThanOrEqual(290);
                expect(point.y).toBeGreaterThanOrEqual(25);
                expect(point.y).toBeLessThanOrEqual(235);
              }
            }
          }
      }
    inspect(
      entryGeometricFrame(
        matrixEntriesExample("matrix-def"),
        frame(NaN, Infinity)
      )
    );
  });
});

function geoArrow(html: string, name: string) {
  const line = [...html.matchAll(/<line\b[^>]*>/g)]
    .map(match => match[0])
    .find(value => value.includes(`data-geo-arrow="${name}"`));
  if (!line) throw new Error(`Missing geometric arrow ${name}`);
  return ["x1", "y1", "x2", "y2"].map(attribute =>
    Number(line.match(new RegExp(`${attribute}="([^"]+)"`))?.[1])
  );
}

describe("MatrixEntriesDiagram primary geometric panels", () => {
  it.each([
    ["matrix-def", 2, "column-2"],
    ["matrix-add", 2, "be1-tip"],
    ["matrix-identity", 4, "identity-square-guide"],
    ["matrix-transpose", 2, "aty"],
  ] as const)(
    "changes real SVG endpoint coordinates within shared frame progress for %s",
    (variant, stage, arrow) => {
      const before = scene(variant, stage, 0.1),
        after = scene(variant, stage, 0.9);
      expect(geoArrow(before, arrow)).not.toEqual(geoArrow(after, arrow));
      expect(geoArrow(after, arrow).every(Number.isFinite)).toBe(true);
      expect(after.indexOf('data-testid="matrix-entry-geometry"')).toBeLessThan(
        after.indexOf("data-variant=")
      );
      expect(after).toContain('viewBox="0 0 320 260"');
      expect(after).toContain("text-sm");
    }
  );

  it("never moves identity input/output arrows or the fixed square while constructing guides", () => {
    const initial = scene("matrix-identity", 0, 0),
      middle = scene("matrix-identity", 4, 0.5),
      final = scene("matrix-identity");
    for (const arrow of ["identity-input-fixed", "identity-output-fixed"]) {
      expect(geoArrow(initial, arrow)).toEqual(geoArrow(middle, arrow));
      expect(geoArrow(middle, arrow)).toEqual(geoArrow(final, arrow));
    }
    expect(geoArrow(final, "identity-input-fixed")).toEqual(
      geoArrow(final, "identity-output-fixed")
    );
    const square = (html: string) =>
      html.match(/<polygon[^>]*data-geometry-fixed="unit-square"[^>]*>/)?.[0];
    expect(square(initial)).toBeTruthy();
    expect(square(initial)).toBe(square(final));
  });

  it("labels rectangular map dimensions and disclaims reflection and screen measurements", () => {
    const definition = scene("matrix-def"),
      transpose = scene("matrix-transpose");
    expect(definition).toContain("A : ℝ² → ℝ³");
    expect(definition).toContain("Ae₁ = (1, 3, 5)");
    expect(definition).toContain('data-geometry-plot="3"');
    expect(transpose).toContain("A : ℝ³ → ℝ²");
    expect(transpose).toContain("Aᵀ : ℝ² → ℝ³");
    expect(transpose).toContain("Not a general plane reflection or rotation");
    expect(transpose).toContain("⟨Ax, y⟩ = ⟨x, Aᵀy⟩ = 27");
    expect(transpose).toContain(
      "screen lengths and angles do not measure 3D lengths or angles"
    );
    expect(scene("matrix-transpose", 5, 1, "zh")).toContain(
      "不是一般的平面鏡射"
    );
  });
});
