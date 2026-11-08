export const ARCADE_GAMES = {
 aurora:{name:'Starfall', good:'✦', bad:'☄', prize:'comet', hazard:'meteor', footer:'THE NIGHT IS STILL ALIVE.'},
 fall:{name:'Leaf Run', good:'🍁', bad:'🌰', prize:'maple leaf', hazard:'acorn', footer:'AUTUMN IS IN THE AIR.'},
 halloween:{name:'Candy Hunt', good:'🍬', bad:'👻', prize:'candy', hazard:'ghost', footer:'THE HAUNT IS STILL AWAKE.'},
 thanksgiving:{name:'Pie Parade', good:'🥧', bad:'🌰', prize:'pie', hazard:'acorn', footer:'UNDER THE HARVEST MOON.'},
 winter:{name:'Snowfall', good:'❄', bad:'◆', prize:'snowflake', hazard:'ice shard', footer:'THE SNOW KEEPS FALLING.'},
 blossom:{name:'Petal Pursuit', good:'🌸', bad:'💧', prize:'blossom', hazard:'raindrop', footer:'MEET BENEATH THE BLOSSOMS.'},
 firefly:{name:'Firefly Relay', good:'✷', bad:'🕸', prize:'firefly', hazard:'web', footer:'FOLLOW THE COAST LIGHTS.'},
 'studio-snowday':{name:'Sled Sprint', good:'❄', bad:'◆', prize:'snow crystal', hazard:'ice shard', footer:'FRESH TRACKS AHEAD.'},
 'studio-boardwalk':{name:'Bubble Break', good:'◉', bad:'✹', prize:'bubble', hazard:'sea urchin', footer:'SEE YOU ON THE BOARDWALK.'},
 'studio-monsoon':{name:'Rain Gauge', good:'💧', bad:'⚡', prize:'raindrop', hazard:'lightning bolt', footer:'LET THE GARDEN GROW.'},
 'studio-lunar':{name:'Lantern Trail', good:'🏮', bad:'◇', prize:'lantern', hazard:'shadow', footer:'FOLLOW THE LANTERNS.'},
 'studio-valentine':{name:'Special Delivery', good:'♥', bad:'✕', prize:'heart', hazard:'return mark', footer:'POSTED WITH CARE.'},
 'studio-newyear':{name:'Countdown Catch', good:'✦', bad:'◼', prize:'spark', hazard:'spent ember', footer:'HERE’S TO THE NEXT CHAPTER.'},
 'studio-notebook':{name:'Margin Notes', good:'✎', bad:'✕', prize:'pencil', hazard:'eraser mark', footer:'MEET IN THE MARGINS.'},
 'studio-science':{name:'Electron Run', good:'⚛', bad:'◆', prize:'electron', hazard:'obstacle', footer:'KEEP EXPERIMENTING.'}
}

export const MODES = {
 rush:{name:'Reflex Rush',icon:'⚡',hint:'Grab every target and dodge the fakes.'},
 echo:{name:'Echo Sequence',icon:'◎',hint:'Watch the pattern, then tap it back in order.'},
 beat:{name:'Perfect Beat',icon:'◈',hint:'Hit the marked pad as the needle crosses the zone.'}
}

const ECHO_WORLDS = ['blossom','studio-lunar','studio-valentine','studio-notebook']
const BEAT_WORLDS = ['winter','studio-snowday','studio-monsoon','studio-newyear','studio-science']
export const featuredMode = theme => ECHO_WORLDS.includes(theme) ? 'echo' : BEAT_WORLDS.includes(theme) ? 'beat' : 'rush'

export const TURNS = 12
export const PAD_COUNT = 6
export const LIVES = 3
export const waveFor = turn => 1+Math.floor(turn/4)

