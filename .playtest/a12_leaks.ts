import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
const step = DEFAULT_RULES.physics.stepMs;

// Timeout landing genuinely INSIDE the carbon impact animation.
for (const t of [0.30, 0.45, 0.60, 0.75]) {
  const e = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 60 });
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 3000 && e.getPhase() !== 'CARBON_IMPACT'; i++) e.tick(step);
  // burn the clock down to `t` seconds, then let the impact run into the expiry
  e.snapshot().session.remainingTime = t;
  for (let i = 0; i < 300; i++) e.tick(step);
  const s = e.snapshot();
  console.log(`timeout at impact t=${t}s -> phase=${e.getPhase()} carbonImpact=${s.carbonImpact ? s.carbonImpact.stage : 'null'} bonds=${s.molecule.bonds.length} paper.mode=${s.paper.mode} paper.opacity=${s.paper.opacity}`);
}

// Timeout landing inside a web reel-in.
for (const t of [0.05, 0.10, 0.20, 0.30]) {
  const e = new GameEngine({ ...ALKANE_CHALLENGES.ethane, timeLimitSeconds: 60 });
  e.start();
  e.selectCarbonGroup(2);
  for (let i = 0; i < 3000 && e.getPhase() !== 'HYDROGEN_SELECTION'; i++) e.tick(step);
  e.fireWeb(e.snapshot().hydrogenRowIds[0]);
  e.snapshot().session.remainingTime = t;
  for (let i = 0; i < 300; i++) e.tick(step);
  const s = e.snapshot();
  const a = s.molecule.atoms.find((x) => x.id === s.web.targetAtomId);
  console.log(`timeout at web t=${t}s -> phase=${e.getPhase()} web.active=${s.web.active} target=${s.web.targetAtomId} progress=${s.web.progress.toFixed(2)} atomState=${a?.state ?? 'n/a'}`);
}
