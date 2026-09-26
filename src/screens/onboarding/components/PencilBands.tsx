/**
 * Dense pencil bands at the left and right edges of Figma frame "H3"
 * (4244:894 and 4244:929). Each band is two 53px groups of ruled lines,
 * exported as single SVGs, 24px apart.
 */
export function PencilBands() {
  return (
    <>
      <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', gap: 24, height: 1019, alignItems: 'center', left: 48, top: 0 }}>
        <div style={{ height: 1035, position: 'relative', flexShrink: 0, width: 53 }}>
          <img alt="" src="/figma/1d543.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
        <div style={{ height: 1026, position: 'relative', flexShrink: 0, width: 53 }}>
          <img alt="" src="/figma/17c7b.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', gap: 24, height: 1024, alignItems: 'center', left: 'calc(83.33% + 56.67px)', top: 0 }}>
        <div style={{ height: 1026, position: 'relative', flexShrink: 0, width: 53 }}>
          <img alt="" src="/figma/fb1da.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
        <div style={{ height: 1026, position: 'relative', flexShrink: 0, width: 53 }}>
          <img alt="" src="/figma/17c7b.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
    </>
  );
}
