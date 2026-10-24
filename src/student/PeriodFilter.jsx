export default function PeriodFilter({periods, value, onChange, openCounts}) {
  if (!periods.length) return null
  const totalOpen = periods.reduce((n, p) => n + (openCounts[p] || 0), 0)
  return <section className="student-period-filter" aria-label="Filter conference times by period">
    <div className="student-period-filter-head">
      <div>
        <p className="ad-day-kicker">SHOW ME TIMES FOR</p>
        <h2>Choose a period</h2>
      </div>
      <span className="student-period-filter-note">Swipe to filter <span aria-hidden="true">→</span></span>
    </div>
    <div className="student-period-chips" role="group" aria-label="Period filter">
      <button type="button" className="student-period-chip" aria-pressed={value === 'all'} onClick={() => onChange('all')}>
        <span>All periods</span><b className="num">{totalOpen}</b><small>open</small>
      </button>
      {periods.map(p => <button type="button" key={p} className="student-period-chip" aria-pressed={value === String(p)} onClick={() => onChange(String(p))}>
        <span>Period {p}</span><b className="num">{openCounts[p] || 0}</b><small>open</small>
      </button>)}
    </div>
  </section>
}
