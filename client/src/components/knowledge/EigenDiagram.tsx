import { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

export type EigenVector2 = readonly [number, number];
export type EigenMatrix2 = readonly [EigenVector2, EigenVector2];
export type EigenPresetId =
  | "stretch"
  | "fixed"
  | "turn"
  | "reverse"
  | "collapse"
  | "zero";

interface EigenExample {
  matrix: EigenMatrix2;
  vector: EigenVector2;
  basis: EigenVector2;
  otherBasis: EigenVector2;
  eigenvalue: number;
  otherEigenvalue: number;
  labelZh: string;
  labelEn: string;
}

/** Discrete examples: changing a preset changes A, never an animated claim about A. */
export const EIGEN_PRESETS: Record<EigenPresetId, EigenExample> = {
  stretch: {
    matrix: [
      [2, 1],
      [1, 2],
    ],
    vector: [1, 1],
    basis: [1, 1],
    otherBasis: [1, -1],
    eigenvalue: 3,
    otherEigenvalue: 1,
    labelZh: "伸長：λ = 3",
    labelEn: "Stretch: λ = 3",
  },
  fixed: {
    matrix: [
      [2, 1],
      [1, 2],
    ],
    vector: [1, -1],
    basis: [1, -1],
    otherBasis: [1, 1],
    eigenvalue: 1,
    otherEigenvalue: 3,
    labelZh: "不變：λ = 1",
    labelEn: "Unchanged: λ = 1",
  },
  turn: {
    matrix: [
      [2, 1],
      [1, 2],
    ],
    vector: [1, 0],
    basis: [1, 1],
    otherBasis: [1, -1],
    eigenvalue: 3,
    otherEigenvalue: 1,
    labelZh: "非特徵向量",
    labelEn: "Not an eigenvector",
  },
  reverse: {
    matrix: [
      [-2, -1],
      [-1, -2],
    ],
    vector: [1, 1],
    basis: [1, 1],
    otherBasis: [1, -1],
    eigenvalue: -3,
    otherEigenvalue: -1,
    labelZh: "反向：λ = −3",
    labelEn: "Reverse: λ = −3",
  },
  collapse: {
    matrix: [
      [1, -1],
      [-1, 1],
    ],
    vector: [1, 1],
    basis: [1, 1],
    otherBasis: [1, -1],
    eigenvalue: 0,
    otherEigenvalue: 2,
    labelZh: "歸零：λ = 0",
    labelEn: "Collapse: λ = 0",
  },
  zero: {
    matrix: [
      [2, 1],
      [1, 2],
    ],
    vector: [0, 0],
    basis: [1, 1],
    otherBasis: [1, -1],
    eigenvalue: 3,
    otherEigenvalue: 1,
    labelZh: "零向量（非特徵向量）",
    labelEn: "Zero vector (excluded)",
  },
};

export const EIGEN_STEP_COUNT = 5;

function requireFinite(values: readonly number[]) {
  if (!values.every(Number.isFinite)) {
    throw new RangeError("Eigen geometry requires finite coordinates.");
  }
}

export function multiplyEigenMatrix(
  matrix: EigenMatrix2,
  vector: EigenVector2
): [number, number] {
  requireFinite([...matrix[0], ...matrix[1], ...vector]);
  const image: [number, number] = [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1],
  ];
  requireFinite(image);
  return image;
}

export function eigenResidual(
  matrix: EigenMatrix2,
  vector: EigenVector2,
  eigenvalue: number
): [number, number] {
  requireFinite([eigenvalue]);
  const image = multiplyEigenMatrix(matrix, vector);
  const residual: [number, number] = [
    image[0] - eigenvalue * vector[0],
    image[1] - eigenvalue * vector[1],
  ];
  requireFinite(residual);
  return residual;
}

