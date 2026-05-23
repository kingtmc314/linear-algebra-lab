# Linear Algebra Lab — TODO

## Phase 1: Upgrade & Infrastructure
- [x] Upgrade to full-stack (web-db-user) with database, auth, backend
- [x] Update drizzle schema: knowledge_topics, knowledge_items, teacher_documents tables
- [x] Push database migrations (pnpm db:push)
- [x] Update vite.config.ts to remove hardcoded base path (conflicts resolved)

## Phase 2: Detailed Step-by-Step Calculations
- [x] Enhance matrixMath.ts: each operation returns detailed derivation steps (e.g. row operations with LaTeX)
- [x] Enhance linearSystem.ts: Gaussian elimination shows each row operation with before/after matrix state
- [x] Enhance vectorMath.ts: each operation shows component-wise calculation steps
- [x] Update StepDisplay.tsx: render each sub-step with LaTeX formula and result
- [x] Update MatrixPage.tsx: pass detailed steps to StepDisplay
- [x] Update LinearSystemPage.tsx: pass detailed steps to StepDisplay
- [x] Update VectorPage.tsx: pass detailed steps to StepDisplay

## Phase 3: Knowledge Base (知識點庫)
- [x] Create KnowledgePage.tsx: topic cards with LaTeX formulas, examples, notes
- [x] Add knowledge data: matrix topics (definition, operations, determinant, inverse)
- [x] Add knowledge data: linear system topics (Gaussian elimination, solution types)
- [x] Add knowledge data: vector topics (2D/3D, dot product, cross product, angle)
- [x] Add bilingual labels for all knowledge items
- [x] Register /knowledge route in App.tsx

## Phase 4: Teacher Upload System (教師上載功能)
- [x] Create teacher_documents table in drizzle schema
- [x] Add tRPC procedures: uploadDocument (admin only), listDocuments (public), deleteDocument (admin only)
- [x] Create DocumentsPage.tsx: file upload UI (admin) + public read-only view
- [x] Add /documents route in App.tsx
- [x] Implement file upload via storagePut (S3)
- [x] Add admin-only guard: only owner (teacher) can upload/delete

## Phase 5: App Integration & UI Polish
- [x] Update App.tsx: integrate all new routes, preserve existing layout
- [x] Update LanguageContext.tsx: add translations for new pages (navKnowledge, navDocuments)
- [x] Add navigation items for Knowledge and Documents in sidebar
- [x] Teacher login/logout in sidebar with role display
- [x] TypeScript errors resolved, tests passing

## Phase 5 (continued)
- [x] Write vitest tests for documents router (upload/delete auth guards, public list)
- [x] All 6 tests passing

## Phase 6: GitHub Sync
- [x] Update GitHub repository with new code
- [x] Save checkpoint (v2.0.0, version: d4e4ee2f)

## Phase 7: 特徵值/特徵向量功能
- [x] 實作 eigenMath.ts：特徵多項式展開、求根、特徵向量計算（含詳細步驟）
- [x] 建立 EigenPage.tsx 頁面（2×2 及 3×3 矩陣支援）
- [x] 更新 App.tsx 路由及側邊欄導航
- [x] 更新 LanguageContext.tsx 加入中英翻譯
- [x] 更新知識點庫加入特徵值知識點（3 個新條目）
- [x] 寫 eigenMath 單元測試（14 個測試，全部通過）
- [x] 所有 20 個測試通過

## Phase 8: 四項新功能

### 8a: 核心數學庫修復
- [x] matrixMath.ts：逆矩陣計算前先計算行列式，若 det=0 則返回奇異矩陣錯誤（中英雙語）
- [x] linearSystem.ts：高斯消去法完成後識別自由變量，以 k, k₁, k₂ 表示通解
- [x] vectorMath.ts：叉積（Cross Product）計算已實作，含逐步推導

### 8b: 練習題生成器
- [x] 建立 practiceGenerator.ts：矩陣、聯立方程、向量、特徵值各模組的隨機題目生成函數
- [x] 包含答案比對函數（浮點誤差容忍 tolerance = 1e-6）
- [x] 更新 LanguageContext.tsx：加入練習題相關翻譯鍵（practiceMode, calcMode, newQuestion, checkAnswer 等）

### 8c: 各頁面練習題 UI
- [x] MatrixPage.tsx：新增「練習模式」Tab，隨機出題 + 學生輸入 + 即時核對
- [x] LinearSystemPage.tsx：新增練習模式，並顯示 k 通解
- [x] VectorPage.tsx：新增練習模式，含叉積題型
- [x] EigenPage.tsx：新增練習模式，特徵值題型

### 8d: 測試與部署
- [x] 所有測試通過（20 tests）
- [x] 儲存檢查點並發佈

## Phase 9: 三項新功能擴充

- [x] 矩陣計算支援兩個或以上矩陣（多矩陣鏈式運算 A × B × C × ...）
- [x] 新增可對角線化矩陣 n 次方計算（diagonalization + A^n，含詳細步驟）
- [x] 所有矩陣 n 次方結果以精確值表示（整數/分數/指數形式，不用近似小數）
- [x] 更新 LanguageContext.tsx：加入多矩陣及 n 次方相關翻譯
- [x] 更新 MatrixPage.tsx：多矩陣輸入 UI（動態新增/刪除矩陣）
- [x] 新增 MatrixPowerPage.tsx：可對角線化矩陣 n 次方計算頁面
- [x] 更新 App.tsx 路由及側邊欄

