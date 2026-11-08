export const THEMES = [
  {id:'aurora', name:'Aurora After Dark', group:'Atmospheres', season:'Alpine midnight', description:'An observatory under moving ribbons of northern light. Controls scatter tiny constellations.'},
  {id:'fall', name:'Fall', group:'Seasons', season:'Golden afternoon', description:'A balloon over golden hills and a breeze that shakes maple leaves from the controls.'},
  {id:'halloween', name:'Halloween', group:'Holidays', season:'Pulp-comic twilight', description:'An illustrated hilltop manor, violet fog, and bats that fan out when you press a control.'},
  {id:'thanksgiving', name:'Thanksgiving', group:'Holidays', season:'Harvest sunset', description:'A harvest moon, migrating geese, a lantern-lit turkey, and little sprays of wheat and embers.'},
  {id:'winter', name:'Winter', group:'Holidays', season:'Holiday village', description:'Santa, glowing windows and frosted controls that shake loose snowflakes.'},
  {id:'blossom', name:'Cherry Blossom', group:'Seasons', season:'Spring sunrise', description:'A pale pink sunrise over an arched bridge. Paper-like petals spill from the controls.'},
  {id:'firefly', name:'Firefly Coast', group:'Atmospheres', season:'Summer blue hour', description:'A sweeping lighthouse beam and pulses of fireflies around the controls.'},
  {id:'studio-snowday', name:'Snow Day', group:'Seasons', season:'Bright winter morning', icon:'❄', description:'Cut-paper mountains, a sled, and mitten-blue controls that shed soft snow.'},
  {id:'studio-boardwalk', name:'Boardwalk', group:'Seasons', season:'Summer at noon', icon:'☀', description:'A pop-art beach with a Ferris wheel, surf, and bubbles that bounce off the controls.'},
  {id:'studio-monsoon', name:'Monsoon Garden', group:'Seasons', season:'Rainy afternoon', icon:'☂', description:'A rain-streaked greenhouse and enamel controls that ripple with each tap.'},
  {id:'studio-lunar', name:'Lunar New Year', group:'Holidays', season:'Lantern procession', icon:'◇', description:'Scarlet lanterns sway above a gold skyline. Golden sparks rise from the controls.'},
  {id:'studio-valentine', name:'Valentine Post', group:'Holidays', season:'Candy-colored daylight', icon:'♥', description:'A pink postage desk with fluttering letters and hearts that tumble from the controls.'},
  {id:'studio-newyear', name:'Midnight Countdown', group:'Holidays', season:'Art Deco New Year', icon:'✦', description:'A gold skyline, descending countdown ball, and confetti from the controls.'},
  {id:'studio-notebook', name:'Notebook', group:'School', season:'Morning study hall', icon:'✎', description:'Lined paper, ink doodles and paper airplanes. Chalk marks scatter on activation.'},
  {id:'studio-science', name:'Science Fair', group:'School', season:'Retro lab display', icon:'⚛', description:'Graph-paper orbit diagrams and glowing waveforms. Controls emit orbiting electrons.'}
]
export const THEME_IDS = THEMES.map(t=>t.id)
export const safeTheme = value => THEME_IDS.includes(value) ? value : 'aurora'

// Public visual preference only; never stores student information or teacher credentials.
// This is a fallback while the public/teacher theme is being fetched from the server.
const THEME_KEY = 'conference_site_theme'
export function rememberedTheme() {
  try { return safeTheme(localStorage.getItem(THEME_KEY) || document.documentElement.dataset.theme) }
  catch { return 'aurora' }
}
export function applySiteTheme(value) {
  const theme = safeTheme(value)
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
  try { localStorage.setItem(THEME_KEY, theme) } catch {}
  return theme
}
