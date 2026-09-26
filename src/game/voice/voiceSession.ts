import type { VoiceId } from './voiceClips.ts';

/**
 * What has already been said, and when.
 *
 * Two scopes, because the clips need two. A round is one molecule: the engine
 * is rebuilt for each one and for every restart (`LiveGameplay`), so anything
 * scoped to a round can live and die with it. A session outlives all of that -
 * S01 and G03 are said once however many molecules are played, and the lesson
 * screens should not speak again when the learner presses Back and returns.
 *
 * It also settles a development-only problem the rest of this codebase has
 * already met: React invokes effects twice in development, which once made
 * every screen push two history entries. A clip asked for twice in the same
 * tick is recorded the first time and refused the second.
 */
export class VoiceSession {
  private session = new Set<VoiceId>();
  private round = new Map<VoiceId, number>();

  /** Clips said since the page loaded. */
  spokenThisSession(): ReadonlySet<VoiceId> {
    return this.session;
  }

  /** Clips said in this round, and the time each was said. */
  spokenThisRound(): ReadonlyMap<VoiceId, number> {
    return this.round;
  }

  /** Records a clip as said. */
  record(id: VoiceId, at: number): void {
    this.session.add(id);
    this.round.set(id, at);
  }

  /**
   * A new molecule, or the same one again.
   *
   * Only the round scope is cleared: a second methane round should introduce
   * itself again, and should still not repeat the once-a-session lines.
   */
  startRound(): void {
    this.round.clear();
  }

  /** A fresh page, or a test. */
  reset(): void {
    this.session.clear();
    this.round.clear();
  }
}

/**
 * The session the game uses.
 *
 * A module singleton rather than React state on purpose: it has to outlive the
 * engine, which is rebuilt per molecule, and it has to be readable from the
 * effect that plays a lesson clip before any of that exists.
 */
export const voiceSession = new VoiceSession();
