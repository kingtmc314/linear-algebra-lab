export interface DerivationStep {
  description?: string;
  descriptionZh?: string;
  descriptionEn?: string;
  latex?: string;
  matrix?: number[][];
}
export type DerivationMode = "all" | "playback";
export interface PlaybackState { index: number; mode: DerivationMode; playing: boolean }
export type PlaybackAction = "play" | "pause" | "restart" | "next" | "previous" | "all" | "tick";

export function advancePlayback(state: PlaybackState, action: PlaybackAction, count: number): PlaybackState {
  const last = Math.max(0, count - 1);
  const index = Math.max(0, Math.min(last, state.index));
  if (action === "all") return { index: last, mode: "all", playing: false };
  if (action === "pause") return { ...state, index, playing: false };
  if (action === "restart") return { index: 0, mode: "playback", playing: count > 1 };
  if (action === "play") return { index: state.mode === "all" || index === last ? 0 : index, mode: "playback", playing: count > 1 };
  if (action === "next") return { index: state.mode === "all" ? 0 : Math.min(last, index + 1), mode: "playback", playing: false };
  if (action === "previous") return { index: Math.max(0, index - 1), mode: "playback", playing: false };
  return { index: Math.min(last, index + 1), mode: "playback", playing: index + 1 < last && count > 1 };
}

/** Split only OUTER aligned rows, never rows inside a matrix/array/cases or a brace group. */
export function splitSolutionLatex(source: string): string[] {
  const trimmed = source.trim();
  const outer = trimmed.match(/^\\begin\{(aligned|align\*?|gathered)\}([\s\S]*)\\end\{\1\}$/);
  if (!outer) return trimmed ? [trimmed] : [];
  const body = outer[2];
  const rows: string[] = [];
  const environments: string[] = [];
  let braces = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const command = body.slice(i).match(/^\\(begin|end)\{([^}]+)\}/);
    if (command) {
      if (command[1] === "begin") environments.push(command[2]);
      else if (environments.pop() !== command[2]) return [trimmed];
      i += command[0].length - 1;
      continue;
    }
    if (body[i] === "\\" && body[i + 1] === "\\" && environments.length === 0 && braces === 0) {
      rows.push(body.slice(start, i).trim());
      i++;
      const spacing = body.slice(i + 1).match(/^\[[^\]]*\]/);
      if (spacing) i += spacing[0].length;
      start = i + 1;
      continue;
    }
    if (body[i] === "\\" && (body[i + 1] === "{" || body[i + 1] === "}")) { i++; continue; }
    if (body[i] === "{") braces++;
    if (body[i] === "}") braces--;
  }
  if (environments.length || braces !== 0) return [trimmed];
  rows.push(body.slice(start).trim());
  return rows.filter(Boolean).map(row => `\\begin{aligned}${row}\\end{aligned}`);
}

export function solutionPlaybackSteps(source: string, lang: "zh" | "en"): DerivationStep[] {
  return splitSolutionLatex(source).map((latex, index) => ({
    description: lang === "zh" ? `推理步驟 ${index + 1}` : `Reasoning step ${index + 1}`,
    latex,
  }));
}
