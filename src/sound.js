// Aurora UI audio: intentionally simple. Uses two real, short Mixkit UI samples.
// No oscillator synthesis, no sci-fi layers, and no sound on typing/hover.
// The user's local mute preference is preserved and audio failure never blocks booking.
export const SOUND_URLS={
  click:'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
  success:'https://assets.mixkit.co/active_storage/sfx/2865/2865-preview.mp3'
}
// Kept for compatibility with existing tests/imports: UI actions map to one plain click,
// while a completed booking/admin action gets the single soft confirmation tone.
export const TONES={
  tick:'click',select:'click',navigate:'click',day:'click',open:'click',close:'click',
  cancel:'click',error:'click',warning:'click',
  collect:'click',combo:'success',meteor:'click',arcadeStart:'click',roundEnd:'success',
  success:'success'
}
export const VOLUME=.18

export function createSound({
  storage=globalThis.localStorage,
  AudioCtor=globalThis.Audio,
  key='aurora-sound'
}={}){
  let on=true
  try{on=storage?.getItem(key)!=='off'}catch{}
  const cache=new Map()
  const getAudio=name=>{
    const kind=TONES[name]
    if(!kind||!AudioCtor)return null
    if(!cache.has(kind)){
      const a=new AudioCtor(SOUND_URLS[kind])
      a.preload='auto'
      a.volume=VOLUME
      cache.set(kind,a)
    }
    return cache.get(kind)
  }
  return{
    isOn:()=>on,
    setOn(v){on=Boolean(v);try{storage?.setItem(key,on?'on':'off')}catch{}return on},
    play(name){
      if(!on)return false
      try{
        const a=getAudio(name)
        if(!a)return false
        a.pause?.()
        a.currentTime=0
        a.volume=VOLUME
        const p=a.play?.()
        p?.catch?.(()=>{})
        return true
      }catch{return false}
    }
  }
}
export const sound=createSound()
