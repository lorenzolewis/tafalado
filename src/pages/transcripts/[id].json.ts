// PROTOTYPE (#99): throwaway. Each transcript as JSON, built from public/transcripts/<id>.vtt, for
// the persisted player's transcript (src/lib/transcript-proto-ui.ts).
import type { APIRoute, GetStaticPaths } from 'astro';
import { getLessons } from '../../lib/lessons';
import { getNotes } from '../../lib/notes';
import { loadTranscript, PROTO_LESSONS } from '../../lib/transcript-proto';

export const getStaticPaths = (() => PROTO_LESSONS.map((id) => ({ params: { id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id!;
  const lesson = (await getLessons()).find((l) => l.id === id);
  const notes = lesson && (await getNotes(lesson));
  return Response.json(await loadTranscript(id, notes?.dialog ?? []));
};
