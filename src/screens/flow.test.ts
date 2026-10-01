import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOT_IN_LESSON_PATH, SCREENS, nextScreen, screenFromScrap, type Screen } from './flow.ts';

/** The journey a student actually takes, pressing Continue from the start. */
function journey(): Screen[] {
  const path: Screen[] = ['signIn'];
  let current: Screen = 'signIn';
  for (let guard = 0; guard < SCREENS.length + 2; guard += 1) {
    const next = nextScreen(current);
    if (!next) return path;
    path.push(next);
    current = next;
  }
  throw new Error('the flow does not end');
}

test('the lesson ends in the game, by way of the three bond screens', () => {
  assert.deepEqual(journey(), ['signIn', 'prefixIntro', 'alkane', 'alkene', 'alkyne', 'play']);
});

test('the last lesson leads straight into the game', () => {
  // Nothing may sit between the final bond screen and the game itself: this is
  // the seam the walkthrough used to occupy.
  assert.equal(nextScreen('alkyne'), 'play');
});

test('the transcribed walkthrough is never on the way', () => {
  assert.equal(journey().includes('gameplay'), false);
  assert.equal(NOT_IN_LESSON_PATH.has('gameplay'), true);
});

test('the frames taken out of the flow are not screens any more', () => {
  // H2, H3 and the three bond suffixes. A stale `?step=` for one of them must
  // not strand the student on a blank frame.
  for (const gone of ['carbonIntro', 'carbonValency', 'screen67', 'screen68', 'screen69']) {
    assert.equal(SCREENS.includes(gone as Screen), false, `${gone} is still a screen`);
    assert.equal(screenFromScrap(gone), 'signIn', `?step=${gone} should fall back`);
  }
});

test('the game is the end of the journey', () => {
  assert.equal(nextScreen('play'), undefined);
});

test('the walkthrough still leads on when opened directly', () => {
  // `?step=gameplay` is how the frames are looked at; clicking through them
  // should still arrive at the game rather than stop dead.
  assert.equal(screenFromScrap('gameplay'), 'gameplay');
  assert.equal(nextScreen('gameplay'), 'play');
});

test('an unknown or missing step opens at the beginning', () => {
  assert.equal(screenFromScrap(null), 'signIn');
  assert.equal(screenFromScrap('nonsense'), 'signIn');
});
