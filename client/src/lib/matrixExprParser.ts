/**
 * matrixExprParser.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Parses and evaluates free-form matrix expressions such as:
 *   A - 1/2 * B + C
 *   A^(-1) * B
 *   det(A)
 *   A^T + 2*B
 *   inv(A) * (B + C)
 *   3*A^2 - B^T
 *
 * Grammar (simplified EBNF):
 *   expr    = term  { ('+' | '-') term }
 *   term    = factor { '*' factor }
 *   factor  = ['-'] primary  postfix*
 *   postfix = '^' ( integer | '(' '-' integer ')' | 'T' | 't' )
 *           | '\'' (transpose shorthand)
 *   primary = MATRIX_NAME
 *           | NUMBER
 *           | '(' expr ')'
 *           | 'det' '(' expr ')'
 *           | 'tr'  '(' expr ')'
 *           | 'inv' '(' expr ')'
 *           | 'T'   '(' expr ')'   (transpose function form)
 *
 * Values are either:
 *   { kind: "matrix", data: RatMatrix }
 *   { kind: "scalar", data: Rational }
 *
 * Steps are collected as the expression is evaluated so the UI can display
 * a full derivation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  type Rational,
  type RatMatrix,
  rat,
  fromFloat,
  add as rAdd,
  sub as rSub,
  mul as rMul,
  div as rDiv,
  neg as rNeg,
  isZero as rIsZero,
  toNumber as rToNumber,
  ratToLatex,
  ratMatLatex,
  toRatMatrix,
} from "./rational";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatrixEnv = Record<string, number[][]>; // e.g. { A: [[1,2],[3,4]], B: ... }

type MVal =
  | { kind: "matrix"; data: RatMatrix; rows: number; cols: number }
  | { kind: "scalar"; data: Rational };

export interface ExprStep {
  descriptionZh: string;
  descriptionEn: string;
  latex: string;
}

export type ExprResult =
  | { ok: true; value: MVal; steps: ExprStep[]; resultLatex: string }
  | { ok: false; error: string; steps: ExprStep[] };

// ─── Rational matrix helpers ──────────────────────────────────────────────────

function mVal(data: RatMatrix): MVal {
  return { kind: "matrix", data, rows: data.length, cols: data[0]?.length ?? 0 };
}
function sVal(data: Rational): MVal {
  return { kind: "scalar", data };
}

function ratMatAdd(A: RatMatrix, B: RatMatrix): RatMatrix {
  return A.map((row, i) => row.map((v, j) => rAdd(v, B[i][j])));
}
function ratMatSub(A: RatMatrix, B: RatMatrix): RatMatrix {
  return A.map((row, i) => row.map((v, j) => rSub(v, B[i][j])));
}
function ratMatMul(A: RatMatrix, B: RatMatrix): RatMatrix {
  const m = A.length, n = B[0].length, k = B.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      A[i].reduce((acc, _, l) => rAdd(acc, rMul(A[i][l], B[l][j])), rat(0))
    )
  );
}
function ratMatScale(A: RatMatrix, s: Rational): RatMatrix {
  return A.map(row => row.map(v => rMul(v, s)));
}
function ratMatTranspose(A: RatMatrix): RatMatrix {
  const m = A.length, n = A[0].length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => A[j][i])
  );
}

/** Gauss-Jordan inverse — returns null if singular */
function ratMatInverse(A: RatMatrix): RatMatrix | null {
  const n = A.length;
  // Augment with identity
  const aug: RatMatrix = A.map((row, i) =>
    [...row, ...Array.from({ length: n }, (_, j) => rat(i === j ? 1 : 0))]
  );
  for (let col = 0; col < n; col++) {
    // Find pivot
    let pivotRow = -1;
    for (let r = col; r < n; r++) {
      if (!rIsZero(aug[r][col])) { pivotRow = r; break; }
    }
    if (pivotRow === -1) return null; // singular
    if (pivotRow !== col) [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    const pivotVal = aug[col][col];
    aug[col] = aug[col].map(v => rDiv(v, pivotVal));
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      aug[r] = aug[r].map((v, j) => rSub(v, rMul(factor, aug[col][j])));
    }
  }
  return aug.map(row => row.slice(n));
}

/** Compute determinant using rational cofactor expansion, returns Rational */
function ratDet(A: RatMatrix): Rational {
  const n = A.length;
  if (n === 1) return A[0][0];
  if (n === 2) return rSub(rMul(A[0][0], A[1][1]), rMul(A[0][1], A[1][0]));
  let det = rat(0);
  for (let j = 0; j < n; j++) {
    const minor = A.slice(1).map(row => [...row.slice(0, j), ...row.slice(j + 1)]);
    const sign = j % 2 === 0 ? rat(1) : rat(-1);
    det = rAdd(det, rMul(rMul(sign, A[0][j]), ratDet(minor)));
  }
  return det;
}

/** Compute trace */
function ratTrace(A: RatMatrix): Rational {
  return A.reduce((acc, row, i) => rAdd(acc, row[i]), rat(0));
}

