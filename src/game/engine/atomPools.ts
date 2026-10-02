import type { Family } from '../chemistry/elements.ts';
import type { MoleculeSpec } from '../chemistry/formula.ts';

/**
 * The atoms a challenge puts on the table.
 *
 * A pool is two lists of colours: the carbon groups offered, and the mixed
 * hydrogen row. Both used to be written out by hand for every molecule, which
 * is fine while the molecules are ones Figma drew and unworkable the moment
 * they are not - the counts come from valency, and valency is already known.
 *
 * So a challenge may still carry its own lists, and where it does they win:
 * methane and ethane are drawn in Figma and stay exactly as they were. Where
 * it does not, these build them from the molecule's own chemistry. Nothing
 * here knows the name of a molecule.
 *
 * The sizes are deliberately the ones the authored pools used - four carbon
 * groups and thirteen hydrogens - because the row's geometry is computed from
 * its length (`hydrogenRowPosition`, `hydrogenRowBox`). Generating a different
 * number of atoms would move the box the player is looking at.
 */

/** Carbon groups offered, including the right one. Matches the authored rows. */
export const CARBON_GROUP_COUNT = 4;

/** Hydrogens in the row. The row's width and spacing are derived from this. */
export const HYDROGEN_ROW_SIZE = 13;

/** Spare correct hydrogens beyond the molecule's requirement. */
const HYDROGEN_SPARE = 3;

/** The families a pool draws its wrong answers from. */
const ALL_FAMILIES: Family[] = ['blue', 'red', 'green'];

/** The families that are not the answer, in a fixed order. */
function distractorFamilies(correct: Family): Family[] {
  return ALL_FAMILIES.filter((family) => family !== correct);
}

/**
 * Which group holds the answer.
 *
 * Deterministic, so a pool is the same every time it is built and a test can
 * name the group - but not always the same slot, which it would be if the
 * answer were simply first. The formula lands methane on the group its Figma
 * row uses, and propane on the one its authored row used.
 */
export function answerGroupIndex(carbonCount: number): number {
  return (carbonCount - 1) % CARBON_GROUP_COUNT;
}

/**
 * The carbon groups for a molecule: one right answer and three near misses.
 *
 * The wrong groups are wrong in the two ways the game teaches - the right
 * size in the wrong colours, and the right colour in the wrong size - so a
 * player who has understood only one of the rules still has to use the other.
 */
export function generateCarbonGroups(spec: MoleculeSpec): Family[][] {
  const [otherA, otherB] = distractorFamilies(spec.family);
  const answer = Array.from({ length: spec.carbonCount }, () => spec.family);

  // Right size, wrong colours: the chain is the length it should be, but the
  // atoms do not belong to one family, so it could never bond as one. A single
  // carbon cannot be mixed with anything, so there the whole group is wrong -
  // otherwise it would be a second copy of the answer.
  const mixed =
    spec.carbonCount > 1
      ? answer.map((family, i) => (i === 0 ? family : otherA))
      : [otherA];
  // Right colour, wrong size - one too many, and one too few where there is
  // room for it. A single carbon has no shorter group, so it offers a longer
  // one of the other family instead.
  const tooMany = Array.from({ length: spec.carbonCount + 1 }, () => spec.family);
  const tooFew =
    spec.carbonCount > 1
      ? Array.from({ length: spec.carbonCount - 1 }, () => spec.family)
      : Array.from({ length: spec.carbonCount + 1 }, () => otherB);

  const groups = [mixed, tooMany, tooFew];
  groups.splice(answerGroupIndex(spec.carbonCount), 0, answer);
  return groups.slice(0, CARBON_GROUP_COUNT);
}

/**
 * The hydrogen row: enough of the right family to finish, and enough of the
 * wrong ones to make the choice a choice.
 *
 * The spare matters. A row holding exactly as many correct atoms as the
 * molecule needs turns a single wrong pick into a dead round, and picking
 * wrongly is something this game lets a player do on purpose.
 */
export function generateHydrogenRow(spec: MoleculeSpec): Family[] {
  const others = distractorFamilies(spec.family);
  const correct = Math.min(HYDROGEN_ROW_SIZE - others.length, spec.hydrogenCount + HYDROGEN_SPARE);

  const row: Family[] = [];
  let taken = 0;
  for (let i = 0; i < HYDROGEN_ROW_SIZE; i += 1) {
    const wrongLeft = HYDROGEN_ROW_SIZE - i - (correct - taken);
    // Spread the wrong ones through the row rather than leaving them in a
    // block at the end, which would make the row readable without reading it.
    const wrongTurn = wrongLeft > 0 && i % 4 === 1;
    if (taken < correct && !wrongTurn) {
      row.push(spec.family);
      taken += 1;
    } else {
      row.push(others[(i + taken) % others.length]);
    }
  }
  return row;
}

/** What a challenge carries, when it carries its own pool. */
type Authored = { carbonGroups?: Family[][]; hydrogenRow?: Family[] };

/** The authored carbon groups, or the ones this molecule's chemistry implies. */
export function carbonGroupsFor(challenge: Authored, spec: MoleculeSpec): Family[][] {
  return challenge.carbonGroups ?? generateCarbonGroups(spec);
}

/** The authored hydrogen row, or the one this molecule's chemistry implies. */
export function hydrogenRowFor(challenge: Authored, spec: MoleculeSpec): Family[] {
  return challenge.hydrogenRow ?? generateHydrogenRow(spec);
}
