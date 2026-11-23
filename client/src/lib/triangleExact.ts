import { add, div, isZero, mul, neg, rat, ratToLatex, sub, type Rational as Rat } from "./rational";
import type { Vec3 } from "./vectorMath";

type RatVec3 = [Rat, Rat, Rat];

export interface TriangleExactResult {
  centroid: string;
  incenter: string;
  circumcenter: string;
  orthocenter: string;
  sideA: string;
  sideB: string;
  sideC: string;
}

/** Read the decimal representation of a finite JS number, without guessing fractions. */
function decimalRat(value: number): Rat {
  if (!Number.isFinite(value)) throw new Error("Triangle coordinates must be finite numbers");
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(value));
  if (!match) throw new Error("Invalid decimal triangle coordinate");
  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0") - fraction.length;
  const numerator = BigInt(`${match[1]}${match[2]}${fraction}`);
  return exponent >= 0
    ? rat(numerator * 10n ** BigInt(exponent))
    : rat(numerator, 10n ** BigInt(-exponent));
}

function vectorRat(point: Vec3): RatVec3 {
  if (point.length !== 3) throw new Error("Triangle vertices must be 3D points");
  return [decimalRat(point[0]), decimalRat(point[1]), decimalRat(point[2])];
}

function vectorSub(a: RatVec3, b: RatVec3): RatVec3 {
  return [sub(a[0], b[0]), sub(a[1], b[1]), sub(a[2], b[2])];
}

function dot(a: RatVec3, b: RatVec3): Rat {
  return add(add(mul(a[0], b[0]), mul(a[1], b[1])), mul(a[2], b[2]));
}

function tuple(coordinates: string[]): string {
  return `\\left(${coordinates.join(",\\, ")}\\right)`;
}

/** Floor square root by integer Newton iteration; never converts a bigint to Number. */
function integerSqrt(value: bigint): bigint {
  if (value < 0n) throw new Error("Cannot take the square root of a negative number");
  if (value < 2n) return value;
  let root = 1n << BigInt(Math.ceil(value.toString(2).length / 2));
  let next = (root + value / root) / 2n;
  while (next < root) {
    root = next;
    next = (root + value / root) / 2n;
  }
  return root;
}

interface Root {
  coefficient: Rat;
  radicand: Rat;
}

/**
 * Returns an exact rational coefficient times a radical. Small radicals receive
 * bounded square-factor extraction. Huge radicals remain sqrt(exact rational),
 * rather than spending unbounded time factoring or inventing decimal approximations.
 */
function exactRoot(square: Rat): Root {
  const numeratorRoot = integerSqrt(square.n);
  const denominatorRoot = integerSqrt(square.d);
  if (numeratorRoot * numeratorRoot === square.n && denominatorRoot * denominatorRoot === square.d) {
    return { coefficient: rat(numeratorRoot, denominatorRoot), radicand: rat(1n) };
  }
  const product = square.n * square.d;
  if (product > 1_000_000_000_000n) {
    return { coefficient: rat(1n), radicand: square };
  }
  // sqrt(n/d) = sqrt(n*d)/d. Every extraction is an exact identity,
  // even if the divisor bound leaves a non-square-free radicand behind.
  let inside = product;
  let outside = 1n;
  for (let divisor = 2n; divisor <= 2048n && divisor * divisor <= inside; divisor++) {
    const factor = divisor * divisor;
    while (inside % factor === 0n) {
      outside *= divisor;
      inside /= factor;
    }
  }
  const remainingRoot = integerSqrt(inside);
  if (remainingRoot * remainingRoot === inside) {
    outside *= remainingRoot;
    inside = 1n;
  }
  return { coefficient: rat(outside, square.d), radicand: rat(inside) };
}

function rootLatex(root: Root): string {
  if (isZero(root.coefficient)) return "0";
  if (root.radicand.n === root.radicand.d) return ratToLatex(root.coefficient);
  const radical = `\\sqrt{${ratToLatex(root.radicand)}}`;
  if (root.coefficient.n === root.coefficient.d) return radical;
  return `${ratToLatex(root.coefficient)}\\cdot ${radical}`;
}

function rootKey(root: Root): string {
  return `${root.radicand.n}/${root.radicand.d}`;
}

