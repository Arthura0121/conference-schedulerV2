// The Aurora mark is drawn from original shapes: three ribbons of unequal length (an "E", a schedule, and aurora bands) with a rising dot.
export function Mark({size = 34}) {
  return <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="amk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6D3FE0" /><stop offset="1" stopColor="#0E7490" /></linearGradient>
      <linearGradient id="amr" x1="0" x2="1"><stop offset="0" stopColor="#C4B5FD" /><stop offset="1" stopColor="#67E8F9" /></linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#amk)" />
    <rect x="9" y="10" width="20" height="4.4" rx="2.2" fill="url(#amr)" />
    <rect x="9" y="17.8" width="14" height="4.4" rx="2.2" fill="url(#amr)" opacity=".85" />
    <rect x="9" y="25.6" width="18" height="4.4" rx="2.2" fill="url(#amr)" opacity=".7" />
    <circle cx="31.5" cy="12.2" r="2.6" fill="#FBBF24" />
  </svg>
}
export default function Brand({sub = 'Conferences', compact = false, href}) {
  const inner = <><Mark size={compact ? 30 : 36} /><span><b>English</b>{!compact && <small>{sub}</small>}</span></>
  return href ? <a className="brand" href={href} aria-label="English Conferences home">{inner}</a> : <div className="brand">{inner}</div>
}
/** Abstract aurora arcs for empty states. Pure shapes, no external assets. */
export function AuroraArt({className = 'art'}) {
  return <svg className={className} viewBox="0 0 200 120" aria-hidden="true" focusable="false">
    <defs><linearGradient id="aa1" x1="0" x2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
    <path d="M10 100 C50 30 150 30 190 100" fill="none" stroke="url(#aa1)" strokeWidth="5" strokeLinecap="round" opacity=".9" />
    <path d="M30 100 C62 52 138 52 170 100" fill="none" stroke="url(#aa1)" strokeWidth="5" strokeLinecap="round" opacity=".55" />
    <path d="M52 100 C74 72 126 72 148 100" fill="none" stroke="url(#aa1)" strokeWidth="5" strokeLinecap="round" opacity=".3" />
    <circle cx="100" cy="46" r="7" fill="#FBBF24" /><circle cx="100" cy="46" r="13" fill="none" stroke="#FBBF24" strokeWidth="1.5" opacity=".35" />
  </svg>
}
