import { useState, useEffect } from 'react'
import { subscribeLogs } from '../utils/auditLog.js'
import { Avatar, PrintButton, PrintHeader, ExcelButton } from '../components/UI.jsx'

const ACTION_META = {
  client_onboarded:      { l:'Client Onboarded',      icon:'🏢', c:'#22c55e' },
  client_status_changed: { l:'Client Status Changed', icon:'🔄', c:'#f59e0b' },
  client_reassigned:     { l:'Client Reassigned',     icon:'↔️', c:'#5b8dee' },
  task_status_changed:   { l:'Status Updated',        icon:'✏️', c:'#5b8dee' },
  task_reassigned:       { l:'Task Reassigned',       icon:'↔️', c:'#818cf8' },
  comment_added:         { l:'Comment Added',         icon:'💬', c:'#38bdf8' },
  user_created:          { l:'User Created',          icon:'👤', c:'#a78bfa' },
}

const fmtTs = ts => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-IN',{ day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' })
}

export const AuditLogPage = ({ users, clients }) => {
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [fAction,    setFAction]    = useState('')
  const [fClient,    setFClient]    = useState('')
  const [fMember,    setFMember]    = useState('')
  const [fStatusFrom,setFStatusFrom]= useState('')
  const [fStatusTo,  setFStatusTo]  = useState('')
  const [fDateFrom,  setFDateFrom]  = useState('')
  const [fDateTo,    setFDateTo]    = useState('')
  const [fMonth,     setFMonth]     = useState('')
  const [search,     setSearch]     = useState('')

  useEffect(()=>{
    const unsub = subscribeLogs(data=>{ setLogs(data); setLoading(false) }, ()=>setLoading(false), 500)
    return unsub
  },[])

  const filtered = logs.filter(l=>{
    if (fAction  && l.action!==fAction)          return false
    if (fClient  && l.clientId!==fClient)        return false
    if (fMember  && l.by?.id!==fMember)          return false
    if (fStatusFrom && l.oldValue!==fStatusFrom) return false
    if (fStatusTo   && l.newValue!==fStatusTo)   return false
    if (fMonth) {
      const [fy,fm] = fMonth.split('-')
      const monthStart = new Date(+fy, +fm-1, 1)
      const monthEnd   = new Date(+fy, +fm,   0, 23, 59, 59)
      if (d < monthStart || d > monthEnd) return false
    }
    if (!fMonth && fDateFrom) {
      const d = l.createdAt?.toDate?l.createdAt.toDate():new Date(l.createdAtISO||0)
      if (d < new Date(fDateFrom)) return false
    }
    if (!fMonth && fDateTo) {
      const d = l.createdAt?.toDate?l.createdAt.toDate():new Date(l.createdAtISO||0)
      const to = new Date(fDateTo); to.setHours(23,59,59)
      if (d > to) return false
    }
    if (search && !`${l.entityName} ${l.clientName} ${l.by?.name} ${l.note} ${l.oldValue} ${l.newValue}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = filtered.reduce((acc,log)=>{
    const d = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAtISO||0)
    const key = d.toLocaleDateString('en-IN',{ day:'2-digit',month:'long',year:'numeric' })
    if (!acc[key]) acc[key]=[]
    acc[key].push(log)
    return acc
  },{})

  const hasFilters = fAction||fClient||fMember||fStatusFrom||fStatusTo||fDateFrom||fDateTo||search
  const clearAll = () => { setFAction(''); setFClient(''); setFMember(''); setFStatusFrom(''); setFStatusTo(''); setFDateFrom(''); setFDateTo(''); setSearch('') }

  return (
    <div className="fade-up print-root" style={{ padding:'0',maxWidth:'none' }}>
      <div style={{ position:'sticky',top:0,zIndex:100,background:'var(--bg)',padding:'18px 28px 12px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
          <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',flex:1 }}>Audit Log</div>
          <ExcelButton filename="AuditLog" getData={()=>({
            headers:['Date & Time','Action By','Action','Client','Old Status','New Status','ARN / Ref','Details'],
            rows:(filtered||[]).map(l=>{
              const d=l.createdAt?.toDate?l.createdAt.toDate():new Date(l.createdAtISO||l.createdAt||0)
              return [d.toLocaleString('en-IN'),l.userName||'',l.action||'',l.clientName||'',l.statusFrom||'',l.statusTo||'',l.arn||'',l.details||'']
            })
          })}/>
          <PrintButton title="Audit Log"/>
        </div>
        <div style={{ fontSize:13,color:'var(--text2)',marginBottom:12 }}>Every action — status changes, reassignments, client updates — timestamped and attributed.</div>

      {/* Filter row 1 */}
      <div style={{ display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr',gap:8,marginBottom:8 }}>
        <input placeholder="🔍  Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={fAction} onChange={e=>setFAction(e.target.value)}>
          <option value="">All Actions</option>
          {Object.entries(ACTION_META).map(([v,m])=><option key={v} value={v}>{m.l}</option>)}
        </select>
        <select value={fClient} onChange={e=>setFClient(e.target.value)}>
          <option value="">All Clients</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {/* Filter row 2 */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:8,marginBottom:14 }}>
        <select value={fMember} onChange={e=>setFMember(e.target.value)}>
          <option value="">All Members</option>
          {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="text" placeholder="Status from (e.g. pending)" value={fStatusFrom} onChange={e=>setFStatusFrom(e.target.value)}/>
        <input type="text" placeholder="Status to (e.g. filed)" value={fStatusTo} onChange={e=>setFStatusTo(e.target.value)}/>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
          <input type="date" value={fDateFrom} onChange={e=>setFDateFrom(e.target.value)} title="From date"/>
          <input type="date" value={fDateTo}   onChange={e=>setFDateTo(e.target.value)}   title="To date"/>
        </div>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ fontSize:11,whiteSpace:'nowrap' }}>✕ Clear</button>
        )}
      </div>

      </div>{/* end sticky */}
      <div style={{ padding:'0 28px 24px' }}>
      <div style={{ fontSize:12,color:'var(--text3)',marginBottom:16 }}>{loading?'Loading…':`${filtered.length} entries`}</div>

      {Object.entries(grouped).map(([date,entries])=>(
        <div key={date} style={{ marginBottom:24 }}>
          <div style={{ fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10,display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ height:1,flex:1,background:'var(--border)' }}/>{date}<div style={{ height:1,flex:1,background:'var(--border)' }}/>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
            {entries.map(log=>{
              const meta = ACTION_META[log.action]||{ l:log.action,icon:'•',c:'#8892b0' }
              const byUser = users.find(u=>u.id===log.by?.id)
              return (
                <div key={log.id} style={{ display:'flex',alignItems:'flex-start',gap:12,padding:'10px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,borderLeft:`3px solid ${meta.c}` }}>
                  <div style={{ fontSize:16,marginTop:1 }}>{meta.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3 }}>
                      <span style={{ fontSize:12,fontWeight:700,color:meta.c }}>{meta.l}</span>
                      {log.clientName&&<span style={{ fontSize:11,background:'#5b8dee15',color:'#5b8dee',padding:'1px 7px',borderRadius:10,border:'1px solid #5b8dee25' }}>{log.clientName}</span>}
                    </div>
                    <div style={{ fontSize:13,color:'var(--text)',marginBottom:3 }}>
                      {log.entityName}
                      {log.oldValue&&log.newValue&&<span style={{ color:'var(--text2)' }}> · <span style={{ color:'var(--text3)' }}>{log.oldValue}</span> → <span style={{ color:meta.c }}>{log.newValue}</span></span>}
                    </div>
                    {log.note&&<div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>📝 {log.note}</div>}
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                      {byUser&&<Avatar name={byUser.name} init={byUser.init} role={byUser.role} sz={20}/>}
                      <span style={{ fontSize:11,color:'var(--text2)' }}>{log.by?.name||'?'}</span>
                    </div>
                    <span style={{ fontSize:10,color:'var(--text3)' }}>{fmtTs(log.createdAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {!loading&&!filtered.length&&(
        <div style={{ textAlign:'center',padding:40,color:'var(--text3)' }}>
          {logs.length?'No entries match your filters.':'No audit entries yet.'}
        </div>
      )}
    </div>
    </div>
  )
}
