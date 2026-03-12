import { FINANCIAL_YEARS, DONE_STATUSES, PENDING_AT_CLIENT, HOLD_REFUSED, DONE_NIL, DONE_PROPER, ACCOUNTING_MONTH_DONE } from '../constants.js'

export const TODAY = (() => { const d=new Date(); d.setHours(0,0,0,0); return d })()
export const parseDt  = s => { if(!s) return null; const d=new Date(s); d.setHours(0,0,0,0); return d }
export const daysDiff = s => { const d=parseDt(s); return d ? Math.ceil((d-TODAY)/864e5) : null }
export const fmtDate  = s => { if(!s) return '—'; return parseDt(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) }
export const fmtDateTime = s => {
  if(!s) return '—'
  const d = s&&s.toDate ? s.toDate() : new Date(s)
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
}

// Urgency bucket (Kanban 2 / dashboard)
export const getBucket = t => {
  const st = t.status
  if (st==='dropped') return 'dropped'
  if (DONE_STATUSES.includes(st)||DONE_NIL.includes(st)||DONE_PROPER.includes(st)) return 'done'
  if (HOLD_REFUSED.includes(st)) return 'hold'
  const d = daysDiff(t.dueDate)
  if (d===null) return 'others'
  if (d<0)  return 'overdue'
  if (d===0) return 'today'
  if (d<=3)  return 'soon3'
  if (d<=7)  return 'soon7'
  if (d<=31) return 'this_month'
  return 'others'
}

// Status Kanban column for a task
export const getStatusKanbanCol = t => {
  const st = t.status
  if (DONE_PROPER.includes(st))  return 'done'
  if (DONE_NIL.includes(st))     return 'done_nil'
  if (HOLD_REFUSED.includes(st)) return 'hold_refused'
  if (PENDING_AT_CLIENT.includes(st)) return 'pending_client'
  const d = daysDiff(t.dueDate)
  if (d!==null && d<0) return 'ongoing_overdue'
  return 'ongoing_clean'
}

export const isTaskPending = t =>
  !DONE_STATUSES.includes(t.status) && !DONE_NIL.includes(t.status) &&
  !DONE_PROPER.includes(t.status) && t.status!=='dropped'

// Dynamic FY list: merges DB values from tasks + static base list, sorted
export const getFYOptions = (tasks = []) => {
  const fromDB = (tasks || []).map(t => t.fy).filter(Boolean)
  const merged = [...new Set([...FINANCIAL_YEARS, ...fromDB])]
  return merged.sort()
}
