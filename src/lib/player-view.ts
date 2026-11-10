// What the mini-player draws (#60), derived from the player's state (src/lib/player.ts). Pure, so
// src/lib/player-ui.ts only has to put the results on the page.
import { formatDuration } from './format';
import type { PlayerState, Track } from './player';
import { resumeAt, timeLeft as minutesLeft, type LessonProgress } from './progress';

/**
 * idle: nothing loaded (the player is hidden). loading: asked to play, but not enough audio yet.
 * offline: no connection, so no audio (ADR 0006); it says why rather than showing an error.
 */
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'offline';

export function playerStatus(state: PlayerState): PlayerStatus {
  if (!state.track) return 'idle';
  if (state.offline) return 'offline';
  if (state.error) return 'error';
  if (state.paused) return 'paused';
  return state.ready ? 'playing' : 'loading';
}

/** Under the title on the phone's bar: "7:37 left". */
export function timeLeft({ currentTime, duration }: PlayerState): string {
  return `${formatDuration(Math.floor(Math.max(duration - currentTime, 0)))} left`;
}

/** How far through the lesson, from 0 to 1 (0 while the duration is unknown): the bar's progress line. */
export function progress({ currentTime, duration }: PlayerState): number {
  return duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;
}

/** What a lesson page's Play pill (src/components/PlayButton.astro) shows for its own lesson. */
export interface PlayControl {
  /** playing and loading show Pause; started (a saved or paused position) shows Resume. */
  status: 'fresh' | 'started' | 'finished' | 'loading' | 'playing';
  /** The pill's label, which is also its accessible name: Play, Resume, Pause or Play again. */
  label: 'Play' | 'Resume' | 'Pause' | 'Play again';
  /** Beside the pill once the lesson is started: "7 min left", or "Finished". Empty before. */
  left: string;
}

const LABEL: Record<PlayControl['status'], PlayControl['label']> = {
  fresh: 'Play',
  started: 'Resume',
  finished: 'Play again',
  loading: 'Pause',
  playing: 'Pause',
};

/**
 * The Play pill for `track`, from the player (when `track` is the one loaded) or else this device's
 * saved progress. It follows the mini-player: Pause while it plays, Resume where it was left, and
 * Play again once finished, since a finished lesson starts over (`resumeAt`).
 */
export function playControl(state: PlayerState, track: Track, saved: LessonProgress | undefined): PlayControl {
  const control = (status: PlayControl['status'], left = ''): PlayControl => ({ status, label: LABEL[status], left });
  if (state.track?.id === track.id) {
    const left = minutesLeft(state.currentTime, state.duration).label;
    if (!state.paused && !state.error) return control(state.ready ? 'playing' : 'loading', left);
    if (state.currentTime > 0) return control('started', left);
  }
  const at = resumeAt(saved, track.durationSeconds);
  if (at > 0) return control('started', minutesLeft(at, track.durationSeconds).label);
  return saved?.finished ? control('finished', 'Finished') : control('fresh');
}
