import test from 'node:test';import assert from 'node:assert/strict'
import {createSound,CUES,SOUND_PALETTES,VOLUME} from '../../src/sound.js'
import {THEME_IDS} from '../../src/themes.js'
import {BOARD_AUDIO, REWARD_AUDIO, startPhrase, boardPhrase, wavePhrase, pickPhrase, feedbackPhrase, resultPhrase} from '../../src/student/arcadeAudio.js'
const mem=(init={})=>{const d={...init};return{d,getItem:k=>d[k]??null,setItem:(k,v)=>{d[k]=v}}}
function fakeAudio() {
 const log={ctors:0,starts:0,resumed:0,oscillators:[],gains:[],silenced:0,filters:[]}
 const node=()=>({connect(){},disconnect(){}})
 const source=()=>({...node(),start(at){this.startedAt=at;log.starts++},stop(at){this.stoppedAt=at}})
 class AC {
  constructor(){log.ctors++;this.currentTime=0;this.state='suspended';this.destination={};this.sampleRate=44100}
  resume(){log.resumed++;return Promise.resolve()}
  createOscillator(){
   const oscillator={...source(),frequency:{setValueAtTime(){},exponentialRampToValueAtTime(value){this.endValue=value}},type:'sine'}
   log.oscillators.push(oscillator)
   return oscillator
  }
  createGain(){
   const gain={...node(),gain:{value:1,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){log.silenced++}}}
   log.gains.push(gain)
   return gain
  }
  createBuffer(_,length){return{getChannelData:()=>new Float32Array(length)}}
  createBufferSource(){return source()}
  createBiquadFilter(){const filter={...node(),frequency:{},Q:{}};log.filters.push(filter);return filter}
 }
 return {AC,log}
}
test('sound is ON by default but creating it never touches audio (no autoplay)',()=>{const {AC,log}=fakeAudio();const s=createSound({storage:mem(),AudioCtor:AC});assert.equal(s.isOn(),true);assert.equal(log.ctors,0);assert.equal(log.starts,0)})
test('turning it on persists locally and a new instance reads it back',()=>{const st=mem(),{AC}=fakeAudio();const a=createSound({storage:st,AudioCtor:AC});a.setOn(true);assert.equal(st.d['aurora-sound'],'on');assert.equal(createSound({storage:st,AudioCtor:AC}).isOn(),true);a.setOn(false);assert.equal(createSound({storage:st,AudioCtor:AC}).isOn(),false)})
test('when on, each tone plays its notes; the audio context is created lazily on the first play only',()=>{const st=mem({'aurora-sound':'on'}),{AC,log}=fakeAudio();const s=createSound({storage:st,AudioCtor:AC});assert.equal(log.ctors,0);assert.equal(s.play('success'),true);assert.equal(log.starts,CUES.success.steps.length*2);s.play('error');assert.equal(log.ctors,1);assert.equal(log.resumed>=1,true)})
test('muted again means silent again',()=>{const {AC,log}=fakeAudio();const s=createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:AC});s.setOn(false);assert.equal(s.play('tick'),false);assert.equal(log.starts,0)})
test('unknown sound names and missing Web Audio are ignored, never thrown',()=>{const {AC}=fakeAudio();assert.equal(createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:AC}).play('nope'),false);assert.equal(createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:undefined}).play('tick'),false)})
test('audio failure cannot break the caller (constructor throws / oscillator throws)',()=>{const boom=class{constructor(){throw new Error('blocked')}};assert.equal(createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:boom}).play('success'),false)
  const bad=class{constructor(){this.currentTime=0;this.destination={}}createOscillator(){throw new Error('x')}};assert.equal(createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:bad}).play('success'),false)})
test('storage failures (private mode) do not throw and the toggle still works for the session',()=>{const broken={getItem(){throw new Error('denied')},setItem(){throw new Error('denied')}},{AC}=fakeAudio();const s=createSound({storage:broken,AudioCtor:AC});assert.equal(s.isOn(),true);assert.equal(s.setOn(false),false);assert.equal(s.setOn(true),true);assert.equal(s.play('tick'),true)})
test('all site themes have distinct, short sound palettes with quiet peaks',()=>{
 assert.deepEqual(Object.keys(SOUND_PALETTES),THEME_IDS)
 assert.ok(VOLUME<=.055)
 const signatures=new Set()
 for(const theme of THEME_IDS){
  const palette=SOUND_PALETTES[theme]
  const {AC,log}=fakeAudio()
  const s=createSound({storage:mem(),AudioCtor:AC,getTheme:()=>theme})
  assert.equal(s.play('success'),true,theme)
  signatures.add(JSON.stringify(log.oscillators.map(({type,frequency})=>[type,frequency.value])))
  for(const {steps,beat} of Object.values(CUES)){
   assert.ok((steps.length-1+palette.tail*1.42)*beat*palette.pace<.62,theme)
  }
 }
 assert.equal(signatures.size,THEME_IDS.length)
})

