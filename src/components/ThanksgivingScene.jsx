import {useId} from 'react'
import '../styles/thanksgiving.css'

const leafColors = ['#f6ba59', '#e27b42', '#ca4662', '#eaa46c']
const feathers = ['#aa3b52', '#cf5045', '#e37c42', '#edaa58', '#e9b760', '#e37c42', '#cf5045', '#aa3b52']
const leaves = Array.from({length:28}, (_, i) => ({
  '--x': (i * 37 + 5) % 100 + '%',
  '--delay': -(i * 7 % 23) + 's',
  '--duration': 14 + i * 11 % 10 + 's',
  '--drift': (i % 2 ? 1 : -1) * (36 + i * 13 % 96) + 'px',
  '--scale': .45 + i * 17 % 11 / 12,
  color: leafColors[i % leafColors.length]
}))

function Turkey() {
  return <svg className="harvest-turkey" viewBox="0 0 250 204">
    <ellipse cx="127" cy="190" rx="111" ry="12" fill="#1b1019" opacity=".7"/>
    <g className="harvest-fan">
      {feathers.map((color, i) => <g key={i} transform={`rotate(${(i - 3.5) * 21} 125 141)`}>
        <path d="M125 145C103 123 99 59 107 34Q125 3 143 34C151 61 147 123 125 145Z" fill={color} stroke="#602c3b" strokeWidth="2"/>
        <path d="M125 125V33M125 79l-12-15m12 29 11-17" fill="none" stroke="#fff1c7" strokeWidth="1.4" opacity=".48" strokeLinecap="round"/>
        <path d="M108 49Q125 35 142 49M108 58Q125 45 142 58" fill="none" stroke="#ffe1a6" strokeWidth="2" opacity=".65"/>
      </g>)}
    </g>
    <path d="m115 167-4 19m24-19 4 19m-37 1h18m12 0h16" fill="none" stroke="#f4b65f" strokeWidth="4" strokeLinecap="round"/>
    <path d="M87 150c0-28 21-43 48-39 21 3 36 14 36 34 0 22-20 32-43 32-26 0-41-10-41-27Z" fill="#613344" stroke="#a35b50" strokeWidth="2"/>
    <path d="M101 144c11-16 35-20 47-5-4 17-18 24-34 18Z" fill="#a65b50"/>
    <path d="M105 147q19 8 34-6m-28 12q11 5 22-3" fill="none" stroke="#e8a077" opacity=".62" strokeLinecap="round"/>
    <g className="harvest-turkey-head">
      <path d="M147 144c-11-12-9-33-5-49 4-16 25-21 35-9 8 10 2 26-11 30l-1 23c-5 8-12 9-18 5Z" fill="#944652"/>
      <path d="M177 97l16 7-17 7Z" fill="#ffcb73"/>
      <path d="M175 106c9 3 7 16 1 17-5 1-7-7-5-12Z" fill="#d14d55"/>
      <circle cx="170" cy="95" r="3" fill="#201018"/>
      <circle cx="171" cy="94" r="1" fill="#fff6dc"/>
    </g>
  </svg>
}

