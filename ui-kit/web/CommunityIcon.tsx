import glyphs from './icons/material-community-icons.json';

export type CommunityIconName = keyof typeof glyphs;

export type CommunityIconProps = { name: CommunityIconName; size?: number; className?: string };

/**
 * MaterialCommunityIcons glyph: the Expo app's <Icon set="community">. A separate module so the
 * 7k-entry glyph map only reaches a bundle that actually renders a community icon.
 */
export function CommunityIcon({ name, size = 20, className }: CommunityIconProps) {
  return (
    <span className={className ? `mm-icon mm-icon-community ${className}` : 'mm-icon mm-icon-community'} style={{ fontSize: size }} aria-hidden="true">
      {String.fromCodePoint(glyphs[name])}
    </span>
  );
}
