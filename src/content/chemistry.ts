import { PREFIXES, SERIES, type ElementSymbol, type Family, type SeriesName } from '../game/chemistry/elements.ts';
import type { MistakeReason } from '../game/engine/events.ts';

/**
 * Every sentence in this app that states a chemical fact.
 *
 * The Figma file is the source of truth for layout. It is *not* the source of
 * truth for chemistry, because several frames carry transcription errors that
 * teach the wrong thing:
 *
 *   - 4589:30442 (the ene card) reads "Alkanes ... Triple covalent bond" -
 *     wrong series name and wrong bond order on the same line;
 *   - 4589:30400 (the yne card) reads "Alkanes" for an alkyne;
 *   - the methane cards read "two carbon chain" for a one-carbon molecule;
 *   - the Non and Dec prefix cards both read "three carbon";
 *   - the alkyne deck's front card is headed "Alkyl", which is a different
 *     thing entirely (a substituent, not a series).
 *
 * Those are corrected here, once. Screens import from this module instead of
 * holding their own copy, so the same fact cannot drift apart in two files
 * again. Where a correction changes what is drawn, the Figma node is named in
 * a comment next to it.
 */

// ------------------------------------------------------------------ series

export type SeriesCopy = {
  /** Heading on the instruction card: "Alkanes". */
  plural: string;
  /** "Alkane" - the deck card and the summary use the singular. */
  singular: string;
  /** "-ane" */
  suffix: string;
  /** "single" | "double" | "triple" */
  bondWord: string;
  /** The instruction card's sentence: what makes a chain one of these. */
  body: string;
  /** The suffix lesson's heading: ANE, ENE, YNE. */
  suffixTitle: string;
  /** The suffix lesson's sentence, in the voice of Figma's own ANE card. */
  suffixLesson: string;
  /** The deck card's one-line definition. */
  cardLine: string;
  /** CnH2n+2 and friends. */
  generalFormula: string;
};

const BOND_WORD: Record<1 | 2 | 3, string> = { 1: 'single', 2: 'double', 3: 'triple' };

const FORMULA: Record<SeriesName, string> = {
  alkane: 'CnH2n+2',
  alkene: 'CnH2n',
  alkyne: 'CnH2n-2',
};

/**
 * What actually distinguishes each series - which is not the same shape of
 * sentence for all three.
 *
 * An alkane is defined by *every* carbon-carbon bond being single; an alkene
 * by *at least one* being double. "The carbons in the chain are joined by a
 * double bond" would describe a cumulene, where every bond is double: a
 * different class of compound, and not what the screen is teaching.
 */
const DEFINITION: Record<SeriesName, string> = {
  alkane: 'when every carbon-carbon bond in the chain is a single covalent bond .',
  alkene: 'when at least one pair of carbons in the chain is joined by a double covalent bond .',
  alkyne: 'when at least one pair of carbons in the chain is joined by a triple covalent bond .',
};

function copyFor(name: SeriesName): SeriesCopy {
  const series = SERIES[name];
  const title = `${name[0].toUpperCase()}${name.slice(1)}`;
  const bond = BOND_WORD[series.bondOrder];
  return {
    plural: `${title}s`,
    singular: title,
    suffix: `-${series.suffix}`,
    bondWord: bond,
    body: DEFINITION[name],
    // Figma's ANE card is the one card on the suffix screen that was
    // transcribed correctly; its sentence is used for all three endings.
    suffixTitle: series.suffix.toUpperCase(),
    suffixLesson: `In ${bond} bond carbon chain , the surname we used called ${series.suffix.toUpperCase()} .`,
    cardLine: `${bond[0].toUpperCase()}${bond.slice(1)} carbon to carbon bond .`,
    generalFormula: FORMULA[name],
  };
}

export const SERIES_COPY: Record<SeriesName, SeriesCopy> = {
  alkane: copyFor('alkane'),
  alkene: copyFor('alkene'),
  alkyne: copyFor('alkyne'),
};

/** The colour a series is drawn in is the series: blue IS the single bond. */
export const SERIES_BY_FAMILY: Record<Family, SeriesName> = {
  blue: 'alkane',
  red: 'alkene',
  green: 'alkyne',
};

/**
 * What a colour means, said in a way that is true of the atom it is on.
 *
 * On a carbon the colour really is the bond: a red carbon is one that forms a
 * double bond. On a **hydrogen** it is not, and cannot be - hydrogen has one
 * valency and can only ever form a single bond, so "a double-bond hydrogen"
 * is not a thing. For a hydrogen the colour says which set the atom belongs
 * to, which is what the game is actually asking the player to match.
 *
 * The mechanic is unchanged; only the claim made about it is.
 */
export function describeFamily(family: Family, element: ElementSymbol = 'C'): string {
  const name = SERIES_BY_FAMILY[family];
  if (element === 'H') return `${family} - from the ${name} set`;
  return `${family} (${name}, ${BOND_WORD[SERIES[name].bondOrder]} bond)`;
}

