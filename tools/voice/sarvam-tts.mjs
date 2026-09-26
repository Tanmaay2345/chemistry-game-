/**
 * Development-only narration generator. Never imported by the game.
 *
 * Run with the key supplied by Node itself, so it is never on a command line
 * and never in shell history:
 *
 *   node --env-file=.env.local tools/voice/sarvam-tts.mjs V02=test/test-lesson.mp3
 *
 * The text is read out of docs/voice/sarvam-voice-script.md, which stays the
 * single source for the approved wording - this script holds no copy of it and
 * so cannot drift from it.
 *
 * The API key is read from process.env.SARVAM_API_KEY and is never printed,
 * logged, written to disk or included in any output.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const SCRIPT_DOC = join(ROOT, 'docs/voice/sarvam-voice-script.md');
const OUT_ROOT = join(ROOT, 'public/audio/voice');
const ENDPOINT = 'https://api.sarvam.ai/text-to-speech';

/** The approved Sarvam configuration. */
const CONFIG = {
  model: 'bulbul:v3',
  language_code: 'en-IN',
  speaker: 'ishita',
  pace: 0.9,
  output_audio_codec: 'mp3',
  speech_sample_rate: 24000,
};

/** Every `| ID | ... | "script" | ... |` row in the approved script document. */
async function approvedClips() {
  const doc = await readFile(SCRIPT_DOC, 'utf8');
  const clips = new Map();
  for (const line of doc.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    // | ID | Event | Molecule | Trigger | Script | Repeat |
    const [, id, event, molecule, , script] = cells;
    if (!/^[VMEPSTG]\d\d$/.test(id ?? '')) continue;
    const text = script?.replace(/^"|"$/g, '').trim();
    if (!text) continue;
    clips.set(id, { id, event, molecule, text });
  }
  return clips;
}

function requireKey() {
  const key = process.env.SARVAM_API_KEY;
  if (!key) {
    console.error('SARVAM_API_KEY is not set. Run with: node --env-file=.env.local ...');
    process.exit(1);
  }
  return key;
}

async function synthesise(text, key) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
    body: JSON.stringify({ ...CONFIG, text }),
  });

  if (!response.ok) {
    // The body can echo the request, so only the status and a short reason are
    // surfaced - never the headers.
    const detail = await response.text().catch(() => '');
    throw new Error(`Sarvam ${response.status} ${response.statusText}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const base64 = payload?.audios?.[0];
  if (!base64) throw new Error('Sarvam returned no audio in `audios[0]`.');
  return { bytes: Buffer.from(base64, 'base64'), requestId: payload.request_id ?? null };
}

/** `--pace 1.0` overrides the default for a comparison run. */
const args = process.argv.slice(2);
const paceAt = args.indexOf('--pace');
if (paceAt !== -1) {
  const value = Number(args[paceAt + 1]);
  if (!Number.isFinite(value) || value < 0.5 || value > 2) throw new Error('--pace must be between 0.5 and 2.0 for bulbul:v3');
  CONFIG.pace = value;
  args.splice(paceAt, 2);
}

const jobs = args.map((arg) => {
  const [id, out] = arg.split('=');
  if (!id || !out) throw new Error(`Expected ID=relative/path.mp3, got "${arg}"`);
  return { id, out };
});

if (jobs.length === 0) {
  console.error('Usage: node --env-file=.env.local tools/voice/sarvam-tts.mjs V02=test/test-lesson.mp3 [...]');
  process.exit(1);
}

const key = requireKey();
const clips = await approvedClips();
console.log(`Approved clips found in the script document: ${clips.size}`);
console.log(`Config: ${CONFIG.model} / ${CONFIG.speaker} / ${CONFIG.language_code} / pace ${CONFIG.pace} / ${CONFIG.output_audio_codec} @ ${CONFIG.speech_sample_rate} Hz\n`);

let failed = 0;
for (const { id, out } of jobs) {
  const clip = clips.get(id);
  if (!clip) {
    console.error(`${id}: NOT FOUND in the approved script. Nothing generated.`);
    failed += 1;
    continue;
  }

  const path = join(OUT_ROOT, out);
  try {
    const { bytes, requestId } = await synthesise(clip.text, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    // An MP3 starts with an ID3 tag or a frame sync (0xFF 0xEx/0xFx).
    const magic = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33 ? 'ID3' : bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 ? 'MPEG frame sync' : 'UNRECOGNISED';
    console.log(`${id} -> ${out}`);
    console.log(`  event        ${clip.event}${clip.molecule && clip.molecule !== '—' ? ` (${clip.molecule})` : ''}`);
    console.log(`  text         ${clip.text}`);
    console.log(`  chars        ${clip.text.length}`);
    console.log(`  text sha256  ${createHash('sha256').update(clip.text).digest('hex').slice(0, 16)}`);
    console.log(`  bytes        ${bytes.length}`);
    console.log(`  header       ${magic}`);
    console.log(`  request_id   ${requestId ?? 'not returned'}\n`);
  } catch (error) {
    console.error(`${id}: FAILED - ${error.message}\n`);
    failed += 1;
  }
}

process.exit(failed > 0 ? 1 : 0);
