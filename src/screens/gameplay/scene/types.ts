/**
 * Scene description for one gameplay state.
 *
 * A scene is plain data: which atoms are where, which lines and images are
 * drawn, what the rail and instruction card show. The renderer turns it into
 * pixels and knows no chemistry. Today every scene is transcribed from a Figma
 * frame; later the game engine will produce the same shape from real game
 * state, and the renderer will not need to change.
 *
 * Coordinates are design pixels inside the ruled centre frame (the element
 * Figma calls "Frame"), exactly as the Figma export positions them. `left` may
 * be a CSS calc() string when Figma centres an element, in which case
 * `centerX` applies Figma's translateX(-50%).
 */

export type Css = number | string;

/** Hydrogen colours used by the flow. Each maps to a Figma ellipse asset. */
export type HydrogenColor = 'blue' | 'red' | 'green';

/** Carbon fills: blue #0795ff, red #fd2121, green #69a13b. */
export type CarbonColor = 'blue' | 'red' | 'green';

type Placement = {
  left: Css;
  top: number;
  /** Figma's `-translate-x-1/2`: `left` is the element's centre line. */
  centerX?: boolean;
  /**
   * Figma interleaves some elements with the ruled lines, which changes what
   * draws on top. When set, the element is drawn right after this many rules.
   * Elements without it draw after all rules.
   */
  afterRule?: number;
  /** Stable identity across scenes, so elements can animate between states. */
  key?: string;
};

/**
 * A carbon pill (Figma "Single bind"). `large` is the 88.56 x 82 play-area
 * carbon; `small` is the 54 x 50 carbon used in the selectable groups.
 */
export type CarbonElement = Placement & {
  kind: 'carbon';
  color: CarbonColor;
  size?: 'large' | 'small';
  /** Opacity of the white top stroke; Figma's exports draw it translucent. */
  highlight?: number;
  /**
   * Extra transform applied about the pill's centre. The engine-driven scene
   * uses it for the growth and the squash of a struck carbon; the transcribed
   * Figma frames never set it.
   */
  transform?: string;
};

/** Selectable groups of small carbons (e.g. Figma 4589:22110). */
export type CarbonGroupsElement = Placement & {
  kind: 'carbonGroups';
  /** Gap between groups; Figma uses 41. */
  gap: number;
  groups: CarbonColor[][];
  highlight?: number;
};

/** A line of text placed on the play area, e.g. "Select the carbon". */
export type TextElement = Placement & {
  kind: 'text';
  text: string;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  color: string;
};

/**
 * A sized box holding absolutely placed children, as Figma groups some
 * elements (e.g. the carbon pair with its bond, Figma 4589:24720).
 */
export type GroupElement = Placement & {
  kind: 'group';
  width: number;
  height: number;
  children: SceneElement[];
};

/** A loose hydrogen (Figma "\Mocule", 47 x 47). */
export type HydrogenElement = Placement & {
  kind: 'hydrogen';
  color: HydrogenColor;
  /** Disc art when Figma uses a variant (e.g. the outline-less bonded disc). */
  art?: string;
  /** Uniform scale, for the motion-blur pairs some frames draw mid-flight. */
  scale?: number;
  rotate?: number;
  opacity?: number;
};

/** A row of hydrogens in a bordered tray. */
export type TrayElement = Placement & {
  kind: 'tray';
  /**
   * dashed - selection row: 1px dashed #d4cdcd, radius 8, white layer.
   * solid  - collected hydrogens: white, 1px solid #d8d8d8, radius 5.
   * plain  - ethane tray: white, 1px solid #e8e8e8, radius 8.
   */
  variant: 'dashed' | 'solid' | 'plain';
  /** Explicit width where Figma sets one. */
  width?: number;
  /** Overrides of the variant's look, for trays Figma draws off-pattern. */
  borderColor?: string;
  /** false when Figma gives the tray no white fill. */
  filled?: boolean;
  padding: { top: number; right: number; bottom: number; left: number };
  gap: number;
  /** Inner shadow Figma draws on dashed trays. */
  innerShadow?: string;
  atoms: HydrogenColor[];
};

/**
 * A rotated line bitmap: bond slots and paper trajectories. Mirrors Figma's
 * export - a positioned box, a rotation, and a zero-height strip holding the
 * image, raised by `inset` pixels.
 */
export type LineElement = Placement & {
  kind: 'line';
  src: string;
  width: number;
  height: number;
  rotate?: number;
  length: number;
  /**
   * How far the image bleeds around its strip. A number n means Figma's
   * `inset-[-npx_0_0_0]`; a string is used as the CSS inset verbatim.
   */
  inset: number | string;
};

