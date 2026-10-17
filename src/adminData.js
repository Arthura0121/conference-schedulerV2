// What each teacher tab needs from the server. Every tab's data is re-fetched on each live signal / fallback poll (see Admin.jsx), so none can go stale.
export const TAB_CALLS={dash:['admin_stats','admin_activity','admin_settings'],sched:['admin_slots','admin_settings'],book:['admin_bookings','admin_slots','admin_settings'],set:['admin_settings'],lock:['admin_settings']}
export async function loadTab(tab,{from,to},call){
  const need=n=>(TAB_CALLS[tab]||[]).includes(n),out={},jobs=[]
  if(need('admin_stats'))jobs.push(call('admin_stats').then(v=>{out.stats=v}))
  // Readable timeline. If migration 003 is not applied yet, fall back to the old function so the dashboard still works (shown with technical labels).
  if(need('admin_activity'))jobs.push(call('admin_activity',{p_limit:30}).then(v=>{out.events=v}).catch(()=>call('admin_events',{p_limit:15}).then(v=>{out.events=v})))
  if(need('admin_settings'))jobs.push(call('admin_settings').then(v=>{out.cfg=v}))
  if(need('admin_slots'))jobs.push(call('admin_slots',{p_from:from,p_to:to}).then(v=>{out.slots=v}))
  if(need('admin_bookings'))jobs.push(call('admin_bookings').then(v=>{out.books=v}))
  await Promise.all(jobs);return out}
/** Only "you are signed out / not a teacher" should show the sign-in page. A network blip must NOT log the teacher out. */
export const isAuthError=e=>Boolean(e)&&(e.code==='PGRST301'||e.code==='PGRST303'||/\bjwt\b|invalid token|not authenticated/i.test(String(e.message))||String(e.message).trim()==='forbidden')
/** Fields the settings form edits. The form is re-synced only when one of THESE changes, so polling never overwrites what the teacher is typing. */
export const formKey=cfg=>cfg?JSON.stringify([cfg.lock_message,cfg.policy,cfg.auto_lock_on_edit,cfg.tz]):''
