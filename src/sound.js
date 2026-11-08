import {safeTheme} from './themes.js'

// Each gesture has a consistent contour. Every theme gives it a scale, instrument and rhythm.
export const CUES = {
 tick: {steps:[1], beat:.038},
 select: {steps:[1,3], beat:.049},
 navigate: {steps:[0,2], beat:.045},
 day: {steps:[2,4], beat:.053},
 open: {steps:[0,2,4], beat:.068},
 close: {steps:[2,0], beat:.067},
 success: {steps:[0,2,3,5], beat:.087, prominent:true},
 cancel: {steps:[3,2,0], beat:.091, prominent:true},
 error: {steps:[1,6], beat:.082, prominent:true},
 warning: {steps:[2,6], beat:.079, prominent:true},
 holdWarning: {steps:[5,5,2], beat:.091, prominent:true}
}

// Note offsets are in semitones, overtones are frequency ratios, and textures are filtered noise.
export const SOUND_PALETTES = {
 aurora: {root:330, scale:[0,2,4,7,11,12,-5,16], wave:'sine', overtone:2.01, shimmer:.28, pace:1.06, attack:.014, tail:1.48},
 fall: {root:262, scale:[0,2,4,7,9,12,-5,16], wave:'triangle', overtone:2.76, shimmer:.21, pace:1.09, attack:.008, tail:1.06, texture:950},
 halloween: {root:277, scale:[0,1,3,6,10,12,-6,15], wave:'sine', overtone:2.38, shimmer:.26, pace:1.12, attack:.021, tail:1.34, texture:600},
 thanksgiving: {root:247, scale:[0,2,4,7,9,12,-3,16], wave:'triangle', overtone:1.5, shimmer:.23, pace:1.2, attack:.009, tail:1.31},
 winter: {root:392, scale:[0,2,4,7,11,12,-5,16], wave:'sine', overtone:3.07, shimmer:.27, pace:1.17, attack:.005, tail:1.58},
 blossom: {root:349, scale:[0,2,4,7,9,12,-5,16], wave:'sine', overtone:2.43, shimmer:.23, pace:1.13, attack:.008, tail:1.31, texture:1900},
 firefly: {root:294, scale:[0,3,5,7,10,12,-5,15], wave:'sine', overtone:2.06, shimmer:.24, pace:.94, attack:.019, tail:1.41},
 'studio-snowday': {root:440, scale:[0,2,5,7,9,12,-5,14], wave:'sine', overtone:2.84, shimmer:.18, pace:.99, attack:.006, tail:1.15, texture:2900},
 'studio-boardwalk': {root:311, scale:[0,2,4,7,10,12,-3,16], wave:'triangle', overtone:1.51, shimmer:.18, pace:.97, attack:.008, tail:1.22, texture:690},
 'studio-monsoon': {root:349, scale:[0,2,3,7,10,12,-5,15], wave:'sine', overtone:2.64, shimmer:.29, pace:1.21, attack:.005, tail:1.36, texture:1340},
 'studio-lunar': {root:294, scale:[0,2,4,7,9,12,-5,16], wave:'triangle', overtone:3.38, shimmer:.26, pace:1.17, attack:.006, tail:1.34},
 'studio-valentine': {root:330, scale:[0,3,4,7,9,12,-3,16], wave:'sine', overtone:2.52, shimmer:.21, pace:1.05, attack:.012, tail:1.19, texture:1000},
 'studio-newyear': {root:370, scale:[0,2,4,7,10,12,-2,16], wave:'triangle', overtone:2.99, shimmer:.27, pace:.94, attack:.005, tail:1.43},
 'studio-notebook': {root:294, scale:[0,2,5,7,9,12,-3,14], wave:'triangle', overtone:2.23, shimmer:.12, pace:.93, attack:.006, tail:.95, texture:2500},
 'studio-science': {root:311, scale:[0,1,5,7,11,12,-6,17], wave:'triangle', overtone:1.99, shimmer:.22, pace:.89, attack:.004, tail:1.14}
}

export const VOLUME = .048
const FLOOR = .0001

function envelope(ctx,source,output,at,length,attack,level) {
 const gain=ctx.createGain()
 gain.gain.setValueAtTime(FLOOR,at)
 gain.gain.exponentialRampToValueAtTime(level,at+attack)
 gain.gain.exponentialRampToValueAtTime(FLOOR,at+length)
 source.connect(gain)
 gain.connect(output)
 source.start(at)
 source.stop(at+length+.006)
 return source
}

function note(ctx,output,palette,step,at,length,volume) {
 const frequency=palette.root*2**(palette.scale[step]/12)
 const chime=ctx.createOscillator()
 chime.frequency.value=frequency*palette.overtone
 envelope(ctx,chime,output,at,length*.68,palette.attack*.7,volume*palette.shimmer)

 const body=ctx.createOscillator()
 body.type=palette.wave
 body.frequency.value=frequency
 return envelope(ctx,body,output,at,length,palette.attack,volume)
}

