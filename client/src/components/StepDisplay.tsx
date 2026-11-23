import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Play, Pause, RotateCcw, SkipBack, SkipForward, List, ArrowDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { advancePlayback, type DerivationStep, type DerivationMode, type PlaybackAction, type PlaybackState } from "@/lib/derivationPlayback";
import { matrixToLatex } from "@/lib/matrixMath";
import KatexRenderer from "./KatexRenderer";

export type Step = DerivationStep;
export interface StepDisplayProps {
  steps: DerivationStep[];
  title?: string;
  onStepChange?: (index: number, mode: DerivationMode) => void;
}

/** Content identity resets playback on new inputs/language without resetting on a parent graph update. */
export default function StepDisplay(props: StepDisplayProps) {
  const { lang } = useLanguage();
  const signature = JSON.stringify(props.steps.map(step => [step.description, step.descriptionZh, step.descriptionEn, step.latex, step.matrix]));
  if (!props.steps.length) return null;
  return <DerivationPlayer key={`${lang}:${signature}`} {...props} />;
}

function StepContent({ step, lang, index }: { step: DerivationStep; lang: "zh" | "en"; index: number }) {
  const description = step.description ?? (lang === "zh" ? step.descriptionZh : step.descriptionEn) ?? (lang === "zh" ? `推導步驟 ${index + 1}` : `Derivation step ${index + 1}`);
  const latex = step.latex || (step.matrix ? matrixToLatex(step.matrix) : undefined);
  return <div className="min-w-0">
    <div className="text-sm leading-relaxed text-muted-foreground">
      {/\\\(|\\\[/.test(description) ? <KatexRenderer latex={description} /> : description}
    </div>
    {latex && <div className="overflow-x-auto py-2"><KatexRenderer latex={latex} displayMode className="text-sm" /></div>}
  </div>;
}

function DerivationPlayer({ steps, title, onStepChange }: StepDisplayProps) {
  const { lang, t } = useLanguage();
  const zh = lang === "zh";
  const bodyId = useId();
  const [expanded, setExpanded] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [state, setState] = useState<PlaybackState>({ index: steps.length - 1, mode: "all", playing: false });
  const callbackRef = useRef(onStepChange);
  callbackRef.current = onStepChange;
  const dispatch = (action: PlaybackAction) => setState(previous => advancePlayback(previous, action, steps.length));

  useEffect(() => { callbackRef.current?.(state.index, state.mode); }, [state.index, state.mode]);
  useEffect(() => {
    if (!state.playing || !expanded || document.hidden) return;
    // Mathematical pacing: give each equation time to be read, separate from the short entrance transition.
    const timer = window.setTimeout(() => setState(previous => advancePlayback(previous, "tick", steps.length)), 2400 / speed);
    return () => window.clearTimeout(timer);
  }, [state.playing, state.index, speed, steps.length, expanded]);
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setState(previous => ({ ...previous, playing: false })); };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const playback = state.mode === "playback";
  const controls = [
    { label: state.playing ? (zh ? "暫停推導" : "Pause derivation") : (zh ? "播放推導" : "Play derivation"), icon: state.playing ? Pause : Play, action: state.playing ? "pause" : "play", primary: true },
    { label: zh ? "重播推導" : "Replay derivation", icon: RotateCcw, action: "restart" },
    { label: zh ? "上一步" : "Previous step", icon: SkipBack, action: "previous", disabled: playback && state.index === 0 },
    { label: zh ? "下一步" : "Next step", icon: SkipForward, action: "next", disabled: playback && state.index === steps.length - 1 },
    { label: zh ? "全部步驟" : "All steps", icon: List, action: "all" },
  ] as const;

  return <section className="derivation-player overflow-hidden rounded-xl border border-border bg-card" data-testid="derivation-player" data-mode={state.mode} data-step={state.index}>
    <button type="button" onClick={() => { setExpanded(!expanded); dispatch("pause"); }} aria-expanded={expanded} aria-controls={bodyId} className="flex w-full items-center justify-between gap-3 bg-secondary/55 px-4 py-3 text-left">
      <span className="text-sm font-semibold text-foreground">{title || t.labelStepByStep}</span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{steps.length} {zh ? "步" : "steps"}{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
    </button>
    {expanded && <div id={bodyId}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-background/50 p-3">
        {controls.map(({ label, icon: Icon, action, ...options }) => <button key={action} type="button" aria-label={label} title={label} disabled={"disabled" in options && options.disabled} onClick={() => dispatch(action)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:opacity-35 ${"primary" in options && options.primary ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-secondary"}`}>
          <Icon size={14} aria-hidden="true" /><span className={action === "next" || action === "previous" ? "sr-only sm:not-sr-only" : ""}>{label.replace(zh ? "推導" : " derivation", "")}</span>
        </button>)}
        <label className="ml-auto flex min-h-10 items-center gap-1.5 text-xs text-muted-foreground">
          <span>{zh ? "速度" : "Speed"}</span>
          <select aria-label={zh ? "推導播放速度" : "Derivation playback speed"} value={speed} onChange={event => setSpeed(Number(event.target.value))} className="min-h-10 rounded-lg border border-border bg-card px-1.5 text-foreground">
            {[0.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
      </div>
      {playback ? <div className="p-4" data-testid="active-derivation">
        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
          <span className="font-semibold text-primary">{zh ? `步驟 ${state.index + 1}／${steps.length}` : `Step ${state.index + 1} of ${steps.length}`}</span>
          <span>{state.playing ? (zh ? "播放中" : "Playing") : (zh ? "已暫停 · 可單步操作" : "Paused · step manually")}</span>
        </div>
        <div className="mb-4 flex gap-1" aria-hidden="true">{steps.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= state.index ? "bg-primary" : "bg-secondary"}`} />)}</div>
        {state.index > 0 && <div className="mb-3 rounded-lg border border-border bg-secondary/30 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{zh ? "承接上一步" : "From the previous step"}</p>
          <StepContent step={steps[state.index - 1]} lang={lang} index={state.index - 1} />
        </div>}
        {state.index > 0 && <ArrowDown size={18} className="mx-auto mb-3 text-primary" aria-hidden="true" />}
        <div key={state.index} className="derivation-active rounded-lg border border-primary/30 bg-primary/5 p-4"><StepContent step={steps[state.index]} lang={lang} index={state.index} /></div>
        {steps.length === 1 && <p className="mt-3 text-xs text-muted-foreground">{zh ? "本推導只有一個步驟。" : "This derivation has one step."}</p>}
      </div> : <div className="divide-y divide-border">
        {steps.map((step, index) => <div key={index} className="flex gap-3 px-4 py-3">
          <button type="button" aria-label={zh ? `前往步驟 ${index + 1}` : `Go to step ${index + 1}`} onClick={() => setState({ index, mode: "playback", playing: false })} className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20">{index + 1}</button>
          <div className="min-w-0 flex-1"><StepContent step={step} lang={lang} index={index} /></div>
        </div>)}
      </div>}
    </div>}
  </section>;
}
