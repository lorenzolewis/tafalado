import { describe, expect, it } from 'vitest';
import { COUNTED_HOST, countsAsDownload, recordDownload } from './downloads';

const PATH = '/mp3/tafalado_01.mp3';

function request(headers: Record<string, string> = {}, method = 'GET', host = COUNTED_HOST) {
  return new Request(`https://${host}${PATH}`, { method, headers });
}

function dataset() {
  const points: { blobs?: string[]; indexes?: string[] }[] = [];
  return { points, writeDataPoint: (point: (typeof points)[number]) => void points.push(point) };
}

describe('countsAsDownload', () => {
  it.each([
    ['no Range', {}, 200, true],
    ['an open range from byte 0', { Range: 'bytes=0-' }, 206, true],
    ['a closed range from byte 0', { Range: 'bytes=0-65535' }, 206, true],
    ['a later chunk', { Range: 'bytes=65536-' }, 206, false],
    ['a suffix range', { Range: 'bytes=-1000' }, 206, false],
    ['a probe', { Range: 'bytes=0-1' }, 206, false],
    ['a not-found answer', {}, 404, false],
    ['an unsatisfiable range', { Range: 'bytes=0-' }, 416, false],
  ])('%s → %s', (_, headers, status, expected) => {
    expect(countsAsDownload(request(headers), status)).toBe(expected);
  });

  it('ignores HEAD', () => {
    expect(countsAsDownload(request({}, 'HEAD'), 200)).toBe(false);
  });
});

describe('recordDownload', () => {
  it('writes the episode path once per download', () => {
    const downloads = dataset();
    recordDownload(downloads, request(), 200);
    recordDownload(downloads, request({ Range: 'bytes=65536-' }), 206);
    expect(downloads.points).toEqual([{ blobs: [PATH], indexes: [PATH] }]);
  });

  it('skips preview links', () => {
    const downloads = dataset();
    recordDownload(downloads, request({}, 'GET', 'abc123-tafalado.example.workers.dev'), 200);
    expect(downloads.points).toEqual([]);
  });

  it('does nothing without the binding', () => {
    expect(() => recordDownload(undefined, request(), 200)).not.toThrow();
  });
});
