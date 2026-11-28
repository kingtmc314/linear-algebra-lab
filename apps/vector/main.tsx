import { lazy } from "react";
import { mountStandaloneApp } from "../../client/src/standalone/bootstrap";
const VectorPage = lazy(() => import("../../client/src/pages/VectorPage"));
mountStandaloneApp("vector", { "/vector": VectorPage });
