import {useEffect, useReducer, useState} from 'react'
import {Button, Sheet} from '../components/ui.jsx'
import {sound} from '../sound.js'
import {ARCADE_GAMES, PAD_COUNT, TURNS, arcadeReducer, makePads, turnTime} from './arcade.js'
import '../styles/arcade.css'

const padIndices = Array.from({length:PAD_COUNT},(_,i)=>i)

function readBest(key) {
 try {return Number(localStorage.getItem(key)) || 0} catch {return 0}
}

export default function Arcade({theme,onClose}) {
 const game=ARCADE_GAMES[theme]
 const [pace,setPace]=useState('relaxed')
 const [round,dispatch]=useReducer(arcadeReducer,null)
 const playing=Boolean(round && !round.done)
 const turn=round?.turn
 const good=round?.good
 const result=round?.result
 const key='conference_arcade_best_'+theme+'_'+pace
 const [records,setRecords]=useState({})
 const best=records[key] ?? readBest(key)
 const start=()=>{
  dispatch({type:'start',pads:makePads()})
  sound.play('arcadeStart')
 }

 useEffect(()=>{
  if(!playing)return
  const timer=setTimeout(()=>dispatch({type:'advance',turn,pads:makePads(good)}),turnTime(pace,turn))
  const press=event=>{
   if(event.repeat || event.altKey || event.ctrlKey || event.metaKey || !/^[1-6]$/.test(event.key))return
   event.preventDefault()
   dispatch({type:'pick',turn,pad:Number(event.key)-1})
  }
  window.addEventListener('keydown',press)
  return ()=>{clearTimeout(timer);window.removeEventListener('keydown',press)}
 },[playing,turn,good,pace])

 useEffect(()=>{
  if(!playing)return
  if(result==='catch')sound.play(round.combo%5===0 ? 'combo' : 'collect')
  if(result==='hazard')sound.play('meteor')
 },[playing,result,round?.combo])

 useEffect(()=>{
  if(!round?.done)return
  sound.play('roundEnd')
  const record=Math.max(round.score,readBest(key))
  try {localStorage.setItem(key,String(record))} catch {}
  setRecords(previous=>({...previous,[key]:record}))
 },[round?.done,round?.score,key])

 return <Sheet label={game.name+' arcade'} title={game.name} wide onClose={onClose}>
  <div className="arcade">
   <div className="arcade-hud">
    <span>Score <b data-score>{round?.score ?? 0}</b></span>
    <span>Combo <b>×{round?.combo ?? 0}</b></span>
    <span>Best <b>{best}</b></span>
   </div>
   {playing ? <>
    <div className="arcade-beat"><b>Turn {turn+1} / {TURNS}</b><span aria-live="polite">{result==='catch' ? 'Nice catch!' : result==='hazard' ? 'Combo reset' : 'Find the '+game.prize}</span></div>
    <div className="arcade-timer" aria-hidden="true"><i key={turn} style={{'--beat':turnTime(pace,turn)+'ms'}}/></div>
    <div className="arcade-grid">
     {padIndices.map(i=>{
      const target=i===good, hazard=i===round.bad
      return <button key={i} type="button" className="arcade-pad" data-pad={target?'prize':hazard?'hazard':'empty'}
       aria-label={target?'Catch '+game.prize:hazard?'Avoid '+game.hazard:'Empty pad '+(i+1)}
       aria-disabled={Boolean(result || !(target || hazard))} onClick={()=>dispatch({type:'pick',turn,pad:i})}>
       <span className="arcade-key" aria-hidden="true">{i+1}</span>
       <span aria-hidden="true">{target?game.good:hazard?game.bad:'·'}</span>
      </button>
     })}
    </div>
   </> : <div className="arcade-intro">
    <div className="arcade-emblem" aria-hidden="true">{game.good}</div>
    {round?.done
     ? <p><b>Round complete!</b> {round.score} points with a best combo of ×{round.peak}.</p>
     : <p>Catch the {game.prize} {game.good} and avoid the {game.hazard} {game.bad}. Tap a pad or press its number. Consecutive catches build your combo.</p>}
    {!round?.done && <div className="arcade-pace" role="group" aria-label="Game speed">
     <Button aria-pressed={pace==='relaxed'} onClick={()=>setPace('relaxed')}>Relaxed</Button>
     <Button aria-pressed={pace==='quick'} onClick={()=>setPace('quick')}>Quick</Button>
    </div>}
    <Button variant="primary" icon="right" onClick={start}>{round?.done?'Play again':'Start game'}</Button>
   </div>}
  </div>
 </Sheet>
}
