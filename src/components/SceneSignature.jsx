/* Small illustrated details for the open edges of each world. All paths are local. */
const signatures = {
 aurora:['#9cf2dc','M12 74Q64 21 151 36M23 86Q94 44 164 52M55 53l-10-12m25 1 9-19m41 18 13-16','M98 36l15 9-16 9 4-9Z'],
 fall:['#ffd184','M2 77Q54 42 122 58t46-26M23 88q65-19 132-7m-20-40 15-10m-57 7 8-15','M95 51l-5-12-8 2 2-8-8-6 12-1 7-10 6 10 12 2-8 6 3 9-8-2Z'],
 halloween:['#dce98d','M9 26h29m-22 9h14m109 41h29m-13 9h18m-29-65 9 14 15 7-14 9-7 15-10-14-16-6 14-10Z','M91 13 58 54h22L66 91l47-49H91l17-29Z'],
 thanksgiving:['#ffca83','M19 79Q75 57 153 73M32 65q40-32 99-34m-68 32Q52 41 47 22m38 37q2-23 17-42m8 49 25-38','M47 22Q31 20 33 5q14 1 14 17m55-5q0-15 13-17 3 12-13 17m33 11q3-13 18-15-3 12-18 15'],
 winter:['#d7f4ff','M28 10v58m-20-45 40 31m-40 0 40-31m-20 3-8-7m8 7 8-7m-8 36-8 7m8-7 8 7m58-54v83m-26-60 52 40m-52 0 52-40m-26 8-12-12m12 12 12-12','M144 36l5 12 13 4-13 4-5 13-5-13-12-4 12-4Z'],
 blossom:['#b85e86','M9 74Q41 39 104 49t65-27M17 89q61-22 114-9m-66-46 16-11m37 15 16-14','M48 63c-21-2-22-17-4-17 14-1 17 10 4 17m61-19c-18-6-15-19 2-17 14 2 13 12-2 17m41 25c-18 4-23-9-8-15 14-5 20 4 8 15'],
 firefly:['#e1f4a4','M6 67q30-40 67-17t48-3 49-26M10 88q35-24 67-10t60-9','M25 48h6v6h-6Zm39-3h5v5h-5Zm49 9h6v6h-6Zm41-25h7v7h-7Z'],
 'studio-snowday':['#5086a2','M13 73Q61 40 108 54t61-16M21 86q65-20 131-6m-22-48 10-11m-37 17 4-18','M59 14l5 11 11 4-11 4-5 11-4-11-12-4 12-4Z'],
 'studio-boardwalk':['#286f85','M8 75q31-12 57 0t51 0 52 0M15 88q29-8 54 0t53 0 40 0M75 17v47m0-45 39 37H78','M64 64h66l-16 13H77Z'],
 'studio-monsoon':['#c6ebdd','M18 28 9 45m34-24L29 50m121-22-13 23m28-8-14 22M83 17v10m-52 29q10-37 52-30 38 4 55 30-22-10-37 0-17-10-33 0-19-10-37 0Zm52 1v31q0 12 9 12t8-9','M155 83q12 18 0 18t0-18Z'],
 'studio-lunar':['#ffda91','M13 33q71-25 149 1M36 27v17m47-26v20m45-13v19m-92 22v16m47-19v21m45-18v16','M36 39q-24 14 0 30 24-16 0-30m47-4q-27 17 0 36 27-19 0-36m45 4q-24 14 0 30 24-16 0-30'],
 'studio-valentine':['#b54c73','M18 32h64v46H18Zm0 0 32 27 32-27m28 8q36-13 55 4m-48 18q30-11 49 5m-44 16q24-8 43 4','M50 60c-22-16-8-30 0-18 8-12 22 2 0 18Z'],
 'studio-newyear':['#f8d68b','M89 10v24m0 45v25M33 56h31m53 0h31M47 22l20 19m43 36 20 18m0-73-20 19M66 77 47 94M20 27h15m106 56h21','M89 32 100 47 116 56 100 66 89 81 79 66 62 56 79 47Z'],
 'studio-notebook':['#356989','M13 76q51-20 104-14m-93 23q64-14 141-8M63 52l64-35 13 8-64 36-18 1Z','M127 17l9-5 12 7-8 6Zm-64 35 13 9-18 1Z'],
 'studio-science':['#befce6','M9 76h42l10-14 10 22 13-41 13 32h30l13-23 12 24h18M18 24h30m-30 9h18m101-13h29m-22 10h22','M92 19h6v6h-6Zm-5 12h15v5H87Z']
}

export default function SceneSignature({theme}) {
 const [ink,line,solid] = signatures[theme]
 return <svg className="scene-signature" viewBox="0 0 180 110" aria-hidden="true" style={{color:ink}}>
  <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <path d={solid} fill="currentColor" opacity=".73"/>
 </svg>
}
