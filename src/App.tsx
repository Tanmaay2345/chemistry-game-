import { lazy, startTransition, useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { Stage } from './stage/Stage';
import { OnboardingScreen } from './screens/onboarding/OnboardingScreen';
import { PrefixIntroScreen } from './screens/prefixes/PrefixIntroScreen';
import type { PrefixEvent } from './screens/prefixes/events';
import { AlkaneScreen } from './screens/Alkane/AlkaneScreen';
import { AlkeneScreen } from './screens/Alkene/AlkeneScreen';
import { AlkyneScreen } from './screens/Alkyne/AlkyneScreen';
import { ALKANE_PROGRESSION, nextAlkane } from './game/engine/config.ts';
import { useLessonVoice, usePrefixVoice, useWalkthroughVoice } from './game/voice/useLessonVoice.ts';
import { GAMEPLAY_STEPS } from './screens/gameplay/flow/steps';
import { assetsForScreen } from './screens/screenAssets.ts';
import { preloadAssets } from './screens/assetPreloader.ts';
import { holdFor, playsItself } from './screens/lessonTimeline.ts';
import {
  WARM_GAMEPLAY_ASSETS_FROM,
  nextScreen,
  screenFromScrap,
  type Screen,
} from './screens/flow.ts';

/**
 * The two gameplay routes are split out of the opening bundle.
 *
 * Between them they pull in the engine, the physics and the 31 transcribed
 * scenes - none of which the sign-in screen can use, and all of which a
 * student used to download before they could press a button. The chunk is
 * fetched again as soon as they are past sign-in (below), so it is in memory
 * long before the walkthrough opens. `import()` caches, so the warm-up and
 * the lazy render are one request, not two.
 */
const GameplayFlow = lazy(() =>
  import('./screens/gameplay/GameplayFlow').then((m) => ({ default: m.GameplayFlow })),
);
const LiveGameplay = lazy(() =>
  import('./screens/gameplay/live/LiveGameplay').then((m) => ({ default: m.LiveGameplay })),
);

/**
 * Screen order so far: sign-in (Figma H1), the carbon-chain prefix rail
 * (Figma 915), then the three bond screens
 * (A1 alkane -> A2 alkene -> A3 alkyne), and then the game.
 *
 * Sign-in is the seam where real authentication will attach later. Prefix
 * events are forwarded to a handler that a voice layer will replace; nothing
 * here knows any chemistry.
 */

/**
 * The screen is the URL.
 *
 * `?step=` was a developer shortcut for checking one frame against Figma; it
 * is now also the address of the screen you are on. Moving forward pushes a
 * history entry, so back and forward walk the flow and a refresh lands where
 * the learner was rather than back at sign-in.
 *
 * `?autoplay=off` still freezes the prefix sequence on its first state, and
 * `?scene=` and `?molecule=` still open one state or one challenge.
 */
function screenFromUrl(): Screen {
  return screenFromScrap(new URLSearchParams(window.location.search).get('step'));
}

/** The same URL with `step` set - every other parameter is kept. */
function urlForScreen(screen: Screen): string {
  const params = new URLSearchParams(window.location.search);
  params.set('step', screen);
  return `${window.location.pathname}?${params.toString()}`;
}

/**
 * Which molecule the game is on: one carbon, then two, then three.
 *
 * `?molecule=` still opens one directly, as it always did. Without it the
 * round starts where the lesson leaves off - methane, the first thing the
 * walkthrough demonstrates and the first chip on the prefix rail.
 */
function moleculeFromUrl(): string {
  const asked = new URLSearchParams(window.location.search).get('molecule');
  return asked && (ALKANE_PROGRESSION as readonly string[]).includes(asked) ? asked : ALKANE_PROGRESSION[0];
}

/**
 * Each screen's artboard, and the band of it that actually holds content.
 *
 * The bands are measured from the rendered frames, not guessed: everything
 * outside them is margin, which a short laptop may take before the design is
 * scaled down (see `layout/designFit`).
 *
 * The onboarding frames are ruled paper - graph lines, ruler strips and small
 * doodles run to the very edge of the artboard. Those are backdrop, so the band
 * names the part that carries the lesson (heading, sign-in card, illustration,
 * molecule strip) and the paper is allowed to run off the edges of a short
 * window, exactly as the ruled lines do in the gameplay.
 */
const CANVAS: Record<Screen, { width: number; height: number; content: { top: number; bottom: number } }> = {
  // H1: the content row (heading, sign-in, ethene deck) down to the molecule strip.
  signIn: { width: 1444, height: 1024, content: { top: 262, bottom: 1020 } },
  prefixIntro: { width: 1440, height: 1024, content: { top: 140, bottom: 750 } },
  alkane: { width: 1440, height: 1024, content: { top: 116, bottom: 876 } },
  alkene: { width: 1440, height: 1024, content: { top: 116, bottom: 876 } },
  alkyne: { width: 1440, height: 1024, content: { top: 116, bottom: 876 } },
  // Both gameplay routes lay themselves out; these entries are never used.
  gameplay: { width: 1440, height: 1024, content: { top: 116, bottom: 921 } },
  play: { width: 1440, height: 1024, content: { top: 116, bottom: 921 } },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>(screenFromUrl);
  const [molecule, setMolecule] = useState<string>(moleculeFromUrl);
  const { status } = useAuth();

  /**
   * The lesson line for this screen.
   *
   * Narration only: it cannot move the flow on. The instruction card is still
   * the control that advances, and it stays clickable while a line is being
   * spoken - pressing it simply stops the line and moves on, which is the same
   * bargain the gameplay already makes with its teaching beats.
   *
   * `?mute=1` silences the effects; it silences the narration too.
   */
  useLessonVoice(screen, new URLSearchParams(window.location.search).get('mute') !== '1');

  /**
   * The walkthrough's own two lines, on its first frame and its last.
   *
   * Read at the top level because it is a hook; the walkthrough is only one of
   * the screens below. It narrates, and that is all: the frames advance on
   * their own clicks and timers exactly as they did before.
   */
  const onWalkthroughStep = useWalkthroughVoice(GAMEPLAY_STEPS.length);

  const advance = useCallback(() => {
    setScreen((current) => nextScreen(current) ?? current);
  }, []);

  /**
   * The history entry follows the screen.
   *
   * Recording it here rather than inside the state updater matters: React
   * calls an updater twice in development, which pushed two entries for every
   * move and made one Back press look like it had done nothing. Comparing
   * against `history.state` also makes this a no-op after a Back press, which
   * is what stops it fighting the popstate handler.
   */
  useEffect(() => {
    const state = window.history.state as { screen?: Screen } | null;
    if (state?.screen === screen) return;
    const entry = { screen };
    // The first screen replaces the entry the browser already has, so Back
    // from the second screen lands on the first rather than leaving the app.
    if (state?.screen) window.history.pushState(entry, '', urlForScreen(screen));
    else window.history.replaceState(entry, '', urlForScreen(screen));
  }, [screen]);

  /**
   * The molecule rides along in the URL so a refresh comes back to the one
   * being played. It replaces the current entry rather than pushing a new
   * one: moving on to the next molecule is progress within the game screen,
   * not a new page, and Back should still step between screens.
   */
  useEffect(() => {
    if (screen !== 'play') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('molecule') === molecule) return;
    params.set('molecule', molecule);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params.toString()}`);
  }, [screen, molecule]);

  // Back and forward: the URL is the truth, so read it rather than keeping a
  // stack of our own alongside the browser's.
  useEffect(() => {
    const onPop = () => {
      setScreen(screenFromUrl());
      setMolecule(moleculeFromUrl());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /**
   * Signing in moves the flow on, exactly as the placeholder used to.
   *
   * Gated on being on the sign-in screen so that an identity arriving later -
   * or a re-render - cannot push a learner out of a lesson. A dismissed or
   * failed sign-in leaves the status alone, so nothing happens and the student
   * can simply try again.
   */
  useEffect(() => {
    if (status === 'signed_in' && screen === 'signIn') advance();
  }, [status, screen, advance]);

  /**
   * Warm the game's chunk once the student is past sign-in.
   *
   * They have six lesson screens to read before it is needed, which is far
   * longer than the chunk takes to arrive, so the split costs them no waiting.
   * Nothing is rendered or constructed here - only fetched.
   *
   * The walkthrough's chunk is deliberately not warmed: the lesson no longer
   * leads there, and fetching it for a reference route would be the student
   * paying for frames they will never be shown.
   */
  useEffect(() => {
    if (screen === 'signIn') return;
    void import('./screens/gameplay/live/LiveGameplay');
  }, [screen]);

  /** `?autoplay=off` hands the lesson back to the student, for Figma checks. */
  const autoPlay = new URLSearchParams(window.location.search).get('autoplay') !== 'off';

  /**
   * The lesson plays itself.
   *
   * The nickname rail and the three bond screens are one continuous stretch of
   * teaching: the student watches it rather than clicking through it, so the
   * flow holds each frame for as long as its narration needs and then moves
   * on. None of these screens is given an `onContinue` below, so there is no
   * control to press and nothing to skip - the timer is the only way forward.
   *
   * `?autoplay=off` freezes the stretch for looking at a frame against Figma,
   * which is the one case where it must not advance by itself.
   */
  useEffect(() => {
    if (!autoPlay) return;
    const hold = holdFor(screen);
    if (hold === null) return;
    const timer = window.setTimeout(() => {
      // The game is a split chunk, so arriving at it suspends for a moment.
      // Marked as a transition, React keeps the frame already on screen until
      // the game can draw instead of swapping it for Suspense's empty
      // fallback - which is what put a blank frame between the two.
      startTransition(advance);
    }, hold);
    return () => window.clearTimeout(timer);
  }, [screen, advance, autoPlay]);

  /**
   * Fetch the next screen's images while this one is being read.
   *
   * The screen order is the one `SCREENS` already describes, so this follows
   * the student rather than inventing a second idea of where they are going.
   * The nearer screen is queued first; the gameplay batch is large and can
   * afford to arrive behind it.
   */
  useEffect(() => {
    const next = nextScreen(screen);
    if (next) preloadAssets(assetsForScreen(next));
    // Only the game's own images: the walkthrough is off the path now, and
    // fetching its 106 drawings for a route nobody is sent to is the kind of
    // waiting this preloader exists to remove.
    if (WARM_GAMEPLAY_ASSETS_FROM.has(screen)) preloadAssets(assetsForScreen('play'));
  }, [screen]);

  /**
   * The rail tells the voice layer where it is.
   *
   * Only the two moments that have a line to them are forwarded; the screen
   * reports more than that, and the rest stay as they were - reported and
   * unused. `useCallback` keeps the identity stable, because the screen
   * announces from an effect that depends on this handler.
   */
  const speakPrefix = usePrefixVoice();
  const handlePrefixEvent = useCallback(
    (event: PrefixEvent) => {
      if (event.type === 'prefixShown') speakPrefix(event.index, false);
      else if (event.type === 'instructionCompleted') speakPrefix(-1, true);
    },
    [speakPrefix],
  );

  // The gameplay lays itself out against the window (responsive); every
  // other screen is still drawn on its Figma canvas by the Stage.
  //
  // The walkthrough is the Figma flow played as a demonstration; its last
  // frame now leads into the game rather than stopping there.
  if (screen === 'gameplay') return <GameplayFlow onContinue={advance} onStepChange={onWalkthroughStep} />;
  // The game itself: ?molecule=methane|ethane|propane chooses the challenge.
  if (screen === 'play') {
    return (
      <LiveGameplay
        molecule={molecule}
        // Finishing one molecule moves the round on to the next; the prefix
        // rail already lights the chip for whichever is being built.
        nextMolecule={nextAlkane(molecule)}
        onAdvance={setMolecule}
        // No way back to the walkthrough: it is no longer where the student
        // came from. `GameControls` already draws the summary without it,
        // widening "Play again" to fill the row.
      />
    );
  }

  return (
    <Stage width={CANVAS[screen].width} height={CANVAS[screen].height} content={CANVAS[screen].content}>
      {/* Keyed on the screen so each frame fades in as the last gives way. */}
      <div key={screen} className="lessonFade" style={{ position: 'absolute', inset: 0 }}>
        {screen === 'signIn' && <OnboardingScreen onContinueWithoutGoogle={advance} />}
        {screen === 'prefixIntro' && (
          <PrefixIntroScreen
            onEvent={handlePrefixEvent}
            autoPlay={autoPlay}
            startIndex={Number(new URLSearchParams(window.location.search).get('prefix') ?? 0)}
            // No `onContinue`: `InstructionCard` draws a plain div rather than a
            // button when it has nowhere to go, so there is no control here at
            // all - not a hidden one.
            onContinue={playsItself('prefixIntro') && autoPlay ? undefined : advance}
          />
        )}
        {screen === 'alkane' && <AlkaneScreen onContinue={playsItself('alkane') && autoPlay ? undefined : advance} />}
        {screen === 'alkene' && <AlkeneScreen onContinue={playsItself('alkene') && autoPlay ? undefined : advance} />}
        {screen === 'alkyne' && <AlkyneScreen onContinue={playsItself('alkyne') && autoPlay ? undefined : advance} />}
      </div>
    </Stage>
  );
}
