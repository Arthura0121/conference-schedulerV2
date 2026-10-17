// Synthesized UI audio: no files, network, timers or dependencies. Default ON; local mute preference.
// Only user-initiated interactions and the hold's one-time urgency cue cause playback.
// A failed Web Audio operation is deliberately never allowed to interrupt scheduling.
// Each note: [frequency, length, start offset, oscillator shape, loudness multiplier, end frequency].
// Every effect is short, comfortable, and recognizably different from a generic sine beep.
export const TONES = {
 tick:[[560,.035,0,'triangle',.24],[840,.04,.018,'sine',.15]],
 select:[[500,.055,0,'triangle',.37,690],[760,.09,.04,'sine',.22,865]],
 navigate:[[345,.08,0,'triangle',.30,540],[565,.105,.038,'sine',.27,765],[810,.07,.095,'sine',.10]],
 day:[[430,.08,0,'triangle',.34,590],[740,.10,.05,'sine',.28,870],[915,.07,.12,'sine',.12]],
 month:[[670,.055,0,'triangle',.27,470],[465,.08,.065,'sine',.24,615],[720,.08,.12,'sine',.14]],
 today:[[470,.08,0,'triangle',.28],[630,.095,.04,'sine',.32],[850,.11,.11,'sine',.21]],
 filter:[[600,.05,0,'triangle',.26],[420,.095,.045,'sine',.18,610]],
 reveal:[[360,.09,0,'triangle',.25,460],[610,.12,.055,'sine',.25,745]],
 hide:[[590,.075,0,'triangle',.23,400],[360,.1,.052,'sine',.19,290]],
 focus:[[580,.035,0,'sine',.13],[780,.045,.018,'sine',.12]],
 edit:[[340,.08,0,'triangle',.2,490],[640,.1,.055,'sine',.23]],
 open:[[355,.105,0,'triangle',.43,490],[560,.125,.07,'sine',.33,745],[825,.13,.14,'sine',.23,960]],
 close:[[680,.065,0,'triangle',.26,460],[440,.1,.05,'sine',.23,340]],
 success:[[480,.12,0,'triangle',.43],[600,.12,.075,'sine',.4],[750,.135,.15,'triangle',.31],[960,.16,.25,'sine',.25]],
 cancel:[[530,.11,0,'triangle',.32,390],[370,.135,.085,'sine',.28,280],[260,.12,.18,'sine',.16]],
 error:[[330,.11,0,'sawtooth',.18,245],[230,.135,.1,'triangle',.20,170]],
 warning:[[660,.105,0,'triangle',.23,470],[465,.13,.1,'sine',.25,360]],
 urgency:[[760,.045,0,'triangle',.17],[620,.06,.115,'sine',.16]],
 confirm:[[590,.075,0,'triangle',.24],[740,.1,.055,'sine',.27],[940,.135,.105,'sine',.23]],
 refresh:[[425,.065,0,'triangle',.2,645],[720,.09,.055,'sine',.2,845]],
 collect:[[650,.055,0,'triangle',.35,850],[920,.1,.052,'sine',.32]],
 combo:[[555,.06,0,'triangle',.36],[690,.075,.052,'triangle',.33],[830,.085,.112,'sine',.34],[990,.105,.18,'sine',.22]],
 meteor:[[260,.105,0,'sawtooth',.26,180],[185,.16,.09,'triangle',.25,150]],
 arcadeStart:[[385,.085,0,'triangle',.34],[515,.095,.065,'triangle',.32],[675,.11,.145,'triangle',.28],[900,.15,.23,'sine',.27]],
 roundEnd:[[530,.08,0,'triangle',.28],[665,.11,.07,'triangle',.3],[795,.12,.14,'sine',.3],[990,.16,.23,'sine',.26]],
 gameOpen:[[410,.075,0,'triangle',.29,590],[650,.11,.08,'sine',.28,850]],
 gameClose:[[630,.075,0,'triangle',.27,420],[340,.11,.06,'sine',.22]]
}
export const VOLUME=0.052
export function createSound({storage=globalThis.localStorage,AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext,key='aurora-sound'}={}){
 let on=true,ctx=null,lastPlayed=Object.create(null)
 try{on=storage?.getItem(key)!=='off'}catch{}
 return {
  isOn:()=>on,
  setOn(v){on=Boolean(v);try{storage?.setItem(key,on?'on':'off')}catch{}return on},
  play(name){
   const notes=TONES[name];if(!on||!notes||!AudioCtor)return false
   try{
    // Debounce rapid clicks to prevent bursts of stacked sound on touch devices.
    ctx??=new AudioCtor()
    if(ctx.state==='suspended')ctx.resume?.()
    const now=ctx.currentTime
    if(lastPlayed[name]!==undefined && now-lastPlayed[name]<.09)return true
    lastPlayed[name]=now
    const origin=now+.012
    for(const [freq,dur,offset=0,wave='sine',level=1,endFreq] of notes){
     const t=origin+offset,o=ctx.createOscillator(),g=ctx.createGain()
     o.type=wave;o.frequency.value=freq
     if(endFreq&&typeof o.frequency.exponentialRampToValueAtTime==='function'){
      o.frequency.exponentialRampToValueAtTime(endFreq,t+dur)
     }
     const peak=VOLUME*level
     g.gain.setValueAtTime(.0001,t)
     g.gain.exponentialRampToValueAtTime(peak,t+Math.min(.018,dur*.24))
     g.gain.exponentialRampToValueAtTime(.0001,t+dur)
     o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur+.025)
    }
    return true
   }catch{return false}
  }
 }
}
export const sound=createSound()
