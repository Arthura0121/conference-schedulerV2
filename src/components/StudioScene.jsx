import '../styles/studio.css'

const points = Array.from({length:24}, (_, i) => ({
 '--x':(i * 37 + 3) % 100 + '%',
 '--y':(i * 23 + 8) % 88 + '%',
 '--d':-(i * 7 % 19) + 's',
 '--t':(9 + i * 13 % 11) + 's',
 '--size':(.55 + i * 17 % 9 / 12)
}))

function SnowDay() {
 return <>
  <svg className="studio-ground" viewBox="0 0 1000 280" preserveAspectRatio="none">
   <path fill="#9abacb" d="m0 153 150-106 74 65 112-91 132 113 133-104 102 96 113-78 184 109v123H0Z"/>
   <path fill="#f4fbfd" d="m112 73 38-26 49 43-37-13-19 5Zm170-6 54-46 59 51-52-15-29 10Zm279-5 40-32 38 37-39-13Zm217 11 38-25 47 28-46-13Z"/>
   <path fill="#ddeaf0" d="M0 194Q206 99 395 178T782 176t218-13v117H0Z"/>
   <path fill="#fbfcf7" d="M0 235q209-101 422-10t578-23v78H0Z"/>
   <path d="M8 258q183-63 330-26m-305 36q143-47 237-34m383 25q126 10 278-37" stroke="#9bbaca" fill="none" opacity=".7"/>
  </svg>
  <svg className="studio-prop studio-left studio-sled" viewBox="0 0 225 146">
   <path d="M16 119q54 12 146-4t47-38m-174 43 8-37m93 35 6-43m24 39 6-48" fill="none" stroke="#3f667f" strokeWidth="6" strokeLinecap="round"/>
   <path d="m30 82 148-28 10 22L40 105Z" fill="#cf604e" stroke="#943c3e" strokeWidth="3"/>
   <path d="m44 86 127-25m-124 33 128-25" stroke="#f1af83" strokeWidth="2"/>
   <path d="M182 61q21-27 33-1" fill="none" stroke="#9a704f" strokeWidth="3"/>
   <path d="M67 77V53m20 20V48m24 19V42m19 21V39m18 19V35" stroke="#35546b" strokeWidth="4"/>
   <path d="m64 54 86-20" stroke="#7d9bb0" strokeWidth="7" strokeLinecap="round"/>
  </svg>
  <div className="studio-disc"/>
 </>
}

function Boardwalk() {
 return <>
  <svg className="studio-ground" viewBox="0 0 1000 280" preserveAspectRatio="none">
   <path fill="#42bdb7" d="M0 83q92-36 178 0t202 0 204 0 210 1 206 0v196H0Z"/>
   <path className="studio-surf" fill="#79d9c8" d="M-90 131q108-25 207 0t192 4 183-1 199 5 198-1 201-7v149H-90Z"/>
   <path fill="#fff6d6" d="M0 191q100-15 209 0t231-3 224 2 336-9v16q-153 16-336 10t-224 1-231 3T0 211Z"/>
   <path fill="#f4c37a" d="M0 211q105-15 209 0t231-3 224 2 336-13v83H0Z"/>
  </svg>
  <svg className="studio-prop studio-right studio-wheel" viewBox="0 0 224 240">
   <path d="m64 215 47-107 48 107" fill="none" stroke="#365785" strokeWidth="8"/>
   <g className="studio-wheel-spin" stroke="#274d77" strokeWidth="3">
    <circle cx="112" cy="103" r="75" fill="#ffe994b0"/>
    {[0,45,90,135,180,225,270,315].map((angle,i)=><g key={angle} transform={`rotate(${angle} 112 103)`}>
     <path d="M112 103V27" fill="none"/><rect x="101" y="21" width="22" height="17" rx="5" fill={i%2?'#50c4c4':'#fb786d'}/>
    </g>)}
    <circle cx="112" cy="103" r="14" fill="#fb786d"/>
   </g>
   <path d="M38 216h150" stroke="#335781" strokeWidth="7" strokeLinecap="round"/>
  </svg>
  <div className="studio-disc studio-pop-sun"/>
 </>
}