function phraseVoice(ctx,output,palette,voice,at) {
 const source=ctx.createOscillator()
 const frequency=palette.root*2**((palette.scale[voice.step]+(voice.shift??0))/12)
 const {length,level,bend,pan}=voice
 source.type=voice.wave??palette.wave
 source.frequency.value=frequency
 if(bend){
  source.frequency.setValueAtTime(frequency,at)
  source.frequency.exponentialRampToValueAtTime(frequency*2**(bend/12),at+length)
 }
 const stereo=pan ? ctx.createStereoPanner?.() : null
 if(stereo){stereo.pan.value=pan;stereo.connect(output)}
 return envelope(ctx,source,stereo??output,at,length,Math.min(palette.attack,length*.18),VOLUME*level)
}

function texture(ctx,output,buffer,frequency,at,length,volume) {
 const source=ctx.createBufferSource()
 source.buffer=buffer
 const filter=ctx.createBiquadFilter()
 filter.type='bandpass'
 filter.frequency.value=frequency
 filter.Q.value=.82
 filter.connect(output)
 envelope(ctx,source,filter,at,Math.min(.073,length),.004,volume*.38)
}

function makeNoise(ctx) {
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.08),ctx.sampleRate)
 const samples=buffer.getChannelData(0)
 for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1
 return buffer
}

export function createSound({
 storage,
 AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext,
 getTheme=()=>globalThis.document?.documentElement.dataset.theme,
 key='aurora-sound'
}={}) {
 let on=true,ctx=null,master,noise
 const lanes=new Map()
 try{
  if(storage===undefined)storage=globalThis.localStorage
  on=storage?.getItem(key)!=='off'
 }catch{}

 function prepare() {
  if(!on||!AudioCtor)return false
  try{
   ctx??=new AudioCtor()
   if(!master){
    master=ctx.createGain()
    master.connect(ctx.destination)
   }
   // Safari may still report suspended during the first trusted click.
   if(ctx.state==='suspended'||ctx.state==='interrupted')ctx.resume?.()?.catch(()=>{})
   return true
  }catch{return false}
 }

 function silence(bus) {
  bus.gain.setTargetAtTime(0,ctx.currentTime,.003)
 }

 function stop(lane) {
  const bus=lanes.get(lane)
  if(bus){silence(bus);lanes.delete(lane)}
 }

 function playLane(lane,render) {
  if(!prepare())return false
  let bus
  try{
   stop(lane)
   bus=ctx.createGain()
   bus.connect(master)
   lanes.set(lane,bus)
   const last=render(bus,ctx.currentTime+.008)
   last.onended=()=>{
    if(lanes.get(lane)===bus)lanes.delete(lane)
    bus.disconnect()
   }
   return true
  }catch{
   if(bus){lanes.delete(lane);bus.disconnect()}
   return false
  }
 }

 return {
  isOn:()=>on,
  setOn(value){
   on=Boolean(value)
   try{
    if(master)master.gain.value=on?1:0
    if(!on)for(const bus of lanes.values())silence(bus)
   }catch{}
   try{storage?.setItem(key,on?'on':'off')}catch{}
   return on
  },
  prepare,
  stop,
  play(name,theme){
   if(!Object.hasOwn(CUES,name))return false
   const cue=CUES[name]
   return playLane(cue.prominent?'prominent':'detail',(bus,at)=>{
    const palette=SOUND_PALETTES[safeTheme(theme ?? getTheme())]
    const beat=cue.beat*palette.pace
    const volume=cue.prominent?VOLUME:VOLUME*.78
    if(palette.texture)texture(ctx,bus,noise??=makeNoise(ctx),palette.texture,at,beat*palette.tail,volume)
    let last
    for(const [i,step] of cue.steps.entries()){
     const tail=palette.tail*(i===cue.steps.length-1?1.42:1)
     last=note(ctx,bus,palette,step,at+i*beat,beat*tail,volume*(i===0?.88:1))
    }
    return last
   })
  },
  playPhrase({voices,noiseHit},{theme,lane,elapsed=0}){
   const upcoming=voices.filter(voice=>voice.at>=elapsed-.05)
   if(!upcoming.length)return false
   return playLane(lane,(bus,at)=>{
    const palette=SOUND_PALETTES[safeTheme(theme ?? getTheme())]
    if(noiseHit&&elapsed<.05){
     const frequency=noiseHit*(palette.texture??1450)/1450
     texture(ctx,bus,noise??=makeNoise(ctx),frequency,at,.07,VOLUME*.52)
    }
    let last,lastEnd=-1
    for(const voice of upcoming){
     const start=Math.max(0,voice.at-elapsed)
     const source=phraseVoice(ctx,bus,palette,voice,at+start)
     if(start+voice.length>lastEnd){last=source;lastEnd=start+voice.length}
    }
    return last
   })
  }
 }
}

export const sound=createSound()
