import { lazy, Suspense, type ComponentType } from "react";
import {
  knowledgeAnimationFor,
  type KnowledgeAnimationKind,
} from "@/lib/knowledgeAnimationRegistry";
import type { KnowledgeDiagramProps } from "./AnimatedKnowledgeLesson";

const diagrams: Partial<
  Record<KnowledgeAnimationKind, ComponentType<KnowledgeDiagramProps>>
> = {
  determinant: lazy(() => import("./DeterminantDiagram")),
  "matrix-entries": lazy(() => import("./MatrixEntriesDiagram")),
  "matrix-product": lazy(() => import("./MatrixProductDiagram")),
  inverse: lazy(() => import("./InverseDiagram")),
  eigen: lazy(() => import("./EigenDiagram")),
  characteristic: lazy(() => import("./CharacteristicDiagram")),
  "system-matrix": lazy(() => import("./SystemMatrixDiagram")),
  "row-operation": lazy(() => import("./RowOperationDiagram")),
  "solution-types": lazy(() => import("./SolutionTypesDiagram")),
  cramer: lazy(() => import("./CramerDiagram")),
  "vector-construction": lazy(() => import("./VectorConstructionDiagram")),
  "dot-product": lazy(() => import("./DotProductDiagram")),
  "cross-product": lazy(() => import("./CrossProductDiagram")),
};

export default function KnowledgeDiagram({
  itemId,
  lang,
}: {
  itemId: string;
  lang: "zh" | "en";
}) {
  const kind = knowledgeAnimationFor(itemId);
  const Diagram = kind ? diagrams[kind] : undefined;
  if (!Diagram) return null;
  return (
    <Suspense
      fallback={
        <p role="status" className="py-6 text-sm text-muted-foreground">
          {lang === "zh" ? "正在載入動畫圖解…" : "Loading animated diagram…"}
        </p>
      }
    >
      <Diagram lang={lang} variant={itemId} />
    </Suspense>
  );
}