/**
 * The badge drawn on a pool atom so colour is never the only signal.
 *
 * A carbon gets the bond its colour stands for, in the notation the bond
 * itself is drawn in. A hydrogen gets the *set* instead: two strokes above a
 * red hydrogen would say it forms a double bond, which is false.
 */
export const FAMILY_GLYPH: Record<Family, string> = {
  blue: '–', // en dash: one bond
  red: '=',
  green: '≡',
};

export const FAMILY_SET_LABEL: Record<Family, string> = {
  blue: 'ane',
  red: 'ene',
  green: 'yne',
};

/**
 * Why carbon makes four bonds.
 *
 * The rule the whole game rests on: every free bond marker, the hydrogen sum
 * and the reason hydrogens are needed at all follow from it. The onboarding
 * screen asks the question in its heading and used to answer it only in a chip
 * that was drawn behind another chip, so a learner reached the game never
 * having been told.
 */
export const CARBON_VALENCY_LESSON =
  'Carbon has six electrons, and four of them sit in its outer shell - so it has four places to bond . ' +
  'That is what valency 4 means . Every carbon has to end up with four bonds , and the hydrogens are what fill the ones a carbon chain does not use .';

/** The clock's one warning, in words. */
export function timeWarningCopy(seconds: number): string {
  return `${seconds} seconds left.`;
}

/** The sentence that keeps the hydrogen colours honest, wherever they appear. */
export const HYDROGEN_COLOUR_NOTE =
  'A colour says which set an atom belongs to. Hydrogen always makes a single bond, whatever colour it is.';

// ----------------------------------------------------------------- prefixes

const NUMBER_WORD = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/**
 * The prefix card's sentence, with the right number in it.
 *
 * Figma's Meth card reads "when you see one carbon making love with another
 * carbon or hydrogen ."; the Non and Dec cards keep the phrasing but both say
 * "three carbon", which is simply the Meth card pasted twice. The voice is
 * Figma's; the number is arithmetic.
 */
export function prefixBody(carbonCount: number): string {
  const word = NUMBER_WORD[carbonCount - 1] ?? String(carbonCount);
  return `when you see ${word} carbon making love with another carbon or hydrogen .`;
}

export function prefixName(carbonCount: number): string {
  return PREFIXES[carbonCount - 1] ?? '';
}

// -------------------------------------------------------- hydrogen counting


// -------------------------------------------------------------- what to say

/**
 * Why that was wrong, in the player's own terms.
 *
 * The engine decides *that* something was a mistake and says what kind; this
 * decides what the player reads. A mistake is never reported as "Wrong." -
 * every branch here names the rule that was broken and what to do instead.
 */
export function explainMistake(reason: MistakeReason): string {
  switch (reason.kind) {
    case 'WRONG_CARBON_FAMILY': {
      const picked = SERIES_BY_FAMILY[reason.picked];
      const wanted = SERIES_BY_FAMILY[reason.expected];
      return (
        `That set has a ${reason.picked} carbon in it, and ${reason.picked} is the ${picked} set - ` +
        `${BOND_WORD[SERIES[picked].bondOrder]} bonds. An ${wanted} is built from ${reason.expected} carbons only. Throw again.`
      );
    }
    case 'WRONG_CARBON_COUNT':
      return (
        `That group has ${reason.picked} carbon${reason.picked === 1 ? '' : 's'}; ` +
        `"${reason.molecule}" starts with "${prefixName(reason.expected)}", so it needs ${reason.expected}. Throw again.`
      );
    case 'WRONG_HYDROGEN_FAMILY': {
      const picked = SERIES_BY_FAMILY[reason.picked];
      const wanted = SERIES_BY_FAMILY[reason.expected];
      // One sentence covers two moments: the pick, when the atom is still on
      // the paper, and the throw that fails, when it has just been put back.
      // It said "has gone back to the row" at both, which was untrue at the
      // first - the player could see it sitting on the paper. Stating the rule
      // rather than a past event is accurate whichever moment it is read in.
      return (
        `That hydrogen is from the ${reason.picked} set, which belongs to the ${picked}s. ` +
        `${HYDROGEN_COLOUR_NOTE} An ${wanted} is built from its own ${reason.expected} set, ` +
        `so this one will not bond - it goes back to the row instead. Pick a ${reason.expected} one.`
      );
    }
    case 'TRAY_FULL':
      return 'Your paper is already holding a hydrogen. Throw that one at a free bond first, then collect the next.';
    case 'NO_FREE_BOND':
      return 'That carbon already has all four of its bonds. Aim at a carbon that still shows a free bond marker.';
    case 'THROW_MISSED':
      return 'That throw landed on nothing. Aim along the line to one of the free bond markers.';
    default:
      return '';
  }
}
