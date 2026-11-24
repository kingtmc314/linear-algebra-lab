import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  ChartNoAxesCombined,
  GraduationCap,
  Grid3X3,
  Move,
  Sigma,
  Sparkles,
  Triangle,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface Tool {
  icon: LucideIcon;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  path: string;
  formula: string;
}

const algebraTools: Tool[] = [
  {
    icon: Grid3X3,
    titleZh: "矩陣計算",
    titleEn: "Matrices",
    descZh: "從基本運算到行列式與逆矩陣，探索矩陣的運算規則。",
    descEn: "Explore matrix operations, determinants and inverses.",
    path: "/matrix",
    formula: "A + B · AB · A⁻¹",
  },
  {
    icon: Sigma,
    titleZh: "聯立方程",
    titleEn: "Linear systems",
    descZh: "輸入方程組，觀察消去步驟與不同的解的情況。",
    descEn: "Follow elimination steps and examine different solution cases.",
    path: "/system",
    formula: "Ax = b",
  },
  {
    icon: ChartNoAxesCombined,
    titleZh: "不等式與線性規劃",
    titleEn: "Linear programming",
    descZh: "探索可行區域與極值，反求常數和參數範圍，逐步播放 MC 推導。",
    descEn:
      "Explore feasible regions and extrema, solve for constants and parameter ranges, and play MC derivations.",
    path: "/linear-programming",
    formula: "max / min (ax + by + c)",
  },
  {
    icon: Sparkles,
    titleZh: "特徵值與向量",
    titleEn: "Eigenvalues & vectors",
    descZh: "由特徵多項式，找出矩陣變換中的不變方向。",
    descEn: "Use the characteristic polynomial to find invariant directions.",
    path: "/eigen",
    formula: "Av = λv",
  },
  {
    icon: Zap,
    titleZh: "矩陣 n 次方",
    titleEn: "Matrix powers",
    descZh: "以對角化理解重複的矩陣運算，探索 A 的 n 次方。",
    descEn: "Explore repeated matrix operations through diagonalization.",
    path: "/matrix-power",
    formula: "Aⁿ = PDⁿP⁻¹",
  },
];

const geometryTools: Tool[] = [
  {
    icon: Compass,
    titleZh: "向量探索",
    titleEn: "Vector exploration",
    descZh: "計算點積、叉積與投影，連結代數運算和幾何圖像。",
    descEn: "Connect dot products, cross products and projections to geometry.",
    path: "/vector",
    formula: "a · b = |a||b| cos θ",
  },
  {
    icon: Grid3X3,
    titleZh: "直線與平面夾角",
    titleEn: "Lines & planes",
    descZh: "由四點或以上的已知坐標，以向量投影逐步求空間夾角。",
    descEn:
      "Use four or more given points and vector projections to derive spatial angles.",
    path: "/vector?tab=spatial",
    formula: "AB · AC · AD → projection → θ",
  },
  {
    icon: Move,
    titleZh: "幾何變換",
    titleEn: "Transformations",
    descZh: "觀察旋轉、反射與切變，理解矩陣如何改變空間。",
    descEn: "See how rotation, reflection and shear matrices reshape space.",
    path: "/transformation",
    formula: "x′ = Ax",
  },
];

