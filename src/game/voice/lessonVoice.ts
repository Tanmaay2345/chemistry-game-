import type { VoiceId } from './voiceClips.ts';
import type { VoiceOutcome, VoiceOwner } from './VoiceManager.ts';
import { voiceForPrefix, voiceForScreen, voiceForWalkthroughStep } from './voiceForScreen.ts';
import type { VoiceSession } from './voiceSession.ts';

/**
 * Narration for the taught part of the game: the ten lesson screens and the
 * two lines that bracket the walkthrough after them.
 *
 * Deliberately not a React hook: everything that decides anything lives here,
 * so it can be driven through a whole lesson sequence - forward, Back, a
 * refresh, a rerender - under `node --test`. The hook around it does nothing but
 * call `enter`.
 *
 * It cannot advance a screen. There is no path from a clip finishing to a
 * transition; the instruction card stays the student's control, exactly as it
 * was before narration existed.
 */

/** The part of `VoiceManager` this needs. */
export type VoiceChannel = {
  play(id: string, owner?: VoiceOwner): Promise<VoiceOutcome>;
  stop(owner?: VoiceOwner): void;
  cancelAll(owner?: VoiceOwner): void;
};

/**
 * One moment that may have something to say.
 *
 * `endsRound` marks the moments that mean a round is over: arriving at any
 * screen other than the live game. The walkthrough's own frames do not, because
 * they happen inside a screen whose arrival already said so.
 */
type Cue = {
  key: string;
  screen: string;
  id: VoiceId | null;
  endsRound: boolean;
  /**
   * Whether this line replaces whatever the lesson layer is saying.
   *
   * True for a change of screen: the previous screen's line is about a screen
   * the learner has left. False within one screen, where a sequence of lines
   * describes one animation and cutting each off mid-word is the opposite of
   * what it is for - they queue instead.
   */
  interrupts: boolean;
};

export class LessonVoice {
  private readonly voice: VoiceChannel;
  private readonly session: VoiceSession;
  private readonly now: () => number;
  /** The cue last entered, which is what makes a rerender a no-op. */
  private lastKey: string | null = null;
  /** Asked for but not yet resolved, so a doubled call cannot start it twice. */
  private inFlight = new Set<VoiceId>();

  constructor(voice: VoiceChannel, session: VoiceSession, now: () => number = () => Date.now()) {
    this.voice = voice;
    this.session = session;
    this.now = now;
  }

  /**
   * The learner is now on this screen.
   *
   * Safe to call as often as React likes: only a genuine change of screen does
   * anything. Leaving a lesson stops its line rather than letting it talk over
   * the next screen - including when the next screen is the gameplay, which has
   * no line of its own yet.
   */
  enter(screen: string): void {
    this.say({ key: `screen:${screen}`, screen, id: voiceForScreen(screen), endsRound: screen !== 'play', interrupts: true });
  }

  /**
   * The walkthrough has moved to one of its 31 frames.
   *
   * Only the first and last say anything; the rest are a no-op, including the
   * ones that advance themselves on a timer.
   */
  enterStep(index: number, stepCount: number): void {
    this.say({ key: `step:${index}`, screen: 'gameplay', id: voiceForWalkthroughStep(index, stepCount), endsRound: false, interrupts: true });
  }

  /**
   * The prefix rail has reached one of its chips, or come to rest.
   *
   * The rail moves on its own timer and this only reports where it is; it
   * cannot move it, hold it, or change its timing. Lines queue rather than
   * interrupt, so a line longer than the chip it belongs to finishes and the
   * next waits - which is also why the later chips say nothing.
   */
  enterPrefix(index: number, completed: boolean): void {
    this.say({
      key: completed ? 'prefix:end' : `prefix:${index}`,
      screen: 'prefixIntro',
      id: voiceForPrefix(index, completed),
      endsRound: false,
      interrupts: false,
    });
  }

  /**
   * A moment has arrived. Says its line, if it has one and it is still owed.
   *
   * Two rules, and the boundary between them is what the walkthrough handover
   * turns on.
   *
   * A moment *with* a line ends the previous lesson line before starting its
   * own, so two lessons never talk over each other. It ends only the lesson
   * layer's line: a round that has just begun is not this layer's to silence.
   *
   * A moment with *nothing* to say ends nothing. Leaving the walkthrough for
   * the live game is such a moment, and its line - "that's the whole loop, now
   * it's your turn" - is about precisely that step, so it is allowed to finish
   * while the round starts underneath it. The round's own introduction queues
   * behind it rather than cutting it off.
   *
   * Arriving at any screen that is not the live game does end the round's
   * narration, because the round is over: its summary should not carry on
   * talking over a lesson.
   */
  private say(cue: Cue): void {
    if (cue.key === this.lastKey) return;
    this.lastKey = cue.key;

    // Back out of the game, or out to the walkthrough: the round has ended and
    // anything it was still saying belongs to it, not to where we are now.
    if (cue.endsRound) this.voice.cancelAll('gameplay');

    if (!cue.id) return;

    // Each of these lines is marked "Once" in the script, so a moment reached
    // again - by Back, or by walking the flow twice - stays quiet.
    if (this.session.spokenThisSession().has(cue.id) || this.inFlight.has(cue.id)) return;

    // Whatever this layer was saying belonged to the moment before this one -
    // unless this line continues it, in which case it queues behind it.
    if (cue.interrupts) this.voice.stop('lesson');

    const id = cue.id;
    this.inFlight.add(id);
    void this.voice.play(id, 'lesson').then((outcome) => {
      this.inFlight.delete(id);
      // Recorded only if it actually spoke. A clip the browser refused to start
      // was never heard, so it is still owed - which is what lets V01 play if
      // the learner comes back to the first screen after a click has given the
      // page the gesture the browser was waiting for.
      if (outcome === 'ended' || outcome === 'cancelled') this.session.record(id, this.now());
    });
  }

  /** Tests only. */
  currentCue(): string | null {
    return this.lastKey;
  }
}
