// Validation mirrors the simple date/period/time requirements of admin_upsert_slot.
// Room conflicts and school-time-zone edge cases are still checked by the database.
const CLOCK=/^(?:[01]\d|2[0-3]):[0-5]\d$/
export function validateNewSlot({date,period,start,end,room}){
 const d=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T12:00:00Z'):null
 if(!d||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==date)return 'Choose a valid date.'
 if(!Number.isInteger(Number(period))||Number(period)<1||Number(period)>9)return 'Period must be from 1 to 9.'
 if(!CLOCK.test(start||'')||!CLOCK.test(end||''))return 'Choose valid start and end times.'
 if(end<=start)return 'End time must be after the start time.'
 if(!String(room??'').trim())return 'Enter a room number.'
 return ''
}
