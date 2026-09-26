/**
 * The gameplay state machine.
 *
 * These are game states, not Figma frames. The 31 transcribed frames stay what
 * they always were - drawings - and the renderer picks what to draw from the
 * phase, never the other way round.
 */

export type Phase =
  | 'INTRO_OBJECTIVE'
  | 'CARBON_SELECTION'
  /** The thrown paper is crossing the table towards the carbon group. */
  | 'PAPER_FLIGHT'
  /** The paper has struck the pair; the reaction and bond are playing. */
  | 'CARBON_IMPACT'
  | 'CARBON_STRUCTURE_READY'
  | 'HYDROGEN_CALCULATION'
  | 'HYDROGEN_SELECTION'
  | 'HYDROGEN_COLLECTION'
  | 'THROWING'
  | 'COLLISION'
  | 'MOLECULE_VALIDATION'
  | 'COMPLETION'
  | 'TIMEOUT'
  | 'SUMMARY';

/**
 * Where each phase may lead. Retries, misses and wrong colours are not phases:
 * they are recorded events that leave the player where they are, which is what
 * keeps the game from punishing a mistake by ending it.
 */
const TRANSITIONS: Record<Phase, Phase[]> = {
  INTRO_OBJECTIVE: ['CARBON_SELECTION'],
  // The carbon phase: aim, throw the paper, watch it land, watch the pair bond.
  CARBON_SELECTION: ['PAPER_FLIGHT'],
  PAPER_FLIGHT: ['CARBON_IMPACT', 'CARBON_SELECTION'],
  CARBON_IMPACT: ['CARBON_STRUCTURE_READY'],
  CARBON_STRUCTURE_READY: ['THROWING', 'HYDROGEN_CALCULATION'],
  HYDROGEN_CALCULATION: ['HYDROGEN_SELECTION'],
  // A throw made straight from the selection phase has to be allowed to move
  // the phase with it; without this route the throw resolves into a phase the
  // validator does not look at, and a winning bond goes unnoticed.
  HYDROGEN_SELECTION: ['HYDROGEN_COLLECTION', 'THROWING'],
  HYDROGEN_COLLECTION: ['THROWING', 'HYDROGEN_SELECTION'],
  THROWING: ['COLLISION', 'MOLECULE_VALIDATION', 'HYDROGEN_COLLECTION'],
  COLLISION: ['MOLECULE_VALIDATION', 'THROWING'],
  // Validation can hand the player back to collecting: a throw that missed
  // with nothing left in the tray has to lead somewhere, or the round stalls.
  MOLECULE_VALIDATION: [
    'THROWING',
    'HYDROGEN_CALCULATION',
    'HYDROGEN_SELECTION',
    'HYDROGEN_COLLECTION',
    'CARBON_STRUCTURE_READY',
    'COMPLETION',
  ],
  COMPLETION: ['SUMMARY'],
  TIMEOUT: ['SUMMARY'],
  SUMMARY: [],
};

/** Time running out can interrupt anything that is still being played. */
const ACTIVE_PHASES: Phase[] = [
  'CARBON_SELECTION',
  'PAPER_FLIGHT',
  'CARBON_IMPACT',
  'CARBON_STRUCTURE_READY',
  'HYDROGEN_CALCULATION',
  'HYDROGEN_SELECTION',
  'HYDROGEN_COLLECTION',
  'THROWING',
  'COLLISION',
  'MOLECULE_VALIDATION',
];

export function isActive(phase: Phase): boolean {
  return ACTIVE_PHASES.includes(phase);
}

export function canTransition(from: Phase, to: Phase): boolean {
  if (to === 'TIMEOUT') return isActive(from);
  return TRANSITIONS[from].includes(to);
}
