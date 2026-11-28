import { describe, expect, it } from "vitest";
import { renderToString } from "katex";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DeterminantDiagram, {
  DETERMINANT_PRESETS_2D,
  DETERMINANT_PRESETS_3D,
  DETERMINANT_STEP_COUNT,
  crossDeterminantColumns,
  determinant2D,
  determinant3D,
  determinantFacts,
  determinantGeometry,
  determinantSteps,
  projectDeterminantPoint,
  type Matrix2,
  type Matrix3,
  type Vector3,
} from "./DeterminantDiagram";

const cjk = /[\u3400-\u9fff]/;
const allMatrices = [
  ...Object.values(DETERMINANT_PRESETS_2D),
  ...Object.values(DETERMINANT_PRESETS_3D),
];

describe("determinant exact numeric model", () => {
  it("matches the original card's 2x2 determinant exactly", () => {
    expect(determinant2D(DETERMINANT_PRESETS_2D.positive)).toBe(1);
    expect(determinantFacts(DETERMINANT_PRESETS_2D.positive)).toEqual({
      determinant: 1,
      measure: 1,
      singular: false,
      orientation: "preserved",
    });
  });

  it("separates negative signed area from positive geometric area", () => {
    expect(determinantFacts(DETERMINANT_PRESETS_2D.negative)).toEqual({
      determinant: -1,
      measure: 1,
      singular: false,
      orientation: "reversed",
    });
  });

  it("detects dependent and all-zero 2D columns without an orientation", () => {
    for (const matrix of [
      DETERMINANT_PRESETS_2D.zero,
      [
        [0, 0],
        [0, 0],
      ] as Matrix2,
    ]) {
      expect(determinantFacts(matrix)).toEqual({
        determinant: 0,
        measure: 0,
        singular: true,
        orientation: "collapsed",
      });
    }
  });

  it("preserves unit area under the shear preset", () => {
    expect(determinant2D(DETERMINANT_PRESETS_2D.shear)).toBe(1);
    expect(
      determinantGeometry(DETERMINANT_PRESETS_2D.shear, {
        stage: 5,
        progress: 1,
      }).vertices
    ).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [3, 1, 0],
      [2, 1, 0],
    ]);
  });

  it("uses the ordered scalar triple product for positive and negative volumes", () => {
    expect(determinant3D(DETERMINANT_PRESETS_3D.positive)).toBe(4);
    expect(determinantFacts(DETERMINANT_PRESETS_3D.negative)).toEqual({
      determinant: -4,
      measure: 4,
      singular: false,
      orientation: "reversed",
    });
  });

  it("identifies coplanar, parallel, and zero-column 3D degeneracies", () => {
    const matrices: Matrix3[] = [
      DETERMINANT_PRESETS_3D.zero,
      [
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
      ],
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
    ];
    for (const matrix of matrices)
      expect(determinantFacts(matrix).singular).toBe(true);
    expect(determinant3D(DETERMINANT_PRESETS_3D.shear)).toBe(1);
  });

  it("reverses the sign when swapping two columns", () => {
    for (const matrix of allMatrices) {
      const swapped = matrix.map(row => [
        row[1],
        row[0],
        ...row.slice(2),
      ]) as unknown as Matrix2 | Matrix3;
      expect(
        determinantFacts(swapped).determinant +
          determinantFacts(matrix).determinant
      ).toBe(0);
    }
  });

  it("computes a base normal perpendicular to both columns", () => {
    const u: Vector3 = [2, -1, 3];
    const v: Vector3 = [1, 2, -2];
    const n = crossDeterminantColumns(u, v);
    expect(n).toEqual([-4, 7, 5]);
    expect(n.reduce((sum, value, j) => sum + value * u[j], 0)).toBe(0);
    expect(n.reduce((sum, value, j) => sum + value * v[j], 0)).toBe(0);
    expect(crossDeterminantColumns(u, u)).toEqual([0, 0, 0]);
  });

  it("guards nonfinite, noninteger, out-of-bounds and malformed matrices", () => {
    const invalid = [
      [
        [NaN, 0],
        [0, 1],
      ],
      [
        [Infinity, 0],
        [0, 1],
      ],
      [
        [1.5, 0],
        [0, 1],
      ],
      [
        [7, 0],
        [0, 1],
      ],
      [[1], [0, 1]],
    ];
    for (const matrix of invalid)
      expect(() => determinantFacts(matrix as unknown as Matrix2)).toThrow(
        RangeError
      );
    expect(
      determinant2D([
        [6, -6],
        [-6, -6],
      ])
    ).toBe(-72);
    expect(
      determinant3D([
        [6, 0, 0],
        [0, 6, 0],
        [0, 0, 6],
      ])
    ).toBe(216);
  });
});

