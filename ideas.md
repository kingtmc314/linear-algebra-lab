# Linear Algebra Lab — 設計方案構思

## 方案 A：學術精密風 (Academic Precision)

<response>
<text>
**Design Movement:** Swiss International Typographic Style + Scientific Instrument Aesthetic

**Core Principles:**
1. 精確的格線系統，每個元素都有明確的視覺重量
2. 數學符號與排版融為一體，LaTeX 風格的公式展示
3. 高對比度的黑白主調，以單一強調色點綴
4. 資訊密度高但不雜亂，留白有節制地使用

**Color Philosophy:**
- 主色：深海軍藍 `#0F2044`（知識與深度）
- 背景：冷白 `#F7F8FC`（清晰、學術感）
- 強調：電氣藍 `#2563EB`（互動與計算結果）
- 輔助：淺灰 `#E5E7EB`（分隔線與邊框）

**Layout Paradigm:**
左側固定導航欄（sidebar），右側主內容區。頂部有語言切換器。矩陣輸入區採用格線對齊，結果區域有清晰的視覺層次。

**Signature Elements:**
1. 矩陣括號以 SVG 繪製，有輕微動畫效果
2. 計算步驟以手風琴展開，每步驟有序號標記
3. 背景有極淡的方格紙紋理

**Interaction Philosophy:**
每次計算後，結果以「書寫」動畫逐步顯示，模擬老師在黑板上推導的感覺。

**Animation:**
- 矩陣元素輸入時有輕微 scale 動畫（100ms）
- 結果出現時從上至下逐行淡入（stagger 50ms/行）
- 頁面切換：水平滑動（200ms ease-out）

**Typography System:**
- 標題：`IBM Plex Serif` Bold — 學術、有份量
- 正文/UI：`IBM Plex Sans` Regular/Medium
- 數學公式：`KaTeX` 渲染
- 程式碼/矩陣數字：`IBM Plex Mono`
</text>
<probability>0.08</probability>
</response>

---

## 方案 B：現代教學工具風 (Modern EdTech)

<response>
<text>
**Design Movement:** Bauhaus Functionalism + Contemporary EdTech (Notion/Linear 風格)

**Core Principles:**
1. 功能優先，每個 UI 元素都有明確目的
2. 模組化卡片系統，計算器、說明、結果各佔獨立區塊
3. 淺色主題，高可讀性，適合長時間學習使用
4. 雙語切換無縫，語言標籤清晰可見

**Color Philosophy:**
- 背景：溫暖白 `#FAFAF8`（舒適、不刺眼）
- 主色：森林綠 `#16A34A`（成長、正確答案的正向感）
- 強調：琥珀橙 `#D97706`（警告、注意步驟）
- 文字：深炭灰 `#1C1917`

**Layout Paradigm:**
頂部水平導航（三大模組），內容區左右分欄：左側輸入區，右側即時結果與步驟解說。手機版自動堆疊。

**Signature Elements:**
1. 矩陣輸入格有圓角邊框，focus 時有綠色光暈
2. 結果區域有「✓ 計算完成」的成功狀態指示
3. 步驟說明卡片有左側彩色邊條（不同顏色代表不同類型的操作）

**Interaction Philosophy:**
即時反饋，輸入數字後自動更新預覽。錯誤輸入有紅色提示，正確計算有綠色確認。

**Animation:**
- 輸入框 focus：邊框顏色過渡（150ms）
- 結果卡片：從底部滑入（200ms cubic-bezier(0.23,1,0.32,1)）
- 語言切換：文字淡出淡入（100ms）

**Typography System:**
- 標題：`Outfit` Bold/ExtraBold
- 正文：`Outfit` Regular
- 數字/矩陣：`JetBrains Mono`
- 公式：KaTeX
</text>
<probability>0.07</probability>
</response>

---

## 方案 C：黑板教室風 (Chalkboard Classroom) ← 選定

<response>
<text>
**Design Movement:** Neo-Brutalism + Academic Chalkboard Aesthetic

**Core Principles:**
1. 深色背景模擬黑板，白色/淺色文字如粉筆書寫
2. 粗邊框、強陰影，元素有實體感而非浮動感
3. 數學公式以 KaTeX 渲染，有「手寫」質感的字體輔助
4. 功能區塊以黑板分區方式組織，清晰直觀

**Color Philosophy:**
- 背景：深板岩綠 `#1A2E1A`（黑板的深綠色）
- 主面板：`#243324`（稍淺的黑板色）
- 粉筆白：`#F0EDE8`（主要文字）
- 黃色粉筆：`#F5D76E`（強調、標題）
- 紅色粉筆：`#E57373`（錯誤、行列式為零）
- 藍色粉筆：`#7EC8E3`（向量、互動元素）

**Layout Paradigm:**
全寬頂部標題欄，左側垂直標籤導航（三模組），右側主工作區。工作區分為「輸入黑板」和「結果黑板」兩塊。

**Signature Elements:**
1. 矩陣以粉筆風格的方括號包圍，數字用等寬字體
2. 背景有極淡的黑板紋理（noise/grain）
3. 計算步驟如老師板書，逐步顯示

**Interaction Philosophy:**
按下「計算」如老師開始推導，步驟一步步出現。向量視覺化如在黑板上繪圖。

**Animation:**
- 計算結果：逐行「書寫」動畫（stagger 80ms）
- 向量箭頭：SVG stroke-dasharray 繪製動畫
- 模組切換：交叉淡入（150ms）

**Typography System:**
- 標題：`Playfair Display` Bold（優雅學術感）
- UI 文字：`Source Sans 3` Regular/SemiBold
- 數字/矩陣：`Source Code Pro` — 清晰等寬
- 公式：KaTeX with custom CSS
</text>
<probability>0.09</probability>
</response>
