/**
 * Curated original DSE-style practice questions for vector and coordinate geometry.
 * These are original teaching questions inspired by the DSE assessment style;
 * they are not reproductions of official HKEAA past-paper questions.
 */
import type { PracticeQuestion } from "@/components/PracticePanel";

export type DseVectorTopic = "2d" | "3d" | "centers";

export interface DseVectorPracticeQuestion extends PracticeQuestion {
  id: string;
  topic: DseVectorTopic;
  marks: number;
  skillZh: string;
  skillEn: string;
}

const TOL = 1e-7;

function parseRational(token: string): number | null {
  const compact = token.trim();
  const fraction = compact.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\/([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
      ? numerator / denominator
      : null;
  }
  const value = Number(compact);
  return Number.isFinite(value) ? value : null;
}

function parseVector(input: string): number[] | null {
  const tokens = input
    .replace(/[\[\](){}]/g, " ")
    .replace(/[;,]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return null;
  const values = tokens.map(parseRational);
  return values.some((value) => value === null) ? null : values as number[];
}

function checkVector(expected: number[]) {
  return (input: string) => {
    const actual = parseVector(input);
    return actual !== null
      && actual.length === expected.length
      && actual.every((value, index) => Math.abs(value - expected[index]) < TOL);
  };
}

function checkScalar(expected: number) {
  return (input: string) => {
    const actual = parseRational(input.replace(/[=\s]/g, ""));
    return actual !== null && Math.abs(actual - expected) < TOL;
  };
}

function checkExactRoot(expectedForms: string[]) {
  return (input: string) => {
    const normalized = input
      .trim()
      .replace(/\\frac\{5\\sqrt\{3\}\}\{2\}/g, "5sqrt3/2")
      .replace(/\\sqrt\{3\}/g, "sqrt3")
      .replace(/√\s*3/g, "sqrt3")
      .replace(/[\\{}\s*·⋅()]/g, "")
      .toLowerCase();
    return expectedForms.includes(normalized);
  };
}

function vectorHint(dim: 2 | 3, lang: "zh" | "en") {
  const example = dim === 2 ? "2 6" : "3 2 2";
  return lang === "zh"
    ? `輸入 ${dim} 個分量，以空格分隔，例如：${example}。可輸入分數如 8/3。`
    : `Enter ${dim} components separated by spaces, e.g. ${example}. Fractions such as 8/3 are accepted.`;
}

function scalarHint(lang: "zh" | "en") {
  return lang === "zh" ? "輸入一個數值；分數可寫成 8/3。" : "Enter one value; fractions such as 8/3 are accepted.";
}

/** Returns the fixed, original DSE-style question set in the chosen language. */
export function getDseVectorPracticeQuestions(lang: "zh" | "en" = "zh"): DseVectorPracticeQuestion[] {
  const zh = lang === "zh";
  const question = (zhText: string, enText: string) => zh ? zhText : enText;

  return [
    {
      id: "2d-resultant",
      topic: "2d",
      marks: 3,
      skillZh: "位置向量與合向量",
      skillEn: "Position vectors and resultant",
      questionLatex: question(
        "\\text{在平面上，}\\;\\mathbf a=\\begin{pmatrix}3\\\\4\\end{pmatrix},\\;\\mathbf b=\\begin{pmatrix}-1\\\\2\\end{pmatrix}.\\;\\text{求 }\\mathbf a+\\mathbf b。",
        "\\text{In a plane, }\\;\\mathbf a=\\begin{pmatrix}3\\\\4\\end{pmatrix},\\;\\mathbf b=\\begin{pmatrix}-1\\\\2\\end{pmatrix}.\\;\\text{Find }\\mathbf a+\\mathbf b."
      ),
      inputHint: vectorHint(2, lang),
      answerDisplay: "2, 6",
      answerLatex: "\\mathbf a+\\mathbf b=\\begin{pmatrix}2\\\\6\\end{pmatrix}",
      checkAnswer: checkVector([2, 6]),
      solutionLatex: "\\begin{aligned}\\mathbf a+\\mathbf b&=\\begin{pmatrix}3+(-1)\\\\4+2\\end{pmatrix}\\\\&=\\begin{pmatrix}2\\\\6\\end{pmatrix}.\\end{aligned}",
    },
    {
      id: "2d-angle",
      topic: "2d",
      marks: 3,
      skillZh: "內積與夾角",
      skillEn: "Dot product and angle",
      questionLatex: question(
        "\\mathbf a=\\begin{pmatrix}2\\\\1\\end{pmatrix},\\;\\mathbf b=\\begin{pmatrix}1\\\\-2\\end{pmatrix}.\\;\\text{利用內積求 }\\mathbf a\\text{ 與 }\\mathbf b\\text{ 的夾角（度）。}",
        "\\mathbf a=\\begin{pmatrix}2\\\\1\\end{pmatrix},\\;\\mathbf b=\\begin{pmatrix}1\\\\-2\\end{pmatrix}.\\;\\text{Use the dot product to find the angle between }\\mathbf a\\text{ and }\\mathbf b\\text{ (in degrees).}"
      ),
      inputHint: question("輸入角度，例如：90", "Enter the angle in degrees, e.g. 90"),
      answerDisplay: "90",
      answerLatex: "\\theta=90^\\circ=\\frac{\\pi}{2}",
      checkAnswer: checkScalar(90),
      solutionLatex: question(
        "\\begin{aligned}\\mathbf a\\cdot\\mathbf b&=2(1)+1(-2)=0.\\\\\\therefore\\;\\mathbf a\\perp\\mathbf b&\\Rightarrow\\theta=90^\\circ.\\end{aligned}",
        "\\begin{aligned}\\mathbf a\\cdot\\mathbf b&=2(1)+1(-2)=0.\\\\\\therefore\\;\\mathbf a\\perp\\mathbf b&\\Rightarrow\\theta=90^\\circ.\\end{aligned}"
      ),
    },
    {
      id: "2d-section-formula",
      topic: "2d",
      marks: 4,
      skillZh: "內分點與參數式",
      skillEn: "Section formula and vector parameters",
      questionLatex: question(
        "\\text{點 }P(1,2),\\;Q(7,5).\\;R\\text{ 將 }PQ\\text{ 內分，且 }PR:RQ=2:1.\\;\\text{求 }R\\text{ 的坐標。}",
        "\\text{Points }P(1,2),\\;Q(7,5)\\text{ are given. }R\\text{ divides }PQ\\text{ internally in the ratio }PR:RQ=2:1.\\;\\text{Find }R."
      ),
      inputHint: vectorHint(2, lang),
      answerDisplay: "5, 4",
      answerLatex: "R=(5,4)",
      checkAnswer: checkVector([5, 4]),
      solutionLatex: "\\begin{aligned}\\overrightarrow{PR}&=\\frac{2}{3}\\overrightarrow{PQ}=\\frac{2}{3}\\begin{pmatrix}6\\\\3\\end{pmatrix}=\\begin{pmatrix}4\\\\2\\end{pmatrix}.\\\\R&=P+\\overrightarrow{PR}=(1,2)+(4,2)=(5,4).\\end{aligned}",
    },
    {
      id: "2d-area",
      topic: "2d",
      marks: 3,
      skillZh: "二維向量的面積",
      skillEn: "Area from two-dimensional vectors",
      questionLatex: question(
        "\\overrightarrow{OA}=\\begin{pmatrix}4\\\\1\\end{pmatrix},\\;\\overrightarrow{OB}=\\begin{pmatrix}1\\\\5\\end{pmatrix}.\\;\\text{求由 }\\overrightarrow{OA},\\overrightarrow{OB}\\text{ 所張的平行四邊形面積。}",
        "\\overrightarrow{OA}=\\begin{pmatrix}4\\\\1\\end{pmatrix},\\;\\overrightarrow{OB}=\\begin{pmatrix}1\\\\5\\end{pmatrix}.\\;\\text{Find the area of the parallelogram spanned by }\\overrightarrow{OA}\\text{ and }\\overrightarrow{OB}."
      ),
      inputHint: scalarHint(lang),
      answerDisplay: "19",
      answerLatex: "\\left|\\det\\begin{pmatrix}4&1\\\\1&5\\end{pmatrix}\\right|=19",
      checkAnswer: checkScalar(19),
      solutionLatex: "\\text{Area}=\\left|4(5)-1(1)\\right|=19.",
    },
    {
      id: "3d-chain-vector",
      topic: "3d",
      marks: 3,
      skillZh: "空間位置向量",
      skillEn: "Three-dimensional position vectors",
      questionLatex: question(
        "\\overrightarrow{OA}=\\begin{pmatrix}1\\\\-2\\\\3\\end{pmatrix},\\;\\overrightarrow{AB}=\\begin{pmatrix}2\\\\4\\\\-1\\end{pmatrix}.\\;\\text{求 }\\overrightarrow{OB}。",
        "\\overrightarrow{OA}=\\begin{pmatrix}1\\\\-2\\\\3\\end{pmatrix},\\;\\overrightarrow{AB}=\\begin{pmatrix}2\\\\4\\\\-1\\end{pmatrix}.\\;\\text{Find }\\overrightarrow{OB}."
      ),
      inputHint: vectorHint(3, lang),
      answerDisplay: "3, 2, 2",
      answerLatex: "\\overrightarrow{OB}=\\begin{pmatrix}3\\\\2\\\\2\\end{pmatrix}",
      checkAnswer: checkVector([3, 2, 2]),
      solutionLatex: "\\overrightarrow{OB}=\\overrightarrow{OA}+\\overrightarrow{AB}=\\begin{pmatrix}1+2\\\\-2+4\\\\3+(-1)\\end{pmatrix}=\\begin{pmatrix}3\\\\2\\\\2\\end{pmatrix}.",
    },
    {
      id: "3d-perpendicular",
      topic: "3d",
      marks: 3,
      skillZh: "空間內積與垂直",
      skillEn: "Three-dimensional dot product and perpendicularity",
      questionLatex: question(
        "\\mathbf u=\\begin{pmatrix}2\\\\1\\\\-2\\end{pmatrix},\\;\\mathbf v=\\begin{pmatrix}1\\\\2\\\\2\\end{pmatrix}.\\;\\text{求 }\\mathbf u\\cdot\\mathbf v\\text{，並判斷兩向量是否垂直。輸入內積。}",
        "\\mathbf u=\\begin{pmatrix}2\\\\1\\\\-2\\end{pmatrix},\\;\\mathbf v=\\begin{pmatrix}1\\\\2\\\\2\\end{pmatrix}.\\;\\text{Find }\\mathbf u\\cdot\\mathbf v\\text{ and decide whether the vectors are perpendicular. Enter the dot product.}"
      ),
      inputHint: scalarHint(lang),
      answerDisplay: "0",
      answerLatex: "\\mathbf u\\cdot\\mathbf v=0,\\quad\\mathbf u\\perp\\mathbf v",
      checkAnswer: checkScalar(0),
      solutionLatex: "\\mathbf u\\cdot\\mathbf v=2(1)+1(2)+(-2)(2)=0.\\quad\\therefore\\;\\mathbf u\\perp\\mathbf v.",
    },
    {
      id: "3d-triangle-area",
      topic: "3d",
      marks: 5,
      skillZh: "叉積與三角形面積",
      skillEn: "Cross product and triangle area",
      questionLatex: question(
        "\\mathbf u=\\begin{pmatrix}2\\\\-1\\\\1\\end{pmatrix},\\;\\mathbf v=\\begin{pmatrix}1\\\\3\\\\-2\\end{pmatrix}.\\;\\text{若 }\\mathbf u,\\mathbf v\\text{ 為三角形兩邊，求三角形面積（以精確值表示）。}",
        "\\mathbf u=\\begin{pmatrix}2\\\\-1\\\\1\\end{pmatrix},\\;\\mathbf v=\\begin{pmatrix}1\\\\3\\\\-2\\end{pmatrix}.\\;\\text{If }\\mathbf u,\\mathbf v\\text{ are two sides of a triangle, find its area in exact form.}"
      ),
      inputHint: question("輸入精確值，例如：5sqrt3/2 或 5√3/2。", "Enter an exact value, e.g. 5sqrt3/2 or 5√3/2."),
      answerDisplay: "5√3/2",
      answerLatex: "\\text{Area}=\\frac{5\\sqrt{3}}{2}",
      checkAnswer: checkExactRoot(["5sqrt3/2"]),
      solutionLatex: "\\begin{aligned}\\mathbf u\\times\\mathbf v&=\\begin{pmatrix}-1\\\\5\\\\7\\end{pmatrix},\\quad|\\mathbf u\\times\\mathbf v|=\\sqrt{1+25+49}=5\\sqrt3.\\\\\\text{Area of triangle}&=\\frac12|\\mathbf u\\times\\mathbf v|=\\frac{5\\sqrt3}{2}.\\end{aligned}",
    },
    {
      id: "3d-line-point",
      topic: "3d",
      marks: 3,
      skillZh: "空間直線的向量方程",
      skillEn: "Vector equation of a line in space",
      questionLatex: question(
        "\\mathbf r=\\begin{pmatrix}1\\\\0\\\\2\\end{pmatrix}+t\\begin{pmatrix}2\\\\-1\\\\3\\end{pmatrix}.\\;\\text{當 }t=2\\text{ 時，求該點的坐標。}",
        "\\mathbf r=\\begin{pmatrix}1\\\\0\\\\2\\end{pmatrix}+t\\begin{pmatrix}2\\\\-1\\\\3\\end{pmatrix}.\\;\\text{Find the point when }t=2."
      ),
      inputHint: vectorHint(3, lang),
      answerDisplay: "5, -2, 8",
      answerLatex: "\\mathbf r=\\begin{pmatrix}5\\\\-2\\\\8\\end{pmatrix}",
      checkAnswer: checkVector([5, -2, 8]),
      solutionLatex: "\\mathbf r=\\begin{pmatrix}1\\\\0\\\\2\\end{pmatrix}+2\\begin{pmatrix}2\\\\-1\\\\3\\end{pmatrix}=\\begin{pmatrix}5\\\\-2\\\\8\\end{pmatrix}.",
    },
    {
      id: "centers-centroid",
      topic: "centers",
      marks: 3,
      skillZh: "重心",
      skillEn: "Centroid",
      questionLatex: question(
        "\\text{三角形 }ABC\\text{ 的頂點為 }A(0,0),\\;B(6,0),\\;C(0,3).\\;\\text{求重心 }G。",
        "\\text{Triangle }ABC\\text{ has vertices }A(0,0),\\;B(6,0),\\;C(0,3).\\;\\text{Find its centroid }G."
      ),
      inputHint: vectorHint(2, lang),
      answerDisplay: "2, 1",
      answerLatex: "G=(2,1)",
      checkAnswer: checkVector([2, 1]),
      solutionLatex: "G=\\left(\\frac{0+6+0}{3},\\frac{0+0+3}{3}\\right)=(2,1).",
    },
    {
      id: "centers-incenter",
      topic: "centers",
      marks: 5,
      skillZh: "內心與邊長加權",
      skillEn: "Incenter and side-length weighting",
      questionLatex: question(
        "\\text{直角三角形 }ABC\\text{ 的頂點為 }A(0,0),\\;B(6,0),\\;C(0,8).\\;\\text{求內心 }I。",
        "\\text{A right triangle }ABC\\text{ has vertices }A(0,0),\\;B(6,0),\\;C(0,8).\\;\\text{Find its incenter }I."
      ),
      inputHint: vectorHint(2, lang),
      answerDisplay: "2, 2",
      answerLatex: "I=(2,2)",
      checkAnswer: checkVector([2, 2]),
      solutionLatex: "\\begin{aligned}|BC|&=10,\\quad|CA|=8,\\quad|AB|=6.\\\\I&=\\frac{10A+8B+6C}{10+8+6}=\\left(\\frac{48}{24},\\frac{48}{24}\\right)=(2,2).\\end{aligned}",
    },
    {
      id: "centers-circumcenter",
      topic: "centers",
      marks: 3,
      skillZh: "外心與直角三角形",
      skillEn: "Circumcenter of a right triangle",
      questionLatex: question(
        "\\text{三角形 }ABC\\text{ 的頂點為 }A(0,0),\\;B(6,0),\\;C(0,8).\\;\\text{求外心 }O。",
        "\\text{Triangle }ABC\\text{ has vertices }A(0,0),\\;B(6,0),\\;C(0,8).\\;\\text{Find its circumcenter }O."
      ),
      inputHint: vectorHint(2, lang),
      answerDisplay: "3, 4",
      answerLatex: "O=(3,4)",
      checkAnswer: checkVector([3, 4]),
      solutionLatex: question(
        "\\angle A=90^\\circ,\\;\\text{直角三角形的外心是斜邊 }BC\\text{ 的中點。}\\quad O=\\left(\\frac{6+0}{2},\\frac{0+8}{2}\\right)=(3,4).",
        "\\angle A=90^\\circ,\\;\\text{so the circumcenter is the midpoint of the hypotenuse }BC.\\quad O=\\left(\\frac{6+0}{2},\\frac{0+8}{2}\\right)=(3,4)."
      ),
    },
    {
      id: "centers-orthocenter",
      topic: "centers",
      marks: 5,
      skillZh: "垂心與高線",
      skillEn: "Orthocenter and altitudes",
      questionLatex: question(
        "\\text{三角形 }ABC\\text{ 的頂點為 }A(0,0),\\;B(4,0),\\;C(1,3).\\;\\text{求垂心 }H。",
        "\\text{Triangle }ABC\\text{ has vertices }A(0,0),\\;B(4,0),\\;C(1,3).\\;\\text{Find its orthocenter }H."
      ),
      inputHint: vectorHint(2, lang),
      answerDisplay: "1, 1",
      answerLatex: "H=(1,1)",
      checkAnswer: checkVector([1, 1]),
      solutionLatex: question(
        "\\begin{aligned}AB&\\text{ 為水平線，故 }C\\text{ 作出的高為 }x=1.\\\\m_{AC}&=3\\Rightarrow m_{B\\text{ 作出的高}}=-\\frac13.\\\\y&=-\\frac13(x-4).\\;x=1\\text{ 時 }y=1.\\;\\therefore H=(1,1).\\end{aligned}",
        "\\begin{aligned}AB&\\text{ is horizontal, so the altitude through }C\\text{ is }x=1.\\\\m_{AC}&=3\\Rightarrow m_{\\text{altitude through }B}=-\\frac13.\\\\y&=-\\frac13(x-4).\\;\\text{At }x=1,\\;y=1.\\;\\therefore H=(1,1).\\end{aligned}"
      ),
    },
  ];
}
