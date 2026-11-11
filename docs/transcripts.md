# Episode transcripts

Each episode gets a transcript: one WebVTT file per lesson in `public/transcripts/`, named by the lesson id (`pronunciation-13.vtt`, `grammar-04.vtt`, `supplementary-01.vtt`) and served at `/transcripts/<lesson id>.vtt` as `text/vtt; charset=utf-8` (`public/_headers`). All 46 episodes are done: Pronunciation 1–24, Grammar 1–20 and Supplementary 1–2.

The podcast feed links each one from its `<item>` with `<podcast:transcript url="…" type="text/vtt"/>`, so Apple Podcasts and other players can show it. An episode without a file gets no tag. Apple only shows a provided transcript once the show is set to **Display transcripts I provide** in Apple Podcasts Connect, and only if it is complete and correctly spelled: it must cover the whole episode, not just the dialog. Lesson pages don't show the transcripts yet (issue #99).

`pnpm validate:feed` checks that each linked transcript is the lesson's own file, on the site, in `dist/`, and follows the format below. An episode without one fails the check. `src/lib/transcript-check.test.ts` checks the committed files too.

## Format

```vtt
WEBVTT

NOTE pronunciation-13. Machine draft, cleaned and checked by ear; see docs/transcripts.md.

00:00:03.350 --> 00:00:08.770
<v Orlando>Welcome to <lang pt-BR>Tá Falado</lang>, the Brazilian Portuguese
pronunciation for speakers of Spanish.

00:06:04.000 --> 00:06:10.250
<v Michelle><lang pt-BR>Eu estou com dois ingressos para o cinema que</lang>
<lang pt-BR>tenho que usar antes que o prazo esgote.</lang>
```

