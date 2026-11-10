// Each episode's transcript as JSON (#99), built from public/transcripts/<id>.vtt, for the persisted
// player's transcript panel (src/lib/transcript-ui.ts). Built, not committed; no VTT parser ships to
// the browser. Not under /transcripts/, which public/_headers serves as text/vtt.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getAllTranscripts } from '../../../lib/transcripts';
import type { TranscriptData } from '../../../lib/transcript';

export const getStaticPaths = (async () =>
  [...(await getAllTranscripts()).keys()].map((id) => ({ params: { id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const { cues } = (await getAllTranscripts()).get(params.id!)!;
  return Response.json({ cues } satisfies TranscriptData);
};
