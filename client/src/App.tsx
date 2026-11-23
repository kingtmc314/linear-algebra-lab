import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import NotFound from "@/pages/NotFound";
import { Link, Route, Switch, useLocation, useSearch, Router } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import HomePage from "./pages/HomePage";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Globe,
  Grid3X3,
  GraduationCap,
  Home,
  Menu,
  Move,
  Sigma,
  Sparkles,
  Triangle,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

const MatrixPage = lazy(() => import("./pages/MatrixPage"));
const LinearSystemPage = lazy(() => import("./pages/LinearSystemPage"));
const VectorPage = lazy(() => import("./pages/VectorPage"));
const KnowledgePage = lazy(() => import("./pages/KnowledgePage"));
const EigenPage = lazy(() => import("./pages/EigenPage"));
const MatrixPowerPage = lazy(() => import("./pages/MatrixPowerPage"));
const TransformationPage = lazy(() => import("./pages/TransformationPage"));

type NavigationItem = { path: string; label: string; icon: LucideIcon };

function LanguageSwitch() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="lab-language">
      <span className="lab-language-label">
        <Globe size={14} aria-hidden="true" />
        {lang === "zh" ? "介面語言" : "Language"}
      </span>
      <div
        className="lab-language-options"
        role="group"
        aria-label={lang === "zh" ? "選擇語言" : "Choose language"}
      >
        {(["zh", "en"] as const).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setLang(value)}
            aria-pressed={lang === value}
            lang={value === "zh" ? "zh-Hant" : "en"}
          >
            {value === "zh" ? "繁體中文" : "English"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const search = useSearch();
  const tab = new URLSearchParams(search).get("tab");
  const { lang } = useLanguage();
  const groups: { label: string; items: NavigationItem[] }[] = [
    {
      label: lang === "zh" ? "工作台" : "Workspace",
      items: [
        { path: "/", label: lang === "zh" ? "總覽" : "Overview", icon: Home },
      ],
    },
    {
      label: lang === "zh" ? "代數計算" : "Calculators",
      items: [
        {
          path: "/matrix",
          label: lang === "zh" ? "矩陣計算" : "Matrices",
          icon: Grid3X3,
        },
        {
          path: "/system",
          label: lang === "zh" ? "聯立方程" : "Linear systems",
          icon: Sigma,
        },
        {
          path: "/eigen",
          label: lang === "zh" ? "特徵值與向量" : "Eigenvalues & vectors",
          icon: Sparkles,
        },
        {
          path: "/matrix-power",
          label: lang === "zh" ? "矩陣 n 次方" : "Matrix powers",
          icon: Zap,
        },
      ],
    },
    {
      label: lang === "zh" ? "幾何探索" : "Geometry",
      items: [
        {
          path: "/vector",
          label: lang === "zh" ? "向量" : "Vectors",
          icon: Compass,
        },
        {
          path: "/vector?tab=centers",
          label: lang === "zh" ? "三角形中心實驗" : "Triangle centers",
          icon: Triangle,
        },
        {
          path: "/transformation",
          label: lang === "zh" ? "幾何變換" : "Transformations",
          icon: Move,
        },
      ],
    },
    {
      label: lang === "zh" ? "學習與練習" : "Learn & practice",
      items: [
        {
          path: "/knowledge",
          label: lang === "zh" ? "知識點庫" : "Knowledge base",
          icon: BookOpen,
        },
        {
          path: "/vector?tab=dse",
          label: lang === "zh" ? "DSE 向量專區" : "DSE vector practice",
          icon: GraduationCap,
        },
      ],
    },
  ];

  function isActive(path: string) {
    const [pathname, query] = path.split("?");
    if (pathname !== location) return false;
    if (query) return tab === new URLSearchParams(query).get("tab");
    return pathname !== "/vector" || (tab !== "centers" && tab !== "dse");
  }

  return (
    <aside className="lab-sidebar">
      <Link
        href="/"
        className="lab-brand"
        onClick={onClose}
        aria-label={
          lang === "zh" ? "線性代數實驗室總覽" : "Linear Algebra Lab overview"
        }
      >
        <span className="lab-brand-mark" aria-hidden="true">
          <span>[</span>
          <span>λ</span>
          <span>]</span>
        </span>
        <span className="lab-brand-copy">
          <strong>{lang === "zh" ? "線性代數" : "Linear Algebra"}</strong>
          <span>{lang === "zh" ? "互動實驗室" : "Interactive lab"}</span>
        </span>
      </Link>
      <nav
        className="lab-navigation"
        aria-label={lang === "zh" ? "主要導覽" : "Main navigation"}
      >
        {groups.map(group => (
          <div className="lab-nav-group" key={group.label}>
            <p className="lab-nav-label">{group.label}</p>
            {group.items.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                href={path}
                onClick={onClose}
                className={`nav-item${isActive(path) ? " active" : ""}`}
                aria-current={isActive(path) ? "page" : undefined}
              >
                <Icon size={17} strokeWidth={1.65} aria-hidden="true" />
                <span>{label}</span>
                {isActive(path) && (
                  <span className="lab-nav-indicator" aria-hidden="true" />
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="lab-sidebar-bottom">
        <div className="lab-sidebar-note">
          <span aria-hidden="true">Ax = b</span>
          <p>
            {lang === "zh"
              ? "從計算，走向理解。"
              : "From computation to understanding."}
          </p>
        </div>
        <LanguageSwitch />
      </div>
    </aside>
  );
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, t } = useLanguage();
  const [location] = useLocation();
  const search = useSearch();
  const tab = new URLSearchParams(search).get("tab");
  const mainRef = useRef<HTMLElement>(null);
  const previousLocation = useRef(location);
  const pageTitle: Record<string, string> = {
    "/": lang === "zh" ? "學習工作台" : "Learning workspace",
    "/matrix": t.navMatrix,
    "/system": t.navLinearSystem,
    "/vector":
      tab === "centers"
        ? lang === "zh"
          ? "三角形中心實驗"
          : "Triangle centers"
        : tab === "dse"
          ? lang === "zh"
            ? "DSE 向量專區"
            : "DSE vector practice"
          : t.navVector,
    "/eigen": t.navEigen,
    "/matrix-power": lang === "zh" ? "矩陣 n 次方" : "Matrix powers",
    "/transformation": t.navTransformation,
    "/knowledge": t.navKnowledge,
  };

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.title = `${pageTitle[location] || t.appTitle} · ${t.appTitle}`;
  }, [lang, location, tab, t.appTitle]);

  useEffect(() => {
    setMobileOpen(false);
    if (previousLocation.current !== location) {
      mainRef.current?.scrollTo({ top: 0 });
      mainRef.current?.focus({ preventScroll: true });
      previousLocation.current = location;
    }
  }, [location, search]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="lab-shell">
      <a
        className="lab-skip-link"
        href="#main-content"
        onClick={() => mainRef.current?.focus()}
      >
        {lang === "zh" ? "跳至主要內容" : "Skip to content"}
      </a>
      <div className="lab-desktop-sidebar">
        <Sidebar />
      </div>
      <div className="lab-workspace">
        <header className="lab-topbar">
          <div className="lab-topbar-heading">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="lab-menu-button"
                  aria-label={
                    lang === "zh" ? "開啟導覽選單" : "Open navigation menu"
                  }
                >
                  <Menu size={21} aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="lab-sidebar-sheet">
                <SheetTitle className="sr-only">
                  {lang === "zh" ? "導覽選單" : "Navigation menu"}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  {lang === "zh"
                    ? "選擇計算工具、幾何實驗或學習資源，也可以切換介面語言。"
                    : "Choose a calculator, geometry experiment or learning resource, or change the interface language."}
                </SheetDescription>
                <SheetClose asChild>
                  <button
                    type="button"
                    className="lab-drawer-close"
                    aria-label={
                      lang === "zh" ? "關閉導覽選單" : "Close navigation menu"
                    }
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </SheetClose>
                <Sidebar onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="lab-breadcrumb">
              <span className="lab-breadcrumb-root">
                {lang === "zh" ? "實驗室" : "The lab"}
              </span>
              <span className="lab-breadcrumb-slash" aria-hidden="true">
                /
              </span>
              <span>{pageTitle[location] || t.appTitle}</span>
            </div>
          </div>
          <Link href="/knowledge" className="lab-topbar-link">
            <BookOpen size={15} aria-hidden="true" />
            <span>{lang === "zh" ? "查閱概念" : "Explore concepts"}</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </header>
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className={`lab-main${location === "/" ? " lab-main-home" : ""}`}
        >
          <div className="lab-page-content">
            <Suspense
              fallback={
                <div
                  role="status"
                  className="py-16 text-sm text-muted-foreground"
                >
                  {lang === "zh"
                    ? "正在載入數學工具…"
                    : "Loading the maths workspace…"}
                </div>
              }
            >
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/matrix" component={MatrixPage} />
                <Route path="/system" component={LinearSystemPage} />
                <Route path="/vector" component={VectorPage} />
                <Route path="/knowledge">
                  {() => <KnowledgePage lang={lang} />}
                </Route>
                <Route path="/eigen" component={EigenPage} />
                <Route path="/matrix-power" component={MatrixPowerPage} />
                <Route path="/transformation" component={TransformationPage} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Layout />
            </Router>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
