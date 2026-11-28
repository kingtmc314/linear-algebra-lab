import { createRoot } from "react-dom/client";
import App from "./App";
import { standaloneEntryRedirect } from "./lib/standaloneEntryRedirect";
import "./index.css";

const standaloneTarget = standaloneEntryRedirect(
  window.location.href,
  import.meta.env.BASE_URL
);
if (standaloneTarget) {
  window.location.replace(standaloneTarget);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
