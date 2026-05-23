/**
 * PracticePanel.tsx
 * Shared practice mode component used across all calculator pages.
 * Generates random questions, accepts student answers, and provides immediate feedback.
 */
import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import KatexRenderer from "@/components/KatexRenderer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RefreshCw, Eye, EyeOff } from "lucide-react";

export interface PracticeQuestion {
  /** LaTeX string for the question prompt */
  questionLatex: string;
  /** Human-readable hint about what to enter */
  inputHint: string;
  /** Expected answer as a string (for display) */
  answerDisplay: string;
  /** LaTeX for the expected answer */
  answerLatex: string;
  /** Function to check student's raw text input */
  checkAnswer: (input: string) => boolean;
  /** Optional step-by-step explanation */
  solutionLatex?: string;
}

interface PracticePanelProps {
  /** Function that returns a new random question */
  generateQuestion: () => PracticeQuestion;
  /** Module label for display */
  moduleLabel?: string;
}

export default function PracticePanel({ generateQuestion, moduleLabel }: PracticePanelProps) {
  const { t, lang } = useLanguage();

  const [question, setQuestion] = useState<PracticeQuestion>(() => generateQuestion());
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleNewQuestion = useCallback(() => {
    setQuestion(generateQuestion());
    setUserInput("");
    setFeedback(null);
    setShowAnswer(false);
    setAttempts(0);
  }, [generateQuestion]);

  function handleCheck() {
    const trimmed = userInput.trim();
    if (!trimmed) return;
    setAttempts((a) => a + 1);
    if (question.checkAnswer(trimmed)) {
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCheck();
    }
  }

  return (
    <div className="space-y-5">
      {/* Question card */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
        {moduleLabel && (
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
            {moduleLabel}
          </p>
        )}
        <p className="text-sm font-semibold text-foreground mb-3">
          {lang === "zh" ? "題目：" : "Question:"}
        </p>
        <div className="overflow-x-auto">
          <KatexRenderer latex={question.questionLatex} displayMode={true} />
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          {lang === "zh" ? "你的答案：" : "Your Answer:"}
        </label>
        <p className="text-xs text-muted-foreground">{question.inputHint}</p>
        <textarea
          value={userInput}
          onChange={(e) => {
            setUserInput(e.target.value);
            setFeedback(null);
          }}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder={lang === "zh" ? "在此輸入答案..." : "Enter your answer here..."}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            resize-none transition-colors"
        />
      </div>

      {/* Feedback */}
      {feedback === "correct" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-semibold">{t.practiceCorrectMsg}</p>
        </div>
      )}
      {feedback === "incorrect" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{t.practiceIncorrectMsg}
            {attempts >= 2 && (
              <span className="ml-2 opacity-70">
                ({lang === "zh" ? `已嘗試 ${attempts} 次` : `${attempts} attempts`})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleCheck}
          disabled={!userInput.trim() || feedback === "correct"}
          className="font-mono"
        >
          {t.checkAnswer}
        </Button>
        <Button
          variant="outline"
          onClick={handleNewQuestion}
          className="font-mono gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t.newQuestion}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAnswer((v) => !v)}
          className="font-mono gap-1.5"
        >
          {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showAnswer ? (lang === "zh" ? "隱藏答案" : "Hide Answer") : t.showAnswer}
        </Button>
      </div>

      {/* Show answer */}
      {showAnswer && (
        <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-2">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide font-mono">
            {lang === "zh" ? "參考答案" : "Reference Answer"}
          </p>
          <div className="overflow-x-auto">
            <KatexRenderer latex={question.answerLatex} displayMode={true} />
          </div>
          {question.solutionLatex && (
            <div className="mt-2 pt-2 border-t border-border overflow-x-auto">
              <p className="text-xs text-muted-foreground mb-1">
                {lang === "zh" ? "解題過程：" : "Solution:"}
              </p>
              <KatexRenderer latex={question.solutionLatex} displayMode={true} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
