import {STATUS_LABEL} from '../realtime.js'
const HINT = {
  live: 'Changes appear as they happen.',
  connecting: 'Opening the live connection. Showing the latest data fetched.',
  syncing: 'Catching up with the latest changes.',
  reconnecting: 'Live connection lost. Checking for changes every few seconds instead.',
  offline: 'No internet connection. What you see may be out of date.'
}
/** Small status pill. Never says "Live" unless the live channel is subscribed AND a fetch since then succeeded. */
export default function LiveBadge({status = 'connecting', className = ''}) {
  const s = STATUS_LABEL[status] ? status : 'connecting'
  return <span className={`live-badge ${s} ${className}`.trim()} role="status" aria-live="polite" title={HINT[s]}>
    <i aria-hidden="true" /><span>{STATUS_LABEL[s]}</span><span className="vh">. {HINT[s]}</span></span>
}
