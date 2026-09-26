// Attack 2: how permanent are the freezes?
import { ALKANE_CHALLENGES, DEFAULT_RULES } from '../src/game/engine/config.ts';
import { GameEngine } from '../src/game/engine/engine.ts';

const step = DEFAULT_RULES.physics.stepMs;
const fresh = () => { const e = new GameEngine(ALKANE_CHALLENGES.ethane); e.start(); return e; };

// A2.1 tick(NaN) -- is the engine dead forever?
{
  const e = fresh();
  e.selectCarbonGroup(2);
  e.tick(NaN);
  for (let i = 0; i < 60 * 60 * 10; i++) e.tick(step); // 10 minutes of perfect frames
  const s = e.snapshot();
  console.log('[A2.1] after tick(NaN) + 10 SIMULATED MINUTES of 60Hz ticks:');
  console.log('       phase        =', e.getPhase(), '(expected SUMMARY via timeout)');
  console.log('       timeRemaining=', s.timeRemaining, '(expected 0)');
  console.log('       completion   =', s.session.completionStatus);
  console.log('       => engine permanently frozen:', s.timeRemaining === 120 && e.getPhase() !== 'SUMMARY');
}

// A2.2 a single large negative tick
{
  const e = fresh();
  e.selectCarbonGroup(2);
  e.tick(-1e6); // one bad frame delta of -1000 seconds
  for (let i = 0; i < 60 * 60 * 5; i++) e.tick(step); // 5 minutes of good frames
  console.log('[A2.2] after ONE tick(-1e6) + 5 simulated minutes of good ticks:');
  console.log('       phase        =', e.getPhase());
  console.log('       timeRemaining=', e.snapshot().timeRemaining);
  console.log('       => frozen:', e.snapshot().timeRemaining === 120);
}

// A2.3 does the NaN paper throw at least time out?
{
  const e = fresh();
  e.throwPaperAt({ x: NaN, y: 0 });
  let phaseAt60s = '';
  for (let i = 0; i < 60 * 130; i++) { e.tick(step); if (i === 60 * 60) phaseAt60s = e.getPhase(); }
  const s = e.snapshot();
  console.log('[A2.3] NaN paper throw, then 130 simulated seconds:');
  console.log('       phase at 60s =', phaseAt60s);
  console.log('       final phase  =', e.getPhase(), 'completion =', s.session.completionStatus);
  console.log('       paper pos    =', JSON.stringify(s.paper.position));
  console.log('       => player loses the entire 2-minute round with no possible action');
  console.log('       canThrow during the stall:', e.canThrow(), 'throwPaperAt works again:', e.throwPaperAt({ x: 500, y: 500 }));
}

// A2.4 one NaN coordinate only (x NaN, y fine) -- the realistic shape of the bug
{
  const e = fresh();
  console.log('[A2.4] throwPaperAt({x: 0/0, y: 582}) returned', e.throwPaperAt({ x: 0 / 0, y: 582 }));
  for (let i = 0; i < 300; i++) e.tick(step);
  console.log('       phase after 5s =', e.getPhase(), 'paper =', JSON.stringify(e.snapshot().paper.position));
}

// A2.5 aim() with NaN then a normal throw -- does aim poison anything?
{
  const e = fresh();
  e.aim({ x: NaN, y: NaN });
  const ok = e.selectCarbonGroup(2);
  for (let i = 0; i < 300; i++) e.tick(step);
  console.log('[A2.5] aim(NaN) then normal select ->', ok, 'phase', e.getPhase(), 'aim', JSON.stringify(e.snapshot().paper.aim));
}
