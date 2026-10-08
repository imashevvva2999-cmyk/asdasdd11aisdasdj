// Shared content for the W3 concept mockups (design review only, not app code).
// Everything here exists in the app today (src/mocks): no invented sections.
const ART = '../../../../apps/mobile/assets/artwork/';
const img = (p, extra = '') => `<img src="${ART}${p}" alt="" ${extra}/>`;
const mi = (n, c = '') => `<span class="mi ${c}">${n}</span>`;
const EQ = (bars = [7, 13, 18, 11, 6]) => `<span class="eqmark">${bars.map((h) => `<i style="height:${h}px"></i>`).join('')}</span>`;

const NOW = { cover: 'tracks/midnight-mirage.jpg', title: 'Midnight Mirage', artist: 'Solaris Echo', album: 'Horizon (Deluxe)', pos: '1:22', rem: '-2:38', pct: 34 };
// Precomputed, contrast-checked palette of the playing track (src/constants/artwork-palettes.ts).
const PAL = { bg: '#4a488e', deep: '#23223f', mini: '#201f32', accent: '#5d5bbe' };
const NEXT_PAL = { bg: '#365ba0', deep: '#1b2946' }; // Horizon (next track)

const FOR_YOU = [['foryou/after-hours.jpg', 'After Hours'], ['foryou/synthetic-waves.jpg', 'Synthetic Waves'], ['foryou/deep-focus.jpg', 'Deep Focus'], ['artists/solaris-echo.jpg', 'Solaris Echo'], ['foryou/chill-electronic.jpg', 'Chill Electronic'], ['foryou/neo-soul.jpg', 'Neo Soul']];
const FEATURED = { cover: 'playlists/late-night-flow.jpg', title: 'Late Night Flow', kind: 'Editorial playlist', blurb: 'Slow-burning electronica and ambient textures for the hours after midnight.' };
const TRENDING = [['albums/nebula-dreams.jpg', 'Nebula Dreams', 'Kaelen'], ['albums/lost-frequencies.jpg', 'Lost Frequencies', 'Arlo'], ['albums/velvet-skyline.jpg', 'Velvet Skyline', 'Maya Lin'], ['albums/chronos-echoes.jpg', 'Chronos Echoes', 'Tate Vane'], ['albums/refraction-horizon.jpg', 'Refraction Horizon', 'Clover and the Pulse'], ['albums/resonant-field.jpg', 'Resonant Field', 'Sable Duo']];
const NEW_RELEASES = [['albums/solitary-echo.jpg', 'Solitary Echo', 'Yuki Tanaka'], ['albums/neo-classical-horizons.jpg', 'Neo-Classical Horizons', 'Nils Frahm'], ['albums/horizon-deluxe.jpg', 'Horizon (Deluxe)', 'Solaris Echo'], ['albums/refraction-horizon.jpg', 'Refraction Horizon', 'Clover and the Pulse']];
const QUEUE = [['generated/horizon.jpg', 'Horizon', 'Solaris Echo', '3:04'], ['tracks/obsidian-frequencies.jpg', 'Obsidian Frequencies', 'Solaris Echo', '4:02'], ['generated/ember-tide.jpg', 'Ember Tide', 'Solaris Echo', '4:35'], ['generated/resonant-field-reprise.jpg', 'Resonant Field (Reprise)', 'Solaris Echo', '3:51'], ['tracks/vapor-trails.jpg', 'Vapor Trails', 'Overcast Skies', '3:28'], ['generated/abyssal-bloom-feat.jpg', 'Abyssal Bloom (feat. Kaelen)', 'Solaris Echo', '5:12']];
const LYRICS = ['City lights dissolve to static', 'Chasing echoes down the wire', 'Midnight mirage, I keep walking', 'Through a haze of amber fire', 'Every signal fades to silence', 'Every shadow finds its frame', 'Midnight mirage, call your name', 'Nothing here is what it seems'];
const CURRENT_LINE = 2;

function mount(views) {
  const v = new URLSearchParams(location.search).get('v') || Object.keys(views)[0];
  document.getElementById('root').innerHTML = (views[v] || Object.values(views)[0])();
}
