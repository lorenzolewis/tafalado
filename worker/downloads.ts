// Rough MP3 download counts (#8), written to Workers Analytics Engine.
// See docs/research/privacy-friendly-analytics.md.

/** The one call this Worker makes on an Analytics Engine dataset binding. */
export type DownloadsDataset = { writeDataPoint(point: { blobs?: string[]; indexes?: string[] }): void };

/** Only real listener traffic is counted, not the per-version preview links. */
export const COUNTED_HOST = 'tafalado.lorenzo.soy';

/** Ranges ending before this byte are probes (some apps ask for bytes=0-1 first), not downloads. */
const PROBE_BYTES = 1024;

/**
 * Whether a successful MP3 answer counts as one download: a GET for the whole file, or a range
 * from its first byte. Apps fetch in chunks and seek, but each download starts at byte 0 once.
 */
export function countsAsDownload(request: Request, status: number): boolean {
  if (request.method !== 'GET' || (status !== 200 && status !== 206)) return false;
  const range = request.headers.get('Range');
  if (range === null) return true;
  const match = /^bytes=0-(\d*)$/.exec(range.trim());
  if (!match) return false;
  return match[1] === '' || Number(match[1]) >= PROBE_BYTES;
}

/** Records one download of the requested episode (its path, e.g. /mp3/tafalado_01.mp3). */
export function recordDownload(dataset: DownloadsDataset | undefined, request: Request, status: number): void {
  const url = new URL(request.url);
  if (!dataset || url.hostname !== COUNTED_HOST || !countsAsDownload(request, status)) return;
  dataset.writeDataPoint({ blobs: [url.pathname], indexes: [url.pathname] });
}
