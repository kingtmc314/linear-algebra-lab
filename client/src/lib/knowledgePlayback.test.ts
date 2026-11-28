import { describe, expect, it } from "vitest";
import { knowledgeFrameTick } from "./knowledgePlayback";

describe("knowledge animation clock", () => {
  it("moves geometry continuously within a stage", () => {
    const value = knowledgeFrameTick(
      { stage: 0, progress: 0, playing: true },
      60,
      1,
      4
    );
    expect(value.stage).toBe(0);
    expect(value.progress).toBeGreaterThan(0);
    expect(value.progress).toBeLessThan(1);
  });
  it("advances to the next stage on completion", () => {
    expect(
      knowledgeFrameTick({ stage: 1, progress: 0.99, playing: true }, 80, 1, 4)
    ).toEqual({ stage: 2, progress: 0, playing: true });
  });
  it("stops once the final target is reached", () => {
    expect(
      knowledgeFrameTick({ stage: 4, progress: 0.99, playing: true }, 80, 1, 4)
    ).toEqual({ stage: 4, progress: 1, playing: false });
  });
  it("manual paused steps ease without autoplaying another stage", () => {
    expect(
      knowledgeFrameTick({ stage: 1, progress: 0.99, playing: false }, 80, 1, 4)
    ).toEqual({ stage: 1, progress: 1, playing: false });
  });
  it("double speed makes twice the same within-stage progress", () => {
    const a = knowledgeFrameTick(
      { stage: 0, progress: 0, playing: true },
      60,
      1,
      4
    );
    const b = knowledgeFrameTick(
      { stage: 0, progress: 0, playing: true },
      60,
      2,
      4
    );
    expect(b.progress).toBeCloseTo(2 * a.progress);
  });
  it.each([-100, NaN, Infinity])("ignores unsafe elapsed time %s", delta => {
    expect(
      knowledgeFrameTick(
        { stage: 0, progress: 0.2, playing: true },
        delta,
        1,
        4
      ).progress
    ).toBe(0.2);
  });
});
