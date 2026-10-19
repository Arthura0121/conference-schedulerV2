/** A typography-led identity. No legacy ribbon / E-shaped SVG logo.
    A shared wordmark keeps sign-in, first-load, and error screens consistent. */
export default function Brand({sub='Conferences',compact=false,href}){
 const inner=<span className={'brand-type'+(compact?' compact':'')}>
  <b>English</b>{!compact&&<small>{sub}</small>}
 </span>
 return href?<a className="brand brand-wordmark" href={href} aria-label="English Conferences home">{inner}</a>
  :<div className="brand brand-wordmark">{inner}</div>
}
