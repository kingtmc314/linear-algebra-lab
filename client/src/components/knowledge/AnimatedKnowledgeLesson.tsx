import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import KatexRenderer from "@/components/KatexRenderer";
import type { DerivationStep } from "@/lib/derivationPlayback";
import { knowledgeFrameTick } from "@/lib/knowledgePlayback";

export interface KnowledgeDiagramProps {
  lang: "zh" | "en";
  variant?: string;
}
export interface KnowledgeFrame {
  stage: number;
  progress: number;
  playing: boolean;
}
interface LessonProps {
  lang: "zh" | "en";
  title: string;
  steps: DerivationStep[];
  controls?: ReactNode;
  testId: string;
  children: (frame: KnowledgeFrame) => ReactNode;
}

/** A numerical diagram and its current equation share one playback clock. */
export default function AnimatedKnowledgeLesson(props: LessonProps) {
  return (
    <KnowledgePlayer
      key={`${props.lang}:${JSON.stringify(props.steps)}`}
      {...props}
    />
  );
}

function KnowledgePlayer({
  lang,
  title,
  steps,
  controls,
  testId,
  children,
}: LessonProps) {
  const zh = lang === "zh";
  const last = Math.max(0, steps.length - 1);
  const [frame, setFrame] = useState<KnowledgeFrame>({
    stage: last,
    progress: 1,
    playing: false,
  });
  const [settling, setSettling] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState(false);
  const clock = useRef<number | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    const pause = () => {
      if (document.hidden) {
        setFrame(f => ({ ...f, playing: false }));
        setSettling(false);
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);
  useEffect(() => {
    if ((!frame.playing && !settling) || document.hidden) {
      clock.current = null;
      return;
    }
    let request = 0;
    let cancelled = false;
    const tick = (time: number) => {
      if (cancelled) return;
      const delta =
        clock.current === null
          ? 0
          : Math.min(80, Math.max(0, time - clock.current));
      clock.current = time;
      setFrame(previous => knowledgeFrameTick(previous, delta, speed, last));
      request = window.requestAnimationFrame(tick);
    };
    if (reduced) {
      setFrame(previous => ({ ...previous, progress: 1 }));
      if (!frame.playing) {
        setSettling(false);
        return;
      }
      const timer = window.setTimeout(
        () =>
          setFrame(previous =>
            previous.stage < last
              ? { stage: previous.stage + 1, progress: 1, playing: true }
              : { ...previous, playing: false }
          ),
        1800 / speed
      );
      return () => window.clearTimeout(timer);
    }
    request = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(request);
      clock.current = null;
    };
  }, [frame.playing, frame.stage, settling, speed, reduced, last]);
  useEffect(() => {
    if (settling && frame.progress >= 1) setSettling(false);
  }, [settling, frame.progress]);
  const jump = (stage: number) => {
    setFrame({
      stage: Math.max(0, Math.min(last, stage)),
      progress: reduced ? 1 : 0,
      playing: false,
    });
    setSettling(!reduced);
    clock.current = null;
  };
  const toggle = () => {
    setSettling(false);
    clock.current = null;
    setFrame(previous =>
      previous.playing
        ? { ...previous, playing: false }
        : previous.stage === last && previous.progress >= 1
          ? { stage: 0, progress: reduced ? 1 : 0, playing: true }
          : { ...previous, playing: true }
    );
  };
  const step = steps[frame.stage];
  const description =
    step?.description ?? (zh ? step?.descriptionZh : step?.descriptionEn) ?? "";
  return (
    <section
      className="min-w-0 rounded-xl border border-primary/20 bg-background p-3 sm:p-4 space-y-3"
      data-testid={testId}
      data-stage={frame.stage}
      data-progress={frame.progress.toFixed(3)}
      data-playing={frame.playing}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {zh ? "動畫圖解" : "Animated diagram"}
          </p>
          <h3 className="mt-1 text-base font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {frame.stage + 1} / {steps.length}
        </span>
      </div>
      {controls && <div className="min-w-0 space-y-2">{controls}</div>}
      <div className="knowledge-lesson-body">
        <div
          className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
          data-testid="knowledge-animation-scene"
        >
          {children(frame)}
        </div>
        <div className="knowledge-lesson-aside">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={zh ? "圖解播放控制" : "Diagram playback controls"}
          >
            <button
              type="button"
              onClick={toggle}
              aria-label={
                frame.playing
                  ? zh
                    ? "暫停圖解"
                    : "Pause diagram"
                  : zh
                    ? "播放圖解"
                    : "Play diagram"
              }
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              {frame.playing ? <Pause size={14} /> : <Play size={14} />}
              {frame.playing ? (zh ? "暫停" : "Pause") : zh ? "播放" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => jump(0)}
              aria-label={zh ? "重播圖解" : "Replay diagram"}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs"
            >
              <RotateCcw size={14} />
              {zh ? "重播" : "Replay"}
            </button>
            <button
              type="button"
              onClick={() => jump(frame.stage - 1)}
              disabled={frame.stage === 0}
              aria-label={zh ? "圖解上一步" : "Previous diagram step"}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs disabled:opacity-40"
            >
              <SkipBack size={14} />
              <span>{zh ? "上一步" : "Previous"}</span>
            </button>
            <button
              type="button"
              onClick={() => jump(frame.stage + 1)}
              disabled={frame.stage === last}
              aria-label={zh ? "圖解下一步" : "Next diagram step"}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs disabled:opacity-40"
            >
              <SkipForward size={14} />
              <span>{zh ? "下一步" : "Next"}</span>
            </button>
            <label className="inline-flex min-h-10 items-center gap-1.5 text-xs text-muted-foreground">
              {zh ? "速度" : "Speed"}
              <select
                value={speed}
                onChange={e => {
                  setSpeed(Number(e.target.value));
                  clock.current = null;
                }}
                aria-label={zh ? "圖解播放速度" : "Diagram playback speed"}
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
              >
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={2}>2×</option>
              </select>
            </label>
          </div>
          <div
            className="rounded-lg border border-border bg-secondary/30 p-3"
            aria-live="off"
          >
            <p className="text-sm leading-relaxed text-foreground">
              {description}
            </p>
            {step?.latex && (
              <div className="max-w-full overflow-x-auto pt-2">
                <KatexRenderer latex={step.latex} displayMode />
              </div>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {zh
              ? "圖像按步驟連續變化；中間畫面只作示意，精確值以上述公式為準。"
              : "The diagram changes continuously with each step. Intermediate frames are illustrative; the equation states the exact values."}
          </p>
        </div>
      </div>
    </section>
  );
}
