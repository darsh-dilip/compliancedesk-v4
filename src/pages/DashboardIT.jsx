import { useState, useMemo } from 'react'
import { FINANCIAL_YEARS } from '../constants.js'
import { getStatusObj, DONE_STATUSES } from '../constants.js'
import { getBucket, fmtDate , getFYOptions } from '../utils/dates.js'

const IT_SVCS = ['Income Tax Filing','Accounting','CA Certificate','GSTR-9 Annual Return','Advance Tax']

const FUNNEL = [
  { l:'Data Pending',      ss:['pending','data_pending'],                                                      c:'#f59e0b' },
  { l:'Data Received',     ss:['data_received','documents_received'],                                          c:'#38bdf8' },
  { l:'In Progress',       ss:['accounting_done','checkers_query','audited','genius_prepared','fs_sent'],       c:'#5b8dee' },
  { l:'Awaiting Approval', ss:['confirmed','client_approval'],                                                 c:'#818cf8' },
  { l:'Payment Due',       ss:['payment_pending','payment_made'],                                              c:'#fb923c' },
  { l:'Filed ✓',           ss:['itr_filed','not_to_be_filed','customer_refused'],                              c:'#22c55e' },
  { l:'Issues',            ss:['revision_required','not_responding','on_hold'],                                c:'#f43f5e' },
]

export const DashboardIT = ({ clients, tasks, users, onTask }) => {
  const [fy,      setFY]      = useState('2026-27')
  const [fSvc,    setFSvc]    = useState('Income Tax Filing')
  const [fUser,   setFUser]   = useState('')
  const [search,  setSearch]  = useState('')
  const [sortBy,  setSortBy]  = useState('name')

  const itTasks = useMemo(()=>
    tasks.filter(t=>IT_SVCS.includes(t.service)&&t.fy===fy&&
      (fSvc  ? t.service===fSvc : true)&&
      (fUser ? t.assignedTo===fUser : true)&&
      (search? t.clientName.toLowerCase().includes(search.toLowerCase()):true)
    )
  ,[tasks,fy,fSvc,fUser,search])

  const byClient = useMemo(()=>{
    const map = {}
    itTasks.forEach(t=>{
      if (!map[t.clientId]) map[t.clientId]={ clientId:t.clientId, clientName:t.clientName, tasks:[] }
      map[t.clientId].tasks.push(t)
    })
    return Object.values(map).sort((a,b)=>{
      if (sortBy==='overdue') return b.tasks.filter(t=>getBucket(t)==='overdue').length - a.tasks.filter(t=>getBucket(t)==='overdue').length
      return a.clientName.localeCompare(b.clientName)
    })
  },[itTasks,sortBy])

  const total = itTasks.length
  const assignees = [...new Map(
    tasks.filter(t=>IT_SVCS.includes(t.service)).map(t=>{ const u=users.find(x=>x.id===t.assignedTo); return u?[u.id,u]:null }).filter(Boolean)
  ).values()]

  return (
    <div className="fade-up" style={{ padding:'24px 28px' }}>
      <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4 }}>IT &amp; Accounts Dashboard</div>
      <div style={{ fontSize:13,color:'var(--text2)',marginBottom:20 }}>ITR · Accounting · Advance Tax · CA Certificates</div>

      <div style={{ display:'flex',gap:3,marginBottom:24,height:64,alignItems:'flex-end' }}>
        {FUNNEL.map((f,i)=>{
          const cnt = itTasks.filter(t=>f.ss.includes(t.status)).length
          const pct = total?Math.max(8,(cnt/total)*100):8
          return (
            <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
              <div style={{ fontSize:12,fontWeight:700,color:f.c }}>{cnt}</div>
              <div style={{ width:'100%',height:`${pct}%`,background:`${f.c}30`,border:`1px solid ${f.c}50`,borderRadius:'4px 4px 0 0',minHeight:8,transition:'height .4s' }}/>
              <div style={{ fontSize:9,color:'var(--text3)',textAlign:'center',lineHeight:1.2 }}>{f.l}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display:'flex',gap:8,marginBottom:14,flexWrap:'wrap' }}>
        <input placeholder="🔍 Search client…" value={search} onChange={e=>setSearch(e.target.value)} style={{ width:200 }}/>
        <select value={fy} onChange={e=>setFY(e.target.value)} style={{ width:120 }}>
          {getFYOptions(tasks).map(f=><option key={f} value={f}>FY {f}</option>)}
        </select>
        <select value={fSvc} onChange={e=>setFSvc(e.target.value)} style={{ width:200 }}>
          <option value="">All IT Services</option>
          {IT_SVCS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fUser} onChange={e=>setFUser(e.target.value)} style={{ width:180 }}>
          <option value="">All Members</option>
          {assignees.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ width:160 }}>
          <option value="name">Sort: Name</option>
          <option value="overdue">Sort: Overdue First</option>
        </select>
      </div>

      <div style={{ fontSize:12,color:'var(--text3)',marginBottom:12 }}>{byClient.length} clients · {itTasks.length} tasks</div>

      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {byClient.map(({ clientId, clientName, tasks:ct })=>{
          const assignee = users.find(u=>u.id===ct[0]?.assignedTo)
          const client   = clients.find(c=>c.id===clientId)
          const overdue  = ct.filter(t=>getBucket(t)==='overdue').length
          return (
            <div key={clientId} className="card" style={{ padding:'14px 18px' }}>
              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>{clientName}</div>
                  <div style={{ fontSize:11,color:'var(--text3)' }}>
                    {client?.constitution} · {assignee?.name||'Unassigned'}
                    {overdue>0&&<span style={{ color:'var(--danger)',marginLeft:8,fontWeight:700 }}>⚠ {overdue} overdue</span>}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {ct.map(t=>{
                  const st  = getStatusObj(t.service, t.status)
                  const ov  = getBucket(t)==='overdue'
                  return (
                    <div key={t.id} onClick={()=>onTask(t)} className="hover-lift" style={{ background:st.bg,border:`1px solid ${st.c}40`,borderRadius:8,padding:'8px 12px',cursor:'pointer',minWidth:150,outline:ov?`2px solid #f43f5e`:'none' }}>
                      <div style={{ fontSize:11,color:'var(--text3)',marginBottom:2 }}>{t.service}</div>
                      <div style={{ fontSize:12,fontWeight:700,color:st.c }}>{st.l}</div>
                      {t.arn&&<div style={{ fontSize:10,color:'var(--success)',fontFamily:'var(--mono)',marginTop:2 }}>ARN: {t.arn}</div>}
                      <div style={{ fontSize:10,color:'var(--text3)',marginTop:2 }}>Due: {fmtDate(t.dueDate)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {!byClient.length&&<div style={{ textAlign:'center',padding:40,color:'var(--text3)' }}>No tasks found.</div>}
      </div>
    </div>
  )
}
