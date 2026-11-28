import { lazy } from "react";
import { mountStandaloneApp } from "../../client/src/standalone/bootstrap";
const MatrixPage = lazy(() => import("../../client/src/pages/MatrixPage"));
const EigenPage = lazy(() => import("../../client/src/pages/EigenPage"));
const MatrixPowerPage = lazy(
  () => import("../../client/src/pages/MatrixPowerPage")
);
const TransformationPage = lazy(
  () => import("../../client/src/pages/TransformationPage")
);
mountStandaloneApp("matrices", {
  "/matrix": MatrixPage,
  "/eigen": EigenPage,
  "/matrix-power": MatrixPowerPage,
  "/transformation": TransformationPage,
});
