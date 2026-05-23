import React, { createContext, useContext, useState } from "react";

export type Lang = "zh" | "en";

type Translations = {
  // App
  appTitle: string;
  appSubtitle: string;
  // Navigation
  navMatrix: string;
  navLinearSystem: string;
  navVector: string;
  navKnowledge: string;
  navEigen: string;
  // Matrix module
  matrixCalc: string;
  matrixA: string;
  matrixB: string;
  matrixResult: string;
  matrixRows: string;
  matrixCols: string;
  opAdd: string;
  opSubtract: string;
  opMultiply: string;
  opTranspose: string;
  opDeterminant: string;
  opInverse: string;
  opScalar: string;
  scalarValue: string;
  calculate: string;
  reset: string;
  steps: string;
  result: string;
  // Linear system
  linearSystem: string;
  numEquations: string;
  numVariables: string;
  coefficients: string;
  constants: string;
  solve: string;
  solution: string;
  noSolution: string;
  infiniteSolutions: string;
  uniqueSolution: string;
  augmentedMatrix: string;
  rowEchelon: string;
  backSubstitution: string;
  // Vector module
  vectorCalc: string;
  vector2D: string;
  vector3D: string;
  vectorA: string;
  vectorB: string;
  opVecAdd: string;
  opVecSubtract: string;
  opDotProduct: string;
  opCrossProduct: string;
  opMagnitude: string;
  opAngle: string;
  opNormalize: string;
  visualization: string;
  magnitude: string;
  angle: string;
  // Errors
  errSingular: string;
  errDimMismatch: string;
  errSquareRequired: string;
  errInvalidInput: string;
  // Labels
  labelOperation: string;
  labelDimension: string;
  labelInput: string;
  labelOutput: string;
  labelStepByStep: string;
  // Practice mode
  practiceMode: string;
  calcMode: string;
  newQuestion: string;
  checkAnswer: string;
  correct: string;
  incorrect: string;
  tryAgain: string;
  showAnswer: string;
  yourAnswer: string;
  practiceQuestion: string;
  enterMatrixAnswer: string;
  enterScalarAnswer: string;
  enterVectorAnswer: string;
  enterEigenvalues: string;
  practiceHintMatrix: string;
  practiceHintVector: string;
  practiceHintEigen: string;
  practiceCorrectMsg: string;
  practiceIncorrectMsg: string;
  // Misc
  language: string;
  darkMode: string;
  lightMode: string;
};

const zh: Translations = {
  appTitle: "線性代數實驗室",
  appSubtitle: "矩陣 · 聯立方程 · 向量",
  navMatrix: "矩陣計算",
  navLinearSystem: "聯立方程",
  navVector: "向量",
  navKnowledge: "知識點庫",
  navEigen: "特徵值與特徵向量",
  matrixCalc: "矩陣計算",
  matrixA: "矩陣 A",
  matrixB: "矩陣 B",
  matrixResult: "計算結果",
  matrixRows: "行數",
  matrixCols: "列數",
  opAdd: "加法 A + B",
  opSubtract: "減法 A − B",
  opMultiply: "乘法 A × B",
  opTranspose: "轉置 Aᵀ",
  opDeterminant: "行列式 det(A)",
  opInverse: "逆矩陣 A⁻¹",
  opScalar: "純量乘法 k·A",
  scalarValue: "純量 k",
  calculate: "計算",
  reset: "重置",
  steps: "計算步驟",
  result: "結果",
  linearSystem: "聯立方程",
  numEquations: "方程數目",
  numVariables: "未知數數目",
  coefficients: "係數矩陣",
  constants: "常數向量",
  solve: "求解",
  solution: "解",
  noSolution: "無解（矛盾方程組）",
  infiniteSolutions: "無限多解",
  uniqueSolution: "唯一解",
  augmentedMatrix: "增廣矩陣",
  rowEchelon: "行階梯形式",
  backSubstitution: "回代求解",
  vectorCalc: "向量計算",
  vector2D: "二維向量",
  vector3D: "三維向量",
  vectorA: "向量 a",
  vectorB: "向量 b",
  opVecAdd: "加法 a + b",
  opVecSubtract: "減法 a − b",
  opDotProduct: "點積 a · b",
  opCrossProduct: "叉積 a × b",
  opMagnitude: "模長 |a|",
  opAngle: "夾角 θ",
  opNormalize: "單位向量 â",
  visualization: "視覺化",
  magnitude: "模長",
  angle: "夾角",
  errSingular: "矩陣為奇異矩陣（行列式為零），無法求逆",
  errDimMismatch: "矩陣維度不符，無法進行此運算",
  errSquareRequired: "此運算需要方陣",
  errInvalidInput: "輸入無效，請輸入數字",
  labelOperation: "運算",
  labelDimension: "維度",
  labelInput: "輸入",
  labelOutput: "輸出",
  labelStepByStep: "逐步解說",
  practiceMode: "練習模式",
  calcMode: "計算模式",
  newQuestion: "新題目",
  checkAnswer: "核對答案",
  correct: "正確！",
  incorrect: "错誤，再試一次！",
  tryAgain: "再試一次",
  showAnswer: "顯示答案",
  yourAnswer: "你的答案",
  practiceQuestion: "練習題目",
  enterMatrixAnswer: "輸入矩陣（用空格分隔元素，分號分隔行），例：1 2; 3 4",
  enterScalarAnswer: "輸入數字答案",
  enterVectorAnswer: "輸入向量（用空格分隔），例：1 2 3",
  enterEigenvalues: "輸入特徵値（用空格分隔，由小到大排列），例：-2 3",
  practiceHintMatrix: "提示：輸入矩陣答案，用空格分隔元素，分號分隔行。例：1 2; 3 4",
  practiceHintVector: "提示：輸入向量分量，用空格分隔。例：1 -2 3",
  practiceHintEigen: "提示：輸入特徵値，由小到大排列，用空格分隔。例：-2 3",
  practiceCorrectMsg: "太棒了！答案正確。",
  practiceIncorrectMsg: "答案不對，請再試一次。",
  language: "語言",
  darkMode: "深色模式",
  lightMode: "淡色模式",
};

