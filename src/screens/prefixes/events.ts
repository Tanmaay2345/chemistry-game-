/**
 * Events emitted by the prefix introduction screen.
 *
 * This is the seam a voice layer (Sarvam, later) will subscribe to. The screen
 * owns no audio: it reports what it is showing and when, and something else
 * decides whether to speak. Nothing here calls a service.
 */

export type PrefixEvent =
  | { type: 'instructionStarted'; prefix: string; carbonCount: number }
  | { type: 'prefixShown'; prefix: string; carbonCount: number; index: number }
  | { type: 'prefixChanged'; from: string; to: string; carbonCount: number; index: number }
  | { type: 'instructionCompleted'; prefix: string; carbonCount: number };

export type PrefixEventHandler = (event: PrefixEvent) => void;
