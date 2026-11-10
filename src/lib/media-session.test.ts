import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindMediaSession, type MediaSessionPlayer } from './media-session';
import type { PlayerState, Track } from './player';

const track = (episode: number, id: string): Track => ({
  id,
  title: `Lesson ${episode}`,
  series: id.startsWith('/grammar') ? 'Grammar' : 'Pronunciation',
  artwork: `/artwork${id.replace(/\/(\d+)$/, '-$1')}.png`,
  src: `/audio${id}.mp3`,
  durationSeconds: 600,
  episode,
});
const tracks = [track(1, '/pronunciation/01'), track(2, '/pronunciation/02'), track(3, '/grammar/01')];

/** Stands in for the browser's `navigator.mediaSession`. */
class FakeSession {
  metadata: unknown = null;
  playbackState = 'none';
  handlers = new Map<string, ((details: Partial<MediaSessionActionDetails>) => void) | null>();
  positions: MediaPositionState[] = [];
  setActionHandler(action: string, handler: ((details: MediaSessionActionDetails) => void) | null) {
    this.handlers.set(action, handler as never);
  }
  setPositionState(state: MediaPositionState) {
    this.positions.push(state);
  }
  act(action: string, details: Partial<MediaSessionActionDetails> = {}) {
    const handler = this.handlers.get(action);
    if (!handler) throw new Error(`No ${action} handler`);
    handler({ action: action as MediaSessionAction, ...details });
  }
}

/** Stands in for the player: records calls, and lets the test drive its state. */
class FakePlayer extends EventTarget implements MediaSessionPlayer {
  state: PlayerState = { track: null, paused: true, currentTime: 0, duration: 0, rate: 1, muted: false, error: false, offline: false, ready: true };
  calls: unknown[][] = [];
  play = (t?: Track) => void this.calls.push(['play', t?.id]);
  pause = () => void this.calls.push(['pause']);
  seek = (s: number) => void this.calls.push(['seek', s]);
  skip = (d: number) => void this.calls.push(['skip', d]);
  subscribe(fn: (state: PlayerState) => void) {
    this.addEventListener('change', () => fn(this.state));
    fn(this.state);
    return () => {};
  }
  load(t: Track) {
    this.state = { ...this.state, track: t, duration: t.durationSeconds };
    this.dispatchEvent(new Event('trackchange'));
    this.dispatchEvent(new Event('change'));
  }
  update(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    this.dispatchEvent(new Event('change'));
  }
}

let session: FakeSession;
let player: FakePlayer;

beforeEach(() => {
  vi.stubGlobal(
    'MediaMetadata',
    class {
      constructor(init: MediaMetadataInit) {
        Object.assign(this, init);
      }
    },
  );
  session = new FakeSession();
  player = new FakePlayer();
  bindMediaSession(session as unknown as MediaSession, player, tracks);
});

describe('Media Session', () => {
  it('shows the lesson title, series, album and episode artwork', () => {
    player.load(tracks[2]);
    expect(session.metadata).toEqual({
      title: 'Lesson 3',
      artist: 'Grammar',
      album: 'Tá Falado',
      artwork: [{ src: '/artwork/grammar-01.png', sizes: '1400x1400', type: 'image/png' }],
    });
  });

  it('plays, pauses and seeks the player', () => {
    player.load(tracks[0]);
    session.act('play');
    session.act('pause');
    session.act('seekbackward');
    session.act('seekforward');
    session.act('seekbackward', { seekOffset: 5 });
    session.act('seekto', { seekTime: 120 });
    expect(player.calls).toEqual([['play', undefined], ['pause'], ['skip', -10], ['skip', 30], ['skip', -5], ['seek', 120]]);
  });

  it('moves to the adjacent lessons in episode order', () => {
    player.load(tracks[1]);
    session.act('previoustrack');
    session.act('nexttrack');
    expect(player.calls).toEqual([
      ['play', '/pronunciation/01'],
      ['play', '/grammar/01'],
    ]);
  });

  it('offers no previous on the first lesson and no next on the last', () => {
    player.load(tracks[0]);
    expect(session.handlers.get('previoustrack')).toBeNull();
    expect(session.handlers.get('nexttrack')).toBeTypeOf('function');
    player.load(tracks[2]);
    expect(session.handlers.get('previoustrack')).toBeTypeOf('function');
    expect(session.handlers.get('nexttrack')).toBeNull();
  });

  it('keeps the position state and playback state in step with the player', () => {
    player.load(tracks[0]);
    player.update({ paused: false, currentTime: 42, rate: 1.5 });
    expect(session.positions.at(-1)).toEqual({ duration: 600, playbackRate: 1.5, position: 42 });
    expect(session.playbackState).toBe('playing');
    player.update({ paused: true });
    expect(session.playbackState).toBe('paused');
  });

  it('never reports a position past the end, and skips position state with no duration yet', () => {
    player.load({ ...tracks[0], durationSeconds: 0 });
    expect(session.positions).toEqual([]);
    player.update({ duration: 600, currentTime: 600.4 });
    expect(session.positions.at(-1)).toEqual({ duration: 600, playbackRate: 1, position: 600 });
  });
});