function Monsoon() {
 return <>
  <svg className="studio-ground" viewBox="0 0 1000 280" preserveAspectRatio="none">
   <path fill="#608984" d="M0 146q142-96 268-13t239 0q202-73 493-15v162H0Z"/>
   <path fill="#3a6765" d="M0 190q155-63 322-7t373-4 305-3v104H0Z"/>
   <path fill="#21494d" d="M0 225q160-23 336-4t308 0 356-5v64H0Z"/>
   <g className="studio-pond" fill="none" stroke="#8ac2b6" strokeWidth="2">
    <ellipse cx="180" cy="244" rx="55" ry="9"/><ellipse cx="710" cy="249" rx="91" ry="12"/><ellipse cx="710" cy="249" rx="71" ry="8"/>
   </g>
  </svg>
  <svg className="studio-prop studio-right studio-greenhouse" viewBox="0 0 248 202">
   <path d="M22 185V89l44-63h111l49 63v96Z" fill="#97bcb28c" stroke="#c2dfc5" strokeWidth="4"/>
   <path d="M22 89h204M66 26l9 63v96m102-159-8 63v96m-47-159v159M22 133h204" fill="none" stroke="#bddac3" strokeWidth="2"/>
   <path d="M111 185v-57h29v57" fill="#5a857a" stroke="#c2dfc5" strokeWidth="2"/>
   <path d="M36 170q14-36 26-22-2 10-26 22m32 6q-25-22-4-30 14 12 4 30m115 5q-14-31 4-36 12 19-4 36m9-1q15-40 25-24-2 16-25 24" fill="#3f7862"/>
   <path d="M9 188h231" stroke="#213f46" strokeWidth="8" strokeLinecap="round"/>
  </svg>
 </>
}

function Lanterns() {
 return <>
  <svg className="studio-ground" viewBox="0 0 1000 280" preserveAspectRatio="none">
   <path d="M0 226h82v-49l47-19h83l43 19v33h109v-41l53-21h107l54 21v40h102v-46l51-20h118l48 20v63h103v54H0Z" fill="#541f31"/>
   <path d="m65 180 62-24h87l58 24m72-8 69-25h112l70 25m67-6 69-25h119l67 25" fill="none" stroke="#daa15c" strokeWidth="3"/>
   <path d="M116 186h15v24h-15m71-24h15v24h-15m225-31h13v25h-13m91-25h13v25h-13m227-28h16v22h-16m62-22h16v22h-16" fill="#ffd58c"/>
   <path d="M0 241q147-24 303 3t321 1 376 2v33H0Z" fill="#3b1726"/>
  </svg>
  <svg className="studio-prop studio-left studio-lanterns" viewBox="0 0 236 241">
   {[[30,5,1],[103,46,.78],[162,14,.68]].map(([x,y,scale],i)=><g key={x} transform={`translate(${x} ${y}) scale(${scale})`}>
    <g className="studio-lantern-sway" style={{'--phase':-i*1.1+'s'}}>
     <path d="M39 0v34m0 115v29m-6-11v23m12-23v20" stroke="#f3c36e" strokeWidth="3"/>
     <ellipse cx="39" cy="91" rx="38" ry="54" fill="#d43e44" stroke="#f6b46c" strokeWidth="3"/>
     <path d="M39 38c-25 0-25 108 0 108m0-108c25 0 25 108 0 108m0-108v108" stroke="#ff9e66" opacity=".75" fill="none"/>
     <path d="M20 40h38m-38 102h38" stroke="#ffcb78" strokeWidth="5" strokeLinecap="round"/>
     <path d="m39 73 13 18-13 19-13-19Z" fill="#ffd689"/>
    </g>
   </g>)}
  </svg>
  <div className="studio-disc"/>
 </>
}

function Valentine() {
 return <>
  <svg className="studio-ground" viewBox="0 0 1000 280" preserveAspectRatio="none">
   <path fill="#ec9eb4" d="M0 150q127 71 258 0t257 0 260 0 225 0v130H0Z"/>
   <path fill="#f6bdca" d="M0 179q127 71 258 0t257 0 260 0 225 0v101H0Z"/>
   <path fill="#ffe5e5" d="M0 214q127 51 258 0t257 0 260 0 225 0v66H0Z"/>
  </svg>
  <svg className="studio-prop studio-right studio-envelope" viewBox="0 0 239 204">
   <g transform="rotate(-9 119 105)">
    <path d="M17 92 118 14l103 78v88H17Z" fill="#e383a1" stroke="#9e4c68" strokeWidth="3"/>
    <rect x="43" y="36" width="150" height="107" rx="6" fill="#fff3e9" stroke="#d995a7" strokeWidth="2"/>
    <path d="M61 59h63m-63 14h81m-81 14h56" stroke="#d59bac" strokeWidth="3" strokeLinecap="round"/>
    <path d="M17 92 118 150 221 92v88H17Z" fill="#f0a9bd" stroke="#9e4c68" strokeWidth="3"/>
    <path d="M17 180 94 134m127 46-75-46" fill="none" stroke="#b66681" strokeWidth="2"/>
    <path d="M118 158c-27-16-13-34 0-21 13-13 26 5 0 21Z" fill="#ab365e"/>
    <path d="M168 49h12v12h-12Z" fill="#e7a4b8"/>
   </g>
  </svg>
 </>
}

