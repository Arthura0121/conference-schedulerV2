import '../styles/worlds.css'

const terrain = {
 aurora:['#274e73','#162f58','#0d2339','#82f7e2'],
 fall:['#985848','#65463e','#373a31','#efc67c'],
 halloween:['#543363','#382545','#25192f','#b47cd2'],
 winter:['#528498','#315a72','#203e55','#d4f6f2'],
 blossom:['#a7658c','#754469','#3d2c4e','#ffbad6'],
 firefly:['#295760','#1d4951','#16343d','#cbe981']
}

function Ridges({theme}) {
 const [far,near,base,edge]=terrain[theme]
 return <svg className="world-ridges" viewBox="0 0 1200 240" preserveAspectRatio="none">
  {theme==='aurora' || theme==='winter' ? <>
   <path d="M0 146 149 51 225 102 371 30 492 123 603 72 686 121 803 42 884 103 985 32 1094 109 1200 59V240H0Z" fill={far}/>
   <path d="m133 61 16-10 76 51-75-27-12 8-26 4m214-34 45-23 88 69-88-48-17 18-24 1m428 4 45-32 81 61-77-39-20 17-33 1m205-29 22-21 56 40-57-21-16 12" fill={edge} opacity=".48"/>
   <path d="M0 165 173 105 305 165 458 96 583 161 727 113 906 177 1020 103 1200 158V240H0Z" fill={near}/>
  </>:<>
   <path d="M0 113Q165 42 313 115T607 125Q778 31 933 98T1200 80V240H0Z" fill={far}/>
   <path d="M0 145Q158 96 310 152T640 166Q791 105 953 143T1200 114V240H0Z" fill={near}/>
  </>}
  <path d="M0 184Q142 143 293 189T607 197T916 175T1200 177V240H0Z" fill={base}/>
  <g className="world-water" fill="none" stroke={edge} strokeWidth="1.4" strokeLinecap="round">
   <path d="M16 214q47-11 104-3m38 9q39-7 86 1m94-14q63 14 147 3m198 9q84-6 141-20m45 1q72-12 157 5m63 11 68-6" opacity=".42"/>
   <path d="M4 230q141-14 249 3m273-8 109-4m276 3q122-6 258 4" opacity=".23"/>
  </g>
 </svg>
}

function Observatory() {
 return <svg className="world-figure world-left world-observatory" viewBox="0 0 220 176">
  <path d="M7 155q47-27 101-24t107 27v17H7Z" fill="#102333"/>
  <path d="M46 145h128v15H46Z" fill="#253c59" stroke="#6188aa" strokeWidth="2"/>
  <path d="M61 144V91h98v53" fill="#243d58" stroke="#6795b6" strokeWidth="2"/>
  <path d="M61 91a49 48 0 0 1 98 0Z" fill="#365a78" stroke="#a5d8db" strokeWidth="2"/>
  <path d="M84 89q6-42 26-44 20 3 26 44" fill="none" stroke="#a7dce1" opacity=".65"/>
  <path d="M117 43l18-30 11 6-16 27" fill="#8daec5" stroke="#162d43" strokeWidth="3"/>
  <path d="m136 14 35-13-25 20" fill="#99f0e4" opacity=".32" className="world-beacon"/>
  <path d="M74 105h12v22H74m56-22h12v22h-12m-29 18v-29h18v29" fill="#b4f6e8"/>
  <path d="M61 99h98m-98 34h98" stroke="#718fa7" strokeWidth="2"/>
  <path d="M25 147V99m-13 30 13-29 13 29Zm168 14v-41m-11 25 11-24 11 24Z" stroke="#102333" fill="#25475a" strokeWidth="3"/>
 </svg>
}

