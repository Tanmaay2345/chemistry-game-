/**
 * The "c-c" cog badge used by the instruction cards
 * (Figma 4673:1303 on H2, 4246:1294 on H3 - identical geometry).
 *
 * A blue circle with the label, ringed by nine small triangles.
 */

const spikes = [
  { src: '/figma/597b7.svg', left: 30, top: 52 },
  { src: '/figma/a284a.svg', left: 44, top: 44 },
  { src: '/figma/6e9db.svg', left: 47, top: 7 },
  { src: '/figma/5a2bf.svg', left: 50, top: 30 },
  { src: '/figma/023f1.svg', left: 33, top: 0 },
  { src: '/figma/73bd4.svg', left: 13, top: 1 },
  { src: '/figma/a284a.svg', left: 1, top: 14 },
  { src: '/figma/16ac4.svg', left: 0, top: 30 },
  { src: '/figma/5a2bf.svg', left: 8, top: 46 },
];

export function CogBadge() {
  return (
    // Decoration. It is the first thing inside every instruction card, so
    // without this a screen reader announced each card as "c-c" before the
    // lesson on it - and on the cards that are also the continue control,
    // "c-c" was the whole name of the button.
    <div aria-hidden="true" style={{ height: 64, position: 'relative', flexShrink: 0, width: 62 }}>
      <div style={{ position: 'absolute', left: 5, top: 5, width: 53, height: 53 }}>
        <img alt="" src="/figma/3b9df.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
      <p
        style={{
          wordBreak: 'break-word',
          position: 'absolute',
          fontFamily: 'Lexend, sans-serif',
          fontWeight: 700,
          lineHeight: 'normal',
          left: 16,
          fontSize: 20,
          color: '#ffffff',
          top: 19,
          whiteSpace: 'nowrap',
        }}
      >
        c-c
      </p>
      {spikes.map((spike, i) => (
        <div key={i} style={{ position: 'absolute', left: spike.left, top: spike.top, width: 12, height: 12 }}>
          <div style={{ position: 'absolute', inset: '0 6.7%' }}>
            <img alt="" src={spike.src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
