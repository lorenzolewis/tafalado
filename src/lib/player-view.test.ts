import { describe, expect, it } from 'vitest';
import type { PlayerState, Track } from './player';
import { playControl, playerStatus, progress, timeLeft } from './player-view';

const track: Track = {
  id: '/pronunciation/01',
  title: 'Pronunciation 1: Pronunciation of /i/',
  series: 'Pronunciation',
  artwork: '/artwork/pronunciation-01.png',
  src: '/mp3/pronunciation-01.mp3',
  durationSeconds: 650,
  episode: 1,
};
const state = (patch: Partial<PlayerState> = {}): PlayerState => ({
  track,
  paused: true,
  currentTime: 0,
  duration: 650,
  rate: 1,
  muted: false,
  error: false,
  offline: false,
  ready: true,
  ...patch,
});

describe('playerStatus', () => {
  it('is idle with no lesson loaded', () => {
    expect(playerStatus(state({ track: null }))).toBe('idle');
  });
  it('is paused or playing once there is enough audio', () => {
    expect(playerStatus(state({ paused: true }))).toBe('paused');
    expect(playerStatus(state({ paused: false }))).toBe('playing');
  });
  it('is loading when asked to play before there is enough audio', () => {
    expect(playerStatus(state({ paused: false, ready: false }))).toBe('loading');
  });
  it('is paused, not loading, while paused before the audio arrives', () => {
    expect(playerStatus(state({ paused: true, ready: false }))).toBe('paused');
  });
  it('is error when the audio failed, even while asked to play', () => {
    expect(playerStatus(state({ error: true, paused: false, ready: false }))).toBe('error');
  });
  it('is offline, not error, when the audio failed with no connection', () => {
    expect(playerStatus(state({ offline: true, error: true }))).toBe('offline');
  });
  it('is offline, not loading or playing, while asked to play with no connection', () => {
    expect(playerStatus(state({ offline: true, paused: false, ready: false }))).toBe('offline');
    expect(playerStatus(state({ offline: true, paused: false }))).toBe('offline');
  });
  it('is idle, not offline, with no lesson loaded', () => {
    expect(playerStatus(state({ offline: true, track: null }))).toBe('idle');
  });
});

describe('timeLeft', () => {
  it('counts down what is left of the lesson', () => {
    expect(timeLeft(state({ currentTime: 193, duration: 650 }))).toBe('7:37 left');
  });
  it('drops the fraction of a second', () => {
    expect(timeLeft(state({ currentTime: 192.4, duration: 650 }))).toBe('7:37 left');
  });
  it('never goes below zero', () => {
    expect(timeLeft(state({ currentTime: 651, duration: 650 }))).toBe('0:00 left');
  });
});

describe('progress', () => {
  it('is how far through the lesson, from 0 to 1', () => {
    expect(progress(state({ currentTime: 162.5, duration: 650 }))).toBe(0.25);
  });
  it('is 0 while the duration is unknown', () => {
    expect(progress(state({ currentTime: 5, duration: 0 }))).toBe(0);
  });
  it('stays within 0 and 1', () => {
    expect(progress(state({ currentTime: 700, duration: 650 }))).toBe(1);
  });
});

describe('playControl', () => {
  const other: Track = { ...track, id: '/grammar/01' };
  const saved = (position: number, finished = false) => ({ position, finished, playedAt: 1 });

  it('offers Play for a lesson never played on this device', () => {
    expect(playControl(state({ track: null }), track, undefined)).toEqual({ status: 'fresh', label: 'Play', left: '' });
    expect(playControl(state({ track: other, paused: false }), track, undefined).label).toBe('Play');
  });
  it('offers Resume, with the time left, where the lesson was left', () => {
    expect(playControl(state({ track: null }), track, saved(290))).toEqual({
      status: 'started',
      label: 'Resume',
      left: '6 min left',
    });
  });
  it('offers Pause while this lesson plays or loads', () => {
    expect(playControl(state({ paused: false, currentTime: 50 }), track, undefined)).toEqual({
      status: 'playing',
      label: 'Pause',
      left: '10 min left',
    });
    expect(playControl(state({ paused: false, ready: false }), track, undefined).status).toBe('loading');
  });
  it('offers Resume once this lesson is paused part way', () => {
    expect(playControl(state({ currentTime: 600 }), track, undefined)).toMatchObject({ label: 'Resume', left: '1 min left' });
  });
  it('offers Play again for a finished lesson, which starts over', () => {
    expect(playControl(state({ track: null }), track, saved(0, true))).toEqual({
      status: 'finished',
      label: 'Play again',
      left: 'Finished',
    });
    expect(playControl(state({ track: null }), track, saved(640, true)).label).toBe('Play again');
  });
  it('offers Resume for a finished lesson that is being listened to again', () => {
    expect(playControl(state({ track: null }), track, saved(120, true)).label).toBe('Resume');
  });
  it('falls back to the saved progress when this lesson failed to load', () => {
    expect(playControl(state({ paused: false, error: true }), track, undefined).label).toBe('Play');
  });
});
