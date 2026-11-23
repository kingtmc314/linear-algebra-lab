import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import KatexRenderer from "@/components/KatexRenderer";
import StepDisplay from "@/components/StepDisplay";
import Plot3DScene from "@/components/Plot3DScene";
import Plotly from "plotly.js-dist-min";
import { ratToLatex } from "@/lib/rational";
import {
  transformationApplyExact, transformationApplyNumeric, transformationApprox,
  transformationDecimal, transformationDeterminant, transformationEntryLatex,
  transformationExactMatrix, transformationMatrixLatex, transformationNumericMatrix,
  transformationSnapshot, transformationTrig, transformationVectorLatex,
  type TransformationParams, type TransformationDimension,
} from "@/lib/Phase20transformation";

type Lang = "zh" | "en";
interface ParamDef {
  id: string; labelZh: string; labelEn: string; default: number;
  min?: number; max?: number; step?: number; unit?: string;
}
interface TransformDef {
  id: string; dim: TransformationDimension; category: "2D" | "3D" | "Custom";
  nameZh: string; nameEn: string; params: ParamDef[];
}
const angle: ParamDef = { id: "theta", labelZh: "角度 θ（度）", labelEn: "Angle θ (deg)", default: 45, min: -360, max: 360, step: 1, unit: "°" };
const factor = (id: string, labelZh: string, labelEn: string, value: number): ParamDef => ({ id, labelZh, labelEn, default: value, min: -5, max: 5, step: 0.1 });
export const Phase20transformationDefinitions: TransformDef[] = [
  { id: "rotate2d", dim: "2d", category: "2D", nameZh: "旋轉", nameEn: "Rotation", params: [angle] },
  { id: "reflect_x", dim: "2d", category: "2D", nameZh: "關於 x 軸反射", nameEn: "Reflection (x-axis)", params: [] },
  { id: "reflect_y", dim: "2d", category: "2D", nameZh: "關於 y 軸反射", nameEn: "Reflection (y-axis)", params: [] },
  { id: "reflect_yx", dim: "2d", category: "2D", nameZh: "關於 y = x 反射", nameEn: "Reflection (y = x)", params: [] },
  { id: "reflect_ynx", dim: "2d", category: "2D", nameZh: "關於 y = −x 反射", nameEn: "Reflection (y = −x)", params: [] },
  { id: "reflect_line", dim: "2d", category: "2D", nameZh: "關於任意直線反射", nameEn: "Reflection (any line)", params: [{ id: "alpha", labelZh: "直線角度 α（度）", labelEn: "Line angle α (deg)", default: 30, min: 0, max: 180, step: 1, unit: "°" }] },
  { id: "shear_h", dim: "2d", category: "2D", nameZh: "水平剪切", nameEn: "Horizontal Shear", params: [factor("k", "剪切因子 k", "Shear factor k", 1)] },
  { id: "shear_v", dim: "2d", category: "2D", nameZh: "垂直剪切", nameEn: "Vertical Shear", params: [factor("k", "剪切因子 k", "Shear factor k", 1)] },
  { id: "scale2d", dim: "2d", category: "2D", nameZh: "縮放（放大／縮小）", nameEn: "Scaling (Enlargement/Reduction)", params: [factor("sx", "x 方向縮放 sₓ", "x-scale sₓ", 2), factor("sy", "y 方向縮放 sᵧ", "y-scale sᵧ", 2)] },
  { id: "squeeze", dim: "2d", category: "2D", nameZh: "擠壓變換", nameEn: "Squeeze Mapping", params: [{ id: "k", labelZh: "擠壓因子 k（必須 > 0）", labelEn: "Squeeze factor k (must be > 0)", default: 2, min: 0.1, max: 10, step: 0.1 }] },
  { id: "proj_x", dim: "2d", category: "2D", nameZh: "投影到 x 軸", nameEn: "Projection onto x-axis", params: [] },
  { id: "proj_y", dim: "2d", category: "2D", nameZh: "投影到 y 軸", nameEn: "Projection onto y-axis", params: [] },
  ...(["x", "y", "z"] as const).map(axis => ({ id: `rotate3d_${axis}`, dim: "3d" as const, category: "3D" as const, nameZh: `繞 ${axis} 軸旋轉（3D）`, nameEn: `Rotation about ${axis}-axis (3D)`, params: [angle] })),
  { id: "scale3d", dim: "3d", category: "3D", nameZh: "三維縮放", nameEn: "3D Scaling", params: [factor("sx", "x 縮放 sₓ", "x-scale sₓ", 2), factor("sy", "y 縮放 sᵧ", "y-scale sᵧ", 1), factor("sz", "z 縮放 s_z", "z-scale s_z", 0.5)] },
  ...(["xy", "xz", "yz"] as const).map(plane => ({ id: `reflect3d_${plane}`, dim: "3d" as const, category: "3D" as const, nameZh: `關於 ${plane} 平面反射（3D）`, nameEn: `Reflection about ${plane}-plane (3D)`, params: [] })),
  { id: "custom2d", dim: "2d", category: "Custom", nameZh: "自訂 2×2 矩陣", nameEn: "Custom 2×2 Matrix", params: ["a", "b", "c", "d"].map((id, i) => ({ id, labelZh: id, labelEn: id, default: i === 0 || i === 3 ? 1 : 0, min: -10, max: 10, step: 0.1 })) },
  { id: "custom3d", dim: "3d", category: "Custom", nameZh: "自訂 3×3 矩陣", nameEn: "Custom 3×3 Matrix", params: Array.from({ length: 9 }, (_, i) => { const r = Math.floor(i / 3) + 1, c = i % 3 + 1; return { id: `m${r}${c}`, labelZh: `a${r}${c}（第 ${r} 橫列，第 ${c} 直行）`, labelEn: `a${r}${c} (row ${r}, column ${c})`, default: r === c ? 1 : 0, min: -10, max: 10, step: 0.1 }; }) },
];
const TRANSFORMS = Phase20transformationDefinitions;

