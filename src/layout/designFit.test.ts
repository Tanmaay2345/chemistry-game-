import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_MIN_UNIT, fitDesign } from './designFit.ts';

/**
 * The fit rule, at the sizes the game is played at.
 *
 * The gameplay artboard is 1440 x 1024 with its content between y 116 and
 * y 921 - the margins above and below are allowed to run off a short window,
 * which is why a 900-tall laptop fits a 1024-tall design without scrolling.
 */

const GAMEPLAY = { width: 1440, height: 1024, content: { top: 116, bottom: 921 } };

test('the supported laptop sizes are drawn whole, with no scrolling', () => {
  for (const [w, h, unit] of [
    [1280, 800, 0.8889],
    [1366, 768, 0.8944],
    [1440, 900, 1],
    [1440, 1024, 1],
    [1536, 864, 1.0137],
    [1728, 1117, 1.2],
    [1920, 1080, 1.25],
  ] as const) {
    const fit = fitDesign(w, h, GAMEPLAY);
    assert.equal(fit.clamped, false, `${w}x${h} does not scroll`);
    assert.ok(Math.abs(fit.unit - unit) < 0.002, `${w}x${h} unit ${fit.unit.toFixed(4)}, expected ~${unit}`);
  }
});

test('zoom magnifies instead of shrinking the design to nothing', () => {
  // A 200% zoom of a 1440x900 window is a 720x450 viewport, and so on.
  for (const [w, h] of [[720, 450], [480, 300], [360, 225]] as const) {
    const fit = fitDesign(w, h, GAMEPLAY);
    assert.equal(fit.unit, DEFAULT_MIN_UNIT, `${w}x${h} stops at the legibility floor`);
    assert.equal(fit.clamped, true, `${w}x${h} scrolls`);
    assert.equal(fit.scrollWidth, 1440 * DEFAULT_MIN_UNIT);
    assert.equal(fit.scrollHeight, 1024 * DEFAULT_MIN_UNIT);
    assert.equal(fit.offsetX, 0);
    assert.equal(fit.offsetY, 0);
  }
});

test('the clamp engages only once the design would go below the floor', () => {
  // 1440 x 0.6 = 864 wide, 805 x 0.6 = 483 of content: the last size that fits.
  assert.equal(fitDesign(864, 531, GAMEPLAY).clamped, false);
  assert.equal(fitDesign(863, 531, GAMEPLAY).clamped, true);
});

test('a full-bleed frame is still fitted whole', () => {
  // The onboarding artboard names its whole height as content, so it has no
  // margin to give up and is fitted exactly as it always was.
  const onboarding = { width: 1444, height: 1024, content: { top: 0, bottom: 1024 } };
  const fit = fitDesign(1440, 900, onboarding);
  assert.ok(fit.unit < 0.9, 'scaled down to fit its full height');
  assert.equal(fit.clamped, false);
});