function Balloon() {
 return <svg className="world-figure world-balloon" viewBox="0 0 160 191">
  <path d="M80 6C23 6 10 51 24 79c11 22 34 31 45 53h22c10-23 34-33 45-55C148 48 135 6 80 6Z" fill="#d78d56" stroke="#6e4437" strokeWidth="2"/>
  <path d="M80 6c-31 0-40 37-30 73 4 18 16 30 23 53h14c8-24 21-35 25-55 8-34-2-71-32-71Z" fill="#f7c57d"/>
  <path d="M80 6c-11 16-14 44-8 73l6 53h5l5-53c6-30 3-56-8-73Z" fill="#a75d50"/>
  <path d="M24 74q56 23 112 0" fill="none" stroke="#ffe3ae" strokeWidth="4" opacity=".75"/>
  <path d="m69 132 5 28m17-28-5 28" stroke="#46362d" strokeWidth="2"/>
  <path d="M69 155h22l-3 18H72Z" fill="#644e3b" stroke="#f4c483" strokeWidth="2"/>
 </svg>
}

function Manor() {
 return <svg className="world-figure world-right world-manor" viewBox="0 0 270 225">
  <path d="M8 204q69-29 127-16 70-12 130 17v20H8Z" fill="#171525"/>
  <g fill="#2f2141" stroke="#92639c" strokeWidth="2">
   <path d="M68 199V83h39v116Zm97 0V64h36v135Zm-53 0V105h53v94Z"/>
   <path d="M58 85 89 31l28 54Zm98-19 27-59 27 59Zm-55 43 35-42 40 42Z" fill="#231930"/>
   <path d="M114 198v-30a21 21 0 0 1 42 0v30Z" fill="#423050"/>
  </g>
  <g className="world-windows" fill="#f5cc78">
   <path d="M79 108a7 7 0 0 1 14 0v17H79Zm0 44a7 7 0 0 1 14 0v17H79Zm96-65a7 7 0 0 1 14 0v17h-14Zm0 40a7 7 0 0 1 14 0v17h-14Z"/>
   <circle cx="137" cy="118" r="7" fill="#cfa7ef"/>
  </g>
  <path d="M33 203q11-46 7-84m0 44-19-19m20 26 19-26m166 57-4-80m3 57 24-35m-27 19-17-22" fill="none" stroke="#21172a" strokeWidth="6" strokeLinecap="round"/>
  <path d="m130 202 11-1 22 23h-41Z" fill="#99617f" opacity=".55"/>
 </svg>
}

function SnowLantern() {
 return <svg className="world-figure world-right world-snow-lantern" viewBox="0 0 210 190">
  <path d="M6 175q92-26 196 0" fill="none" stroke="#c8e9ee" strokeWidth="8" strokeLinecap="round"/>
  <path d="M63 171V28q0-13 14-13h69m-17 0v24" fill="none" stroke="#527d93" strokeWidth="6" strokeLinecap="round"/>
  <g className="world-windows">
   <path d="M93 49h71l-9 66h-53Z" fill="#edce90" stroke="#587187" strokeWidth="4"/>
   <path d="M104 51l10 62m36-62-10 62" stroke="#77616c" strokeWidth="4"/>
   <path d="M89 52l21-19h38l20 19Zm12 59h55l7 11H94Z" fill="#53697c" stroke="#a1ccd3" strokeWidth="3"/>
   <path d="M128 99c-14-7-7-17 0-30 11 12 15 24 0 30Z" fill="#fff6cb"/>
  </g>
  <path d="M22 163 36 124l13 38m106-1 14-54 18 53" fill="none" stroke="#acd2e0" strokeWidth="5" strokeLinecap="round"/>
 </svg>
}