// Original deterministic illustration: equal x/y scales, actual medians and centroid.
// Centroid convention: https://mathworld.wolfram.com/TriangleCentroid.html
function TriangleDiagram({ lang }: { lang: "zh" | "en" }) {
  const vertices = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 2, y: 4 },
  ];
  const sx = (x: number) => 68 + 48 * x;
  const sy = (y: number) => 278 - 48 * y;
  const centroid = {
    x: vertices.reduce((sum, point) => sum + point.x, 0) / vertices.length,
    y: vertices.reduce((sum, point) => sum + point.y, 0) / vertices.length,
  };
  return (
    <figure className="home-diagram">
      <div className="home-diagram-heading">
        <span>{lang === "zh" ? "幾何筆記 / 01" : "Geometry notes / 01"}</span>
        <span className="home-diagram-badge">△ ABC</span>
      </div>
      <svg
        viewBox="0 0 440 338"
        role="img"
        aria-labelledby="triangle-illustration-title triangle-illustration-description"
      >
        <title id="triangle-illustration-title">
          {lang === "zh"
            ? "三角形的三條中線與重心"
            : "Three medians and the centroid of a triangle"}
        </title>
        <desc id="triangle-illustration-description">
          {lang === "zh"
            ? "A 點座標為零、零；B 點為六、零；C 點為二、四。三條中線相交於重心 G，座標為三分之八、三分之四。此圖為靜態示意，開啟三角形實驗可進行探索。"
            : "A is at (0, 0), B at (6, 0), and C at (2, 4). The medians meet at centroid G at (8/3, 4/3). This is a static illustration; open the triangle experiment to explore."}
        </desc>
        <defs>
          <pattern
            id="home-coordinate-grid"
            x={sx(0)}
            y={sy(0)}
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
            />
          </pattern>
          <marker
            id="home-axis-arrow"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8" fill="currentColor" />
          </marker>
        </defs>
        <rect
          x="30"
          y="38"
          width="370"
          height="272"
          fill="url(#home-coordinate-grid)"
          className="home-plot-grid"
        />
        <g
          className="home-plot-axes"
          stroke="currentColor"
          strokeWidth="1.1"
          markerEnd="url(#home-axis-arrow)"
        >
          <line x1="35" y1={sy(0)} x2="398" y2={sy(0)} />
          <line x1={sx(0)} y1="312" x2={sx(0)} y2="38" />
        </g>
        <g className="home-plot-ticks" textAnchor="middle">
          {[1, 2, 3, 4, 5, 6].map(x => (
            <text key={`x${x}`} x={sx(x)} y={sy(0) + 21}>
              {x}
            </text>
          ))}
          {[1, 2, 3, 4].map(y => (
            <text key={`y${y}`} x={sx(0) - 16} y={sy(y) + 4}>
              {y}
            </text>
          ))}
          <text x="412" y={sy(0) + 5}>
            x
          </text>
          <text x={sx(0)} y="25">
            y
          </text>
        </g>
        <polygon
          points={vertices
            .map(point => `${sx(point.x)},${sy(point.y)}`)
            .join(" ")}
          className="home-plot-triangle"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <g
          className="home-plot-medians"
          strokeWidth="1.3"
          strokeDasharray="5 5"
        >
          {vertices.map((point, index) => {
            const other = vertices.filter((_, i) => i !== index);
            const midpoint = {
              x: (other[0].x + other[1].x) / 2,
              y: (other[0].y + other[1].y) / 2,
            };
            return (
              <line
                key={index}
                x1={sx(point.x)}
                y1={sy(point.y)}
                x2={sx(midpoint.x)}
                y2={sy(midpoint.y)}
              />
            );
          })}
        </g>
        {vertices.map((point, index) => (
          <circle
            key={index}
            cx={sx(point.x)}
            cy={sy(point.y)}
            r="5"
            className="home-plot-vertex"
          />
        ))}
        <g className="home-plot-labels">
          <text x={sx(0) - 30} y={sy(0) - 10}>
            A
          </text>
          <text x={sx(6) + 13} y={sy(0) - 10}>
            B
          </text>
          <text x={sx(2) + 12} y={sy(4) - 12}>
            C (2, 4)
          </text>
        </g>
        <circle
          cx={sx(centroid.x)}
          cy={sy(centroid.y)}
          r="14"
          className="home-plot-centroid-halo"
        />
        <circle
          cx={sx(centroid.x)}
          cy={sy(centroid.y)}
          r="5"
          className="home-plot-centroid"
        />
        <g className="home-plot-centroid-label">
          <text x={sx(centroid.x) + 17} y={sy(centroid.y) - 9}>
            G
          </text>
        </g>
      </svg>
      <figcaption className="home-diagram-caption">
        <div>
          <span>{lang === "zh" ? "重心" : "Centroid"}</span>
          <strong>G = (A + B + C) / 3</strong>
        </div>
        <span className="home-diagram-static">
          {lang === "zh" ? "靜態示意" : "Static preview"}
        </span>
      </figcaption>
    </figure>
  );
}

