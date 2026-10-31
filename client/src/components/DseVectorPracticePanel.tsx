import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import KatexRenderer from "@/components/KatexRenderer";
import { getDseVectorPracticeQuestions, type DseVectorTopic } from "@/lib/dseVectorPractice";
import { useLanguage } from "@/contexts/LanguageContext";

const TOPICS: DseVectorTopic[] = ["2d", "3d", "centers"];

export default function DseVectorPracticePanel() {
  const { lang } = useLanguage();
  const questions = useMemo(() => getDseVectorPracticeQuestions(lang), [lang]);
  const [topic, setTopic] = useState<DseVectorTopic>("2d");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const filteredQuestions = useMemo(
    () => questions.filter((question) => question.topic === topic),
    [questions, topic]
  );
  const currentQuestion = filteredQuestions[questionIndex % filteredQuestions.length];

  useEffect(() => {
    setQuestionIndex(0);
    setUserInput("");
    setFeedback(null);
    setShowAnswer(false);
    setAttempts(0);
  }, [topic, lang]);

  const topicLabel = (value: DseVectorTopic) => {
    if (value === "2d") return lang === "zh" ? "2D 向量" : "2D Vectors";
    if (value === "3d") return lang === "zh" ? "3D 向量" : "3D Vectors";
    return lang === "zh" ? "三角形四心" : "Triangle Centers";
  };

  function resetAttempt() {
    setUserInput("");
    setFeedback(null);
    setShowAnswer(false);
    setAttempts(0);
  }

  function selectTopic(value: DseVectorTopic) {
    setTopic(value);
  }

  function nextQuestion() {
    setQuestionIndex((index) => (index + 1) % filteredQuestions.length);
    resetAttempt();
  }

  function checkAnswer() {
    const answer = userInput.trim();
    if (!answer) return;
    setAttempts((count) => count + 1);
    setFeedback(currentQuestion.checkAnswer(answer) ? "correct" : "incorrect");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">
          {lang === "zh" ? "DSE Style 向量與四心題組" : "DSE-Style Vectors & Triangle Centres"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {lang === "zh"
            ? "原創練習題按香港 DSE 的題幹、給分與推理風格編寫，涵蓋平面／空間向量和三角形四心；並非官方 HKEAA 歷屆試題。"
            : "Original practice questions written in a Hong Kong DSE-style format, with marks and reasoning for plane/space vectors and triangle centres. They are not official HKEAA past-paper questions."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label={lang === "zh" ? "選擇題目分類" : "Choose question topic"}>
        {TOPICS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => selectTopic(value)}
            className={`rounded-md border px-3 py-1.5 text-xs font-mono font-semibold transition-all duration-150 ${
              topic === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary"
            }`}
          >
            {topicLabel(value)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-1 text-[11px] font-bold tracking-wider text-primary">
              DSE STYLE
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {lang === "zh" ? `${currentQuestion.marks} 分` : `${currentQuestion.marks} marks`}
            </span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {lang === "zh" ? `題目 ${questionIndex + 1} / ${filteredQuestions.length}` : `Question ${questionIndex + 1} / ${filteredQuestions.length}`}
          </span>
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {lang === "zh" ? `考核重點：${currentQuestion.skillZh}` : `Assessment focus: ${currentQuestion.skillEn}`}
        </p>
        <div className="overflow-x-auto">
          <KatexRenderer latex={currentQuestion.questionLatex} displayMode={true} />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="dse-answer" className="block text-sm font-medium text-foreground">
          {lang === "zh" ? "你的答案：" : "Your answer:"}
        </label>
        <p className="text-xs text-muted-foreground">{currentQuestion.inputHint}</p>
        <textarea
          id="dse-answer"
          value={userInput}
          onChange={(event) => {
            setUserInput(event.target.value);
            setFeedback(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              checkAnswer();
            }
          }}
          rows={2}
          placeholder={lang === "zh" ? "在此輸入答案…" : "Enter your answer here…"}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {feedback === "correct" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm font-semibold">{lang === "zh" ? "答案正確。繼續挑戰下一題！" : "Correct. Move on to the next question!"}</p>
        </div>
      )}
      {feedback === "incorrect" && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">
            {lang === "zh" ? "未正確，請檢查運算及答案格式。" : "Not quite. Check your working and answer format."}
            {attempts >= 2 && <span className="ml-2 opacity-70">({lang === "zh" ? `已嘗試 ${attempts} 次` : `${attempts} attempts`})</span>}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={checkAnswer} disabled={!userInput.trim() || feedback === "correct"} className="font-mono">
          {lang === "zh" ? "核對答案" : "Check Answer"}
        </Button>
        <Button variant="outline" onClick={nextQuestion} className="gap-1.5 font-mono">
          <RefreshCw className="h-3.5 w-3.5" />
          {lang === "zh" ? "下一題" : "Next Question"}
        </Button>
        <Button variant="outline" onClick={() => setShowAnswer((value) => !value)} className="gap-1.5 font-mono">
          {showAnswer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showAnswer ? (lang === "zh" ? "隱藏評分方案" : "Hide Mark Scheme") : (lang === "zh" ? "顯示評分方案" : "Show Mark Scheme")}
        </Button>
      </div>

      {showAnswer && (
        <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {lang === "zh" ? "參考答案與評分步驟" : "Reference Answer & Mark Scheme"}
          </p>
          <div className="overflow-x-auto">
            <KatexRenderer latex={currentQuestion.answerLatex} displayMode={true} />
          </div>
          {currentQuestion.solutionLatex && (
            <div className="overflow-x-auto border-t border-border pt-3">
              <KatexRenderer latex={currentQuestion.solutionLatex} displayMode={true} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
