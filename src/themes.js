export const THEMES = [
  {id:'aurora', name:'Aurora After Dark', group:'Atmospheres', season:'Alpine midnight', description:'An observatory under moving ribbons of northern light. A ribbon of light follows your pointer across glass controls.'},
  {id:'fall', name:'Fall', group:'Seasons', season:'Golden afternoon', description:'A balloon drifts over golden hills. Press the copper controls to warm the grain.'},
  {id:'halloween', name:'Halloween', group:'Holidays', season:'Pulp-comic twilight', description:'An illustrated hilltop manor, violet fog, and halftone controls that flash with comic-book slashes.'},
  {id:'thanksgiving', name:'Thanksgiving', group:'Holidays', season:'Harvest sunset', description:'A harvest moon, migrating geese, a lantern-lit turkey, and brass controls engraved with wheat that glints beneath your touch.'},
  {id:'winter', name:'Winter', group:'Holidays', season:'Holiday village', description:'Santa, glowing windows and frosted controls whose snow caps compress and shed flakes.'},
  {id:'blossom', name:'Cherry Blossom', group:'Seasons', season:'Spring sunrise', description:'A pale pink sunrise over an arched bridge. Paper petals fold outward beneath your touch.'},
  {id:'firefly', name:'Firefly Coast', group:'Atmospheres', season:'Summer blue hour', description:'A sweeping lighthouse beam and lens-shaped lights that flare beneath your pointer.'},
  {id:'studio-snowday', name:'Snow Day', group:'Seasons', season:'Bright winter morning', icon:'❄', description:'Cut-paper mountains, a sled, and mitten-blue controls with snow piled along their top edges.'},
  {id:'studio-boardwalk', name:'Boardwalk', group:'Seasons', season:'Summer at noon', icon:'☀', description:'A pop-art beach with a Ferris wheel, surf, and enamel controls that send a tide across the button.'},
  {id:'studio-monsoon', name:'Monsoon Garden', group:'Seasons', season:'Rainy afternoon', icon:'☂', description:'A rain-streaked greenhouse and enamel controls that ripple with each tap.'},
  {id:'studio-lunar', name:'Lunar New Year', group:'Holidays', season:'Lantern procession', icon:'◇', description:'Scarlet lanterns sway above a gold skyline. Press the lacquered controls to flash their gold facets.'},
  {id:'studio-valentine', name:'Valentine Post', group:'Holidays', season:'Candy-colored daylight', icon:'♥', description:'A pink postage desk with fluttering letters and wax hearts that stamp into the controls.'},
  {id:'studio-newyear', name:'Midnight Countdown', group:'Holidays', season:'Art Deco New Year', icon:'✦', description:'A gold skyline, descending countdown ball, and marquee lights that sweep across the controls.'},
  {id:'studio-notebook', name:'Notebook', group:'School', season:'Morning study hall', icon:'✎', description:'Lined paper, ink doodles and paper airplanes. An ink underline grows from where you press.'},
  {id:'studio-science', name:'Science Fair', group:'School', season:'Retro lab display', icon:'⚛', description:'Graph-paper orbit diagrams and glowing waveforms. Press the phosphor panels to trace an electron orbit.'}
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
