import {safeTheme, THEMES} from '../themes.js'

// Print-friendly interpretations of the site palettes. Each mark is static SVG path data.
const styles = {
 aurora: ['#153d68', '#53d8bc', '#eaf5fa', 'M2 14c9-12 13 5 28-10M2 21c9-12 13 5 28-10M3 28c9-12 13 5 27-10'],
 fall: ['#69371f', '#ecac59', '#f9eee0', 'M16 29V15m0 8C3 22 4 11 7 7c0 5 8 3 9 12 1-9 9-7 9-12 3 4 4 15-9 16Z'],
 halloween: ['#49235f', '#f3a75f', '#f5eafa', 'M2 12l7 4 3-2 4 3 4-3 3 2 7-4-5 11-6-2-3 4-3-4-6 2Z'],
 thanksgiving: ['#733344', '#e4a84f', '#fcf0e1', 'M16 29V5m0 9c-6 0-9-3-9-6 5 0 9 2 9 6Zm0 6c6 0 9-3 9-6-5 0-9 2-9 6Zm0 6c-6 0-9-3-9-6 5 0 9 2 9 6Z'],
 winter: ['#18515e', '#a9e3df', '#e9f5f5', 'M16 2v28M4 9l24 14M4 23 28 9M12 5l4 4 4-4m-8 22 4-4 4 4M5 13l5-1-1-5m18 12-5 1 1 5M5 19l5 1-1 5m18-12-5-1 1-5'],
 blossom: ['#713b61', '#efa8bd', '#fbeef4', 'M16 12c-5-8 7-12 7-4 0 2-2 4-4 6 9-2 11 9 4 9-2 0-4-2-6-4 3 10-8 12-9 5 0-3 2-5 5-7-9 4-13-7-6-9 3 0 6 2 9 4Z'],
 firefly: ['#145660', '#b5db78', '#ecf6f2', 'M7 27c0-8 17-4 17-12 0-4-6-5-6 0m-8-4 1-4m-4 2 5 1m12-3 1-4m-4 2 6 1'],
 'studio-snowday': ['#26577f', '#89d0ee', '#edf7fb', 'M2 26 12 9l5 9 5-13 8 21H2Zm7-12 3 4 3-4m4-2 3 4 3-4'],
 'studio-boardwalk': ['#8c3652', '#f3c961', '#fff3d9', 'M2 20c4-5 7 5 12 0s8 5 16 0M2 26c4-5 7 5 12 0s8 5 16 0M11 15a6 6 0 0 1 12 0'],
 'studio-monsoon': ['#2a5556', '#9ad2bd', '#eaf5ee', 'M4 15a12 12 0 0 1 24 0H4Zm12 0v11a3 3 0 0 0 6 0M7 20l-2 4m22-4-2 4'],
 'studio-lunar': ['#812f44', '#f2b765', '#fcf0df', 'M12 6h8m-8 19h8m-4-2v7M8 15c0-5 3-7 8-7s8 2 8 7-3 8-8 8-8-3-8-8Zm8-7c-5 4-5 11 0 15m0-15c5 4 5 11 0 15'],
 'studio-valentine': ['#8b3159', '#e9a0b5', '#fcecf2', 'M3 9h26v17H3V9Zm0 0 13 10L29 9m-26 17 9-10m17 10-9-10'],
 'studio-newyear': ['#493758', '#e6b96d', '#f9f0e3', 'M16 2v28M2 16h28M6 6l20 20M6 26 26 6M16 8l8 8-8 8-8-8Z'],
 'studio-notebook': ['#245675', '#dfbc73', '#faf4e3', 'M7 4h19v24H7zM11 4v24m4-17h7m-7 5h7m-7 5h7M4 8h5M4 15h5M4 22h5'],
 'studio-science': ['#28575a', '#a1dbbf', '#eaf4ee', 'M2 16c0-8 28-8 28 0s-28 8-28 0Zm14-14c8 0 8 28 0 28s-8-28 0-28Zm0 13v2']
}

export function exportTheme(value) {
 const id = safeTheme(value)
 const [accent, glow, wash, mark] = styles[id]
 return {id, name: THEMES.find(theme => theme.id === id).name, accent, glow, wash, mark}
}
