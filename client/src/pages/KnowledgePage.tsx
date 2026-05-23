import { useState } from "react";
import { knowledgeTopics, type KnowledgeItemData, type KnowledgeTopicData } from "@/lib/knowledgeData";
import KatexRenderer from "@/components/KatexRenderer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Grid3X3, Sigma, ArrowRight, Search, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface KnowledgePageProps {
  lang: "zh" | "en";
}

const topicIcons: Record<string, React.ReactNode> = {
  matrix: <Grid3X3 className="w-5 h-5" />,
  "linear-system": <Sigma className="w-5 h-5" />,
  vector: <ArrowRight className="w-5 h-5" />,
};

const topicColors: Record<string, string> = {
  matrix: "bg-blue-50 border-blue-200 text-blue-800",
  "linear-system": "bg-green-50 border-green-200 text-green-800",
  vector: "bg-purple-50 border-purple-200 text-purple-800",
};

const topicBadgeColors: Record<string, string> = {
  matrix: "bg-blue-100 text-blue-700 border-blue-200",
  "linear-system": "bg-green-100 text-green-700 border-green-200",
  vector: "bg-purple-100 text-purple-700 border-purple-200",
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

  const title = lang === "zh" ? item.titleZh : item.titleEn;
  const description = lang === "zh" ? item.descriptionZh : item.descriptionEn;
  const example = lang === "zh" ? item.exampleZh : item.exampleEn;

  return (
    <Card
      className={`border cursor-pointer transition-all duration-200 hover:shadow-md ${topicColors[topicSlug] || "bg-gray-50 border-gray-200"}`}
      onClick={() => setExpanded((e) => !e)}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug">
            {title}
          </CardTitle>
          <div className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
        {item.formula && (
          <div className="mt-2 overflow-x-auto">
            <KatexRenderer latex={item.formula} displayMode={false} />
          </div>
        )}
      </CardHeader>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <p className="text-sm leading-relaxed">{description}</p>
              {example && (
                <div className="rounded-md bg-white/70 border border-current/20 p-3">
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {lang === "zh" ? "例子" : "Example"}
                  </p>
                  <div className="overflow-x-auto">
                    <KatexRenderer latex={example} displayMode={true} />
                  </div>
                </div>
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

  const filteredItems = topic.items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.titleZh.toLowerCase().includes(q) ||
      item.titleEn.toLowerCase().includes(q) ||
      item.descriptionZh.toLowerCase().includes(q) ||
      item.descriptionEn.toLowerCase().includes(q)
    );
  });

  if (filteredItems.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${topicBadgeColors[topic.slug]}`}>
          {topicIcons[topic.slug]}
        </div>
        <h2 className="text-xl font-bold">{topicTitle}</h2>
        <Badge variant="outline" className={`ml-auto text-xs ${topicBadgeColors[topic.slug]}`}>
          {filteredItems.length} {lang === "zh" ? "個概念" : "concepts"}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <KnowledgeCard key={item.id} item={item} topicSlug={topic.slug} lang={lang} />
        ))}
      </div>
    </section>
  );
}

export default function KnowledgePage({ lang }: KnowledgePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const totalConcepts = knowledgeTopics.reduce((s, t) => s + t.items.length, 0);

  const filteredTopics =
    activeFilter === "all"
      ? knowledgeTopics
      : knowledgeTopics.filter((t) => t.slug === activeFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">
            {lang === "zh" ? "知識點庫" : "Knowledge Base"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {lang === "zh"
            ? `共 ${totalConcepts} 個線性代數核心概念，點擊卡片展開詳細說明與例子`
            : `${totalConcepts} core linear algebra concepts — click any card to expand details and examples`}
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={lang === "zh" ? "搜尋概念..." : "Search concepts..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { slug: "all", zh: "全部", en: "All" },
            ...knowledgeTopics.map((t) => ({ slug: t.slug, zh: t.titleZh, en: t.titleEn })),
          ].map((f) => (
            <button
              key={f.slug}
              onClick={() => setActiveFilter(f.slug)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 active:scale-95 ${
                activeFilter === f.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent"
              }`}
            >
              {lang === "zh" ? f.zh : f.en}
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="space-y-10">
        {filteredTopics.map((topic) => (
          <TopicSection
            key={topic.slug}
            topic={topic}
            lang={lang}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredTopics.every((t) =>
        t.items.every((item) => {
          if (!searchQuery) return false;
          const q = searchQuery.toLowerCase();
          return (
            !item.titleZh.toLowerCase().includes(q) &&
            !item.titleEn.toLowerCase().includes(q) &&
            !item.descriptionZh.toLowerCase().includes(q) &&
            !item.descriptionEn.toLowerCase().includes(q)
          );
        })
      ) && searchQuery && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{lang === "zh" ? "找不到相關概念" : "No matching concepts found"}</p>
        </div>
      )}
    </div>
  );
}
