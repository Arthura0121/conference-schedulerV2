/* Render once per loaded page: genuinely scattered positions, different sizes, twinkle and drift.
   Decorative only; never captures touch/click or changes booking state. */
const POINTS=Array.from({length:85},(_,i)=>{
  const n=Math.random()
  return {id:i,x:(Math.random()*100).toFixed(2)+'%',y:(Math.random()*100).toFixed(2)+'%',size:(n>.92?3:n>.62?2:1)+'px',delay:(-Math.random()*18).toFixed(2)+'s',twinkle:(2.6+Math.random()*5.4).toFixed(2)+'s',drift:(14+Math.random()*21).toFixed(2)+'s',dx:((Math.random()-.5)*80).toFixed(1)+'px',dy:((Math.random()-.5)*95).toFixed(1)+'px',opacity:(.24+Math.random()*.68).toFixed(2)}
})
export default function Starfield({className=''}) {
  return <div className={'aurora-starfield '+className} aria-hidden="true">{POINTS.map(p=><span key={p.id} style={{'--star-x':p.x,'--star-y':p.y,'--star-size':p.size,'--star-delay':p.delay,'--twinkle-time':p.twinkle,'--drift-time':p.drift,'--star-dx':p.dx,'--star-dy':p.dy,'--star-opacity':p.opacity}}><i/></span>)}</div>
}
