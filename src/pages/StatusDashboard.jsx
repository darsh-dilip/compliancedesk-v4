import { useState, useMemo } from 'react'
import { getServiceStatuses, SERVICE_STATUSES, DONE_STATUSES, DONE_NIL, DONE_PROPER } from '../constants.js'
import { getVisibleUserIds } from '../utils/hierarchy.js'
import { Avatar } from '../components/UI.jsx'

const REPORTABLE_SERVICES = [
  'GSTR-1','GSTR-1 (Quarterly)',
  'GSTR-3B','GSTR-3B (Quarterly)',
  'GSTR-2B Reconciliation',
  'Income Tax Filing',
  'Accounting',
  'TDS Payment','TDS Return 24Q','TDS Return 26Q',
  'PT Payment (Maharashtra)','PT Return (Maharashtra)',
  'PT Payment (Karnataka)','PT Return (Karnataka)',
  'Advance Tax',
]

const MONTHS_FY = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']
const QUARTERS  = ['Q1 (Apr–Jun)','Q2 (Jul–Sep)','Q3 (Oct–Dec)','Q4 (Jan–Mar)']
const FYS       = ['2024-25','2025-26','2026-27']

const allDone = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]

function getPeriods(svc, fy) {
  if (!svc) return []
  const isMonthly = ['GSTR-1','GSTR-3B','GSTR-2B Reconciliation','TDS Payment',
    'PT Payment (Maharashtra)'].includes(svc)
  const isQuarterly = ['GSTR-1 (Quarterly)','GSTR-3B (Quarterly)',
    'TDS Return 24Q','TDS Return 26Q','Advance Tax'].includes(svc)
  const isAnnual = ['Income Tax Filing','Accounting','GSTR-9 Annual Return',
    'PT Return (Maharashtra)','PT Payment (Karnataka)','PT Return (Karnataka)'].includes(svc)

  const fyS = parseInt(fy)
  if (isMonthly) {
    return MONTHS_FY.map((m,i) => {
      const yr = i < 9 ? fyS : fyS+1
      return `${m} ${yr}`
    })
  }
  if (isQuarterly) return QUARTERS
  if (isAnnual) {
    if (svc === 'Income Tax Filing') return [`AY ${fyS+1}-${String(fyS+2).slice(2)}`]
    return [`FY ${fy}`]
  }
  return []
}

