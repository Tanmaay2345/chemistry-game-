// PLAYTESTER 5 — which instruction-card texts are ever actually rendered?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';
import { projectScene } from '../src/screens/gameplay/live/projectScene.ts';

const step = DEFAULT_RULES.physics.stepMs;
const framesPerPhase: Record<string, number> = {};
const chosenBorderFrames = { total: 0, frames: 0 };

function play(target: string) {
  const e = new GameEngine(ALKANE_CHALLENGES[target]);
  const observe = () => {
    const s = e.snapshot();
    framesPerPhase[s.phase] = (framesPerPhase[s.phase] ?? 0) + 1;
    const sc = projectScene(s);
    const chosen = sc.elements.filter((el: any) => el.kind === 'box' && el.borderColor === '#0795ff');
    chosenBorderFrames.total++;
    if (chosen.length) chosenBorderFrames.frames++;
  };
  observe(); // the very first painted frame, before start()
  e.start(); observe();
  const size = target === 'methane' ? 1 : target === 'ethane' ? 2 : 3;
  const g = ALKANE_CHALLENGES[target].carbonGroups.findIndex((x) => x.length === size && x.every((f) => f === 'blue'));
  e.selectCarbonGroup(g);
  const run = (n: number) => { for (let i = 0; i < n; i++) { e.tick(step); observe(); } };
  run(180);
  let guard = 0;
  while (e.getPhase() !== 'SUMMARY' && guard++ < 400) {
    const s = e.snapshot();
    if (s.heldIds.length === 0) {
      const h = s.hydrogenRowIds.map((id) => s.molecule.atoms.find((a) => a.id === id)!).find((a) => a.state === 'free' && a.family === s.spec.family);
      if (h) e.fireWeb(h.id); else break;
    } else {
      const c = s.molecule.atoms.find((a) => a.element === 'C' && a.remainingValency > 0 && a.state !== 'free');
      if (!c) break;
      const taken = s.molecule.bonds.filter((b) => b.a === c.id || b.b === c.id)
        .map((b) => s.molecule.atoms.find((a) => a.id === (b.a === c.id ? b.b : b.a))!)
        .map((o) => (Math.atan2(o.position.y - c.position.y, o.position.x - c.position.x) * 180) / Math.PI);
      const free = [0, -90, 180, 90].filter((ang) => taken.every((u) => Math.abs(((u - ang + 540) % 360) - 180) > 30));
      const ang = ((free[0] ?? 0) * Math.PI) / 180;
      e.throwAt({ x: c.position.x + Math.cos(ang) * 104, y: c.position.y + Math.sin(ang) * 104 });
    }
    run(90);
  }
  run(30);
}

for (const m of ['methane', 'ethane', 'propane']) play(m);

const ALL_PHASES = ['INTRO_OBJECTIVE','CARBON_SELECTION','PAPER_FLIGHT','CARBON_IMPACT','CARBON_STRUCTURE_READY','HYDROGEN_CALCULATION','HYDROGEN_SELECTION','HYDROGEN_COLLECTION','THROWING','COLLISION','MOLECULE_VALIDATION','COMPLETION','TIMEOUT','SUMMARY'];
const CARD: Record<string, string> = {
  INTRO_OBJECTIVE: 'Read the name: the prefix gives the carbons...',
  CARBON_SELECTION: 'Throw the paper at the carbon set...',
  PAPER_FLIGHT: 'Throw the paper at the carbon set...',
  CARBON_IMPACT: 'The carbons take the hit and bond.',
  CARBON_STRUCTURE_READY: '"Make the spiderweb ." / The carbon chain is built. Now the hydrogens.',
  HYDROGEN_CALCULATION: '"Count the bonds ." / Each carbon holds four bonds; what is left is for hydrogen.',
  HYDROGEN_SELECTION: 'Select the hydrogen of same family',
  HYDROGEN_COLLECTION: 'Collect the hydrogen. X / N',
  THROWING: 'Bonds made: N. Aim at a free bond.',
  COLLISION: 'Bonds made: N. Aim at a free bond.',
  MOLECULE_VALIDATION: 'Bonds made: N. Aim at a free bond.',
  COMPLETION: '"Alkane - ethane" / The molecule is complete.',
  TIMEOUT: '"Time up ." / The round is over.',
  SUMMARY: 'the summary card',
};

console.log('RENDERED FRAMES PER PHASE across three clean rounds (methane, ethane, propane):\n');
for (const p of ALL_PHASES) {
  const n = framesPerPhase[p] ?? 0;
  const secs = (n * step) / 1000;
  console.log(`${n === 0 ? 'NEVER SEEN  ' : '            '}${p.padEnd(24)} ${String(n).padStart(4)} frames (${secs.toFixed(2)}s)   card: ${CARD[p]}`);
}
console.log(`\nframes in which a carbon group box was highlighted blue (#0795ff, "chosen"): ${chosenBorderFrames.frames} of ${chosenBorderFrames.total}`);
console.log('(projectScene.ts:146 — group.chosen only draws while the pool is visible, i.e. CARBON_SELECTION/PAPER_FLIGHT/CARBON_IMPACT)');