/** Kernel membership deliberately includes zero; eigenvector classification does not. */
export function isInEigenspace(
  matrix: EigenMatrix2,
  vector: EigenVector2,
  eigenvalue: number,
  tolerance = 1e-10
): boolean {
  requireFinite([tolerance]);
  if (tolerance < 0) throw new RangeError("Tolerance must be nonnegative.");
  const residual = eigenResidual(matrix, vector, eigenvalue);
  const image = multiplyEigenMatrix(matrix, vector);
  const scale = Math.max(
    Math.hypot(...image),
    Math.abs(eigenvalue) * Math.hypot(...vector)
  );
  // No absolute unit floor: a tiny nonzero vector is still a nonzero vector.
  return Math.hypot(...residual) <= tolerance * scale;
}

export function analyzeEigenvector(matrix: EigenMatrix2, vector: EigenVector2) {
  const image = multiplyEigenMatrix(matrix, vector);
  const zeroVector = vector[0] === 0 && vector[1] === 0;
  if (zeroVector) {
    return {
      image,
      zeroVector: true,
      eigenvector: false,
      eigenvalue: null,
      relation: "zero" as const,
    };
  }
  const index = Math.abs(vector[0]) >= Math.abs(vector[1]) ? 0 : 1;
  const candidate = image[index] / vector[index];
  requireFinite([candidate]);
  const eigenvector = isInEigenspace(matrix, vector, candidate);
  const relation = !eigenvector
    ? "changed"
    : candidate < 0
      ? "reversed"
      : candidate === 0
        ? "collapsed"
        : "same";
  return {
    image,
    zeroVector: false,
    eigenvector,
    eigenvalue: eigenvector ? candidate : null,
    relation,
  };
}