/** Integer matrix power (n >= 0) */
function ratMatPow(A: RatMatrix, n: number): RatMatrix | null {
  const size = A.length;
  if (A[0].length !== size) return null; // must be square
  if (n < 0) {
    const inv = ratMatInverse(A);
    if (!inv) return null;
    return ratMatPow(inv, -n);
  }
  let result: RatMatrix = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => rat(i === j ? 1 : 0))
  );
  let base = A.map(row => [...row]);
  let exp = n;
  while (exp > 0) {
    if (exp % 2 === 1) result = ratMatMul(result, base);
    base = ratMatMul(base, base);
    exp = Math.floor(exp / 2);
  }
  return result;
}

// ─── Tokeniser ────────────────────────────────────────────────────────────────

type TokKind =
  | "NAME"    // A, B, ..., Z, det, inv, tr
  | "NUMBER"  // integer or fraction like 1/2, 3, -2
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "CARET"
  | "LPAREN"
  | "RPAREN"
  | "PRIME"   // ' for transpose
  | "EOF";

interface Token { kind: TokKind; value: string; pos: number }

function tokenise(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    if (/\s/.test(src[i])) { i++; continue; }
    if (src[i] === '+') { tokens.push({ kind: "PLUS", value: "+", pos: i++ }); continue; }
    if (src[i] === '-') { tokens.push({ kind: "MINUS", value: "-", pos: i++ }); continue; }
    if (src[i] === '*') { tokens.push({ kind: "STAR", value: "*", pos: i++ }); continue; }
    if (src[i] === '^') { tokens.push({ kind: "CARET", value: "^", pos: i++ }); continue; }
    if (src[i] === '(') { tokens.push({ kind: "LPAREN", value: "(", pos: i++ }); continue; }
    if (src[i] === ')') { tokens.push({ kind: "RPAREN", value: ")", pos: i++ }); continue; }
    if (src[i] === "'") { tokens.push({ kind: "PRIME", value: "'", pos: i++ }); continue; }
    // Numbers (integer only for now; fractions handled as a/b)
    if (/\d/.test(src[i])) {
      let num = "";
      const start = i;
      while (i < src.length && /\d/.test(src[i])) num += src[i++];
      tokens.push({ kind: "NUMBER", value: num, pos: start });
      continue;
    }
    // Names: sequences of letters
    if (/[A-Za-z]/.test(src[i])) {
      let name = "";
      const start = i;
      while (i < src.length && /[A-Za-z]/.test(src[i])) name += src[i++];
      tokens.push({ kind: "NAME", value: name, pos: start });
      continue;
    }
    throw new Error(`Unexpected character '${src[i]}' at position ${i}`);
  }
  tokens.push({ kind: "EOF", value: "", pos: src.length });
  return tokens;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;
  private env: MatrixEnv;
  public steps: ExprStep[] = [];

  constructor(tokens: Token[], env: MatrixEnv) {
    this.tokens = tokens;
    this.env = env;
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private expect(kind: TokKind): Token {
    const t = this.consume();
    if (t.kind !== kind) throw new Error(`Expected ${kind} but got '${t.value}'`);
    return t;
  }
  private match(...kinds: TokKind[]): boolean {
    return kinds.includes(this.peek().kind);
  }

  /** expr = term { ('+' | '-') term } */
  parseExpr(): MVal {
    let left = this.parseTerm();
    while (this.match("PLUS", "MINUS")) {
      const op = this.consume();
      const right = this.parseTerm();
      if (op.kind === "PLUS") {
        left = this.applyAdd(left, right);
      } else {
        left = this.applySub(left, right);
      }
    }
    return left;
  }

  /** term = factor { '*' factor } */
  private parseTerm(): MVal {
    let left = this.parseFactor();
    while (this.match("STAR")) {
      this.consume();
      const right = this.parseFactor();
      left = this.applyMul(left, right);
    }
    // Implicit multiplication: scalar immediately followed by matrix name / '('
    // e.g. "2A" or "2(A+B)" — handle by checking if left is scalar and next is NAME or LPAREN
    while (
      left.kind === "scalar" &&
      (this.peek().kind === "NAME" || this.peek().kind === "LPAREN")
    ) {
      const right = this.parseFactor();
      left = this.applyMul(left, right);
    }
    return left;
  }

  /** factor = ['-'] primary postfix* */
  private parseFactor(): MVal {
    let negate = false;
    if (this.match("MINUS")) {
      // Only treat as unary minus if not preceded by something that would make it binary
      this.consume();
      negate = true;
    }
    let val = this.parsePrimary();
    // Postfix operators: ^ and '
    while (this.match("CARET", "PRIME")) {
      if (this.peek().kind === "PRIME") {
        this.consume();
        val = this.applyTranspose(val);
      } else {
        this.consume(); // consume ^
        // Could be: integer, (integer), (-integer), T, t
        if (this.peek().kind === "NAME" && /^[Tt]$/.test(this.peek().value)) {
          this.consume();
          val = this.applyTranspose(val);
        } else if (this.peek().kind === "LPAREN") {
          this.consume(); // (
          let negExp = false;
          if (this.match("MINUS")) { this.consume(); negExp = true; }
          const numTok = this.expect("NUMBER");
          const n = parseInt(numTok.value, 10) * (negExp ? -1 : 1);
          this.expect("RPAREN");
          val = this.applyPow(val, n);
        } else if (this.peek().kind === "NUMBER") {
          const numTok = this.consume();
          const n = parseInt(numTok.value, 10);
          val = this.applyPow(val, n);
        } else {
          throw new Error("Expected exponent after '^'");
        }
      }
    }
    if (negate) val = this.applyNegate(val);
    return val;
  }

  /** primary = NAME | NUMBER | '(' expr ')' | det(...) | inv(...) | tr(...) */
  private parsePrimary(): MVal {
    const tok = this.peek();

    if (tok.kind === "NUMBER") {
      this.consume();
      // Check for fraction: NUMBER '/' NUMBER
      if (this.peek().kind === "NAME" && this.peek().value === "") {
        // not a fraction
      }
      // Actually check for slash — we need to handle 1/2 as a fraction
      // Tokeniser doesn't emit SLASH, so we handle it as NAME "/" — but '/' is not a valid char.
      // We handle fractions by checking if next token is NAME "/" — actually we need to add SLASH
      // For now: fractions in expressions must be written as (1/2) using division
      // But we do support integer numbers as scalars
      return sVal(rat(parseInt(tok.value, 10)));
    }

    if (tok.kind === "NAME") {
      const name = tok.value;
      this.consume();

      // Built-in functions
      if (name === "det") {
        this.expect("LPAREN");
        const inner = this.parseExpr();
        this.expect("RPAREN");
        return this.applyDet(inner);
      }
      if (name === "inv") {
        this.expect("LPAREN");
        const inner = this.parseExpr();
        this.expect("RPAREN");
        return this.applyInverse(inner);
      }
      if (name === "tr" || name === "trace") {
        this.expect("LPAREN");
        const inner = this.parseExpr();
        this.expect("RPAREN");
        return this.applyTrace(inner);
      }
      if (name === "T") {
        // T(expr) — transpose function
        if (this.peek().kind === "LPAREN") {
          this.expect("LPAREN");
          const inner = this.parseExpr();
          this.expect("RPAREN");
          return this.applyTranspose(inner);
        }
      }

      // Matrix variable
      if (name.length === 1 && /[A-Z]/.test(name)) {
        if (!(name in this.env)) {
          throw new Error(`Matrix ${name} is not defined`);
        }
        const M = toRatMatrix(this.env[name]);
        const step: ExprStep = {
          descriptionZh: `代入矩陣 ${name}`,
          descriptionEn: `Substitute matrix ${name}`,
          latex: `${name} = ${ratMatLatex(M)}`,
        };
        this.steps.push(step);
        return mVal(M);
      }

      throw new Error(`Unknown name '${name}'`);
    }

    if (tok.kind === "LPAREN") {
      this.consume();
      // Check for fraction: (NUMBER / NUMBER)
      if (this.peek().kind === "NUMBER") {
        const savedPos = this.pos;
        const numTok = this.consume();
        // Check if next is NAME "/" — no, we need to handle division operator
        // Actually, let's check for the pattern (num / num) for fractions
        // We'll treat '/' as a special case by checking for it in the token stream
        // Since '/' is not tokenised, we need to add it. Let's re-check tokeniser.
        // For now, restore and parse as expression
        this.pos = savedPos;
      }
      const val = this.parseExpr();
      this.expect("RPAREN");
      return val;
    }

    throw new Error(`Unexpected token '${tok.value}' at position ${tok.pos}`);
  }

  // ─── Semantic actions ───────────────────────────────────────────────────────

  private applyAdd(a: MVal, b: MVal): MVal {
    if (a.kind === "scalar" && b.kind === "scalar") {
      const r = rAdd(a.data, b.data);
      this.steps.push({
        descriptionZh: "純量加法",
        descriptionEn: "Scalar addition",
        latex: `${ratToLatex(a.data)} + ${ratToLatex(b.data)} = ${ratToLatex(r)}`,
      });
      return sVal(r);
    }
    if (a.kind === "matrix" && b.kind === "matrix") {
      if (a.rows !== b.rows || a.cols !== b.cols)
        throw new Error(`Dimension mismatch for addition: ${a.rows}×${a.cols} + ${b.rows}×${b.cols}`);
      const r = ratMatAdd(a.data, b.data);
      this.steps.push({
        descriptionZh: `矩陣加法（${a.rows}×${a.cols}）`,
        descriptionEn: `Matrix addition (${a.rows}×${a.cols})`,
        latex: `${ratMatLatex(a.data)} + ${ratMatLatex(b.data)} = ${ratMatLatex(r)}`,
      });
      return mVal(r);
    }
    throw new Error("Cannot add a matrix and a scalar");
  }

  private applySub(a: MVal, b: MVal): MVal {
    if (a.kind === "scalar" && b.kind === "scalar") {
      const r = rSub(a.data, b.data);
      this.steps.push({
        descriptionZh: "純量減法",
        descriptionEn: "Scalar subtraction",
        latex: `${ratToLatex(a.data)} - ${ratToLatex(b.data)} = ${ratToLatex(r)}`,
      });
      return sVal(r);
    }
    if (a.kind === "matrix" && b.kind === "matrix") {
      if (a.rows !== b.rows || a.cols !== b.cols)
        throw new Error(`Dimension mismatch for subtraction: ${a.rows}×${a.cols} - ${b.rows}×${b.cols}`);
      const r = ratMatSub(a.data, b.data);
      this.steps.push({
        descriptionZh: `矩陣減法（${a.rows}×${a.cols}）`,
        descriptionEn: `Matrix subtraction (${a.rows}×${a.cols})`,
        latex: `${ratMatLatex(a.data)} - ${ratMatLatex(b.data)} = ${ratMatLatex(r)}`,
      });
      return mVal(r);
    }
    throw new Error("Cannot subtract a matrix and a scalar");
  }

  private applyMul(a: MVal, b: MVal): MVal {
    // scalar * scalar
    if (a.kind === "scalar" && b.kind === "scalar") {
      const r = rMul(a.data, b.data);
      this.steps.push({
        descriptionZh: "純量乘法",
        descriptionEn: "Scalar multiplication",
        latex: `${ratToLatex(a.data)} \\times ${ratToLatex(b.data)} = ${ratToLatex(r)}`,
      });
      return sVal(r);
    }
    // scalar * matrix or matrix * scalar
    if (a.kind === "scalar" && b.kind === "matrix") {
      const r = ratMatScale(b.data, a.data);
      this.steps.push({
        descriptionZh: `純量乘矩陣（${ratToLatex(a.data)} × ${b.rows}×${b.cols}）`,
        descriptionEn: `Scalar × matrix (${ratToLatex(a.data)} × ${b.rows}×${b.cols})`,
        latex: `${ratToLatex(a.data)} \\cdot ${ratMatLatex(b.data)} = ${ratMatLatex(r)}`,
      });
      return mVal(r);
    }
    if (a.kind === "matrix" && b.kind === "scalar") {
      const r = ratMatScale(a.data, b.data);
      this.steps.push({
        descriptionZh: `矩陣乘純量（${a.rows}×${a.cols} × ${ratToLatex(b.data)}）`,
        descriptionEn: `Matrix × scalar (${a.rows}×${a.cols} × ${ratToLatex(b.data)})`,
        latex: `${ratMatLatex(a.data)} \\cdot ${ratToLatex(b.data)} = ${ratMatLatex(r)}`,
      });
      return mVal(r);
    }
    // matrix * matrix
    if (a.kind === "matrix" && b.kind === "matrix") {
      if (a.cols !== b.rows)
        throw new Error(`Dimension mismatch for multiplication: ${a.rows}×${a.cols} × ${b.rows}×${b.cols} (inner dimensions must match)`);
      const r = ratMatMul(a.data, b.data);
      this.steps.push({
        descriptionZh: `矩陣乘法（${a.rows}×${a.cols} × ${b.rows}×${b.cols} → ${a.rows}×${b.cols}）`,
        descriptionEn: `Matrix multiplication (${a.rows}×${a.cols} × ${b.rows}×${b.cols} → ${a.rows}×${b.cols})`,
        latex: `${ratMatLatex(a.data)} \\times ${ratMatLatex(b.data)} = ${ratMatLatex(r)}`,
      });
      return mVal(r);
    }
    throw new Error("Unexpected types in multiplication");
  }

  private applyNegate(a: MVal): MVal {
    if (a.kind === "scalar") return sVal(rNeg(a.data));
    const r = ratMatScale(a.data, rat(-1));
    this.steps.push({
      descriptionZh: "矩陣取負",
      descriptionEn: "Negate matrix",
      latex: `-${ratMatLatex(a.data)} = ${ratMatLatex(r)}`,
    });
    return mVal(r);
  }

  private applyTranspose(a: MVal): MVal {
    if (a.kind === "scalar") return a; // scalar transpose is itself
    const r = ratMatTranspose(a.data);
    this.steps.push({
      descriptionZh: `矩陣轉置（${a.rows}×${a.cols} → ${a.cols}×${a.rows}）`,
      descriptionEn: `Transpose (${a.rows}×${a.cols} → ${a.cols}×${a.rows})`,
      latex: `\\left(${ratMatLatex(a.data)}\\right)^T = ${ratMatLatex(r)}`,
    });
    return mVal(r);
  }

  private applyInverse(a: MVal): MVal {
    if (a.kind !== "matrix") throw new Error("inv() requires a matrix argument");
    if (a.rows !== a.cols) throw new Error(`inv() requires a square matrix, got ${a.rows}×${a.cols}`);
    const r = ratMatInverse(a.data);
    if (!r) throw new Error("Matrix is singular (det = 0), inverse does not exist");
    this.steps.push({
      descriptionZh: `矩陣求逆（${a.rows}×${a.cols}）`,
      descriptionEn: `Matrix inverse (${a.rows}×${a.cols})`,
      latex: `\\left(${ratMatLatex(a.data)}\\right)^{-1} = ${ratMatLatex(r)}`,
    });
    return mVal(r);
  }

  private applyDet(a: MVal): MVal {
    if (a.kind !== "matrix") throw new Error("det() requires a matrix argument");
    if (a.rows !== a.cols) throw new Error(`det() requires a square matrix, got ${a.rows}×${a.cols}`);
    const d = ratDet(a.data);
    this.steps.push({
      descriptionZh: `計算行列式（${a.rows}×${a.rows}）`,
      descriptionEn: `Compute determinant (${a.rows}×${a.rows})`,
      latex: `\\det\\left(${ratMatLatex(a.data)}\\right) = ${ratToLatex(d)}`,
    });
    return sVal(d);
  }

  private applyTrace(a: MVal): MVal {
    if (a.kind !== "matrix") throw new Error("tr() requires a matrix argument");
    if (a.rows !== a.cols) throw new Error(`tr() requires a square matrix, got ${a.rows}×${a.cols}`);
    const t = ratTrace(a.data);
    this.steps.push({
      descriptionZh: `計算跡（${a.rows}×${a.rows}）`,
      descriptionEn: `Compute trace (${a.rows}×${a.rows})`,
      latex: `\\text{tr}\\left(${ratMatLatex(a.data)}\\right) = ${ratToLatex(t)}`,
    });
    return sVal(t);
  }

  private applyPow(a: MVal, n: number): MVal {
    if (a.kind === "scalar") {
      // scalar^n
      let r = rat(1);
      const base = n >= 0 ? a.data : rDiv(rat(1), a.data);
      const absN = Math.abs(n);
      for (let i = 0; i < absN; i++) r = rMul(r, base);
      return sVal(r);
    }
    if (a.rows !== a.cols) throw new Error(`Matrix power requires a square matrix, got ${a.rows}×${a.cols}`);
    if (n === -1) return this.applyInverse(a);
    const r = ratMatPow(a.data, n);
    if (!r) throw new Error(`Cannot compute matrix power A^${n}`);
    this.steps.push({
      descriptionZh: `矩陣 ${n} 次方`,
      descriptionEn: `Matrix power ^${n}`,
      latex: `\\left(${ratMatLatex(a.data)}\\right)^{${n}} = ${ratMatLatex(r)}`,
    });
    return mVal(r);
  }
}

