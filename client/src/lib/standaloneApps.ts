export type StandaloneAppId = "systems-of-equations" | "matrices" | "vector";

export type StandaloneAppIcon =
  | "Sigma"
  | "Grid3X3"
  | "Compass"
  | "Sparkles"
  | "Zap"
  | "Move"
  | "Triangle"
  | "GraduationCap"
  | "BookOpen";

/** Paths are local to the app's Wouter base, including vector tab queries. */
export interface StandaloneAppRoute {
  path: string;
  labelZh: string;
  labelEn: string;
  icon: StandaloneAppIcon;
}

export interface StandaloneAppConfig {
  id: StandaloneAppId;
  titleZh: string;
  titleEn: string;
  shortZh: string;
  shortEn: string;
  mark: string;
  formula: string;
  topicSlugs: string[];
  primaryPath: "/system" | "/matrix" | "/vector";
  routes: StandaloneAppRoute[];
}

/** Shared metadata only: no dependency on the integrated shell or calculators. */
export const standaloneApps: Record<StandaloneAppId, StandaloneAppConfig> = {
  "systems-of-equations": {
    id: "systems-of-equations",
    titleZh: "聯立方程實驗室",
    titleEn: "Systems of Equations Lab",
    shortZh: "聯立方程",
    shortEn: "Linear systems",
    mark: "Σ",
    formula: "Ax = b",
    topicSlugs: ["linear-system"],
    primaryPath: "/system",
    routes: [
      {
        path: "/system",
        labelZh: "聯立方程",
        labelEn: "Linear systems",
        icon: "Sigma",
      },
      {
        path: "/knowledge",
        labelZh: "聯立方程知識",
        labelEn: "Systems knowledge",
        icon: "BookOpen",
      },
    ],
  },
  matrices: {
    id: "matrices",
    titleZh: "矩陣實驗室",
    titleEn: "Matrices Lab",
    shortZh: "矩陣",
    shortEn: "Matrices",
    mark: "A",
    formula: "Av = λv",
    // Eigenvalue and eigenspace concepts belong to the existing matrix topic.
    topicSlugs: ["matrix"],
    primaryPath: "/matrix",
    routes: [
      {
        path: "/matrix",
        labelZh: "矩陣計算",
        labelEn: "Matrices",
        icon: "Grid3X3",
      },
      {
        path: "/eigen",
        labelZh: "特徵值與向量",
        labelEn: "Eigenvalues & vectors",
        icon: "Sparkles",
      },
      {
        path: "/matrix-power",
        labelZh: "矩陣 n 次方",
        labelEn: "Matrix powers",
        icon: "Zap",
      },
      {
        path: "/transformation",
        labelZh: "幾何變換",
        labelEn: "Transformations",
        icon: "Move",
      },
      {
        path: "/knowledge",
        labelZh: "矩陣知識",
        labelEn: "Matrix knowledge",
        icon: "BookOpen",
      },
    ],
  },
  vector: {
    id: "vector",
    titleZh: "向量實驗室",
    titleEn: "Vector Lab",
    shortZh: "向量",
    shortEn: "Vectors",
    mark: "v",
    formula: "a · b = |a||b| cos θ",
    topicSlugs: ["vector"],
    primaryPath: "/vector",
    routes: [
      {
        path: "/vector",
        labelZh: "向量計算",
        labelEn: "Vectors",
        icon: "Compass",
      },
      {
        path: "/vector?tab=spatial",
        labelZh: "直線與平面夾角",
        labelEn: "Lines & planes",
        icon: "Grid3X3",
      },
      {
        path: "/vector?tab=centers",
        labelZh: "三角形中心實驗",
        labelEn: "Triangle centers",
        icon: "Triangle",
      },
      {
        path: "/vector?tab=dse",
        labelZh: "DSE 向量專區",
        labelEn: "DSE vector practice",
        icon: "GraduationCap",
      },
      {
        path: "/knowledge",
        labelZh: "向量知識",
        labelEn: "Vector knowledge",
        icon: "BookOpen",
      },
    ],
  },
};

/** Public deployment base; retain the trailing slash for Vite and app links. */
export function standaloneBase(
  id: StandaloneAppId,
  githubPages = false
): string {
  return `${githubPages ? "/linear-algebra-lab" : ""}/apps/${id}/`;
}

/** Independent preferences even when all apps share a deployment origin. */
export function standaloneLanguageKey(id: StandaloneAppId): string {
  return `linear-algebra-lab-${id}-language`;
}

/**
 * Check an app-local pathname, not a public URL or deployment-prefixed path.
 * Every app owns its calculator at `/`; query/hash do not change route ownership.
 * Exact matching deliberately denies known cross-topic routes and child paths.
 */
export function standaloneOwnsPath(id: StandaloneAppId, path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  return (
    pathname === "/" ||
    standaloneApps[id].routes.some(
      route => route.path.split(/[?#]/, 1)[0] === pathname
    )
  );
}
