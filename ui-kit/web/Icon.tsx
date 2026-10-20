import glyphs from './icons/material-icons.json';

export type IconName = keyof typeof glyphs;

export type IconProps = { name: IconName; size?: number; className?: string };

/** MaterialIcons glyph: the same font and glyph map the Expo app's <Icon> (set="material") uses. */
export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <span className={className ? `mm-icon ${className}` : 'mm-icon'} style={{ fontSize: size }} aria-hidden="true">
      {String.fromCodePoint(glyphs[name])}
    </span>
  );
}
