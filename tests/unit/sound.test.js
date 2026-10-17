import test from 'node:test';import assert from 'node:assert/strict'
import {createSound,TONES,VOLUME} from '../../src/sound.js'
const mem=(init={})=>{const d={...init};return{d,getItem:k=>d[k]??null,setItem:(k,v)=>{d[k]=v}}}
function fakeAudio(){const log={ctors:0,starts:0,resumed:0};class AC{constructor(){log.ctors++;this.currentTime=0;this.state='suspended';this.destination={}}resume(){log.resumed++}
  createOscillator(){return{frequency:{},connect(){},start(){log.starts++},stop(){}}}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}};return{AC,log}}
test('sound is ON by default but creating it never touches audio (no autoplay)',()=>{const {AC,log}=fakeAudio();const s=createSound({storage:mem(),AudioCtor:AC});assert.equal(s.isOn(),true);assert.equal(log.ctors,0);assert.equal(log.starts,0)})
test('turning it on persists locally and a new instance reads it back',()=>{const st=mem(),{AC}=fakeAudio();const a=createSound({storage:st,AudioCtor:AC});a.setOn(true);assert.equal(st.d['aurora-sound'],'on');assert.equal(createSound({storage:st,AudioCtor:AC}).isOn(),true);a.setOn(false);assert.equal(createSound({storage:st,AudioCtor:AC}).isOn(),false)})
test('when on, each tone plays its notes; the audio context is created lazily on the first play only',()=>{const st=mem({'aurora-sound':'on'}),{AC,log}=fakeAudio();const s=createSound({storage:st,AudioCtor:AC});assert.equal(log.ctors,0);assert.equal(s.play('success'),true);assert.equal(log.starts,TONES.success.length);s.play('error');assert.equal(log.ctors,1);assert.equal(log.resumed>=1,true)})
test('muted again means silent again',()=>{const {AC,log}=fakeAudio();const s=createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:AC});s.setOn(false);assert.equal(s.play('tick'),false);assert.equal(log.starts,0)})
test('unknown sound names and missing Web Audio are ignored, never thrown',()=>{const {AC}=fakeAudio();assert.equal(createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:AC}).play('nope'),false);assert.equal(createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:undefined}).play('tick'),false)})
test('audio failure cannot break the caller (constructor throws / oscillator throws)',()=>{const boom=class{constructor(){throw new Error('blocked')}};assert.equal(createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:boom}).play('success'),false)
  const bad=class{constructor(){this.currentTime=0;this.destination={}}createOscillator(){throw new Error('x')}};assert.equal(createSound({storage:mem({'aurora-sound':'on'}),AudioCtor:bad}).play('success'),false)})
test('storage failures (private mode) do not throw and the toggle still works for the session',()=>{const broken={getItem(){throw new Error('denied')},setItem(){throw new Error('denied')}},{AC}=fakeAudio();const s=createSound({storage:broken,AudioCtor:AC});assert.equal(s.isOn(),true);assert.equal(s.setOn(false),false);assert.equal(s.setOn(true),true);assert.equal(s.play('tick'),true)})
test('volume is quiet and every tone is short (no startling sounds)',()=>{assert.ok(VOLUME<=0.08);for(const [n,notes] of Object.entries(TONES)){const total=notes.reduce((a,x)=>a+x[1],0);assert.ok(total<=0.6,n+' too long');for(const [f] of notes)assert.ok(f>=150&&f<=1000,n+' frequency')}})

test('stored mute choice remains respected after reload',()=>{const {AC}=fakeAudio();const st=mem({'aurora-sound':'off'});const s=createSound({storage:st,AudioCtor:AC});assert.equal(s.isOn(),false);assert.equal(s.play('select'),false)})

test('premium UI effects are short, soft and use no abrasive oscillator shapes',()=>{
  assert.ok(VOLUME<=0.04)
  for(const name of ['tick','select','navigate','day','open','close','success','cancel','error','warning']){
    const notes=TONES[name]
    assert.ok(notes.length>=2 && notes.length<=3,name+' should be a brief layered cue')
    for(const [hz,duration,offset,wave,level] of notes){
      assert.ok(hz>=200 && hz<=1000,name+' frequency')
      assert.ok(duration>=.01 && duration<=.17,name+' duration')
      assert.ok(offset>=0 && offset<=.2,name+' stagger')
      assert.ok(['sine','triangle'].includes(wave),name+' should avoid harsh waveforms')
      assert.ok(level>0 && level<=.35,name+' low gain')
    }
  }
})