describe("shared-frame geometry", () => {
  it("starts with the unit square and maps each ordered column separately", () => {
    const matrix = DETERMINANT_PRESETS_2D.positive;
    expect(
      determinantGeometry(matrix, { stage: 0, progress: 1 }).columns
    ).toEqual([
      [1, 0, 0],
      [0, 1, 0],
    ]);
    expect(
      determinantGeometry(matrix, { stage: 1, progress: 0.5 }).columns
    ).toEqual([
      [1.5, 2.5, 0],
      [0, 1, 0],
    ]);
    expect(
      determinantGeometry(matrix, { stage: 2, progress: 0.5 }).columns
    ).toEqual([
      [2, 5, 0],
      [0.5, 2, 0],
    ]);
    const target = determinantGeometry(matrix, { stage: 2, progress: 1 });
    expect(target.vertices).toEqual([
      [0, 0, 0],
      [2, 5, 0],
      [3, 8, 0],
      [1, 3, 0],
    ]);
    expect(target.targetReached).toBe(true);
  });

  it("maps the third unit direction into a genuine 3D parallelepiped", () => {
    const start = determinantGeometry(DETERMINANT_PRESETS_3D.positive, {
      stage: 0,
      progress: 1,
    });
    expect(start.vertices).toHaveLength(8);
    expect(start.vertices[7]).toEqual([1, 1, 1]);
    const middle = determinantGeometry(DETERMINANT_PRESETS_3D.positive, {
      stage: 3,
      progress: 0.5,
    });
    expect(middle.columns[2]).toEqual([0, 0.5, 1.5]);
    expect(middle.targetReached).toBe(false);
    const final = determinantGeometry(DETERMINANT_PRESETS_3D.positive, {
      stage: 5,
      progress: 1,
    });
    expect(final.vertices[7]).toEqual([3, 2, 2]);
    expect(final.targetReached).toBe(true);
    expect(final.normal).toEqual([0, 0, 2]);
  });

  it("keeps adjacent stage endpoints geometrically continuous", () => {
    for (const matrix of allMatrices) {
      for (let stage = 0; stage < 5; stage++) {
        const before = determinantGeometry(matrix, { stage, progress: 1 });
        const after = determinantGeometry(matrix, {
          stage: stage + 1,
          progress: 0,
        });
        expect(after.vertices).toEqual(before.vertices);
        expect(after.boundaryReveal).toBe(before.boundaryReveal);
        expect(after.normalReveal).toBe(before.normalReveal);
      }
    }
  });

  it("reveals the oriented boundary, base normal, and result on the matching steps", () => {
    expect(
      determinantGeometry(DETERMINANT_PRESETS_2D.positive, {
        stage: 3,
        progress: 0.25,
      }).boundaryReveal
    ).toBe(0.25);
    expect(
      determinantGeometry(DETERMINANT_PRESETS_3D.positive, {
        stage: 4,
        progress: 0.5,
      }).normalReveal
    ).toBe(0.5);
    expect(
      determinantGeometry(DETERMINANT_PRESETS_3D.positive, {
        stage: 5,
        progress: 0.75,
      }).resultReveal
    ).toBe(0.75);
  });

  it("does not mark the final target singular when interpolation crosses zero", () => {
    const reflection: Matrix2 = [
      [-1, 0],
      [0, 1],
    ];
    const middle = determinantGeometry(reflection, { stage: 1, progress: 0.5 });
    expect(middle.columns[0]).toEqual([0, 0, 0]);
    expect(middle.targetReached).toBe(false);
    expect(determinantFacts(reflection)).toEqual({
      determinant: -1,
      measure: 1,
      singular: false,
      orientation: "reversed",
    });
  });

  it("returns finite coordinates throughout all presets and clamps invalid frames", () => {
    for (const matrix of allMatrices) {
      for (const stage of [-2, 0, 1, 2, 3, 4, 5, 99, NaN]) {
        for (const progress of [-1, 0, 0.2, 0.5, 1, 2, Infinity, NaN]) {
          const geometry = determinantGeometry(matrix, { stage, progress });
          for (const point of geometry.vertices) {
            expect(point.every(Number.isFinite)).toBe(true);
            expect(
              projectDeterminantPoint(point, matrix.length as 2 | 3).every(
                Number.isFinite
              )
            ).toBe(true);
          }
        }
      }
    }
  });

  it("uses equal projected axis lengths for isometric 3D coordinates", () => {
    for (const point of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as Vector3[]) {
      const projected = projectDeterminantPoint(point, 3);
      expect(Math.hypot(...projected)).toBeCloseTo(1);
    }
    expect(projectDeterminantPoint([2, 5, 0], 2)).toEqual([2, -5]);
  });
});

