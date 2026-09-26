/**
 * The narration library: 41 clips, pre-generated and shipped as files.
 *
 * Data only - no chemistry, no wording. The spoken text lives in the audio and
 * in `docs/voice/sarvam-voice-script.md`, which is what generated these files;
 * nothing here re-derives copy, so the script cannot drift from the audio.
 *
 * Durations are measured from the generated files (`afinfo`), not estimated.
 * They are here so a caller can reason about length without loading audio -
 * useful in tests, and for the record that several clips outrun the teaching
 * beat they play on. That is expected and documented: the beat is never
 * lengthened to fit the clip.
 *
 * Policies come from `docs/voice/sarvam-voice-design.md` section 2.
 */

/** What to do when a clip is asked for while the channel is busy. */
export type VoicePolicy =
  /** Stop whatever is speaking and play now: time-critical or end of round. */
  | 'INTERRUPT'
  /** Wait for the channel, then play - unless the moment has passed. */
  | 'QUEUE'
  /** Skip entirely if anything is speaking: repeatable feedback. */
  | 'DROP';

export type VoiceCategory = 'lesson' | 'methane' | 'ethane' | 'propane' | 'feedback' | 'timer' | 'summary';

export type VoiceId =
  | 'V01'
  | 'V02'
  | 'V03'
  | 'V04'
  | 'V05'
  | 'V06'
  | 'V07'
  | 'V08'
  | 'V09'
  | 'V10'
  | 'V11'
  | 'V12'
  | 'M01'
  | 'M02'
  | 'M03'
  | 'M04'
  | 'M05'
  | 'E01'
  | 'E02'
  | 'E03'
  | 'E04'
  | 'E05'
  | 'P01'
  | 'P02'
  | 'P03'
  | 'P04'
  | 'P05'
  | 'S01'
  | 'S02'
  | 'S03'
  | 'S04'
  | 'S05'
  | 'S06'
  | 'S07'
  | 'S08'
  | 'S09'
  | 'T01'
  | 'T02'
  | 'G01'
  | 'G02'
  | 'G03';

export type VoiceClip = {
  id: VoiceId;
  /** Served from `public/`, so this is the path the browser fetches. */
  src: string;
  policy: VoicePolicy;
  category: VoiceCategory;
  /** Measured length of the generated file. */
  durationMs: number;
};

/** Where the generated clips live. */
export const VOICE_BASE = '/audio/voice';

