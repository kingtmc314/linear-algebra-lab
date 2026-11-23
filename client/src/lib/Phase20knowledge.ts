import {
  knowledgeTopics,
  type KnowledgeItemData,
  type KnowledgeTopicData,
} from "./knowledgeData";

export type KnowledgeLanguage = "zh" | "en";
export interface KnowledgeLessonStep {
  description: string;
  latex?: string;
}
interface BilingualStep {
  zh: string;
  en: string;
  latex?: string;
}

const step = (zh: string, en: string, latex?: string): BilingualStep => ({
  zh,
  en,
  latex,
});

// The original content remains untouched. These are explicit, reviewed snapshots,
// not fragments inferred by splitting prose or equalities.
const contexts: Record<string, BilingualStep> = {
  "matrix-def": step(
    "A 是 m×n 矩陣；m 是行數，n 是列數。aᵢⱼ 是第 i 行、第 j 列元素，1≤i≤m、1≤j≤n。",
    "A is an m×n matrix: m counts rows, n counts columns. aᵢⱼ is the entry in row i, column j, with 1≤i≤m and 1≤j≤n."
  ),
  "matrix-add": step(
    "A、B 必須同為 m×n 矩陣；aᵢⱼ、bᵢⱼ 是相同位置的元素，(A+B)ᵢⱼ 是和矩陣的該元素。",
    "A and B must both be m×n. aᵢⱼ and bᵢⱼ are entries in the same position; (A+B)ᵢⱼ is that entry of the sum."
  ),
  "matrix-mul": step(
    "A 為 m×n、B 為 n×p，AB 為 m×p。i 選 A 的行，j 選 B 的列，k 從 1 到 n 配對相乘再求和。AB 與 BA 一般不相等，有時 BA 甚至未定義。",
    "A is m×n, B is n×p, and AB is m×p. i selects a row of A, j a column of B, and k runs from 1 to n to pair and sum entries. AB and BA need not agree; BA may not even be defined."
  ),
  "matrix-transpose": step(
    "Aᵀ 表示 A 的轉置，不是乘方。若 A 為 m×n，Aᵀ 為 n×m；原本的第 j 行第 i 列變成第 i 行第 j 列。",
    "Aᵀ denotes the transpose, not a power. If A is m×n, Aᵀ is n×m: original row j, column i becomes row i, column j."
  ),
  "matrix-det": step(
    "A 必須是 n×n 方陣。M₁ⱼ 是刪除第 1 行和第 j 列後子矩陣的行列式；(−1)¹⁺ʲ 提供餘因子的正負號。2×2 的 a、b、c、d 按行排列。",
    "A must be n×n. M₁ⱼ is the determinant after deleting row 1 and column j; (−1)¹⁺ʲ supplies the cofactor sign. For a 2×2 matrix, a, b, c, d are listed row by row."
  ),
  "matrix-inverse": step(
    "A 為 n×n 且 det(A)≠0；A⁻¹ 為逆矩陣，I 為 n×n 單位矩陣。[A|I] 的兩側須同時接受每一次行運算（初等列變換）。",
    "A is n×n with det(A)≠0; A⁻¹ is its inverse and I the n×n identity. Every row operation on [A|I] must act on both halves."
  ),
  "matrix-identity": step(
    "Iₙ 是 n×n 單位矩陣；主對角線 i=j 的元素為 1，其餘為 0。若 A 為 m×n，正確尺寸為 IₘA=A 及 AIₙ=A。",
    "Iₙ is the n×n identity: entries with i=j are 1, all others 0. For m×n matrix A, the compatible identities are IₘA=A and AIₙ=A."
  ),
  "matrix-eigen-def": step(
    "A 為 n×n 方陣；v≠0 為特徵向量，λ 為特徵值。λ<0 會反向，λ=0 會映到零向量；「方向不變」應理解為仍在同一直線上。",
    "A is n×n; v≠0 is an eigenvector and λ its eigenvalue. λ<0 reverses orientation and λ=0 maps v to zero; ‘unchanged direction’ means staying on the same line."
  ),
  "matrix-char-poly": step(
    "A 為 n×n，I 為同階單位矩陣；λ 為待求純量，p(λ)=det(A−λI) 為多項式，其根滿足 p(λ)=0。tr(A) 是主對角線元素之和。",
    "A is n×n and I the identity of the same size. λ is an unknown scalar; p(λ)=det(A−λI) is a polynomial whose roots satisfy p(λ)=0. tr(A) is the sum of diagonal entries."
  ),
  "matrix-eigen-space": step(
    "λ 是 A 的一個特徵值；ker 表示零空間，span 表示所有線性組合。Eλ 包含零向量，但特徵向量本身必須非零。本例明確使用 A=[[4,1],[2,3]]、λ=5。",
    "λ is an eigenvalue of A; ker denotes the null space and span all linear combinations. Eλ includes zero, but eigenvectors must be nonzero. This example explicitly uses A=[[4,1],[2,3]] and λ=5."
  ),
  "ls-def": step(
    "在此概念的維度慣例中，n 是方程數、m 是未知數數目；A 為 n×m 係數矩陣，x 為 m×1 未知數向量，b 為 n×1 常數向量。",
    "In this concept’s dimension convention, n counts equations and m unknowns: A is n×m, x is the m×1 unknown vector, and b is the n×1 constant vector."
  ),
  "ls-augmented": step(
    "在此公式中，A 為 m×n；m 是方程數，n 是未知數數目。b 是 m×1 常數向量，豎線只分隔係數與常數，不是數值欄位。",
    "Here A is m×n: m counts equations and n unknowns. b is the m×1 constant vector; the vertical bar separates coefficients from constants and is not a numerical column."
  ),
  "ls-row-ops": step(
    "Rᵢ、Rⱼ 表示第 i、j 行。交換或相加時 i≠j；縮放行的 c 必須非零；加上另一行的 c 倍可用任何 c。完整增廣行須一同變換。",
    "Rᵢ and Rⱼ denote rows i and j. For swapping or adding another row, i≠j. Row scaling requires c≠0; adding c times another row allows any c. Transform the entire augmented row."
  ),
  "ls-gaussian": step(
    "A 是係數矩陣，b 是右側常數；U 是行階梯形係數矩陣，c 是同步變換後的右側常數，不是原來的 b。Rᵢ 表示第 i 行，主元是該非零行最左側非零元素。",
    "A contains coefficients and b right-hand constants; U is the echelon coefficient matrix and c the transformed constants, not the original b. Rᵢ denotes row i; a pivot is the first nonzero entry in a nonzero row."
  ),
  "ls-solution-types": step(
    "此處 n 是未知數數目；rank 是獨立行／列的數目。先比較 rank(A) 與 rank([A|b]) 判斷是否相容，再與 n 比較。t 是任意實數。下列解型是不同方程組的例子。",
    "Here n counts unknowns; rank counts independent rows/columns. Compare rank(A) with rank([A|b]) for consistency, then with n. t is any real number. The solution types below describe different systems."
  ),
  "ls-cramer": step(
    "A 為 n×n 且 det(A)≠0，b 為 n×1。Aᵢ 以 b 取代 A 的第 i 列（直欄／column），不是第 i 行；xᵢ 是第 i 個未知數。",
    "A is n×n with det(A)≠0 and b is n×1. Aᵢ replaces column i of A with b, not row i; xᵢ is the ith unknown."
  ),
  "vec-def": step(
    "v 是 n 維實向量，vᵢ 是第 i 個分量，n 是維度。|v| 表示歐氏長度，不是逐分量取絕對值；零向量沒有唯一方向。",
    "v is a real n-dimensional vector, vᵢ its ith component, and n the dimension. |v| is Euclidean length, not componentwise absolute value; zero has no unique direction."
  ),
  "vec-add": step(
    "a、b 必須同維度；aᵢ、bᵢ 是第 i 個分量。± 須整體一致選擇加法或減法，不能在不同分量任意混用。",
    "a and b must have the same dimension; aᵢ and bᵢ are their ith components. Choose + or − consistently across all components."
  ),
  "vec-magnitude": step(
    "v=(v₁,…,vₙ) 是實向量；|v| 為非負的歐氏長度。先把每個分量平方，全部相加，最後取非負平方根。",
    "v=(v₁,…,vₙ) is a real vector; |v| is its nonnegative Euclidean length. Square every component, add all squares, then take the nonnegative square root."
  ),
  "vec-dot": step(
    "a、b 為同維度實向量，aᵢ、bᵢ 為配對分量。點積結果是純量；θ 是非零向量間 0° 到 180° 的夾角。零向量的夾角未定義，即使點積為零。",
    "a and b are real vectors of the same dimension; aᵢ, bᵢ are paired components. The dot product is a scalar; θ is the angle from 0° to 180° between nonzero vectors. An angle involving zero is undefined even when the dot product is zero."
  ),
  "vec-cross": step(
    "a、b 為三維實向量；aₓ、aᵧ、a_z 等是座標分量。i、j、k 是 x、y、z 軸單位向量，θ 是非零向量夾角。平行時叉積為零，因此沒有唯一法向方向。",
    "a and b are real 3D vectors; aₓ, aᵧ, a_z etc. are coordinate components. i, j, k are unit vectors along the x, y, z axes, and θ is the angle between nonzero vectors. Parallel vectors have zero cross product and no unique normal direction."
  ),
  "vec-unit": step(
    "v≠0 是原向量，|v| 是其長度，v̂ 是同方向的單位向量。不能除以零向量的長度。本例的 0.6、0.8 是精確有限小數，分別等於 3/5、4/5，並非近似。",
    "v≠0 is the original vector, |v| its length, and v̂ the unit vector in the same direction. Do not divide by a zero length. The example’s 0.6 and 0.8 are exact terminating decimals, equal to 3/5 and 4/5, not approximations."
  ),
  "vec-angle": step(
    "a、b 必須非零且同維度；θ=arccos(…) 取 0 到 π 弧度，即 0° 到 180°。分母是兩向量長度的乘積；反餘弦的輸入是純量，不是向量。",
    "a and b must be nonzero and have the same dimension. θ=arccos(…) lies from 0 to π radians, or 0° to 180°. The denominator is the product of lengths; the inverse cosine takes a scalar, not a vector."
  ),
  "vec-plane-plane-angle": step(
    "Π₁、Π₂ 是三維平面；n₁、n₂≠0 是各平面的法向量，d₁、d₂ 是常數，r=(x,y,z) 是位置向量。φ 是兩平面的較小夾角，0≤φ≤π/2。法向量反向不改變平面，故點積取絕對值。",
    "Π₁ and Π₂ are 3D planes; n₁,n₂≠0 are their normals, d₁,d₂ constants, and r=(x,y,z) a position vector. φ is the smaller plane angle, 0≤φ≤π/2. Reversing a normal does not change its plane, so use the absolute dot product."
  ),
  "vec-line-plane-angle": step(
    "直線 r=p+tu 中，p 是直線上一點、t∈ℝ 是參數、u≠0 是方向向量。平面 n·r=d 中，n≠0 是法向量，d 是常數。α 是直線與平面的較小夾角，0≤α≤π/2，不是 u 與 n 的夾角。",
    "In the line r=p+tu, p is a point on the line, t∈ℝ a parameter, and u≠0 its direction. In the plane n·r=d, n≠0 is a normal and d a constant. α is the smaller line–plane angle, 0≤α≤π/2, not the angle between u and n."
  ),
};