describe("exact equations and bilingual integration", () => {
  it("provides six valid KaTeX stages for every preset in both languages", () => {
    for (const matrix of allMatrices) {
      for (const lang of ["zh", "en"] as const) {
        const steps = determinantSteps(matrix, lang);
        expect(steps).toHaveLength(DETERMINANT_STEP_COUNT);
        for (const step of steps) {
          expect(step.description).toBeTruthy();
          expect(() =>
            renderToString(step.latex!, { throwOnError: true })
          ).not.toThrow();
          expect(cjk.test(step.latex!)).toBe(false);
          if (lang === "en") expect(cjk.test(step.description!)).toBe(false);
        }
        const facts = determinantFacts(matrix);
        expect(steps[5].latex).toContain(`\\det(A)=${facts.determinant}`);
        expect(steps[5].latex).toContain(`|\\det(A)|=${facts.measure}`);
        expect(steps[5].description).toContain(
          facts.singular
            ? lang === "zh"
              ? "奇異（不可逆）"
              : "singular (not invertible)"
            : lang === "zh"
              ? "非奇異（可逆）"
              : "nonsingular (invertible)"
        );
      }
    }
  });

  it("keeps negative-factor arithmetic valid with explicit parentheses", () => {
    for (const matrix of [
      [
        [-1, 2],
        [3, -2],
      ] as Matrix2,
      [
        [-1, 1, 0],
        [2, -2, 1],
        [0, 1, -1],
      ] as Matrix3,
    ]) {
      const steps = determinantSteps(matrix, "en");
      expect(steps[4].latex).toContain("(-");
      expect(() =>
        renderToString(steps[4].latex!, { throwOnError: true })
      ).not.toThrow();
      expect(() =>
        renderToString(steps[5].latex!, { throwOnError: true })
      ).not.toThrow();
    }
  });

  it("renders the default exact final result, responsive accessible SVG, and English-only UI", () => {
    const markup = renderToStaticMarkup(
      createElement(DeterminantDiagram, { lang: "en", variant: "matrix-det" })
    );
    expect(markup).toContain('data-testid="knowledge-determinant"');
    expect(markup).toContain('data-stage="5"');
    expect(markup).toContain('viewBox="0 0 560 340"');
    expect(markup).toContain('width="100%"');
    expect(markup).toContain('role="img"');
    expect(markup).toContain("Counterclockwise · preserved");
    expect(markup).toContain("Nonsingular (invertible)");
    expect(markup).toContain("det(A) = 1");
    expect(markup).toContain(
      "An interpolated collapse does not make the target A singular"
    );
    expect(cjk.test(markup)).toBe(false);
  });

  it("renders Chinese labels and unique SVG marker IDs across instances", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(DeterminantDiagram, { lang: "zh" }),
        createElement(DeterminantDiagram, { lang: "zh" })
      )
    );
    expect(markup).toContain("行列式：帶符號的面積與體積");
    expect(markup).toContain("逆時針 · 保留定向");
    const ids = [...markup.matchAll(/<marker id="([^"]+)"/g)].map(
      match => match[1]
    );
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
