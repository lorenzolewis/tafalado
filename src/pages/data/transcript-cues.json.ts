// Every episode's cues as plain text, in one file (#7, #106), for searching transcripts from the
// sidebar's lesson filter (src/lib/transcript-search.ts). Built from the same transcripts as the
// per-episode JSON beside it, so the same build checks apply. Fetched only the first time a learner
// searches transcripts.
import type { APIRoute } from 'astro';
import { getLessons, lessonPath } from '../../lib/lessons';
import { toTranscriptCues, type TranscriptCues } from '../../lib/transcript-search';
import { getAllTranscripts } from '../../lib/transcripts';

export const GET: APIRoute = async () => {
  const [lessons, transcripts] = await Promise.all([getLessons(), getAllTranscripts()]);
  const cues = lessons.flatMap((l) => {
    const transcript = transcripts.get(l.id);
    return transcript ? [[lessonPath(l.data), transcript.cues] as [string, typeof transcript.cues]] : [];
  });
  return Response.json(toTranscriptCues(cues) satisfies TranscriptCues);
};