/** Any other bitmap: paper, arrows, splash. `inset` is Figma's bleed. */
export type ImageElement = Placement & {
  kind: 'image';
  src: string;
  width: number;
  height: number;
  inset?: string;
  rotate?: number;
  opacity?: number;
  /** CSS mix-blend-mode, where Figma sets a layer blend. */
  blendMode?: string;
};

/**
 * A plain bordered container: the white group boxes and the dashed selection
 * tray, drawn without their contents. The engine-driven scene uses it so that
 * atoms can be placed at their own coordinates and leave the box one at a time
 * as they are collected; the transcribed Figma frames keep using `tray`.
 */
export type BoxElement = Placement & {
  kind: 'box';
  width: number;
  height: number;
  border: 'dashed' | 'solid';
  borderColor: string;
  radius: number;
  filled?: boolean;
  innerShadow?: string;
};

/** The translucent highlight Figma lays over the active prefix chip. */
export type HighlightElement = Placement & {
  kind: 'highlight';
  width: number;
  height: number;
};

/**
 * Where the prefix rail and the instruction panel sit in Figma's layer order.
 * Their content lives on the scene (`rail`, `panel`); these only place them.
 */
export type MarkerElement = {
  kind: 'rail' | 'panel';
  afterRule?: number;
  key?: string;
};

export type SceneElement =
  | CarbonElement
  | CarbonGroupsElement
  | TextElement
  | GroupElement
  | HydrogenElement
  | TrayElement
  | LineElement
  | ImageElement
  | HighlightElement
  | BoxElement
  | MarkerElement;

export type RailSpec = {
  left: number;
  top: number;
  /** Rail container width; 1180 on the methane frames, 1182 on ethane. */
  width?: number;
  /** Figma gives the rail container 132px, or 153px on some frames. */
  containerHeight: number;
  /** Explicit inner height where Figma sets one. */
  innerHeight?: number;
  /** Index into the prefix list of the enlarged chip. */
  activeIndex: number;
  activeScale: number;
  activeOutline: string;
  activeHatch: string;
  /** Art of the other chips; defaults to the standard dc754 / eaad0 pair. */
  inactiveOutline?: string;
  inactiveHatch?: string;
  /** The highlight drawn inside the active chip on some frames. */
  highlightInChip?: { left: number; top: number; width: number; height: number };
  timeline: string;
  /** Offsets of the chip row box and timeline; defaults 3 / 14 and 0. */
  innerLeft?: number;
  innerTop?: number;
  /** Width of the chip row box; 1173 by default. */
  innerWidth?: number;
  timelineLeft?: number;
  /**
   * The finished-molecule state fills the active chip (e.g. Figma E16): solid
   * background, light label, and an outline image that bleeds by `outlineInset`.
   */
  activeFill?: { background: string; textColor: string; outlineInset: string };
};

/**
 * The instruction panel. `column` is the methane layout: a 932px column with
 * the paper plane above the card, centred on `left`. `card` is the ethane
 * layout: the card alone, placed at `left`/`top` (centred when `centerX`),
 * with the paper drawn as a separate scene image.
 */
export type PanelSpec = {
  layout: 'column' | 'card';
  left: Css;
  top: number;
  centerX?: boolean;
  title: string;
  /** Empty when Figma draws a title-only card. */
  body: string;
  /** An explanation of the last mistake, drawn under the body. */
  note?: string;
  /** Card width; 932 except the small result card (240) on the finished molecule. */
  width?: number;
  /** Extra art Figma places inside the panel column, e.g. the paper arrows. */
  extras?: ImageElement[];
};

export type FrameSpec = {
  left: Css;
  width: number;
  /** Figma spaces the rules with a 48px gap, or spreads them (justify-between). */
  layout?: 'gap' | 'between';
  /** Figma leaves the height off on some frames and sizes rules explicitly. */
  explicitHeight: boolean;
  /** 22 rule bitmaps, left to right. */
  rules: string[];
};

export type Scene = {
  id: string;
  /** The Figma frame this scene reproduces. */
  figmaNode: string;
  figmaName: string;
  frame: FrameSpec;
  rail: RailSpec;
  panel: PanelSpec;
  /** Elements inside the ruled frame, in Figma layer order. */
  elements: SceneElement[];
  /** Elements Figma places on the page itself, after the frame, in order. */
  rootElements?: SceneElement[];
};
