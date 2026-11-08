import {CHANGELOG} from '../changelog.js'

export default function ReleaseHistory() {
  return <div className="whatsnew">
    {CHANGELOG.map(r => <section key={r.version} className="card">
      <div className="row"><h3>v{r.version} · {r.title}</h3><span className="spacer" /><span className="small">{r.date}</span></div>
      <ul>{r.items.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </section>)}
  </div>
}
