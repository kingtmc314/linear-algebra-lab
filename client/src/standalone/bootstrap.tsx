import { createRoot } from "react-dom/client";
import StandaloneApp, { type StandalonePages } from "./StandaloneApp";
import { type StandaloneAppId } from "@/lib/standaloneApps";
import { standaloneRecoveredPath } from "@/lib/standaloneRouteRecovery";
import "@/index.css";
import "katex/dist/katex.min.css";

export function mountStandaloneApp(
  id: StandaloneAppId,
  pages: StandalonePages
) {
  const recovered = standaloneRecoveredPath(
    window.location.href,
    import.meta.env.BASE_URL
  );
  if (recovered) window.history.replaceState(null, "", recovered);
  const root = document.getElementById("root");
  if (!root) throw new Error("The standalone app root was not found.");
  createRoot(root).render(<StandaloneApp id={id} pages={pages} />);
}
