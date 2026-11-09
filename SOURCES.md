# Sources

The lesson data in `src/content/lessons/` and the media in `public/mp3/` and `public/images/` were extracted once, on **2026-11-04**, from the archived Tá Falado site (lorenzolewis/tafalado#3). The original is © the University of Texas at Austin / COERLL, licensed [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/); see `CREDITS.md`. No extraction script is kept: this file records what was fetched and how the data was derived. The lessons' PDF transcripts were fetched too, converted into the study notes and then removed ([Study notes](#study-notes)).

## Source URLs

- Site: https://www.coerll.utexas.edu/brazilpod/tafalado/ (archived March 2, 2026)
- Lesson list: https://www.coerll.utexas.edu/brazilpod/tafalado/sitemap.html
- Lesson pages: `https://www.coerll.utexas.edu/brazilpod/tafalado/lesson-NN.html` (01–24), `lesson-suppl01.html`, `lesson-suppl02.html`, `lesson-graNN.html` (01–20)
- Feed: https://www.coerll.utexas.edu/brazilpod/tafalado/rss.php
- Credits: https://www.coerll.utexas.edu/brazilpod/tafalado/about.html
- Media: `https://www.coerll.utexas.edu/brazilpod/tafalado/mp3/<file>` and `https://www.coerll.utexas.edu/brazilpod/tafalado/images/<file>`, with the file names unchanged
- PDF transcripts (converted and removed): `https://www.coerll.utexas.edu/brazilpod/tafalado/pdf/<file>`

## How each field was derived

| Field                    | Source                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `series`, `number`       | The lesson page's file name (`lesson-13.html` → pronunciation 13). The feed numbers lessons differently, so its titles aren't used for this.                                                                                                                                                                                                             |
| `episode`                | The feed's track number (`itunes:subtitle`, "14/46: tafalado_13.mp3"). Supplementary 1 is 6, Supplementary 2 is 26 and Grammar 1 is 27, because the feed interleaves them. The MP3s have no ID3 track tag.                                                                                                                                               |
| `title`, `topic`         | The lesson page heading, without the "Lesson N:" prefix, split at the comma before the cultural topic. Exceptions: Pronunciation 19's topic ("Laundromats, Really?") has its own comma; Pronunciation 24 and both supplementary lessons have no topic. Spelling and capitalisation are the page's own, including "(alt)" on Pronunciation 11, 13 and 15. |
| `date`                   | The date on the lesson page, not the feed's `pubDate` (the first six lessons, dated November 9, 2006 on their pages, are in the feed as November 12; every later lesson has the same date in both).                                                                                                                                                      |
| `audio.durationSeconds`  | Measured from each file with macOS `afinfo` ("estimated duration"), rounded to the nearest second. All but one match the page and feed's `m:ss`: Pronunciation 5 measures 570.59 s, so it is 571 here (9:31) where the original says 9:30.                                                                                                               |
| `audio.bytes`            | The file's size on disk. Every value matches the feed's enclosure `length`.                                                                                                                                                                                                                                                                              |
| `photo.url`, `photo.alt` | The `<img>` inside the lesson intro and its original `alt` text. The supplementary lessons have no photo. See [Lesson photos](#lesson-photos) for their licensing.                                                                                                                                                                                       |
| body                     | The lesson page's intro paragraph; `<i>`/`<b>` became Markdown emphasis. The feed's dialogue text was not imported.                                                                                                                                                                                                                                      |

## Study notes

The dialogs and notes in `src/content/notes/` (lorenzolewis/tafalado#88, #89) come from the lessons' PDF transcripts, `https://www.coerll.utexas.edu/brazilpod/tafalado/pdf/<file>`: `tafalado_NN.pdf` (pronunciation), `tafalado_gra_NN.pdf` (grammar) and `tafalado_suppl_NN.pdf` (supplementary). They were in `public/pdf/` until the notes replaced them, then removed (lorenzolewis/tafalado#91): the site no longer serves or links them. The Wayback Machine (https://web.archive.org/) has copies at those URLs, and their checksums are below. Their text was extracted once with a throwaway pdfplumber script, not kept, and then checked by hand, lesson by lesson, against the rendered PDF pages. There was no native-speaker proofread: that pass is the proofread.

- **Highlights.** The PDFs' red becomes `<mark>`; the blue and green some lessons contrast with it become `<mark class="blue">` and `<mark class="green">`. Most PDFs carry the colour in their character data. In Pronunciation 6–9 and Supplementary 1 it only shows when rendered, so those were marked by eye.
- **IPA.** Pronunciation 6, 8 and 9 and Supplementary 1 use an old SIL Doulos font with its own encoding, so extraction gives `[Dv]`, `Znv\` and the like. Every symbol was retyped as Unicode IPA from the rendered page. Supplementary 2 was already Unicode.
- **Shared dialogs.** Pronunciation 11, 13 and 15 reuse the dialogs of 10, 12 and 14 (their PDFs match apart from the link), so the turns are stored once, in the first lesson.
- **Layout.** The banner, footer and "These notes accompany…" line are left out. Charts became tables whose headers set the cells' language (`docs/lesson-schema.md`); some pattern lists became bullet lists, and `->` became `→`. Supplementary 1's three vowel charts are split into one table per section. Pronunciation 24 has no dialog: its six clips keep their transcripts and Observations, and the PDF's other prose is the body.
- **Wording.** Clear spelling slips were fixed and are listed below. Awkward but correct wording and translations are kept as published, and so are the speaker labels and Grammar 20's word list (lorenzolewis/tafalado#92 checks them against the audio).

### Changes from the original notes

Notation, not typos:

- Pronunciation 5 types ASCII stand-ins `[@]`, `[E]`, `[O]` in its normal font; they are `[ə]`, `[ɛ]`, `[ɔ]` here. Pronunciation 6 `[ha.'pajs]` and Pronunciation 16 `['awa]` use a straight apostrophe for the stress mark; it is `ˈ` here.
- Pronunciation 6, 8, 9 and Supplementary 1: the legacy Doulos IPA is retyped as Unicode (above).
- Supplementary 2: the font's `lj` is the rendered `lʲ`.
- Grammar 19: three `(cid:31)` extraction artifacts are dropped.
- Pronunciation 24: the paragraph that introduces clips 3–6 now follows them, so "below" is dropped and "The next four clips" reads "Clips 3 to 6".

Typos (lesson, where: before → after). "(and 11)": the alternate lesson repeats the notes.

- Pronunciation 1, dialog (es): pída-lo → pídelo
- Pronunciation 3, dialog (es): pié → pie
- Pronunciation 3 and 4, notes: If the syllable is stress → If the syllable is stressed
- Pronunciation 4, dialog (es): ¿Como podemos pagar? → ¿Cómo podemos pagar?
- Pronunciation 4, notes: with the"open "o" → with the open "o"
- Pronunciation 5, dialog (es): esa cossa → esa cosa
- Pronunciation 7, notes: eg., → e.g.,
- Pronunciation 8, dialog: ¿En que sección → ¿En qué sección (es); vegtables → vegetables, mellons → melons, our mom's → our moms (en)
- Pronunciation 8, notes: This nasal diphthong in also heard → is also heard
- Pronunciation 9, dialog (en): I'm dieing of hunger → I'm dying of hunger; the United State → the United States
- Pronunciation 9, notes: more complicated that the 5 → more complicated than the 5; the 3 vowels sounds → the 3 vowel sounds
- Pronunciation 10 (and 11), notes: these word end → these words end; ma[ch]ure.). → ma[ch]ure.)
- Pronunciation 12 (and 13), dialog (es): Salío una película → Salió
- Pronunciation 12 (and 13), notes: the American moving going experience → movie going experience; vocal chords → vocal cords (twice); e.g, liv.ros → e.g., liv.ros
- Pronunciation 14 (and 15), dialog (es): el diez porciento ya está incluído → por ciento, incluido
- Pronunciation 14 (and 15), notes: oven-backed rice → oven-baked rice; at only at restaurants → and only at restaurants; tipping costumes → tipping customs; gorgeta → gorjeta (as in the dialog); disappear all together → disappear altogether
- Pronunciation 16, dialog (es): el água → el agua; el impuesto incluído → incluido
- Pronunciation 16, notes: an avacado → an avocado
- Pronunciation 17, notes: I going to keep on using → I'm going to; straight forward → straightforward
- Pronunciation 18, dialog: That true. → That's true. (en); acojedores → acogedores (es)
- Pronunciation 19, dialog (es): vengo en la mañanas → en las mañanas; lavar e secar → lavar y secar
- Pronunciation 20, dialog (es): mojaba la hojas → las hojas
- Pronunciation 21, dialog (es): revelé la mías → las mías
- Pronunciation 21, notes: prints for you pictures → for your pictures; Brazil, fatal, local, ideal, sol → Brasil, … (Portuguese examples)
- Pronunciation 22, dialog (es): digna de los dióses → dioses; nuestra ritmo de vida → nuestro ritmo
- Pronunciation 23, dialog (es): a outros → a otros; forma diminutivo → forma diminutiva; no serúa → no sería; "Liz para Elizabeth → "Liz" para Elizabeth
- Pronunciation 23, dialog (en): the person hás → the person has; "Liz for Elizabeth → "Liz" for Elizabeth
- Pronunciation 24, notes: exlamations → exclamations; but do worry too much → but don't worry too much; This clips offers a chance to here → This clip offers a chance to hear
- Pronunciation 24, clips: como sabe ingles → inglês (clip 3, as its Observations quote it); no Brazil não → no Brasil não (clip 6); Jose Luis → José Luis (the speakers of clips 4–6, as in clip 3)
- Supplementary 2, chart: gata, agua → gata, água; approximate → approximant (ɲ and ɫ rows)
- Grammar 1, dialog: les gustan os libros → los libros, Te gusta sentarte … estudiar? → ¿Te gusta … (es); the United State → the United States (en)
- Grammar 1, notes: a "regular verb → a "regular" verb; Voce gosta de estudar? → Você gosta de estudar?
- Grammar 2, dialog (en): Wating in line → Waiting in line
- Grammar 2, charts 1 and 2: em + essa, em + essas, de + essa, de + essas (for nesta, nestas, desta, destas) → em + esta, em + estas, de + esta, de + estas (the rows repeated the esse/essa inputs)
- Grammar 3, dialog (es): No! Vamos a dejar → ¡No! Vamos a dejar
- Grammar 3, notes: help costumers → help customers; fossil -> fósseis → fóssil → fósseis
- Grammar 4, dialog (es): Claro que no! → ¡Claro que no!; Si Diós quiere → Si Dios quiere
- Grammar 4, notes: We don't have this is Spanish → this in Spanish; Os que qusierem → Os que quiserem
- Grammar 5, dialog: Sit down hear → Sit down here (en); descúlpaame → discúlpame (es)
- Grammar 6, dialog (pt): exatamente por isso.. → exatamente por isso.
- Grammar 7, dialog (es): Y nada de agua! → ¡Y nada de agua!
- Grammar 7, notes: dando agua → dando água (Portuguese); les está dando água → dando agua (Spanish, twice); English → English: (as Spanish: and Portuguese:)
- Grammar 8, dialog: But be care that → But be careful that, different then in Brazil → different than (en); compra luego un carro nuevo! → ¡compra … (es)
- Grammar 8, notes: end in 'aõ' → end in 'ão'; as nãções → as nações
- Grammar 9, dialog: What wrong with her purse? I looks like → What's wrong … It looks like, that in from their perspective → that from their perspective (en); Es verdad! … vaqueros con chinelas! → ¡Es verdad! … ¡vaqueros con chinelas! (es)
- Grammar 9, charts 3 and 4 (es): su libros, su casas → sus libros, sus casas
- Grammar 9, chart notes: Some speakers could seu and sua → could use seu and sua (and sua and suas); chart 6's second "o livro delas" → os livros delas (the plural)
- Grammar 9, notes: su casa could mean you, his → your, his
- Grammar 10, dialog (es): No, eso no es cierto! → ¡No, eso no es cierto!
- Grammar 11, dialog (es): en el Brazil → en el Brasil (twice)
- Grammar 12, dialog: past the vestibular → pass the vestibular (en); en el Brazil → en el Brasil (es)
- Grammar 12, notes: that the can go without → that they can go without; There is not need for a details decription → There is no need for a detailed description; I is good → It is good; Future Subjuntive → Future Subjunctive (twice)
- Grammar 13, dialog: ¿Pero como así? → ¿Pero cómo así?, la edade → la edad (es); 21 years old.. → 21 years old., to by alcohol → to buy alcohol (en)
- Grammar 13, notes: el Puente → el puente; el arbol → el árbol; a agua – el água → a água – el agua
- Grammar 14, dialog: with every thing in it → with everything in it (en); Por que? Você não gosta → Por quê? (pt)
- Grammar 14, notes: a strange site indeed → a strange sight indeed
- Grammar 15, dialog: my first and last name.? → my first and last name? (en); embarassada → embaraçada (pt)
- Grammar 15, word list: esquisito (exquisite) → exquisito, assistir (to attend) → asistir (es); longo (long → longo (long)
- Grammar 16, dialog: Eloas andan besándonos → Ellas (es); the region in Brasil → in Brazil (en)
- Grammar 16, notes: two kisses on the check → on the cheek
- Grammar 17, dialog: Que bueno que aquí → Qué bueno, el peeaje → el peaje (es); weren't working either.. → either. (en)
- Grammar 17, notes: Eu gosto da comida.. → Eu gosto da comida.
- Grammar 18, dialog: the United State → the United States, it give people → it gives people (en); eso les dá → eso les da (es)
- Grammar 18, notes: follow a patter of → a pattern of; líderes do contresso → do congresso
- Grammar 19, dialog: Sí, Recientemente → Sí, recientemente (es); have used the a system → have used a system (en)
- Grammar 19, notes: (Marcos has been studying that book lately. → … lately.)
- Grammar 20, dialog: reclamar por que el sistema → porque, los autobuses anda → andan (es); the buses en up → end up (en)
- Grammar 20, notes: for it's handicapped citizens → for its; slopped curbs → sloped curbs

## Pronunciation 13 and the "lower-bitrate file"

The survey in lorenzolewis/tafalado#1 noted a second, lower-bitrate file for Pronunciation 13 on the home page. There isn't a second file: the home page shows Lesson 13 as its "Random Podcast Example" and links the same `mp3/tafalado_13.mp3` (4,028,140 bytes) as the lesson page and the feed. No other variant is linked anywhere on the site, and the obvious alternative names (`tafalado_13_lo.mp3`, `tafalado_13b.mp3`, …) return 404.

What the survey saw is that `tafalado_13.mp3` is **48 kbps**, half the 96 kbps of most lessons, so it is much smaller for its length (3.93 MB for 11:11). Pronunciation 13–20 are all 48 kbps; every other lesson is 96 kbps. Pronunciation 13 is also an "(alt)" lesson: the same dialogue as Lesson 12 with guest speaker Vivian Flanzer, not a duplicate recording of 12.

**Canonical:** `tafalado_13.mp3` as published, because it is the only file the original site, feed and home page ever pointed to, and no higher-bitrate original exists to replace it. Pronunciation 12 (`tafalado_12.mp3`) stays its own lesson.

## Lesson photos

**Decision:** all 44 photos are kept, on every lesson that has one, under the site's CC BY 3.0 license (lorenzolewis/tafalado#4).

The original site has no photo credits anywhere, so this is an assumption, not a confirmed grant. None of the 44 lesson pages, the About page, the 2010 copies of the old PHP site in the Wayback Machine, or COERLL's Portuguese collection page (which lists Tá Falado as "License: CC-BY") says who took the photos or licenses them separately. The JPEGs carry no camera, copyright or stock-agency metadata, only a generic Adobe marker from being saved for the web. Several photos show the team themselves, by the site's own captions and intros: Pronunciation 24, Grammar 9, 12, 18, 19 and 20. The others are everyday cultural scenes with no stated source. The site-wide CC BY 3.0 notice is taken to cover them all. The visitor-facing note is the "Photos" section of `CREDITS.md`.

If a rights holder objects to a photo, drop it from that lesson (`photo` is optional; the lesson then shows no photo) and record it here. The generated podcast artwork never uses lesson photos (lorenzolewis/tafalado#17).

## Checksums (SHA-256)

The `pdf/` rows are the removed PDF transcripts, as fetched (now only at their original URLs and in the Wayback Machine).

| File                                  |    Bytes | SHA-256                                                            |
| ------------------------------------- | -------: | ------------------------------------------------------------------ |
| `public/mp3/tafalado_01.mp3`          |  7590390 | `f54935bb918e0b0902cd94cdb4246e1c642c81039a4d4c14657bafca5f192a44` |
| `public/mp3/tafalado_02.mp3`          |  6805776 | `b36c6d66ac07a3572aa28eb827608da46ff3623bf0a6f94cd5f079f023ea1914` |
| `public/mp3/tafalado_03.mp3`          |  6300463 | `671c8197a95519e412c5c4951d4e252b0a24ecbfa9ec68f45503ee62fe20dbf4` |
| `public/mp3/tafalado_04.mp3`          |  7449971 | `5608c5315a918d23b6638d6b7f1ebc7c7df1a4d1511b6acc3ced4c4b38654a9c` |
| `public/mp3/tafalado_05.mp3`          |  6849364 | `471db620c90ca9049144eb0b664d90383dd1cf6d480570ba36df17154c7e4670` |
| `public/mp3/tafalado_06.mp3`          |  8906663 | `7e45076f2d6ba8076b1cefa18cd4d5b68b1fa4c2df15e55cdc3634426cd4edbe` |
| `public/mp3/tafalado_07.mp3`          |  9206967 | `a99e2b02b7a468ee4905dcb02ebe2cf40b0ae1b2c7e4ed8fccb14e023b7135ce` |
| `public/mp3/tafalado_08.mp3`          |  9458683 | `3303a93fb09749de398577ac26f12299613f4fa6398a9b74623478cb5d7f5256` |
| `public/mp3/tafalado_09.mp3`          |  7910144 | `04ebdc3f4089873ff47a7e3fd15022918ea39dfaa23d767bfb9ed92a318444a7` |
| `public/mp3/tafalado_10.mp3`          |  9929514 | `8bd7f676b65db6da0b92741bcce5ef850eaf70a5031173f09cf357759bd28523` |
| `public/mp3/tafalado_11.mp3`          |  5954409 | `1fb4dcab01affd856ca8a97c8098b4beaf53d925edf6274b1857c574e4e3c11e` |
| `public/mp3/tafalado_12.mp3`          | 10913808 | `794b4b4666a11f46168bd75de01d875862e7e3493b219002632868fc744ea951` |
| `public/mp3/tafalado_13.mp3`          |  4028140 | `f95c5a8c554ac40d870822cef03ccd6100a49b16263a6012f1c878150847666a` |
| `public/mp3/tafalado_14.mp3`          |  4723571 | `e2faf97ae799b91ca9fac83420b5731d1049d6cf714e555b727bce360e27cc28` |
| `public/mp3/tafalado_15.mp3`          |  3674389 | `33542b65aa8c607fdf0eb07439d5ed859eba8cc23357d89f009c42a8aff933ce` |
| `public/mp3/tafalado_16.mp3`          |  3771408 | `4daf9b8d12b062c4d8fd11458127fd090a3dd4574ba725c0f9743dbe57009356` |
| `public/mp3/tafalado_17.mp3`          |  5412107 | `e0c20e61c87abff075eae3986980d50009381c942a7df77d22b529880bd750df` |
| `public/mp3/tafalado_18.mp3`          |  4577181 | `ab6a1444e2db12137331cf33f0429f8758a3d559eb4d1f1d3b7abe6d2cdb1960` |
| `public/mp3/tafalado_19.mp3`          |  4113090 | `e5e4ad1f3859aa326e35380ca90eb6c9b6341943f6660bd1e76cb27c5977cbd6` |
| `public/mp3/tafalado_20.mp3`          |  4549126 | `6a4228d121f17e0f24225ee5a284f8ebb2bd79bbc5084187fe594f953b0b04d4` |
| `public/mp3/tafalado_21.mp3`          |  9606327 | `ec6ca6b058d9b01eddd8b11863713caf6af31fc391b6e71718d65f3caa42c96a` |
| `public/mp3/tafalado_22.mp3`          |  8520783 | `622fcd062301d10c0777672d5bc6ea2d4c9309c6d86248a5390ba2d934777ba9` |
| `public/mp3/tafalado_23.mp3`          |  6615202 | `9b9d64f0f49962464b6c125768c1024040a167a092bcfb025985351abbb61eb7` |
| `public/mp3/tafalado_24.mp3`          | 10864593 | `e29766221cae3061a7f77c2c302be11a4aed0f29d596f8cab09954c75bfc2434` |
| `public/mp3/tafalado_gra_01.mp3`      |  7793244 | `afe180b0ba4e788f2fd06872ec10da1db23566e1a5e0b7504377f6d851598ea4` |
| `public/mp3/tafalado_gra_02.mp3`      |  8880670 | `fdedc9cbb4a6d77d49792de81b58a792356882f94cb300a78585a67b48b66aa5` |
| `public/mp3/tafalado_gra_03.mp3`      |  9538328 | `68fe3b5b8ef5712ada5b64734702061fd269fe8ae4e78763cdcb4c2a927cab79` |
| `public/mp3/tafalado_gra_04.mp3`      | 10017310 | `17874e5afba1734b12bd6ce4e8f8748d073a428225bf10193dbe62103cb32a2c` |
| `public/mp3/tafalado_gra_05.mp3`      |  6954877 | `1a14387109ca8696766fc4eca05e5cba54abac443b0749fcf49228ea85b83845` |
| `public/mp3/tafalado_gra_06.mp3`      |  8054841 | `a3fb849fe69a7ce7f47f905ef33dc4829862bb0fd768e463da780f3b386ad6a9` |
| `public/mp3/tafalado_gra_07.mp3`      |  8920957 | `3e1efe6be238e5e07d88570bef2136dbe76ab16c9a80078ce22eadc6473fe969` |
| `public/mp3/tafalado_gra_08.mp3`      |  9627515 | `e134aff90a407d23e52bc9f2a33fa80e130cbd2384862a716d3b98ee1ae04fa5` |
| `public/mp3/tafalado_gra_09.mp3`      |  8988038 | `b4517ef6d64bdb89db32d86edb48c2adbbdd1f4cd072299e31f7684317ab4d7b` |
| `public/mp3/tafalado_gra_10.mp3`      |  8217530 | `d7b797e7db13afe403d2dfc7049efbbc71dc1033fe1265b1a0fc7f1e51e94d77` |
| `public/mp3/tafalado_gra_11.mp3`      |  8658268 | `32a057609af853b3a6beb9ee74fed1f682c6aec4b058ae0d1ab24430138325c1` |
| `public/mp3/tafalado_gra_12.mp3`      |  9441628 | `e2fde7100c8669af949c66943703b0bc97fe217067727ab0e3b063ef0e07e993` |
| `public/mp3/tafalado_gra_13.mp3`      |  8317213 | `917925dedcd344f0a1e2c6a910b8446ae24ccb58243ae113e87a79a6c4a97413` |
| `public/mp3/tafalado_gra_14.mp3`      |  7493573 | `c193c571779e5402938bafbedb822dff13f414bf000285149c76f3d987f0b1eb` |
| `public/mp3/tafalado_gra_15.mp3`      |  7803908 | `6b8c13a12c5f661e953efc3e42097f9fb3782d68c6ab9b6536a16342d2965a1a` |
| `public/mp3/tafalado_gra_16.mp3`      |  9033649 | `65efda206376df547e2687503ed0ab0663795cb11befa1312ee43e9d39411a36` |
| `public/mp3/tafalado_gra_17.mp3`      |  7015533 | `c6b3ac6e017b8cd20856edeb64fe9c54b139e73ab06af0ffb4f6c9483c7db3bd` |
| `public/mp3/tafalado_gra_18.mp3`      |  7872244 | `391d952e6817fa0c53582f4a49529d0c400814dcb9740f7cbcc2613ff50824e5` |
| `public/mp3/tafalado_gra_19.mp3`      | 11629175 | `94b806d7a6bf390c1698f6a630f7e19622b2aaaaa9c6fe35319889628df05bf1` |
| `public/mp3/tafalado_gra_20.mp3`      |  7961268 | `85bcd4e23f45c8b40f2ac0e182179d71253b589607293290cdce6b2c80c7d3bf` |
| `public/mp3/tafalado_suppl_01.mp3`    |  6786981 | `31a32e2eab0effd4ea02cb735dcb38944b126e0f1394177ad3745dcfe33bb4ba` |
| `public/mp3/tafalado_suppl_02.mp3`    |  3997119 | `6198541ef9633bd83d18464406885c12e5c367754ec0ff836d53a983d8f6cf0e` |
| `pdf/tafalado_01.pdf`          |   154732 | `1c3e49b18d480f88946de54df9a8ee60047e02f2372d55f46cdef9cab5d2579f` |
| `pdf/tafalado_02.pdf`          |   154684 | `bbbc537e672c08a287a71f032b56f88a1a2394da4c3e393fd7f01d6f058d21cc` |
| `pdf/tafalado_03.pdf`          |   157069 | `c605fc1aa044de62fa13fb26dc9a192350847e03dddd47f40d779976016a223f` |
| `pdf/tafalado_04.pdf`          |   156607 | `1105467718fc0d43aef2864d4ceb4295e23590b9efa91d11e7b5841a7e02afa3` |
| `pdf/tafalado_05.pdf`          |   155038 | `f21ced7ad978c38f87f8b4dee1e89579814a305db1b94153826cceaea3d8ad18` |
| `pdf/tafalado_06.pdf`          |   390347 | `4426b045568ca347680334c90d8bf5cfb6bf88c8f9c47001c3c301a925f0453d` |
| `pdf/tafalado_07.pdf`          |   368718 | `7836e1d3b187845acc4246ad083edcb722b1c5401ff9323fcc071cd37bda8548` |
| `pdf/tafalado_08.pdf`          |   274631 | `ea5a1d90300db4645ea3ee29164e5f8f5af938e56ce95254790e62098267541b` |
| `pdf/tafalado_09.pdf`          |   274343 | `96a37951b84fa440d7d2405234aa8ddfd042dc34ab8e3a41e1510196d6422691` |
| `pdf/tafalado_10.pdf`          |   159389 | `1d9ed486e1349d236dabd1095324201ac587b855e2f3dcc88f7e75f44f7475be` |
| `pdf/tafalado_11.pdf`          |   159389 | `01ac9c06e3117ab74440ff945b4c46bfc0db38bfaf997d2446e6f359de86965a` |
| `pdf/tafalado_12.pdf`          |   160169 | `9b10d77c1d0f66b8524596c7bc6338fb32de9b59a82a8966fc110dcc7999c5c2` |
| `pdf/tafalado_13.pdf`          |   160170 | `6089ba42573e9960ac3cba16b8d04d541100da896e79ed2a1555d99933480c23` |
| `pdf/tafalado_14.pdf`          |   159256 | `67de5ac3c6ff9356f204115e125af1c7e2de6ada8c1951753bc7d3980e79aa39` |
| `pdf/tafalado_15.pdf`          |   159257 | `dcfc63c83da357af896f83768b9f92a7112cda2df0513bf9c78198c17a8a3916` |
| `pdf/tafalado_16.pdf`          |   147940 | `0445da6f08ba62f59496729658b7f280217275193b380115e38abe65e11a68b7` |
| `pdf/tafalado_17.pdf`          |   149537 | `487fe115391ed310eae5a459fa5800bc30bee4bc520987375fb5926fefbcdf9c` |
| `pdf/tafalado_18.pdf`          |   148128 | `8d4c6c0f4afc5c7961a697f785ed8236dfa7b88a1da5d7a2adaa42c06cc8b106` |
| `pdf/tafalado_19.pdf`          |   148226 | `2bbcd006ec449d14b68860b6abb521b50b07db203e558e1373ba4306fa04dee1` |
| `pdf/tafalado_20.pdf`          |   147090 | `410d58dd21e545a2c3e63ec51f7fb59ea5328afa43230603f6c4dcf91bf76d69` |
| `pdf/tafalado_21.pdf`          |   148515 | `688f2cae19fdf54820136fa5c033cb84d31a5f73dd4da07744691f7787a255c1` |
| `pdf/tafalado_22.pdf`          |   150720 | `68e2f1165d467ec5f8cfb93a7552a3ffbeadc75a96fdeeac27bcb3431613e1ae` |
| `pdf/tafalado_23.pdf`          |   157021 | `a340880d0bc64a736c003f61e6868df253a62df77a5e9e1f920ee72360929fc8` |
| `pdf/tafalado_24.pdf`          |   623642 | `1305901f9a1ecca56f77f8b1171555afb661bbc85b775024ce31cd6a97e210b7` |
| `pdf/tafalado_gra_01.pdf`      |   151122 | `103f686282fc8a680cff626f3f794d56f38ef993ede2e8ad805e25b7f47f0516` |
| `pdf/tafalado_gra_02.pdf`      |   172250 | `2e69eee869b1373de5fe9a93331ec15f582342f8f3355301fc72924a6db8fd37` |
| `pdf/tafalado_gra_03.pdf`      |   148989 | `4c5c84eb4a2120ecc86cbd216222551e48ab8ecaf9999a6ec432c747e3b8edb5` |
| `pdf/tafalado_gra_04.pdf`      |   154632 | `5e7bb1951f7a896821e30ca3d87e5e4694e4b3792f841b26062c5caa911122a0` |
| `pdf/tafalado_gra_05.pdf`      |   147868 | `73f5ef2078dbaae691d911c6fb8f52e23773a6167eae58f1cb883a7b503945c7` |
| `pdf/tafalado_gra_06.pdf`      |   149339 | `cc72fe7769f83a0a962d8b08a8ac513402fbd83c1431e3adcbec218f873116f6` |
| `pdf/tafalado_gra_07.pdf`      |   150769 | `94cf0b3c9ca11e7e886421609aca40be6678000876358c08d2e70f074825fdf2` |
| `pdf/tafalado_gra_08.pdf`      |   148836 | `d8a1319810e963f60c6c67f40e6ffa85945b5f6081b37e99263d522aee3ea8eb` |
| `pdf/tafalado_gra_09.pdf`      |   163768 | `e8b6c34d4b11af412a5eb0973ee89f98eba0592de3225def39c06c3a260f0779` |
| `pdf/tafalado_gra_10.pdf`      |   147684 | `e294e85e18e1ec0ba0c65b40e71a96b754e74da44d71aabfcc9c71fec7494bd8` |
| `pdf/tafalado_gra_11.pdf`      |   148474 | `176cf431f16fcfbb04f1d76d5b462d991e90c7f6d28874488c75262db41734aa` |
| `pdf/tafalado_gra_12.pdf`      |   150703 | `1b87e11c2e4e652404376671df4823468d9d6224bc6587fb7245434385214b03` |
| `pdf/tafalado_gra_13.pdf`      |   149082 | `efb609dc471b912844d5ddecc018830db81c716a3b8e9dec756debfbf678fc91` |
| `pdf/tafalado_gra_14.pdf`      |   149619 | `c5c22c57723a59e8be01ed3f21728fd965a619a41f846700be65274329021ca6` |
| `pdf/tafalado_gra_15.pdf`      |   149446 | `315411321ca0ff2426cb6b1d4cc37547839a64ea51ae88240d8e5c85fd13116e` |
| `pdf/tafalado_gra_16.pdf`      |   152752 | `9fdb72215faff9f335561c919ac1712e47b4d0c2fbd3e10de7c1481060cfe5c5` |
| `pdf/tafalado_gra_17.pdf`      |   150171 | `2e457315145f03b92beddf1a3f3e0ab47781defaf317b8e6651246a2e939e844` |
| `pdf/tafalado_gra_18.pdf`      |    31737 | `2959991e068f7d57811ea131d1d3bac45ee869e8514a22b60ac4dd8cfe025044` |
| `pdf/tafalado_gra_19.pdf`      |    32156 | `9df501a43ab5f09b71f47d2f4fb5ccacdd1a1ae0114505ffcd5f51af11e10d6d` |
| `pdf/tafalado_gra_20.pdf`      |    42101 | `bab17e997600aab7ec8c0f0e860bb33d18d06870fe02da9871a82a24d270180d` |
| `pdf/tafalado_suppl_01.pdf`    |   380258 | `994432027dc3c78ec57182383f2790c115c0fc4c07a1fa93dac0ca49197761bc` |
| `pdf/tafalado_suppl_02.pdf`    |   273563 | `7078ccd3bc31be95e260d3d2e7fc0b53a4c212212f8430b24de33bb4631a67cb` |
| `public/images/lesson_pic_01.jpg`     |    17692 | `721a61fbceb4fb7ebd74f9c95e9cd5b0e3e0cf4e6cf530bbc96efe7ea788de00` |
| `public/images/lesson_pic_02.jpg`     |    19751 | `016a54287b53c839f2cc5660306c589b3afd060bdded8f9600afc752847f155d` |
| `public/images/lesson_pic_03.jpg`     |    22415 | `f3d2f945da1f68cdbb69d88aff300474020ed3644d5924ee74ae8a88d1a66c54` |
| `public/images/lesson_pic_04.jpg`     |    35699 | `72fb80bdae896d15442e57d143490bd1d9b30198b242ea40a2c722b59f036b64` |
| `public/images/lesson_pic_05.jpg`     |    31173 | `b2498dc7d5e8e552021f7a071606fe9deaa4d11221781dc4fae47112a20678c6` |
| `public/images/lesson_pic_06.jpg`     |    28102 | `99ae542a5eed2ff1055e1de290e0ab95eec686a15973fd80e515f3a655d7e8e4` |
| `public/images/lesson_pic_07.jpg`     |    30007 | `f0336132dbd061c90ece5c97cc3e2a23f5c5a79ba09750d2e900418f240beea0` |
| `public/images/lesson_pic_08.jpg`     |    34200 | `f211255c5a5f4d72ff6fa366d2d291a4bd55bfe3c7a00846b87a64b42fe76116` |
| `public/images/lesson_pic_09.jpg`     |    29147 | `3a8190be1aa90524b410944eae553cf51cde9b853fa6e73d5a4352f2def48611` |
| `public/images/lesson_pic_10.jpg`     |    23743 | `bcf163b7688acf52435c9316be2c4f59ff2d36f381369a2d69c8ef0686792532` |
| `public/images/lesson_pic_11.jpg`     |    23329 | `fd77030d790b50ef1b1079bba50014c763665e59ab4f7b59e5872a442615a3b4` |
| `public/images/lesson_pic_12.jpg`     |    28345 | `ce5ee7f7e2ac17b082d6dc63f9f273ac771da4dbce32d1b41caa97ffc63516c0` |
| `public/images/lesson_pic_13.jpg`     |    29078 | `e43da737e639e27cec6ba39f44dad80c374b2b2c0efbe63ebd54459f4ad58f29` |
| `public/images/lesson_pic_14.jpg`     |    20065 | `218657c7b7121e9f38eda570e04d13e4b2e431a6831091001e0666a9f60128c0` |
| `public/images/lesson_pic_15.jpg`     |    22669 | `5ab4df1453591c5042048a34b4d6596364874066308ac9a477c879aef0f62064` |
| `public/images/lesson_pic_16.jpg`     |    28973 | `8c6fb4426ad599dbe67a2db94688cc6f852a891e34f693451b74a528fb6f7d7f` |
| `public/images/lesson_pic_17.jpg`     |    27863 | `f6ec8c5f857987c42315e6fe2f293deec4677e47c208cf1b06dd22b271783b10` |
| `public/images/lesson_pic_18.jpg`     |    30783 | `085d13da9e99a3229f80806b426fe60b202d819da527ea4922ecdd3c5471b7e3` |
| `public/images/lesson_pic_19.jpg`     |    27326 | `556539ff138d48acde507f1c044e40885bd66defc4d8c6a07de48194e449bccf` |
| `public/images/lesson_pic_20.jpg`     |    31255 | `0695983c734f87c1914f2dcb21dc7adbff1099dfab08b10018cb1ff3676830a1` |
| `public/images/lesson_pic_21.jpg`     |    33386 | `272445bbaa50410af6d9ee106152d86fe9784eb2870b660f2176ac1ba57dc38b` |
| `public/images/lesson_pic_22.jpg`     |    21802 | `4afb3eebe3acf9c50040f63fe80fe0245d41280c5c7839480d2058fb095c980a` |
| `public/images/lesson_pic_23.jpg`     |    21295 | `718cbb13d2d499e5931600ad2437048c0ff820cd43120f59118d75dd802b4c80` |
| `public/images/lesson_pic_24.jpg`     |    27858 | `0ebca7777aaf6204971ccd73f8ebe1d8c3659a4ae08a988be2aec8064282613e` |
| `public/images/lesson_pic_gra_01.jpg` |    22496 | `73736e558dbef65a81a6f5fc756edc14f8a79926bfa355fb549bc819fcf2337e` |
| `public/images/lesson_pic_gra_02.jpg` |    22363 | `3aba95c0b38ffd239e31651f9bc7ad2f77f829fcda6b3cc71fd498b9bc14ad85` |
| `public/images/lesson_pic_gra_03.jpg` |    20553 | `d7b1f1c4d761be0531758cdfcb4a2aca3803b1750f334490a7386d3511cf6896` |
| `public/images/lesson_pic_gra_04.jpg` |    23687 | `9f57ae91b0b5592b58486fe17cc7ccf5a702b315a94baa41693be0ad294938d0` |
| `public/images/lesson_pic_gra_05.jpg` |    22004 | `a44664e51c86bfed528db8ef90951e98b72c34ef291d0bf8b731b25d85dc4597` |
| `public/images/lesson_pic_gra_06.jpg` |    29773 | `0f2039f88354f8ca688a0c5933c2f070695e2d5292113b2b83f31798b14f1022` |
| `public/images/lesson_pic_gra_07.jpg` |    21869 | `a401a3621b93c59ce48c16d98e8fc9c0e32f2a74ece39be8fc7839ef65bcd004` |
| `public/images/lesson_pic_gra_08.jpg` |    22874 | `6f103a7724608d8beec5be8f7b79905e5680f17b4300c9f3b38fe42023ac8789` |
| `public/images/lesson_pic_gra_09.jpg` |    29183 | `3daa0e66a90b57b976c7935ac29f1c3f33b0dcd8aec93fab792a657ac29fda91` |
| `public/images/lesson_pic_gra_10.jpg` |    26934 | `0249b3e9ef196b375daf34784e586d797b5bfdb15981bf9a0ce5d8ce2f34a493` |
| `public/images/lesson_pic_gra_11.jpg` |    34921 | `013ac0f058a9ac421ca3d37f458935ebffebbc71c2361aae3afb61677f4746db` |
| `public/images/lesson_pic_gra_12.jpg` |    25219 | `caaf97110a34a93d11623a1de06d741c65cabf447034e44bfff58361a27641e9` |
| `public/images/lesson_pic_gra_13.jpg` |    26658 | `2f0c15f4d6d7491fe707d7bd83e39d2611f7d9453c931f6fbb66ce7aea75d3ea` |
| `public/images/lesson_pic_gra_14.jpg` |    29107 | `1a7267c2eb7cd5231668b23a04b69268bdefbd80fa854a366369ea6981a1a05f` |
| `public/images/lesson_pic_gra_15.jpg` |    27908 | `38fcc8f9d8ed5055b5761a1c99db65280bfeed5c61a74664c200e422fd0e11fe` |
| `public/images/lesson_pic_gra_16.jpg` |    16069 | `a022b91f4a2d9149303d45e458149a2eb7f8962eca1e8c8b22b0e3cd6396099b` |
| `public/images/lesson_pic_gra_17.jpg` |    27003 | `0044975b6e23266d4fafe271aa56f6aefa217f819a44d1002c81b9bd290493f1` |
| `public/images/lesson_pic_gra_18.jpg` |    18458 | `ae5082bd858bf2f9fc736d3169328fe54bb9d40657abc1b377e52657211c90b7` |
| `public/images/lesson_pic_gra_19.jpg` |    29715 | `63d0bf3c7480ecfc205a78a3e83db1ac832b0c4b13ee17bc5edbe2066e9ab607` |
| `public/images/lesson_pic_gra_20.jpg` |    32113 | `3b6bcd07e88e32415fa2ea6eb4ff252be2e32efb9d5d69b04a841b3da00d68d6` |
