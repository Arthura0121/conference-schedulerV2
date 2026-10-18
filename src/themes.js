export const THEMES = [
  {id:'aurora', name:'Aurora After Dark', season:'Default', description:'The original midnight Aurora world: northern lights, stars, sapphire glass and cyan glow.'},
  {id:'fall', name:'Fall', season:'Autumn', description:'A cozy illustrated harvest world with falling leaves, lanterns, a distant scarecrow, branches, acorns, warm paper surfaces and sunset light.'},
  {id:'halloween', name:'Halloween', season:'Spooky', description:'A haunted night with a glowing moon, bats, ghosts, spiderwebs, pumpkins, candy, fog, graves, skeleton details and eerie arcade-like controls.'},
  {id:'winter', name:'Winter', season:'Holiday', description:'A full festive winter world with Santa and four reindeer flying a gift-loaded sleigh, falling snow, sparkling stars, glowing village houses, pines, wreaths, festive lights, gifts, frost and crisp icy controls.'}
]
export const THEME_IDS = THEMES.map(t=>t.id)
export const safeTheme = value => THEME_IDS.includes(value) ? value : 'aurora'
