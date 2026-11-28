import { useId, useState } from "react";
import type { DerivationStep } from "@/lib/derivationPlayback";
import AnimatedKnowledgeLesson, {
  type KnowledgeDiagramProps,
  type KnowledgeFrame,
} from "./AnimatedKnowledgeLesson";

export type Vector3 = readonly [number, number, number];
export type Point2 = readonly [number, number];
export type CrossProductPresetId = "basis" | "tilted" | "parallel" | "zero";

export const CROSS_PRODUCT_PRESETS: ReadonlyArray<{
  id: CrossProductPresetId;
  a: Vector3;
  b: Vector3;
  zh: string;
  en: string;
}> = [
  { id: "basis", a: [1, 0, 0], b: [0, 1, 0], zh: "標準基底", en: "Unit basis" },
  {
    id: "tilted",
    a: [1, 0, 1],
    b: [0, 1, -1],
    zh: "傾斜平面",
    en: "Tilted plane",
  },
  {
    id: "parallel",
    a: [1, 0, 0],
    b: [2, 0, 0],
    zh: "平行向量",
    en: "Parallel",
  },
  { id: "zero", a: [0, 0, 0], b: [0, 1, 0], zh: "零向量", en: "Zero vector" },
];

function finiteVector(vector: Vector3): void {
  if (vector.length !== 3 || !vector.every(Number.isFinite)) {
    throw new RangeError("A 3D vector must contain three finite coordinates.");
  }
}

function finiteResult(vector: Vector3): Vector3 {
  if (!vector.every(Number.isFinite)) {
    throw new RangeError("Vector arithmetic overflowed.");
  }
  return vector.map(value =>
    Object.is(value, -0) ? 0 : value
  ) as unknown as Vector3;
}

export function crossProduct3(a: Vector3, b: Vector3): Vector3 {
  finiteVector(a);
  finiteVector(b);
  return finiteResult([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]);
}

export function dotProduct3(a: Vector3, b: Vector3): number {
  finiteVector(a);
  finiteVector(b);
  const result = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (!Number.isFinite(result)) throw new RangeError("Dot product overflowed.");
  return Object.is(result, -0) ? 0 : result;
}

function scaleVector(vector: Vector3, factor: number): Vector3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function addVectors(a: Vector3, b: Vector3): Vector3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function exactCrossArea(squared: number): {
  latex: string;
  text: string;
} {
  // The lesson's bounded integer vectors have squared area at most 3072.
  if (!Number.isSafeInteger(squared) || squared < 0 || squared > 3072) {
    throw new RangeError(
      "Squared demo area must be an integer from 0 to 3072."
    );
  }
  if (squared === 0) return { latex: "0", text: "0" };
  let outside = 1;
  let inside = squared;
  for (let factor = 2; factor * factor <= inside; factor++) {
    while (inside % (factor * factor) === 0) {
      outside *= factor;
      inside /= factor * factor;
    }
  }
  if (inside === 1) return { latex: String(outside), text: String(outside) };
  const coefficient = outside === 1 ? "" : String(outside);
  return {
    latex: `${coefficient}\\sqrt{${inside}}`,
    text: `${coefficient}√${inside}`,
  };
}

export interface CrossProductModel {
  a: Vector3;
  b: Vector3;
  normal: Vector3;
  swappedNormal: Vector3;
  squaredArea: number;
  areaLatex: string;
  areaText: string;
  dotA: number;
  dotB: number;
  hasNormal: boolean;
  hasZeroInput: boolean;
}

/** Exact integer arithmetic for the finite, bounded numerical demos. */
export function createCrossProductModel(
  a: Vector3,
  b: Vector3
): CrossProductModel {
  finiteVector(a);
  finiteVector(b);
  if (
    ![...a, ...b].every(
      value => Number.isInteger(value) && Math.abs(value) <= 4
    )
  ) {
    throw new RangeError("Demo coordinates must be integers between -4 and 4.");
  }
  const normal = crossProduct3(a, b);
  const squaredArea = dotProduct3(normal, normal);
  const area = exactCrossArea(squaredArea);
  return {
    a: [...a],
    b: [...b],
    normal,
    swappedNormal: crossProduct3(b, a),
    squaredArea,
    areaLatex: area.latex,
    areaText: area.text,
    dotA: dotProduct3(normal, a),
    dotB: dotProduct3(normal, b),
    hasNormal: squaredArea > 0,
    hasZeroInput: dotProduct3(a, a) === 0 || dotProduct3(b, b) === 0,
  };
}

function vectorLatex(vector: Vector3): string {
  return String.raw`\begin{pmatrix}${vector.join(String.raw`\\`)}\end{pmatrix}`;
}

