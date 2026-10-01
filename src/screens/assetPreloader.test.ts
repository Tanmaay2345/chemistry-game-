import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { MAX_PARALLEL, preloadAssets, preloadedCount, resetPreloaderForTests } from './assetPreloader.ts';
import { SCREEN_ASSETS, assetsForScreen } from './screenAssets.ts';

afterEach(() => resetPreloaderForTests());

/** A loader that records what it was asked for and settles when told to. */
function recordingLoader() {
  const asked: string[] = [];
  const settle: Array<() => void> = [];
  const load = (url: string): Promise<void> => {
    asked.push(url);
    return new Promise<void>((resolve) => settle.push(() => resolve()));
  };
  return { asked, settle, load };
}

test('an asset is never fetched twice, however often it is asked for', async () => {
  const { asked, settle, load } = recordingLoader();

  preloadAssets(['/figma/a.svg', '/figma/b.svg'], load);
  preloadAssets(['/figma/a.svg'], load);
  preloadAssets(['/figma/b.svg', '/figma/a.svg'], load);

  assert.deepEqual(asked, ['/figma/a.svg', '/figma/b.svg']);
  settle.forEach((s) => s());
});

test('screens sharing an image do not each pay for it', async () => {
  const { asked, load } = recordingLoader();

  // The prefix rail appears on several screens; the second screen to want it
  // should find it already asked for.
  preloadAssets(assetsForScreen('alkane'), load);
  const afterFirst = asked.length;
  preloadAssets(assetsForScreen('alkane'), load);

  assert.equal(asked.length, afterFirst);
});

test('no more than MAX_PARALLEL are in flight at once', async () => {
  const { asked, settle, load } = recordingLoader();
  const urls = Array.from({ length: MAX_PARALLEL + 4 }, (_, i) => `/figma/${i}.svg`);

  preloadAssets(urls, load);
  assert.equal(asked.length, MAX_PARALLEL);

  // Letting one finish admits exactly one more.
  settle[0]();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(asked.length, MAX_PARALLEL + 1);
  settle.forEach((s) => s());
});

test('an asset that fails to load does not stall the ones behind it', async () => {
  const asked: string[] = [];
  const failing = (url: string): Promise<void> => {
    asked.push(url);
    return Promise.reject(new Error('blocked'));
  };

  preloadAssets(['/figma/a.svg', '/figma/b.svg', '/figma/c.svg'], failing);
  // Let the rejections settle; the queue must have drained rather than stopped.
  for (let i = 0; i < 20; i += 1) await Promise.resolve();

  assert.equal(asked.length, 3);
});

test('preloading is counted, so a screen can be asked for once and no more', () => {
  const { load } = recordingLoader();
  preloadAssets(['/figma/x.svg'], load);
  preloadAssets(['/figma/x.svg'], load);
  assert.equal(preloadedCount(), 1);
});

test('every image the manifest promises is actually on disk', () => {
  const missing: string[] = [];
  for (const [screen, assets] of Object.entries(SCREEN_ASSETS)) {
    for (const asset of assets) {
      if (!existsSync(join('public', asset))) missing.push(`${screen}: ${asset}`);
    }
  }
  assert.deepEqual(missing, [], `manifest is stale - rerun tools/assets/screen-assets.mjs`);
});

test('the screens that draw images all have some', () => {
  // A screen that silently lost its list would preload nothing and the bug
  // would only show as slowness, which is exactly what this is here to stop.
  for (const screen of ['signIn', 'prefixIntro', 'alkane', 'gameplay', 'play']) {
    assert.ok(assetsForScreen(screen).length > 0, `${screen} has no assets`);
  }
});
