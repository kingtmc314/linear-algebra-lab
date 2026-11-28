import { lazy } from "react";
import { mountStandaloneApp } from "../../client/src/standalone/bootstrap";
const LinearSystemPage = lazy(
  () => import("../../client/src/pages/LinearSystemPage")
);
mountStandaloneApp("systems-of-equations", { "/system": LinearSystemPage });