function ruleFor(def: TransformDef, p: TransformationParams, lang: Lang): { context: string; latex: string } {
  const zh = lang === "zh";
  const theta = ratToLatex(transformationDecimal(p.theta ?? 0));
  const rules: Record<string, [string, string, string]> = {
    rotate2d: ["θ 是逆時針旋轉角度，以度為單位；座標軸固定，原點不移動。", "θ is a counter-clockwise angle in degrees; the axes and origin stay fixed.", "R(\\theta)=\\begin{bmatrix}\\cos\\theta&-\\sin\\theta\\\\\\sin\\theta&\\cos\\theta\\end{bmatrix}"],
    reflect_x: ["鏡線是 x 軸：沿鏡線的 x 分量不變，垂直分量 y 取負。", "The mirror is the x-axis: the parallel x-component stays fixed and the normal y-component changes sign.", "(x,y)\\mapsto(x,-y)"],
    reflect_y: ["鏡線是 y 軸：y 分量不變，x 分量取負。", "The mirror is the y-axis: y stays fixed and x changes sign.", "(x,y)\\mapsto(-x,y)"],
    reflect_yx: ["鏡線是 y=x，通過原點；交換 x 與 y 分量。", "The mirror y=x passes through the origin; swap the x and y components.", "(x,y)\\mapsto(y,x)"],
    reflect_ynx: ["鏡線是 y=−x，通過原點；交換兩分量並取負。", "The mirror y=−x passes through the origin; swap and negate the components.", "(x,y)\\mapsto(-y,-x)"],
    reflect_line: ["α 是鏡線與正 x 軸的夾角（度），不是物體的旋轉角。先轉 −α、關於 x 軸反射，再轉回 α。", "α is the mirror-line angle from positive x in degrees, not a rotation of the object. Rotate by −α, reflect in x, then rotate back by α.", "H_\\alpha=R(\\alpha)\\begin{bmatrix}1&0\\\\0&-1\\end{bmatrix}R(-\\alpha)=\\begin{bmatrix}\\cos2\\alpha&\\sin2\\alpha\\\\\\sin2\\alpha&-\\cos2\\alpha\\end{bmatrix}"],
    shear_h: ["k 是無單位的剪切因子：x 增加 k 倍的 y，y 不變。", "k is a dimensionless shear factor: add k times y to x; y stays fixed.", "(x,y)\\mapsto(x+ky,y),\\quad A=\\begin{bmatrix}1&k\\\\0&1\\end{bmatrix}"],
    shear_v: ["k 是無單位的剪切因子：y 增加 k 倍的 x，x 不變。", "k is a dimensionless shear factor: add k times x to y; x stays fixed.", "(x,y)\\mapsto(x,y+kx),\\quad A=\\begin{bmatrix}1&0\\\\k&1\\end{bmatrix}"],
    scale2d: ["sₓ、sᵧ 分別乘上 x、y 分量。|s|>1 放大，0<|s|<1 縮小；負值同時翻轉方向，零值壓扁該方向。", "sₓ and sᵧ multiply the x and y components. |s|>1 enlarges; 0<|s|<1 reduces. Negative factors reverse direction; zero collapses an axis.", "(x,y)\\mapsto(s_xx,s_yy),\\quad A=\\operatorname{diag}(s_x,s_y)"],
    squeeze: ["k>0：x 乘 k、y 乘 1/k；兩因子互為倒數，所以面積不變。", "k>0 multiplies x by k and y by 1/k. The reciprocal factors preserve area.", "(x,y)\\mapsto(kx,y/k),\\quad A=\\operatorname{diag}(k,1/k),\\quad\\det A=k(1/k)=1"],
    proj_x: ["正交投影到 x 軸：保留 x，令 y=0。垂直方向資訊丟失，所以不可逆。", "Orthogonal projection onto x retains x and sets y=0. Normal-direction information is lost, so the map is not invertible.", "(x,y)\\mapsto(x,0),\\quad A=\\begin{bmatrix}1&0\\\\0&0\\end{bmatrix}"],
    proj_y: ["正交投影到 y 軸：保留 y，令 x=0。垂直方向資訊丟失，所以不可逆。", "Orthogonal projection onto y retains y and sets x=0. Normal-direction information is lost, so the map is not invertible.", "(x,y)\\mapsto(0,y),\\quad A=\\begin{bmatrix}0&0\\\\0&1\\end{bmatrix}"],
    scale3d: ["sₓ、sᵧ、s_z 分別乘上 x、y、z 分量；可獨立放大、縮小、翻轉或壓扁各方向。", "sₓ, sᵧ, and s_z independently scale x, y, and z, allowing enlargement, reduction, reversal, or collapse.", "(x,y,z)\\mapsto(s_xx,s_yy,s_zz),\\quad A=\\operatorname{diag}(s_x,s_y,s_z)"],
    reflect3d_xy: ["鏡面是 xy 平面：面內 x、y 不變，法向 z 取負。", "The mirror is the xy-plane: tangential x and y stay fixed; the normal z changes sign.", "(x,y,z)\\mapsto(x,y,-z)"],
    reflect3d_xz: ["鏡面是 xz 平面：面內 x、z 不變，法向 y 取負。", "The mirror is the xz-plane: tangential x and z stay fixed; the normal y changes sign.", "(x,y,z)\\mapsto(x,-y,z)"],
    reflect3d_yz: ["鏡面是 yz 平面：面內 y、z 不變，法向 x 取負。", "The mirror is the yz-plane: tangential y and z stay fixed; the normal x changes sign.", "(x,y,z)\\mapsto(-x,y,z)"],
    custom2d: ["a、b 是第一橫列；c、d 是第二橫列。第一直行 (a,c) 是 Ae₁，第二直行 (b,d) 是 Ae₂。矩陣左乘直行向量。", "a,b form row 1 and c,d form row 2. Column (a,c) is Ae₁ and column (b,d) is Ae₂. The matrix multiplies column vectors on the left.", "A=\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix},\\quad\\begin{bmatrix}x'\\\\y'\\end{bmatrix}=\\begin{bmatrix}ax+by\\\\cx+dy\\end{bmatrix}"],
    custom3d: ["aᵢⱼ 是第 i 橫列、第 j 直行的係數。第 j 直行就是 Aeⱼ；第 i 橫列與輸入向量內積，得到輸出第 i 分量。", "aᵢⱼ is the entry in row i, column j. Column j is Aeⱼ; the dot product of row i with the input gives output component i.", "A=(a_{ij})_{3\\times3},\\quad v'_i=\\sum_{j=1}^{3}a_{ij}v_j"],
  };
  if (def.id.startsWith("rotate3d_")) {
    const axis = def.id.slice(-1);
    const rotationRules: Record<string, string> = {
      x: "R_x(\\theta)=\\begin{bmatrix}1&0&0\\\\0&\\cos\\theta&-\\sin\\theta\\\\0&\\sin\\theta&\\cos\\theta\\end{bmatrix}",
      y: "R_y(\\theta)=\\begin{bmatrix}\\cos\\theta&0&\\sin\\theta\\\\0&1&0\\\\-\\sin\\theta&0&\\cos\\theta\\end{bmatrix}",
      z: "R_z(\\theta)=\\begin{bmatrix}\\cos\\theta&-\\sin\\theta&0\\\\\\sin\\theta&\\cos\\theta&0\\\\0&0&1\\end{bmatrix}",
    };
    return { context: zh ? `旋轉軸是 ${axis} 軸，該分量不變；θ=${p.theta}°，正角度遵循右手定則：拇指指向正 ${axis}，四指彎曲方向為正旋轉。` : `The ${axis}-axis is fixed, so that component does not change. θ=${p.theta}°. Positive rotation follows the right-hand rule: thumb along +${axis}, curled fingers give the positive direction.`, latex: `${rotationRules[axis]},\\quad\\theta=${theta}^{\\circ}` };
  }
  const [contextZh, contextEn, latex] = rules[def.id];
  return { context: zh ? contextZh : contextEn, latex };
}

