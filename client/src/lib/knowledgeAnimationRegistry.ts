export type KnowledgeAnimationKind =
  | "determinant"
  | "matrix-entries"
  | "matrix-product"
  | "inverse"
  | "eigen"
  | "characteristic"
  | "system-matrix"
  | "row-operation"
  | "solution-types"
  | "cramer"
  | "vector-construction"
  | "dot-product"
  | "cross-product"
  | "spatial";

/** Diagram engines can share a construction; every card still has its own variant. */
export const knowledgeAnimationRegistry: Record<
  string,
  KnowledgeAnimationKind
> = {
  "matrix-def": "matrix-entries",
  "matrix-add": "matrix-entries",
  "matrix-mul": "matrix-product",
  "matrix-transpose": "matrix-entries",
  "matrix-det": "determinant",
  "matrix-inverse": "inverse",
  "matrix-identity": "matrix-entries",
  "matrix-eigen-def": "eigen",
  "matrix-char-poly": "characteristic",
  "matrix-eigen-space": "eigen",
  "ls-def": "system-matrix",
  "ls-augmented": "system-matrix",
  "ls-row-ops": "row-operation",
  "ls-gaussian": "row-operation",
  "ls-solution-types": "solution-types",
  "ls-cramer": "cramer",
  "vec-def": "vector-construction",
  "vec-add": "vector-construction",
  "vec-magnitude": "vector-construction",
  "vec-dot": "dot-product",
  "vec-cross": "cross-product",
  "vec-unit": "vector-construction",
  "vec-angle": "dot-product",
  "vec-plane-plane-angle": "spatial",
  "vec-line-plane-angle": "spatial",
};

export function knowledgeAnimationFor(
  id: string
): KnowledgeAnimationKind | undefined {
  return knowledgeAnimationRegistry[id];
}
