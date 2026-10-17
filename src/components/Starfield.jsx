/* One randomized sky per page load. Purely decorative: no API calls, no UI interaction. */
const POINTS=Array.from({length:155},(_,i)=>{
 const n=Math.random()
 return {id:i,x:(Math.random()*100).toFixed(2)+'%',y:(Math.random()*100).toFixed(2)+'%',
  size:(n>.96?5:n>.8?3.5:n>.48?2.5:1.5)+'px',
  delay:(-Math.random()*24).toFixed(2)+'s',twinkle:(2.3+Math.random()*5.1).toFixed(2)+'s',
  drift:(19+Math.random()*29).toFixed(2)+'s',
  dx:((Math.random()-.5)*85).toFixed(1)+'px',dy:((Math.random()-.5)*96).toFixed(1)+'px',
  opacity:(.59+Math.random()*.41).toFixed(2)}
})
export default function Starfield({className=''}) {
 return <div className={'aurora-starfield '+className} aria-hidden="true">
  <div className="aurora-curtain curtain-one"/><div className="aurora-curtain curtain-two"/><div className="aurora-curtain curtain-three"/>
  {POINTS.map(p=><span key={p.id} style={{'--star-x':p.x,'--star-y':p.y,'--star-size':p.size,'--star-delay':p.delay,'--twinkle-time':p.twinkle,'--drift-time':p.drift,'--star-dx':p.dx,'--star-dy':p.dy,'--star-opacity':p.opacity}}><i/></span>)}
 </div>
}