export const VOICE_CLIPS: Record<VoiceId, VoiceClip> = {
  V01: { id: 'V01', src: `${VOICE_BASE}/V01.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 6860 },
  V02: { id: 'V02', src: `${VOICE_BASE}/V02.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 8090 },
  V03: { id: 'V03', src: `${VOICE_BASE}/V03.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 12550 },
  V04: { id: 'V04', src: `${VOICE_BASE}/V04.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 9700 },
  V05: { id: 'V05', src: `${VOICE_BASE}/V05.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 8860 },
  V06: { id: 'V06', src: `${VOICE_BASE}/V06.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 6190 },
  V07: { id: 'V07', src: `${VOICE_BASE}/V07.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 6100 },
  V08: { id: 'V08', src: `${VOICE_BASE}/V08.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 4780 },
  V09: { id: 'V09', src: `${VOICE_BASE}/V09.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 2300 },
  V10: { id: 'V10', src: `${VOICE_BASE}/V10.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 7510 },
  V11: { id: 'V11', src: `${VOICE_BASE}/V11.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 4870 },
  V12: { id: 'V12', src: `${VOICE_BASE}/V12.mp3`, policy: 'QUEUE', category: 'lesson', durationMs: 3070 },
  M01: { id: 'M01', src: `${VOICE_BASE}/M01.mp3`, policy: 'QUEUE', category: 'methane', durationMs: 5060 },
  M02: { id: 'M02', src: `${VOICE_BASE}/M02.mp3`, policy: 'QUEUE', category: 'methane', durationMs: 4300 },
  M03: { id: 'M03', src: `${VOICE_BASE}/M03.mp3`, policy: 'QUEUE', category: 'methane', durationMs: 3550 },
  M04: { id: 'M04', src: `${VOICE_BASE}/M04.mp3`, policy: 'QUEUE', category: 'methane', durationMs: 5090 },
  M05: { id: 'M05', src: `${VOICE_BASE}/M05.mp3`, policy: 'INTERRUPT', category: 'methane', durationMs: 4940 },
  E01: { id: 'E01', src: `${VOICE_BASE}/E01.mp3`, policy: 'QUEUE', category: 'ethane', durationMs: 5450 },
  E02: { id: 'E02', src: `${VOICE_BASE}/E02.mp3`, policy: 'QUEUE', category: 'ethane', durationMs: 2980 },
  E03: { id: 'E03', src: `${VOICE_BASE}/E03.mp3`, policy: 'QUEUE', category: 'ethane', durationMs: 5810 },
  E04: { id: 'E04', src: `${VOICE_BASE}/E04.mp3`, policy: 'QUEUE', category: 'ethane', durationMs: 7900 },
  E05: { id: 'E05', src: `${VOICE_BASE}/E05.mp3`, policy: 'INTERRUPT', category: 'ethane', durationMs: 3840 },
  P01: { id: 'P01', src: `${VOICE_BASE}/P01.mp3`, policy: 'QUEUE', category: 'propane', durationMs: 5350 },
  P02: { id: 'P02', src: `${VOICE_BASE}/P02.mp3`, policy: 'QUEUE', category: 'propane', durationMs: 2520 },
  P03: { id: 'P03', src: `${VOICE_BASE}/P03.mp3`, policy: 'QUEUE', category: 'propane', durationMs: 2710 },
  P04: { id: 'P04', src: `${VOICE_BASE}/P04.mp3`, policy: 'QUEUE', category: 'propane', durationMs: 7440 },
  P05: { id: 'P05', src: `${VOICE_BASE}/P05.mp3`, policy: 'INTERRUPT', category: 'propane', durationMs: 4580 },
  S01: { id: 'S01', src: `${VOICE_BASE}/S01.mp3`, policy: 'QUEUE', category: 'feedback', durationMs: 7700 },
  S02: { id: 'S02', src: `${VOICE_BASE}/S02.mp3`, policy: 'DROP', category: 'feedback', durationMs: 7340 },
  S03: { id: 'S03', src: `${VOICE_BASE}/S03.mp3`, policy: 'DROP', category: 'feedback', durationMs: 5640 },
  S04: { id: 'S04', src: `${VOICE_BASE}/S04.mp3`, policy: 'QUEUE', category: 'feedback', durationMs: 5540 },
  S05: { id: 'S05', src: `${VOICE_BASE}/S05.mp3`, policy: 'DROP', category: 'feedback', durationMs: 11400 },
  S06: { id: 'S06', src: `${VOICE_BASE}/S06.mp3`, policy: 'DROP', category: 'feedback', durationMs: 3460 },
  S07: { id: 'S07', src: `${VOICE_BASE}/S07.mp3`, policy: 'DROP', category: 'feedback', durationMs: 6770 },
  S08: { id: 'S08', src: `${VOICE_BASE}/S08.mp3`, policy: 'DROP', category: 'feedback', durationMs: 4030 },
  S09: { id: 'S09', src: `${VOICE_BASE}/S09.mp3`, policy: 'DROP', category: 'feedback', durationMs: 2210 },
  T01: { id: 'T01', src: `${VOICE_BASE}/T01.mp3`, policy: 'INTERRUPT', category: 'timer', durationMs: 1750 },
  T02: { id: 'T02', src: `${VOICE_BASE}/T02.mp3`, policy: 'INTERRUPT', category: 'timer', durationMs: 2880 },
  G01: { id: 'G01', src: `${VOICE_BASE}/G01.mp3`, policy: 'QUEUE', category: 'summary', durationMs: 4010 },
  G02: { id: 'G02', src: `${VOICE_BASE}/G02.mp3`, policy: 'QUEUE', category: 'summary', durationMs: 4010 },
  G03: { id: 'G03', src: `${VOICE_BASE}/G03.mp3`, policy: 'QUEUE', category: 'summary', durationMs: 11420 },
};

export const VOICE_IDS = Object.keys(VOICE_CLIPS) as VoiceId[];

/** A clip by id, or null for anything that is not one of the 41. */
export function clipFor(id: string): VoiceClip | null {
  return (VOICE_CLIPS as Record<string, VoiceClip>)[id] ?? null;
}

export function isVoiceId(id: string): id is VoiceId {
  return id in VOICE_CLIPS;
}