const workedExamples: Record<string, BilingualStep[]> = {
  "matrix-def": [
    step(
      "數清行與列：共有 3 行、2 列。",
      "Count the rows and columns: 3 rows and 2 columns.",
      String.raw`A=\begin{bmatrix}1&2\\3&4\\5&6\end{bmatrix},\quad m=3,\ n=2`
    ),
    step(
      "用索引定位元素：第 2 行第 1 列為 3。",
      "Locate an entry by its indices: row 2, column 1 contains 3.",
      String.raw`a_{21}=3,\quad a_{32}=6`
    ),
  ],
  "matrix-add": [
    step(
      "確認兩矩陣同為 2×2，再把同位置元素配對。",
      "Both matrices are 2×2; pair entries in matching positions.",
      String.raw`A+B=\begin{bmatrix}1+5&2+6\\3+7&4+8\end{bmatrix}`
    ),
    step(
      "各位置獨立相加，得到精確結果。",
      "Add each pair independently to obtain the exact result.",
      String.raw`A+B=\begin{bmatrix}6&8\\10&12\end{bmatrix}`
    ),
  ],
  "matrix-mul": [
    step(
      "兩矩陣皆為 2×2；第 1 行分別與 B 的兩列作點積。",
      "Both matrices are 2×2; dot row 1 with each column of B.",
      String.raw`c_{11}=1\cdot5+2\cdot7=19,\quad c_{12}=1\cdot6+2\cdot8=22`
    ),
    step(
      "用 A 第 2 行計算結果第 2 行。",
      "Use row 2 of A to compute row 2 of the product.",
      String.raw`c_{21}=3\cdot5+4\cdot7=43,\quad c_{22}=3\cdot6+4\cdot8=50`
    ),
    step(
      "將四個點積放回對應位置。",
      "Place the four dot products in their corresponding positions.",
      String.raw`AB=\begin{bmatrix}19&22\\43&50\end{bmatrix}`
    ),
  ],
  "matrix-transpose": [
    step(
      "原矩陣有 2 行、3 列；原第 1 行變成轉置第 1 列。",
      "The original is 2×3; its first row becomes the first column of the transpose.",
      String.raw`A=\begin{bmatrix}1&2&3\\4&5&6\end{bmatrix},\quad (A^T)_{11}=1,\ (A^T)_{21}=2,\ (A^T)_{31}=3`
    ),
    step(
      "原第 2 行變成第 2 列，完成 3×2 矩陣。",
      "The second row becomes the second column, giving a 3×2 matrix.",
      String.raw`A^T=\begin{bmatrix}1&4\\2&5\\3&6\end{bmatrix}`
    ),
  ],
  "matrix-det": [
    step(
      "讀取 2×2 矩陣四個元素，使用 ad−bc。",
      "Read the four entries of the 2×2 matrix and use ad−bc.",
      String.raw`a=2,\ b=1,\ c=5,\ d=3,\quad \det(A)=2\cdot3-1\cdot5`
    ),
    step(
      "分別計算乘積再相減；結果非零，所以 A 可逆。",
      "Evaluate the products and subtract; the nonzero determinant means A is invertible.",
      String.raw`\det(A)=6-5=1\ne0`
    ),
  ],
  "matrix-inverse": [
    step(
      "先檢查可逆條件，並建立 [A|I]。",
      "Check invertibility, then form [A|I].",
      String.raw`\det(A)=2\cdot3-1\cdot5=1,\quad \left[\begin{array}{cc|cc}2&1&1&0\\5&3&0&1\end{array}\right]`
    ),
    step(
      "R₁ ← R₁/2：把首個主元化為 1，左右同時縮放。",
      "R₁ ← R₁/2: make the first pivot 1, scaling both halves.",
      String.raw`\left[\begin{array}{cc|cc}1&\frac12&\frac12&0\\5&3&0&1\end{array}\right]`
    ),
    step(
      "R₂ ← R₂−5R₁：消去首個主元下方的 5。",
      "R₂ ← R₂−5R₁: eliminate the 5 below the first pivot.",
      String.raw`\left[\begin{array}{cc|cc}1&\frac12&\frac12&0\\0&\frac12&-\frac52&1\end{array}\right]`
    ),
    step(
      "R₂ ← 2R₂：把第二個主元化為 1。",
      "R₂ ← 2R₂: make the second pivot 1.",
      String.raw`\left[\begin{array}{cc|cc}1&\frac12&\frac12&0\\0&1&-5&2\end{array}\right]`
    ),
    step(
      "R₁ ← R₁−R₂/2：左側成為 I，讀取右側逆矩陣。",
      "R₁ ← R₁−R₂/2: the left half becomes I; read the inverse on the right.",
      String.raw`\left[\begin{array}{cc|cc}1&0&3&-1\\0&1&-5&2\end{array}\right],\quad A^{-1}=\begin{bmatrix}3&-1\\-5&2\end{bmatrix}`
    ),
    step(
      "以乘回原矩陣驗證，不靠數值容差判斷。",
      "Verify by multiplying with the original, without a numerical tolerance.",
      String.raw`\begin{bmatrix}2&1\\5&3\end{bmatrix}\begin{bmatrix}3&-1\\-5&2\end{bmatrix}=\begin{bmatrix}6-5&-2+2\\15-15&-5+6\end{bmatrix}=I_2`
    ),
  ],
  "matrix-identity": [
    step(
      "n=2 時在兩個主對角位置放 1，其餘放 0。",
      "For n=2, put 1 in the two diagonal positions and 0 elsewhere.",
      String.raw`I_2=\begin{bmatrix}1&0\\0&1\end{bmatrix}`
    ),
    step(
      "n=3 時用同一規則建立 3×3 單位矩陣。",
      "Apply the same rule for n=3 to build a 3×3 identity.",
      String.raw`I_3=\begin{bmatrix}1&0&0\\0&1&0\\0&0&1\end{bmatrix}`
    ),
  ],
  "matrix-eigen-def": [
    step(
      "本例指定 A，先檢驗非零向量 v₁。",
      "Specify A and verify the nonzero vector v₁.",
      String.raw`A=\begin{bmatrix}2&1\\1&2\end{bmatrix},\quad A\begin{bmatrix}1\\1\end{bmatrix}=\begin{bmatrix}3\\3\end{bmatrix}=3\begin{bmatrix}1\\1\end{bmatrix}`
    ),
    step(
      "再檢驗 v₂，讀取乘法中的縮放因子。",
      "Verify v₂ and read its scale factor from the product.",
      String.raw`A\begin{bmatrix}1\\-1\end{bmatrix}=\begin{bmatrix}1\\-1\end{bmatrix}=1\begin{bmatrix}1\\-1\end{bmatrix}`
    ),
  ],
  "matrix-char-poly": [
    step(
      "指定 A，在對角線減去 λ。",
      "Specify A and subtract λ from each diagonal entry.",
      String.raw`A=\begin{bmatrix}4&1\\2&3\end{bmatrix},\quad A-\lambda I=\begin{bmatrix}4-\lambda&1\\2&3-\lambda\end{bmatrix}`
    ),
    step(
      "用 2×2 行列式公式並合併同類項。",
      "Use the 2×2 determinant formula and collect terms.",
      String.raw`p(\lambda)=(4-\lambda)(3-\lambda)-2=\lambda^2-7\lambda+10`
    ),
    step(
      "因式分解後令每個因子為零，得到精確特徵值。",
      "Factor and set each factor to zero to obtain exact eigenvalues.",
      String.raw`(\lambda-5)(\lambda-2)=0\quad\Longrightarrow\quad \lambda=5\ \text{or}\ \lambda=2`
    ),
  ],
  "matrix-eigen-space": [
    step(
      "明確沿用特徵多項式例子的 A，代入 λ=5。",
      "Explicitly use A from the characteristic-polynomial example and substitute λ=5.",
      String.raw`A=\begin{bmatrix}4&1\\2&3\end{bmatrix},\quad A-5I=\begin{bmatrix}-1&1\\2&-2\end{bmatrix}`
    ),
    step(
      "兩行給出同一條約束 v₂=v₁，留一個自由參數 t。",
      "Both rows impose the same constraint v₂=v₁; leave one free parameter t.",
      String.raw`-v_1+v_2=0,\quad 2v_1-2v_2=0\quad\Longrightarrow\quad \mathbf v=t\begin{bmatrix}1\\1\end{bmatrix},\ t\in\mathbb R`
    ),
    step(
      "所有 t 組成特徵空間；t≠0 才是特徵向量。",
      "All t form the eigenspace; only t≠0 gives an eigenvector.",
      String.raw`E_5=\operatorname{span}\left\{\begin{bmatrix}1\\1\end{bmatrix}\right\}`
    ),
  ],
  "ls-def": [
    step(
      "依未知數順序 x、y 收集每一條方程的係數和常數。",
      "Collect coefficients and constants from each equation in the variable order x, y.",
      String.raw`A=\begin{bmatrix}2&1\\1&3\end{bmatrix},\quad \mathbf x=\begin{bmatrix}x\\y\end{bmatrix},\quad \mathbf b=\begin{bmatrix}5\\10\end{bmatrix}`
    ),
    step(
      "按行乘向量，還原兩條原方程。",
      "Multiply each row by the unknown vector to recover both equations.",
      String.raw`A\mathbf x=\begin{bmatrix}2x+y\\x+3y\end{bmatrix}=\begin{bmatrix}5\\10\end{bmatrix}`
    ),
  ],
  "ls-augmented": [
    step(
      "從 Ax=b 取出係數矩陣與常數向量，維持相同行順序。",
      "Extract A and b from Ax=b, keeping the same row order.",
      String.raw`A=\begin{bmatrix}2&1\\1&3\end{bmatrix},\quad \mathbf b=\begin{bmatrix}5\\10\end{bmatrix}`
    ),
    step(
      "把每行的常數接在係數右方；豎線是分隔標記。",
      "Append each row’s constant to its coefficients; the bar marks the partition.",
      String.raw`[A\mid\mathbf b]=\left[\begin{array}{cc|c}2&1&5\\1&3&10\end{array}\right]`
    ),
  ],
  "ls-row-ops": [
    step(
      "交換行：R₁ ↔ R₂，兩條完整方程對調。這是第一種操作的例子，不是連續計算。",
      "Swap rows: R₁ ↔ R₂ exchanges two whole equations. This illustrates the first operation, not a sequential calculation.",
      String.raw`R_1\leftrightarrow R_2`
    ),
    step(
      "縮放行：R₂ ← 3R₂，3≠0，包含右側常數。",
      "Scale a row: R₂ ← 3R₂, with 3≠0, including its right-hand constant.",
      String.raw`R_2\leftarrow3R_2`
    ),
    step(
      "加上另一行的倍數：R₃ ← R₃−2R₁；來源行 R₁ 保持不變。",
      "Add a multiple of another row: R₃ ← R₃−2R₁; source row R₁ remains unchanged.",
      String.raw`R_3\leftarrow R_3-2R_1`
    ),
  ],
  "ls-gaussian": [
    step(
      "寫出本例增廣矩陣，選第 1 行的 2 為首個主元。",
      "Write the augmented matrix and choose the 2 in row 1 as the first pivot.",
      String.raw`\left[\begin{array}{cc|c}2&1&5\\1&3&10\end{array}\right]`
    ),
    step(
      "R₂ ← R₂−R₁/2：同時更新係數與常數。",
      "R₂ ← R₂−R₁/2: update coefficients and constants together.",
      String.raw`1-\tfrac12\cdot2=0,\quad 3-\tfrac12\cdot1=\tfrac52,\quad10-\tfrac12\cdot5=\tfrac{15}2`
    ),
    step(
      "得到 REF；第二行是 (5/2)y=15/2。",
      "The result is REF; row 2 is (5/2)y=15/2.",
      String.raw`\left[\begin{array}{cc|c}2&1&5\\0&\frac52&\frac{15}2\end{array}\right]`
    ),
    step(
      "先回代求 y，再代回第一行求 x；全部為精確分數運算。",
      "Solve for y first, then substitute in row 1 to find x; all arithmetic is exact.",
      String.raw`y=\frac{15/2}{5/2}=3,\quad x=\frac{5-y}{2}=1`
    ),
  ],
  "ls-solution-types": [
    step(
      "唯一解的條件：相容且每個未知數都有主元；本類型的例子是 x=1、y=3。",
      "Unique solution: consistent with a pivot for every unknown; the example for this type is x=1, y=3.",
      String.raw`\operatorname{rank}(A)=\operatorname{rank}([A\mid b])=n,\quad (x,y)=(1,3)`
    ),
    step(
      "無限多解的條件：相容但存在自由變數；另一個系統的例子是 x+y=2。",
      "Infinitely many solutions: consistent with free variables; a different system is illustrated by x+y=2.",
      String.raw`\operatorname{rank}(A)=\operatorname{rank}([A\mid b])<n,\quad (x,y)=(t,2-t),\ t\in\mathbb R`
    ),
    step(
      "無解的條件：增廣矩陣秩較高，出現不可能成立的等式。",
      "No solution: the augmented rank is larger, producing an impossible equation.",
      String.raw`\operatorname{rank}(A)<\operatorname{rank}([A\mid b]),\quad 0=1`
    ),
  ],
  "ls-cramer": [
    step(
      "本例給定三個行列式；先確認 det(A)=5≠0。",
      "The example supplies three determinants; first check det(A)=5≠0.",
      String.raw`\det(A)=5,\quad\det(A_1)=5,\quad\det(A_2)=15`
    ),
    step(
      "第 1 個未知數使用替換第 1 列所得的行列式。",
      "For the first unknown, use the determinant with column 1 replaced.",
      String.raw`x_1=\frac{\det(A_1)}{\det(A)}=\frac55=1`
    ),
    step(
      "第 2 個未知數使用替換第 2 列所得的行列式。",
      "For the second unknown, use the determinant with column 2 replaced.",
      String.raw`x_2=\frac{\det(A_2)}{\det(A)}=\frac{15}5=3`
    ),
  ],
  "vec-def": [
    step(
      "本例 v 的兩個分量是 3 和 4，因此是二維向量。",
      "The two components of v are 3 and 4, so it is two-dimensional.",
      String.raw`\mathbf v=\begin{pmatrix}3\\4\end{pmatrix},\quad v_1=3,\ v_2=4`
    ),
    step(
      "用畢氏定理計算其幾何長度。",
      "Use the Pythagorean theorem to calculate its geometric length.",
      String.raw`|\mathbf v|=\sqrt{3^2+4^2}=\sqrt{25}=5`
    ),
  ],
  "vec-add": [
    step(
      "配對兩個二維向量的相同分量。",
      "Pair matching components of the two 2D vectors.",
      String.raw`\mathbf a+\mathbf b=\begin{pmatrix}3+1\\1+4\end{pmatrix}`
    ),
    step(
      "分別相加得到結果的兩個分量。",
      "Add independently to get the two components of the result.",
      String.raw`\mathbf a+\mathbf b=\begin{pmatrix}4\\5\end{pmatrix}`
    ),
  ],
  "vec-magnitude": [
    step(
      "將 v=(3,4) 的各分量平方。",
      "Square the components of v=(3,4).",
      String.raw`v_1^2=3^2=9,\quad v_2^2=4^2=16`
    ),
    step(
      "加總後取非負平方根，不取 −5。",
      "Sum the squares and take the nonnegative root, not −5.",
      String.raw`|\mathbf v|=\sqrt{9+16}=\sqrt{25}=5`
    ),
  ],
  "vec-dot": [
    step(
      "將 (1,2,3) 與 (4,5,6) 的對應分量相乘。",
      "Multiply corresponding components of (1,2,3) and (4,5,6).",
      String.raw`1\cdot4=4,\quad2\cdot5=10,\quad3\cdot6=18`
    ),
    step(
      "把三個乘積相加；32 是純量，不是向量。",
      "Add the three products; 32 is a scalar, not a vector.",
      String.raw`\mathbf a\cdot\mathbf b=4+10+18=32`
    ),
  ],
  "vec-cross": [
    step(
      "指定 a=(1,0,0)、b=(0,1,0)，按右手次序計算 a×b。",
      "Use a=(1,0,0), b=(0,1,0), and compute a×b in right-hand order.",
      String.raw`\mathbf a\times\mathbf b=\begin{pmatrix}a_yb_z-a_zb_y\\a_zb_x-a_xb_z\\a_xb_y-a_yb_x\end{pmatrix}`
    ),
    step(
      "逐分量代入；z 分量為 1，其餘為 0。",
      "Substitute component by component; the z component is 1, the others 0.",
      String.raw`\mathbf a\times\mathbf b=\begin{pmatrix}0\cdot0-0\cdot1\\0\cdot0-1\cdot0\\1\cdot1-0\cdot0\end{pmatrix}=\begin{pmatrix}0\\0\\1\end{pmatrix}`
    ),
  ],
  "vec-unit": [
    step(
      "本例 v=(3,4) 的長度為 5，確認非零。",
      "For v=(3,4), the length is 5 and is nonzero.",
      String.raw`|\mathbf v|=\sqrt{3^2+4^2}=5`
    ),
    step(
      "每個分量都除以 5，保留精確分數。",
      "Divide every component by 5, keeping exact fractions.",
      String.raw`\hat{\mathbf v}=\frac15\begin{pmatrix}3\\4\end{pmatrix}=\begin{pmatrix}\frac35\\\frac45\end{pmatrix}`
    ),
    step(
      "平方和為 1，驗證長度恰為 1；有限小數 0.6、0.8 也完全精確。",
      "The sum of squares is 1, verifying unit length exactly; the terminating decimals 0.6 and 0.8 are exact too.",
      String.raw`|\hat{\mathbf v}|=\sqrt{\frac9{25}+\frac{16}{25}}=1`
    ),
  ],
  "vec-angle": [
    step(
      "本例 a=(1,0)、b=(1,1)；先求點積與兩個非零長度。",
      "Use a=(1,0), b=(1,1); compute their dot product and nonzero lengths.",
      String.raw`\mathbf a\cdot\mathbf b=1,\quad|\mathbf a|=1,\quad|\mathbf b|=\sqrt2`
    ),
    step(
      "代入餘弦比值，保留根式而非小數近似。",
      "Substitute into the cosine ratio, retaining a radical rather than a decimal approximation.",
      String.raw`\cos\theta=\frac1{\sqrt2}=\frac{\sqrt2}{2}`
    ),
    step(
      "辨識精確特殊角，弧度與角度皆列出。",
      "Recognize the exact special angle, shown in radians and degrees.",
      String.raw`\theta=\arccos\frac{\sqrt2}{2}=\frac\pi4=45^\circ`
    ),
  ],
  "vec-plane-plane-angle": [
    step(
      "從平面方程的係數讀取兩個非零法向量。",
      "Read the nonzero normals from the coefficients of the plane equations.",
      String.raw`\Pi_1:x=0,\quad\Pi_2:x+y=0,\quad\mathbf n_1=(1,0,0),\ \mathbf n_2=(1,1,0)`
    ),
    step(
      "平面較小夾角等於法向量較小夾角；用絕對值排除法向量反向的影響。",
      "The smaller plane angle equals the smaller normal angle; absolute value removes dependence on normal orientation.",
      String.raw`|\mathbf n_1\cdot\mathbf n_2|=1,\quad |\mathbf n_1|=1,\quad |\mathbf n_2|=\sqrt2`
    ),
    step(
      "代入並化為精確特殊角，不需要數值近似。",
      "Substitute and simplify to an exact special angle, without numerical approximation.",
      String.raw`\varphi=\arccos\frac1{\sqrt2}=\frac\pi4=45^\circ`
    ),
  ],
  "vec-line-plane-angle": [
    step(
      "指定直線與平面；從直線取方向向量，從平面取法向量。",
      "Specify the line and plane; take the line’s direction and the plane’s normal.",
      String.raw`\mathbf r=t(1,0,1),\quad\Pi:z=0,\quad\mathbf u=(1,0,1),\ \mathbf n=(0,0,1)`
    ),
    step(
      "設 β 是 u 與 n 的較小夾角；直線與平面夾角是其餘角。",
      "Let β be the smaller angle between u and n; the line–plane angle is its complement.",
      String.raw`\alpha=\frac\pi2-\beta,\quad\sin\alpha=\cos\beta=\frac{|\mathbf u\cdot\mathbf n|}{|\mathbf u||\mathbf n|}`
    ),
    step(
      "點積為 1、長度為 √2 和 1，得到精確角度。",
      "The dot product is 1 and lengths are √2 and 1, giving the exact angle.",
      String.raw`\alpha=\arcsin\frac1{\sqrt2}=\frac\pi4=45^\circ`
    ),
  ],
};

