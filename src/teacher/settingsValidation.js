// Prevent invalid school time zones before saving: appointment display,
// "today", roster grouping and range presets all rely on this value.
export function validTimeZone(value) {
 const tz=typeof value==='string'?value.trim():''
 if(!tz)return false
 try { new Intl.DateTimeFormat('en-US',{timeZone:tz}).format(0);return true }
 catch {return false}
}
