// App.tsx — Linear Algebra Lab
// Academic Precision Design: deep navy sidebar, clean content area
// Language: bilingual Chinese/English via LanguageContext
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import MatrixPage from "./pages/MatrixPage";
import LinearSystemPage from "./pages/LinearSystemPage";
import VectorPage from "./pages/VectorPage";
import KnowledgePage from "./pages/KnowledgePage";
import DocumentsPage from "./pages/DocumentsPage";
import EigenPage from "./pages/EigenPage";
import { useState } from "react";
import { Grid3X3, Sigma, ArrowRight, Menu, X, Globe, BookOpen, FileText, LogIn, LogOut, User, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [location, navigate] = useLocation();
  const { t, lang, setLang } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success(lang === "zh" ? "已登出" : "Logged out");
      window.location.reload();
    },
  });

  const navItems = [
    { path: "/", label: t.navMatrix, icon: Grid3X3 },
    { path: "/system", label: t.navLinearSystem, icon: Sigma },
    { path: "/vector", label: t.navVector, icon: ArrowRight },
    { path: "/eigen", label: t.navEigen, icon: Sparkles },
    { path: "/knowledge", label: t.navKnowledge, icon: BookOpen },
    { path: "/documents", label: t.navDocuments, icon: FileText },
  ];

  return (
    <aside
      className={`flex flex-col h-full ${mobile ? "w-full" : "w-64"}`}
      style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
    >
      {/* Logo / Title */}
      <div className="px-5 py-6 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-bold leading-tight"
              style={{
                fontFamily: "'IBM Plex Serif', serif",
                color: "var(--sidebar-foreground)",
              }}
            >
              {lang === "zh" ? "線性代數" : "Linear Algebra"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--sidebar-primary)", fontFamily: "'IBM Plex Mono', monospace" }}>
              Lab
            </p>
          </div>
          {mobile && onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" style={{ color: "var(--sidebar-foreground)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Divider label: Calculator */}
        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider opacity-40" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {lang === "zh" ? "計算器" : "Calculators"}
        </p>
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onClose?.(); }}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Divider label: Resources */}
        <p className="px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider opacity-40" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {lang === "zh" ? "學習資源" : "Resources"}
        </p>
        {navItems.slice(4).map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onClose?.(); }}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Language toggle + auth + footer */}
      <div className="px-3 py-4 border-t space-y-3" style={{ borderColor: "var(--sidebar-border)" }}>
        {/* Language switcher */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <Globe className="w-3.5 h-3.5" style={{ color: "var(--sidebar-primary)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--sidebar-foreground)", opacity: 0.7 }}>
              {t.language}
            </span>
          </div>
          <div className="flex gap-1">
            {(["zh", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded transition-all duration-150
                  ${lang === l ? "text-white" : "hover:bg-white/10"}`}
                style={{
                  background: lang === l ? "var(--sidebar-primary)" : "transparent",
                  color: lang === l ? "var(--sidebar-primary-foreground)" : "var(--sidebar-foreground)",
                }}
              >
                {l === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
        </div>

        {/* Auth section */}
        <div className="border-t pt-3" style={{ borderColor: "var(--sidebar-border)" }}>
          {isAuthenticated && user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <User className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--sidebar-primary)" }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--sidebar-foreground)" }}>
                    {user.name || user.email || "Teacher"}
                  </p>
                  {isAdmin && (
                    <p className="text-xs opacity-60 font-mono" style={{ color: "var(--sidebar-primary)" }}>
                      {lang === "zh" ? "教師" : "Teacher"}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => logoutMutation.mutate()}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors"
                style={{ color: "var(--sidebar-foreground)", opacity: 0.7 }}
              >
                <LogOut className="w-3.5 h-3.5" />
                {lang === "zh" ? "登出" : "Log out"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => window.location.href = getLoginUrl()}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors"
              style={{ color: "var(--sidebar-foreground)", opacity: 0.7 }}
            >
              <LogIn className="w-3.5 h-3.5" />
              {lang === "zh" ? "教師登入" : "Teacher Login"}
            </button>
          )}
        </div>

        <p className="text-xs px-1" style={{ color: "var(--sidebar-foreground)", opacity: 0.4, fontFamily: "'IBM Plex Mono', monospace" }}>
          v2.0.0
        </p>
      </div>
    </aside>
  );
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, lang } = useLanguage();
  const [location] = useLocation();

  const pageTitle: Record<string, string> = {
    "/": t.navMatrix,
    "/system": t.navLinearSystem,
    "/vector": t.navVector,
    "/eigen": t.navEigen,
    "/knowledge": t.navKnowledge,
    "/documents": t.navDocuments,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col flex-shrink-0 h-full border-r" style={{ borderColor: "var(--sidebar-border)" }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 flex flex-col shadow-xl">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
            {pageTitle[location] || t.appTitle}
          </span>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div>
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
              {pageTitle[location] || t.appTitle}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">{t.appSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            Linear Algebra Lab
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={MatrixPage} />
            <Route path="/system" component={LinearSystemPage} />
            <Route path="/vector" component={VectorPage} />
            <Route path="/knowledge">
              {() => <KnowledgePage lang={lang} />}
            </Route>
            <Route path="/eigen" component={EigenPage} />
            <Route path="/documents">
              {() => <DocumentsPage lang={lang} />}
            </Route>
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
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
            <Layout />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
