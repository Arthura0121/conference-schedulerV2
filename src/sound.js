// Tiny Web Audio sound system. ON by default; users can mute it. The preference lives only in this browser's localStorage (never sent anywhere).
// Sounds are played ONLY from explicit user actions (never from polling/refresh), and every failure is swallowed: audio can never break a booking.
export const TONES={
 tick:[[660,.045]],select:[[520,.055],[780,.085]],
 success:[[523,.09],[659,.09],[784,.12],[1047,.17]],
 cancel:[[440,.09],[330,.12],[262,.14]],error:[[220,.14]],
 navigate:[[440,.055],[587,.065]],day:[[587,.055],[784,.065]],
 open:[[392,.06],[587,.08],[880,.1]],close:[[587,.06],[392,.11]],
 collect:[[740,.045],[988,.07]],combo:[[784,.055],[1047,.065],[1319,.1]],
 meteor:[[225,.11],[170,.15]],arcadeStart:[[392,.06],[523,.07],[784,.12]],
 roundEnd:[[659,.09],[784,.1],[988,.12],[1175,.15]],warning:[[470,.085],[360,.12]]
}
export const VOLUME=0.042   // deliberately quiet
export function createSound({storage=globalThis.localStorage,AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext,key='aurora-sound'}={}){
  let on=true,ctx=null
  try{on=storage?.getItem(key)!=='off'}catch{}
  return{
    isOn:()=>on,
    setOn(v){on=Boolean(v);try{storage?.setItem(key,on?'on':'off')}catch{}return on},
    play(name){
      const notes=TONES[name];if(!on||!notes||!AudioCtor)return false
      try{ctx??=new AudioCtor();if(ctx.state==='suspended')ctx.resume?.()
        let t=ctx.currentTime+0.01
        for(const [freq,dur] of notes){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq
          g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(VOLUME,t+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t+dur)
          o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur+0.02);t+=dur}
        return true}catch{return false}}}
}
export const sound=createSound()
