export const THEMES = [
  {id:'aurora', name:'Aurora After Dark', season:'Default', description:'The original midnight Aurora world: northern lights, stars, sapphire glass and cyan glow.'},
  {id:'fall', name:'Fall', season:'Autumn', description:'A cozy illustrated harvest world with falling leaves, warm paper surfaces, branches, acorns and sunset light.'},
  {id:'halloween', name:'Halloween', season:'Spooky', description:'A haunted night with a glowing moon, bats, pumpkins, candy, fog, graves, skeleton details and eerie arcade-like controls.'},
  {id:'winter', name:'Winter', season:'Holiday', description:'A snowy lodge world with falling snow, pine silhouettes, festive lights, gifts, frost and crisp icy controls.'}
]
export const THEME_IDS = THEMES.map(t=>t.id)
export const safeTheme = value => THEME_IDS.includes(value) ? value : 'aurora'
