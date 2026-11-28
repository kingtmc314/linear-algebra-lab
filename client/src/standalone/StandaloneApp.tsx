import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Link, Route, Router, Switch, useLocation, useSearch } from "wouter";
import {
  Sigma,
  Grid3X3,
  Compass,
  Sparkles,
  Zap,
  Move,
  Triangle,
  GraduationCap,
  BookOpen,
  Menu,
  X,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import {
  standaloneApps,
  standaloneLanguageKey,
  type StandaloneAppId,
} from "@/lib/standaloneApps";

const KnowledgePage = lazy(() => import("@/pages/KnowledgePage"));
const icons: Record<string, typeof Sigma> = {
  Sigma,
  Grid3X3,
  Compass,
  Sparkles,
  Zap,
  Move,
  Triangle,
  GraduationCap,
  BookOpen,
};
export type StandalonePages = Record<string, ComponentType>;

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
          >
            {value === "zh" ? "繁體中文" : "English"}
          </button>
        ))}
      </div>
    </div>
  );
}

function AppLayout({
  id,
  pages,
}: {
  id: StandaloneAppId;
  pages: StandalonePages;
}) {
  const app = standaloneApps[id];
  const { lang } = useLanguage();
  const [location] = useLocation();
  const search = useSearch();
  const tab = new URLSearchParams(search).get("tab");
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const title = lang === "zh" ? app.titleZh : app.titleEn;
  const isActive = (path: string) => {
    const [pathname, query] = path.split("?");
    const current = location === "/" ? app.primaryPath : location;
    if (current !== pathname) return false;
    return query
      ? tab === new URLSearchParams(query).get("tab")
      : !(
          pathname === "/vector" &&
          ["centers", "dse", "spatial"].includes(tab ?? "")
        );
  };
  const currentRoute = app.routes.find(route => isActive(route.path));
  const label = currentRoute
    ? lang === "zh"
      ? currentRoute.labelZh
      : currentRoute.labelEn
    : title;
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.title = `${label} · ${title}`;
  }, [lang, label, title]);
  useEffect(() => {
    setMobileOpen(false);
    mainRef.current?.focus({ preventScroll: true });
  }, [location, search]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const close = () => {
      if (media.matches) setMobileOpen(false);
    };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);
  const sidebar = (close?: () => void) => (
    <aside className="lab-sidebar">
      <Link href="/" className="lab-brand" onClick={close} aria-label={title}>
        <span className="lab-brand-mark" aria-hidden="true">
          {app.mark}
        </span>
        <span className="lab-brand-copy">
          <strong>{lang === "zh" ? app.shortZh : app.shortEn}</strong>
          <span>
            {lang === "zh" ? "獨立互動實驗室" : "Independent interactive lab"}
          </span>
        </span>
      </Link>
      <nav
        className="lab-navigation"
        aria-label={lang === "zh" ? "主要導覽" : "Main navigation"}
      >
        <div className="lab-nav-group">
          <p className="lab-nav-label">
            {lang === "zh" ? "本單元工具" : "This app"}
          </p>
          {app.routes.map(route => {
            const Icon = icons[route.icon] ?? BookOpen;
            return (
              <Link
                key={route.path}
                href={route.path}
                onClick={close}
                className={`nav-item${isActive(route.path) ? " active" : ""}`}
                aria-current={isActive(route.path) ? "page" : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{lang === "zh" ? route.labelZh : route.labelEn}</span>
                {isActive(route.path) && (
                  <span className="lab-nav-indicator" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="lab-sidebar-bottom">
        <div className="lab-sidebar-note">
          <span aria-hidden="true">{app.formula}</span>
          <p>
            {lang === "zh"
              ? "專注一個單元，逐步看懂。"
              : "One subject. Understand every step."}
          </p>
        </div>
        <LanguageSwitch />
      </div>
    </aside>
  );
  const Primary = pages[app.primaryPath];
  return (
    <div className="lab-shell" data-testid="standalone-app" data-app={id}>
      <a
        className="lab-skip-link"
        href="#main-content"
        onClick={() => mainRef.current?.focus()}
      >
        {lang === "zh" ? "跳至主要內容" : "Skip to content"}
      </a>
      <div className="lab-desktop-sidebar">{sidebar()}</div>
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
                    ? "選擇本單元工具或切換語言。"
                    : "Choose this app's tools or switch language."}
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
                {sidebar(() => setMobileOpen(false))}
              </SheetContent>
            </Sheet>
            <div className="lab-breadcrumb">
              <span className="lab-breadcrumb-root">
                {lang === "zh" ? app.shortZh : app.shortEn}
              </span>
              <span className="lab-breadcrumb-slash" aria-hidden="true">
                /
              </span>
              <span>{label}</span>
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
          className="lab-main"
        >
          <div className="lab-page-content">
            <p
              className="mb-4 text-xs tracking-wide text-muted-foreground"
              data-testid="standalone-brand"
            >
              {title} · {lang === "zh" ? "獨立 Web App" : "Independent web app"}
            </p>
            <Suspense
              fallback={
                <p
                  role="status"
                  className="py-12 text-sm text-muted-foreground"
                >
                  {lang === "zh" ? "正在載入數學工具…" : "Loading maths tools…"}
                </p>
              }
            >
              <Switch>
                <Route path="/">{() => <Primary />}</Route>
                {Object.entries(pages).map(([path, Page]) => (
                  <Route key={path} path={path}>
                    {() => <Page />}
                  </Route>
                ))}
                <Route path="/knowledge">
                  {() => (
                    <KnowledgePage
                      key={id}
                      lang={lang}
                      topicSlugs={app.topicSlugs}
                    />
                  )}
                </Route>
                <Route>
                  <section className="rounded-xl border border-border bg-card p-6">
                    <h1 className="text-2xl font-bold">
                      {lang === "zh"
                        ? "找不到本單元頁面"
                        : "Page not found in this app"}
                    </h1>
                    <p className="my-4 text-muted-foreground">
                      {lang === "zh"
                        ? "此獨立 App 只包含本單元工具。"
                        : "This independent app contains only its own subject tools."}
                    </p>
                    <Link href="/" className="home-button home-button-primary">
                      {lang === "zh" ? "返回本 App" : "Return to this app"}
                    </Link>
                  </section>
                </Route>
              </Switch>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function StandaloneApp({
  id,
  pages,
}: {
  id: StandaloneAppId;
  pages: StandalonePages;
}) {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider storageKey={standaloneLanguageKey(id)}>
          <TooltipProvider>
            <Toaster />
            <Router base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppLayout id={id} pages={pages} />
            </Router>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
