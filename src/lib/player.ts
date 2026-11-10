// The one player state module (#15). Browser-only: it owns the single <audio> element for the
// whole visit, so playback doesn't depend on any page's DOM. Bundled scripts run once per visit
// under <ClientRouter />, so this module (and `player`) lives until a full page load.
//
// Other features attach through events rather than by reaching into the UI:
//   player.subscribe((state) => …)            every state change (time, play/pause, rate, track…)
//   player.addEventListener('trackchange', …) a new lesson was loaded (Media Session, src/lib/media-session.ts)
//   player.addEventListener('ended', …)       the lesson finished (progress, autoplay-next, #19)

/** What the player needs to know about a lesson. Built on the server from the collection. */
export interface Track {
  /** The lesson's path, e.g. `/pronunciation/01`. Stable, so it can key saved progress. */
  id: string;
  /** Display title, e.g. `Pronunciation 1: Pronunciation of /i/`. */
  title: string;
  /** The series as shown in the interface, e.g. `Pronunciation`. */
  series: string;
  /** The episode cover's path (EPISODE_COVER_SIZE square PNG), e.g. `/artwork/pronunciation-01.png`. */
  artwork: string;
  /** The lesson's `audio.url`, used as is. */
  src: string;
  /** From the collection; used until the browser knows the real duration. */
  durationSeconds: number;
  /** Running order of the original feed (1–46). */
  episode: number;
  /** Where its transcript's JSON is (src/lib/transcripts.ts), when it has one (#99). */
  transcript?: string;
}

export interface PlayerState {
  track: Track | null;
  paused: boolean;
  /** Seconds. */
  currentTime: number;
  /** Seconds: the media's duration once known, otherwise the track's. 0 with no track. */
  duration: number;
  rate: number;
  muted: boolean;
  /** True when the audio failed to load. */
  error: boolean;
  /** The browser says there's no connection (`navigator.onLine`): audio needs one (#9, ADR 0006). */
  offline: boolean;
  /** Enough audio is buffered to play on (readyState ≥ HAVE_FUTURE_DATA); false while loading or stalled. */
  ready: boolean;
}

export const RATES = [0.75, 1, 1.25, 1.5] as const;
export const JUMP_BACK = 10;
export const JUMP_FORWARD = 30;

type Listener = (state: PlayerState) => void;

class Player extends EventTarget {
  #audio: HTMLAudioElement | undefined;
  #track: Track | null = null;

  /** Created on first use, so the constants above can be imported on the server. */
  get audio(): HTMLAudioElement {
    if (this.#audio) return this.#audio;
    const audio = (this.#audio = new Audio());
    audio.preload = 'metadata';
    const changed = () => this.dispatchEvent(new Event('change'));
    // The last six are for `ready`: the audio starts, stops or resumes loading.
    const types = ['play', 'pause', 'timeupdate', 'durationchange', 'ratechange', 'volumechange', 'emptied', 'error', 'seeked',
      'loadstart', 'seeking', 'waiting', 'stalled', 'canplay', 'playing'];
    for (const type of types) {
      audio.addEventListener(type, changed);
    }
    audio.addEventListener('ended', () => this.dispatchEvent(new Event('ended')));
    // For `offline`. The window lasts the visit too (<ClientRouter /> swaps the page, not the window).
    // Back online, audio that failed or stalled meanwhile loads again, paused: nothing starts by itself.
    addEventListener('offline', changed);
    addEventListener('online', () => {
      if (this.#track && !this.#playable) this.#reload();
      changed();
    });
    return audio;
  }

  get state(): PlayerState {
    const { audio } = this;
    const track = this.#track;
    return {
      track,
      paused: audio.paused,
      currentTime: audio.currentTime,
      duration: Number.isFinite(audio.duration) ? audio.duration : (track?.durationSeconds ?? 0),
      rate: audio.playbackRate,
      muted: audio.muted,
      error: audio.error !== null,
      offline: !navigator.onLine,
      ready: audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA,
    };
  }

  /** Calls `fn` now and on every change. Returns an unsubscribe function; `signal` also unsubscribes. */
  subscribe(fn: Listener, { signal }: { signal?: AbortSignal } = {}): () => void {
    const handler = () => fn(this.state);
    this.addEventListener('change', handler, { signal });
    handler();
    return () => this.removeEventListener('change', handler);
  }

  /** Loads a lesson (if it isn't already the current one) and starts it. */
  play(track?: Track): void {
    if (track && track.id !== this.#track?.id) {
      this.#track = track;
      const rate = this.audio.playbackRate;
      this.audio.src = track.src;
      // Loading new media resets playbackRate to defaultPlaybackRate, so carry the speed over.
      this.audio.defaultPlaybackRate = this.audio.playbackRate = rate;
      this.dispatchEvent(new Event('trackchange'));
      this.dispatchEvent(new Event('change'));
    }
    if (!this.#track) return;
    // Offline, only what's already buffered can play; otherwise the player just says it's offline.
    if (!navigator.onLine && !this.#playable) return;
    if (this.audio.error) this.#reload();
    // Rejects if the browser blocks playback; the paused state already says so.
    this.audio.play().catch(() => {});
  }

  /** Enough audio is here to play on, with or without a connection. */
  get #playable(): boolean {
    return !this.audio.error && this.audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
  }

  /** After a failed load the element won't try again by itself: loads the lesson again where it was. */
  #reload(): void {
    const { currentTime, playbackRate } = this.audio;
    this.audio.load();
    this.audio.defaultPlaybackRate = this.audio.playbackRate = playbackRate;
    this.audio.currentTime = currentTime;
  }

  pause(): void {
    this.audio.pause();
  }

  toggle(): void {
    if (this.audio.paused) this.play();
    else this.pause();
  }

  seek(seconds: number): void {
    if (!this.#track) return;
    const { duration } = this.state;
    this.audio.currentTime = Math.min(Math.max(seconds, 0), duration || Infinity);
  }

  /** Jumps by `delta` seconds (negative goes back). */
  skip(delta: number): void {
    this.seek(this.audio.currentTime + delta);
  }

  setRate(rate: number): void {
    this.audio.defaultPlaybackRate = this.audio.playbackRate = rate;
  }

  /** Moves one step through RATES (`-1` slower, `1` faster), stopping at the ends. */
  stepRate(direction: -1 | 1): void {
    const i = RATES.findIndex((r) => r === this.audio.playbackRate);
    const next = RATES[Math.min(Math.max((i === -1 ? 1 : i) + direction, 0), RATES.length - 1)];
    this.setRate(next);
  }

  toggleMute(): void {
    this.audio.muted = !this.audio.muted;
  }
}

export type { Player };
export const player = new Player();
