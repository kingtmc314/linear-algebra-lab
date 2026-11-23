import { describe, expect, it } from "vitest";
import katex from "katex";
import { advancePlayback, splitSolutionLatex, solutionPlaybackSteps, type PlaybackState } from "./derivationPlayback";

const all: PlaybackState = { index: 3, mode: "all", playing: false };
describe("derivation playback", () => {
  it("starts from the first equation and ends without looping", () => {
    let state = advancePlayback(all, "play", 4);
    expect(state).toEqual({ index: 0, mode: "playback", playing: true });
    state = advancePlayback(state, "tick", 4);
    expect(state.index).toBe(1);
    state = advancePlayback(state, "tick", 4);
    state = advancePlayback(state, "tick", 4);
    expect(state).toEqual({ index: 3, mode: "playback", playing: false });
  });
  it("supports bounded manual steps, pause, restart and all", () => {
    expect(advancePlayback(all, "next", 4).index).toBe(0);
    const first = advancePlayback(all, "play", 4);
    expect(advancePlayback(first, "previous", 4).index).toBe(0);
    expect(advancePlayback(first, "pause", 4).playing).toBe(false);
    expect(advancePlayback(all, "restart", 4).index).toBe(0);
    expect(advancePlayback(first, "all", 4)).toEqual(all);
  });
  it("handles one-step and changed smaller content safely", () => {
    expect(advancePlayback(all, "play", 1)).toEqual({ index: 0, mode: "playback", playing: false });
    expect(advancePlayback(all, "next", 0).index).toBe(0);
    expect(advancePlayback(all, "tick", 2).index).toBe(1);
  });
});
describe("safe solution rows", () => {
  it("preserves nested matrix rows while splitting reasoning rows", () => {
    const source = String.raw`\begin{aligned}a+b&=\begin{pmatrix}3+1\\4+2\end{pmatrix}\\&=\begin{pmatrix}4\\6\end{pmatrix}\end{aligned}`;
    const rows = splitSolutionLatex(source);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain(String.raw`3+1\\4+2`);
    rows.forEach(latex => expect(() => katex.renderToString(latex, { throwOnError: true })).not.toThrow());
  });
  it("never splits bare matrices or malformed environments", () => {
    const matrix = String.raw`\begin{bmatrix}1&2\\3&4\end{bmatrix}`;
    expect(splitSolutionLatex(matrix)).toEqual([matrix]);
    const bad = String.raw`\begin{aligned}x&=\begin{bmatrix}1\\2\end{array}\\y&=2\end{aligned}`;
    expect(splitSolutionLatex(bad)).toEqual([bad]);
  });
  it("retains row spacing and array environments", () => {
    const source = String.raw`\begin{aligned}x&=\left[\begin{array}{c|c}1&2\\3&4\end{array}\right]\\[4pt]y&=3\end{aligned}`;
    expect(splitSolutionLatex(source)).toHaveLength(2);
    expect(solutionPlaybackSteps(source, "en")[1].description).toBe("Reasoning step 2");
  });
});
