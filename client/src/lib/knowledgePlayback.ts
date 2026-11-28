export interface KnowledgePlaybackFrame {
  stage: number;
  progress: number;
  playing: boolean;
}

/** Advance one bounded RAF frame; paused calls are only used for manual-step easing. */
export function knowledgeFrameTick(
  previous: KnowledgePlaybackFrame,
  deltaMs: number,
  speed: number,
  lastStage: number
): KnowledgePlaybackFrame {
  const last = Math.max(0, Math.floor(lastStage));
  const stage = Math.max(0, Math.min(last, Math.floor(previous.stage)));
  const delta = Number.isFinite(deltaMs)
    ? Math.max(0, Math.min(80, deltaMs))
    : 0;
  const rate = Number.isFinite(speed) ? Math.max(0.25, Math.min(4, speed)) : 1;
  const oldProgress = Number.isFinite(previous.progress)
    ? Math.max(0, Math.min(1, previous.progress))
    : 0;
  const progress = Math.min(
    1,
    oldProgress + (delta * rate) / (previous.playing ? 1800 : 450)
  );
  if (progress >= 1 && previous.playing)
    return stage < last
      ? { stage: stage + 1, progress: 0, playing: true }
      : { stage, progress: 1, playing: false };
  return { stage, progress, playing: previous.playing };
}
