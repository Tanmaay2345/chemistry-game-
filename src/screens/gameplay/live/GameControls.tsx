import { useMemo } from 'react';
import { SERIES_BY_FAMILY, SERIES_COPY, describeFamily } from '../../../content/chemistry.ts';
import type { GameEngine, Snapshot } from '../../../game/engine/engine.ts';

/**
 * The game, playable without a mouse.
 *
 * Aiming and throwing are a pointer gesture, and they stay one. This is the
 * same set of choices offered as real buttons: one per carbon set while a set
 * is being chosen, one per hydrogen in the row while hydrogens are being
 * collected, one per free bond while one is being thrown at. Tab walks them,
 * Enter and Space act, and each carries a name that says what it is - the
 * colour is never the only thing that distinguishes it.
 *
 * They are drawn with `pointer-events: none`, so mouse play is untouched: a
 * click still goes to the play surface underneath and is handled exactly as
 * before. A button with no pointer events is still focusable and still
 * activates from the keyboard, which is the whole point of the layer.
 */

/** Where the ruled frame sits inside the artboard: gameplay (0, 0). */
type Origin = { x: number; y: number };

type Control = {
  key: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  act: () => void;
};

function carbonControls(engine: GameEngine, snapshot: Snapshot): Control[] {
  return snapshot.carbonGroups.map((group, index) => {
    const centre = engine.groupCentre(index);
    const count = group.atomIds.length;
    const families = [...new Set(group.atomIds.map((id) => snapshot.molecule.atoms.find((a) => a.id === id)!.family))];
    const width = count * 74 + 40;
    const colours =
      families.length === 1
        ? `${count} ${describeFamily(families[0])} carbon${count === 1 ? '' : 's'}`
        : `${count} carbons - ${families.map((f) => describeFamily(f)).join(', ')}`;
    return {
      key: `group-${index}`,
      label: `Carbon set ${index + 1}: ${colours}. Throw the paper here.`,
      left: centre.x - width / 2,
      top: centre.y - 45,
      width,
      height: 90,
      act: () => void engine.selectCarbonGroup(index),
    };
  });
}

function hydrogenControls(engine: GameEngine, snapshot: Snapshot): Control[] {
  return snapshot.hydrogenRowIds
    .map((id) => snapshot.molecule.atoms.find((a) => a.id === id)!)
    .filter((atom) => atom.state === 'free')
    .map((atom, i) => ({
      key: `row-${atom.id}`,
      label: `Hydrogen ${i + 1}: ${describeFamily(atom.family, 'H')}. Collect it.`,
      left: atom.position.x - 26,
      top: atom.position.y - 26,
      width: 52,
      height: 52,
      act: () => void engine.fireWeb(atom.id),
    }));
}

/** The legend stays up for the whole carbon phase, not just while aiming. */
const CARBON_PHASES: string[] = ['CARBON_SELECTION', 'PAPER_FLIGHT', 'CARBON_IMPACT'];

const ANGLE_NAME: Record<number, string> = { 0: 'right', [-90]: 'top', 180: 'left', 90: 'bottom' };

function slotControls(engine: GameEngine, snapshot: Snapshot): Control[] {
  const carbons = snapshot.molecule.atoms.filter((a) => a.element === 'C' && (a.state === 'bonded' || a.state === 'placed'));
  const nameOf = (id: string) => `carbon ${carbons.findIndex((c) => c.id === id) + 1}`;
  return snapshot.bondTargets.map((target, i) => ({
    key: `slot-${target.carbonId}-${target.angle}`,
    label: `Free bond on ${nameOf(target.carbonId)}, ${ANGLE_NAME[target.angle] ?? 'side'}. Throw the hydrogen here. ${i + 1} of ${snapshot.bondTargets.length}.`,
    left: target.point.x - 30,
    top: target.point.y - 30,
    width: 60,
    height: 60,
    act: () => void engine.throwAt({ ...target.point }),
  }));
}

type ControlProps = {
  engine: GameEngine;
  snapshot: Snapshot;
  origin: Origin;
  /** Starts the next round - the next molecule, or this one again. */
  onRestart: () => void;
  /** The molecule that control leads to, when this one has been built. */
  nextMolecule?: string | null;
  /** Back to the walkthrough, when the game was entered from it. */
  onExit?: () => void;
};

export function GameControls({ engine, snapshot, origin, onRestart, nextMolecule = null, onExit }: ControlProps) {
  const controls = useMemo(() => {
    // The round is over: the two things left to do are play again or go back.
    if (snapshot.phase === 'SUMMARY') {
      const again: Control = {
        key: 'again',
        label: `${snapshot.summary?.completion === 'completed' ? 'Molecule complete' : 'Time up'}. ${nextMolecule ? `Build ${nextMolecule} next.` : 'Play again.'}`,
        left: 60,
        top: 740,
        width: onExit ? 800 : 1060,
        height: 130,
        act: onRestart,
      };
      if (!onExit) return [again];
      return [again, { key: 'back', label: 'Back to the walkthrough', left: 880, top: 740, width: 240, height: 130, act: onExit }];
    }
    // A held beat is skippable with a click, so it has to be skippable from
    // the keyboard too - otherwise focus simply vanishes for two seconds.
    if (snapshot.holding) {
      return [
        {
          key: 'continue',
          label: 'Continue',
          left: 60,
          top: 740,
          width: 1060,
          height: 130,
          act: () => void engine.skipTeachingBeat(),
        },
      ];
    }
    if (snapshot.phase === 'CARBON_SELECTION') return carbonControls(engine, snapshot);
    if (snapshot.phase === 'PAPER_FLIGHT' || snapshot.phase === 'CARBON_IMPACT') return [];
    const list: Control[] = [];
    if (snapshot.hydrogenTarget !== null) list.push(...hydrogenControls(engine, snapshot));
    if (engine.canThrow() && snapshot.paper.loadedAtomId) list.push(...slotControls(engine, snapshot));
    return list;
  }, [engine, snapshot, onRestart, nextMolecule, onExit]);

  // The family key, so "blue" is never the only way to tell the sets apart.
  const legend = (['blue', 'red', 'green'] as const).map((family) => {
    const series = SERIES_BY_FAMILY[family];
    return `${family}: ${SERIES_COPY[series].plural.toLowerCase()}, ${SERIES_COPY[series].bondWord} bond`;
  });

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* The colour key, drawn where the pool is, so the rule is on screen
          rather than only in the instructions. */}
      {(CARBON_PHASES.includes(snapshot.phase) || snapshot.hydrogenTarget !== null) && (
        <div
          style={{
            position: 'absolute',
            left: origin.x + 150,
            top: origin.y + 690,
            display: 'flex',
            gap: 18,
            fontFamily: 'Lexend, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            color: '#8a8a8a',
          }}
        >
          {legend.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
      {controls.map((control) => (
        <button
          key={control.key}
          type="button"
          className="gameTarget"
          aria-label={control.label}
          onClick={control.act}
          style={{
            position: 'absolute',
            left: origin.x + control.left,
            top: origin.y + control.top,
            width: control.width,
            height: control.height,
            padding: 0,
            margin: 0,
            borderRadius: 8,
          }}
        />
      ))}
    </div>
  );
}