const blooms = [[34,90],[47,78],[61,66],[76,64],[91,47],[118,55],[126,37],[145,33],[168,19],[181,34],[195,13],[79,98],[109,83],[139,74],[155,67],[197,56]]
function BlossomBranch() {
 return <svg className="world-figure world-branch" viewBox="0 0 222 129">
  <path d="M-12 119Q51 114 91 68t122-53M55 102Q93 99 155 66t59-6M76 83Q76 62 55 48m68 5 20-30" fill="none" stroke="#482e47" strokeWidth="6" strokeLinecap="round"/>
  {blooms.map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) scale(${i%3===0?1:.73})`}>
   <path d="M0-9Q7-13 8-4Q15-3 10 3Q11 11 3 10Q-4 16-7 7Q-16 6-11-1Q-12-9-4-7Z" fill={i%3===0?'#f4abc6':'#d985ac'} stroke="#774767"/>
   <circle r="2.1" fill="#ffe4b9"/>
  </g>)}
 </svg>
}

function Bridge() {
 return <svg className="world-figure world-left world-bridge" viewBox="0 0 252 157">
  <path d="M12 139q84-13 111-7t112 7" fill="none" stroke="#efa9be" opacity=".47" strokeWidth="2"/>
  <path d="M16 117q100-113 220 0v14Q119 41 16 131Z" fill="#734568" stroke="#c585ac" strokeWidth="2"/>
  <path d="M16 111q105-108 220 0M24 105V86m38-11V58m39-3V37m48 19V38m41 36V56m37 46V84M23 86q103-98 204-2" fill="none" stroke="#d39abc" strokeWidth="4" strokeLinecap="round"/>
  <path d="M42 141q39-3 74 0m18 9q32-6 70-5" stroke="#ecb2c4" opacity=".42" fill="none"/>
 </svg>
}

function Lighthouse() {
 return <svg className="world-figure world-right world-lighthouse" viewBox="0 0 248 220">
  <path d="M4 206 50 172l48 2 29-20 46 21 38 3 32 27v15H4Z" fill="#1c3d43" stroke="#4e7e71" strokeWidth="2"/>
  <path className="world-beacon" d="M131 54 4 29 4 83Z" fill="#e7f4a1" opacity=".42"/>
  <path d="m108 182 8-110h34l9 110Z" fill="#b5c1a3" stroke="#264c50" strokeWidth="3"/>
  <path d="m115 84 37 18 2 26-41-20Zm-4 54 45 21 2 22-49-19Z" fill="#74926d"/>
  <path d="M114 48h39v28h-39Z" fill="#e9ed97" stroke="#43696a" strokeWidth="4"/>
  <path d="M107 48 133 21l26 27Zm-2 26h58v9h-58Z" fill="#365b5c" stroke="#77a790" strokeWidth="3"/>
  <path d="M132 48v28m-6 106v-20a8 8 0 0 1 16 0v20" fill="none" stroke="#43696a" strokeWidth="3"/>
  <path d="M18 202q42-11 78-1m62 4 64-8" fill="none" stroke="#9ccb93" strokeWidth="2" opacity=".65"/>
 </svg>
}

export default function WorldScenery({theme}) {
 return <div className={'world-scenery world-scenery-'+theme} aria-hidden="true">
  <Ridges theme={theme}/>
  {theme==='aurora' && <><div className="world-orb"/><Observatory/></>}
  {theme==='fall' && <Balloon/>}
  {theme==='halloween' && <><Manor/><div className="world-mist"/></>}
  {theme==='winter' && <SnowLantern/>}
  {theme==='blossom' && <><div className="world-orb"/><BlossomBranch/><Bridge/></>}
  {theme==='firefly' && <><div className="world-orb"/><Lighthouse/></>}
 </div>
}

const motes = Array.from({length:30},(_,i)=>({
 '--left':(i*37+3)%99+'%',
 '--top':(i*29+12)%79+12+'%',
 '--delay':-(i*17%31)+'s',
 '--travel':(i%2?1:-1)*(32+i*11%60)+'px',
 '--speed':(13+i*13%11)+'s',
 '--size':(.45+i*5%11/12)
}))

export function NewWorldScene({theme,className}) {
 return <div className={`theme-scene theme-scene-${theme} ${className}`} aria-hidden="true">
  <WorldScenery theme={theme}/>
  <div className="world-motes">{motes.map((style,i)=><i key={i} style={style}/>)}</div>
 </div>
}