// ─── Tokeniser v2: add SLASH support for fractions ────────────────────────────

function tokeniseFull(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    if (/\s/.test(src[i])) { i++; continue; }
    if (src[i] === '+') { tokens.push({ kind: "PLUS", value: "+", pos: i++ }); continue; }
    if (src[i] === '-') { tokens.push({ kind: "MINUS", value: "-", pos: i++ }); continue; }
    if (src[i] === '*') { tokens.push({ kind: "STAR", value: "*", pos: i++ }); continue; }
    if (src[i] === '^') { tokens.push({ kind: "CARET", value: "^", pos: i++ }); continue; }
    if (src[i] === '(') { tokens.push({ kind: "LPAREN", value: "(", pos: i++ }); continue; }
    if (src[i] === ')') { tokens.push({ kind: "RPAREN", value: ")", pos: i++ }); continue; }
    if (src[i] === "'") { tokens.push({ kind: "PRIME", value: "'", pos: i++ }); continue; }
    // Handle fractions: number/number → emit as single NUMBER token "p/q"
    if (/\d/.test(src[i])) {
      let num = "";
      const start = i;
      while (i < src.length && /\d/.test(src[i])) num += src[i++];
      // Check for fraction
      if (i < src.length && src[i] === '/') {
        const slashPos = i++;
        if (/\d/.test(src[i] ?? "")) {
          let den = "";
          while (i < src.length && /\d/.test(src[i])) den += src[i++];
          tokens.push({ kind: "NUMBER", value: `${num}/${den}`, pos: start });
          continue;
        }
        // Not a fraction — push number and backtrack slash
        tokens.push({ kind: "NUMBER", value: num, pos: start });
        i = slashPos; // will be re-processed as unknown char — skip it
        // Actually just skip the slash as division (not supported standalone)
        i++; // skip slash
        continue;
      }
      tokens.push({ kind: "NUMBER", value: num, pos: start });
      continue;
    }
    if (/[A-Za-z]/.test(src[i])) {
      let name = "";
      const start = i;
      while (i < src.length && /[A-Za-z]/.test(src[i])) name += src[i++];
      tokens.push({ kind: "NAME", value: name, pos: start });
      continue;
    }
    throw new Error(`Unexpected character '${src[i]}' at position ${i}`);
  }
  tokens.push({ kind: "EOF", value: "", pos: src.length });
  return tokens;
}

