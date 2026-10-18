// Single-viewBox artwork keeps limbs attached through every animation and screen size.
export function ReindeerFigure({redNose=false}) {
  return <svg viewBox="0 0 110 100" className="illustrated-reindeer" aria-hidden="true">
    <g stroke="#54331f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M31 51 L24 84 L34 85 L43 58 M61 57 L68 84 L78 83 L75 51" fill="none"/>
      <path d="M30 50 Q17 48 12 39" fill="none"/>
      <path d="M22 39 Q37 28 59 34 Q73 39 76 28 L82 20 Q91 18 97 29 L93 39 Q87 44 80 40 L70 54 Q55 65 35 59Z" fill="#956037"/>
      <path d="M77 24 L72 9 M77 24 L85 7 M77 24 L93 14 M85 21 L94 8" fill="none" stroke="#aa8052" strokeWidth="3"/>
      <path d="M82 23 Q88 12 96 22 Q92 29 82 26" fill="#c58b5b"/>
      <path d="M43 59 L39 83 L49 84 L55 61 M68 56 L79 81 L88 79 L78 48" fill="#956037"/>
      <path d="M38 40 Q51 34 63 40" stroke="#c08a53" strokeWidth="3" fill="none"/>
    </g>
    <circle cx="88" cy="30" r="2.4" fill="#191319"/>
    <circle cx="98" cy="36" r={redNose?5:3} fill={redNose?'#fb3855':'#34211c'}/>
    <path d="M69 40 Q77 43 81 39" stroke="#fbbf24" strokeWidth="3" fill="none"/>
  </svg>
}
export function SantaFigure() {
  return <svg viewBox="0 0 96 106" className="illustrated-santa" aria-hidden="true">
    <path d="M25 93 L27 78 L67 78 L74 95" fill="#29212b" stroke="#1b1720" strokeWidth="6" strokeLinejoin="round"/>
    <path d="M27 57 Q17 68 17 89 Q47 107 79 89 L69 56 Q47 45 27 57Z" fill="#c92332" stroke="#92212e" strokeWidth="3"/>
    <path d="M18 88 Q47 97 78 88" stroke="#fff8ef" strokeWidth="10" fill="none"/>
    <rect x="38" y="61" width="18" height="31" rx="3" fill="#34232d"/>
    <rect x="36" y="76" width="23" height="10" rx="2" fill="#f5c554"/>
    <rect x="44" y="78" width="8" height="6" rx="1" fill="#34232d"/>
    <path d="M30 60 Q16 55 12 38" stroke="#c92332" strokeWidth="15" strokeLinecap="round" fill="none"/>
    <circle cx="12" cy="37" r="9" fill="#fff8ef"/>
    <path d="M67 60 L81 76" stroke="#c92332" strokeWidth="14" strokeLinecap="round" fill="none"/>
    <circle cx="81" cy="77" r="8" fill="#fff8ef"/>
    <ellipse cx="49" cy="38" rx="24" ry="24" fill="#fff8ef"/>
    <circle cx="49" cy="28" r="19" fill="#f6c5a6"/>
    <circle cx="42" cy="27" r="2" fill="#34232d"/>
    <circle cx="56" cy="27" r="2" fill="#34232d"/>
    <path d="M43 37 Q49 42 56 37" stroke="#ac6773" strokeWidth="2" fill="none"/>
    <path d="M29 34 Q39 37 49 34 Q59 37 69 33 L64 49 Q49 65 34 49Z" fill="#fff8ef"/>
    <ellipse cx="49" cy="34" rx="6" ry="5" fill="#e8a88d"/>
    <path d="M28 20 Q31 -3 53 4 Q73 8 77 28 L65 26 Q52 17 34 25Z" fill="#cf2737" stroke="#96252e" strokeWidth="2"/>
    <path d="M30 23 Q48 16 67 25" fill="none" stroke="#fff8ef" strokeWidth="9" strokeLinecap="round"/>
    <circle cx="79" cy="29" r="8" fill="#fff8ef"/>
  </svg>
}