export function makeBoard(mode,pace,turn,random=Math.random) {
 const pads=Array.from({length:PAD_COUNT},(_,i)=>i)
 for(let i=pads.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1))
  ;[pads[i],pads[j]]=[pads[j],pads[i]]
 }
 const wave=waveFor(turn)
 const quick=pace==='quick'
 if(mode==='echo'){
  const length=wave+1+Number(quick&&wave>1)
  const pulse=650-85*wave-(quick?70:0)
  return {targets:pads.slice(0,length),hazards:[],pulse,preview:pulse*length,window:2400+length*350-(quick?650:0)}
 }
 if(mode==='beat'){
  const width=.39-wave*.036-(quick?.075:0)
  const center=.43+random()*.26
  return {targets:pads.slice(0,1),hazards:pads.slice(1,2),preview:0,window:2260-turn*55-(quick?210:0),zone:[center-width/2,center+width/2]}
 }
 const count=wave===3||(quick&&wave===2)?2:1
 return {targets:pads.slice(0,count),hazards:pads.slice(count,count+(wave===1?1:2)),preview:0,window:2000-turn*65-(quick?290:0)}
}

function stage(state,board,now) {
 return {...state,board,startedAt:now,phase:board.preview?'preview':'play',picks:[],outcome:null}
}

function finish(state,now,outcome,perfect=false) {
 const impact=Math.min(1,(now-state.startedAt)/state.board.window)
 if(outcome!=='clear')return {...state,phase:'feedback',startedAt:now,outcome,impact,lives:state.lives-1,combo:0,earned:0}
 const combo=state.combo+1
 const multiplier=Math.min(5,combo)
 const earned=(100+(perfect?50:0))*multiplier
 return {...state,phase:'feedback',startedAt:now,outcome,impact,perfect,combo,earned,score:state.score+earned,
  peak:Math.max(state.peak,combo),cleared:state.cleared+1,perfects:state.perfects+Number(perfect)}
}

export const phaseLength = state => state.phase==='preview' ? state.board.preview : state.phase==='play' ? state.board.window : 420

export function arcadeReducer(state,action) {
 if(action.type==='reset')return null
 if(action.type==='start'){
  return stage({mode:action.mode,pace:action.pace,previousBest:action.best,turn:0,lives:LIVES,score:0,combo:0,peak:0,cleared:0,perfects:0},action.board,action.now)
 }
 if(!state||action.turn!==state.turn||state.phase!==action.phase)return state
 const elapsed=action.now-state.startedAt
 if(action.type==='tick'&&elapsed>=phaseLength(state)){
  if(state.phase==='preview')return {...state,phase:'play',startedAt:action.now}
  if(state.phase==='play')return finish(state,action.now,'timeout')
  if(state.phase==='feedback'){
   if(!state.lives||state.turn===TURNS-1)return {...state,phase:'done'}
   return stage({...state,turn:state.turn+1},action.board,action.now)
  }
 }
 if(action.type!=='pick'||state.phase!=='play')return state
 if(elapsed>=state.board.window)return finish(state,action.now,'timeout')
 const {pad}=action
 const {targets,zone}=state.board
 const progress=elapsed/state.board.window
 if(state.mode==='echo'&&pad!==targets[state.picks.length])return finish(state,action.now,'pattern')
 if(!targets.includes(pad))return finish(state,action.now,'wrong')
 if(state.picks.includes(pad))return state
 if(zone&&(progress<zone[0]||progress>zone[1]))return finish(state,action.now,progress<zone[0]?'early':'late')
 const picked={...state,picks:[...state.picks,pad]}
 if(picked.picks.length<targets.length)return picked
 const perfect=zone ? Math.abs(progress-(zone[0]+zone[1])/2)<(zone[1]-zone[0])*.22 : progress<.54
 return finish(picked,action.now,'clear',perfect)
}

export function roundRank({cleared,perfects}) {
 if(cleared===TURNS&&perfects>=8)return 'S · Master'
 if(cleared===TURNS)return 'A · Full clear'
 if(cleared>=8)return 'B · Challenger'
 if(cleared>=4)return 'C · Contender'
 return 'D · Warmup'
}
