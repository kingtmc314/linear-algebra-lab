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
