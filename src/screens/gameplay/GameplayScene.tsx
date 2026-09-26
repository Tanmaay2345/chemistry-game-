import { Fragment, type ReactNode } from 'react';
import { InstructionCard } from '../../components/InstructionCard';
import { GameRail } from './components/GameRail';
import { Box, Carbon, CarbonGroups, ChipHighlight, Hydrogen, Line, PlacedImage, PlacedText, Tray } from './components/SceneElements';
import type { Scene, SceneElement } from './scene/types';

/**
 * Draws one gameplay scene: the pencil-band background, the ruled centre frame
 * with every scene element in Figma's layer order, and the instruction panel.
 *
 * Interaction is reported, not handled: an element whose `key` matches
 * `hotspot` becomes the clickable target, and clicking it calls `onHotspot`.
 * What that click means is decided by the flow (and later by the engine).
 */

type Props = {
  scene: Scene;
  hotspot?: string;
  onHotspot?: () => void;
  /**
   * Advances from the instruction card on a step whose hotspot is some other
   * element.
   *
   * The card is the control every lesson screen before this one uses, so it is
   * the one thing a learner has been taught to reach for. It also cannot be
   * covered: a scene element hotspot is wrapped in a `display: contents` box,
   * which has no area of its own, so a sibling drawn on top of it swallows the
   * click and the walkthrough stops with nothing to press. The card is always
   * there and always works.
   */
  onCardAdvance?: () => void;
  /**
   * Draw the pencil bands inside the frame, at Figma's page positions. Off
   * when the responsive viewport draws them against the window instead.
   */
  bands?: boolean;
  /**
   * Length of each ruled line in design pixels. Figma's is 1022; the
   * responsive viewport asks for more so the lines reach the window edges.
   */
  ruleLength?: number;
};

const RULE_LENGTH = 1022;

