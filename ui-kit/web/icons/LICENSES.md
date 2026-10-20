# Third-party fonts and glyph maps in `ui-kit/web`

These files are byte-identical copies of what the Expo app already ships through `@expo/vector-icons` 15.1.1 (`build/vendor/react-native-vector-icons`), so the website renders the same glyphs.

| File | Origin | License |
|---|---|---|
| `MaterialIcons.ttf` | Material Icons font, © Google | Apache License 2.0 — https://www.apache.org/licenses/LICENSE-2.0 |
| `MaterialCommunityIcons.ttf` | Material Design Icons, © Pictogrammers and contributors | Pictogrammers license terms — https://pictogrammers.com/docs/general/license/ (check against the bundled version before any redistribution outside Mmusic) |
| `material-icons.json`, `material-community-icons.json` | glyph-name → codepoint maps from react-native-vector-icons, © 2015 Joel Arvidsson | MIT — full text in `LICENSE-react-native-vector-icons.txt` |

Text fonts are not copied here; `ui-kit/web/styles/fonts.ts` imports them from their packages:

| Font | Package | License |
|---|---|---|
| Inter | `@expo-google-fonts/inter` 0.4.2 | SIL Open Font License 1.1 (font), MIT (package) |
| Plus Jakarta Sans | `@expo-google-fonts/plus-jakarta-sans` 0.4.2 | SIL Open Font License 1.1 (font), MIT (package) |
