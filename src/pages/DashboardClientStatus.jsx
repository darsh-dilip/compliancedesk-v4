import { useState, useMemo } from 'react'
import { getStatusObj, DONE_STATUSES, FINANCIAL_YEARS, CLIENT_CATEGORIES, CAT_CLR } from '../constants.js'
import { getBucket, fmtDate , getFYOptions } from '../utils/dates.js'
import { Avatar, PrintButton, PrintHeader, ExcelButton } from '../components/UI.jsx'


const getUrgency = (t) => {
  if (!t.dueDate) return 'Unknown'
  const today = new Date().toISOString().split('T')[0]
  if (t.dueDate < today) return 'Overdue'
  const diff = Math.round((new Date(t.dueDate) - new Date()) / 86400000)
  if (diff <= 3)  return 'Due in 3 days'
  if (diff <= 7)  return 'Due this week'
  if (diff <= 30) return 'Due this month'
  return 'Upcoming'
}

export const DashboardClientStatus = ({ tasks, clients, users, onTask, memberMeta={} }) => {
  const [selClient, setSelClient] = useState('')
  const [fy, setFY] = useState('2026-27')
  const [search, setSearch] = useState('')
  const [fCat,   setFCat]   = useState('')

  const client = clients.find(c => c.id === selClient)
  const assignee = users.find(u => u.id === client?.assignedTo)

  const clientTasks = useMemo(() => {
    if (!selClient) return []
    return tasks.filter(t => t.clientId === selClient && t.fy === fy)
  }, [tasks, selClient, fy])

  // Group by service
  const byService = useMemo(() => {
    const g = {}
    clientTasks.forEach(t => {
      if (!g[t.service]) g[t.service] = []
      g[t.service].push(t)
    })
    return g
  }, [clientTasks])

  const filteredClients = clients.filter(c => {
    if (fCat && c.category !== fCat) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const done   = clientTasks.filter(t => DONE_STATUSES.includes(t.status)).length
  const total  = clientTasks.length
  const overdue = clientTasks.filter(t => getBucket(t) === 'overdue').length

  return (
    <div className="fade-up print-root" style={{ padding:'24px 28px',maxWidth:1100,display:'grid',gridTemplateColumns:'240px 1fr',gap:20 }}>
      {/* Client picker */}
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
          <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',flex:1 }}>Client Wise</div>
          <ExcelButton
            filename={selClient ? `ClientStatus-${client?.name||''}` : 'ClientStatus-All'}
            getData={()=>({
              headers:['Client Name','FY','Task / Service','Period','Due Date','Assigned To','Status','Urgency','Client Category'],
              rows:(selClient ? clientTasks : (tasks||[]).filter(t=>(filteredClients||[]).some(cl=>cl.id===t.clientId))).map(t=>{
                const u=(users||[]).find(u=>u.id===t.assignedTo)
                const cl=(clients||[]).find(c=>c.id===t.clientId)
                return [t.clientName||'',t.fy||'',t.service||'',t.period||'',t.dueDate||'',u?.name||'',t.status||'',getUrgency(t),cl?.category||t.category||'']
              })
            })}/>
          <PrintButton title="Client Status"/>
        </div>
        <div style={{ fontSize:12,color:'var(--text2)',marginBottom:12 }}>All services for a client at a glance.</div>
        <select value={fCat} onChange={e=>{setFCat(e.target.value);setSelClient('')}} style={{ width:'100%',marginBottom:6,fontSize:12 }}>
          <option value="">All Categories</option>
          {CLIENT_CATEGORIES.map(x=><option key={x} value={x}>Category {x}</option>)}
        </select>
        <input placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{ marginBottom:8 }}/>
        <select value={fy} onChange={e=>setFY(e.target.value)} style={{ marginBottom:10 }}>
          {getFYOptions(tasks).map(f=><option key={f} value={f}>FY {f}</option>)}
        </select>
        <div style={{ display:'flex',flexDirection:'column',gap:4,maxHeight:'calc(100vh - 280px)',overflow:'auto' }}>
          {[...filteredClients].sort((a,b)=>a.name.localeCompare(b.name)).map(cl=>{
            const isActive = selClient===cl.id
            const initials = cl.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
            const cst = cl.clientStatus||'active'
            const stColor = cst==='discontinued'?'#f43f5e':cst==='on_hold'?'#f59e0b':'#22c55e'
            return (
              <button key={cl.id} onClick={()=>setSelClient(cl.id)}
                style={{ width:'100%',textAlign:'left',padding:'9px 12px',borderRadius:9,cursor:'pointer',
                  background:isActive?'var(--surface3)':'var(--surface)',
                  border:`1px solid ${isActive?'var(--accent)30':'var(--border)'}`,
                  borderLeft:`3px solid ${isActive?'var(--accent)':'transparent'}`,transition:'all .12s' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ width:28,height:28,borderRadius:6,background:isActive?'var(--accent)':'var(--surface2)',border:`1px solid ${stColor}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:isActive?'#fff':'var(--text3)',flexShrink:0 }}>
                    {initials}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:isActive?700:500,fontSize:12,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{cl.name}</div>
                    <div style={{ fontSize:9,color:stColor,fontWeight:600 }}>{cst==='on_hold'?'On Hold':cst==='discontinued'?'Discontinued':'Active'}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dashboard */}
      {!selClient ? (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:400,flexDirection:'column',gap:12,color:'var(--text3)' }}>
          <span style={{ fontSize:40 }}>🏢</span>
          <div>Select a client to see their full service dashboard</div>
        </div>
      ) : (
        <div>
          {/* Client header */}
          <div style={{ background:'var(--surface2)',borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',gap:16,alignItems:'center' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18,fontWeight:800,color:'var(--text)' }}>{client?.name}</div>
              <div style={{ fontSize:12,color:'var(--text3)',marginTop:2 }}>{client?.constitution} · FY {fy}</div>
              {assignee && (
                <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:6 }}>
                  <Avatar name={assignee.name} init={assignee.init} role={assignee.role} sz={18} rank={memberMeta[assignee.id]?.rank} streak={memberMeta[assignee.id]?.streak}/>
                  <span style={{ fontSize:12,color:'var(--text2)' }}>{assignee.name}</span>
                </div>
              )}
            </div>
            <div style={{ display:'flex',gap:12 }}>
              {[
                { l:'Total', v:total, c:'var(--accent)' },
                { l:'Done',  v:done,  c:'#22c55e' },
                { l:'Overdue',v:overdue,c:'#f43f5e' },
              ].map(x=>(
                <div key={x.l} style={{ textAlign:'center',background:'var(--surface)',borderRadius:10,padding:'10px 16px',border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:22,fontWeight:800,color:x.c }}>{x.v}</div>
                  <div style={{ fontSize:10,color:'var(--text3)' }}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Service cards kanban */}
          {Object.keys(byService).length === 0 ? (
            <div style={{ textAlign:'center',padding:40,color:'var(--text3)' }}>No tasks for FY {fy}.</div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10 }}>
              {Object.entries(byService).map(([service, sts]) => {
                const doneCount  = sts.filter(t=>DONE_STATUSES.includes(t.status)).length
                const ovCount    = sts.filter(t=>getBucket(t)==='overdue').length
                const pct        = sts.length ? Math.round((doneCount/sts.length)*100) : 0
                return (
                  <div key={service} className="card" style={{ padding:'12px 14px' }}>
                    <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      {service}
                    </div>
                    {/* Progress bar */}
                    <div style={{ height:4,background:'var(--surface3)',borderRadius:2,marginBottom:8 }}>
                      <div style={{ height:'100%',width:`${pct}%`,background:'#22c55e',borderRadius:2,transition:'width .4s' }}/>
                    </div>
                    <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                      {sts.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(t => {
                        const st = getStatusObj(t.service, t.status)
                        const ov = getBucket(t) === 'overdue'
                        const assigneeU = users.find(u=>u.id===t.assignedTo)
                        return (
                          <div key={t.id} onClick={()=>onTask?.(t)}
                            style={{ background:'var(--surface2)',borderRadius:7,padding:'7px 10px',cursor:'pointer',border:`1px solid ${ov?'#f43f5e30':'var(--border)'}` }}
                            className="hover-lift">
                            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:3 }}>
                              <span style={{ fontSize:10,fontWeight:600,flex:1,color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{t.period}</span>
                              <span style={{ fontSize:9,padding:'1px 5px',borderRadius:8,background:st.bg,color:st.c,border:`1px solid ${st.c}30`,whiteSpace:'nowrap' }}>{st.l}</span>
                            </div>
                            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                              <span style={{ fontSize:9,color:ov?'var(--danger)':'var(--text3)',fontWeight:ov?700:400 }}>
                                {t.dueDate ? fmtDate(t.dueDate) : '—'}
                              </span>
                              {assigneeU && <Avatar name={assigneeU.name} init={assigneeU.init} role={assigneeU.role} sz={16} rank={memberMeta[assigneeU.id]?.rank} streak={memberMeta[assigneeU.id]?.streak}/>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
