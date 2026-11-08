import {createContext, useContext, useEffect, useState} from 'react'
import {configured, sb} from '../sb.js'
import {startVisitorPresence} from '../visitorPresence.js'
import Icon from './Icon.jsx'
import '../styles/visitor-count.css'

const PresenceContext=createContext({status:'connecting',count:null})

/** One subscription above route switching, with the count rendered in each route's header. */
export function VisitorPresenceProvider({children}) {
 const [presence,setPresence]=useState({status:'connecting',count:null})
 useEffect(()=>{
  if(!configured){setPresence({status:'unavailable',count:null});return}
  const connection=startVisitorPresence({client:sb,onUpdate:setPresence})
  return ()=>connection.stop()
 },[])
 return <PresenceContext.Provider value={presence}>{children}</PresenceContext.Provider>
}

export default function VisitorCounter({compact=false}) {
 const {status,count}=useContext(PresenceContext)
 const live=status==='live'&&Number.isFinite(count)
 const label=live?count+' viewing now':'Active viewer count unavailable'
 return <span className={'visitor-counter'+(compact?' compact':'')} role="status" aria-live="polite" aria-atomic="true" aria-label={label} title={label}>
  <Icon name="user" size={13}/>
  <span aria-hidden="true" className="visitor-counter-number">{live?count:'—'}</span>
  <span aria-hidden="true" className="visitor-counter-text">viewing now</span>
 </span>
}