// ─── Patch Parser to handle fraction NUMBER tokens ────────────────────────────

class ParserV2 extends Parser {
  constructor(tokens: Token[], env: MatrixEnv) {
    super(tokens, env);
  }
}

// Override parsePrimary to handle "p/q" NUMBER tokens
function parseExprFull(src: string, env: MatrixEnv): ExprResult {
  try {
    const tokens = tokeniseFull(src);
    // Patch: replace NUMBER tokens that contain "/" with a rational value
    const patchedTokens = tokens; // we'll handle in parser
    const parser = new ParserFull(patchedTokens, env);
    const val = parser.parseExpr();
    if (parser.peek().kind !== "EOF") {
      throw new Error(`Unexpected token '${parser.peek().value}' — expression not fully parsed`);
    }
    let resultLatex: string;
    if (val.kind === "matrix") {
      resultLatex = ratMatLatex(val.data);
    } else {
      resultLatex = ratToLatex(val.data);
    }
    return { ok: true, value: val, steps: parser.steps, resultLatex };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message, steps: [] };
  }
}

// Full parser with fraction support
class ParserFull {
  private tokens: Token[];
  private pos = 0;
  private env: MatrixEnv;
  public steps: ExprStep[] = [];

  constructor(tokens: Token[], env: MatrixEnv) {
    this.tokens = tokens;
    this.env = env;
  }

  peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private expect(kind: TokKind): Token {
    const t = this.consume();
    if (t.kind !== kind) throw new Error(`Expected ${kind} but got '${t.value}'`);
    return t;
  }
  private match(...kinds: TokKind[]): boolean {
    return kinds.includes(this.peek().kind);
  }

  parseExpr(): MVal {
    let left = this.parseTerm();
    while (this.match("PLUS", "MINUS")) {
      const op = this.consume();
      const right = this.parseTerm();
      left = op.kind === "PLUS" ? this.applyAdd(left, right) : this.applySub(left, right);
    }
    return left;
  }

  private parseTerm(): MVal {
    let left = this.parseFactor();
    while (this.match("STAR")) {
      this.consume();
      const right = this.parseFactor();
      left = this.applyMul(left, right);
    }
    // Implicit multiplication: scalar followed by NAME or LPAREN
    while (
      left.kind === "scalar" &&
      (this.peek().kind === "NAME" || this.peek().kind === "LPAREN")
    ) {
      const right = this.parseFactor();
      left = this.applyMul(left, right);
    }
    return left;
  }

  private parseFactor(): MVal {
    let negate = false;
    if (this.match("MINUS")) {
      this.consume();
      negate = true;
    }
    let val = this.parsePrimary();
    while (this.match("CARET", "PRIME")) {
      if (this.peek().kind === "PRIME") {
        this.consume();
        val = this.applyTranspose(val);
      } else {
        this.consume();
        if (this.peek().kind === "NAME" && /^[Tt]$/.test(this.peek().value)) {
          this.consume();
          val = this.applyTranspose(val);
        } else if (this.peek().kind === "LPAREN") {
          this.consume();
          let negExp = false;
          if (this.match("MINUS")) { this.consume(); negExp = true; }
          const numTok = this.expect("NUMBER");
          const n = parseInt(numTok.value, 10) * (negExp ? -1 : 1);
          this.expect("RPAREN");
          val = this.applyPow(val, n);
        } else if (this.peek().kind === "NUMBER") {
          const numTok = this.consume();
          const n = parseInt(numTok.value, 10);
          val = this.applyPow(val, n);
        } else {
          throw new Error("Expected exponent after '^'");
        }
      }
    }
    if (negate) val = this.applyNegate(val);
    return val;
  }

