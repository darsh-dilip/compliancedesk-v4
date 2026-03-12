import { useState, useMemo } from 'react'
import { FINANCIAL_YEARS } from '../constants.js'
import { MONTHS, DONE_STATUSES, getStatusObj } from '../constants.js'
import { getBucket } from '../utils/dates.js'

const GST_SVCS = ['GSTR-1','GSTR-1 (Quarterly)','GSTR-3B','GSTR-3B (Quarterly)']
const FY_MONTHS = [3,4,5,6,7,8,9,10,11,0,1,2]

const periodToMonth = period => {
  const m = period.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i)
  if (!m) return null
  return MONTHS.indexOf(m[0].slice(0,1).toUpperCase()+m[0].slice(1,3).toLowerCase())
}

const Cell = ({ task, onClick }) => {
  if (!task) return <div style={{ height:26,borderRadius:4,background:'var(--surface3)',opacity:0.25 }}/>
  const st  = getStatusObj(task.service, task.status)
  const ov  = getBucket(task)==='overdue'
  return (
    <div onClick={()=>onClick(task)} title={`${st.l} — ${task.period}`}
      style={{ height:26,borderRadius:4,background:st.bg,border:`1px solid ${st.c}40`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:st.c,outline:ov?`2px solid #f43f5e`:'none' }}
      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
      {st.l.slice(0,6)}
    </div>
  )
}

