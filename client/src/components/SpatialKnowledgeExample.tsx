import { useCallback, useMemo, useState } from "react";
import Plot3DScene from "@/components/Plot3DScene";
import StepDisplay from "@/components/StepDisplay";
import PlaneNormalConcept from "@/components/PlaneNormalConcept";
import type { KnowledgeLessonStep } from "@/lib/Phase20knowledge";
import {
  computePointSpatialAngle,
  pointSpatialScene,
  type NamedSpatialPoint,
} from "@/lib/pointSpatialAngles";

const examplePoints: NamedSpatialPoint[] = [
  { id: "A", label: "A", coordinates: [0, 0, 0] },
  { id: "B", label: "B", coordinates: [2, 0, 0] },
  { id: "C", label: "C", coordinates: [0, 2, 0] },
  { id: "D", label: "D", coordinates: [0, 2, 2] },
];

/** Both knowledge examples refer to this one four-point geometry, not equations. */
export default function SpatialKnowledgeExample({
  mode,
  steps,
  lang,
  title,
}: {
  mode: "plane-plane" | "line-plane";
  steps: KnowledgeLessonStep[];
  lang: "zh" | "en";
  title: string;
}) {
  const [stepIndex, setStepIndex] = useState(5);
  const onStepChange = useCallback(
    (index: number, playbackMode: "all" | "playback") => {
      // The static shared-edge example constructs both u and v in its third step.
      const stage = mode === "plane-plane" && index === 2 ? 3 : index;
      setStepIndex(playbackMode === "all" ? 5 : Math.min(5, stage));
    },
    [mode]
  );
  const result = useMemo(
    () =>
      computePointSpatialAngle({
        mode,
        points: examplePoints,
        plane1: ["A", "B", "C"],
        ...(mode === "plane-plane"
          ? { plane2: ["A", "B", "D"] }
          : { line: ["A", "D"] as [string, string] }),
      }),
    [mode]
  );
  const fullScene = useMemo(
    () => pointSpatialScene(result, { lang, stepIndex: 5 }),
    [result, lang]
  );
  const scene = useMemo(
    () => pointSpatialScene(result, { lang, stepIndex }),
    [result, lang, stepIndex]
  );
  return (
    <div className="min-w-0 space-y-4" data-testid="spatial-knowledge-example">
      <StepDisplay steps={steps} title={title} onStepChange={onStepChange} />
      <figure className="min-w-0 rounded-xl border border-primary/15 bg-background p-2">
        <figcaption className="px-2 pb-2 pt-1 text-sm font-medium text-foreground">
          {lang === "zh"
            ? "四點示意圖：A、B、C、D（與例子步驟同步）"
            : "Four-point diagram: A, B, C, D (linked to example steps)"}
        </figcaption>
        <Plot3DScene
          data={scene.data}
          boundsData={fullScene.data}
          layout={scene.layout}
          lang={lang}
          height={320}
          uirevision={`spatial-knowledge-${mode}`}
          name={
            lang === "zh"
              ? "已知四點的空間夾角"
              : "Spatial angle from four given points"
          }
        />
        <p className="px-2 pb-1 pt-2 text-xs leading-relaxed text-muted-foreground">
          {scene.note}
        </p>
      </figure>
      {mode === "plane-plane" && (
        <PlaneNormalConcept result={result} lang={lang} />
      )}
    </div>
  );
}