const en: Translations = {
  appTitle: "Linear Algebra Lab",
  appSubtitle: "Matrices · Linear Systems · Vectors",
  navMatrix: "Matrix Calculator",
  navLinearSystem: "Linear Systems",
  navVector: "Vectors",
  navKnowledge: "Knowledge Base",
  navEigen: "Eigenvalues & Eigenvectors",
  matrixCalc: "Matrix Calculator",
  matrixA: "Matrix A",
  matrixB: "Matrix B",
  matrixResult: "Result",
  matrixRows: "Rows",
  matrixCols: "Columns",
  opAdd: "Addition A + B",
  opSubtract: "Subtraction A − B",
  opMultiply: "Multiplication A × B",
  opTranspose: "Transpose Aᵀ",
  opDeterminant: "Determinant det(A)",
  opInverse: "Inverse A⁻¹",
  opScalar: "Scalar Multiplication k·A",
  scalarValue: "Scalar k",
  calculate: "Calculate",
  reset: "Reset",
  steps: "Steps",
  result: "Result",
  linearSystem: "Linear Systems",
  numEquations: "Number of Equations",
  numVariables: "Number of Variables",
  coefficients: "Coefficient Matrix",
  constants: "Constant Vector",
  solve: "Solve",
  solution: "Solution",
  noSolution: "No Solution (Inconsistent System)",
  infiniteSolutions: "Infinitely Many Solutions",
  uniqueSolution: "Unique Solution",
  augmentedMatrix: "Augmented Matrix",
  rowEchelon: "Row Echelon Form",
  backSubstitution: "Back Substitution",
  vectorCalc: "Vector Calculator",
  vector2D: "2D Vectors",
  vector3D: "3D Vectors",
  vectorA: "Vector a",
  vectorB: "Vector b",
  opVecAdd: "Addition a + b",
  opVecSubtract: "Subtraction a − b",
  opDotProduct: "Dot Product a · b",
  opCrossProduct: "Cross Product a × b",
  opMagnitude: "Magnitude |a|",
  opAngle: "Angle θ",
  opNormalize: "Unit Vector â",
  visualization: "Visualization",
  magnitude: "Magnitude",
  angle: "Angle",
  errSingular: "Singular matrix (det = 0), inverse does not exist",
  errDimMismatch: "Dimension mismatch for this operation",
  errSquareRequired: "This operation requires a square matrix",
  errInvalidInput: "Invalid input, please enter numbers",
  labelOperation: "Operation",
  labelDimension: "Dimension",
  labelInput: "Input",
  labelOutput: "Output",
  labelStepByStep: "Step-by-Step",
  practiceMode: "Practice Mode",
  calcMode: "Calculator",
  newQuestion: "New Question",
  checkAnswer: "Check Answer",
  correct: "Correct!",
  incorrect: "Incorrect, try again!",
  tryAgain: "Try Again",
  showAnswer: "Show Answer",
  yourAnswer: "Your Answer",
  practiceQuestion: "Practice Question",
  enterMatrixAnswer: "Enter matrix (space-separated elements, semicolons for rows), e.g. 1 2; 3 4",
  enterScalarAnswer: "Enter numeric answer",
  enterVectorAnswer: "Enter vector components (space-separated), e.g. 1 2 3",
  enterEigenvalues: "Enter eigenvalues (space-separated, sorted ascending), e.g. -2 3",
  practiceHintMatrix: "Hint: Enter matrix answer with spaces between elements and semicolons between rows. E.g. 1 2; 3 4",
  practiceHintVector: "Hint: Enter vector components separated by spaces. E.g. 1 -2 3",
  practiceHintEigen: "Hint: Enter eigenvalues sorted from smallest to largest, separated by spaces. E.g. -2 3",
  practiceCorrectMsg: "Excellent! Your answer is correct.",
  practiceIncorrectMsg: "Incorrect answer. Please try again.",
  language: "Language",
  darkMode: "Dark Mode",
  lightMode: "Light Mode",
};

const translations = { zh, en };

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "zh",
  setLang: () => {},
  t: zh,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
