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

## Phase 16: Transformation Module + Homepage Fix

- [x] Fix homepage Feature Modules: bilingual examples tags and add Transformation card
- [x] Add navTransformation key to LanguageContext (zh/en)
- [x] Create TransformationPage.tsx: preset picker + custom matrix input, resulting matrix display, step-by-step panel, interactive 2D Plotly chart (unit square + unit circle + custom vectors before/after)
- [x] 2D transforms: Rotation, Reflection (x/y/y=x/y=-x/any line), Shear (H/V), Scaling, Squeeze, Projection
- [x] 3D transforms: Rotation (x/y/z axis), Scaling, Reflection (xy plane)
- [x] Custom 2×2 matrix input with live chart update
- [x] Custom vector panel: apply transform to user-input vector, show exact result
- [x] Wire /transformation route in App.tsx and add to sidebar nav (Move icon)
- [x] TypeScript clean, all 20 tests pass

## Phase 16b: Matrix Calculator Redesign (Free-form Expression)

- [x] Create matrixExprParser.ts: tokeniser + recursive-descent parser for expressions like A-1/2*B+C, A^(-1), det(A), A^T
- [x] Support operations: +, -, *, scalar (fraction/integer), inverse (A^(-1) or inv(A)), transpose (A^T or A'), det(A), power A^n
- [x] Redesign MatrixPage: add Expression tab with choose number of matrices (2–6), label A-Z with custom rows/cols and grid input, expression text field, exact result + step-by-step
- [x] All results in exact rational form (fractions, not decimals)

## Phase 17: DSE-Style Vector & Triangle-Centre Practice

- [x] 建立 12 題原創 DSE 風格題庫：2D 向量、3D 向量、三角形四心各 4 題
- [x] 新增題目分類、分數提示、答案核對與完整評分步驟（中英雙語）
- [x] 將 DSE 題組整合至 VectorPage 練習模式，並加入題庫驗證測試
- [x] 全部 24 項測試通過，TypeScript 無錯誤，已完成中英雙語視覺驗證

## Phase 18: Interactive Triangle-Centre Diagram & Simulator

- [x] 新增可縮放／拖曳的三角形圖，動態標示 A、B、C、G、I、O、H
- [x] 加入四心建構顯示：中線、高線、垂直平分線、角平分線、內／外接圓和 Euler 線
- [x] 建立三角形四心模擬器：使用預設圖形與即時計算，支援中英雙語及 2D／3D 視圖
- [x] 完成數學驗證、視覺驗證與 28 項測試
- [x] 儲存 Phase 18 checkpoint，記錄四心互動模擬器完成版本
- [x] 推送 Phase 18 變更到 GitHub main，並確認最新 GitHub Pages / Actions 部署成功

## Phase 19: Website Redesign, Vertex Dragging & Construction Playback

- [x] 四心平面圖支援滑鼠／觸控拖曳 A、B、C，同步坐標與結果；非水平三角形保持所在平面
- [x] 逐步建構播放：播放、暫停、重播、上一／下一步、速度和 LaTeX 步驟說明
- [x] 重排四心工作台為圖表主區、輸入控制側欄及下方推導
- [x] 全站更新首頁、分組導覽、視覺設計、間距與響應式版面；保留全部既有路由
- [x] 測試拖曳、播放、退化三角形、雙語和桌面／手機畫面；執行 tests、TypeScript、production build
- [x] checkpoint 後即時同步 GitHub，確認 Pages 部署

Phase 19 verification: 64 Vitest tests and TypeScript passed. Real browser checks passed for mouse and 375px touch vertex dragging, keyboard adjustments, true-plane 3D editing, animated construction drawing, play/pause/restart/single-step, invalid-input recovery, all routes, English copy, and mobile drawer navigation. GitHub Pages build passed with route-level lazy loading; homepage entry JS is separated from the 4.8 MB Plotly module.

Phase 19 GitHub sync verified: checkpoint 35f658b41e688ae28425581d6f9cd976454eaa40 was pushed immediately to main. GitHub Pages workflow 45176932001 completed successfully. The final record checkpoint is also pushed immediately after saving.

## Phase 20: Global Derivation Playback & Spatial Angles

- [x] 共用推導播放元件：播放／暫停／重播／單步／速度／全覽，支援每個計算主題與練習詳解
- [x] 各頁推導整合：矩陣、聯立方程、特徵值、矩陣冪次、變換、向量、四心、知識庫
- [x] 兩平面夾角：法向量／三點／傾斜平面輸入、精確式、LaTeX 步驟及 3D 圖
- [x] 直線與平面夾角：方向向量與法向量，正確區分互餘角，精確式及 3D 圖
- [x] 共用 3D 操作：標準視角、旋轉／平移、縮放、重設、投影、放大檢視和手機相容
- [x] 全套測試、TypeScript、建置、桌面／手機操作驗收
- [x] checkpoint 後即時同步 GitHub，確認 Pages 部署

Phase 20 verification: all 255 Vitest tests, TypeScript and GitHub Pages production build passed. The legacy documents-router test needed one network-timeout retry; no server changes were made. Actual browser checks passed for every calculator timeline, both system-method players, knowledge examples, random practice and DSE mark schemes. Desktop and 375px touch checks verified XY/YZ/XZ views, orbit/pan, zoom, fit/reset, perspective/orthographic, axes/grid/wheel toggles, expanded-view camera retention and focus return, and no horizontal overflow. Spatial checks covered synchronized construction stages, inclined and offset planes, supplementary opening, line–plane complementary angles, parallel/perpendicular presets, three-point/two-point definitions and invalid-normal recovery. Negative 3D vectors remained fully in range without camera resets. Existing four-centre keyboard/touch dragging and construction playback were preserved. Language selection now persists across reloads, and eigenvector formulas no longer contain mixed-language normalization labels.

Precision scope: new vector and spatial-angle derivations use exact fractions, simplified radicals and symbolic inverse-trigonometric expressions. Plotly coordinates are numerical visualization values. Existing numerical eigenvalue/diagonalization outputs are explicitly labelled approximate, with eigenpair residual guards; this phase does not claim to replace those solvers with a fully symbolic engine.

Phase 20 GitHub sync verified: feature checkpoint e7a11ebd4066d2f20f2f4e368c23ff68ea73d7ca was pushed immediately to GitHub main. GitHub Pages workflow 45211925206 completed successfully for the same SHA, and main was verified to match. This completed-record checkpoint is also pushed immediately after saving, with its own Pages deployment checked before delivery.

## Phase 21: Point-Given, Vector-Only Spatial Angles

- [x] 主工具改為至少四個共用已知點；選擇點名組成平面及直線，支援額外點與共面驗證
- [x] 兩平面夾角主解法使用交線方向與垂直投影向量；直線與平面夾角使用平面內向量投影，所有步驟不用平面方程
- [x] 精確 LaTeX 推導與 3D 圖同步顯示真正已知點；平面方程只放可折疊課外知識
- [x] 知識庫相關條目同步採已知點及純向量主解法，保持雙語，加入四點例題同步 3D 圖
- [x] 主工具支援 A–Z 及小寫 Greek 點名稱；改名保留點選，精確推導與圖標籤一致
- [x] 全套測試、TypeScript、生產建置及桌面／手機操作驗收
- [x] 保存 checkpoint 後立即同步 GitHub，確認同 SHA 的 Pages 部署

Phase 21 verification: 326 Vitest tests across 19 files, TypeScript, and the GitHub Pages production build passed. This includes 71 new tests for point-defined geometry, exact projections, arbitrary inclined planes, coplanar face selections, invalid and extreme inputs, Greek labels, KaTeX, actual rays, supplementary arcs, and stable six-stage bounds. Actual desktop and 375px touch browser checks passed for the shared four/eight-point pool, add/rename/remove (including α), three/four-vertex selections, line endpoint changes, invalid-input recovery, inclined/parallel/perpendicular examples, exact inverse-cosine line-plane results, optional read-only enrichment, six-stage playback, preserved camera/bounds, expanded-view camera/focus return, both knowledge-card diagrams, no horizontal overflow, and bilingual persistence. Browser page errors were empty. The initially incorrect test expectation for the Chinese HTML locale was corrected to zh-Hant; no application language change was required.

Precision and teaching scope: all primary angle inputs are shared given points (4–26). Shared-edge plane angles use in-plane vectors perpendicular to the shared edge; arbitrary plane pairs use auxiliary vectors obtained by cross products, never Cartesian plane equations. Line-plane angles use an exact in-plane Gram projection and a cosine/dot-product calculation, with a guarded zero-projection perpendicular case. Equivalent plane equations are read-only and initially collapsed in enrichment. Actual named points and point-derived vectors retain their coordinates/lengths; only explicitly direction-labelled auxiliary arrows are rescaled for viewing.

Phase 21 GitHub sync verified: feature checkpoint 06c0fcd90dd2969c1d29e603387cd7e469adf6ed was pushed immediately to GitHub main, with matching main SHA confirmed. GitHub Pages workflow 45217161218 completed successfully for that exact SHA. All todo items are now completed; this final completion-record checkpoint is likewise immediately pushed and its own Pages deployment checked before delivery.

## Phase 22: Linear Inequalities & Linear Programming MC Simulator

- [x] 新增二元閉不等式／線性規劃工具及合理的雙語導覽入口
- [x] 精確求可行區域頂點與最大／最小值，正確區分無解、無界區域、無界目標和整條最優邊
- [x] 支援已知極值反求加法常數及目標係數參數的完整範圍，不只驗證單一頂點
- [x] 加入使用者提供的 2020／2023／2024 MC；2024 反光位置已以公開題解正文核對為 5x−2y+c，仍保留全部輸入可編輯
- [x] 可行區域、目標直線與精確頂點圖，連接六步推導播放器與目標線／參數模擬
- [x] 三難度練習變式，每級至少 50 個可生成題目，答錯加入一個後續題目
- [x] 完整測試、TypeScript、Pages 建置與桌面／375px 手機驗收
- [x] checkpoint 後立即同步 GitHub，確認相同 SHA 的 Pages 部署

Phase 22 verification: all 700 Vitest tests across 21 files, TypeScript, the GitHub Pages production build, and git diff --check passed. The exact LP engine uses BigInt rational arithmetic and Fourier–Motzkin elimination; feasibility and objective ranges do not depend on the existence of vertices. Covers strips, lines, points, whole plane, contradictory/duplicate boundaries, constant objectives, finite extrema on unbounded regions, recession generators, complete parameter intervals and isolated values, fraction/decimal/scientific parsing, and strict KaTeX. 2020 Q36 gives k=37 (C); 2023 Q37 gives beta>=4 (D), not the insufficient beta>=-10 condition; source-checked 2024 Q37 uses 5x-2y+c and gives c=25 (C).

Actual desktop and 375px touch browser acceptance passed for all three presets and their true vertex tables, six linked graph stages, objective sweep/play/pause, beta=3/4/5 optimizer switches, unchanged full range during coefficient exploration, Greek variables/parameter/additive unknown (including an inactive-label regression), valid-edit camera retention, invalid-input stale result/graph clearing, automatic full-region fit on new questions, three practice levels, duplicate-safe wrong-answer follow-ups and queue consumption, no English CJK text, no KaTeX errors, no horizontal overflow, and bilingual persistence. Page errors were empty. Original generators produce at least 50 distinct cases per level and further cycles have distinct coordinates, so follow-up questions are not identical mathematical inputs.

Teaching scope: only closed <=, >=, and = constraints are supported; strict inequalities are explicitly excluded in the UI. No implicit nonnegativity. Visualization levels/sliders are explicitly approximate, but graph clipping/intersections, solver vertices, extrema and parameter results are exact. Viewport clipping never adds mathematical constraints, vertices or optima. Existing point-first spatial angles and triangle construction tools are unchanged.

2024 coefficient source check: Brightmind public suggested solutions, page 11, Q37: https://brightmind.com.hk/userfiles/Suggested%20Solution%20for%202024%20HKDSE%20Maths%20MC%20questions.pdf . The public PDF was downloaded and its text extracted; none of the three user-attached images was reopened with file tools.

Phase 22 GitHub sync verified: feature checkpoint ce17d5ecc67d6ce4c427ecb73832ee868f99b42a was pushed immediately to GitHub main. GitHub Pages workflow 45350106974 succeeded for that exact SHA, with matching main SHA verified. All todo items are completed; the final completion-record checkpoint is also immediately pushed and its own Pages deployment verified before delivery.

## Phase 23: 3D Plane Angle / Normal-Vector Concept

- [x] 依 Instagram 公開說明加入叉積求法向量、內積求角與較小角／補角概念；不冒充未讀取的原帖例題座標
- [x] 由現有四點以上及選定平面即時生成法向量概念，保留純向量截面主解法及直線／平面工具
- [x] 清楚區分有方向法向量角 φ、方向無關的平面較小角 θ，以及題目選定開口；法向量翻轉不改變平面或 θ
- [x] 六步精確推導配合真實點／平面、垂直標示、法向量及同步 90° 雙向量旋轉動畫
- [x] 主工具與知識庫加入可選雙語概念區；45° 原創四點例子可展示 135° 補角
- [x] 電腦與 375px 手機可旋轉、平移、縮放及展開 3D，動畫及翻轉時保持相機／取景
- [x] 數學、KaTeX、英文文字、平行／垂直／符號及實際瀏覽器驗收；全套測試、TypeScript、Pages 建置
- [x] 保存 checkpoint 後立即同步 GitHub，核對同 SHA Pages 部署

Phase 23 verification: all 744 Vitest tests across 22 files, TypeScript, the GitHub Pages production build, Prettier on changed source files, and git diff --check passed. Exact normal cross/dot calculations preserve the source's rational special-angle classification. The raw normal angle φ is 0–π, the invariant smaller angle θ is 0–π/2, and selected opening δ is independently θ or π−θ. Arbitrary normal flips are never treated as a justified outward convention or automatic interior-angle choice. Exact vector-displacement intersections do not introduce Cartesian plane equations; parallel/coincident pairs have a nonzero demonstration axis without a fake intersection edge.

Actual desktop and 375px touch-browser acceptance passed: original four-point 45° demo and 135° raw-angle flips, all four sign combinations, independent supplementary opening, six synchronized trace stages, paired rotation slider/play/pause/reset, exact-answer invariance, Greek labels, live coordinate edits, invalid-input unmount and stale-result clearing, parallel/perpendicular presets, stable camera/ranges during controls, expanded-view camera retention and real touch gestures, knowledge embedding, line-plane/LP regressions, no English CJK, no KaTeX/page errors, no horizontal overflow and Traditional Chinese persistence. A hidden conservative envelope covers continuous rotation extrema; a compact external colour key avoids shrinking the mobile canvas with long auxiliary Plotly legends. Hidden/reduced-motion and geometry-change cancellation are included in the component lifecycle.

Source: https://www.instagram.com/p/DfhH1rriuXq/ (chalet_dsemath), public caption successfully read. Full carousel images and its example coordinates were not available. The diagram is an original construction from the user's current points, not a reconstruction of inaccessible image coordinates. The existing four-or-more-point projection method, optional enrichment equations, triangle dragging/construction and LP simulator remain intact.

Phase 23 GitHub sync verified: feature checkpoint 8b00d28b19eb7ce414aff984884ee0fe8713e710 was pushed immediately to GitHub main. GitHub Pages workflow 45502262473 completed successfully for that exact SHA, and main was verified to match. All todo items are completed; this final completion-record checkpoint is also immediately pushed and its own Pages deployment verified before delivery.

## Phase 24: Independent Systems / Matrices / Vector Apps (one repository)

- [x] 三個獨立 HTML／React 入口與專屬導航：Systems of Equations、Matrices、Vector
- [x] 保留原整合網站、線性規劃及全部既有功能；各 App 只提供所屬模組
- [x] 分別建置／執行、獨立部署 base、GitHub Pages 子目錄及深層連結／404 回復
- [x] 每 App 的繁中／英文偏好獨立保存，知識庫按單元篩選
- [x] 原首頁加入三個獨立 App 入口及開發／部署說明
- [x] 全套測試、TypeScript、四個產物建置、桌面／375px 手機實際驗收
- [x] checkpoint 後立即同步 GitHub，確認同 SHA Pages 成功與三個網址可用

Phase 24 acceptance: 798 tests / 26 files, application and Vite-config TypeScript, default and Pages builds, isolated APP_BASE=/ matrix deployment without integrated files, and actual desktop/375px touch checks all passed. Confirmed topic-only knowledge, same-origin isolated language persistence, query/hash deep reload, local cross-topic 404, exact system/matrix calculations and playback, vector six-stage normals/3D expansion/real vertex dragging/DSE, integrated homepage and LP, plus complete shared Tailwind utility styles. The normal managed preview dispatches compiled independent entries; no dependencies or lockfile changed. Fixed the existing over-escaped circumcentre Gram formula with a KaTeX rendering regression test.

Phase 24 sync: initial workflow edit was rejected by the GitHub App's workflows permission. Restored the original workflow byte-for-byte and verified its index-to-404 fallback compatibility. Checkpoint c888922151c813f03a4bb9aaf5171ce59b9fabf5 was immediately pushed; Pages workflow 46165442704 succeeded for that exact SHA, main matched, and all three official app URLs returned HTTP 200 with their own titles.

## Phase 25: Animated knowledge diagrams

- [x] 共用圖解播放：播放／暫停／重播／單步／速度、真實幾何動畫與公式同步
- [x] 行列式 2D 面積／3D 體積、符號方向及 det=0 退化動畫
- [x] 矩陣重要知識：元素、加法、乘法、轉置、單位矩陣、逆、特徵方向／空間及特徵多項式
- [x] 聯立方程重要知識：Ax=b／增廣矩陣、列變換／高斯、三類解、克拉默面積比
- [x] 向量重要知識：分量／首尾／長度／單位化、內積與夾角、3D 叉積，保留原空間角動畫
- [x] 既有知識卡全面動畫覆蓋、雙語、精確例子及單元邊界
- [x] 模型／KaTeX 測試、完整建置、桌面／375px 手機幾何動畫及圖解控制驗收
- [x] 保存後立即 GitHub 同步、同 SHA Pages 成功、正式 App 網址驗證

## Phase 26: System methods and terminology

- [x] 唯一解以 Cramer 主解法；非方陣唯一解選獨立方程子系統並代回全部原式
- [x] 其餘主解法 Gaussian；無解矛盾行、無限解任意 k／安全參數
- [x] consistent／inconsistent、homogeneous／non-homogeneous、trivial／non-trivial 與兩秩分類
- [x] 自訂 Latin／Greek 未知數、重複及非法符號防護，詞彙練習及雙語逐步推導
- [x] 模型、KaTeX、桌面／手機完整驗收

## Phase 27: Modern independent-app workspaces

- [x] 三 App 的現代化共用導航／品牌，靛藍／紫／青綠單元識別，淺色低干擾工作區
- [x] 矩陣整理輸入 → 結果 → 推導，長篇語法參考及提示收合
- [x] 聯立方程整理輸入 → 分類／結果 → 主解法，替代方法收合
- [x] 向量快捷分頁與清晰輸入／結果／圖解層次，保留空間角、四心與 DSE
- [x] 知識庫以動畫為主，詳細概念／例子進階展開
- [x] 手機快捷導航／觸控、深層刷新／404、雙語及無溢出回歸
- [x] 完整 TypeScript、所有測試、四 App 建置與實際桌面／375px 驗收
- [x] checkpoint 後立即同步 GitHub，核對同 SHA Pages 成功及正式網址

Phases 25–27 acceptance: 25 existing knowledge cards now have bilingual geometric meaning and diagram-led teaching, using 13 shared-clock SVG engines plus the retained point-defined spatial-angle scenes. Real geometry includes signed projection and angle arcs, 3D cross-product area/normal/curl/order reversal, determinant area/volume collapse, matrix composition and rectangular/adjoint mappings. Final unit suite: 1170 tests / 44 files and both TypeScript configurations passed. Full four-app Pages and normal production builds passed. Actual desktop/375px acceptance passed for all 25 cards, real numerical SVG motion/play/pause/replay/steps/speed/visibility, determinant 2D/3D positive/negative/zero/shear, unique marker IDs, reduced motion, all new exact system/matrix/vector tools and practice answers, scoped routes/404 and no overflow/English CJK/KaTeX/page errors. All dot/cross presets and true normal reversal passed against the Pages artifacts. APP_BASE=/ matrix-only build and routes passed without integrated files. Retained mouse/touch four-centre dragging and construction, four-point pure-vector normal flip 45°/135° with six-stage/expanded 3D, DSE, isolated language persistence, integrated homepage and LP all passed. The refreshed normal managed preview also passed all three compiled app roots, deep query/hash reloads and integrated/LP checks with no asset or runtime errors. Cross product is correctly distinguished from the matrix-valued outer product; zero-vector angles and normal-direction degeneracies are explicit. Original deployment workflow is byte-for-byte unchanged. GitHub synchronization and matching-SHA Pages verification follow this checkpoint.

Phases 25–27 GitHub sync verified: feature checkpoint 3acedd210112acc58ad009d281cca89a0ac970b5 was pushed immediately to GitHub main. Matching-SHA Pages workflow 46169482919 completed successfully, and main was verified to match. All three official app roots returned HTTP 200; their knowledge deep links correctly recovered through the original external-JavaScript SPA 404 bootstrap, with each modern app, scoped card count, geometric meaning and real diagram play/pause verified in the live public browser and no asset/runtime errors. All todo items are complete. This completion-record checkpoint is also immediately synchronized and its own matching-SHA deployment verified before final delivery.
