// Aurora's understated, iOS-inspired interaction sounds (original synthesis, not Apple assets).
// Sound is ON by default; the local mute preference is preserved. Never plays automatically
// on load or refresh, and audio errors must never interrupt a reservation.
// Note shape: [frequency Hz, duration seconds, start offset seconds, waveform, relative level].
// All tones are very short; taps are crisp triangles, confirmations are rounded sine chimes.
export const TONES = {
  tick:        [[780,.018,0,'triangle',.24],[480,.036,.007,'sine',.13]],
  select:      [[730,.019,0,'triangle',.34],[510,.048,.008,'sine',.20]],
  navigate:    [[645,.020,0,'triangle',.31],[445,.052,.008,'sine',.18]],
  day:         [[760,.022,0,'triangle',.33],[560,.060,.009,'sine',.20]],
  open:        [[550,.052,0,'sine',.28],[740,.095,.038,'sine',.24],[880,.085,.082,'sine',.13]],
  close:       [[580,.042,0,'sine',.25],[410,.075,.03,'sine',.19]],
  success:     [[523,.105,0,'sine',.30],[659,.110,.074,'sine',.29],[784,.155,.150,'sine',.27]],
  cancel:      [[540,.060,0,'sine',.23],[400,.090,.045,'sine',.19]],
  error:       [[360,.080,0,'sine',.20],[310,.088,.052,'sine',.16]],
  warning:     [[590,.060,0,'sine',.21],[490,.090,.052,'sine',.18]],
  collect:     [[785,.030,0,'triangle',.31],[980,.065,.019,'sine',.23]],
  combo:       [[650,.055,0,'sine',.27],[784,.060,.041,'sine',.26],[980,.110,.089,'sine',.23]],
  meteor:      [[310,.065,0,'triangle',.23],[240,.10,.051,'sine',.17]],
  arcadeStart: [[523,.070,0,'sine',.27],[659,.085,.054,'sine',.25],[784,.115,.111,'sine',.22]],
  roundEnd:    [[590,.070,0,'sine',.26],[740,.080,.06,'sine',.25],[880,.13,.125,'sine',.21]]
}
export const VOLUME = 0.033 // intentionally restrained even at full system volume
export function createSound({
  storage=globalThis.localStorage,
  AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext,
  key='aurora-sound'
}={}){
  let on=true,ctx=null
  try{on=storage?.getItem(key)!=='off'}catch{}
  return {
    isOn:()=>on,
    setOn(v){on=Boolean(v);try{storage?.setItem(key,on?'on':'off')}catch{}return on},
    play(name){
      const notes=TONES[name]
      if(!on||!notes||!AudioCtor)return false
      try{
        ctx??=new AudioCtor()
        if(ctx.state==='suspended')ctx.resume?.()
        const base=ctx.currentTime+.006
        for(const [freq,duration,offset=0,wave='sine',relative=.3] of notes){
          const start=base+offset, end=start+duration
          const oscillator=ctx.createOscillator(), gain=ctx.createGain()
          oscillator.type=wave
          oscillator.frequency.value=freq
          const peak=VOLUME*relative
          // Short fade prevents clicks from digital discontinuities; quick decay sounds tactile.
          gain.gain.setValueAtTime(.0001,start)
          gain.gain.exponentialRampToValueAtTime(peak,start+Math.min(.008,duration*.25))
          gain.gain.exponentialRampToValueAtTime(.0001,end)
          oscillator.connect(gain)
          gain.connect(ctx.destination)
          oscillator.start(start)
          oscillator.stop(end+.01)
        }
        return true
      }catch{return false}
    }
  }
}
export const sound=createSound()
