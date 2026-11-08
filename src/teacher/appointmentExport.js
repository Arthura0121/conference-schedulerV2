// Offline teacher documents. Only the current authenticated screen supplies rows.
import {classify} from '../slotInfo.js'
import {exportTheme} from './exportTheme.js'

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
 '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))
const dateFormat = new Intl.DateTimeFormat('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric', timeZone:'UTC'})
function printableDate(value) {
 const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00Z') : null
 return date && !Number.isNaN(+date) ? dateFormat.format(date) : String(value ?? '—')
}
function timeFormatter(tz) {
 const options = {hour:'numeric', minute:'2-digit'}
 try { return new Intl.DateTimeFormat('en-US', {...options, timeZone:tz}) }
 catch { return new Intl.DateTimeFormat('en-US', options) }
}
function printableTime(slot, formatter) {
 const fmt = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(+date) ? String(value) : formatter.format(date)
 }
 return fmt(slot.start_at) + (slot.end_at ? ' – ' + fmt(slot.end_at) : '')
}
function chronological(slots) {
 return [...slots].sort((a,b) => String(a.start_at || a.slot_date || '').localeCompare(String(b.start_at || b.slot_date || '')) ||
  Number(a.period || 0) - Number(b.period || 0) || String(a.room || '').localeCompare(String(b.room || '')))
}

export function prepareAppointmentRoster(books, nowMs = Date.now()) {
 return chronological(books).map(b => ({...b, exportStatus:b.start_at && new Date(b.start_at).getTime() < nowMs ? 'Past' : 'Upcoming'}))
}

const documentCss = `
*{box-sizing:border-box}
body{margin:0;padding:24px;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#1b2634;background:linear-gradient(155deg,var(--wash),#f5f6f7 72%)}
main,.toolbar{width:min(100%,1050px);margin-inline:auto}
main{background:#fff;border:1px solid #dce0e5;border-radius:18px;overflow:hidden}
.toolbar{display:flex;justify-content:flex-end;margin-bottom:12px}
button{font:inherit;font-weight:700;min-height:44px;padding:8px 15px;border:1px solid var(--accent);border-radius:9px;background:#fff;color:var(--accent);cursor:pointer}
header{position:relative;isolation:isolate;padding:27px 32px;background:var(--wash);border-top:6px solid var(--accent);color:var(--accent)}
header::after{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 92% 0%,var(--glow),transparent 54%);opacity:.45}
.mark{float:right;width:72px;height:72px;margin-left:16px;padding:14px;border:1px solid currentColor;border-radius:18px}
.eyebrow,.theme-name{font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.theme-name{margin:0 0 5px}h1{margin:2px 0 6px;font-size:clamp(22px,4vw,34px);line-height:1.14;letter-spacing:-.04em}
.sub{font-size:12px;color:#374556}
.content{padding:20px 32px 24px}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.stat{background:var(--wash);border-left:3px solid var(--accent);padding:6px 12px;min-width:85px;border-radius:5px}
.stat b{display:block;color:var(--accent);font-size:20px}.stat span{font-size:11px}
table{border-collapse:collapse;width:100%;font-size:12px}
thead th{background:var(--accent);color:#fff;padding:9px;text-align:left}
td{padding:8px 9px;border-bottom:1px solid #dce0e5;vertical-align:top;overflow-wrap:anywhere}
table[aria-label="Conference Appointment Roster"] td:nth-child(4){font-weight:650}
.day th{padding:9px;text-align:left;background:var(--wash);color:var(--accent)}
.day{break-after:avoid;page-break-after:avoid}
tr{break-inside:avoid;page-break-inside:avoid}
.cell-label{display:none}
footer{font-size:11px;color:#475365;margin-top:18px;padding-top:9px;border-top:1px solid #dce0e5}
.empty{padding:12px 0}
@media screen and (max-width:640px){
 body{padding:8px}header{padding:16px}.content{padding:12px}.mark{width:49px;height:49px;padding:8px;margin-left:8px}
 table,tbody,tr{display:block}
 thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
 .day th{display:block}
 tr:not(.day){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:5px;border-bottom:1px solid #dce0e5}
 td{padding:4px;border:0}
 .cell-label{display:block;color:var(--accent);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
}
@page{size:landscape;margin:13mm}
@media print{
 body{padding:0;background:#fff}
 main{border:0;border-radius:0;overflow:visible}
 .toolbar{display:none}
 header{padding:9px 0 12px;background:#fff;border-top-width:4px}
 header::after{display:none}
 .mark{width:49px;height:49px;padding:8px}
 h1{font-size:24px}
 .content{padding:10px 0 0}
 header,.stats{-webkit-print-color-adjust:exact;print-color-adjust:exact;break-inside:avoid}
 thead{display:table-header-group}
 thead th,.day th{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:var(--wash);color:var(--accent)}
 td,thead th,.day th{padding:6px 8px}
}
`