function ToolCard({ tool, lang }: { tool: Tool; lang: "zh" | "en" }) {
  const Icon = tool.icon;
  return (
    <Link href={tool.path} className="home-tool-card">
      <div className="home-tool-card-top">
        <span className="home-tool-icon">
          <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <ArrowUpRight
          size={17}
          className="home-card-arrow"
          aria-hidden="true"
        />
      </div>
      <h3>{lang === "zh" ? tool.titleZh : tool.titleEn}</h3>
      <p>{lang === "zh" ? tool.descZh : tool.descEn}</p>
      <span className="home-tool-formula">{tool.formula}</span>
    </Link>
  );
}

export default function HomePage() {
  const { lang } = useLanguage();
  const learningSteps = [
    {
      number: "01",
      titleZh: "先建立概念",
      titleEn: "Build a foundation",
      descZh: "從定義與例題開始，釐清每個符號的意義。",
      descEn:
        "Start with definitions and examples to make sense of the notation.",
      path: "/knowledge",
      icon: BookOpen,
    },
    {
      number: "02",
      titleZh: "再動手計算",
      titleEn: "Work through a calculation",
      descZh: "選一個矩陣，觀察輸入、運算和結果的關係。",
      descEn: "Choose a matrix and connect the inputs, operations and results.",
      path: "/matrix",
      icon: Grid3X3,
    },
    {
      number: "03",
      titleZh: "用幾何驗證",
      titleEn: "Explore it geometrically",
      descZh: "開啟三角形實驗，以圖像理解向量與中心。",
      descEn:
        "Open the triangle experiment to connect vectors and centers visually.",
      path: "/vector?tab=centers",
      icon: Triangle,
    },
  ];

  return (
    <div className="home-workbench">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-eyebrow">
            <span aria-hidden="true" />
            {lang === "zh"
              ? "把抽象概念變得具體"
              : "Make the abstract tangible"}
          </p>
          <h1 id="home-title">
            {lang === "zh" ? (
              <>
                <span>不只算出答案，</span>
                <em>看懂數學。</em>
              </>
            ) : (
              <>
                <span>Beyond the answer.</span>
                <em>See the mathematics.</em>
              </>
            )}
          </h1>
          <p className="home-hero-description">
            {lang === "zh"
              ? "你的線性代數學習工作台。逐步播放數學推導，從矩陣運算到傾斜平面的夾角，把公式、計算與圖像連在一起。"
              : "Your workspace for learning linear algebra. Play derivations step by step—from matrix operations to angles between inclined planes."}
          </p>
          <div className="home-hero-actions">
            <Link
              href="/vector?tab=centers"
              className="home-button home-button-primary"
            >
              <Triangle size={18} aria-hidden="true" />
              {lang === "zh" ? "開啟三角形實驗" : "Open triangle lab"}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/matrix" className="home-button home-button-secondary">
              {lang === "zh" ? "開始矩陣計算" : "Calculate a matrix"}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-hero-topics">
            <span>{lang === "zh" ? "計算" : "Calculate"}</span>
            <span aria-hidden="true">·</span>
            <span>{lang === "zh" ? "觀察" : "Observe"}</span>
            <span aria-hidden="true">·</span>
            <span>{lang === "zh" ? "理解" : "Understand"}</span>
            <span className="home-hero-topic-line" aria-hidden="true" />
          </div>
        </div>
        <TriangleDiagram lang={lang} />
      </section>

      <section
        className="home-quick-links"
        aria-label={
          lang === "zh" ? "幾何學習捷徑" : "Geometry learning shortcuts"
        }
      >
        <Link href="/vector?tab=centers" className="home-quick-link">
          <span className="home-quick-icon">
            <Triangle size={23} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div>
            <span className="home-quick-kicker">
              {lang === "zh" ? "焦點實驗" : "Featured experiment"}
            </span>
            <h2>
              {lang === "zh"
                ? "一個三角形，探索四個中心"
                : "One triangle. Four centers."}
            </h2>
            <p>
              {lang === "zh"
                ? "探索重心、內心、外心與垂心的幾何關係。"
                : "Explore the centroid, incenter, circumcenter and orthocenter."}
            </p>
          </div>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
        <Link
          href="/vector?tab=dse"
          className="home-quick-link home-quick-link-dse"
        >
          <span className="home-quick-icon">
            <GraduationCap size={24} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div>
            <span className="home-quick-kicker">
              {lang === "zh" ? "溫習入口" : "Study shortcut"}
            </span>
            <h2>{lang === "zh" ? "DSE 向量專區" : "DSE vector practice"}</h2>
            <p>
              {lang === "zh"
                ? "把向量概念帶進題目，逐步整理解題思路。"
                : "Bring vector concepts into problems and work through the reasoning."}
            </p>
          </div>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
      </section>

      <section className="home-toolkit" aria-labelledby="toolkit-title">
        <div className="home-section-heading">
          <div>
            <p className="home-section-kicker">
              {lang === "zh" ? "01 / 工具箱" : "01 / The toolkit"}
            </p>
            <h2 id="toolkit-title">
              {lang === "zh" ? "從一個問題開始。" : "Start with a question."}
            </h2>
          </div>
          <p>
            {lang === "zh"
              ? "選擇你想探索的主題。"
              : "Choose what you want to explore."}
          </p>
        </div>
        <div className="home-tool-group">
          <div className="home-tool-group-heading">
            <h3>{lang === "zh" ? "代數計算" : "Algebra & computation"}</h3>
            <span>
              {lang === "zh" ? "運算與結構" : "Operations & structure"}
            </span>
          </div>
          <div className="home-algebra-grid">
            {algebraTools.map(tool => (
              <ToolCard key={tool.path} tool={tool} lang={lang} />
            ))}
          </div>
        </div>
        <div className="home-tool-group">
          <div className="home-tool-group-heading">
            <h3>{lang === "zh" ? "幾何探索" : "Geometry & intuition"}</h3>
            <span>
              {lang === "zh" ? "空間與圖像" : "Space & visualization"}
            </span>
          </div>
          <div className="home-geometry-grid">
            {geometryTools.map(tool => (
              <ToolCard key={tool.path} tool={tool} lang={lang} />
            ))}
          </div>
        </div>
      </section>

      <section className="home-learning" aria-labelledby="learning-title">
        <div className="home-learning-heading">
          <div>
            <p className="home-section-kicker">
              {lang === "zh" ? "02 / 學習路徑" : "02 / A learning path"}
            </p>
            <h2 id="learning-title">
              {lang === "zh"
                ? "不知道從哪裡開始？"
                : "Not sure where to begin?"}
            </h2>
          </div>
          <p>
            {lang === "zh"
              ? "由概念到計算，再走進幾何。"
              : "Move from concepts to calculations, then into geometry."}
          </p>
        </div>
        <ol className="home-learning-steps">
          {learningSteps.map(
            ({
              number,
              titleZh,
              titleEn,
              descZh,
              descEn,
              path,
              icon: Icon,
            }) => (
              <li key={number}>
                <Link href={path}>
                  <div className="home-learning-step-top">
                    <span>{number}</span>
                    <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h3>
                    {lang === "zh" ? titleZh : titleEn}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </h3>
                  <p>{lang === "zh" ? descZh : descEn}</p>
                </Link>
              </li>
            )
          )}
        </ol>
      </section>
      <footer className="home-footer">
        <span>{lang === "zh" ? "線性代數實驗室" : "Linear Algebra Lab"}</span>
        <span>
          {lang === "zh"
            ? "為每一個「為甚麼」留一點空間。"
            : "Make room for every “why”."}
        </span>
        <span className="home-footer-math" aria-hidden="true">
          ℝ² → ℝ³
        </span>
      </footer>
    </div>
  );
}
