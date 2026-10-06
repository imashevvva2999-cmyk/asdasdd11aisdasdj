---
name: Nocturne Audio
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#e4bdba'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#ab8886'
  outline-variant: '#5b403e'
  surface-tint: '#ffb3ae'
  primary: '#ffb3ae'
  on-primary: '#68000b'
  primary-container: '#ff5351'
  on-primary-container: '#5c0008'
  inverse-primary: '#bb1522'
  secondary: '#ffb955'
  on-secondary: '#452b00'
  secondary-container: '#dc9100'
  on-secondary-container: '#4f3100'
  tertiary: '#ffb4a2'
  on-tertiary: '#621100'
  tertiary-container: '#e96a4a'
  on-tertiary-container: '#560e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ae'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#930014'
  secondary-fixed: '#ffddb4'
  secondary-fixed-dim: '#ffb955'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#633f00'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a2'
  on-tertiary-fixed: '#3c0700'
  on-tertiary-fixed-variant: '#862208'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
  mono-num:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system establishes a premium, late-night acoustic sanctuary tailored for discerning audiophiles and modern music enthusiasts. It balances dark-first cinematic immersion with Swiss editorial restraint. The experience feels bespoke, intentional, and intimately tethered to the emotional resonance of sound and cover art.

### Design Movement & Aesthetic
- **Atmospheric Dark-First Realism:** High-fidelity black tones accented with localized, music-driven illumination. Surfaces do not feel flat; instead, they evoke high-end physical audio hardware combined with fluid, contemporary glass software.
- **Glassmorphism & Optical Diffusion:** Sub-surface translucent layers with real-time backdrop filtering isolate interactive elements (such as navigation bars and floating mini-players) from dynamic background artwork.
- **Emotional Resonance:** Artwork and playback controls take center stage. Chrome and UI borders recede into deep obsidian shades, allowing vibrant album art and dynamic ember indicators to guide user attention.

## Colors
The color architecture relies on high-contrast contrast ratios against ultra-deep black fields. Chromatic focus is reserved for interactive states, playback tracking, and generative album halos.

### Palette Application
- **Canvas Base (`#0A0A0C`):** Pure background zero-layer, tuned specifically for OLED displays to maximize contrast and preserve power.
- **Surface Elevation Layers:**
  - `Surface Level 1 (#141418)`: Primary structural container background (cards, sheets, bottom navigation panels).
  - `Surface Level 2 (#1C1C24)`: Interactive elements, input text backgrounds, and inactive pills.
  - `Surface Level 3 (#282834)`: Hover/active overlays and border highlights.
- **Primary Accent (`#FF4B4B`):** Radiant warm ember-coral used for primary call-to-actions, active scrubbers, streaming status, and dynamic playback meters.
- **Secondary Accent (`#F5A623`):** Acoustic gold dedicated to lossless/Hi-Res badges, curated editorial marks, VIP subscriptions, and star ratings.
- **Tertiary Accent (`#FF7A59`):** Soft flame transition tint used in gradient maps across album ambient backdrops.
- **Typography & Icon Grayscale:**
  - `High Emphasis (#FFFFFF)`: Titles, track names, primary icons (100% opacity).
  - `Medium Emphasis (#9E9EA8)`: Artist names, secondary metadata, inactive tab states (65% opacity).
  - `Low Emphasis (#5A5A66)`: Timestamps, unselected scrubber tracks, disabled states (38% opacity).
  - `Border Stroke Tint (rgba(255, 255, 255, 0.08))`: Ultra-subtle boundary definition.

## Typography
The system employs a dual-sans typographic pairing. **Plus Jakarta Sans** provides structural elegance and expressive warmth across titles, editorial collections, and screen headings. **Inter** handles high-density micro-copy, track rows, scrub time indicators, and interface metadata with tabular numeric clarity.

### Usage Standards
- Display and Headline treatments require tight negative letter-spacing to avoid loose optical tracking in dense dark layouts.
- Track timings, bitrate tags (`24-bit / 192kHz FLAC`), and playback scrubbers enforce tabular numbers (`font-variant-numeric: tabular-nums`) to avoid layout jitter during real-time playback.
- Sub-labels, badges, and genre chips use uppercase transformations paired with generous tracking (+0.06em) for instant legibility at 10px–12px.

## Layout & Spacing
Built primarily around a mobile-native baseline (390pt viewport base width), the system implements an 8-point spatial model with 4-point micro-adjustments for compact metadata alignment.

### Grid & Form Factors
- **Mobile (Up to 599px):** 4-column fluid layout with `1.25rem` (20px) outer margins and `1rem` (16px) gutters. Safe-area top padding strictly respects dynamic status bars; bottom safe margins enforce a clearance of `96px` to account for the persistent floating mini-player and navigation bar stack.
- **Tablet (600px - 1023px):** 8-column layout with `2rem` (32px) margins. Playlists reflow into dual-column grids; cover art scales to sticky left-hand side panels during playback views.
- **Desktop / Large Displays (1024px+):** 12-column layout centered at max width `1440px`. Navigation transitions to a persistent left sidebar (260px fixed width), and the playback engine locks into a persistent bottom bar.

