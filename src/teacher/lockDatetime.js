// Browser-local schedule form helpers. Server timestamps remain ISO UTC.
export function toDatetimeLocal(value) {
 if (!value) return ''
 const d = new Date(value)
 if (!Number.isFinite(d.getTime())) return ''
 // The offset belongs to the TARGET date, so DST changes are handled correctly.
 return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
export function toIsoOrNull(value) {
 if (!value) return null
 const d = new Date(value)
 return Number.isFinite(d.getTime()) ? d.toISOString() : null
}
export function lockScheduleError(start, until, {immediate = false, nowMs = Date.now()} = {}) {
 if (start && !toIsoOrNull(start)) return 'Choose a valid scheduled start time.'
 if (until && !toIsoOrNull(until)) return 'Choose a valid reopening time.'
 if (immediate && until && new Date(until).getTime() <= nowMs) return 'To lock now, choose a reopening time in the future.'
 if (start && until && new Date(until).getTime() <= new Date(start).getTime() && !immediate) return 'Reopening must be after the scheduled lock start.'
 return ''
}

/** Mirrors the database's is_locked() rule for teacher indicators. */
export function studentSiteLocked(cfg, nowMs = Date.now()) {
 if (!cfg) return false
 const scheduled = cfg.lock_from && new Date(cfg.lock_from).getTime() <= nowMs &&
  (!cfg.lock_until || new Date(cfg.lock_until).getTime() > nowMs)
 const editing = cfg.edit_lock_until && new Date(cfg.edit_lock_until).getTime() > nowMs
 return Boolean(cfg.locked || scheduled || editing)
}
