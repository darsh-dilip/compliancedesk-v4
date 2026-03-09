import { useMemo, useState } from 'react'
import { getStatusObj, DONE_STATUSES, DONE_NIL, DONE_PROPER } from '../constants.js'
import { getVisibleUserIds } from '../utils/hierarchy.js'

const MONTHS_FY   = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']
const QUARTERS    = ['Q1 (Apr–Jun)','Q2 (Jul–Sep)','Q3 (Oct–Dec)','Q4 (Jan–Mar)']
const FYS         = ['2024-25','2025-26','2026-27']
const allDone     = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]

const StatusChip = ({ service, status, compact=false }) => {
  if (!status) return <span style={{ color:'var(--text3)',fontSize:11 }}>—</span>
  const st = getStatusObj(service, status)
  const isDone = allDone.includes(status)
  return (
    <span style={{
      display:'inline-block',
      padding: compact ? '2px 5px' : '3px 7px',
      borderRadius:4,
      fontSize: compact ? 9 : 10,
      fontWeight:700,
      background:st.bg,
      color:st.c,
      border:`1px solid ${st.c}30`,
      whiteSpace:'nowrap',
      maxWidth: compact ? 80 : 100,
      overflow:'hidden',
      textOverflow:'ellipsis',
    }} title={st.l}>{st.l}</span>
  )
}