export function crossProductSteps(
  model: CrossProductModel,
  lang: "zh" | "en"
): DerivationStep[] {
  const zh = lang === "zh";
  const a = vectorLatex(model.a);
  const b = vectorLatex(model.b);
  const n = vectorLatex(model.normal);
  const opposite = vectorLatex(model.swappedNormal);
  const aa = dotProduct3(model.a, model.a);
  const bb = dotProduct3(model.b, model.b);
  const ab = dotProduct3(model.a, model.b);
  const degenerate = model.hasZeroInput
    ? zh
      ? "其中一個向量為零；面積為零，叉積沒有方向。"
      : "One input is zero: the area is zero and the cross product has no direction."
    : zh
      ? "兩向量平行；平行四邊形退化為線段，沒有非零法向量。"
      : "The vectors are parallel: the parallelogram collapses to a segment, with no nonzero normal.";
  return [
    {
      description: zh
        ? "數值示範：從同一原點畫出三維向量 a、b。圖中採等角投影，不是二維叉積。"
        : "Numerical demo: draw the 3D vectors a and b from one origin. This is an isometric projection, not a 2D cross product.",
      latex: String.raw`\mathbf a=${a},\qquad\mathbf b=${b}`,
    },
    {
      description: model.hasNormal
        ? zh
          ? "把 b 沿 a 平移，掃出真正三維平行四邊形；投影面積不等於其空間面積。"
          : "Translate b along a to sweep the 3D parallelogram. Its projected area is not its spatial area."
        : degenerate,
      latex: String.raw`S=\sqrt{\|\mathbf a\|^2\|\mathbf b\|^2-(\mathbf a\cdot\mathbf b)^2}=\sqrt{${aa}\cdot${bb}-(${ab})^2}=${model.areaLatex}`,
    },
    {
      description: model.hasNormal
        ? zh
          ? "由分量計算 n = a × b，從原點長出法向量；其長度等於空間面積。"
          : "Compute n = a × b from the components, then grow the normal from the origin. Its length equals the spatial area."
        : degenerate,
      latex: String.raw`\mathbf n=\mathbf a\times\mathbf b=\begin{vmatrix}\mathbf i&\mathbf j&\mathbf k\\${model.a.join("&")}\\${model.b.join("&")}\end{vmatrix}=${n}`,
    },
    {
      description: model.hasNormal
        ? zh
          ? "右手手指由 a 捲向 b，拇指指向 n；三維中 n 與兩邊正交，投影角未必是直角。"
          : "Curl the right-hand fingers from a toward b; the thumb points along n. The normal is orthogonal to both sides in 3D, though projected angles need not be right angles."
        : zh
          ? "零叉積與兩向量的點積皆為零，但零向量沒有方向，不能作為平面的法向方向。"
          : "The zero cross product has zero dot product with both inputs, but the zero vector has no direction and cannot define a normal direction.",
      latex: String.raw`\mathbf n\cdot\mathbf a=${model.dotA},\qquad\mathbf n\cdot\mathbf b=${model.dotB}`,
    },
    {
      description: model.hasNormal
        ? zh
          ? "精確結果：叉積的模等於面積。虛線是交換次序後的 −n；可按「交換 a、b」比較方向反轉。"
          : "Exact result: the cross-product magnitude equals the area. The dashed vector is −n after reversing the order; use Swap a, b to compare the reversed direction."
        : zh
          ? "精確結果：面積與叉積均為零。交换次序仍為零，不會產生法向方向。"
          : "Exact result: the area and cross product are zero. Swapping the order still gives zero, not a normal direction.",
      latex: String.raw`\begin{aligned}\mathbf a\times\mathbf b&=${n}\\\|\mathbf a\times\mathbf b\|=S&=${model.areaLatex}\\\mathbf b\times\mathbf a=-\mathbf n&=${opposite}\end{aligned}`,
    },
  ];
}

/** Equal foreshortening of the three orthogonal 3D axes. No 2D cross calculation. */
export function projectIsometric3(vector: Vector3): Point2 {
  finiteVector(vector);
  const x = (Math.sqrt(3) / 2) * (vector[0] - vector[1]);
  const y = (vector[0] + vector[1]) / 2 - vector[2];
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new RangeError("Projection overflowed.");
  return [x, y];
}

function clampProgress(progress: number): number {
  return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
}

export interface CrossProductGeometry {
  origin: Point2;
  aTip: Point2;
  bTip: Point2;
  normalTip: Point2;
  oppositeTip: Point2;
  polygon: Point2[];
  translatedBStart: Point2;
  translatedBEnd: Point2;
  axes: Point2[];
  curl: Point2[];
  normalProgress: number;
  oppositeProgress: number;
  areaProgress: number;
}