export const DashboardGST = ({ clients, tasks, users, onTask }) => {
  const [fFreq,   setFFreq]   = useState('')
  const [fy,      setFY]      = useState('2026-27')
  const [fUser,   setFUser]   = useState('')
  const [search,  setSearch]  = useState('')
  const [view,    setView]    = useState('matrix')

  const gstClients = clients.filter(c=>c.gstApplicable&&(c.clientStatus||'active')!=='discontinued')
  const filtered   = gstClients.filter(c=>{
    if (fFreq && c.gstFreq!==fFreq) return false
    if (fUser && c.assignedTo!==fUser) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const taskMap = useMemo(()=>{
    const map = {}
    tasks.filter(t=>t.fy===fy&&GST_SVCS.includes(t.service)).forEach(t=>{
      if (!map[t.clientId]) map[t.clientId]={}
      if (!map[t.clientId][t.service]) map[t.clientId][t.service]={}
      const mi = periodToMonth(t.period)
      if (mi!==null) map[t.clientId][t.service][mi]=t
    })
    return map
  },[tasks])

  const gstTasks = tasks.filter(t=>t.fy===fy&&GST_SVCS.includes(t.service))
  const assignees = [...new Map(gstClients.map(c=>{ const u=users.find(x=>x.id===c.assignedTo); return u?[u.id,u]:null }).filter(Boolean)).values()]

  return (
    <div className="fade-up" style={{ padding:'24px 28px' }}>
      <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4 }}>GST Dashboard</div>
      <div style={{ fontSize:13,color:'var(--text2)',marginBottom:20 }}>GSTR-1 · GSTR-3B — all clients, Apr–Mar</div>

      <div className="grid-4" style={{ marginBottom:20 }}>
        {[
          { l:'Filed / Done', v:gstTasks.filter(t=>['filed','nil_filed','iff_filed','no_iff','delayed_filing'].includes(t.status)).length, c:'#22c55e' },
          { l:'Pending',      v:gstTasks.filter(t=>!DONE_STATUSES.includes(t.status)).length,                                              c:'var(--accent)' },
          { l:'Overdue',      v:gstTasks.filter(t=>getBucket(t)==='overdue').length,                                                       c:'var(--danger)' },
          { l:'Not Responding',v:gstTasks.filter(t=>t.status==='not_responding').length,                                                   c:'#f59e0b' },
        ].map(x=>(
          <div key={x.l} className="card" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:24,fontWeight:800,color:x.c }}>{x.v}</div>
            <div style={{ fontSize:12,fontWeight:600,color:'var(--text)',marginTop:2 }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center' }}>
        <input placeholder="🔍 Search client…" value={search} onChange={e=>setSearch(e.target.value)} style={{ width:200 }}/>
        <select value={fy} onChange={e=>setFY(e.target.value)} style={{ width:120 }}>
          {FINANCIAL_YEARS.map(f=><option key={f} value={f}>FY {f}</option>)}
        </select>
        <select value={fFreq} onChange={e=>setFFreq(e.target.value)} style={{ width:160 }}>
          <option value="">Monthly + Quarterly</option>
          <option value="monthly">Monthly only</option>
          <option value="quarterly">Quarterly only</option>
        </select>
        <select value={fUser} onChange={e=>setFUser(e.target.value)} style={{ width:180 }}>
          <option value="">All Members</option>
          {assignees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div style={{ marginLeft:'auto',display:'flex',gap:4 }}>
          {[['matrix','⊞ Matrix'],['list','≡ List']].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:'6px 12px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',background:view===v?'var(--surface3)':'transparent',color:view===v?'var(--text)':'var(--text3)',border:view===v?'1px solid var(--border2)':'1px solid transparent' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize:12,color:'var(--text3)',marginBottom:12 }}>{filtered.length} clients</div>

      {view==='matrix' && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'separate',borderSpacing:'0 4px',fontSize:12 }}>
            <thead>
              <tr>
                <th style={{ padding:'8px 12px',textAlign:'left',color:'var(--text3)',fontWeight:600,fontSize:11,textTransform:'uppercase',position:'sticky',left:0,background:'var(--bg)',zIndex:2,minWidth:170 }}>Client</th>
                <th style={{ padding:'8px 6px',color:'var(--text3)',fontWeight:600,fontSize:10,minWidth:30 }}>Freq</th>
                {FY_MONTHS.map(m=>(
                  <th key={m} style={{ padding:'6px 2px',color:'var(--text3)',fontWeight:600,fontSize:10,textAlign:'center',minWidth:56 }} colSpan={2}>
                    {MONTHS[m]}
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,marginTop:3 }}>
                      {['G1','3B'].map(s=><div key={s} style={{ fontSize:8,color:'var(--text3)',textAlign:'center' }}>{s}</div>)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(client=>{
                const cm = taskMap[client.id]||{}
                const assignee = users.find(u=>u.id===client.assignedTo)
                const sG1 = client.gstFreq==='monthly'?'GSTR-1':'GSTR-1 (Quarterly)'
                const sG3 = client.gstFreq==='monthly'?'GSTR-3B':'GSTR-3B (Quarterly)'
                return (
                  <tr key={client.id}>
                    <td style={{ padding:'4px 12px',position:'sticky',left:0,background:'var(--bg)',zIndex:1 }}>
                      <div style={{ fontWeight:600,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:155 }}>{client.name}</div>
                      <div style={{ fontSize:10,color:'var(--text3)' }}>{assignee?.name?.split(' ')[0]}</div>
                    </td>
                    <td style={{ padding:'4px',textAlign:'center' }}>
                      <span style={{ fontSize:9,color:client.gstFreq==='monthly'?'#38bdf8':'#a78bfa',fontWeight:700 }}>{client.gstFreq==='monthly'?'M':'Q'}</span>
                    </td>
                    {FY_MONTHS.map(m=>(
                      [sG1,sG3].map(svc=>(
                        <td key={`${m}-${svc}`} style={{ padding:'2px 1px' }}>
                          <Cell task={cm[svc]?.[m]} onClick={onTask}/>
                        </td>
                      ))
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {view==='list' && (
        <div>
          {[
            { label:'🔴 Overdue',         filter:t=>getBucket(t)==='overdue',            color:'#f43f5e' },
            { label:'🟠 Due Today',        filter:t=>getBucket(t)==='today',              color:'#fb923c' },
            { label:'⚠️ Not Responding',   filter:t=>t.status==='not_responding',         color:'#f43f5e' },
            { label:'💰 Payment Pending',  filter:t=>t.status==='payment_pending',        color:'#fb923c' },
            { label:'📋 Data Pending',     filter:t=>t.status==='data_pending',           color:'#f59e0b' },
            { label:'✅ Filed / Done',     filter:t=>DONE_STATUSES.includes(t.status),    color:'#22c55e' },
          ].map(grp=>{
            const gt = gstTasks.filter(t=>grp.filter(t)&&filtered.some(c=>c.id===t.clientId))
            if (!gt.length) return null
            return (
              <div key={grp.label} style={{ marginBottom:20 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                  <div style={{ width:3,height:16,borderRadius:2,background:grp.color }}/>
                  <span style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>{grp.label}</span>
                  <span className="chip" style={{ background:`${grp.color}20`,color:grp.color,border:`1px solid ${grp.color}30` }}>{gt.length}</span>
                </div>
                {gt.slice(0,50).map(t=>{
                  const st=getStatusObj(t.service,t.status)
                  return (
                    <div key={t.id} onClick={()=>onTask(t)} className="hover-lift"
                      style={{ display:'grid',gridTemplateColumns:'2fr 1.5fr 120px 100px',gap:12,padding:'10px 14px',background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)',cursor:'pointer',marginBottom:4,alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:600,fontSize:13,color:'var(--text)' }}>{t.clientName}</div>
                        <div style={{ fontSize:11,color:'var(--text2)' }}>{t.service} · {t.period}</div>
                      </div>
                      <div style={{ fontSize:12,color:'var(--text2)' }}>{users.find(u=>u.id===t.assignedTo)?.name||'—'}</div>
                      <span className="chip" style={{ background:st.bg,color:st.c,border:`1px solid ${st.c}35` }}>{st.l}</span>
                      <div style={{ fontSize:12,color:'var(--text3)' }}>{t.dueDate||'—'}</div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
