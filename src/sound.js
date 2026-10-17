// Tiny Web Audio sound system. OFF by default. The preference lives only in this browser's localStorage (never sent anywhere).
// Sounds are played ONLY from explicit user actions (never from polling/refresh), and every failure is swallowed: audio can never break a booking.
export const TONES={tick:[[660,.05]],select:[[520,.06],[780,.08]],success:[[523,.1],[659,.1],[784,.2]],cancel:[[392,.09],[294,.16]],error:[[220,.16]]}
export const VOLUME=0.05   // deliberately quiet
export function createSound({storage=globalThis.localStorage,AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext,key='aurora-sound'}={}){
  let on=false,ctx=null
  try{on=storage?.getItem(key)==='on'}catch{}
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
