/**
 * Fetches images before the screen that draws them is mounted.
 *
 * Every Figma image is an `<img src="/figma/...">` inside its screen, so the
 * browser only learns it exists once React has mounted that screen - which is
 * after the student has already pressed Continue. Asking for them while the
 * previous screen is still being read puts them in the HTTP cache, so the
 * `<img>` that follows is served locally instead of over the network.
 *
 * Nothing here renders, blocks or reports progress. A screen must never wait on
 * this: if a preload has not finished, the `<img>` simply loads the way it
 * always did.
 */

/** The little of an image element this needs; typed so no DOM lib is required. */
type Preloadable = {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
};

export type AssetLoader = (url: string) => Promise<void>;

/**
 * How many to fetch at once.
 *
 * The point is to use the quiet time while a student reads, not to race the
 * screen they are looking at for bandwidth. Six is the browser's own habit for
 * a host and keeps the queue moving without flooding it.
 */
export const MAX_PARALLEL = 6;

/** Every url ever asked for, so nothing is fetched twice. */
const requested = new Set<string>();

const queue: string[] = [];
let active = 0;

/**
 * The default loader.
 *
 * A failed decorative image is not an error worth surfacing - the screen will
 * ask for it again itself - so this resolves on `error` exactly as on `load`.
 */
function imageLoader(url: string): Promise<void> {
  const Img = (globalThis as { Image?: new () => Preloadable }).Image;
  if (!Img) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Img();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

function pump(load: AssetLoader): void {
  while (active < MAX_PARALLEL && queue.length > 0) {
    const url = queue.shift();
    if (url === undefined) return;
    active += 1;
    void load(url).then(
      () => {
        active -= 1;
        pump(load);
      },
      () => {
        active -= 1;
        pump(load);
      },
    );
  }
}

/**
 * Queues `urls` to be fetched in the background.
 *
 * Returns immediately. Urls already asked for are skipped, so calling this on
 * every render - or for a screen whose images another screen already pulled -
 * costs nothing and makes no second request.
 */
export function preloadAssets(urls: Iterable<string>, load: AssetLoader = imageLoader): void {
  for (const url of urls) {
    if (requested.has(url)) continue;
    requested.add(url);
    queue.push(url);
  }
  pump(load);
}

/** How many urls have been asked for. Tests and nothing else. */
export function preloadedCount(): number {
  return requested.size;
}

/** Tests only: lets a case start from an empty cache. */
export function resetPreloaderForTests(): void {
  requested.clear();
  queue.length = 0;
  active = 0;
}
