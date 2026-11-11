// The feed's copy of each episode transcript (docs/transcripts.md), built from
// public/transcripts/<id>.vtt with feedVtt(): no NOTE block, no <lang> spans. The feed's
// <podcast:transcript> links these; the full files stay where they are, for the player and as the
// source. public/_headers serves everything under /transcripts/ as text/vtt.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { feedVtt } from '../../../lib/podcast';
import { getAllTranscripts } from '../../../lib/transcripts';

export const getStaticPaths = (async () =>
  [...(await getAllTranscripts()).keys()].map((id) => ({ params: { id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const vtt = await readFile(join(process.cwd(), 'public', 'transcripts', `${params.id}.vtt`), 'utf8');
  return new Response(feedVtt(vtt), { headers: { 'Content-Type': 'text/vtt; charset=utf-8' } });
};
