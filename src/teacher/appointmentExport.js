// Teacher-only print/export formatting. Input comes from authenticated admin_bookings.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+'T12:00:00Z'):null
const printableDate=s=>{const d=day(s);return d&&!Number.isNaN(+d)?new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d):String(s??'—')}
const fmtTime=(value,tz)=>{if(!value)return '—';const d=new Date(value);if(Number.isNaN(+d))return String(value);try{return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:tz||'America/New_York'}).format(d)}catch{return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(d)}}
export function prepareAppointmentRoster(books,nowMs=Date.now()){
 return [...books].sort((a,b)=>String(a.start_at||a.slot_date||'').localeCompare(String(b.start_at||b.slot_date||''))||Number(a.period||0)-Number(b.period||0)||String(a.room||'').localeCompare(String(b.room||''))).map(b=>({...b,exportStatus:b.start_at&&new Date(b.start_at).getTime()<nowMs?'Past':'Upcoming'}))
}
export function appointmentRosterHtml(books,{tz='America/New_York',generatedAt=new Date(),nowMs=Date.now()}={}){
 const rows=prepareAppointmentRoster(books,nowMs),total=rows.length,past=rows.filter(b=>b.exportStatus==='Past').length;
 let lastDate='';
 const sections=rows.map(b=>{
  const newDay=b.slot_date!==lastDate;lastDate=b.slot_date;
  return (newDay?'<tr class="day"><th colspan="6">'+escapeHtml(printableDate(b.slot_date))+'</th></tr>':'')+
  '<tr><td>'+escapeHtml('Period '+(b.period??'—'))+'</td><td>'+escapeHtml(fmtTime(b.start_at,tz))+(b.end_at?' – '+escapeHtml(fmtTime(b.end_at,tz)):'')+'</td><td>'+escapeHtml(b.room||'—')+'</td><td class="name">'+escapeHtml(b.student_name||'—')+'</td><td>'+escapeHtml(b.assignment||'—')+'</td><td>'+escapeHtml(b.exportStatus)+'</td></tr>'
 }).join('')
 const created=generatedAt.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conference Appointment Roster</title><style>'+
 '*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#203044;max-width:1100px;margin:0 auto;padding:36px;background:#f3f6fa}main{background:#fff;padding:36px 42px;border:1px solid #dde5ed;border-radius:18px}header{border-bottom:3px solid #275a75;padding-bottom:21px;margin-bottom:25px}h1{font-size:27px;letter-spacing:-.04em;margin:3px 0 6px}.eyebrow{text-transform:uppercase;letter-spacing:.17em;font-size:11px;font-weight:800;color:#38708a}.sub{font-size:12px;color:#697c8e}.stats{display:flex;gap:14px;margin:20px 0 24px}.stat{background:#edf4f7;padding:12px 17px;border-radius:9px;min-width:100px}.stat b{display:block;font-size:21px}.stat span{font-size:11px;color:#556b7c}table{border-collapse:collapse;width:100%;font-size:12px}thead th{background:#1d4258;color:white;padding:11px 9px;text-align:left}td{padding:10px 9px;border-bottom:1px solid #e4e9ee;vertical-align:top;overflow-wrap:anywhere}td.name{font-weight:650}.day th{padding:14px 9px 8px;text-align:left;background:#eaf1f6;color:#254c65;font-size:12px}.day{break-after:avoid;page-break-after:avoid}tr{break-inside:avoid;page-break-inside:avoid}footer{font-size:10px;color:#66788a;margin-top:27px;border-top:1px solid #e0e7ed;padding-top:12px}.empty{padding:25px;color:#657487;text-align:center}.toolbar{display:flex;gap:9px;margin:0 0 20px}.toolbar button{padding:10px 18px;border:0;border-radius:8px;background:#225672;color:white;cursor:pointer;font-weight:650}@page{size:landscape;margin:13mm}@media print{body{padding:0;background:#fff}main{padding:0;border:0;border-radius:0}.toolbar{display:none}.stats{gap:10px}.stat{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead th,.day th{-webkit-print-color-adjust:exact;print-color-adjust:exact}header{margin-bottom:14px}}@media(max-width:600px){body{padding:10px}main{padding:18px}table{font-size:10px}td,th{padding:6px!important}.stats{flex-wrap:wrap}}'+
 '</style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div><main><header><div class="eyebrow">Teacher records · Confidential</div><h1>Conference Appointment Roster</h1><div class="sub">Generated '+escapeHtml(created)+' · Time zone: '+escapeHtml(tz)+'</div></header><div class="stats"><div class="stat"><b>'+total+'</b><span>Total bookings</span></div><div class="stat"><b>'+(total-past)+'</b><span>Upcoming</span></div><div class="stat"><b>'+past+'</b><span>Past</span></div></div>'+
 (total?'<table><thead><tr><th>Period</th><th>Time</th><th>Room</th><th>Student</th><th>Assignment</th><th>Status</th></tr></thead><tbody>'+sections+'</tbody></table>':'<p class="empty">No booked appointments to export.</p>')+
 '<footer>Private teacher copy. Contains student information. Store and share securely. Paper-only reservations without an online student record are not included.</footer></main></body></html>'
}
export function downloadAppointmentRoster(books,tz){
 const html=appointmentRosterHtml(books,{tz});const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}))
 const a=document.createElement('a');a.href=url;a.download='conference-appointments-'+new Date().toISOString().slice(0,10)+'.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
}
export function printAppointmentRoster(books,tz){
 const html=appointmentRosterHtml(books,{tz});const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}))
 const tab=window.open(url,'_blank');if(!tab){URL.revokeObjectURL(url);return false}
 setTimeout(()=>URL.revokeObjectURL(url),60000);return true
}