function Countdown() {
 return <>
  <svg className="studio-ground studio-deco" viewBox="0 0 1000 280" preserveAspectRatio="none">
   <path fill="#171b31" stroke="#b68e5e" strokeWidth="2" d="M0 250h66v-71h16v-15h32v15h17v69h66v-100h12v-25h38v25h16v86h77v-54h78v64h62V92h15V70h31V92h16v152h86v-61h18v-16h37v16h19v49h69v-86h19v-19h44v19h18v95h73v-41h27v-15h36v15h33v80H0Z"/>
   <path d="M494 118v78m12-78v78m13-78v78m258-25v42m11-42v42m14-42v42M218 170v39m14-39v39m14-39v39" stroke="#f8d999" opacity=".55"/>
   <path d="M0 259h1000M0 269h1000" stroke="#a1784d"/>
  </svg>
  <svg className="studio-prop studio-right studio-countdown" viewBox="0 0 170 267">
   <path d="M83 7v233M66 238h37m-57 18h78" fill="none" stroke="#b49364" strokeWidth="4" strokeLinecap="round"/>
   <g className="studio-ball-drop">
    <path d="m84 28 28 11 12 29-12 28-28 12-29-12-12-28 12-29Z" fill="#e1b978" stroke="#fff0b2" strokeWidth="2"/>
    <path d="m84 28-15 20 15 20 15-20Zm-41 40 26-20 15 20-15 19Zm81 0L99 48 84 68l15 19ZM84 108 69 87l15-19 15 19Z" fill="#fff1af" opacity=".85"/>
   </g>
  </svg>
 </>
}

function Notebook() {
 return <>
  <div className="studio-notebook-margin"/>
  <svg className="studio-prop studio-right studio-books" viewBox="0 0 242 206">
   <path d="m23 149 162-27 43 27-160 32Z" fill="#e3a761" stroke="#345372" strokeWidth="3"/>
   <path d="M23 149v24l45 21 160-32v-13L68 181Z" fill="#fff5dc" stroke="#345372" strokeWidth="3"/>
   <path d="M68 181v13m4-9 140-28" stroke="#9f987e" strokeWidth="2"/>
   <path d="m29 120 153-29 38 22-155 32Z" fill="#72aba1" stroke="#345372" strokeWidth="3"/>
   <path d="M29 120v24l37 17 154-30v-18L65 145Z" fill="#fcf4dc" stroke="#345372" strokeWidth="3"/>
   <path d="m58 85 123-30 30 21-124 30Z" fill="#f4d28e" stroke="#345372" strokeWidth="3"/>
   <path d="M58 85v22l29 14 124-28V76L87 106Z" fill="#fff5dc" stroke="#345372" strokeWidth="3"/>
   <path d="m91 81 80-19m-68 25 59-14" stroke="#735a48" strokeWidth="2"/>
  </svg>
  <svg className="studio-prop studio-paper-plane" viewBox="0 0 150 102">
   <path d="m10 52 126-39-41 79-25-28-19 17 1-24Z" fill="#fffdf0" stroke="#386486" strokeWidth="3" strokeLinejoin="round"/>
   <path d="M136 13 52 57m84-44L70 64l-19 17" fill="none" stroke="#386486" strokeWidth="3"/>
   <path d="m6 74 17-8M17 93l21-9" stroke="#658ba2" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5"/>
  </svg>
 </>
}

function Science() {
 return <>
  <svg className="studio-ground studio-signal" viewBox="0 0 1000 280" preserveAspectRatio="none">
   <path d="M0 209h180l15-21 19 45 18-65 21 40h107l21-19 23 29 23-66 23 62h109l33-27 29 43 27-67 28 48h100l29-27 21 42 27-58 22 43h96" fill="none" stroke="#a6f6cf" strokeWidth="3"/>
   <path d="M0 238h205l27-17 20 20h123l23-21 25 34 24-17h553" fill="none" stroke="#bd99e7" strokeWidth="2" opacity=".56"/>
  </svg>
  <svg className="studio-prop studio-right studio-atom" viewBox="0 0 239 222">
   <g className="studio-atom-spin" fill="none" stroke="#b5f6dd" strokeWidth="2.4">
    {[0,60,120].map(angle=><ellipse key={angle} cx="120" cy="111" rx="98" ry="40" transform={`rotate(${angle} 120 111)`}/>)}
    <g fill="#d7b3f7" stroke="#e4f8dc"><circle cx="23" cy="112" r="6"/><circle cx="73" cy="27" r="6"/><circle cx="164" cy="195" r="6"/></g>
   </g>
   <circle cx="120" cy="111" r="13" fill="#ffd397"/><circle cx="116" cy="107" r="3" fill="#fff4d4"/>
  </svg>
 </>
}

const scenes = {
 'studio-snowday':SnowDay, 'studio-boardwalk':Boardwalk, 'studio-monsoon':Monsoon, 'studio-lunar':Lanterns,
 'studio-valentine':Valentine, 'studio-newyear':Countdown, 'studio-notebook':Notebook, 'studio-science':Science
}

export default function StudioScene({theme, className}) {
 const Art = scenes[theme]
 return <div className={`theme-scene studio-scene ${className}`} data-theme={theme} aria-hidden="true">
  <Art/>
  <div className="studio-motes">{points.map((style,i)=><i key={i} style={style}/>)}</div>
 </div>
}
