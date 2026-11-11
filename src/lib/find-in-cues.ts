// Find in transcript (#106): every place a query is said in the playing episode's transcript. A
// plain scan, no library: one episode is at most a few hundred cues. Accents and case are ignored,
// as in the lesson filter. src/lib/transcript-find-ui.ts puts it on the panel.

/** One occurrence: a cue's index, and where in its text (UTF-16 offsets, end exclusive). */
export interface Found {
  cue: number;
  start: number;
  end: number;
}

/** Accents off and lowercased, one character at a time, so offsets map back to the original. */
const foldChar = (c: string) => c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** The folded text, and for each of its code units the offset of the original character it came from. */
function fold(text: string): { folded: string; from: number[] } {
  let folded = '';
  const from: number[] = [];
  let at = 0;
  for (const c of text) {
    const f = foldChar(c);
    folded += f;
    for (let k = 0; k < f.length; k++) from.push(at);
    at += c.length;
  }
  from.push(at);
  return { folded, from };
}

/** Every occurrence of `query` in `texts`, in order; none for a blank query. */
export function findInCues(texts: readonly string[], query: string): Found[] {
  const needle = fold(query.trim()).folded;
  if (!needle) return [];
  const found: Found[] = [];
  texts.forEach((text, cue) => {
    const { folded, from } = fold(text);
    for (let i = folded.indexOf(needle); i !== -1; i = folded.indexOf(needle, i + needle.length)) {
      found.push({ cue, start: from[i]!, end: from[i + needle.length]! });
    }
  });
  return found;
}
