import materialCommunityIcons from '../icons/MaterialCommunityIcons.ttf';
import materialIcons from '../icons/MaterialIcons.ttf';
import { fontFacesCss } from './fonts';
import { tokenVariablesCss, typeScaleCss } from './tokens';

// Browsers only download a face once a glyph from it is rendered, so declaring both icon fonts costs nothing up front.
const iconFontsCss = () =>
  `@font-face{font-family:"MaterialIcons";font-style:normal;font-weight:400;font-display:block;src:url("${materialIcons}") format("truetype")}` +
  `@font-face{font-family:"MaterialCommunityIcons";font-style:normal;font-weight:400;font-display:block;src:url("${materialCommunityIcons}") format("truetype")}`;

const componentCss =
  '.mm-icon{display:inline-block;flex:none;width:1em;height:1em;font-family:"MaterialIcons";font-style:normal;font-weight:400;line-height:1;text-align:center;letter-spacing:normal;text-transform:none;white-space:nowrap;-webkit-font-smoothing:antialiased;user-select:none}' +
  '.mm-icon-community{font-family:"MaterialCommunityIcons"}' +
  '.brand-bars{display:inline-flex;align-items:center;gap:2px;height:20px}' +
  '.brand-bars i{width:2.5px;border-radius:2px;background:var(--primary);animation:brand-bar var(--d) ease-in-out var(--delay) infinite alternate}' +
  '@keyframes brand-bar{from{transform:scaleY(1)}to{transform:scaleY(0.45)}}' +
  '@media (prefers-reduced-motion: reduce){.brand-bars i{animation:none}}';

/** Everything the web UI kit needs at runtime: text + icon fonts, token variables, type classes and component styles. */
export function foundationCss(): string {
  return fontFacesCss() + iconFontsCss() + tokenVariablesCss() + typeScaleCss() + componentCss;
}