  private parsePrimary(): MVal {
    const tok = this.peek();

    if (tok.kind === "NUMBER") {
      this.consume();
      // Handle fraction "p/q"
      if (tok.value.includes("/")) {
        const [p, q] = tok.value.split("/").map(Number);
        return sVal(rat(p, q));
      }
      return sVal(rat(parseInt(tok.value, 10)));
    }

    if (tok.kind === "NAME") {
      const name = tok.value;
      this.consume();

      if (name === "det") {
        this.expect("LPAREN");
        const inner = this.parseExpr();
        this.expect("RPAREN");
        return this.applyDet(inner);
      }
      if (name === "inv") {
        this.expect("LPAREN");
        const inner = this.parseExpr();
        this.expect("RPAREN");
        return this.applyInverse(inner);
      }
      if (name === "tr" || name === "trace") {
        this.expect("LPAREN");
        const inner = this.parseExpr();
        this.expect("RPAREN");
        return this.applyTrace(inner);
      }
      if (name === "T") {
        if (this.peek().kind === "LPAREN") {
          this.expect("LPAREN");
          const inner = this.parseExpr();
          this.expect("RPAREN");
          return this.applyTranspose(inner);
        }
      }

      // Single uppercase letter = matrix variable
      if (name.length === 1 && /[A-Z]/.test(name)) {
        if (!(name in this.env)) throw new Error(`Matrix ${name} is not defined`);
        const M = toRatMatrix(this.env[name]);
        this.steps.push({
          descriptionZh: `代入矩陣 ${name}`,
          descriptionEn: `Substitute matrix ${name}`,
          latex: `${name} = ${ratMatLatex(M)}`,
        });
        return mVal(M);
      }

      throw new Error(`Unknown name '${name}'`);
    }

    if (tok.kind === "LPAREN") {
      this.consume();
      const val = this.parseExpr();
      this.expect("RPAREN");
      return val;
    }

    throw new Error(`Unexpected token '${tok.value}' at position ${tok.pos}`);
  }