export const spatialKnowledgeItems: KnowledgeItemData[] = [
  {
    id: "vec-plane-plane-angle",
    titleZh: "兩平面的夾角",
    titleEn: "Angle Between Two Planes",
    formula: String.raw`\varphi=\arccos\left(\frac{|\mathbf n_1\cdot\mathbf n_2|}{|\mathbf n_1||\mathbf n_2|}\right),\quad0\le\varphi\le\frac\pi2`,
    descriptionZh:
      "平面 Π₁：n₁·r=d₁、Π₂：n₂·r=d₂ 的較小夾角，由非零法向量求得。平移平面不改變角度，因此 d₁、d₂ 不出現在角度公式中。平行時 φ=0；法向量正交時 φ=90°。",
    descriptionEn:
      "For planes Π₁: n₁·r=d₁ and Π₂: n₂·r=d₂, find the smaller angle using their nonzero normals. Translating a plane does not change the angle, so d₁,d₂ do not enter the angle formula. Parallel planes have φ=0; orthogonal normals give φ=90°.",
    exampleZh: String.raw`\Pi_1:x=0,\quad\Pi_2:x+y=0\quad\Longrightarrow\quad\varphi=\frac\pi4=45^\circ`,
    exampleEn: String.raw`\Pi_1:x=0,\quad\Pi_2:x+y=0\quad\Longrightarrow\quad\varphi=\frac\pi4=45^\circ`,
    tags: ["plane-plane", "normal", "spatial", "平面", "法向量", "空間"],
  },
  {
    id: "vec-line-plane-angle",
    titleZh: "直線與平面的夾角",
    titleEn: "Angle Between a Line and a Plane",
    formula: String.raw`\alpha=\arcsin\left(\frac{|\mathbf u\cdot\mathbf n|}{|\mathbf u||\mathbf n|}\right),\quad0\le\alpha\le\frac\pi2`,
    descriptionZh:
      "直線 r=p+tu 與平面 n·r=d 的較小夾角，是方向向量 u 與法向量 n 的較小夾角的餘角，因此用反正弦。u·n=0 時直線平行於或位於平面，α=0；u 與 n 平行時直線垂直平面，α=90°。",
    descriptionEn:
      "The smaller angle between line r=p+tu and plane n·r=d complements the smaller angle between direction u and normal n, so use inverse sine. If u·n=0 the line is parallel to or contained in the plane, giving α=0; u parallel to n means the line is perpendicular to the plane, giving α=90°.",
    exampleZh: String.raw`\mathbf r=t(1,0,1),\quad\Pi:z=0\quad\Longrightarrow\quad\alpha=\frac\pi4=45^\circ`,
    exampleEn: String.raw`\mathbf r=t(1,0,1),\quad\Pi:z=0\quad\Longrightarrow\quad\alpha=\frac\pi4=45^\circ`,
    tags: [
      "line-plane",
      "normal",
      "direction",
      "spatial",
      "直線",
      "平面",
      "法向量",
      "方向向量",
      "空間",
    ],
  },
];