interface LessonStep { description: string; latex?: string; progress: number; vectorVisible?: boolean; activeRow?: number }
export function Phase20transformationLesson(def: TransformDef, params: TransformationParams, vector: number[], lang: Lang): LessonStep[] {
  const zh = lang === "zh", n = vector.length;
  const exact = transformationExactMatrix(def.id, params);
  const matrix = transformationMatrixLatex(exact);
  const result = transformationApplyExact(exact, vector);
  const input = transformationVectorLatex(vector.map(v => ({ "": transformationDecimal(v) })));
  const determinant = transformationDeterminant(def.id, params);
  const rule = ruleFor(def, params, lang);
  const steps: LessonStep[] = [{ description: zh ? "設定：A=(aᵢⱼ) 是變換矩陣，aᵢⱼ 位於第 i 橫列、第 j 直行；v 是輸入直行向量，v′=Av 是輸出。eⱼ 是第 j 個標準基底向量，x、y、z 是固定座標軸上的分量。" : "Setup: A=(aᵢⱼ) is the transformation matrix; aᵢⱼ is in row i, column j. v is the input column vector and v′=Av the output. eⱼ is the j-th standard basis vector; x, y, z are components along fixed axes.", latex: `T(v)=Av,\\quad v\\in\\mathbb R^{${n}},\\quad A\\in\\mathbb R^{${n}\\times${n}}`, progress: 0 },
    { description: rule.context, latex: rule.latex, progress: 0 }];
  if (def.params.length) {
    const symbol: Record<string, string> = { theta: "\\theta", alpha: "\\alpha", sx: "s_x", sy: "s_y", sz: "s_z" };
    const parameterLatex = def.params.map(p => `${symbol[p.id] ?? (p.id.startsWith("m") ? `a_{${p.id.slice(1)}}` : p.id)}=${ratToLatex(transformationDecimal(params[p.id]))}${p.unit === "°" ? "^{\\circ}" : ""}`).join(",\\quad ");
    steps.push({ description: zh ? "代入目前參數。輸入的小數按顯示值作精確有理數處理，不以近似數猜測分數或根式。" : "Substitute the current parameters. Entered decimals are treated as exact rational values as displayed; fractions and radicals are not guessed from approximations.", latex: parameterLatex, progress: 0.15 });
  }
  if (def.id.startsWith("rotate") || def.id === "reflect_line") {
    const degrees = def.id === "reflect_line" ? 2 * params.alpha : params.theta;
    steps.push({ description: zh ? "計算三角函數：常見角度按角度本身化簡；其他角度保留精確三角式，不把四捨五入的小數寫成等號。" : "Evaluate trig values from the angle itself for standard angles; retain exact trigonometric expressions for other angles instead of equating rounded decimals.", latex: `\\cos(${ratToLatex(transformationDecimal(degrees))}^{\\circ})=${transformationEntryLatex(transformationTrig(degrees, "cos"))},\\quad\\sin(${ratToLatex(transformationDecimal(degrees))}^{\\circ})=${transformationEntryLatex(transformationTrig(degrees, "sin"))}`, progress: 0.25 });
  }
  for (let col = 0; col < n; col++) {
    const basis = Array.from({ length: n }, (_, i) => ({ "": transformationDecimal(i === col ? 1 : 0) }));
    steps.push({ description: zh ? `第 ${col + 1} 直行：只輸入第 ${col + 1} 個單位方向，因此 Ae${col + 1} 就是這一整直行。等式給出最終基底像；圖中 B(t)e${col + 1} 仍是中間快照，待矩陣組裝步驟才到達此終點。` : `Column ${col + 1}: input only unit direction ${col + 1}, so Ae${col + 1} is this entire column. The equation gives the final basis image; B(t)e${col + 1} in the chart is still an intermediate snapshot and reaches that endpoint at matrix assembly.`, latex: `Ae_{${col + 1}}=A${transformationVectorLatex(basis)}=${transformationVectorLatex(exact.map(row => row[col]))}`, progress: (col + 1) / (n + 1) });
  }
  steps.push({ description: zh ? "把基底的像按直行排列，得到完整變換矩陣。這是最終矩陣，不是中間插值矩陣。" : "Assemble the images of the basis as columns to obtain the complete transformation matrix. This is the final matrix, not an intermediate interpolated matrix.", latex: `A=[Ae_1\\;Ae_2${n === 3 ? "\\;Ae_3" : ""}]=${matrix}`, progress: 1 });
  const detMeaning = determinant.n === 0n
    ? (zh ? "行列式為零：圖形壓扁、資訊丟失，變換不可逆。" : "Zero determinant: the shape collapses, information is lost, and the map is not invertible.")
    : (zh ? `|det A| 是${n === 2 ? "面積" : "體積"}縮放因子；正負號表示定向是否反轉，非零則可逆。` : `|det A| is the ${n === 2 ? "area" : "volume"} scale factor; the sign records orientation reversal. A nonzero determinant means the map is invertible.`);
  const detFormula = n === 2 ? "a_{11}a_{22}-a_{12}a_{21}" : "a_{11}(a_{22}a_{33}-a_{23}a_{32})-a_{12}(a_{21}a_{33}-a_{23}a_{31})+a_{13}(a_{21}a_{32}-a_{22}a_{31})";
  steps.push({ description: detMeaning, latex: `\\det A=${detFormula}=${ratToLatex(determinant)}`, progress: 1 });
  steps.push({ description: zh ? "現在使用自訂輸入向量。vⱼ 是第 j 個輸入分量，v′ᵢ 是第 i 個輸出分量；依次計算每一橫列與 v 的內積。" : "Now use the custom input vector. vⱼ is input component j and v′ᵢ is output component i. Compute each row’s dot product with v in order.", latex: `v=${input},\\quad v'_i=\\sum_{j=1}^{${n}}a_{ij}v_j`, progress: 1 });
  for (let row = 0; row < n; row++) {
    const multiplication = exact[row].map((entry, col) => `\\left(${transformationEntryLatex(entry)}\\right)\\left(${ratToLatex(transformationDecimal(vector[col]))}\\right)`).join("+");
    steps.push({ description: zh ? `輸出第 ${row + 1} 分量：第 ${row + 1} 橫列的係數分別乘上輸入分量，再相加。圖中輸出箭頭逐分量揭示，並非向量運動軌跡。` : `Output component ${row + 1}: multiply the entries of row ${row + 1} by the input components, then add. The output arrow is revealed component by component; this is not a vector motion path.`, latex: `v'_{${row + 1}}=${multiplication}=${transformationEntryLatex(result[row])}`, progress: 1, vectorVisible: true, activeRow: row });
  }
  const linearCombination = vector.map((value, col) => `\\left(${ratToLatex(transformationDecimal(value))}\\right)${transformationVectorLatex(exact.map(row => row[col]))}`).join("+");
  steps.push({ description: zh ? "幾何核對：輸出是各基底像的線性組合。權重就是輸入分量，與橫列內積得到同一結果。" : "Geometric check: the output is a linear combination of the basis images, weighted by the input components. This agrees with the row dot products.", latex: `Av=${linearCombination}=${transformationVectorLatex(result)}`, progress: 1, vectorVisible: true });
  steps.push({ description: zh ? "精確答案：組合所有輸出分量。圖表只使用浮點座標作視覺化；下列等號保留有理數、根式或三角式。" : "Exact answer: collect all output components. The chart uses floating-point coordinates only for visualization; these equalities retain rational, radical, or trigonometric expressions.", latex: `Av=${matrix}${input}=${transformationVectorLatex(result)}`, progress: 1, vectorVisible: true });
  return steps;
}

