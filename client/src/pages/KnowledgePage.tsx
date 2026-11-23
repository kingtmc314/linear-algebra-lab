import { useId, useMemo, useState } from "react";
import {
  type KnowledgeItemData,
  type KnowledgeTopicData,
} from "@/lib/knowledgeData";
import {
  buildKnowledgeLesson,
  matchesKnowledgeQuery,
  phase20KnowledgeTopics,
} from "@/lib/Phase20knowledge";
import KatexRenderer from "@/components/KatexRenderer";
import StepDisplay from "@/components/StepDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Grid3X3,
  Sigma,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

interface KnowledgePageProps {
  lang: "zh" | "en";
}

const topicIcons: Record<string, React.ReactNode> = {
  matrix: <Grid3X3 className="w-5 h-5" />,
  "linear-system": <Sigma className="w-5 h-5" />,
  vector: <ArrowRight className="w-5 h-5" />,
};

function KnowledgeCard({
  item,
  topicSlug,
  lang,
}: {
  item: KnowledgeItemData;
  topicSlug: string;
  lang: "zh" | "en";
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const headingId = useId();
  const lesson = useMemo(() => buildKnowledgeLesson(item, lang), [item, lang]);
  const title = lang === "zh" ? item.titleZh : item.titleEn;
  const isSpatialAngle =
    item.id === "vec-plane-plane-angle" || item.id === "vec-line-plane-angle";

  return (
    <Card
      className={`min-w-0 border bg-card text-card-foreground transition-shadow duration-200 hover:shadow-md ${expanded ? "sm:col-span-2 xl:col-span-3 border-primary/40 shadow-sm" : "border-border"}`}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base font-semibold leading-snug">
          <button
            type="button"
            id={headingId}
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded(value => !value)}
            className="flex w-full items-start justify-between gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="min-w-0">{title}</span>
            <span className="shrink-0 pt-0.5 text-primary" aria-hidden="true">
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>
        </CardTitle>
        {item.formula && (
          <div className="mt-2 max-w-full overflow-x-auto py-1 text-sm">
            <KatexRenderer latex={item.formula} displayMode={false} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {lang === "zh"
            ? "變數與條件 · 公式講解 · 例子逐步播放"
            : "Variables & conditions · Formula walkthrough · Example playback"}
        </p>
      </CardHeader>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            id={contentId}
            role="region"
            aria-labelledby={headingId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <CardContent className="px-4 pb-4 pt-0 space-y-4">
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm leading-relaxed text-foreground">
                {lang === "zh"
                  ? "先認識符號與適用條件，再播放公式及例子。定義卡呈現教學順序；計算卡逐步顯示經核對的運算，不把定義冒充推導。"
                  : "Start with symbols and conditions, then play the formula and example. Definition cards present a teaching sequence; calculation cards show reviewed arithmetic steps, not a claimed derivation of a definition."}
              </div>
              <div
                className={`grid min-w-0 gap-4 ${lesson.exampleSteps.length > 0 ? "lg:grid-cols-2" : ""}`}
              >
                <div className="min-w-0">
                  <StepDisplay
                    steps={lesson.conceptSteps}
                    title={
                      lang === "zh"
                        ? "概念：變數 → 公式 → 解釋"
                        : "Concept: variables → formula → explanation"
                    }
                  />
                </div>
                {lesson.exampleSteps.length > 0 && (
                  <div className="min-w-0">
                    <StepDisplay
                      steps={lesson.exampleSteps}
                      title={
                        lang === "zh"
                          ? "例子：逐步演算與原例對照"
                          : "Example: worked steps & original summary"
                      }
                    />
                  </div>
                )}
              </div>
              {topicSlug === "vector" && isSpatialAngle && (
                <Link
                  href="/vector?tab=spatial"
                  className="inline-flex max-w-full items-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>
                    {lang === "zh"
                      ? "前往空間向量工具，探索直線與平面"
                      : "Explore lines and planes in the spatial vector tool"}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function TopicSection({
  topic,
  lang,
  searchQuery,
}: {
  topic: KnowledgeTopicData;
  lang: "zh" | "en";
  searchQuery: string;
}) {
  const topicTitle = lang === "zh" ? topic.titleZh : topic.titleEn;
  const filteredItems = topic.items.filter(item =>
    matchesKnowledgeQuery(item, searchQuery)
  );
  if (filteredItems.length === 0) return null;

  return (
    <section
      className="space-y-3"
      aria-labelledby={`knowledge-topic-${topic.slug}`}
    >
      <div className="flex items-center gap-2">
        <div
          className="rounded-md border border-primary/15 bg-primary/10 p-1.5 text-primary"
          aria-hidden="true"
        >
          {topicIcons[topic.slug]}
        </div>
        <h2 id={`knowledge-topic-${topic.slug}`} className="text-xl font-bold">
          {topicTitle}
        </h2>
        <Badge
          variant="outline"
          className="ml-auto shrink-0 border-primary/20 bg-primary/5 text-xs text-primary"
        >
          {filteredItems.length} {lang === "zh" ? "個概念" : "concepts"}
        </Badge>
      </div>
      <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map(item => (
          <KnowledgeCard
            key={item.id}
            item={item}
            topicSlug={topic.slug}
            lang={lang}
          />
        ))}
      </div>
    </section>
  );
}

export default function KnowledgePage({ lang }: KnowledgePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const totalConcepts = phase20KnowledgeTopics.reduce(
    (sum, topic) => sum + topic.items.length,
    0
  );
  const filteredTopics =
    activeFilter === "all"
      ? phase20KnowledgeTopics
      : phase20KnowledgeTopics.filter(topic => topic.slug === activeFilter);
  const matchingConcepts = filteredTopics.reduce(
    (sum, topic) =>
      sum +
      topic.items.filter(item => matchesKnowledgeQuery(item, searchQuery))
        .length,
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen
            className="w-6 h-6 shrink-0 text-primary"
            aria-hidden="true"
          />
          <h1 className="text-3xl font-bold">
            {lang === "zh" ? "知識點庫" : "Knowledge Base"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {lang === "zh"
            ? `共 ${totalConcepts} 個線性代數核心概念，展開卡片查看變數、條件及可重播的公式與例子`
            : `${totalConcepts} core linear algebra concepts — expand a card for variables, conditions, and replayable formulas and examples`}
        </p>
        <p className="text-sm text-muted-foreground">
          {lang === "zh"
            ? "完整檢視可對照全部步驟；逐步播放可暫停、重播及調整速度。精確分數、根式與特殊角保持原式；近似值一律以 ≈ 標示。"
            : "Compare all steps in the full view, or play them with pause, replay, and speed controls. Exact fractions, radicals, and special angles stay symbolic; approximations are marked ≈."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9 bg-card"
            aria-label={
              lang === "zh"
                ? "搜尋概念、符號或條件"
                : "Search concepts, symbols, or conditions"
            }
            placeholder={
              lang === "zh"
                ? "搜尋概念、符號或條件..."
                : "Search concepts, symbols, or conditions..."
            }
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
        </div>
        <div
          className="flex gap-2 flex-wrap"
          role="group"
          aria-label={lang === "zh" ? "概念分類" : "Concept categories"}
        >
          {[
            { slug: "all", zh: "全部", en: "All" },
            ...phase20KnowledgeTopics.map(topic => ({
              slug: topic.slug,
              zh: topic.titleZh,
              en: topic.titleEn,
            })),
          ].map(filter => (
            <button
              key={filter.slug}
              type="button"
              aria-pressed={activeFilter === filter.slug}
              onClick={() => setActiveFilter(filter.slug)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                activeFilter === filter.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-secondary"
              }`}
            >
              {lang === "zh" ? filter.zh : filter.en}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {lang === "zh"
          ? `顯示 ${matchingConcepts} 個概念`
          : `Showing ${matchingConcepts} concepts`}
      </p>

      <div className="space-y-10">
        {filteredTopics.map(topic => (
          <TopicSection
            key={topic.slug}
            topic={topic}
            lang={lang}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      {matchingConcepts === 0 && searchQuery.trim() && (
        <div className="text-center py-16 text-muted-foreground">
          <Search
            className="w-10 h-10 mx-auto mb-3 opacity-30"
            aria-hidden="true"
          />
          <p>
            {lang === "zh" ? "找不到相關概念" : "No matching concepts found"}
          </p>
        </div>
      )}
    </div>
  );
}