### Spacing Rhythm
Vertical rhythm prioritizes tactile ergonomics: touch targets maintain a minimum vertical foot of 48px, even when track row typography spans a compact 40px bounding box.

## Elevation & Depth
Depth in the system is not achieved through high-contrast drop shadows, but through tonal stratification, backdrop illumination, and selective light leakage.

### Surface Tiers
- **Layer 0 (Base Floor):** `#0A0A0C` flat canvas.
- **Layer 1 (Recessed/Passive):** `#141418` with zero shadow; delimited solely by a `1px` translucent edge border (`rgba(255, 255, 255, 0.05)`).
- **Layer 2 (Floating Cards & Sheets):** Backdrop blur of `24px` over `rgba(20, 20, 24, 0.75)` with an ambient shadow: `0px 12px 32px -8px rgba(0, 0, 0, 0.65)`.
- **Layer 3 (Overlays & Player Drawers):** Backdrop blur of `40px` over `rgba(10, 10, 12, 0.88)` with an inner hairline highlight: `inset 0px 1px 0px rgba(255, 255, 255, 0.12)`.

### Chromatic Lighting (Glow Effects)
Album artworks project an active, color-sampled glow behind the primary player module:
- Gaussian blur of `64px`, `30%` opacity, placed beneath the artwork container to dynamically light up the dark canvas according to the playing track's color profile.

## Shapes
A roundedness value of 2 establishes a contemporary, organic aesthetic that avoids overly sharp corners while preserving structural precision.

### Radius Distribution
- **Album Art & Primary Feature Cards:** `1.25rem` (20px) to `1.5rem` (24px).
- **Secondary Cards & Modal Sheets:** `1rem` (16px).
- **Controls & Input Fields:** `0.75rem` (12px).
- **Interactive Action Pills, Badges & Scrub Thumb:** Full circular curve (`9999px`).
- **Inner Element Hierarchy:** When an element sits nested inside a rounded card, its radius is calculated as `R_outer - Padding` to preserve concentric curvature.

## Components

### Buttons & Interactive Controls
- **Primary Play Buttons:** Full pill geometry (`rounded-full`), solid `#FF4B4B` fill with `#FFFFFF` text and icons. Includes a subtle optical glow: `box-shadow: 0 4px 20px rgba(255, 75, 75, 0.35)`. Press state scales to `0.96` with an immediate 150ms cubic-bezier transition.
- **Secondary Buttons:** Translucent glass fill (`rgba(255, 255, 255, 0.08)`), `1px` inner border (`rgba(255, 255, 255, 0.12)`), `#FFFFFF` text.
- **Tactile Playback Controls:** Main Play/Pause is a 64px circular button; Skip/Rewind controls are 40px unbordered tap zones with high-emphasis glyphs.

### Chips & Filter Pills
- Heights fixed at `32px`.
- Unselected state uses `Surface Level 2` with `#9E9EA8` typography.
- Selected state adopts a crisp inverted gradient from `#FF4B4B` to `#FF7A59` with crisp white text, or an ultra-bright glass white pill (`#FFFFFF` with `#0A0A0C` text) for editorial filtering.

### Track List Rows
- Height: `56px` continuous rhythm.
- Structure: Left index number or 40px album thumbnail (8px radius) -> Title with artist below -> Right-hand track duration and triple-dot option trigger.
- **Active Playing State:** Title color switches to `#FF4B4B`. The index/thumbnail slot displays an active 3-bar animated soundwave equalizer rendered in the primary accent.

### Album & Playlist Cards
- Aspect ratio: `1:1` for standard music releases; `16:9` for curated editorial banners.
- Corner radius: `16px` to `20px`. Overlaid text features a downward linear gradient (`rgba(0, 0, 0, 0)` to `rgba(0, 0, 0, 0.8)` across the lower 40%).

### Floating Mini-Player
- Suspended `8px` above the bottom tab bar with `16px` lateral margins.
- Surface: Frosted dark acrylic (`rgba(24, 24, 30, 0.85)`, `blur(20px)`), with a `1px` subtle top border (`rgba(255, 255, 255, 0.1)`).
- Progress indicator: `2px` micro-scrubber line pinned directly to the top edge of the mini-player card.

### Inputs & Search
- Height: `44px`. Background `#141418` with a `1px` border of `rgba(255, 255, 255, 0.06)`. Focused state shifts border to `rgba(255, 75, 75, 0.5)` with an interior ember halo. Placeholder text set to `#5A5A66`.