interface GeometryProps { matrix: number[][]; targetMatrix: number[][]; lang: Lang; vector: number[]; progress: number; vectorVisible: boolean; activeRow?: number }
function Plot2D({ matrix, targetMatrix, lang, vector, progress, vectorVisible, activeRow }: GeometryProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const approximate = lang === "zh" ? "（浮點近似）" : "(floating-point approximation)";
    const staged = progress < 1 ? (lang === "zh" ? "中間示意" : "Intermediate illustration") : (lang === "zh" ? "變換後" : "Transformed");
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const circle = Array.from({ length: 81 }, (_, i) => [Math.cos(2 * Math.PI * i / 80), Math.sin(2 * Math.PI * i / 80)]);
    const image = (points: number[][]) => points.map(v => transformationApplyNumeric(matrix, v));
    const transformedSquare = image(sq), transformedCircle = image(circle);
    const basis = [[1, 0], [0, 1]].map(v => transformationApplyNumeric(matrix, v));
    const output = transformationApplyNumeric(targetMatrix, vector).map((value, i) => activeRow !== undefined && i > activeRow ? 0 : value);
    const traces: Plotly.Data[] = [
      { x: sq.map(v => v[0]), y: sq.map(v => v[1]), mode: "lines", name: lang === "zh" ? "原始正方形" : "Original square", line: { color: "#879491", dash: "dash", width: 1.5 } },
      { x: circle.map(v => v[0]), y: circle.map(v => v[1]), mode: "lines", name: lang === "zh" ? "原始圓" : "Original circle", line: { color: "#b0b8ad", dash: "dot", width: 1 } },
      { x: transformedSquare.map(v => v[0]), y: transformedSquare.map(v => v[1]), mode: "lines", name: `${staged} ${lang === "zh" ? "正方形" : "square"}`, line: { color: "#096b62", width: 2.5 }, fill: "toself", fillcolor: "rgba(9,107,98,0.08)" },
      { x: transformedCircle.map(v => v[0]), y: transformedCircle.map(v => v[1]), mode: "lines", name: `${staged} ${lang === "zh" ? "圓（可退化）" : "circle (may degenerate)"}`, line: { color: "#995b0b", width: 1.5, dash: "dot" } },
      ...basis.map((v, i): Plotly.Data => ({ x: [0, v[0]], y: [0, v[1]], mode: "lines+markers", name: `${progress < 1 ? "B(t)" : "A"}e${i + 1}`, line: { color: i === 0 ? "#b73636" : "#096b62", width: 3 }, marker: { size: [0, 8], color: i === 0 ? "#b73636" : "#096b62" } })),
      { x: [0, vector[0]], y: [0, vector[1]], mode: "lines+markers", name: "v", line: { color: "#60706e", width: 2, dash: "dot" }, marker: { size: [0, 6] } },
    ];
    const annotations: Partial<Plotly.Annotations>[] = [];
    if (vectorVisible) {
      traces.push({ x: [0, output[0]], y: [0, output[1]], mode: "lines+markers", name: activeRow !== undefined && activeRow < 1 ? (lang === "zh" ? "部分輸出（未算分量暫隱藏）" : "Partial output (pending components hidden)") : "Av", line: { color: "#c77b19", width: 3 }, marker: { size: [0, 8] } });
      annotations.push({ x: output[0], y: output[1], ax: 0, ay: 0, xref: "x", yref: "y", axref: "x", ayref: "y", showarrow: true, arrowhead: 3, arrowwidth: 2, arrowcolor: "#c77b19", text: activeRow !== undefined && activeRow < 1 ? (lang === "zh" ? "部分揭示" : "Partial reveal") : `Av ≈ (${output.map(transformationApprox).join(", ")})`, font: { size: 10, color: "#855217" }, bgcolor: "rgba(255,254,250,0.85)" });
    }
    if (progress === 1) {
      const det = targetMatrix[0][0] * targetMatrix[1][1] - targetMatrix[0][1] * targetMatrix[1][0];
      annotations.push({ x: transformedSquare.slice(0, 4).reduce((s, v) => s + v[0], 0) / 4, y: transformedSquare.slice(0, 4).reduce((s, v) => s + v[1], 0) / 4, text: `det A ≈ ${transformationApprox(det)}`, showarrow: false, font: { size: 10, color: "#096b62" }, bgcolor: "rgba(255,254,250,0.85)" });
    }
    const bounds = [...sq, ...circle, ...image(sq), ...sq.map(v => transformationApplyNumeric(targetMatrix, v)), vector, transformationApplyNumeric(targetMatrix, vector)];
    const extent = Math.max(1.5, ...bounds.flat().map(Math.abs)) * 1.2;
    const layout: Partial<Plotly.Layout> = {
      xaxis: { title: { text: "x" }, range: [-extent, extent], zerolinecolor: "#60706e", gridcolor: "#dddfd5" },
      yaxis: { title: { text: "y" }, range: [-extent, extent], scaleanchor: "x", scaleratio: 1, zerolinecolor: "#60706e", gridcolor: "#dddfd5" },
      legend: { orientation: "h", x: 0, y: -0.18, font: { size: 10 } },
      margin: { l: 35, r: 12, t: 10, b: 105 }, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "IBM Plex Mono, monospace", size: 11, color: "#172a36" }, annotations,
      uirevision: JSON.stringify(targetMatrix),
    };
    traces.forEach(trace => { (trace as Partial<Plotly.ScatterData>).hovertemplate = `%{x}, %{y} ${approximate}<extra>%{fullData.name}</extra>`; });
    void Plotly.react(ref.current, traces, layout, { responsive: true, displayModeBar: true, scrollZoom: false });
  }, [matrix, targetMatrix, lang, vector, progress, vectorVisible, activeRow]);
  useEffect(() => { const node = ref.current; return () => { if (node) Plotly.purge(node); }; }, []);
  return <div ref={ref} className="w-full min-w-0" style={{ height: 440 }} role="img" aria-label={lang === "zh" ? "變換圖：原圖、基底向量、階段圖形與自訂向量" : "Transformation plot: original shape, basis, staged geometry, and custom vector"} />;
}

