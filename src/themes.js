export const THEMES = [
  {id:'aurora', name:'Aurora After Dark', season:'Default', description:'Midnight navy, sapphire, cyan and mint with the original animated aurora sky.'},
  {id:'fall', name:'Fall', season:'Autumn', description:'Warm amber, burnt orange, burgundy and drifting leaf-like lights.'},
  {id:'halloween', name:'Halloween', season:'Spooky', description:'Ink black, violet and pumpkin orange with a foggier, eerie night sky.'},
  {id:'winter', name:'Winter', season:'Holiday', description:'Evergreen, icy blue, cranberry and gold with a snowy night atmosphere.'}
]
export const THEME_IDS = THEMES.map(t=>t.id)
export const safeTheme = value => THEME_IDS.includes(value) ? value : 'aurora'
