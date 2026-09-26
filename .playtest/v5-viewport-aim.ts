// Does a click on a marker's on-screen pixel resolve to that same marker,
// at each supported viewport? Uses the app's own fit rule and the same
// screen->gameplay transform LiveGameplay applies.
import { fitDesign } from '../src/layout/designFit.ts';
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;
const DESIGN = { width: 1440, height: 1024, content: { top: 116, bottom: 921 } };
const FRAME_ORIGIN = { x: 127, y: 1 };
const A = (a: number) => ({ 0: 'right', [-90]: 'top', 180: 'left', 90: 'bottom' })[a] ?? String(a);

function ethanePair() {
  const e = new GameEngine(ALKANE_CHALLENGES.ethane);
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 1500 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  return e;
}

let bad = 0;
for (const [w, h] of [[1366, 768], [1440, 900], [1920, 1080]] as const) {
  const fit = fitDesign(w, h, DESIGN);
  const e = ethanePair();
  // Where the app would draw each marker, in screen pixels.
  const toScreen = (p: { x: number; y: number }) => ({
    x: fit.offsetX + (p.x + FRAME_ORIGIN.x) * fit.unit,
    y: fit.offsetY + (p.y + FRAME_ORIGIN.y) * fit.unit,
  });
  // The transform LiveGameplay uses to turn a click back into gameplay space.
  const toGameplay = (s: { x: number; y: number }) => ({
    x: (s.x - fit.offsetX) / fit.unit - FRAME_ORIGIN.x,
    y: (s.y - fit.offsetY) / fit.unit - FRAME_ORIGIN.y,
  });

  console.log(`\n=== ${w} x ${h}   unit ${fit.unit.toFixed(4)}${fit.clamped ? ' (clamped)' : ''} ===`);
  for (const t of e.bondTargets()) {
    const screen = toScreen(t.point);
    const back = toGameplay(screen);
    const ring = e.aimedTarget(back);
    const ok = ring && ring.carbonId === t.carbonId && ring.angle === t.angle;
    const drift = Math.hypot(back.x - t.point.x, back.y - t.point.y);
    if (!ok) bad++;
    console.log(
      `  ${t.carbonId} ${A(t.angle).padEnd(6)} at screen (${screen.x.toFixed(0)}, ${screen.y.toFixed(0)})` +
        ` -> ring ${ring ? `${ring.carbonId} ${A(ring.angle)}` : 'none'}  ${ok ? 'OK' : '** MISMATCH **'}  (round-trip drift ${drift.toFixed(3)}px)`,
    );
  }
  // And a point clearly off every marker must ring nothing.
  const empty = e.aimedTarget(toGameplay(toScreen({ x: 1150, y: 850 })));
  console.log(`  empty table -> ring ${empty ? 'SOMETHING (wrong)' : 'none'}  ${empty ? '** MISMATCH **' : 'OK'}`);
  if (empty) bad++;
}
console.log(bad === 0 ? '\nEVERY MARKER RESOLVES TO ITSELF AT EVERY VIEWPORT' : `\n*** ${bad} MISMATCHES ***`);