function plot3DData({ matrix, targetMatrix, lang, vector, progress, vectorVisible, activeRow }: GeometryProps): { traces: Plotly.Data[]; layout: Partial<Plotly.Layout> } {
  const edges = [
    [[0,0,0],[1,0,0]], [[0,1,0],[1,1,0]], [[0,0,1],[1,0,1]], [[0,1,1],[1,1,1]],
    [[0,0,0],[0,1,0]], [[1,0,0],[1,1,0]], [[0,0,1],[0,1,1]], [[1,0,1],[1,1,1]],
    [[0,0,0],[0,0,1]], [[1,0,0],[1,0,1]], [[0,1,0],[0,1,1]], [[1,1,0],[1,1,1]],
  ];
  const line = (points: number[][], name: string, color: string, legend = true, dashed = false): Partial<Plotly.ScatterData> => ({ type: "scatter3d", x: points.map(v => v[0]), y: points.map(v => v[1]), z: points.map(v => v[2]), mode: "lines", name, showlegend: legend, line: { color, width: dashed ? 2 : 4, dash: dashed ? "dash" : "solid" }, hovertemplate: `%{x}, %{y}, %{z} ${lang === "zh" ? "（浮點近似）" : "(floating-point approximation)"}<extra>%{fullData.name}</extra>` });
  const traces: Plotly.Data[] = edges.map((edge, i) => line(edge, lang === "zh" ? "原始立方體" : "Original cube", "#879491", i === 0, true));
  traces.push(...edges.map((edge, i) => line(edge.map(v => transformationApplyNumeric(matrix, v)), progress < 1 ? (lang === "zh" ? "中間示意立方體" : "Intermediate illustrative cube") : (lang === "zh" ? "變換後立方體" : "Transformed cube"), "#096b62", i === 0)));
  for (let i = 0; i < 3; i++) {
    const basis = Array.from({ length: 3 }, (_, j) => i === j ? 1 : 0);
    const trace = line([[0,0,0], transformationApplyNumeric(matrix, basis)], `${progress < 1 ? "B(t)" : "A"}e${i + 1}`, ["#b73636", "#096b62", "#337da0"][i]);
    trace.mode = "lines+markers"; trace.marker = { size: [0, 5] }; traces.push(trace);
  }
  traces.push(line([[0,0,0], vector], "v", "#60706e", true, true));
  if (vectorVisible) {
    const output = transformationApplyNumeric(targetMatrix, vector).map((value, i) => activeRow !== undefined && i > activeRow ? 0 : value);
    const partial = activeRow !== undefined && activeRow < 2;
    const trace = line([[0,0,0], output], partial ? (lang === "zh" ? "部分輸出（未算分量暫隱藏）" : "Partial output (pending components hidden)") : "Av", "#c77b19");
    trace.mode = "lines+markers"; trace.marker = { size: [0, 6] }; traces.push(trace);
  }
  const bounds = [...edges.flat(), ...edges.flat().map(v => transformationApplyNumeric(targetMatrix, v)), ...edges.flat().map(v => transformationApplyNumeric(matrix, v)), vector, transformationApplyNumeric(targetMatrix, vector)];
  const extent = Math.max(1.5, ...bounds.flat().map(Math.abs)) * 1.2;
  const axis = (text: string) => ({ title: { text }, gridcolor: "#dddfd5", range: [-extent, extent] });
  return { traces, layout: { scene: { xaxis: axis("x"), yaxis: axis("y"), zaxis: axis("z"), aspectmode: "cube", bgcolor: "rgba(0,0,0,0)" }, legend: { orientation: "h", x: 0, y: -0.1, font: { size: 10 } }, margin: { l: 0, r: 0, t: 10, b: 70 }, paper_bgcolor: "rgba(0,0,0,0)", font: { family: "IBM Plex Mono, monospace", size: 11, color: "#172a36" }, uirevision: JSON.stringify(targetMatrix) } };
}

