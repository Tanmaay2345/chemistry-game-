import { SERIES_COPY } from '../../../content/chemistry.ts';
import { FrameStroke } from '../../../components/FrameStroke';

/**
 * Paper plane and instruction card, as drawn on "A1" (dashed frame drawn as an overlay).
 * Generated from the Figma export and kept in Figma coordinates (1440 x 1024).
 */
type Props = {
  /** Advances the flow; the frame draws no button, so the panel is the control. */
  onContinue?: () => void;
};

export function InstructionPanel({ onContinue }: Props) {
  return (
    <>
      <div className={onContinue ? 'panelContinue' : undefined}
        onClick={onContinue}
        role={onContinue ? 'button' : undefined}
        tabIndex={onContinue ? 0 : undefined}
        // The card is the control; say so, after saying what it teaches.
        aria-label={onContinue ? `${SERIES_COPY.alkane.plural} ${SERIES_COPY.alkane.body} Continue.` : undefined}
        onKeyDown={(event) => {
          if (onContinue && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onContinue();
          }
        }}
        style={{ position: "absolute", alignContent: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", left: "calc(50% + 19px)", top: 699, width: 932, transform: "translateX(-50%)" }}>
        <div style={{ height: 54.5, position: "relative", flexShrink: 0, width: 173 }}>
          <div style={{ position: "absolute", inset: "-1.83% -0.25% -1.87% -1.14%" }}>
            <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/0b2dc.svg" />
          </div>
        </div>
        <div style={{ backgroundColor: "#ffffff", borderWidth: 4, borderColor: "transparent", borderStyle: "solid", height: 120, alignContent: "stretch", display: "flex", gap: 16, alignItems: "center", padding: 24, position: "relative", borderRadius: 16, flexShrink: 0, width: "100%" }}>
<FrameStroke width={932} height={120} strokeWidth={4} color="#5bb9ff" dash="2 2" radius={16} left={-4} top={-4} />
          <div style={{ height: 64, position: "relative", flexShrink: 0, width: 62 }}>
            <div style={{ position: "absolute", left: 5, width: 53, height: 53, top: 5 }}>
              <img alt="" style={{ position: "absolute", display: "block", inset: 0, maxWidth: "none", width: "100%", height: "100%" }} src="/figma/3b9df.svg" />
            </div>
            <p style={{ wordBreak: "break-word", position: "absolute", fontFamily: "Lexend, sans-serif", fontWeight: 700, lineHeight: "normal", left: 16, fontSize: 20, color: "#ffffff", top: 19, whiteSpace: "nowrap" }}>
              c-c
            </p>
            <div style={{ position: "absolute", left: 30, width: 12, height: 12, top: 52 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/597b7.svg" />
              </div>
            </div>
            <div style={{ position: "absolute", left: 44, width: 12, height: 12, top: 44 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/a284a.svg" />
              </div>
            </div>
            <div style={{ position: "absolute", left: 47, width: 12, height: 12, top: 7 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/6e9db.svg" />
              </div>
            </div>
            <div style={{ position: "absolute", left: 50, width: 12, height: 12, top: 30 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/5a2bf.svg" />
              </div>
            </div>
            <div style={{ position: "absolute", left: 33, width: 12, height: 12, top: 0 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/023f1.svg" />
              </div>
            </div>
            <div style={{ position: "absolute", left: 13, width: 12, height: 12, top: 1 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/73bd4.svg" />
              </div>
            </div>
            <div style={{ position: "absolute", left: 1, width: 12, height: 12, top: 14 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/a284a.svg" />
              </div>
            </div>
            <div style={{ position: "absolute", left: 0, width: 12, height: 12, top: 30 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/16ac4.svg" />
              </div>
            </div>
            <div style={{ position: "absolute", left: 8, width: 12, height: 12, top: 46 }}>
              <div style={{ position: "absolute", inset: "0 6.7%" }}>
                <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/5a2bf.svg" />
              </div>
            </div>
          </div>
          <div style={{ wordBreak: "break-word", alignContent: "stretch", display: "flex", flex: "1 0 0", flexDirection: "column", gap: 8, alignItems: "flex-start", lineHeight: "normal", minWidth: 1, position: "relative" }}>
            <p style={{ fontFamily: "Lexend, sans-serif", fontWeight: 600, position: "relative", flexShrink: 0, fontSize: 24, color: "#000000", width: "100%" }}>{`${SERIES_COPY.alkane.plural} `}</p>
            <p style={{ fontFamily: "Lexend, sans-serif", fontWeight: 500, position: "relative", flexShrink: 0, color: "#6d6d6d", fontSize: 18, width: "100%" }}>
              {SERIES_COPY.alkane.body}
            </p>
          </div>
          <div style={{ position: "absolute", height: 0, left: 1, top: 116, width: 39 }}>
            <div style={{ position: "absolute", inset: "-7px 0 0 0" }}>
              <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/ddfd1.svg" />
            </div>
          </div>
          <div style={{ position: "absolute", height: 0, left: 1, top: 2, width: 39 }}>
            <div style={{ position: "absolute", inset: "-7px 0 0 0" }}>
              <img alt="" style={{ display: "block", maxWidth: "none", width: "100%", height: "100%" }} src="/figma/ddfd1.svg" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