// TDS Payment Matrix (client × month)
const TDSPaymentMatrix = ({ tasks, clients, users, fy, onTask }) => {
  const [selAssignee, setSelAssignee] = useState('')
  const fyS = parseInt(fy)

  const monthLabels = MONTHS_FY.map((m,i) => {
    const yr = i < 9 ? fyS : fyS+1
    return { label:`${m} ${yr}`, period:`${m} ${yr}` }
  })

  const tdsClients = useMemo(() => {
    let pmtTasks = tasks.filter(t => t.service==='TDS Payment' && t.fy===fy)
    if (selAssignee) pmtTasks = pmtTasks.filter(t => t.assignedTo===selAssignee)
    const cIds = [...new Set(pmtTasks.map(t=>t.clientId))]
    return cIds.map(cid => {
      const cl = clients.find(c=>c.id===cid)
      const byMonth = {}
      monthLabels.forEach(({period}) => {
        const t = pmtTasks.find(x=>x.clientId===cid && x.period===period)
        byMonth[period] = t || null
      })
      return { client:cl, byMonth, assignedTo: pmtTasks.find(x=>x.clientId===cid)?.assignedTo }
    }).filter(x=>x.client)
  }, [tasks, clients, fy, selAssignee])

  const assignees = useMemo(() => {
    const ids = [...new Set(tasks.filter(t=>t.service==='TDS Payment'&&t.fy===fy).map(t=>t.assignedTo))]
    return users.filter(u=>ids.includes(u.id))
  }, [tasks, users, fy])

  const colSummary = useMemo(() => {
    const s = {}
    monthLabels.forEach(({period}) => {
      const col = tdsClients.map(r=>r.byMonth[period]).filter(Boolean)
      s[period] = { done: col.filter(t=>allDone.includes(t.status)).length, total: col.length }
    })
    return s
  }, [tdsClients, monthLabels])

  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
        <div style={{ fontSize:15,fontWeight:700,color:'var(--text)' }}>💰 TDS Payment — Monthly</div>
        <select value={selAssignee} onChange={e=>setSelAssignee(e.target.value)} style={{ fontSize:12,padding:'4px 8px' }}>
          <option value="">All Members</option>
          {assignees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <span style={{ fontSize:12,color:'var(--text3)' }}>{tdsClients.length} clients</span>
      </div>

      {!tdsClients.length ? (
        <div style={{ padding:20,textAlign:'center',color:'var(--text3)',fontSize:13 }}>No TDS payment tasks found for FY {fy}</div>
      ) : (
        <div style={{ overflowX:'auto',borderRadius:12,border:'1px solid var(--border)' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                <th style={{ padding:'8px 12px',textAlign:'left',fontWeight:700,color:'var(--text)',position:'sticky',left:0,background:'var(--surface2)',zIndex:2,borderRight:'1px solid var(--border)',minWidth:160 }}>Client</th>
                {monthLabels.map(({label,period}) => {
                  const s = colSummary[period]||{}
                  const allDoneCol = s.done===s.total && s.total>0
                  return (
                    <th key={period} style={{ padding:'6px 4px',textAlign:'center',minWidth:80,borderLeft:'1px solid var(--border)',color:allDoneCol?'#22c55e':'var(--text)',fontWeight:700 }}>
                      <div>{label}</div>
                      {s.total>0&&<div style={{ fontSize:9,fontWeight:500,color:allDoneCol?'#22c55e':'var(--text3)',marginTop:2 }}>{s.done}/{s.total}</div>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {tdsClients.map(({client,byMonth},ri) => (
                <tr key={client.id} style={{ borderTop:'1px solid var(--border)',background:ri%2===0?'var(--surface)':'var(--surface2)' }}>
                  <td style={{ padding:'7px 12px',position:'sticky',left:0,background:ri%2===0?'var(--surface)':'var(--surface2)',zIndex:1,borderRight:'1px solid var(--border)' }}>
                    <div style={{ fontWeight:600,color:'var(--text)',fontSize:12 }}>{client.name}</div>
                  </td>
                  {monthLabels.map(({period}) => {
                    const t = byMonth[period]
                    return (
                      <td key={period} onClick={()=>t&&onTask&&onTask(t)} style={{ textAlign:'center',padding:'5px 4px',borderLeft:'1px solid var(--border)',cursor:t?'pointer':'default' }}>
                        {t ? <StatusChip service="TDS Payment" status={t.status} compact/> : <span style={{ color:'var(--text3)',fontSize:10 }}>—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// TDS Return Matrix (client × quarter, split 24Q / 26Q)
const TDSReturnMatrix = ({ tasks, clients, users, fy, onTask }) => {
  const [selAssignee, setSelAssignee] = useState('')
  const [selForm,     setSelForm]     = useState('both') // 'both' | '24Q' | '26Q'

  const forms  = selForm==='both' ? ['TDS Return 24Q','TDS Return 26Q'] : [`TDS Return ${selForm}`]
  const cols   = []
  forms.forEach(f => QUARTERS.forEach(q => cols.push({ form:f, quarter:q, label:`${f.replace('TDS Return ','')}\n${q}` })))

  const returnClients = useMemo(() => {
    let retTasks = tasks.filter(t => (t.service==='TDS Return 24Q'||t.service==='TDS Return 26Q') && t.fy===fy)
    if (selAssignee) retTasks = retTasks.filter(t => t.assignedTo===selAssignee)
    const cIds = [...new Set(retTasks.map(t=>t.clientId))]
    return cIds.map(cid => {
      const cl = clients.find(c=>c.id===cid)
      const byKey = {}
      cols.forEach(({form,quarter}) => {
        const t = retTasks.find(x=>x.clientId===cid && x.service===form && x.period===quarter)
        byKey[`${form}__${quarter}`] = t || null
      })
      return { client:cl, byKey }
    }).filter(x=>x.client)
  }, [tasks, clients, fy, selAssignee, selForm])

  const assignees = useMemo(() => {
    const ids = [...new Set(tasks.filter(t=>(t.service==='TDS Return 24Q'||t.service==='TDS Return 26Q')&&t.fy===fy).map(t=>t.assignedTo))]
    return users.filter(u=>ids.includes(u.id))
  }, [tasks, users, fy])

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12,flexWrap:'wrap' }}>
        <div style={{ fontSize:15,fontWeight:700,color:'var(--text)' }}>📋 TDS Returns — Quarterly</div>
        <div style={{ display:'flex',gap:4 }}>
          {[['both','24Q + 26Q'],['24Q','24Q Only'],['26Q','26Q Only']].map(([v,l])=>(
            <button key={v} onClick={()=>setSelForm(v)} style={{ padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid var(--border2)',background:selForm===v?'var(--surface3)':'transparent',color:selForm===v?'var(--text)':'var(--text3)' }}>{l}</button>
          ))}
        </div>
        <select value={selAssignee} onChange={e=>setSelAssignee(e.target.value)} style={{ fontSize:12,padding:'4px 8px' }}>
          <option value="">All Members</option>
          {assignees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <span style={{ fontSize:12,color:'var(--text3)' }}>{returnClients.length} clients</span>
      </div>

      {!returnClients.length ? (
        <div style={{ padding:20,textAlign:'center',color:'var(--text3)',fontSize:13 }}>No TDS return tasks found for FY {fy}</div>
      ) : (
        <div style={{ overflowX:'auto',borderRadius:12,border:'1px solid var(--border)' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                <th style={{ padding:'8px 12px',textAlign:'left',fontWeight:700,color:'var(--text)',position:'sticky',left:0,background:'var(--surface2)',zIndex:2,borderRight:'1px solid var(--border)',minWidth:160 }}>Client</th>
                {cols.map(({form,quarter,label},i) => (
                  <th key={i} style={{ padding:'6px 6px',textAlign:'center',minWidth:90,borderLeft:'1px solid var(--border)',color:'var(--text)',fontWeight:700,lineHeight:1.3 }}>
                    <div style={{ fontSize:10,color:'var(--accent)',fontWeight:700 }}>{form.replace('TDS Return ','')}</div>
                    <div style={{ fontSize:9,color:'var(--text3)' }}>{quarter.split('(')[1]?.replace(')','').trim()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returnClients.map(({client,byKey},ri) => (
                <tr key={client.id} style={{ borderTop:'1px solid var(--border)',background:ri%2===0?'var(--surface)':'var(--surface2)' }}>
                  <td style={{ padding:'7px 12px',position:'sticky',left:0,background:ri%2===0?'var(--surface)':'var(--surface2)',zIndex:1,borderRight:'1px solid var(--border)' }}>
                    <div style={{ fontWeight:600,color:'var(--text)',fontSize:12 }}>{client.name}</div>
                  </td>
                  {cols.map(({form,quarter},i) => {
                    const key = `${form}__${quarter}`
                    const t = byKey[key]
                    return (
                      <td key={i} onClick={()=>t&&onTask&&onTask(t)} style={{ textAlign:'center',padding:'5px 4px',borderLeft:'1px solid var(--border)',cursor:t?'pointer':'default' }}>
                        {t ? <StatusChip service={form} status={t.status} compact/> : <span style={{ color:'var(--text3)',fontSize:10 }}>—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────
export const DashboardTDS = ({ tasks, clients, users, user, onTask }) => {
  const [fy, setFY] = useState('2025-26')

  const visibleIds = useMemo(() => getVisibleUserIds(user, users), [user, users])
  const visibleTasks    = tasks.filter(t => visibleIds.includes(t.assignedTo))
  const visibleClients  = clients.filter(c => visibleIds.includes(c.assignedTo))

  const paymentCount = tasks.filter(t=>t.service==='TDS Payment'&&t.fy===fy&&visibleIds.includes(t.assignedTo)).length
  const returnCount  = tasks.filter(t=>(t.service==='TDS Return 24Q'||t.service==='TDS Return 26Q')&&t.fy===fy&&visibleIds.includes(t.assignedTo)).length
  const donePayment  = tasks.filter(t=>t.service==='TDS Payment'&&t.fy===fy&&visibleIds.includes(t.assignedTo)&&allDone.includes(t.status)).length
  const doneReturn   = tasks.filter(t=>(t.service==='TDS Return 24Q'||t.service==='TDS Return 26Q')&&t.fy===fy&&visibleIds.includes(t.assignedTo)&&allDone.includes(t.status)).length

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:1200 }}>
      <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20,fontWeight:800,color:'var(--text)' }}>💰 TDS & Accounting Dashboard</div>
          <div style={{ fontSize:13,color:'var(--text2)',marginTop:4 }}>Monthly payments + quarterly return filings</div>
        </div>
        <select value={fy} onChange={e=>setFY(e.target.value)}>
          {FYS.map(f=><option key={f} value={f}>FY {f}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24 }}>
        {[
          { label:'TDS Payments', value:paymentCount, done:donePayment, color:'#5b8dee' },
          { label:'TDS Returns (24Q+26Q)', value:returnCount, done:doneReturn, color:'#818cf8' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:24,fontWeight:800,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginTop:2 }}>{s.label}</div>
            {s.value>0 && (
              <div style={{ fontSize:11,color:'var(--text3)',marginTop:4 }}>
                {s.done} done · {s.value-s.done} pending ({Math.round(s.done/s.value*100)}%)
              </div>
            )}
          </div>
        ))}
      </div>

      <TDSPaymentMatrix tasks={visibleTasks} clients={visibleClients} users={users} fy={fy} onTask={onTask}/>
      <TDSReturnMatrix  tasks={visibleTasks} clients={visibleClients} users={users} fy={fy} onTask={onTask}/>
    </div>
  )
}
