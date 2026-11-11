// Playing a lesson from a given time: for the transcript panel's lines and the dialog's turns
// (src/lib/transcript-ui.ts), and for transcript lines found from the sidebar (src/lib/sidebar-ui.ts).
import { player } from './player';
import { allTracks } from './tracks';

/** Jumps to `seconds` into a lesson and plays, loading the lesson first if another is playing. */
export function seekTo(lesson: string, seconds: number) {
  if (player.state.track?.id !== lesson) {
    const track = allTracks().find((t) => t.id === lesson);
    if (!track) return;
    player.play(track);
  }
  player.seek(seconds);
  if (player.state.paused) player.play();
}
