import { SERIES_COPY } from '../../../content/chemistry.ts';
import type { Snapshot } from '../../../game/engine/engine.ts';

/** One sentence that says where the round is, for a screen reader. */
export function progressMessage(snapshot: Snapshot): string {
  const { spec } = snapshot;
  const time = `${Math.floor(snapshot.timeRemaining / 60)} minutes ${Math.floor(snapshot.timeRemaining % 60)} seconds left`;
  const carbons = snapshot.molecule.atoms.filter((a) => a.element === 'C' && a.state !== 'free').length;
  if (snapshot.hydrogenTarget === null) {
    return `Building ${spec.name}, ${SERIES_COPY.alkane.singular.toLowerCase()}. ${carbons} of ${spec.carbonCount} carbons placed. ${snapshot.score} points, ${time}.`;
  }
  const bonded = snapshot.molecule.atoms.filter((a) => a.element === 'H' && a.state === 'bonded').length;
  // The atom on the paper is loaded, not waiting - counting it here said
  // "one collected and waiting" when the tray was empty.
  const waiting = snapshot.heldIds.filter((id) => id !== snapshot.paper.loadedAtomId).length;
  const loaded = snapshot.paper.loadedAtomId ? ' One is loaded, ready to throw.' : '';
  return `Building ${spec.name}. ${bonded} of ${spec.hydrogenCount} hydrogens bonded, ${waiting} collected and waiting.${loaded} ${snapshot.score} points, ${time}.`;
}
