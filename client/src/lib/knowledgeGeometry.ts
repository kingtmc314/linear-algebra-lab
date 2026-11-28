export interface KnowledgeGeometryMeaning {
  zh: string;
  en: string;
  latex: string;
}
const meaning = (
  zh: string,
  en: string,
  latex: string
): KnowledgeGeometryMeaning => ({ zh, en, latex });

/** Geometry is stated separately from an example and from an algebraic definition. */
export const knowledgeGeometry: Record<string, KnowledgeGeometryMeaning> = {
  "matrix-def": meaning(
    "矩陣的每一列可視作一個向量。A 的第 j 列就是標準基底 eⱼ 經 A 變換後的位置；元素格圖用行、列索引把坐標對應起來。",
    "Each column is a vector. Column j of A is the image of the standard basis vector eⱼ. The entry diagram connects each coordinate with its row and column index.",
    String.raw`A\mathbf e_j=\operatorname{col}_j(A)`
  ),
  "matrix-add": meaning(
    "同維度矩陣相加，是把對應的列向量逐分量相加；對任何輸入向量，先分別作 A、B 變換，再以首尾法相加。不是把兩個變換依次套用。",
    "For equal dimensions, add corresponding column vectors componentwise. For any input, add the images under A and B tip to tail; addition is not composition.",
    String.raw`(A+B)\mathbf x=A\mathbf x+B\mathbf x`
  ),
  "matrix-mul": meaning(
    "AB 是合成變換：先 B，後 A。逐行與逐列內積給出結果的坐標；順序改變，通常圖形與結果也不同。",
    "AB is composition: B first, then A. Row–column dot products give the resulting coordinates. Reversing the order usually changes the image and the result.",
    String.raw`(AB)\mathbf x=A(B\mathbf x)`
  ),
  "matrix-transpose": meaning(
    "轉置把格圖沿主對角線交換行、列。對實數向量，它亦把內積中的 A 移到另一側成為 Aᵀ；這不表示 Aᵀ 一定是把平面圖形反射。",
    "Transpose swaps rows and columns across the entry grid's diagonal. For real vectors it also transfers A to the other side of an inner product as Aᵀ; it is not generally a reflection of a plane figure.",
    String.raw`\langle A\mathbf x,\mathbf y\rangle=\langle\mathbf x,A^T\mathbf y\rangle`
  ),
  "matrix-det": meaning(
    "2D 中，兩個列向量張成平行四邊形；3D 中，三個列向量張成平行六面體。|det A| 是面積／體積縮放因子，正負記錄方向是否反轉；det A=0 表示圖形壓到較低維度。",
    "Two column vectors span a parallelogram in 2D; three span a parallelepiped in 3D. |det A| is the area/volume scale factor. The sign records orientation; det A=0 collapses the image to a lower dimension.",
    String.raw`\text{area/volume scale}=|\det A|`
  ),
  "matrix-inverse": meaning(
    "A⁻¹ 把 A 變換後的每個點送回原位置。若 A 把不同點壓到同一點，便不能唯一還原，所以奇異矩陣沒有逆。",
    "A⁻¹ sends every transformed point back to its original position. If A maps different points to the same point, a unique reversal is impossible: a singular matrix has no inverse.",
    String.raw`A^{-1}(A\mathbf x)=\mathbf x`
  ),
  "matrix-identity": meaning(
    "單位矩陣固定所有向量、方向與圖形，大小和位置都不改變；其列向量正是標準基底。",
    "The identity fixes every vector, direction and figure without changing size or position. Its columns are the standard basis vectors.",
    String.raw`I\mathbf x=\mathbf x`
  ),
  "matrix-eigen-def": meaning(
    "非零特徵向量變換後仍在同一條過原點的直線上：λ 控制縮放；λ<0 會反向；λ=0 壓到原點。零向量不是特徵向量。",
    "A nonzero eigenvector stays on the same line through the origin. λ controls scaling; λ<0 reverses direction, while λ=0 sends it to the origin. The zero vector is not an eigenvector.",
    String.raw`A\mathbf v=\lambda\mathbf v,\quad\mathbf v\ne\mathbf0`
  ),
  "matrix-eigen-space": meaning(
    "固定 λ 後，所有符合特徵方程的向量連同零向量構成子空間。示例中是過原點的直線；較高維度亦可是一個平面或更大的子空間。",
    "For a fixed λ, all vectors satisfying the eigen-equation, including zero, form a subspace. The example is a line through the origin; higher-dimensional cases can be planes or larger subspaces.",
    String.raw`E_\lambda=\ker(A-\lambda I)`
  ),
  "matrix-char-poly": meaning(
    "實數根 λ 使 A−λI 的列向量線性相關，平行四邊形塌縮；因此有非零方向被送到零，等價於 A 在該方向只作 λ 倍縮放。曲線與圖形同時顯示這個條件；並非所有矩陣都有實數根。",
    "At a real root λ, the columns of A−λI become dependent and the parallelogram collapses. A nonzero direction maps to zero, equivalently A scales that direction by λ. The curve and column diagram show this together; not every matrix has real roots.",
    String.raw`\det(A-\lambda I)=0\iff\ker(A-\lambda I)\ne\{\mathbf0\}`
  ),
  "ls-def": meaning(
    "每個非零係數方程給出一條直線（2D）、平面（3D）或超平面。聯立解是它們的共同交集，而不是任一方程上的任意點。",
    "A nonzero coefficient equation defines a line in 2D, a plane in 3D or a hyperplane. A system's solutions lie in their common intersection, not merely on one equation.",
    String.raw`\mathcal S=\{\mathbf x:A\mathbf x=\mathbf b\}`
  ),
  "ls-augmented": meaning(
    "增廣矩陣每一行保留一個方程：係數決定直線／平面的方向，常數決定偏移。全零係數行若常數為零則沒有新限制，若常數非零則矛盾。",
    "Each augmented row retains one equation. Coefficients determine line/plane direction; the constant determines offset. A zero coefficient row adds no restriction if its constant is zero and is contradictory otherwise.",
    String.raw`[A\mid\mathbf b],\quad\mathbf a_i\cdot\mathbf x=b_i`
  ),
  "ls-row-ops": meaning(
    "可逆的初等行運算會改寫個別直線／平面，卻保持整個方程組的共同交集。動畫中的第二條線轉動，但共同解保持不動。",
    "Reversible elementary row operations change individual equation lines/planes but preserve their common intersection. The animated second line moves while the common solution stays fixed.",
    String.raw`R_i\leftarrow R_i+cR_j\quad(i\ne j)`
  ),
  "ls-gaussian": meaning(
    "消去把相交條件整理成容易讀取的階梯形式，但不移動共同解集。主元是獨立限制；自由變數給出解集內可移動的方向；矛盾行表示沒有交集。",
    "Elimination organizes intersection conditions into echelon form without changing the common solution set. Pivots are independent constraints; free variables give directions of motion in the solution set; a contradictory row means no intersection.",
    String.raw`\operatorname{rank}(A)=\operatorname{rank}([A\mid\mathbf b])\Rightarrow\dim\mathcal S=n-\operatorname{rank}(A)`
  ),
  "ls-solution-types": meaning(
    "相交於一點是唯一解；重合有無限多解；平行且不重合則無解。consistent 指交集非空；inconsistent 指交集為空。一般維度用兩個秩比較，而不只看直線示意。",
    "One intersection point gives a unique solution; coincident lines give infinitely many; distinct parallel lines give none. Consistent means a nonempty intersection; inconsistent means empty. In general dimensions compare the two ranks, not just a line sketch.",
    String.raw`\text{consistent}\iff\operatorname{rank}(A)=\operatorname{rank}([A\mid\mathbf b])`
  ),
  "ls-cramer": meaning(
    "方陣且 det A≠0 時，各未知數是替換對應列後的帶符號面積／體積比。必須保留符號，不能以絕對面積直接求未知數；det A=0 時不適用。",
    "For a square matrix with det A≠0, each unknown is a signed area/volume ratio after replacing its corresponding column. Keep the sign: absolute area alone cannot recover the unknown. The rule is unavailable when det A=0.",
    String.raw`x_j=\frac{\det A_j}{\det A},\quad\det A\ne0`
  ),
  "vec-def": meaning(
    "向量表示由起點到終點的位移。把箭頭整體平移，不改變向量；坐標分量記錄各軸方向的位移。",
    "A vector is displacement from tail to tip. Translating the entire arrow does not change it; components record displacement along each coordinate axis.",
    String.raw`\overrightarrow{PQ}=\mathbf q-\mathbf p`
  ),
  "vec-add": meaning(
    "把第二個向量的起點移到第一個的終點，總位移由第一個起點指向最後終點。減法 a−b 則由 b 的終點指向 a 的終點（同一起點）。",
    "Move the second vector's tail to the first vector's tip. Their sum runs from the first tail to the final tip. With a common tail, a−b points from b's tip to a's tip.",
    String.raw`\overrightarrow{PQ}+\overrightarrow{QR}=\overrightarrow{PR}`
  ),
  "vec-magnitude": meaning(
    "長度是箭頭的實際距離，不帶正負。正交分量與箭頭構成直角三角形，畢氏定理連結分量與長度；3D 再加入第三個正交分量。",
    "Magnitude is the arrow's distance and is never negative. Orthogonal components form a right triangle with the arrow, connecting components to length by Pythagoras; 3D adds a third orthogonal component.",
    String.raw`|\mathbf v|=\sqrt{v_1^2+\cdots+v_n^2}`
  ),
  "vec-unit": meaning(
    "非零向量除以其長度，箭頭方向不變而長度變成 1，終點落在單位圓／球上。零向量沒有方向，不能單位化。",
    "Divide a nonzero vector by its magnitude: direction stays fixed, length becomes 1 and the tip lies on the unit circle/sphere. Zero has no direction and cannot be normalized.",
    String.raw`\widehat{\mathbf v}=\frac{\mathbf v}{|\mathbf v|},\quad\mathbf v\ne\mathbf0`
  ),
  "vec-dot": meaning(
    "內積等於第一個向量的長度乘第二個向量在其方向上的帶符號投影長度。同向投影為正、垂直為零、反向為負；內積結果是純量。",
    "The dot product is the first vector's length times the other's signed projection onto its direction. Projection is positive, zero at a right angle, or negative in the opposite direction. The result is a scalar.",
    String.raw`\mathbf a,\mathbf b\ne\mathbf0:\quad\mathbf a\cdot\mathbf b=|\mathbf a||\mathbf b|\cos\theta`
  ),
  "vec-angle": meaning(
    "兩個非零向量的夾角由內積與長度決定，範圍 0 到 π。平移箭頭以共用起點不改變角度；任何一個是零向量時角度未定義。",
    "The angle between nonzero vectors is determined by the dot product and lengths, in [0,π]. Translate arrows to a common tail without changing the angle. If either vector is zero, the angle is undefined.",
    String.raw`\theta=\arccos\frac{\mathbf a\cdot\mathbf b}{|\mathbf a||\mathbf b|}`
  ),
  "vec-cross": meaning(
    "3D 叉積方向垂直於兩個向量，依右手法則；長度等於它們張成的平行四邊形面積。交換次序會反向；平行或零向量的叉積為零。等角投影圖只顯示 3D 坐標，不以畫面面積冒充真面積。",
    "The 3D cross product is perpendicular to both vectors, with direction set by the right-hand rule. Its magnitude is their parallelogram's area. Swapping order reverses it; parallel or zero vectors give zero. An isometric display shows 3D coordinates, not true screen-measured area.",
    String.raw`\mathbf a,\mathbf b\ne\mathbf0:\quad|\mathbf a\times\mathbf b|=|\mathbf a||\mathbf b|\sin\theta`
  ),
  "vec-plane-plane-angle": meaning(
    "由四點或以上取得兩個平面內、垂直於交線的方向，再比較它們的內積。這是垂直截面中的較小角；任意兩條平面內向量不能代替。法向量方向角與題目指定開口另作區分。",
    "Use four or more points to obtain in-plane directions perpendicular to the intersection, then compare their dot product. This is the smaller angle in a perpendicular section; arbitrary in-plane vectors cannot replace them. Directed normal angles and a selected opening are distinguished separately.",
    String.raw`\theta=\arccos\frac{|\mathbf u\cdot\mathbf v|}{|\mathbf u||\mathbf v|}`
  ),
  "vec-line-plane-angle": meaning(
    "把直線方向 d 投影到平面內得到 q，以 d 與 q 求較小角。q=0 時直線垂直於平面，角為 π/2；只使用已知點與向量，不需平面方程。",
    "Project the line direction d into the plane to get q, then compare d and q for the smaller angle. If q=0 the line is perpendicular and the angle is π/2. The method uses given points and vectors, not a plane equation.",
    String.raw`\mathbf q\ne\mathbf0:\quad\theta=\arccos\frac{|\mathbf d\cdot\mathbf q|}{|\mathbf d||\mathbf q|}`
  ),
};
