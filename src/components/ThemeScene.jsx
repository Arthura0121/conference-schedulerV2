import Starfield from './Starfield.jsx'
import '../styles/starfield.css'
import '../styles/themes.css'

const seq = n => Array.from({length:n},(_,i)=>i)
const pct = (i,m,a=0) => ((i*37+a)%m)
const fallLeaves = seq(32)
const snow = seq(58)
const bats = seq(11)
const candy = seq(12)

export default function ThemeScene({theme='aurora', className=''}) {
  if (theme === 'aurora') return <Starfield className={className} />

  if (theme === 'fall') return <div className={'theme-scene theme-scene-fall '+className} aria-hidden="true">
    <div className="fall-sun"/><div className="fall-haze haze-a"/><div className="fall-haze haze-b"/>
    <div className="fall-hill hill-a"/><div className="fall-hill hill-b"/>
    <div className="fall-branch branch-a"/><div className="fall-branch branch-b"/>
    <div className="fall-acorn acorn-a"><i/><b/></div><div className="fall-acorn acorn-b"><i/><b/></div>
    <div className="fall-leaves">{fallLeaves.map(i=><i key={i} className={'leaf leaf-'+(i%4)} style={{
      '--x':pct(i,101,7)+'vw','--delay':(-pct(i,19,3))+'s','--dur':(10+pct(i,9))+'s',
      '--s':(.55+pct(i,8)/10).toFixed(2),'--drift':(-55+pct(i,111))+'px','--spin':(220+pct(i,520))+'deg'
    }}/>)}</div>
    <div className="fall-ground"><i/><i/><i/><i/><i/></div>
  </div>

  if (theme === 'halloween') return <div className={'theme-scene theme-scene-halloween '+className} aria-hidden="true">
    <div className="hallow-moon"><i/></div><div className="hallow-cloud cloud-a"/><div className="hallow-cloud cloud-b"/>
    <div className="hallow-fog fog-a"/><div className="hallow-fog fog-b"/><div className="hallow-fog fog-c"/>
    <div className="hallow-bats">{bats.map(i=><i key={i} className="bat" style={{
      '--x':pct(i,86,5)+'vw','--y':(5+pct(i,42,7))+'vh','--delay':(-pct(i,13))+'s','--dur':(7+pct(i,8))+'s','--s':(.65+pct(i,7)/10).toFixed(2)
    }}><b/><em/></i>)}</div>
    <div className="hallow-candy">{candy.map(i=><i key={i} className={'candy candy-'+(i%3)} style={{
      '--x':pct(i,96,2)+'vw','--delay':(-pct(i,17,2))+'s','--dur':(13+pct(i,10))+'s','--rot':(pct(i,360))+'deg'
    }}><b/></i>)}</div>
    <div className="graveyard">
      <i className="grave grave-a"/><i className="grave grave-b"/><i className="grave grave-c"/>
      <div className="skeleton"><i className="skull"/><i className="spine"/><i className="rib r1"/><i className="rib r2"/><i className="arm a1"/><i className="arm a2"/></div>
      <div className="pumpkin pumpkin-a"><i/><b/><em/></div><div className="pumpkin pumpkin-b"><i/><b/><em/></div>
      <div className="hallow-fence"/>
    </div>
  </div>

  return <div className={'theme-scene theme-scene-winter '+className} aria-hidden="true">
    <div className="winter-sky-glow"/><div className="winter-moon"/>
    <div className="winter-lights">{seq(14).map(i=><i key={i} className={'bulb bulb-'+(i%4)} style={{'--i':i}}/>)}</div>
    <div className="winter-snow">{snow.map(i=><i key={i} className={'flake flake-'+(i%4)} style={{
      '--x':pct(i,101,3)+'vw','--delay':(-pct(i,21,1))+'s','--dur':(9+pct(i,12))+'s','--s':(.45+pct(i,9)/10).toFixed(2),'--drift':(-45+pct(i,91))+'px'
    }}/>)}</div>
    <div className="winter-pines"><i/><i/><i/><i/><i/></div>
    <div className="winter-snowbank bank-a"/><div className="winter-snowbank bank-b"/>
    <div className="winter-gift gift-a"><i/><b/></div><div className="winter-gift gift-b"><i/><b/></div>
  </div>
}
