export const THEMES = [
  {id:'aurora', name:'Aurora After Dark', season:'Default', description:'Northern lights sweep across an alpine observatory, with an icy moon, shooting stars and midnight sapphire controls.'},
  {id:'fall', name:'Fall', season:'Autumn', description:'A hot-air balloon floats through golden-hour orchards, over drifting leaves, lanterns and amber hills.'},
  {id:'halloween', name:'Halloween', season:'Spooky', description:'An eerie hilltop manor flickers through violet fog, with passing bats, candy and glowing pumpkins.'},
  {id:'thanksgiving', name:'Thanksgiving', season:'Harvest feast', description:'A harvest moon over cranberry-colored hills, with migrating geese, swirling maple leaves, glowing lantern light and a fan-tailed turkey.'},
  {id:'winter', name:'Winter', season:'Holiday', description:'Snow falls over icy peaks, a lantern-lit village and Santa’s reindeer crossing the night sky.'},
  {id:'blossom', name:'Cherry Blossom', season:'Spring', description:'Windblown petals, a blossom canopy and an arched bridge over a rose-colored river at dusk.'},
  {id:'firefly', name:'Firefly Coast', season:'Summer', description:'Fireflies shimmer over a quiet bay with a sweeping lighthouse beam, rippling water and deep sea-green controls.'}
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
