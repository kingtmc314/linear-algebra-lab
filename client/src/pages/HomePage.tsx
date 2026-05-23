/**
 * HomePage.tsx
 * Landing page with feature overview for the Linear Algebra Lab webapp.
 * Bilingual (Chinese/English) with animated feature cards.
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { Grid3X3, Sigma, ArrowRight, Sparkles, Zap, BookOpen, Calculator, ChevronRight } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  path: string;
  color: string;
  examples: string[];
}

const FEATURES: Feature[] = [
  {
    icon: <Grid3X3 className="w-6 h-6" />,
    titleZh: "矩陣計算",
    titleEn: "Matrix Calculator",
    descZh: "支援矩陣加減乘、轉置、行列式、逆矩陣、純量乘法。所有結果以精確分數表示，逐步展示高斯-喬登消去法。",
    descEn: "Matrix add/sub/multiply, transpose, determinant, inverse, scalar multiplication. All results in exact fractions with step-by-step Gauss-Jordan elimination.",
    path: "/matrix",
    color: "#3b82f6",
    examples: ["A + B", "det(A)", "A⁻¹", "A × B"],
  },
  {
    icon: <Sigma className="w-6 h-6" />,
    titleZh: "聯立方程組",
    titleEn: "Linear Systems",
    descZh: "求解 2×2 至 4×4 聯立方程組，支援唯一解、無解、無窮多解（k 通解）。同時顯示高斯消去法與逆矩陣法兩種解法，解以精確分數表示。",
    descEn: "Solve 2×2 to 4×4 linear systems with unique, no solution, or infinite solutions (k-parameter). Shows both Gaussian elimination and inverse matrix methods with exact fraction solutions.",
    path: "/system",
    color: "#8b5cf6",
    examples: ["唯一解", "無窮多解", "k 通解", "逆矩陣法"],
  },
  {
    icon: <ArrowRight className="w-6 h-6" />,
    titleZh: "向量計算",
    titleEn: "Vector Calculator",
    descZh: "支援 2D/3D 向量的加減、點積、叉積、模長、夾角、單位化、投影。配備 Plotly.js 互動圖表，可旋轉縮放，直觀呈現幾何意義。",
    descEn: "2D/3D vector add/sub, dot product, cross product, magnitude, angle, normalization, projection. Interactive Plotly.js charts with rotation/zoom for geometric visualization.",
    path: "/vector",
    color: "#10b981",
    examples: ["a × b", "a · b", "投影", "3D 旋轉"],
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    titleZh: "特徵值與特徵向量",
    titleEn: "Eigenvalues & Eigenvectors",
    descZh: "計算 2×2 和 3×3 矩陣的特徵值與特徵向量，顯示特徵多項式推導過程，特徵值以精確根號或分數形式表示。",
    descEn: "Compute eigenvalues and eigenvectors for 2×2 and 3×3 matrices. Shows characteristic polynomial derivation with exact √ or fraction eigenvalues.",
    path: "/eigen",
    color: "#f59e0b",
    examples: ["det(A−λI)=0", "特徵多項式", "精確根號", "特徵空間"],
  },
  {
    icon: <Zap className="w-6 h-6" />,
    titleZh: "矩陣 n 次方",
    titleEn: "Matrix Power A^n",
    descZh: "利用對角化方法計算矩陣 A 的 n 次方（A = PDP⁻¹ → A^n = PD^nP⁻¹），逐步展示 P、D、P⁻¹ 的計算，並顯示符號式 λ^n 通式。",
    descEn: "Compute A^n via diagonalization (A = PDP⁻¹ → A^n = PD^nP⁻¹). Step-by-step P, D, P⁻¹ computation with symbolic λ^n general formula.",
    path: "/matrix-power",
    color: "#ef4444",
    examples: ["A = PDP⁻¹", "D^n", "λ^n 通式", "精確分數"],
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    titleZh: "知識點庫",
    titleEn: "Knowledge Base",
    descZh: "涵蓋線性代數核心概念：矩陣運算、行列式性質、線性方程組、特徵值理論、向量空間。每個主題附有定義、定理與例題。",
    descEn: "Core linear algebra concepts: matrix operations, determinant properties, linear systems, eigenvalue theory, vector spaces. Each topic includes definitions, theorems, and examples.",
    path: "/knowledge",
    color: "#06b6d4",
    examples: ["定義", "定理", "例題", "公式"],
  },
];

export default function HomePage() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden px-8 py-12 border-b border-border"
        style={{
          background: "linear-gradient(135deg, var(--sidebar-bg) 0%, var(--background) 60%)",
        }}
      >
        {/* Background grid decoration */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(var(--foreground) 1px, transparent 1px),
              linear-gradient(90deg, var(--foreground) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-4"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)", border: "1px solid var(--border)" }}>
            <Calculator className="w-3.5 h-3.5" />
            {lang === "zh" ? "線性代數計算工具" : "Linear Algebra Computation Tool"}
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold mb-3 leading-tight"
            style={{ fontFamily: "'IBM Plex Serif', serif", color: "var(--foreground)" }}
          >
            {lang === "zh" ? "線性代數實驗室" : "Linear Algebra Lab"}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-6" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {lang === "zh"
              ? "專為線性代數學習設計的互動式計算工具。所有答案以精確值表示（分數、根號、π），並附逐步推導過程，幫助理解每個運算背後的數學原理。"
              : "An interactive computation tool designed for learning linear algebra. All answers in exact values (fractions, √, π) with step-by-step derivations to understand the mathematics behind each operation."}
          </p>

          {/* Key highlights */}
          <div className="flex flex-wrap gap-3">
            {[
              { zh: "精確分數輸出", en: "Exact Fraction Output" },
              { zh: "逐步推導過程", en: "Step-by-Step Derivation" },
              { zh: "互動式 2D/3D 圖表", en: "Interactive 2D/3D Charts" },
              { zh: "中英雙語", en: "Bilingual (ZH/EN)" },
            ].map((tag) => (
              <span
                key={tag.en}
                className="px-3 py-1 rounded-md text-xs font-mono"
                style={{
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                {lang === "zh" ? tag.zh : tag.en}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="px-8 py-10">
        <h2
          className="text-lg font-semibold mb-6"
          style={{ fontFamily: "'IBM Plex Serif', serif", color: "var(--foreground)" }}
        >
          {lang === "zh" ? "功能模組" : "Feature Modules"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <button
              key={feature.path}
              onClick={() => navigate(feature.path)}
              className="group text-left p-5 rounded-xl border transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = feature.color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${feature.color}20`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: `${feature.color}15`, color: feature.color }}
                >
                  {feature.icon}
                </div>
                <ChevronRight
                  className="w-4 h-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ color: feature.color }}
                />
              </div>

              {/* Title */}
              <h3
                className="text-sm font-semibold mb-2"
                style={{ fontFamily: "'IBM Plex Serif', serif", color: "var(--foreground)" }}
              >
                {lang === "zh" ? feature.titleZh : feature.titleEn}
              </h3>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed mb-3" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {lang === "zh" ? feature.descZh : feature.descEn}
              </p>

              {/* Example tags */}
              <div className="flex flex-wrap gap-1.5">
                {feature.examples.map((ex) => (
                  <span
                    key={ex}
                    className="px-2 py-0.5 rounded text-xs font-mono"
                    style={{
                      background: `${feature.color}12`,
                      color: feature.color,
                      border: `1px solid ${feature.color}30`,
                    }}
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="px-8 pb-10">
        <div
          className="rounded-xl p-6 border"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <h2
            className="text-base font-semibold mb-4"
            style={{ fontFamily: "'IBM Plex Serif', serif", color: "var(--foreground)" }}
          >
            {lang === "zh" ? "使用說明" : "How to Use"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                zh: "從左側選單選擇功能模組",
                en: "Select a module from the left sidebar",
              },
              {
                step: "02",
                zh: "輸入矩陣或向量數值，點擊「計算」",
                en: "Enter matrix or vector values, click 'Calculate'",
              },
              {
                step: "03",
                zh: "查看精確值結果與逐步推導過程",
                en: "View exact value results with step-by-step derivations",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span
                  className="text-2xl font-bold font-mono flex-shrink-0"
                  style={{ color: "var(--muted-foreground)", opacity: 0.3 }}
                >
                  {item.step}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed pt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {lang === "zh" ? item.zh : item.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