- **UTF-8**, starting with `WEBVTT`, one `NOTE` naming the lesson.
- **Short cues.** At most two lines of at most 65 characters (the Podcast Namespace's recommendation for VTT), so players can show them as captions. A longer turn becomes several cues of the same speaker, split at sentence ends, then clause ends, then between words, with the time shared out by length.
- **A speaker on every cue**, as `<v Name>`, with the names the notes use: Orlando, Valdo, Michelle, Vivian, José Luis, and guests by first name (Alfredo). A voice nobody could name is `<v Speaker>`.
- **Three languages.** The file's language is English, like the feed's. Portuguese is wrapped in `<lang pt-BR>…</lang>` and Spanish in `<lang es>…</lang>`, whether it's a whole cue or one word in an English sentence. A span never crosses a line break: it is closed at the end of the line and reopened on the next.
- **Transcribe, never translate.** What was said, in the language it was said in. The notes hold the translations.
- **Dialog turns** read the notes' dialog text, without the highlights, every time a turn is read, repeats included, except where the speakers say something else: then the transcript has what they say.
- **Clean verbatim.** Fillers and false starts ("uh", repeated words) are dropped unless they're the point (a speaker trying a sound). The English is kept as spoken. Music and silence get no cue.
- `&`, `<` and `>` are escaped as `&amp;`, `&lt;` and `&gt;`. No other tags.
- **The whole episode**: the intro, the explanations, the dialog, the cultural talk and the goodbye.

The full files go to the feed, `<v>` and `<lang>` included. Apple ingests `<v>` speaker names; a player that shows the `<lang>` tags as text would be a reason to serve a stripped copy to the feed later.

## On the site

The transcript shows only in the player (#99), never on the lesson page: a **Show transcript** pill on the desktop player row opens a bar on the right, and the same pill in the phone's player sheet opens it there. It is always the playing episode's, and it stays open across pages with the player (ADR 0001). Every line is a button that jumps there; the panel follows the playing line until it's scrolled, then offers **Back to now**. Portuguese is bold on the paper's underline, Spanish italic on a dotted one, and a line that is all one language gets a PT or ES chip.

Each dialog turn on the lesson page gets a play button that jumps to its first reading, and is lit while any of its readings plays (#94). A turn's readings are found at build time by matching its Portuguese against the cues: letters and digits only, lowercased, whole words, across however many cues it was split into. A shared dialog (Pronunciation 11, 13, 15) is matched against the lesson that reads it. Pronunciation 24's clips aren't matched: they're excerpts broken up by discussion.

- `src/lib/transcript.ts` parses the VTT (`parseVtt`), finds the readings (`matchTurns`) and holds the build checks; `src/lib/transcripts.ts` reads the files when the site builds.
- The browser never parses VTT: each transcript is built into `/data/transcripts/<lesson id>.json` (not under `/transcripts/`, which `public/_headers` serves as `text/vtt`).
- **The build fails** on a transcript named for no lesson, one that breaks the format above, and a dialog turn whose text the transcript never reads in full. So when a turn's text changes in the notes, change its readings here too (and the other way round).
- `src/lib/transcript-ui.ts` wires the panel and the turns to the player.
- Transcripts are searchable (#7, #106). From two characters typed, the sidebar's lesson filter lists the lessons it matches as before, and below them the transcript lines that match, grouped by episode. It searches `/data/transcript-cues.json`: every cue's plain text in one file, fetched when the filter first opens (`src/lib/transcript-search.ts`, `src/lib/search-view.ts`). The panel's **Find in transcript** field marks a word in the playing episode (`src/lib/find-in-cues.ts`, `src/lib/transcript-find-ui.ts`). Why it is built this way is in `docs/research/transcript-search.md`.

## How they were made

Each episode switches language every few seconds: Orlando explains in English, Valdo, Michelle and the guests speak Portuguese, José Luis reads the Spanish lines. A speech recognizer run over the whole file picks one language per 30-second window and garbles the rest, so the transcripts were made in four passes, one episode at a time.

1. **Who speaks when.** Every quarter second of audio is matched against reference voices of the episode's cast (two or three clean 2–7 s stretches per person, taken from the episodes) with [Resemblyzer](https://github.com/resemble-ai/Resemblyzer) speaker embeddings. That cuts the episode into single-speaker stretches, split at speaker changes and at pauses of 0.75 s or more. The cast comes from each episode's intro.
2. **What they say.** Each stretch is transcribed on its own by [whisper.cpp](https://github.com/ggml-org/whisper.cpp) with the `large-v3-turbo` model, detecting the language per stretch. A stretch detected as anything but English, Portuguese or Spanish is run again in each of the three and the most confident reading kept. Nothing is translated.
3. **The dialog.** A run of one speaker's stretches that reads a turn of the lesson's dialog (72 % word similarity or more) is replaced by the turn's text from the notes (`src/content/notes/`; Pronunciation 11, 13 and 15 read the dialog of 10, 12 and 14).
4. **Cleanup by an agent.** The draft is read through and fixed: speaker labels where the voice matcher swapped two similar voices or put a quick exchange ("Vivian?" "Mesmo, gostoso." "Valdo?") under one speaker, names and terms (whisper writes "Waldo", "Michele", "Tafalado"), Portuguese and Spanish words inside English sentences marked, fragments merged, noise dropped, dialog repeats whisper skipped restored. Doubtful spans are transcribed again on their own, which often hears them better. Then the cues are wrapped and split to fit the format above.
5. **A person's listen.** The episode is played with its transcript, starting from the timestamps the cleanup marked as doubtful, and fixed by ear.

### Settings that mattered

| Setting | Value | Why |
| --- | --- | --- |
| Model | whisper.cpp `ggml-large-v3-turbo` | On Pronunciation 13's dialog it caught every reading; the full `large-v3` was slightly worse ("Waldo", "Gostei" for *gostoso*) and took twice as long. |
| Language | detected per stretch, limited to en / pt / es | One language per 30 s window garbles these episodes. Short stretches sometimes come back as Galician or Italian; re-running them in the three allowed languages fixes that. |
| Context | off (`-mc 0`) | Carrying text from one window to the next caused repetition loops. |
| Voice window | 1.2 s, every 0.25 s | Short enough for one-word turns. |
| Pause split | 0.75 s | Keeps a speaker's sentence together but separates the dialog's turns. |
| Dialog match | 0.72 word similarity | Catches whisper's near misses of a dialog line without snapping free talk to it. |

About five minutes of computer time per 11-minute episode on an Apple-silicon Mac, one episode at a time.

## Fixing or redoing one

- **A wrong word or speaker**: edit the cue in `public/transcripts/<lesson id>.vtt`. Keep each line to 65 characters and two lines per cue, close every `<lang>` on the line it opens on, and run `pnpm vitest run src/lib/transcript-check.test.ts`.
- **Redoing an episode**: install whisper.cpp and ffmpeg (`brew install whisper-cpp ffmpeg`), download `ggml-large-v3-turbo.bin` from the whisper.cpp models on Hugging Face, and install Resemblyzer in a Python environment. Then follow the passes above: reference voices for the cast, voice matching into stretches, one whisper.cpp run per stretch (`whisper-cli -m ggml-large-v3-turbo.bin -l auto -mc 0`, then en / pt / es if it detects another language), the dialog from the notes, the cleanup, the wrapping, and a listen. Re-running whisper.cpp on just one span is `whisper-cli … -ot <offset ms> -d <duration ms>`.
- A new guest needs reference stretches of their own voice where nobody else speaks.

The generation tools aren't in this repo: the files are the record, and they're fixed by hand from here on.
