import {TURNS,waveFor} from './arcade.js'

export const BOARD_AUDIO='arcade-board'
export const REWARD_AUDIO='arcade-reward'

const voice=(at,step,length,level,shape={})=>({at,step,length,level,...shape})
const sub={shift:-12,wave:'sine'}
const high={shift:12,wave:'sine'}

export function startPhrase(mode) {
 const opening={
  rush:[voice(0,0,.14,.92,{...sub,bend:9}),voice(.065,3,.10,.92,{bend:5}),voice(.13,5,.20,1.1)],
  echo:[voice(0,2,.18,.9),voice(.09,4,.19,.92),voice(.18,5,.25,1.05)],
  beat:[voice(0,0,.10,.85,{...sub,bend:-5}),voice(.105,0,.10,.85,{...sub,bend:-5}),voice(.21,3,.22,1.05)]
 }
 return {voices:opening[mode],noiseHit:mode==='echo'?0:1700}
}

function padVoice(pad,at=0) {
 return voice(at,pad,.158,1.05,{shift:5,pan:(pad%3-1)*.6})
}

export function boardPhrase({mode,phase,board,turn}) {
 if(phase==='preview')return {voices:board.targets.map((pad,index)=>padVoice(pad,index*board.pulse/1000))}
 if(mode==='echo')return {voices:[voice(0,0,.095,.8,sub),voice(.08,5,.13,.82,high)]}
 if(mode==='beat'){
  const opens=board.zone[0]*board.window/1000
  const center=(board.zone[0]+board.zone[1])*board.window/2000
  return {voices:[
   voice(0,1,.12,.7,sub),
   voice(opens-.15,2,.11,.63),
   voice(opens,5,.145,1.06,{wave:'triangle'}),
   voice(center,5,.12,.73,high)
  ]}
 }
 // The opening jingle covers the first Rush board.
 if(!turn)return null
 const pitch=waveFor(turn)-1
 const voices=[voice(0,pitch,.115,.76,{bend:6})]
 if(board.targets.length>1)voices.push(voice(.085,pitch+2,.13,.88,{bend:3}))
 return {voices}
}

export function wavePhrase(turn) {
 if(turn!==4&&turn!==8)return null
 const shift=turn===8?12:0
 return {noiseHit:2100,voices:[
  voice(0,0,.16,1,{...sub,bend:6}),voice(.06,2,.17,.78,{shift}),
  voice(.12,3,.19,.89,{shift}),voice(.19,5,.25,1.08,{shift})
 ]}
}

export function pickPhrase(mode,pad) {
 if(mode==='echo')return {voices:[padVoice(pad)]}
 return {voices:[voice(0,2,.09,.9,{bend:7}),voice(.028,4,.1,.64,high)],noiseHit:2200}
}

const misses={
 wrong:{noiseHit:1250,voices:[voice(0,1,.16,1.02,{...sub,bend:-9}),voice(.055,6,.19,.92,{wave:'triangle',bend:-4})]},
 pattern:{noiseHit:1100,voices:[voice(0,3,.13,1.05,{bend:-8}),voice(.1,6,.18,.8,sub)]},
 early:{voices:[voice(0,2,.075,.99,{bend:5}),voice(.067,1,.10,.8,sub)]},
 late:{voices:[voice(0,2,.11,.97,{bend:-8}),voice(.08,6,.14,.83)]},
 timeout:{voices:[voice(0,3,.14,.84,sub),voice(.12,6,.20,1,{...sub,bend:-5})]}
}

export function feedbackPhrase({mode,outcome,combo,perfect,picks}) {
 if(outcome!=='clear')return misses[outcome]
 const pitch=Math.min(3,Math.max(0,combo-1))
 const voices=mode==='echo'?[padVoice(picks.at(-1))]:[voice(0,pitch,.15,1.05,{bend:mode==='rush'?5:0})]
 voices.push(voice(.058,pitch+2,.17,1.07))
 if(perfect)voices.push(voice(.105,5,.21,1.08,high),voice(.15,7,.19,.85))
 if(combo>=3)voices.push(voice(.09,0,.19,.9,sub))
 if(combo===5)voices.push(voice(.19,5,.23,1.08),voice(.24,7,.20,.84,high))
 return {voices,noiseHit:perfect?2400:mode==='rush'?1750:0}
}

export function resultPhrase({lives,cleared,score,previousBest}) {
 const newBest=score>previousBest
 const voices=lives?[
  voice(0,0,.24,1,sub),voice(.05,2,.18,.83),voice(.13,3,.21,.89),voice(.22,5,.30,1.08)
 ]:[
  voice(0,3,.18,.96),voice(.09,2,.21,.87),voice(.2,6,.26,1.04,{...sub,bend:-6})
 ]
 if(newBest)voices.push(voice(.27,2,.29,.76,high),voice(.36,5,.34,.94,high))
 if(cleared===TURNS)voices.push(voice(.34,0,.32,.92,sub))
 return {voices,noiseHit:newBest?2200:0}
}