  // ─── Semantic actions (same as Parser) ─────────────────────────────────────

  private applyAdd(a: MVal, b: MVal): MVal {
    if (a.kind === "scalar" && b.kind === "scalar") {
      const r = rAdd(a.data, b.data);
      this.steps.push({ descriptionZh: "純量加法", descriptionEn: "Scalar addition", latex: `${ratToLatex(a.data)} + ${ratToLatex(b.data)} = ${ratToLatex(r)}` });
      return sVal(r);
    }
    if (a.kind === "matrix" && b.kind === "matrix") {
      if (a.rows !== b.rows || a.cols !== b.cols)
        throw new Error(`Dimension mismatch for addition: ${a.rows}×${a.cols} + ${b.rows}×${b.cols}`);
      const r = ratMatAdd(a.data, b.data);
      this.steps.push({ descriptionZh: `矩陣加法 (${a.rows}×${a.cols})`, descriptionEn: `Matrix addition (${a.rows}×${a.cols})`, latex: `${ratMatLatex(a.data)} + ${ratMatLatex(b.data)} = ${ratMatLatex(r)}` });
      return mVal(r);
    }
    throw new Error("Cannot add a matrix and a scalar");
  }

  private applySub(a: MVal, b: MVal): MVal {
    if (a.kind === "scalar" && b.kind === "scalar") {
      const r = rSub(a.data, b.data);
      this.steps.push({ descriptionZh: "純量減法", descriptionEn: "Scalar subtraction", latex: `${ratToLatex(a.data)} - ${ratToLatex(b.data)} = ${ratToLatex(r)}` });
      return sVal(r);
    }
    if (a.kind === "matrix" && b.kind === "matrix") {
      if (a.rows !== b.rows || a.cols !== b.cols)
        throw new Error(`Dimension mismatch for subtraction: ${a.rows}×${a.cols} - ${b.rows}×${b.cols}`);
      const r = ratMatSub(a.data, b.data);
      this.steps.push({ descriptionZh: `矩陣減法 (${a.rows}×${a.cols})`, descriptionEn: `Matrix subtraction (${a.rows}×${a.cols})`, latex: `${ratMatLatex(a.data)} - ${ratMatLatex(b.data)} = ${ratMatLatex(r)}` });
      return mVal(r);
    }
    throw new Error("Cannot subtract a matrix and a scalar");
  }

  private applyMul(a: MVal, b: MVal): MVal {
    if (a.kind === "scalar" && b.kind === "scalar") {
      const r = rMul(a.data, b.data);
      this.steps.push({ descriptionZh: "純量乘法", descriptionEn: "Scalar multiplication", latex: `${ratToLatex(a.data)} \\times ${ratToLatex(b.data)} = ${ratToLatex(r)}` });
      return sVal(r);
    }
    if (a.kind === "scalar" && b.kind === "matrix") {
      const r = ratMatScale(b.data, a.data);
      this.steps.push({ descriptionZh: `純量乘矩陣 (${ratToLatex(a.data)} × ${b.rows}×${b.cols})`, descriptionEn: `Scalar × matrix (${ratToLatex(a.data)} × ${b.rows}×${b.cols})`, latex: `${ratToLatex(a.data)} \\cdot ${ratMatLatex(b.data)} = ${ratMatLatex(r)}` });
      return mVal(r);
    }
    if (a.kind === "matrix" && b.kind === "scalar") {
      const r = ratMatScale(a.data, b.data);
      this.steps.push({ descriptionZh: `矩陣乘純量 (${a.rows}×${a.cols} × ${ratToLatex(b.data)})`, descriptionEn: `Matrix × scalar (${a.rows}×${a.cols} × ${ratToLatex(b.data)})`, latex: `${ratMatLatex(a.data)} \\cdot ${ratToLatex(b.data)} = ${ratMatLatex(r)}` });
      return mVal(r);
    }
    if (a.kind === "matrix" && b.kind === "matrix") {
      if (a.cols !== b.rows)
        throw new Error(`Dimension mismatch for multiplication: ${a.rows}×${a.cols} × ${b.rows}×${b.cols}`);
      const r = ratMatMul(a.data, b.data);
      this.steps.push({ descriptionZh: `矩陣乘法 (${a.rows}×${a.cols} × ${b.rows}×${b.cols} → ${a.rows}×${b.cols})`, descriptionEn: `Matrix multiplication (${a.rows}×${a.cols} × ${b.rows}×${b.cols} → ${a.rows}×${b.cols})`, latex: `${ratMatLatex(a.data)} \\times ${ratMatLatex(b.data)} = ${ratMatLatex(r)}` });
      return mVal(r);
    }
    throw new Error("Unexpected types in multiplication");
  }

