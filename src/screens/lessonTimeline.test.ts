import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VOICE_CLIPS } from '../game/voice/voiceClips.ts';
import { MOTION, NARRATED_PREFIXES, PREFIXES, prefixHoldMs, railWalkMs } from './prefixes/data/prefixes.ts';
import { LESSON_HOLD_MS, RAIL_MS, holdFor, lessonRunMs, playsItself } from './lessonTimeline.ts';
import { SCREENS, nextScreen } from './flow.ts';

/**
 * The stretch of the lesson that plays itself.
 *
 * Two things have to stay true: that a frame is held for at least as long as
 * it is speaking, and that the student is never left waiting for a control
 * that is not there.
 */

test('the frames that play themselves are the lesson, and only the lesson', () => {
  assert.deepEqual(Object.keys(LESSON_HOLD_MS), ['prefixIntro', 'alkane', 'alkene', 'alkyne']);

  // The two ends stay in the student's hands: the sign-in card, and the game.
  assert.equal(playsItself('signIn'), false, 'signing in is not on a timer');
  assert.equal(playsItself('play'), false, 'the game is not on a timer');
  assert.equal(holdFor('signIn'), null);
  assert.equal(holdFor('play'), null);
});

test('the frames that play themselves are consecutive, and end at the game', () => {
  // A gap would mean a frame in the middle of the stretch still waiting to be
  // pressed, which is the experience this replaced.
  let screen = 'prefixIntro' as (typeof SCREENS)[number];
  const walked: string[] = [screen];
  while (playsItself(screen)) {
    const next = nextScreen(screen);
    assert.ok(next, `${screen} leads somewhere`);
    screen = next;
    walked.push(screen);
  }
  assert.deepEqual(walked, ['prefixIntro', 'alkane', 'alkene', 'alkyne', 'play']);
});

test('no frame changes while it is still speaking', () => {
  const lines = { alkane: 'V05', alkene: 'V06', alkyne: 'V07' } as const;
  for (const [screen, id] of Object.entries(lines)) {
    const hold = holdFor(screen);
    assert.ok(hold !== null, `${screen} is held`);
    assert.ok(
      hold > VOICE_CLIPS[id].durationMs,
      `${screen} holds ${hold}ms for a ${VOICE_CLIPS[id].durationMs}ms line`,
    );
  }
});

test('the rail is held for the whole walk, and for the line that closes it', () => {
  // Every chip at its own pace, then "These nicknames help us name carbon
  // compounds" over the last one.
  assert.ok(RAIL_MS > railWalkMs() + VOICE_CLIPS.V17.durationMs, `the rail is cut short at ${RAIL_MS}ms`);
  assert.equal(holdFor('prefixIntro'), RAIL_MS);
});

test('a chip is held for as long as it is spoken about, and no longer', () => {
  // The first four carry the narration and keep the teaching pace. The rest
  // used to hold just as long with nothing being said, which left nine
  // seconds of rail ticking past in silence.
  for (let i = 0; i < NARRATED_PREFIXES; i += 1) {
    assert.equal(prefixHoldMs(i), MOTION.hold, `${PREFIXES[i].label} keeps the narrated pace`);
  }
  for (let i = NARRATED_PREFIXES; i < PREFIXES.length; i += 1) {
    assert.equal(prefixHoldMs(i), MOTION.holdAfterNarration, `${PREFIXES[i].label} is brisk`);
    assert.ok(prefixHoldMs(i) >= 1000, `${PREFIXES[i].label} is still readable`);
  }
});

test('the narration finishes before the rail outruns it', () => {
  // V16 names the chips still to come. It may run across them, but the rail
  // must not reach its last chip before the line naming them has finished.
  const untilLastChip = railWalkMs();
  const v16EndsAt = NARRATED_PREFIXES * MOTION.hold - MOTION.hold + VOICE_CLIPS.V16.durationMs;
  assert.ok(v16EndsAt < untilLastChip, `the rail rests at ${untilLastChip}ms, the line ends at ${v16EndsAt}ms`);
});

test('the stretch is long enough to teach and short enough to sit through', () => {
  const total = lessonRunMs();
  assert.ok(total > 30_000, `too quick to follow at ${(total / 1000).toFixed(1)}s`);
  // Nothing can be skipped, so the whole of it is a commitment the student
  // makes without being asked. If it grows past a minute, that is a decision
  // someone should have to take deliberately.
  assert.ok(total < 60_000, `too long to sit through at ${(total / 1000).toFixed(1)}s`);
});