test('changes theme on the next cue, including a new theme preview, without restarting audio',()=>{
 const {AC,log}=fakeAudio()
 let theme='winter'
 const s=createSound({storage:mem(),AudioCtor:AC,getTheme:()=>theme})
 assert.equal(s.prepare(),true)
 assert.equal(log.starts,0)
 s.play('navigate')
 assert.equal(log.oscillators[1].frequency.value,392)
 theme='studio-notebook'
 s.play('navigate')
 assert.equal(log.oscillators[5].frequency.value,294)
 assert.equal(log.oscillators[5].type,'triangle')
 assert.equal(log.filters[0].frequency.value,2500)
 s.play('navigate','studio-snowday')
 assert.equal(log.oscillators[9].frequency.value,440)
 assert.equal(log.ctors,1)
})

test('muting silences current and scheduled cues and still blocks new playback',()=>{
 const {AC,log}=fakeAudio()
 const s=createSound({storage:mem(),AudioCtor:AC})
 s.play('success')
 s.play('day')
 s.setOn(false)
 assert.equal(log.gains[0].gain.value,0)
 assert.equal(log.silenced,2)
 assert.equal(s.play('day'),false)
 s.setOn(true)
 assert.equal(log.gains[0].gain.value,1)
 assert.equal(s.play('day'),true)
})

test('stored mute choice remains respected after reload',()=>{const {AC}=fakeAudio();const st=mem({'aurora-sound':'off'});const s=createSound({storage:st,AudioCtor:AC});assert.equal(s.isOn(),false);assert.equal(s.play('select'),false)})


test('Echo preview matches played pad notes and Perfect Beat accents the actual hit zone',()=>{
 const board={targets:[4,1,3],pulse:425,window:1660,zone:[.42,.65]}
 const echo=boardPhrase({mode:'echo',phase:'preview',board,turn:0})
 assert.deepEqual(echo.voices.map(({at})=>at),[0,.425,.85])
 for(const [index,pad] of board.targets.entries()){
  const {at,...preview}=echo.voices[index]
  const {at:_,...pressed}=pickPhrase('echo',pad).voices[0]
  assert.deepEqual(preview,pressed)
 }
 const beat=boardPhrase({mode:'beat',phase:'play',board,turn:3})
 assert.equal(beat.voices[2].at,board.zone[0]*board.window/1000)
 assert.equal(beat.voices[3].at,(board.zone[0]+board.zone[1])*board.window/2000)
})

test('arcade starts, misses, perfects, combos, wave changes and results have distinct sounds',()=>{
 const clear={mode:'rush',outcome:'clear',combo:1,perfect:false,picks:[2]}
 const ordinary=feedbackPhrase(clear)
 const perfect=feedbackPhrase({...clear,perfect:true})
 const chain=feedbackPhrase({...clear,combo:5,perfect:true})
 assert.ok(ordinary.voices.length<perfect.voices.length)
 assert.ok(perfect.voices.length<chain.voices.length)
 const variants=[
  ...['rush','beat','echo'].map(startPhrase),
  ...['wrong','pattern','early','late','timeout'].map(outcome=>feedbackPhrase({outcome})),
  ordinary,perfect,chain,wavePhrase(4),wavePhrase(8),
  resultPhrase({lives:0,cleared:5,score:450,previousBest:450}),
  resultPhrase({lives:1,cleared:12,score:450,previousBest:450}),
  resultPhrase({lives:1,cleared:12,score:450,previousBest:250})
 ]
 assert.equal(new Set(variants.map(phrase=>JSON.stringify(phrase))).size,variants.length)
 assert.equal(wavePhrase(5),null)
})

test('arcade signals skip elapsed notes and stop independently of rewards and global mute',()=>{
 const {AC,log}=fakeAudio()
 const s=createSound({storage:mem(),AudioCtor:AC,getTheme:()=>'winter'})
 const phrase=boardPhrase({mode:'echo',phase:'preview',board:{targets:[0,2,5],pulse:400},turn:0})
 assert.equal(s.playPhrase(phrase,{lane:BOARD_AUDIO,elapsed:.25}),true)
 assert.equal(log.starts,2)
 assert.ok(Math.abs(log.oscillators[0].startedAt-.158)<.00001)
 assert.ok(Math.abs(log.oscillators[1].startedAt-.558)<.00001)
 assert.equal(s.playPhrase(startPhrase('rush'),{lane:REWARD_AUDIO}),true)
 assert.equal(log.silenced,0)
 s.stop(BOARD_AUDIO)
 assert.equal(log.silenced,1)
 s.setOn(false)
 assert.equal(log.silenced,2)
 assert.equal(s.playPhrase(phrase,{lane:BOARD_AUDIO}),false)
 assert.equal(log.gains[0].gain.value,0)
})