/** Every moving point is derived solely from the shared player's stage/progress. */
export function crossProductGeometry(
  model: CrossProductModel,
  frame: KnowledgeFrame
): CrossProductGeometry {
  const stage = Number.isFinite(frame.stage)
    ? Math.max(0, Math.min(4, Math.floor(frame.stage)))
    : 0;
  const progress = clampProgress(frame.progress);
  const reveal = (step: number) =>
    stage > step ? 1 : stage === step ? progress : 0;
  const vectorProgress = reveal(0);
  const areaProgress = reveal(1);
  const normalProgress = reveal(2);
  const curlProgress = reveal(3);
  const oppositeProgress = reveal(4);
  const axes3: Vector3[] = [
    [1.3, 0, 0],
    [0, 1.3, 0],
    [0, 0, 1.3],
  ];
  const bounds = [
    [0, 0, 0] as Vector3,
    model.a,
    model.b,
    addVectors(model.a, model.b),
    model.normal,
    model.swappedNormal,
    ...axes3,
  ].map(projectIsometric3);
  const minX = Math.min(...bounds.map(point => point[0]));
  const maxX = Math.max(...bounds.map(point => point[0]));
  const minY = Math.min(...bounds.map(point => point[1]));
  const maxY = Math.max(...bounds.map(point => point[1]));
  const scale = Math.min(
    420 / Math.max(1, maxX - minX),
    230 / Math.max(1, maxY - minY),
    115
  );
  const origin: Point2 = [
    280 - (scale * (maxX + minX)) / 2,
    170 - (scale * (maxY + minY)) / 2,
  ];
  const screen = (vector: Vector3): Point2 => {
    const projected = projectIsometric3(vector);
    return [origin[0] + scale * projected[0], origin[1] + scale * projected[1]];
  };
  // Sweep along a: b remains the moving side and the two copied edges meet at a+b.
  const movingA = scaleVector(model.a, areaProgress);
  const curl: Point2[] = [];
  if (model.hasNormal && curlProgress > 0) {
    const aLength = Math.sqrt(dotProduct3(model.a, model.a));
    const bLength = Math.sqrt(dotProduct3(model.b, model.b));
    const u = scaleVector(model.a, 1 / aLength);
    const cosine = Math.max(
      -1,
      Math.min(1, dotProduct3(model.a, model.b) / (aLength * bLength))
    );
    const angle = Math.acos(cosine);
    const inPlane = addVectors(
      scaleVector(model.b, 1 / bLength),
      scaleVector(u, -cosine)
    );
    const v = scaleVector(
      inPlane,
      1 / Math.sqrt(dotProduct3(inPlane, inPlane))
    );
    const radius = 0.48 * Math.min(aLength, bLength);
    for (let index = 0; index <= 32; index++) {
      const theta = (angle * curlProgress * index) / 32;
      curl.push(
        screen(
          scaleVector(
            addVectors(
              scaleVector(u, Math.cos(theta)),
              scaleVector(v, Math.sin(theta))
            ),
            radius
          )
        )
      );
    }
  }
  return {
    origin,
    aTip: screen(scaleVector(model.a, vectorProgress)),
    bTip: screen(scaleVector(model.b, vectorProgress)),
    normalTip: screen(scaleVector(model.normal, normalProgress)),
    oppositeTip: screen(scaleVector(model.swappedNormal, oppositeProgress)),
    polygon: [
      screen([0, 0, 0]),
      screen(movingA),
      screen(addVectors(movingA, model.b)),
      screen(model.b),
    ],
    translatedBStart: screen(movingA),
    translatedBEnd: screen(addVectors(movingA, model.b)),
    axes: axes3.map(screen),
    curl,
    normalProgress,
    oppositeProgress,
    areaProgress,
  };
}

function pointsAttribute(points: readonly Point2[]): string {
  return points.map(point => point.join(",")).join(" ");
}

const VECTOR_A_COLOR = "#2563eb";
const VECTOR_B_COLOR = "#0d9488";
const NORMAL_COLOR = "#d97706";
const CURL_COLOR = "#a855f7";

