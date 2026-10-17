// Client-only "Add to calendar" file. Times are written in UTC, so every calendar app shows the correct local time.
const stamp = iso => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n')
export function buildIcs({id, start_at, end_at, room, period}, now = new Date()) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//English Conferences//Scheduler//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${id}@english-conferences`, `DTSTAMP:${stamp(now.toISOString())}`, `DTSTART:${stamp(start_at)}`, `DTEND:${stamp(end_at)}`,
    `SUMMARY:${esc('English writing conference')}`, `LOCATION:${esc('Room ' + room)}`, `DESCRIPTION:${esc('Period ' + period + '. Bring the piece of writing you want to revise.')}`,
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Writing conference soon', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n'
}