function renderDocument({theme, tz, generatedAt, title, scope, rows, columns, stats, empty, footer}) {
 const {id, name, accent, glow, wash, mark} = exportTheme(theme)
 const created = generatedAt.toLocaleString('en-US', {dateStyle:'medium', timeStyle:'short'})
 let previousDay
 const contents = rows.map(({date, values}) => {
  const heading = date !== previousDay ? `<tr class="day" role="row"><th role="rowheader" colspan="${columns.length}">${escapeHtml(printableDate(date))}</th></tr>` : ''
  previousDay = date
  return heading + `<tr role="row">${values.map((value, i) => `<td role="cell"><span class="cell-label" aria-hidden="true">${columns[i]}</span>${escapeHtml(value)}</td>`).join('')}</tr>`
 }).join('')
 return `<!doctype html>
<html lang="en" data-theme="${id}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>:root{--accent:${accent};--glow:${glow};--wash:${wash}}${documentCss}</style></head>
<body><div class="toolbar"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
<main><header><svg class="mark" aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${mark}"/></svg>
<p class="theme-name">${escapeHtml(name)}</p><div class="eyebrow">${escapeHtml(scope)}</div><h1>${title}</h1>
<div class="sub">Generated ${escapeHtml(created)} · Time zone: ${escapeHtml(tz)}</div></header>
<div class="content"><div class="stats">${stats.map(([label, value]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join('')}</div>
${rows.length ? `<table role="table" aria-label="${title}"><thead role="rowgroup"><tr role="row">${columns.map(column => `<th scope="col" role="columnheader">${column}</th>`).join('')}</tr></thead><tbody role="rowgroup">${contents}</tbody></table>` : `<p class="empty">${empty}</p>`}
<footer>${footer}</footer></div></main></body></html>`
}

export function appointmentRosterHtml(books, {tz = 'America/New_York', theme, generatedAt = new Date(), nowMs = Date.now()} = {}) {
 const formatter = timeFormatter(tz)
 const roster = prepareAppointmentRoster(books, nowMs)
 const past = roster.filter(b => b.exportStatus === 'Past').length
 return renderDocument({
  theme, tz, generatedAt,
  title:'Conference Appointment Roster', scope:'Teacher records · Confidential',
  columns:['Period', 'Time', 'Room', 'Student', 'Assignment', 'Status'],
  rows:roster.map(b => ({date:b.slot_date, values:['Period ' + (b.period ?? '—'), printableTime(b, formatter), b.room || '—', b.student_name || '—', b.assignment || '—', b.exportStatus]})),
  stats:[['Total bookings', roster.length], ['Upcoming', roster.length - past], ['Past', past]],
  empty:'No booked appointments to export.',
  footer:'Private teacher copy. Contains student information. Store and share securely. Paper-only reservations without an online student record are not included.'
 })
}

export function scheduleHtml(slots, {tz = 'America/New_York', theme, generatedAt = new Date(), nowMs = Date.now(), range} = {}) {
 const formatter = timeFormatter(tz)
 const schedule = chronological(slots).map(slot => ({slot, ...classify(slot, nowMs)}))
 const scope = range ? `Filtered schedule · ${printableDate(range.from)} – ${printableDate(range.to)}` : 'Filtered schedule'
 return renderDocument({
  theme, tz, generatedAt, scope,
  title:'Conference Schedule', columns:['Period', 'Time', 'Room', 'Status'],
  rows:schedule.map(({slot, label, past}) => ({date:slot.slot_date, values:['Period ' + (slot.period ?? '—'), printableTime(slot, formatter), slot.room || '—', label + (past ? ' · Past' : '')]})),
  stats:[['Appointments shown', schedule.length], ['Open upcoming', schedule.filter(s => s.kind === 'open' && !s.past).length]],
  empty:'No appointments match the schedule filters.',
  footer:'Teacher copy of the appointments visible when exported. Statuses reflect the time of export.'
 })
}

function documentUrl(html) {
 return URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}))
}
function downloadDocument(html, filename) {
 const url = documentUrl(html)
 const link = document.createElement('a')
 link.href = url
 link.download = filename + '-' + new Date().toISOString().slice(0,10) + '.html'
 document.body.append(link)
 link.click()
 link.remove()
 setTimeout(() => URL.revokeObjectURL(url), 60000)
}
function printDocument(html) {
 const url = documentUrl(html)
 const tab = window.open(url, '_blank')
 if (!tab) {
  URL.revokeObjectURL(url)
  return false
 }
 setTimeout(() => URL.revokeObjectURL(url), 60000)
 return true
}

export function downloadAppointmentRoster(books, tz, theme) {
 downloadDocument(appointmentRosterHtml(books, {tz, theme}), 'conference-appointments')
}
export function printAppointmentRoster(books, tz, theme) {
 return printDocument(appointmentRosterHtml(books, {tz, theme}))
}
export function downloadSchedule(slots, options) {
 downloadDocument(scheduleHtml(slots, options), 'conference-schedule')
}
export function printSchedule(slots, options) {
 return printDocument(scheduleHtml(slots, options))
}