export default function TransformationPage() {
  const { lang } = useLanguage();
  const [selectedId, setSelectedId] = useState("rotate2d");
  const [params, setParams] = useState<Record<string, TransformationParams>>({});
  const [vector, setVector] = useState([1, 0, 0]);
  const [playback, setPlayback] = useState<{ key: string; index: number; mode: "all" | "playback" }>({ key: "", index: 0, mode: "all" });
  const selected = TRANSFORMS.find(t => t.id === selectedId)!;
  const currentParams = useMemo(() => Object.fromEntries(selected.params.map(p => [p.id, params[selectedId]?.[p.id] ?? p.default])), [selected, selectedId, params]);
  const currentVector = useMemo(() => vector.slice(0, selected.dim === "2d" ? 2 : 3), [vector, selected.dim]);
  const matrix = useMemo(() => transformationNumericMatrix(selectedId, currentParams), [selectedId, currentParams]);
  const exactMatrix = useMemo(() => transformationMatrixLatex(transformationExactMatrix(selectedId, currentParams)), [selectedId, currentParams]);
  const determinant = useMemo(() => transformationDeterminant(selectedId, currentParams), [selectedId, currentParams]);
  const steps = useMemo(() => Phase20transformationLesson(selected, currentParams, currentVector, lang), [selected, currentParams, currentVector, lang]);
  const lessonKey = JSON.stringify([selectedId, currentParams, currentVector, lang]);
  const onStepChange = useCallback((index: number, mode: "all" | "playback") => {
    setPlayback(previous => previous.key === lessonKey && previous.index === index && previous.mode === mode ? previous : { key: lessonKey, index, mode });
  }, [lessonKey]);
  const isPlayback = playback.key === lessonKey && playback.mode === "playback";
  const activeIndex = isPlayback ? Math.max(0, Math.min(steps.length - 1, playback.index)) : steps.length - 1;
  const activeStep = steps[activeIndex];
  const stageMatrix = useMemo(() => transformationSnapshot(selectedId, currentParams, activeStep.progress), [selectedId, currentParams, activeStep.progress]);
  const geometry = useMemo<GeometryProps>(() => ({ matrix: stageMatrix, targetMatrix: matrix, vector: currentVector, lang, progress: activeStep.progress, vectorVisible: Boolean(activeStep.vectorVisible), activeRow: activeStep.activeRow }), [stageMatrix, matrix, currentVector, lang, activeStep]);
  const scene = useMemo(() => selected.dim === "3d" ? plot3DData(geometry) : null, [selected.dim, geometry]);
  const numericalOutput = useMemo(() => transformationApplyNumeric(matrix, currentVector), [matrix, currentVector]);
  const zh = lang === "zh";
  const setParam = (id: string, value: number) => {
    if (!Number.isFinite(value) || (selectedId === "squeeze" && id === "k" && value <= 0)) return;
    setParams(previous => ({ ...previous, [selectedId]: { ...previous[selectedId], [id]: value } }));
  };
  const updateVector = (index: number, value: number) => { if (Number.isFinite(value)) setVector(previous => previous.map((v, i) => i === index ? value : v)); };
  const morphWarning = selectedId.startsWith("reflect") || selectedId.startsWith("custom") || (selectedId.startsWith("scale") && Object.values(currentParams).some(value => value <= 0));
  const rule = ruleFor(selected, currentParams, lang);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--lab-heading)" }}>{zh ? "幾何變換" : "Geometric Transformations"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{zh ? "從基底的像建立矩陣，再逐步計算自訂向量。播放推導時，圖形與計算同步揭示。" : "Build a matrix from the basis images, then calculate a custom vector. Play the derivation to reveal geometry and calculations together."}</p>
      </header>
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          {(["2D", "3D", "Custom"] as const).map(category => <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-2">{category === "Custom" && zh ? "自訂" : category}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">{TRANSFORMS.filter(t => t.category === category).map(t => <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} aria-pressed={selectedId === t.id} className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedId === t.id ? "bg-primary text-primary-foreground font-semibold" : "bg-card text-foreground border border-border hover:bg-secondary"}`}>{zh ? t.nameZh : t.nameEn}</button>)}</div>
          </section>)}
          {selected.params.length > 0 && <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">{zh ? "參數" : "Parameters"}</h2>
            {selected.params.map(p => <div key={p.id} className="space-y-1">
              <div className="flex items-start justify-between gap-2"><label htmlFor={`transform-${p.id}`} className="text-xs text-muted-foreground">{zh ? p.labelZh : p.labelEn}</label><span className="text-xs font-mono font-semibold text-foreground break-all">{currentParams[p.id]}{p.unit ?? ""}</span></div>
              <input type="range" aria-label={zh ? p.labelZh : p.labelEn} min={p.min ?? -10} max={p.max ?? 10} step={p.step ?? 0.1} value={currentParams[p.id]} onChange={e => setParam(p.id, Number(e.target.value))} className="w-full accent-primary" />
              <input id={`transform-${p.id}`} type="number" step="any" min={selectedId === "squeeze" ? 0.000001 : undefined} value={currentParams[p.id]} onChange={e => setParam(p.id, Number(e.target.value))} className="w-full border border-border rounded px-2 py-1.5 text-xs font-mono bg-background text-foreground" />
            </div>)}
            {selectedId === "squeeze" && <p className="text-xs text-muted-foreground">{zh ? "k 必須為正數；零或負數不適用於此擠壓變換。" : "k must be positive; zero or negative inputs do not define this squeeze mapping."}</p>}
          </section>}
        </aside>
        <main className="flex-1 min-w-0 space-y-5">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-bold text-foreground mb-2">{zh ? selected.nameZh : selected.nameEn}</h2>
            <p className="text-sm text-muted-foreground">{rule.context}</p>
            <p className="text-xs text-muted-foreground mt-2">{zh ? "這些線性變換固定原點。一般平移是仿射變換，不能只用本頁的 2×2／3×3 線性矩陣表示。" : "These linear maps fix the origin. Translation is affine and cannot be represented by these 2×2/3×3 linear matrices alone."}</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">{zh ? "最終變換矩陣（精確）" : "Final Transformation Matrix (exact)"}</h2>
              <span className="rounded bg-primary/10 text-primary px-2 py-1 text-xs"><KatexRenderer latex={`\\det A=${ratToLatex(determinant)}`} displayMode={false} /></span>
            </div>
            <div className="overflow-x-auto"><KatexRenderer latex={`A=${exactMatrix}`} displayMode /></div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">{zh ? "查看浮點近似（僅供圖表核對）" : "View floating-point approximation (for plot comparison only)"}</summary>
              <div className="overflow-x-auto py-2"><KatexRenderer latex={`A\\approx\\begin{bmatrix}${matrix.map(row => row.map(transformationApprox).join(" & ")).join(" \\\\ ")}\\end{bmatrix}`} displayMode /></div>
            </details>
          </section>
          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">{zh ? "自訂輸入向量" : "Custom Input Vector"}</h2>
            <p className="text-xs text-muted-foreground">{zh ? "修改分量後，推導與圖表一同更新。完整橫列乘法、基底組合及精確輸出都包含在下方播放器。" : "Changing a component updates both the derivation and the plot. Row multiplication, the basis combination, and exact output are all included in the player below."}</p>
            <div className="flex flex-wrap gap-3">{currentVector.map((value, i) => <div key={i} className="flex items-center gap-2"><label htmlFor={`transform-vector-${i}`} className="text-xs font-mono text-muted-foreground">{["x", "y", "z"][i]}</label><input id={`transform-vector-${i}`} type="number" step="any" value={value} onChange={e => updateVector(i, Number(e.target.value))} className="w-24 border border-border rounded px-2 py-1.5 text-xs font-mono bg-background text-foreground" /></div>)}</div>
          </section>
          <StepDisplay key={lessonKey} steps={steps} title={zh ? "完整推導與向量計算" : "Complete Derivation & Vector Calculation"} onStepChange={onStepChange} />
          <section className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">{zh ? "同步幾何圖" : "Synchronized Geometry"}</h2><span className="text-xs text-muted-foreground">{zh ? "可縮放・可拖曳" : "Zoomable · draggable"}</span></div>
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 space-y-1">
              <p className="text-xs text-primary font-medium" aria-live="polite">{isPlayback ? (zh ? `播放步驟 ${activeIndex + 1}／${steps.length}：${activeStep.progress < 1 ? "中間階段" : "最終圖形"}` : `Playback step ${activeIndex + 1}/${steps.length}: ${activeStep.progress < 1 ? "intermediate stage" : "final geometry"}`) : (zh ? "完整模式：顯示最終變換與向量輸出。" : "All-steps mode: final transformation and vector output.")}</p>
              <p className="text-xs text-muted-foreground">{morphWarning ? (zh ? "中間階段使用 B(t)=(1−t)I+tA 作教學插值，可能壓扁圖形；它不是反射或一般自訂變換的實際運動軌跡。只有 t=1 是指定變換。" : "Intermediate stages use the teaching interpolation B(t)=(1−t)I+tA, which can collapse a shape. This is not the actual motion path of a reflection or general custom map; only t=1 is the specified transformation.") : selectedId.startsWith("rotate") ? (zh ? "旋轉階段使用 R(tθ)，是同一旋轉軸的實際角度路徑。圖中浮點座標僅供視覺化。" : "Rotation stages use R(tθ), the actual angular path about the same axis. Floating-point coordinates are for visualization only.") : selectedId === "squeeze" ? (zh ? "擠壓階段使用 k(t)=1+t(k−1) 及 1/k(t)，每階段保持面積。" : "Squeeze stages use k(t)=1+t(k−1) and 1/k(t), preserving area at every stage.") : (zh ? "中間圖是參數逐步變化的教學快照；向量輸出按已計算分量揭示，不代表運動軌跡。" : "Intermediate plots are teaching snapshots of changing parameters; the output is revealed by computed components, not as a motion path.")}</p>
            </div>
            {selected.dim === "2d" ? <Plot2D {...geometry} /> : scene && <Plot3DScene data={scene.traces} layout={scene.layout} lang={lang} name={zh ? "三維變換：立方體、基底與自訂向量" : "3D transformation: cube, basis, and custom vector"} />}
            <p className="text-xs text-muted-foreground">{zh ? "虛線／點線：原圖與輸入 v。青綠：階段圖形。基底箭頭：紅、青綠、藍（3D）。琥珀：已揭示的輸出。圖表懸停座標與以下小數皆為近似值，精確答案以推導為準。" : "Dashed/dotted: original shape and input v. Teal: staged shape. Basis arrows: red, teal, blue (3D). Amber: revealed output. Hover coordinates and the decimals below are approximations; use the derivation for exact answers."}</p>
            {activeStep.vectorVisible && activeStep.activeRow === undefined && <div className="overflow-x-auto text-xs"><KatexRenderer latex={`Av\\approx\\begin{bmatrix}${numericalOutput.map(transformationApprox).join(" \\\\ ")}\\end{bmatrix}`} displayMode={false} /></div>}
          </section>
        </main>
      </div>
    </div>
  );
}