export const StatusDashboard = ({ tasks, users, user }) => {
  const [selSvc,    setSelSvc]    = useState('')
  const [selPeriod, setSelPeriod] = useState('')
  const [selFY,     setSelFY]     = useState('2025-26')
  const [drill,     setDrill]     = useState(null) // {member, status, tasks}

  const visibleIds = useMemo(() => getVisibleUserIds(user, users), [user, users])
  const visibleMembers = useMemo(() =>
    users.filter(u => visibleIds.includes(u.id) && u.role !== 'partner')
  , [users, visibleIds])

  const periods  = getPeriods(selSvc, selFY)
  const statuses = selSvc ? getServiceStatuses(selSvc) : []

  // Filter tasks for selected service + period
  const filtered = useMemo(() => {
    if (!selSvc) return []
    return tasks.filter(t =>
      t.service === selSvc &&
      t.fy === selFY &&
      (selPeriod ? t.period === selPeriod : true) &&
      visibleIds.includes(t.assignedTo)
    )
  }, [tasks, selSvc, selFY, selPeriod, visibleIds])

  // Build matrix: member → { status → count }
  const matrix = useMemo(() => {
    const m = {}
    visibleMembers.forEach(u => {
      m[u.id] = { _total: 0, _blank: 0, _updated: 0 }
      statuses.forEach(s => { m[u.id][s.v] = 0 })
    })
    filtered.forEach(t => {
      if (!m[t.assignedTo]) return
      const st = t.status || 'pending'
      if (m[t.assignedTo][st] !== undefined) m[t.assignedTo][st]++
      m[t.assignedTo]._total++
      if (st === 'pending') m[t.assignedTo]._blank++
      else m[t.assignedTo]._updated++
    })
    return m
  }, [filtered, visibleMembers, statuses])

  // Column totals
  const colTotals = useMemo(() => {
    const totals = { _total: 0, _blank: 0, _updated: 0 }
    statuses.forEach(s => { totals[s.v] = 0 })
    visibleMembers.forEach(u => {
      if (!matrix[u.id]) return
      statuses.forEach(s => { totals[s.v] = (totals[s.v]||0) + (matrix[u.id][s.v]||0) })
      totals._total += matrix[u.id]._total || 0
      totals._blank += matrix[u.id]._blank || 0
      totals._updated += matrix[u.id]._updated || 0
    })
    return totals
  }, [matrix, visibleMembers, statuses])

  const openDrill = (memberId, statusV) => {
    const member = users.find(u => u.id === memberId)
    const drillTasks = filtered.filter(t =>
      t.assignedTo === memberId && t.status === statusV
    )
    setDrill({ member, status: statuses.find(s=>s.v===statusV), tasks: drillTasks })
  }

  const CellNum = ({ count, onClick, color }) => {
    if (!count) return <td style={{ textAlign:'center',padding:'8px 6px',color:'var(--text3)',fontSize:12 }}>—</td>
    return (
      <td onClick={onClick} style={{ textAlign:'center',padding:'8px 6px',cursor:onClick?'pointer':'default',fontWeight:700,fontSize:13,color:color||'var(--text)',background:onClick?'var(--surface3)':undefined,borderRadius:4 }}>
        <span style={{ display:'inline-block',minWidth:22,padding:'2px 6px',borderRadius:4,background:color?`${color}18`:undefined,color:color||'var(--text)' }}>{count}</span>
      </td>
    )
  }

  return (
    <div className="fade-up" style={{ padding:'24px 28px' }}>
      <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4 }}>📈 Status Reports</div>
      <div style={{ fontSize:13,color:'var(--text2)',marginBottom:20 }}>Per-member status count — like your Excel tracker</div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap',alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:6,textTransform:'uppercase' }}>Financial Year</div>
          <select value={selFY} onChange={e=>{ setSelFY(e.target.value); setSelPeriod('') }} style={{ minWidth:120 }}>
            {FYS.map(f=><option key={f} value={f}>FY {f}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:6,textTransform:'uppercase' }}>Service</div>
          <select value={selSvc} onChange={e=>{ setSelSvc(e.target.value); setSelPeriod('') }} style={{ minWidth:220 }}>
            <option value="">-- Select Service --</option>
            {REPORTABLE_SERVICES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {periods.length > 0 && (
          <div>
            <div style={{ fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:6,textTransform:'uppercase' }}>Period</div>
            <select value={selPeriod} onChange={e=>setSelPeriod(e.target.value)} style={{ minWidth:180 }}>
              <option value="">All Periods</option>
              {periods.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
      </div>

      {!selSvc && (
        <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>
          <div style={{ fontSize:32,marginBottom:12 }}>📊</div>
          <div>Select a service to view the status report</div>
        </div>
      )}

      {selSvc && (
        <>
          {/* Summary chips */}
          <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
            <span style={{ background:'#5b8dee15',color:'#5b8dee',border:'1px solid #5b8dee30',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600 }}>
              Total Tasks: {filtered.length}
            </span>
            <span style={{ background:'#f59e0b15',color:'#f59e0b',border:'1px solid #f59e0b30',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600 }}>
              Blanks (Pending): {colTotals._blank}
            </span>
            <span style={{ background:'#22c55e15',color:'#22c55e',border:'1px solid #22c55e30',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600 }}>
              Updated: {colTotals._updated}
            </span>
            {filtered.length > 0 && (
              <span style={{ background:'#8892b015',color:'#8892b0',border:'1px solid #8892b030',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600 }}>
                Completion: {Math.round(filtered.filter(t=>allDone.includes(t.status)).length/filtered.length*100)}%
              </span>
            )}
          </div>

          {/* Main table */}
          <div style={{ overflowX:'auto',borderRadius:12,border:'1px solid var(--border)' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--surface2)' }}>
                  <th style={{ padding:'10px 14px',textAlign:'left',fontWeight:700,color:'var(--text)',position:'sticky',left:0,background:'var(--surface2)',zIndex:2,borderRight:'1px solid var(--border)',minWidth:160 }}>
                    Team Member
                  </th>
                  <th style={{ padding:'10px 8px',textAlign:'center',fontWeight:700,color:'var(--text3)',minWidth:70 }}>Total</th>
                  <th style={{ padding:'10px 8px',textAlign:'center',fontWeight:700,color:'#f59e0b',minWidth:70 }}>Blanks</th>
                  <th style={{ padding:'10px 8px',textAlign:'center',fontWeight:700,color:'#22c55e',minWidth:70 }}>Updated</th>
                  {statuses.map(s => (
                    <th key={s.v} style={{ padding:'10px 6px',textAlign:'center',fontWeight:700,color:s.c,minWidth:80,borderLeft:'1px solid var(--border)' }}>
                      <div style={{ whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:100 }} title={s.l}>{s.l}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((u,ri) => {
                  const row = matrix[u.id] || {}
                  return (
                    <tr key={u.id} style={{ borderTop:'1px solid var(--border)',background:ri%2===0?'var(--surface)':'var(--surface2)' }}>
                      <td style={{ padding:'8px 14px',position:'sticky',left:0,background:ri%2===0?'var(--surface)':'var(--surface2)',zIndex:1,borderRight:'1px solid var(--border)' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <Avatar name={u.name} init={u.init} role={u.role} sz={26}/>
                          <div>
                            <div style={{ fontWeight:600,color:'var(--text)',fontSize:12 }}>{u.name}</div>
                            <div style={{ fontSize:10,color:'var(--text3)' }}>{u.role}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign:'center',padding:'8px 6px',fontWeight:700,color:'var(--text)',fontSize:13 }}>{row._total||0}</td>
                      <td style={{ textAlign:'center',padding:'8px 6px',fontWeight:row._blank>0?700:400,color:row._blank>0?'#f59e0b':'var(--text3)',fontSize:13 }}>{row._blank||0}</td>
                      <td style={{ textAlign:'center',padding:'8px 6px',fontWeight:row._updated>0?700:400,color:row._updated>0?'#22c55e':'var(--text3)',fontSize:13 }}>{row._updated||0}</td>
                      {statuses.map(s => (
                        <CellNum
                          key={s.v}
                          count={row[s.v]||0}
                          color={s.done ? '#22c55e' : s.c}
                          onClick={row[s.v]>0 ? ()=>openDrill(u.id, s.v) : undefined}
                        />
                      ))}
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr style={{ borderTop:'2px solid var(--border)',background:'var(--surface3)',fontWeight:700 }}>
                  <td style={{ padding:'10px 14px',position:'sticky',left:0,background:'var(--surface3)',zIndex:1,borderRight:'1px solid var(--border)',fontWeight:700,color:'var(--text)',fontSize:12 }}>
                    TOTALS
                  </td>
                  <td style={{ textAlign:'center',padding:'10px 6px',fontWeight:800,color:'var(--text)',fontSize:13 }}>{colTotals._total}</td>
                  <td style={{ textAlign:'center',padding:'10px 6px',fontWeight:800,color:'#f59e0b',fontSize:13 }}>{colTotals._blank}</td>
                  <td style={{ textAlign:'center',padding:'10px 6px',fontWeight:800,color:'#22c55e',fontSize:13 }}>{colTotals._updated}</td>
                  {statuses.map(s => (
                    <td key={s.v} style={{ textAlign:'center',padding:'10px 6px',fontWeight:colTotals[s.v]>0?800:400,color:colTotals[s.v]>0?(s.done?'#22c55e':s.c):'var(--text3)',fontSize:13 }}>
                      {colTotals[s.v]||0}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Drill-down modal */}
          {drill && (
            <div onClick={()=>setDrill(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.72)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
              <div onClick={e=>e.stopPropagation()} className="fade-up" style={{ background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:16,width:'100%',maxWidth:560,maxHeight:'80vh',overflow:'auto' }}>
                <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'var(--surface)' }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:15,color:'var(--text)' }}>{drill.member?.name}</div>
                    <div style={{ fontSize:12,color:'var(--text2)',marginTop:2 }}>
                      {selSvc} · <span style={{ color:drill.status?.c }}>{drill.status?.l}</span> · {drill.tasks.length} task{drill.tasks.length!==1?'s':''}
                    </div>
                  </div>
                  <button onClick={()=>setDrill(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:18 }}>✕</button>
                </div>
                <div style={{ padding:16 }}>
                  {drill.tasks.map(t => (
                    <div key={t.id} style={{ background:'var(--surface2)',borderRadius:8,padding:'10px 14px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:600,fontSize:13,color:'var(--text)' }}>{t.clientName}</div>
                        <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>{t.period} · Due {t.dueDate||'—'}</div>
                      </div>
                      {(t.arn||t.ref) && (
                        <div style={{ fontSize:11,color:'var(--success)',fontFamily:'monospace' }}>{t.arn||t.ref}</div>
                      )}
                    </div>
                  ))}
                  {!drill.tasks.length && <div style={{ textAlign:'center',padding:20,color:'var(--text3)' }}>No tasks.</div>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
