import type { Scene } from '../scene/types';
import { METHANE_SCENES } from './methane';
import { METHANE_SCENES_B } from './methaneB';
import { METHANE_SCENES_C } from './methaneC';
import { ETHANE_SCENES_A } from './ethaneA';
import { ETHANE_SCENES_B } from './ethaneB';

/** Every gameplay scene, in Figma order: the methane row, then the ethane row. */
export const GAMEPLAY_SCENES: Scene[] = [
  ...METHANE_SCENES,
  ...METHANE_SCENES_B,
  ...METHANE_SCENES_C,
  ...ETHANE_SCENES_A,
  ...ETHANE_SCENES_B,
];