  private applyNegate(a: MVal): MVal {
    if (a.kind === "scalar") return sVal(rNeg(a.data));
    const r = ratMatScale(a.data, rat(-1));
    this.steps.push({ descriptionZh: "矩陣取負", descriptionEn: "Negate matrix", latex: `-${ratMatLatex(a.data)} = ${ratMatLatex(r)}` });
    return mVal(r);
  }

  private applyTranspose(a: MVal): MVal {
    if (a.kind === "scalar") return a;
    const r = ratMatTranspose(a.data);
    this.steps.push({ descriptionZh: `矩陣轉置 (${a.rows}×${a.cols} → ${a.cols}×${a.rows})`, descriptionEn: `Transpose (${a.rows}×${a.cols} → ${a.cols}×${a.rows})`, latex: `\\left(${ratMatLatex(a.data)}\\right)^T = ${ratMatLatex(r)}` });
    return mVal(r);
  }

  private applyInverse(a: MVal): MVal {
    if (a.kind !== "matrix") throw new Error("inv() requires a matrix argument");
    if (a.rows !== a.cols) throw new Error(`inv() requires a square matrix, got ${a.rows}×${a.cols}`);
    const r = ratMatInverse(a.data);
    if (!r) throw new Error("Matrix is singular (det = 0), inverse does not exist");
    this.steps.push({ descriptionZh: `矩陣求逆 (${a.rows}×${a.cols})`, descriptionEn: `Matrix inverse (${a.rows}×${a.cols})`, latex: `\\left(${ratMatLatex(a.data)}\\right)^{-1} = ${ratMatLatex(r)}` });
    return mVal(r);
  }

  private applyDet(a: MVal): MVal {
    if (a.kind !== "matrix") throw new Error("det() requires a matrix argument");
    if (a.rows !== a.cols) throw new Error(`det() requires a square matrix, got ${a.rows}×${a.cols}`);
    const d = ratDet(a.data);
    this.steps.push({ descriptionZh: `計算行列式 (${a.rows}×${a.rows})`, descriptionEn: `Compute determinant (${a.rows}×${a.rows})`, latex: `\\det\\left(${ratMatLatex(a.data)}\\right) = ${ratToLatex(d)}` });
    return sVal(d);
  }

  private applyTrace(a: MVal): MVal {
    if (a.kind !== "matrix") throw new Error("tr() requires a matrix argument");
    if (a.rows !== a.cols) throw new Error(`tr() requires a square matrix, got ${a.rows}×${a.cols}`);
    const t = ratTrace(a.data);
    this.steps.push({ descriptionZh: `計算跡 (${a.rows}×${a.rows})`, descriptionEn: `Compute trace (${a.rows}×${a.rows})`, latex: `\\text{tr}\\left(${ratMatLatex(a.data)}\\right) = ${ratToLatex(t)}` });
    return sVal(t);
  }

  private applyPow(a: MVal, n: number): MVal {
    if (a.kind === "scalar") {
      let r = rat(1);
      const base = n >= 0 ? a.data : rDiv(rat(1), a.data);
      const absN = Math.abs(n);
      for (let i = 0; i < absN; i++) r = rMul(r, base);
      return sVal(r);
    }
    if (a.rows !== a.cols) throw new Error(`Matrix power requires a square matrix, got ${a.rows}×${a.cols}`);
    if (n === -1) return this.applyInverse(a);
    const r = ratMatPow(a.data, n);
    if (!r) throw new Error(`Cannot compute matrix power A^${n}`);
    this.steps.push({ descriptionZh: `矩陣 ${n} 次方`, descriptionEn: `Matrix power ^${n}`, latex: `\\left(${ratMatLatex(a.data)}\\right)^{${n}} = ${ratMatLatex(r)}` });
    return mVal(r);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export { parseExprFull };
export type { MVal };

/** Get the result as a number[][] for display, or null if scalar */
export function mValToMatrix(v: MVal): number[][] | null {
  if (v.kind !== "matrix") return null;
  return v.data.map(row => row.map(c => Number(c.n) / Number(c.d)));
}

/** Get the result as a LaTeX string */
export function mValToLatex(v: MVal): string {
  if (v.kind === "scalar") return ratToLatex(v.data);
  return ratMatLatex(v.data);
}

/** Get dimension string for display */
export function mValDim(v: MVal): string {
  if (v.kind === "scalar") return "scalar";
  return `${v.rows}×${v.cols}`;
}