## Phase 10: 三項修復

- [x] 修復 MatrixPage.tsx 矩陣維度選擇器 bug（行數/列數下拉選單無法切換至其他數字）
- [x] LinearSystemPage.tsx：方陣時雙欄顯示高斯消元法及逆矩陣法
- [x] VectorPage.tsx 3D 模式：新增四心計算（重心 Centroid、內心 Incenter、外心 Circumcenter、垂心 Orthocenter）
- [x] 所有測試通過，儲存檢查點

## Phase 11: 移除教學資源/教師登入，部署至 GitHub Pages

- [x] 刪除 DocumentsPage.tsx 及相關路由
- [x] 移除 App.tsx 中教師登入、navDocuments 側邊欄項目
- [x] 移除 DashboardLayout 中教師登入/登出 UI
- [x] 移除 tRPC/QueryClient providers，轉為純靜態前端
- [x] 調整 vite.config.ts：設定 GITHUB_PAGES=true 時 base='/linear-algebra-lab/'
- [x] 更新 deploy.yml：使用 GITHUB_PAGES env var + 複製 404.html
- [x] 推送至 GitHub main 分支（源碼）
- [x] 直接編譯並推送至 gh-pages 分支（靜態檔案）
- [x] GitHub Pages 部署建置中
- [x] 儲存檢查點

## Phase 12: 向量計算頁面互動式 Plotly 視覺化

- [x] 安裝 plotly.js-dist-min 及 @types/plotly.js
- [x] 建立 VectorPlot2D.tsx：Plotly 互動 2D 圖表（向量箭頭、平行四邊形、角度弧線、座標標籤、懸停提示）
- [x] 建立 VectorPlot3D.tsx：Plotly 互動 3D 圖表（3D 箭頭、叉積平行四邊形面積、右手定則標示、可旋轉縮放）
- [x] 更新 VectorPage.tsx：以新 Plotly 元件取代舊 Canvas/SVG 視覺化
- [x] 每個運算新增幾何意義說明提示（中英雙語）
- [x] 視覺化標題加入「可縮放・可拖曳」提示
- [x] TypeScript 無錯誤，所有 20 個測試通過

## Phase 13: 精確值、向量投影、矩陣幾何變換視覺化

- [x] 新增 sqrtExact（精確根號：√5, 2√3）及 angleExact（精確角度：60° = π/3）至 matrixMath.ts
- [x] 向量模長以精確根號顯示（如 √5、2√3）
- [x] 向量夾角以精確度數+弧度顯示（如 60° = π/3）
- [x] 單位向量計算顯示精確分母（1/√5 形式）
- [x] 特徵值求根公式步驟顯示 √Δ 精確根號
- [x] eigenMath.ts 改用 fmtShared（精確分數格式）
- [x] 向量投影運算新增至 2D/3D 計算（proj_b(a) + 垂直分量 a⊥）
- [x] VectorPlot2D 新增投影視覺化（綠色投影箭頭 + 黃色虛線垂直分量 + 垂直標記）
- [x] VectorPlot3D 新增投影視覺化（3D 投影箭頭 + 垂直分量箭頭）
- [x] 新增 MatrixTransformPlot.tsx：矩陣幾何變換視覺化（單位正方形/圓/基向量的線性變換效果）
- [x] MatrixPage 新增「幾何變換」分頁
- [x] TypeScript 無錯誤，所有 20 個測試通過

## Phase 14: 精確值系統擴充（聯立方程組 + 逆矩陣）

- [x] 建立 rational.ts — 精確有理數算術庫（BigInt 分子/分母，GCD 化簡）
- [x] 改寫 linearSystem.ts — 高斯消去法全程使用有理數算術，解以精確分數 LaTeX 輸出
- [x] 更新 matrixMath.ts — matInverse 使用有理數算術，逆矩陣元素以精確分數顯示
- [x] 更新 LinearSystemPage — 唯一解和逆矩陣法解均以精確分數顯示
- [x] 更新 MatrixPage — 逆矩陣結果以精確分數 LaTeX 渲染
- [x] 更新 tsconfig.json — 加入 target ES2020 啟用 BigInt 支援
- [x] 所有 20 個測試通過，TypeScript 無錯誤

## Phase 15: 精確值擴充（矩陣 n 次方 + 行列式）

- [x] 更新 matrixPower.ts：已有完整精確值系統（fmtExact, toFrac, fmtPower），無需修改
- [x] 更新 matrixMath.ts 行列式：展開步驟改用有理數算術，精確整數/分數顯示（已完成於 Phase 15 Revised）
- [x] 更新 MatrixPowerPage：已使用精確值顯示（原有系統）
- [x] 更新 MatrixPage：行列式結果顯示使用精確值（已完成於 Phase 15 Revised）
- [x] 所有測試通過，TypeScript 無錯誤

## Phase 15 (Revised): 精確值擴充（行列式 + 首頁修復）

- [x] 更新 matrixMath.ts 行列式（matDeterminant）：全程使用有理數算術（computeDetRational），精確整數/分數顯示
- [x] 更新 tsconfig.json：加入 ES2020.BigInt 至 lib 陣列，修復 BigInt 字面量 TS 錯誤
- [x] 新增 HomePage.tsx：首頁功能概覽（修復 GitHub Pages 根路徑 404）
- [x] matrixPower.ts 已有完整精確值系統（fmtExact, toFrac, fmtPower），無需修改
- [x] 所有 20 個測試通過，TypeScript 無錯誤
