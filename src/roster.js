// Roster helpers (pure). PRIVACY IS ENFORCED IN THE DATABASE (list_roster / admin functions in migration 003). These helpers only present what the server already allowed.
import {ymd} from './lib.js'
export const HIDDEN_LABEL = 'Reserved \u2014 name hidden'
export const CONSENT_LABEL = 'Allow my display name to appear on the class conference roster.'

/** What a student row shows. display_name is null whenever the server withheld it; we never try to guess or fill it in. */
export const publicName = r => (r.display_name && !r.name_hidden ? r.display_name : HIDDEN_LABEL)
export function rosterGroups(rows, tz) {
  const g = new Map()
  for (const r of rows || []) { const d = ymd(r.start_at, tz); if (!g.has(d)) g.set(d, []); g.get(d).push({...r, label: publicName(r)}) }
  return [...g.entries()].map(([date, items]) => ({date, items}))
}

/** Teacher-side status of one booking. Mirrors the SQL rule: public = roster on AND consent AND not hidden by the teacher. */
export function rosterStatus(b, rosterOn) {
  if (b.name_hidden) return 'hidden'
  if (!b.roster_consent) return 'no_consent'
  return rosterOn ? 'public' : 'consented'
}
export const ROSTER_LABEL = {public: 'Public', hidden: 'Hidden by you', no_consent: 'No consent (private)', consented: 'Consented (roster is off)'}
export const ROSTER_TONE = {public: 'amber', hidden: 'slate', no_consent: 'slate', consented: 'peri'}
export const ROSTER_FILTERS = [['all', 'All'], ['public', 'Public'], ['hidden', 'Hidden'], ['no_consent', 'No consent'], ['consented', 'Consented']]
export const filterRoster = (books, flt, rosterOn) => flt === 'all' ? books : books.filter(b => rosterStatus(b, rosterOn) === flt)
/** Can the teacher make this name public? Never: the teacher can only hide or un-hide. Un-hiding exposes nothing without consent. */
export const unhideExposes = b => Boolean(b.roster_consent)
