# Kyrgyz track audio — pending licensed files

None of the 20 Kyrgyz tracks added in
docs/superpowers/plans/2026-10-12-kyrgyz-track-catalog.md have audio yet.
This file is the handoff checklist for wiring in real, licensed files once
they're supplied. Do not add a file here until you have confirmed the
rights holder has authorized its use in this app.

For each track you have a licensed file for:

1. Place the audio file at `apps/mobile/assets/audio/kyrgyz/<track-id>.mp3`
   (track id from the table below — must match the `Track.id` exactly).
2. Add one line to `DEMO_SOURCES` in `apps/mobile/src/audio/demo-sources.ts`:
   `'<track-id>': require('../../assets/audio/kyrgyz/<track-id>.mp3'),`
3. Add a row to a new `apps/mobile/assets/audio/kyrgyz/CREDITS.md` (create
   it the first time, same table format as the existing top-level
   `assets/audio/CREDITS.md`) recording: file name + byte size, the
   rightsholder, the license/permission reference (contract, email,
   written permission — whatever proof your organization requires), and
   the date added.
4. Update this track's `durationSec` in `apps/mobile/src/mocks/tracks.ts`
   from the 180-second placeholder to the real file's duration.
5. Remove this track's row from the table below, and remove its id from
   `PENDING_AUDIO_TRACK_IDS` in `apps/mobile/src/audio/demo-sources.ts`.
   (Artwork is separate: an id leaves `PENDING_ARTWORK_TRACK_IDS` /
   `PENDING_ARTWORK_ARTIST_IDS` in `src/constants/stitch-artwork.ts` only
   when approved artwork is added to the artwork maps — then re-run
   `python3 scripts/generate-palettes.py`.)
6. Run `cd apps/mobile && pnpm test` — `verify-kyrgyz-catalog.mjs`'s "no
   demo audio" check and `verify-demo-audio-coverage.mjs`'s pending-id
   exemption will now correctly fail for this track id (it has real audio
   now); update `verify-kyrgyz-catalog.mjs` to drop the now-playable id
   from its `hasDemoAudio(trackId) === false` assertion list.
7. Manually verify playback: `npx expo start --web`, open the track from
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
