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
export const TURNS = 12
export const PAD_COUNT = 6
export const turnTime = (pace, turn) => pace === 'relaxed' ? 2800 : 2050 - turn * 65

export function makePads(previous = -1, random = Math.random) {
 const available = Array.from({length:PAD_COUNT}, (_,i)=>i).filter(i=>i!==previous)
 const good = available[Math.floor(random()*available.length)]
 const hazard = Math.floor(random()*(PAD_COUNT-1))
 return {good,bad:hazard >= good ? hazard+1 : hazard}
}

export function arcadeReducer(state, action) {
 switch(action.type) {
  case 'start':
   return {turn:0,score:0,combo:0,peak:0,result:null,done:false,...action.pads}
  case 'pick': {
   if(state.done || state.result || action.turn!==state.turn) return state
   if(action.pad===state.bad) return {...state,combo:0,result:'hazard'}
   if(action.pad!==state.good) return state
   const combo=state.combo+1
   return {...state,combo,peak:Math.max(combo,state.peak),score:state.score+100+Math.min(combo-1,5)*50,result:'catch'}
  }
  case 'advance': {
   if(state.done || action.turn!==state.turn) return state
   const combo=state.result==='catch' ? state.combo : 0
   if(state.turn===TURNS-1) return {...state,combo,done:true}
   return {...state,combo,turn:state.turn+1,result:null,...action.pads}
  }
  default:
   return state
 }
}