function Band({ left }: { left: number }) {
  return (
    <div style={{ position: 'absolute', backgroundColor: '#ffffff', alignContent: 'stretch', display: 'flex', gap: 24, height: 1025, alignItems: 'center', left, top: 0 }}>
      <div style={{ height: 1035, position: 'relative', flexShrink: 0, width: 53 }}>
        <img alt="" src="/figma/d77c7.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
      <div style={{ height: 1026, position: 'relative', flexShrink: 0, width: 53 }}>
        <img alt="" src="/figma/2f6db.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

/**
 * One ruled line. At Figma's length it is the exported bitmap as-is; when the
 * window needs a longer line, the bitmap repeats outwards from the centre
 * rather than being stretched, so the pencil texture keeps its scale.
 */
function Rule({ src, explicitHeight, length }: { src: string; explicitHeight: boolean; length: number }) {
  const extended = length > RULE_LENGTH;
  return (
    <div style={{ display: 'flex', height: explicitHeight ? '100%' : 1021.996, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0, width: 2.985 }}>
      <div style={{ flex: 'none', transform: 'rotate(89.83deg)' }}>
        <div style={{ height: 0, position: 'relative', width: length }}>
          <div
            style={{
              position: 'absolute',
              inset: '-1px 0 0 0',
              ...(extended
                ? { backgroundImage: `url(${src})`, backgroundRepeat: 'repeat-x', backgroundSize: `${RULE_LENGTH}px 100%`, backgroundPosition: 'center' }
                : {}),
            }}
          >
            {!extended && <img alt="" src={src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameplayScene({ scene, hotspot, onHotspot, onCardAdvance, bands = true, ruleLength = RULE_LENGTH }: Props) {
  const renderElement = (el: SceneElement, i: number): ReactNode => {
    const body = (() => {
      switch (el.kind) {
        case 'carbon':
          return <Carbon el={el} />;
        case 'carbonGroups':
          return <CarbonGroups el={el} />;
        case 'text':
          return <PlacedText el={el} />;
        case 'group':
          return (
            <div style={{ position: 'absolute', left: el.left, top: el.top, width: el.width, height: el.height, transform: el.centerX ? 'translateX(-50%)' : undefined }}>
              {el.children.map(renderElement)}
            </div>
          );
        case 'hydrogen':
          return <Hydrogen el={el} />;
        case 'tray':
          return <Tray el={el} />;
        case 'line':
          return <Line el={el} />;
        case 'image':
          return <PlacedImage el={el} />;
        case 'highlight':
          return <ChipHighlight el={el} />;
        case 'box':
          return <Box el={el} />;
        case 'rail':
          return <GameRail rail={scene.rail} />;
        case 'panel':
          return <Panel scene={scene} onContinue={hotspot === 'panel' ? onHotspot : onCardAdvance} />;
      }
    })();

    const isHotspot = hotspot !== undefined && el.key === hotspot && el.kind !== 'panel';
    if (!isHotspot) return <Fragment key={el.key ?? i}>{body}</Fragment>;
    return (
      <div
        key={el.key ?? i}
        className="sceneHotspot"
        role="button"
        tabIndex={0}
        onClick={onHotspot}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onHotspot?.();
          }
        }}
        style={{ display: 'contents' }}
      >
        {body}
      </div>
    );
  };

  const byRule = new Map<number, SceneElement[]>();
  const trailing: SceneElement[] = [];
  for (const el of scene.elements) {
    if (el.afterRule === undefined) trailing.push(el);
    else byRule.set(el.afterRule, [...(byRule.get(el.afterRule) ?? []), el]);
  }

  return (
    <div data-scene={scene.id} style={{ backgroundColor: bands ? '#ffffff' : undefined, position: 'relative', width: '100%', height: '100%', overflow: bands ? 'hidden' : 'visible' }}>
      {bands && <Band left={0} />}
      {bands && <Band left={1310} />}
      <div
        style={{
          position: 'absolute',
          backgroundColor: '#ffffff',
          alignContent: 'stretch',
          display: 'flex',
          gap: scene.frame.layout === 'between' ? undefined : 48,
          justifyContent: scene.frame.layout === 'between' ? 'space-between' : undefined,
          height: scene.frame.explicitHeight ? 1022 : undefined,
          alignItems: 'center',
          left: scene.frame.left,
          top: 1,
          width: scene.frame.width,
          transform: 'translateX(-50%)',
        }}
      >
        {scene.frame.rules.map((src, i) => (
          <Fragment key={i}>
            <Rule src={src} explicitHeight={scene.frame.explicitHeight} length={ruleLength} />
            {(byRule.get(i + 1) ?? []).map(renderElement)}
          </Fragment>
        ))}
        {trailing.map(renderElement)}
      </div>
      {scene.rootElements?.map(renderElement)}
    </div>
  );
}

/**
 * The instruction panel. On the methane frames Figma draws a 932px column with
 * the paper plane above the card; on the ethane frames the card stands alone
 * and the paper is a separate scene image.
 */
function Panel({ scene, onContinue }: { scene: Scene; onContinue?: () => void }) {
  const p = scene.panel;
  const card = (
    <InstructionCard title={p.title} body={p.body} note={p.note} width={p.width ?? 932} height={120} tickBottom={116} onContinue={onContinue} />
  );
  if (p.layout === 'card') {
    return (
      <div style={{ position: 'absolute', left: p.left, top: p.top, transform: p.centerX ? 'translateX(-50%)' : undefined }}>
        {card}
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', left: p.left, top: p.top, width: 932, transform: 'translateX(-50%)' }}>
      {p.extras?.map((extra, j) => <PlacedImage key={j} el={extra} />)}
      <div style={{ height: 54.5, position: 'relative', flexShrink: 0, width: 173 }}>
        <div style={{ position: 'absolute', inset: '-1.83% -0.25% -1.87% -1.14%' }}>
          <img alt="" src="/figma/0b2dc.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
      {card}
    </div>
  );
}