/** Combine identical radicals and rational terms, preserving exact coefficients. */
function rootSum(roots: Root[]): Root[] {
  const terms = new Map<string, Root>();
  for (const root of roots) {
    const key = rootKey(root);
    const previous = terms.get(key);
    terms.set(key, {
      radicand: root.radicand,
      coefficient: previous ? add(previous.coefficient, root.coefficient) : root.coefficient,
    });
  }
  return [...terms.values()].filter(term => !isZero(term.coefficient));
}

function sumLatex(terms: Root[]): string {
  if (terms.length === 0) return "0";
  return terms.map((term, index) => {
    const negative = term.coefficient.n < 0n;
    const unsigned = rootLatex({ ...term, coefficient: negative ? neg(term.coefficient) : term.coefficient });
    if (index === 0) return negative ? `-${unsigned}` : unsigned;
    return `${negative ? " - " : " + "}${unsigned}`;
  }).join("");
}

/** Detect exact cancellation of a common radical sum (including constant coordinates). */
function proportionalRatio(numerator: Root[], denominator: Root[]): Rat | null {
  if (numerator.length === 0) return rat(0n);
  const coefficients = new Map(numerator.map(term => [rootKey(term), term.coefficient]));
  if (coefficients.size !== denominator.length) return null;
  let ratio: Rat | null = null;
  for (const term of denominator) {
    const coefficient = coefficients.get(rootKey(term));
    if (!coefficient) return null;
    const current = div(coefficient, term.coefficient);
    if (ratio && !isZero(sub(ratio, current))) return null;
    ratio = current;
  }
  return ratio;
}

/**
 * Exact coordinate tuples and side lengths as LaTeX (without math delimiters).
 * a = |BC|, b = |CA|, c = |AB|. All rational computations use the exact
 * decimal/scientific String(number) inputs, including snapped drag coordinates.
 * Throws for non-finite, repeated, or exactly collinear vertices; no fake centers.
 */
export function triangleExact(A: Vec3, B: Vec3, C: Vec3): TriangleExactResult {
  const a = vectorRat(A);
  const b = vectorRat(B);
  const c = vectorRat(C);
  const ab = vectorSub(b, a);
  const ac = vectorSub(c, a);
  const bc = vectorSub(c, b);
  const d1 = dot(ab, ab);
  const d2 = dot(ab, ac);
  const d3 = dot(ac, ac);
  const determinant = sub(mul(d1, d3), mul(d2, d2));
  if (isZero(determinant)) throw new Error("Triangle vertices must be distinct and non-collinear");

  // O = A + s AB + t AC. The equal-distance equations are the
  // exact 2x2 Gram system [d1 d2; d2 d3] [s;t] = [d1/2;d3/2].
  const rhs1 = div(d1, rat(2n));
  const rhs2 = div(d3, rat(2n));
  const s = div(sub(mul(rhs1, d3), mul(rhs2, d2)), determinant);
  const t = div(sub(mul(d1, rhs2), mul(d2, rhs1)), determinant);
  const centroid = a.map((coordinate, i) => div(add(add(coordinate, b[i]), c[i]), rat(3n)));
  const circumcenter = a.map((coordinate, i) => add(coordinate, add(mul(s, ab[i]), mul(t, ac[i]))));
  // H = A+B+C-2O = 3G-2O, valid in any affine 3D triangle plane.
  const orthocenter = a.map((coordinate, i) => sub(add(add(coordinate, b[i]), c[i]), mul(rat(2n), circumcenter[i])));

  const sides = [exactRoot(dot(bc, bc)), exactRoot(d3), exactRoot(d1)];
  const perimeter = rootSum(sides);
  const incenter = a.map((_, i) => {
    const numerator = rootSum(sides.map((side, j) => ({
      ...side,
      coefficient: mul(side.coefficient, [a, b, c][j][i]),
    })));
    const cancelled = proportionalRatio(numerator, perimeter);
    return cancelled ? ratToLatex(cancelled) : `\\frac{${sumLatex(numerator)}}{${sumLatex(perimeter)}}`;
  });

  return {
    centroid: tuple(centroid.map(ratToLatex)),
    incenter: tuple(incenter),
    circumcenter: tuple(circumcenter.map(ratToLatex)),
    orthocenter: tuple(orthocenter.map(ratToLatex)),
    sideA: rootLatex(sides[0]),
    sideB: rootLatex(sides[1]),
    sideC: rootLatex(sides[2]),
  };
}
