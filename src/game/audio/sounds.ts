/**
 * The sound library.
 *
 * One entry per gameplay sound, with its provenance recorded next to it: if a
 * licence ever has to be re-checked, everything needed is here rather than in
 * a document that can drift away from the code.
 *
 * Research and licence verification live in docs/sound-research/.
 */

export type SoundName = 'WEB_THROW' | 'PAPER_THROW' | 'ATOM_COLLISION';

export type SoundDef = {
  /** Path under public/. */
  src: string;
  /** Playback gain, 0 to 1. Set so no sound is at full scale by default. */
  gain: number;
  /**
   * How many copies may sound at once. A throw can be fired again before the
   * previous one has finished; beyond this the oldest is dropped so repeated
   * play cannot pile up into noise.
   */
  maxVoices: number;
  credit: {
    title: string;
    author: string;
    source: string;
    /** The asset page the licence was read from. */
    url: string;
    license: string;
    licenseUrl: string;
    attributionRequired: boolean;
    note?: string;
  };
};

export const SOUNDS: Record<SoundName, SoundDef> = {
  /** The paper shoots its web at an atom - engine event WEB_STARTED. */
  WEB_THROW: {
    src: '/audio/web-throw-whoosh-kinoton.mp3',
    gain: 0.45,
    maxVoices: 3,
    credit: {
      title: 'Whoosh #1',
      author: 'Kinoton',
      source: 'Freesound',
      url: 'https://freesound.org/people/Kinoton/sounds/427823/',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attributionRequired: false,
      note:
        'This file is the public preview MP3 (128 kbps). The original is 48 kHz 24-bit WAV ' +
        'and needs a Freesound login to download - swap it in when convenient.',
    },
  },

  /**
   * The paper is thrown - engine event PAPER_THROWN.
   *
   * One sound for both throws in the game: the paper flung at a carbon group,
   * and a hydrogen flung from the paper. It is the same physical gesture, so
   * it gets the same audio language whatever the target.
   */
  PAPER_THROW: {
    src: '/audio/paper-throw-thin-swoosh-universfield.mp3',
    gain: 0.4,
    maxVoices: 3,
    credit: {
      title: 'Thin Swoosh',
      author: 'Universfield',
      source: 'Pixabay',
      url: 'https://pixabay.com/sound-effects/film-special-effects-thin-swoosh-352756/',
      license: 'Pixabay Content License',
      licenseUrl: 'https://pixabay.com/service/license-summary/',
      attributionRequired: false,
      note:
        'Pixabay permits commercial use without attribution but forbids redistributing the ' +
        'file on a standalone basis - embedding it in the game is the intended use.',
    },
  },

  /**
   * Two carbon atoms make contact - engine event ATOM_COLLISION, at the moment
   * the thrown paper reaches the pair. Not the bond that follows it 260ms
   * later, and not the settle: this is the contact itself.
   */
  ATOM_COLLISION: {
    src: '/audio/atom-collision-bottle-clink-5-wjb88.mp3',
    gain: 0.5,
    maxVoices: 3,
    credit: {
      title: 'Bottle_Clink_5',
      author: 'wjb_88',
      source: 'Freesound',
      url: 'https://freesound.org/people/wjb_88/sounds/828852/',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attributionRequired: false,
      note:
        'Two glass bottles tapped together (SM57) - glass-on-glass contact, which is the ' +
        'physical model of the collision rather than one object being struck. This file is ' +
        'the public preview MP3; the original is 44.1 kHz 24-bit mono WAV and needs a ' +
        'Freesound login to download - swap it in when convenient.',
    },
  },
};