export const phase20KnowledgeTopics: KnowledgeTopicData[] = knowledgeTopics.map(
  topic =>
    topic.slug === "vector"
      ? { ...topic, items: [...topic.items, ...spatialKnowledgeItems] }
      : topic
);

function localize(
  steps: BilingualStep[],
  lang: KnowledgeLanguage
): KnowledgeLessonStep[] {
  return steps.map(({ zh, en, latex }) => ({
    description: lang === "zh" ? zh : en,
    ...(latex ? { latex } : {}),
  }));
}

export function buildKnowledgeLesson(
  item: KnowledgeItemData,
  lang: KnowledgeLanguage
): {
  conceptSteps: KnowledgeLessonStep[];
  exampleSteps: KnowledgeLessonStep[];
} {
  const context = contexts[item.id];
  const description = lang === "zh" ? item.descriptionZh : item.descriptionEn;
  const example = lang === "zh" ? item.exampleZh : item.exampleEn;
  const conceptSteps = context ? localize([context], lang) : [];
  if (item.formula) {
    conceptSteps.push({
      description:
        lang === "zh"
          ? "定義／公式：先確認上一步的變數與適用條件。"
          : "Definition / formula: check the variables and conditions in the previous step.",
      latex: item.formula,
    });
  }
  conceptSteps.push({ description });
  const exampleSteps = localize(workedExamples[item.id] ?? [], lang);
  if (example) {
    exampleSteps.push({
      description:
        lang === "zh"
          ? "原例摘要：回看原有例子，與上述步驟對照。"
          : "Original example summary: compare the existing example with the steps above.",
      latex: example,
    });
  }
  return { conceptSteps, exampleSteps };
}

export function matchesKnowledgeQuery(
  item: KnowledgeItemData,
  query: string
): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  const context = contexts[item.id];
  return [
    item.titleZh,
    item.titleEn,
    item.descriptionZh,
    item.descriptionEn,
    ...(item.tags ?? []),
    context?.zh ?? "",
    context?.en ?? "",
  ].some(text => text.toLocaleLowerCase().includes(q));
}