function clampFinite(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

/** All moving coordinates are illustrative; endpoint coordinates are exactly Av. */
export function getEigenGeometry(
  preset: EigenPresetId,
  frame: Pick<KnowledgeFrame, "stage" | "progress">
) {
  const example = EIGEN_PRESETS[preset];
  const stage = Math.floor(clampFinite(frame.stage, 0, EIGEN_STEP_COUNT - 1));
  const progress = clampFinite(frame.progress, 0, 1);
  const smooth = progress * progress * (3 - 2 * progress);
  const reveal = (at: number) => (stage < at ? 0 : stage === at ? smooth : 1);
  const image = multiplyEigenMatrix(example.matrix, example.vector);
  const movement = reveal(2);
  const transformed: [number, number] = [
    example.vector[0] + (image[0] - example.vector[0]) * movement,
    example.vector[1] + (image[1] - example.vector[1]) * movement,
  ];
  return {
    stage,
    progress,
    transformed,
    inputOpacity: 0.2 + 0.8 * reveal(0),
    lineOpacity: reveal(1),
    outputOpacity: reveal(2),
    sampleProgress: reveal(3),
    conclusionOpacity: reveal(4),
  };
}

function vectorLatex(vector: EigenVector2) {
  return String.raw`\begin{bmatrix}${vector[0]}\\${vector[1]}\end{bmatrix}`;
}

function matrixLatex(matrix: EigenMatrix2) {
  return String.raw`\begin{bmatrix}${matrix[0][0]}&${matrix[0][1]}\\${matrix[1][0]}&${matrix[1][1]}\end{bmatrix}`;
}

export function getEigenSteps(
  lang: "zh" | "en",
  variant = "matrix-eigen-def",
  preset: EigenPresetId = "stretch"
): DerivationStep[] {
  const zh = lang === "zh";
  const space = variant === "matrix-eigen-space";
  const example = EIGEN_PRESETS[preset];
  const { matrix, vector, basis, otherBasis, eigenvalue, otherEigenvalue } =
    example;
  const result = analyzeEigenvector(matrix, vector);
  const shifted: EigenMatrix2 = [
    [matrix[0][0] - eigenvalue, matrix[0][1]],
    [matrix[1][0], matrix[1][1] - eigenvalue],
  ];
  const V = vectorLatex(vector);
  const U = vectorLatex(basis);
  const image = vectorLatex(result.image);
  const membership = result.zeroVector
    ? String.raw`\mathbf v=\mathbf0\in E_{${eigenvalue}},\qquad\mathbf0\text{ is not an eigenvector}`
    : result.eigenvector
      ? String.raw`A\mathbf v=${image}=${result.eigenvalue}\mathbf v,\qquad\mathbf v\ne\mathbf0`
      : String.raw`\mathbf v=${V},\quad A\mathbf v=${image}\notin\operatorname{span}\{\mathbf v\}`;
  const eigenspaces = String.raw`\begin{aligned}E_{${eigenvalue}}&=\ker(A-${eigenvalue < 0 ? `(${eigenvalue})` : eigenvalue}I)=\{t${U}:t\in\mathbb R\}\\E_{${otherEigenvalue}}&=\operatorname{span}\left\{${vectorLatex(otherBasis)}\right\}\\\mathbf0&\in E_{${eigenvalue}},\qquad\text{eigenvectors require }\mathbf v\ne\mathbf0\end{aligned}`;
  return [
    {
      description: zh
        ? "數值示例：先標出矩陣 A 與輸入向量 v。預設的改變代表另一個示例，不是同一矩陣的連續變形。"
        : "Numerical demo: identify A and the input vector v. Presets are separate examples, not a continuous change of the same matrix.",
      latex: String.raw`A=${matrixLatex(matrix)},\qquad\mathbf v=${V}`,
    },
    {
      description: zh
        ? `虛線是特徵空間 E_${eigenvalue}。沿基底向量的所有倍數都在這條通過原點的直線上。`
        : `The dashed line is E_${eigenvalue}. Every multiple of its basis vector lies on this line through the origin.`,
      latex: String.raw`(A-${eigenvalue < 0 ? `(${eigenvalue})` : eigenvalue}I)${U}=${matrixLatex(shifted)}${U}=\mathbf0`,
    },
    {
      description: zh
        ? "逐分量計算 Av；橙色端點從 v 移向精確的 Av。中途的縮放或歸零只屬插值示意，不是 A 的新特徵值。"
        : "Compute Av component by component. The orange tip moves from v to the exact Av. Intermediate scaling or collapse is interpolation, not a new eigenvalue of A.",
      latex: String.raw`A\mathbf v=\begin{bmatrix}(${matrix[0][0]})(${vector[0]})+(${matrix[0][1]})(${vector[1]})\\(${matrix[1][0]})(${vector[0]})+(${matrix[1][1]})(${vector[1]})\end{bmatrix}=${image}`,
    },
    {
      description: result.zeroVector
        ? zh
          ? "零向量在特徵空間內，但它不符合特徵向量的非零條件。"
          : "Zero belongs to the eigenspace, but it fails the nonzero requirement for an eigenvector."
        : !result.eigenvector
          ? zh
            ? "v 與 Av 不在同一條通過原點的直線上，所以這個 v 不是特徵向量。"
            : "v and Av do not lie on the same line through the origin, so this v is not an eigenvector."
          : result.relation === "reversed"
            ? zh
              ? "負特徵值令箭頭反向，但仍在同一直線上；並非每個特徵向量都保持同向。"
              : "A negative eigenvalue reverses the arrow on the same line; an eigenvector need not keep the same orientation."
            : result.relation === "collapsed"
              ? zh
                ? "λ = 0 將非零特徵向量映到原點；原向量仍是特徵向量，輸出零向量不是。"
                : "λ = 0 maps a nonzero eigenvector to the origin. The input is an eigenvector; the zero output is not."
              : zh
                ? "Av 只沿同一直線縮放 v；標出的 t = −1、0、1 是整條特徵空間的樣本。"
                : "Av scales v along the same line. The marked t = −1, 0, 1 are samples of the entire eigenspace.",
      latex: membership,
    },
    {
      description: zh
        ? `${space ? "特徵空間是零空間，不只有一支箭頭。" : "這個示例的兩條特徵方向如下。"}直線包含零向量；只有非零成員才稱為特徵向量。`
        : `${space ? "An eigenspace is a null space, not just one arrow." : "These are the two eigendirections in this example."} Each line includes zero; only its nonzero members are eigenvectors.`,
      latex: eigenspaces,
    },
  ];
}

const INPUT_COLOR = "#2563eb";
const OUTPUT_COLOR = "#d97706";
const SPACE_COLOR = "#8b5cf6";

export default function EigenDiagram({
  lang,
  variant = "matrix-eigen-def",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [preset, setPreset] = useState<EigenPresetId>("stretch");
  const id = useId().replace(/:/g, "");
  const example = EIGEN_PRESETS[preset];
  const result = analyzeEigenvector(example.matrix, example.vector);
  const title =
    variant === "matrix-eigen-space"
      ? zh
        ? "特徵空間：整條直線與零向量"
        : "Eigenspace: a whole line, including zero"
      : zh
        ? "特徵方向：伸縮、反向與歸零"
        : "Eigendirections: scale, reverse, or collapse";
  const status = result.zeroVector
    ? zh
      ? "零向量：不是特徵向量"
      : "Zero: not an eigenvector"
    : !result.eigenvector
      ? zh
        ? "方向改變：不是特徵向量"
        : "Direction changes: not an eigenvector"
      : result.relation === "reversed"
        ? zh
          ? "λ < 0：同一直線，反向"
          : "λ < 0: same line, reversed"
        : result.relation === "collapsed"
          ? zh
            ? "λ = 0：非零输入映到原點"
            : "λ = 0: nonzero input maps to zero"
          : zh
            ? "λ > 0：同一直線，同向"
            : "λ > 0: same line, same orientation";
  const controls = (
    <div className="space-y-2">
      <label className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {zh ? "選擇數值示例" : "Choose a numerical demo"}
        <select
          value={preset}
          onChange={event => setPreset(event.target.value as EigenPresetId)}
          aria-label={zh ? "特徵方向示例" : "Eigendirection example"}
          className="min-h-10 max-w-full rounded-md border border-border bg-card px-2 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {(Object.keys(EIGEN_PRESETS) as EigenPresetId[]).map(key => (
            <option key={key} value={key}>
              {zh ? EIGEN_PRESETS[key].labelZh : EIGEN_PRESETS[key].labelEn}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {zh
          ? "示例而非一般證明。反向及歸零預設使用不同的矩陣；公式會一併更新。"
          : "Examples, not a general proof. Reverse and collapse use different matrices; the equations update with them."}
      </p>
    </div>
  );
  const point = (vector: EigenVector2): [number, number] => [
    280 + 36 * vector[0],
    170 - 36 * vector[1],
  ];
  const origin = point([0, 0]);
  const input = point(example.vector);
  const lineEnds = (basis: EigenVector2) => [
    point([-3.25 * basis[0], -3.25 * basis[1]]),
    point([3.25 * basis[0], 3.25 * basis[1]]),
  ];
  const [lineStart, lineEnd] = lineEnds(example.basis);
  const [otherStart, otherEnd] = lineEnds(example.otherBasis);
  const imageText = `(${result.image[0]}, ${result.image[1]})`;
  const inputText = `(${example.vector[0]}, ${example.vector[1]})`;
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${preset}:${lang}`}
      lang={lang}
      title={title}
      steps={getEigenSteps(lang, variant, preset)}
      controls={controls}
      testId="knowledge-eigen"
    >
      {frame => {
        const geometry = getEigenGeometry(preset, frame);
        const output = point(geometry.transformed);
        const settled =
          geometry.stage > 2 ||
          (geometry.stage === 2 && geometry.progress === 1);
        const outputAtZero =
          settled && result.image[0] === 0 && result.image[1] === 0;
        return (
          <div className="min-w-0">
            <svg
              viewBox="0 0 560 340"
              width="100%"
              role="img"
              aria-labelledby={`${id}-title ${id}-desc`}
              className="block h-auto w-full text-foreground"
              data-testid="knowledge-eigen-svg"
              data-variant={variant}
              data-preset={preset}
            >
              <title id={`${id}-title`}>{title}</title>
              <desc id={`${id}-desc`}>
                {zh
                  ? `藍色為輸入 v=${inputText}；橙色輸出端點按步驟移向 Av=${imageText}。紫色虛線是 E_${example.eigenvalue}，包含原點。${status}。`
                  : `Blue is input v=${inputText}; the orange output moves by stage toward Av=${imageText}. The purple dashed line is E_${example.eigenvalue}, including the origin. ${status}.`}
              </desc>
              <defs>
                <marker
                  id={`${id}-input`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill={INPUT_COLOR} />
                </marker>
                <marker
                  id={`${id}-output`}
                  markerWidth="11"
                  markerHeight="11"
                  refX="10"
                  refY="5.5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0,0 L11,5.5 L0,11 Z" fill={OUTPUT_COLOR} />
                </marker>
              </defs>
              <text x="20" y="25" fontSize="17" fill="currentColor">
                {zh
                  ? "數值示例 · 同一座標尺度"
                  : "Numerical demo · equal axis scale"}
              </text>
              {[-3, -2, -1, 1, 2, 3].map(tick => (
                <g key={tick} opacity="0.55">
                  <line
                    x1={280 + tick * 36}
                    y1="49"
                    x2={280 + tick * 36}
                    y2="291"
                    stroke="var(--border)"
                  />
                  <line
                    x1="159"
                    y1={170 - tick * 36}
                    x2="401"
                    y2={170 - tick * 36}
                    stroke="var(--border)"
                  />
                  <text
                    x={280 + tick * 36}
                    y="187"
                    textAnchor="middle"
                    fontSize="13"
                    fill="currentColor"
                  >
                    {tick}
                  </text>
                  <text
                    x="263"
                    y={174 - tick * 36}
                    textAnchor="end"
                    fontSize="13"
                    fill="currentColor"
                  >
                    {tick}
                  </text>
                </g>
              ))}
              <line
                x1="143"
                y1="170"
                x2="425"
                y2="170"
                stroke="currentColor"
                strokeOpacity="0.45"
              />
              <line
                x1="280"
                y1="35"
                x2="280"
                y2="305"
                stroke="currentColor"
                strokeOpacity="0.45"
              />
              <text x="435" y="176" fontSize="17" fill="currentColor">
                x
              </text>
              <text x="290" y="45" fontSize="17" fill="currentColor">
                y
              </text>
              <g
                opacity={geometry.lineOpacity}
                data-testid="knowledge-eigen-space-line"
              >
                <line
                  x1={lineStart[0]}
                  y1={lineStart[1]}
                  x2={lineEnd[0]}
                  y2={lineEnd[1]}
                  stroke={SPACE_COLOR}
                  strokeWidth="3"
                  strokeDasharray="8 6"
                />
                <text
                  x="414"
                  y={example.basis[1] > 0 ? 55 : 298}
                  fontSize="17"
                  fill={SPACE_COLOR}
                >
                  E_{example.eigenvalue}
                </text>
              </g>
              <g opacity={geometry.conclusionOpacity}>
                <line
                  x1={otherStart[0]}
                  y1={otherStart[1]}
                  x2={otherEnd[0]}
                  y2={otherEnd[1]}
                  stroke={SPACE_COLOR}
                  strokeWidth="2"
                  strokeOpacity="0.6"
                  strokeDasharray="3 7"
                />
                <text
                  x="414"
                  y={example.otherBasis[1] > 0 ? 55 : 298}
                  fontSize="17"
                  fill={SPACE_COLOR}
                >
                  E_{example.otherEigenvalue}
                </text>
              </g>
              {!result.eigenvector && !result.zeroVector && (
                <line
                  x1="151"
                  y1="170"
                  x2="409"
                  y2="170"
                  stroke={INPUT_COLOR}
                  strokeWidth="2"
                  strokeDasharray="3 5"
                  opacity={geometry.lineOpacity * 0.55}
                />
              )}
              <g opacity={geometry.outputOpacity}>
                {!outputAtZero && (
                  <line
                    x1={origin[0]}
                    y1={origin[1]}
                    x2={output[0]}
                    y2={output[1]}
                    stroke={OUTPUT_COLOR}
                    strokeWidth="7"
                    strokeOpacity="0.6"
                    markerEnd={`url(#${id}-output)`}
                    data-testid="knowledge-eigen-output"
                  />
                )}
                <circle
                  cx={output[0]}
                  cy={output[1]}
                  r={outputAtZero ? 9 : 5}
                  fill="var(--card)"
                  stroke={OUTPUT_COLOR}
                  strokeWidth="3"
                  data-testid="knowledge-eigen-output-tip"
                />
                <text
                  x={output[0] + (geometry.transformed[0] < 0 ? -16 : 14)}
                  y={output[1] - 13}
                  textAnchor={geometry.transformed[0] < 0 ? "end" : "start"}
                  fontSize="17"
                  fill={OUTPUT_COLOR}
                >
                  {settled
                    ? outputAtZero
                      ? "Av = 0"
                      : "Av"
                    : zh
                      ? "變換中"
                      : "mapping"}
                </text>
              </g>
              <g opacity={geometry.inputOpacity}>
                {!result.zeroVector && (
                  <line
                    x1={origin[0]}
                    y1={origin[1]}
                    x2={input[0]}
                    y2={input[1]}
                    stroke={INPUT_COLOR}
                    strokeWidth="3"
                    markerEnd={`url(#${id}-input)`}
                  />
                )}
                <circle cx={input[0]} cy={input[1]} r="4" fill={INPUT_COLOR} />
                <text
                  x={input[0] + 13}
                  y={input[1] + 23}
                  fontSize="17"
                  fill={INPUT_COLOR}
                >
                  {result.zeroVector ? "v = 0" : "v"}
                </text>
              </g>
              <g opacity={geometry.sampleProgress}>
                {[-1, 1].map(t => {
                  const sample = point([
                    t * example.basis[0] * geometry.sampleProgress,
                    t * example.basis[1] * geometry.sampleProgress,
                  ]);
                  return (
                    <g key={t}>
                      <circle
                        cx={sample[0]}
                        cy={sample[1]}
                        r="7"
                        fill="var(--card)"
                        stroke={SPACE_COLOR}
                        strokeWidth="2"
                      />
                      <text
                        x={sample[0] - 10}
                        y={sample[1] - 13}
                        textAnchor="end"
                        fontSize="15"
                        fill={SPACE_COLOR}
                      >
                        t = {t}
                      </text>
                    </g>
                  );
                })}
              </g>
              <circle cx={origin[0]} cy={origin[1]} r="3" fill="currentColor" />
              <g opacity={geometry.conclusionOpacity}>
                <circle
                  cx={origin[0]}
                  cy={origin[1]}
                  r="13"
                  fill="none"
                  stroke={SPACE_COLOR}
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
                <text
                  x="280"
                  y="329"
                  textAnchor="middle"
                  fontSize="17"
                  fill="currentColor"
                >
                  {zh
                    ? "t = 0 在直線內；零向量不是特徵向量"
                    : "t = 0 is on the line; zero is not an eigenvector"}
                </text>
              </g>
            </svg>
            <div className="grid grid-cols-2 gap-2 border-t border-border p-3 text-xs leading-relaxed">
              <p>
                <span className="font-semibold" style={{ color: INPUT_COLOR }}>
                  {zh ? "輸入" : "Input"} v
                </span>
                <br />
                {inputText}
              </p>
              <p>
                <span className="font-semibold" style={{ color: OUTPUT_COLOR }}>
                  {zh ? "精確目標" : "Exact target"} Av
                </span>
                <br />
                {imageText}
              </p>
              <p className="col-span-2 text-foreground">
                {geometry.stage >= 3
                  ? status
                  : zh
                    ? "虛線表示特徵空間；橙色箭頭表示變換示意。"
                    : "Dashed lines are eigenspaces; orange shows the mapping."}
              </p>
            </div>
          </div>
        );
      }}
    </AnimatedKnowledgeLesson>
  );
}
