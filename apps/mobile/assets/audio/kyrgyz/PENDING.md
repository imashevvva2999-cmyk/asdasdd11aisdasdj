# Kyrgyz track audio — pending licensed files

None of the 20 Kyrgyz tracks added in
docs/superpowers/plans/2026-10-12-kyrgyz-track-catalog.md have audio yet.
This file is the handoff checklist for wiring in real, licensed files once
they're supplied. Do not add a file here until you have confirmed the
rights holder has authorized its use in this app.

For each track you have a licensed file for:

1. Place the audio file at `apps/mobile/assets/audio/kyrgyz/<track-id>.mp3`
   (track id from the table below — must match the `Track.id` exactly).
2. Add an entry to `demoAudioCredits` in `apps/mobile/src/audio/demo-audio.ts`
   with all six fields of `DemoAudioCredit`: `originalTitle`, `author`,
   `sourceUrl`, `licenseName`, `licenseUrl`, `isInstrumental`. Set
   `isInstrumental` deliberately: it gates whether lyrics are shown for this
   recording, so `true` only when the recording has no vocals.
   `hasDemoAudio()` reads this map, so without this entry the track will not
   count as playable even if the file is wired in step 3.
3. Add one line to `DEMO_SOURCES` in `apps/mobile/src/audio/demo-sources.ts`:
   `'<track-id>': require('../../assets/audio/kyrgyz/<track-id>.mp3'),`
   `DEMO_SOURCES` and `demoAudioCredits` must always change together: their
   keys must match exactly (`verify-demo-audio-coverage.mjs` requires this).
4. Add a row to a new `apps/mobile/assets/audio/kyrgyz/CREDITS.md` (create
   it the first time, same table format as the existing
   `apps/mobile/assets/audio/CREDITS.md`) recording: file name + byte size, the
   rightsholder, the license/permission reference (contract, email,
   written permission — whatever proof your organization requires), and
   the date added.
5. Update this track's `durationSec` in `apps/mobile/src/mocks/tracks.ts` to
   the real file's duration. Nineteen of the twenty tracks still carry the
   180-second placeholder; `kyrgyzstanym` is already 135 s, so check its
   current value rather than assuming 180.
6. Remove this track's row from the table below, and remove its id from
   `PENDING_AUDIO_TRACK_IDS` in `apps/mobile/src/audio/demo-sources.ts`.
   Artwork is separate: an id leaves `PENDING_ARTWORK_TRACK_IDS` /
   `PENDING_ARTWORK_ARTIST_IDS` in `apps/mobile/src/constants/stitch-artwork.ts`
   only when approved artwork is added to the artwork maps. Then re-run
   `cd apps/mobile && python3 scripts/generate-palettes.py`.
7. Run `cd apps/mobile && pnpm test`. `verify-kyrgyz-catalog.mjs`'s "no
   demo audio" check and `verify-demo-audio-coverage.mjs`'s pending-id
   exemption will now correctly fail for this track id (it has real audio
   now). Update `verify-kyrgyz-catalog.mjs` to drop the now-playable id from
   its `hasDemoAudio(trackId) === false` assertion list.
8. Scope the license checks in `apps/mobile/scripts/verify-demo-audio-coverage.mjs`
   before the first real licensed Kyrgyz import. Right now that script asserts
   for every credit that `author` is 'Kevin MacLeod' and `licenseUrl` is
   CC BY 4.0, which was written for the original demo recordings. Those two
   checks must apply only to the original 13 demo recordings, skipping any id
   that is a Kyrgyz track. The non-empty `originalTitle` and `isInstrumental`
   checks must still run for all credits. Do this as part of the first import
   task; do not change the script in this runbook task.
9. Manually verify playback: `npx expo start --web`, open the track from
   its artist/genre page, confirm it plays and `now-playing.tsx`'s credits
   sheet reads correctly.

## Pending tracks (20)

| Track id | Title | Artist |
|---|---|---|
| kyrgyzstanym | Кыргызстан | Амирчик |
| muras | Мурас | Мирбек Атабеков |
| ene-til | Эне Тил | Баястан |
| alai | Алай | Бегиш |
| kachan-kaitat | Качан Кайтат | Баястан, Бегиш, G-VOO |
| jazym-kelchi | Жазым келчи | Гульнур Сатылганова |
| kyrgyz-biyi | Кыргыз бийи | Султан Садыралиев |
| ne-segodnya | Не сегодня (Семьдесят пятый) | Улукманапо |
| kirgiz-jeri | Кыргыз жери | Саламат Садыкова |
| erke-kyz | Эрке Кыз | Тенгир-Тоо |
| chopo-choor-fantasy | Fantasy on the Chopo Choor | Нурланбек Нышанов |
| kyrgyzstanym-remix | Кыргызстаным (Remix) | Омар Жанышов |
| jashtyk-kez | Жаштык Кез | Кайрат Кыргыз |
| kambarkan | Камбаркан | Нурак Абдрахманов |
| esimde | Эсимде | Toktobek Asanaliev |
| kyrgyz-bala | Кыргыз бала | KIGGAZ |
| taimuras | Таймурас | G-VOO |
| ananayyn | Ананайын | Тамга |
| eto-lyubov | Это любовь | Айбек Замиров |
| issyk-kulskiy-vaib | Иссык-Кульский Вайб | FreeMan996 |
