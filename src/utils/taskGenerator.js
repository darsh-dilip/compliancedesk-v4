import { MONTHS } from '../constants.js'

const clamp = (y, m, d) => {
  const dt = new Date(y, m, Math.min(d, new Date(y, m+1, 0).getDate()))
  return dt.toISOString().split('T')[0]
}
const nextMon = (m, y) => ({ m:(m+1)%12, y:m===11?y+1:y })
const fyMon   = (i, fyS) => ({ m:(3+i)%12, y:i<9?fyS:fyS+1 })
const ymStr   = (y, m) => `${y}-${String(m+1).padStart(2,'0')}` // YYYY-MM

export const generateTasks = (client, assignedTo, fy='2025-26', complianceStartYM=null) => {
  const tasks = []
  const fyS = parseInt(fy)
  const fyE = fyS + 1
  const now = new Date().toISOString()

  const task = (service, period, dueDate, periodYM, extra={}) => {
    // Filter by compliance start month
    if (complianceStartYM && periodYM && periodYM < complianceStartYM) return null
    return {
      clientId:client.id, clientName:client.name, service, period, dueDate,
      assignedTo, status:'pending', statusNote:'', arn:'', ref:'',
      comments:[], history:[], fy, periodYM: periodYM||'',
      isAdhoc: false, createdAt:now, updatedAt:now, ...extra,
    }
  }
  const push = t => { if (t) tasks.push(t) }

  // ── GST ────────────────────────────────────────────────────
  if (client.gstApplicable) {
    if (client.gstFreq === 'monthly') {
      for (let i=0;i<12;i++) {
        const {m,y}=fyMon(i,fyS); const nm=nextMon(m,y)
        const period=`${MONTHS[m]} ${y}`; const pym=ymStr(y,m)
        push(task('GSTR-1',period,clamp(nm.y,nm.m,11),pym))
        push(task('GSTR-3B',period,clamp(nm.y,nm.m,20),pym))
      }
    } else {
      [{p:'Q1 (Apr–Jun)',pm:3,dy:fyS,dm:6},{p:'Q2 (Jul–Sep)',pm:6,dy:fyS,dm:9},
       {p:'Q3 (Oct–Dec)',pm:9,dy:fyE,dm:0},{p:'Q4 (Jan–Mar)',pm:0,dy:fyE,dm:3}].forEach(q=>{
        const pym=`${q.dm<3?fyE:fyS}-${String(q.pm+1).padStart(2,'0')}`
        push(task('GSTR-1 (Quarterly)',q.p,clamp(q.dy,q.dm,13),pym))
        push(task('GSTR-3B (Quarterly)',q.p,clamp(q.dy,q.dm,22),pym))
      })
    }
    push(task('GSTR-9 Annual Return',`FY ${fy}`,clamp(fyE,11,31),`${fyE}-04`))
  }

  // ── TDS ────────────────────────────────────────────────────
  if (client.tdsApplicable) {
    for (let i=0;i<12;i++) {
      const {m,y}=fyMon(i,fyS); const nm=nextMon(m,y)
      const pym = ymStr(y,m)
      const due = m===2 ? clamp(fyE,3,30) : clamp(nm.y,nm.m,7)
      push(task('TDS Payment',`${MONTHS[m]} ${y}`,due,pym))
    }
    // 24Q and 26Q — quarterly
    [{p:'Q1 (Apr–Jun)',pym:`${fyS}-04`,d:clamp(fyS,6,31)},
     {p:'Q2 (Jul–Sep)',pym:`${fyS}-07`,d:clamp(fyS,9,31)},
     {p:'Q3 (Oct–Dec)',pym:`${fyS}-10`,d:clamp(fyE,0,31)},
     {p:'Q4 (Jan–Mar)',pym:`${fyE}-01`,d:clamp(fyE,4,31)}].forEach(r=>{
      push(task('TDS Return 24Q',r.p,r.d,r.pym))
      push(task('TDS Return 26Q',r.p,r.d,r.pym))
    })
  }

  // ── PT Maharashtra ─────────────────────────────────────────
  if (client.ptMH) {
    for (let i=0;i<12;i++) {
      const {m,y}=fyMon(i,fyS)
      push(task('PT Payment (Maharashtra)',`${MONTHS[m]} ${y}`,clamp(y,m,31),ymStr(y,m)))
    }
    push(task('PT Return (Maharashtra)',`FY ${fy}`,clamp(fyE,2,31),`${fyS}-04`))
  }

  // ── PT Karnataka ───────────────────────────────────────────
  if (client.ptKA) {
    push(task('PT Payment (Karnataka)',`FY ${fy}`,clamp(fyS,3,30),`${fyS}-04`))
    push(task('PT Return (Karnataka)',`FY ${fy}`,clamp(fyS,3,30),`${fyS}-04`))
  }

  // ── Income Tax ─────────────────────────────────────────────
  if (client.itApplicable) {
    const ay = `AY ${fyE}-${String(fyE+1).slice(2)}`
    push(task('Income Tax Filing',ay,
      client.auditCase?clamp(fyE,9,31):clamp(fyE,6,31),`${fyE}-04`))
  }

  // ── Advance Tax ────────────────────────────────────────────
  if (client.advanceTax) {
    [{p:'1st Instalment (15%)',d:clamp(fyS,5,15),pym:`${fyS}-06`},
     {p:'2nd Instalment (45%)',d:clamp(fyS,8,15),pym:`${fyS}-09`},
     {p:'3rd Instalment (75%)',d:clamp(fyS,11,15),pym:`${fyS}-12`},
     {p:'4th Instalment (100%)',d:clamp(fyE,2,15),pym:`${fyE}-03`}].forEach(a=>{
      push(task('Advance Tax',a.p,a.d,a.pym))
    })
  }

  // ── Accounting — SINGLE TASK per FY ────────────────────────
  if (client.accounting) {
    push(task('Accounting',`FY ${fy}`,clamp(fyE,8,30),`${fyS}-04`))
  }

  // ── Onboarding Call ────────────────────────────────────────
  // Auto-created for every client, due 2 days from today (skip weekends)
  const obDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    if (d.getDay() === 6) d.setDate(d.getDate() + 2) // Sat → Mon
    if (d.getDay() === 0) d.setDate(d.getDate() + 1) // Sun → Mon
    return d.toISOString().split('T')[0]
  })()
  push(task('Onboarding Call', 'Onboarding', obDate, null, { isAdhoc:false }))

  return tasks
}

export const createAdhocTask = ({ clientId, clientName, service, description, assignedTo, dueDate, notes, fy }) => ({
  clientId, clientName, service, period: description||'Ad-hoc',
  dueDate: dueDate||'', assignedTo, status:'pending', statusNote:'',
  arn:'', ref:'', comments:[], history:[], fy: fy||'2025-26',
  periodYM:'', isAdhoc:true, notes:notes||'',
  createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
})