export default function CrossProductDiagram({
  lang,
  variant = "vec-cross",
}: KnowledgeDiagramProps) {
  const zh = lang === "zh";
  const [presetId, setPresetId] = useState<CrossProductPresetId>("basis");
  const [swapped, setSwapped] = useState(false);
  const id = `cross-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const preset =
    CROSS_PRODUCT_PRESETS.find(item => item.id === presetId) ??
    CROSS_PRODUCT_PRESETS[0];
  const model = createCrossProductModel(
    swapped ? preset.b : preset.a,
    swapped ? preset.a : preset.b
  );
  const steps = crossProductSteps(model, lang);
  const coordinates = (vector: Vector3) => `(${vector.join(", ")})`;
  const controls = (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="flex min-h-10 items-center gap-2">
        <span>{zh ? "數值示範" : "Numerical demo"}</span>
        <select
          aria-label={zh ? "叉積示範預設" : "Cross-product demo preset"}
          value={presetId}
          onChange={event => {
            setPresetId(event.target.value as CrossProductPresetId);
            setSwapped(false);
          }}
          className="max-w-full rounded-md border border-border bg-card px-2 py-2 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {CROSS_PRODUCT_PRESETS.map(item => (
            <option key={item.id} value={item.id}>
              {zh ? item.zh : item.en}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-pressed={swapped}
        onClick={() => setSwapped(value => !value)}
        className="min-h-10 rounded-lg border border-border bg-card px-3 py-2 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.97]"
      >
        {zh ? "交換 a、b" : "Swap a, b"}
      </button>
    </div>
  );
  return (
    <AnimatedKnowledgeLesson
      key={`${variant}:${presetId}:${swapped}`}
      lang={lang}
      title={zh ? "叉積：面積與法向方向" : "Cross product: area and normal"}
      steps={steps}
      controls={controls}
      testId="knowledge-cross-product"
    >
      {frame => {
        const geometry = crossProductGeometry(model, frame);
        const stage = frame.stage;
        const line = (start: Point2, end: Point2) => ({
          x1: start[0],
          y1: start[1],
          x2: end[0],
          y2: end[1],
        });
        const title = zh
          ? "三維叉積的等角投影"
          : "Isometric projection of a 3D cross product";
        const description = zh
          ? `a=${coordinates(model.a)}，b=${coordinates(model.b)}；n=${coordinates(model.normal)}。空間面積為 ${model.areaText}。${model.hasNormal ? "紫色曲線由 a 捲向 b，橙色箭頭為右手拇指方向。" : "叉積為零，沒有法向方向。"}`
          : `a=${coordinates(model.a)}, b=${coordinates(model.b)}; n=${coordinates(model.normal)}. Spatial area is ${model.areaText}. ${model.hasNormal ? "The purple curl runs from a to b; the orange arrow is the right-hand thumb direction." : "The cross product is zero; no normal direction exists."}`;
        return (
          <div className="space-y-2 p-2 sm:p-3" data-variant="vec-cross">
            <p className="text-xs text-muted-foreground">
              {zh
                ? "三維座標的等角二維投影（非二維叉積）"
                : "Isometric 2D display of 3D coordinates (not a 2D cross product)"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-foreground">
              <span>
                <span style={{ color: VECTOR_A_COLOR }}>a</span> ={" "}
                {coordinates(model.a)}
              </span>
              <span>
                <span style={{ color: VECTOR_B_COLOR }}>b</span> ={" "}
                {coordinates(model.b)}
              </span>
              {stage >= 2 && (
                <span>
                  <span style={{ color: NORMAL_COLOR }}>n</span> ={" "}
                  {coordinates(model.normal)}
                </span>
              )}
            </div>
            <svg
              viewBox="0 0 560 340"
              width="100%"
              className="block h-auto text-foreground"
              role="img"
              aria-labelledby={`${id}-title ${id}-desc`}
            >
              <title id={`${id}-title`}>{title}</title>
              <desc id={`${id}-desc`}>{description}</desc>
              <defs>
                {[
                  ["a", VECTOR_A_COLOR],
                  ["b", VECTOR_B_COLOR],
                  ["n", NORMAL_COLOR],
                  ["curl", CURL_COLOR],
                ].map(([name, color]) => (
                  <marker
                    key={name}
                    id={`${id}-${name}`}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 Z" fill={color} />
                  </marker>
                ))}
              </defs>
              {geometry.axes.map((end, index) => (
                <g key={index} opacity="0.5">
                  <line
                    {...line(geometry.origin, end)}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 5"
                  />
                  <text
                    x={end[0] + 8}
                    y={end[1] - 5}
                    fill="currentColor"
                    fontSize="18"
                  >
                    {["x", "y", "z"][index]}
                  </text>
                </g>
              ))}
              {stage >= 1 && (
                <g opacity={Math.min(1, geometry.areaProgress * 3)}>
                  <polygon
                    points={pointsAttribute(geometry.polygon)}
                    fill={VECTOR_B_COLOR}
                    fillOpacity="0.14"
                    stroke={VECTOR_B_COLOR}
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                  <line
                    {...line(
                      geometry.translatedBStart,
                      geometry.translatedBEnd
                    )}
                    stroke={VECTOR_B_COLOR}
                    strokeWidth="3"
                    markerEnd={
                      model.b.some(value => value !== 0)
                        ? `url(#${id}-b)`
                        : undefined
                    }
                  />
                  <circle
                    cx={geometry.translatedBEnd[0]}
                    cy={geometry.translatedBEnd[1]}
                    r="3"
                    fill={VECTOR_B_COLOR}
                  />
                </g>
              )}
              <line
                {...line(geometry.origin, geometry.aTip)}
                stroke={VECTOR_A_COLOR}
                strokeWidth="4"
                strokeLinecap="round"
                markerEnd={
                  model.a.some(value => value !== 0) &&
                  (stage > 0 || frame.progress > 0)
                    ? `url(#${id}-a)`
                    : undefined
                }
              />
              <line
                {...line(geometry.origin, geometry.bTip)}
                stroke={VECTOR_B_COLOR}
                strokeWidth="4"
                strokeLinecap="round"
                markerEnd={
                  model.b.some(value => value !== 0) &&
                  (stage > 0 || frame.progress > 0)
                    ? `url(#${id}-b)`
                    : undefined
                }
              />
              <text
                x={geometry.aTip[0] + 12}
                y={geometry.aTip[1] + 20}
                fill={VECTOR_A_COLOR}
                fontSize="21"
                fontWeight="600"
              >
                a{model.a.every(value => value === 0) ? " = 0" : ""}
              </text>
              <text
                x={geometry.bTip[0] - 12}
                y={geometry.bTip[1] + 25}
                textAnchor="end"
                fill={VECTOR_B_COLOR}
                fontSize="21"
                fontWeight="600"
              >
                b{model.b.every(value => value === 0) ? " = 0" : ""}
              </text>
              {model.hasNormal && geometry.normalProgress > 0 && (
                <g>
                  <line
                    {...line(geometry.origin, geometry.normalTip)}
                    stroke={NORMAL_COLOR}
                    strokeWidth="4"
                    strokeLinecap="round"
                    markerEnd={`url(#${id}-n)`}
                  />
                  <text
                    x={geometry.normalTip[0] + 12}
                    y={geometry.normalTip[1] - 8}
                    fill={NORMAL_COLOR}
                    fontSize="21"
                    fontWeight="600"
                  >
                    n
                  </text>
                </g>
              )}
              {geometry.curl.length > 1 && (
                <polyline
                  points={pointsAttribute(geometry.curl)}
                  fill="none"
                  stroke={CURL_COLOR}
                  strokeWidth="3"
                  strokeLinecap="round"
                  markerEnd={`url(#${id}-curl)`}
                />
              )}
              {model.hasNormal && geometry.oppositeProgress > 0 && (
                <g opacity="0.6">
                  <line
                    {...line(geometry.origin, geometry.oppositeTip)}
                    stroke={NORMAL_COLOR}
                    strokeWidth="2.5"
                    strokeDasharray="6 5"
                    markerEnd={`url(#${id}-n)`}
                  />
                  <text
                    x={geometry.oppositeTip[0] + 10}
                    y={geometry.oppositeTip[1] + 22}
                    fill={NORMAL_COLOR}
                    fontSize="20"
                  >
                    −n
                  </text>
                </g>
              )}
              <circle
                cx={geometry.origin[0]}
                cy={geometry.origin[1]}
                r="4"
                fill="currentColor"
              />
              <text
                x={geometry.origin[0] + 9}
                y={geometry.origin[1] - 9}
                fill="currentColor"
                fontSize="17"
              >
                O
              </text>
              {stage >= 2 && !model.hasNormal && (
                <text
                  x="280"
                  y="320"
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="20"
                >
                  {zh ? "n = 0：沒有法向方向" : "n = 0: no normal direction"}
                </text>
              )}
            </svg>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {stage >= 1 && (
                <span>
                  {zh ? "空間面積" : "Spatial area"}: S = {model.areaText}
                </span>
              )}
              {stage >= 3 && model.hasNormal && (
                <span style={{ color: CURL_COLOR }}>
                  {zh ? "右手捲向：a → b" : "Right-hand curl: a → b"}
                </span>
              )}
              {stage >= 4 && model.hasNormal && (
                <span>{zh ? "虛線：b × a = −n" : "Dashed: b × a = −n"}</span>
              )}
            </div>
          </div>
        );
      }}
    </AnimatedKnowledgeLesson>
  );
}