function HarvestStand() {
  return <svg className="harvest-stand" viewBox="0 0 255 225">
    <ellipse cx="132" cy="211" rx="113" ry="12" fill="#1b1019" opacity=".7"/>
    <g className="harvest-wheat" fill="#efbc6c" stroke="#efbc6c" strokeWidth="1.6" strokeLinecap="round">
      {[44, 69, 92].map((x, i) => <g key={x} transform={`translate(${x} ${i === 1 ? 29 : 53}) rotate(${(i - 1) * 17})`}>
        <path d="M0 137Q5 70 0 1" fill="none"/>
        {[16, 29, 42, 55].map(y => <g key={y}><path d={`M0 ${y}q-13-4-13-14Q-2 ${y - 12} 0 ${y}Z`}/><path d={`M1 ${y + 4}q12-3 14-13Q4 ${y - 9} 1 ${y + 4}Z`}/></g>)}
      </g>)}
    </g>
    <g transform="translate(162 15)">
      <path d="M0 175V23q0-15 12-15h32" fill="none" stroke="#59323b" strokeWidth="7" strokeLinecap="round"/>
      <path d="M0 175V23q0-15 12-15h32" fill="none" stroke="#b77b61" strokeWidth="1.4" opacity=".65"/>
      <g className="harvest-lantern">
        <circle className="harvest-lantern-glow" cx="43" cy="60" r="49" fill="var(--harvest-lantern-glow)"/>
        <path d="M43 8v15m-6 5a6 6 0 1 1 12 0" fill="none" stroke="#e6a970" strokeWidth="2"/>
        <path d="M26 41l8 42h19l8-42Z" fill="#faad58" stroke="#703b39" strokeWidth="2"/>
        <path d="M30 42l9 39m17-39-9 39" stroke="#753f39" strokeWidth="1.7"/>
        <path className="harvest-flame" d="M43 74c-9-4-3-11 0-18 6 7 8 15 0 18Z" fill="#fff2bc"/>
        <path d="M22 43l11-13h20l12 13Zm9 39h25l3 6H28Z" fill="#6e3939" stroke="#d39262" strokeWidth="1.4"/>
      </g>
    </g>
    <path d="M92 146c-9-16-4-23 8-26l6 7c-8 3-12 9-8 19Z" fill="#a1a46a"/>
    <path d="M93 145c-30-19-64 4-62 29 2 25 23 36 62 36 36 0 58-13 58-37 0-25-32-46-58-28Z" fill="#c35a43" stroke="#7e353d" strokeWidth="2"/>
    <path d="M94 145c-34-17-49 10-46 32 2 20 18 33 46 33s43-13 44-34c2-23-15-48-44-31Z" fill="#e57d4a" stroke="#ae4d41" strokeWidth="2"/>
    <path d="M94 146c-18-12-29 7-29 29 0 20 11 35 29 35s29-15 29-35c0-22-13-41-29-29Z" fill="#f49a5b" stroke="#c35a43" strokeWidth="2"/>
    <path d="M175 172q-6-11 3-17l5 3-3 14" fill="#a1a46a"/>
    <path d="M177 171c-17-10-38 0-36 17s16 22 36 22 37-7 36-22-20-26-36-17Z" fill="#d7ac64" stroke="#9d6951" strokeWidth="2"/>
    <ellipse cx="177" cy="188" rx="17" ry="21" fill="#f6ce85" stroke="#c08d57" strokeWidth="1.5"/>
  </svg>
}

export default function ThanksgivingScene({className}) {
  const glow = useId()
  return <div className={'theme-scene theme-scene-thanksgiving '+className} aria-hidden="true">
    <div className="harvest-moon"/>
    <div className="harvest-cloud harvest-cloud-near"/><div className="harvest-cloud harvest-cloud-far"/>
    <svg className="harvest-geese" viewBox="0 0 170 67" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      {[[0, 43], [26, 34], [46, 45], [57, 21], [82, 33], [93, 9], [122, 18]].map(([x, y], i) =>
        <g key={x} transform={`translate(${x} ${y})`}><path style={{animationDelay: -i * .15 + 's'}} d="M0 6Q7-2 16 5Q22-3 30 0"/></g>)}
    </svg>
    <svg className="harvest-ridges" viewBox="0 0 1440 280" preserveAspectRatio="none">
      <path fill="#613846" d="M0 108Q185 58 344 131T706 136T1003 105T1440 93V280H0Z"/>
      <path fill="#492b3b" d="M0 136q155 12 307 53t359-11q209-77 385-9t389-19v130H0Z"/>
      <path fill="#302031" d="M0 210Q143 169 282 216T620 233T949 217T1440 220V280H0Z"/>
      <path fill="none" stroke="#d38965" strokeOpacity=".2" strokeWidth="2" d="M0 234q123-45 282-7t333 23m398 6q193-41 427-16M0 250q123-41 282-7t238 20"/>
    </svg>
    <div className="harvest-leaves">
      {leaves.map((style, i) => <svg key={i} viewBox="0 0 24 25" style={style}>
        <path fill="currentColor" d="m12 1 2.2 5.8 4.1-1-.6 5 5.2 .6-3.9 4.9 1.5 2.4-7.5 1.5-.4 4h-1.4l.3-4-7.6-2.1 1.6-2.5-3.8-5 5.2-.4-.4-5 4.1 1.2Z"/>
        <path d="m12 8 .2 11m-5-5 5 4 5-4" fill="none" stroke="#5e3038" strokeWidth=".7"/>
      </svg>)}
    </div>
    <svg className="harvest-defs" width="0" height="0"><defs><radialGradient id={glow}>
      <stop stopColor="#ffb25e" stopOpacity=".64"/><stop offset="1" stopColor="#ff974b" stopOpacity="0"/>
    </radialGradient></defs></svg>
    <div className="harvest-foreground" style={{'--harvest-lantern-glow':`url(#${glow})`}}><Turkey/><HarvestStand/></div>
    <div className="harvest-embers">{Array.from({length:16}, (_, i) => <i key={i} style={{
      '--x': (i * 43 + 4) % 100 + '%', '--delay': -(i * 7 % 13) + 's', '--duration': 6 + i % 6 + 's'
    }}/>)}</div>
  </div>
}
