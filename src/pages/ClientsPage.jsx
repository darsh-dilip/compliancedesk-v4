import { useState } from 'react'
import { ROLES, DONE_STATUSES, DONE_NIL, DONE_PROPER, CLIENT_STATUS } from '../constants.js'
import { getBucket } from '../utils/dates.js'
import { getVisibleClientIds, bulkReassignClientTasks, setClientStatus } from '../hooks/useFirestore.js'
import { logClientStatusChanged, logClientReassigned } from '../utils/auditLog.js'
import { Avatar, StatCard, BucketSection, Label, Alert } from '../components/UI.jsx'

const allDone = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]

const ClientStatusControl = ({ client, currentUser }) => {
  const [saving,setSaving]=useState(false)
  const cur = client.clientStatus||'active'
  const change = async v => {
    if(v===cur) return; setSaving(true)
    await setClientStatus(client.id, v)
    await logClientStatusChanged(client, cur, v, currentUser)
    setSaving(false)
  }
  return (
    <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
      <span style={{ fontSize:11,color:'var(--text3)' }}>Client Status:</span>
      {[{v:'active',l:'Active',c:'#22c55e'},{v:'on_hold',l:'On Hold',c:'#f59e0b'},{v:'discontinued',l:'Discontinued',c:'#f43f5e'}].map(o=>(
        <button key={o.v} onClick={()=>change(o.v)} disabled={saving} style={{ padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${o.c}50`,background:cur===o.v?`${o.c}20`:'transparent',color:cur===o.v?o.c:'var(--text3)',outline:cur===o.v?`1px solid ${o.c}`:'none',transition:'all .15s' }}>{o.l}</button>
      ))}
    </div>
  )
}

const OverlayBadge = ({ clientStatus }) => {
  const st=CLIENT_STATUS[clientStatus]; if(!st?.badge) return null
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:800,letterSpacing:'0.07em',background:st.badgeBg,color:st.badgeColor,border:`1px solid ${st.badgeBorder}` }}>{st.badge}</span>
}

const ClientRow = ({ client, users, tasks, onClick }) => {
  const assignee=users.find(u=>u.id===client.assignedTo)
  const ct=tasks.filter(t=>t.clientId===client.id)
  const overdue=ct.filter(t=>getBucket(t)==='overdue').length
  const active=ct.filter(t=>!allDone.includes(t.status)&&t.status!=='dropped').length
  const done=ct.filter(t=>allDone.includes(t.status)).length
  const cst=client.clientStatus||'active'
  const comps=[client.gstApplicable&&`GST(${client.gstFreq==='monthly'?'M':'Q'})`,client.tdsApplicable&&'TDS',client.ptMH&&'PT-MH',client.ptKA&&'PT-KA',client.itApplicable&&'IT',client.advanceTax&&'AdvTax',client.accounting&&'Accts'].filter(Boolean)
  return (
    <div onClick={onClick} className="hover-lift" style={{ background:'var(--surface)',borderRadius:12,cursor:'pointer',border:`1px solid ${cst==='discontinued'?'#f43f5e40':cst==='on_hold'?'#f59e0b40':'var(--border)'}`,padding:'14px 18px',display:'grid',gridTemplateColumns:'2fr 1fr auto auto',alignItems:'center',gap:16,opacity:cst==='discontinued'?.7:1 }}>
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
          <div style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>{client.name}</div>
          <OverlayBadge clientStatus={cst}/>
        </div>
        <div style={{ fontSize:11,color:'var(--text3)',marginBottom:6 }}>{client.constitution} · {client.gstin||'—'}</div>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
          {comps.map((c,i)=><span key={i} className="chip" style={{ background:'#5b8dee15',color:'#5b8dee',border:'1px solid #5b8dee25' }}>{c}</span>)}
        </div>
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
        {assignee&&<Avatar name={assignee.name} init={assignee.init} role={assignee.role} sz={28}/>}
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text)' }}>{assignee?.name||'Unassigned'}</div>
          <div style={{ fontSize:11,color:'var(--text3)' }}>{assignee&&ROLES[assignee.role]}</div>
        </div>
      </div>
      <div style={{ display:'flex',gap:16 }}>
        {[{v:overdue,l:'Overdue',c:'var(--danger)'},{v:active,l:'Active',c:'var(--warn)'},{v:done,l:'Done',c:'var(--success)'}].map(x=>(
          <div key={x.l} style={{ textAlign:'center' }}>
            <div style={{ fontWeight:700,color:x.c,fontSize:16 }}>{x.v}</div>
            <div style={{ fontSize:10,color:'var(--text3)' }}>{x.l}</div>
          </div>
        ))}
      </div>
      <div style={{ color:'var(--text3)' }}>›</div>
    </div>
  )
}

const ClientDetail = ({ client, tasks, users, currentUser, onTask, onBack, onAddAdhoc }) => {
  const [reassigning,setReassigning]=useState(false)
  const [newAssignee,setNewAssignee]=useState(client.assignedTo)
  const [saving,setSaving]=useState(false)
  const ct=tasks.filter(t=>t.clientId===client.id)
  const overdue=ct.filter(t=>getBucket(t)==='overdue')
  const today=ct.filter(t=>getBucket(t)==='today')
  const upcoming=ct.filter(t=>['soon3','soon7','others','this_month'].includes(getBucket(t)))
  const done=ct.filter(t=>allDone.includes(t.status))
  const hold=ct.filter(t=>['hold','dropped'].includes(getBucket(t)))
  const cst=client.clientStatus||'active'

  const doReassign = async () => {
    setSaving(true)
    const oldN=users.find(u=>u.id===client.assignedTo)?.name||'Unknown'
    const newN=users.find(u=>u.id===newAssignee)?.name||'Unknown'
    await bulkReassignClientTasks(client.id, newAssignee, tasks)
    await logClientReassigned(client, oldN, newN, currentUser)
    setSaving(false); setReassigning(false)
  }

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:1000 }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom:16 }}>← Back</button>
      <div style={{ display:'flex',alignItems:'flex-start',gap:16,marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
            <div style={{ fontSize:22,fontWeight:800,color:'var(--text)' }}>{client.name}</div>
            <OverlayBadge clientStatus={cst}/>
          </div>
          <div style={{ fontSize:13,color:'var(--text2)' }}>{client.constitution} · GSTIN: {client.gstin||'—'} · PAN: {client.pan||'—'}</div>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn btn-primary btn-sm" onClick={()=>onAddAdhoc(client)}>+ Ad-hoc Task</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setReassigning(!reassigning)}>↔ Reassign All</button>
        </div>
      </div>

      <div className="card" style={{ padding:'12px 16px',marginBottom:16 }}>
        <ClientStatusControl client={client} currentUser={currentUser}/>
        {cst!=='active'&&(
          <div style={{ marginTop:8,fontSize:12,color:cst==='discontinued'?'var(--danger)':'var(--warn)' }}>
            {cst==='on_hold'?'⚠️ All tasks show ON HOLD badge. Internal statuses preserved.':'🛑 All tasks show STOP SERVICE badge.'}
          </div>
        )}
      </div>

      {reassigning&&(
        <div className="card" style={{ padding:14,marginBottom:16 }}>
          <Label>Reassign ALL pending tasks to:</Label>
          <div style={{ display:'flex',gap:8,marginTop:8 }}>
            <select value={newAssignee} onChange={e=>setNewAssignee(e.target.value)} style={{ flex:1 }}>
              {users.filter(u=>u.role!=='partner').map(u=><option key={u.id} value={u.id}>{u.name} ({ROLES[u.role]})</option>)}
            </select>
            <button className="btn btn-primary" onClick={doReassign} disabled={saving}>{saving?'Saving…':'Confirm'}</button>
          </div>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom:20 }}>
        <StatCard label="Overdue"   value={overdue.length}  color="var(--danger)"/>
        <StatCard label="Due Today" value={today.length}    color="var(--warn)"/>
        <StatCard label="Upcoming"  value={upcoming.length} color="var(--accent)"/>
        <StatCard label="Completed" value={done.length}     color="var(--success)"/>
      </div>

      <BucketSection label="🔴 Overdue"        tasks={overdue}  color="#f43f5e" users={users} clients={[client]} onTask={onTask}/>
      <BucketSection label="🟠 Due Today"      tasks={today}    color="#fb923c" users={users} clients={[client]} onTask={onTask}/>
      <BucketSection label="📋 Upcoming"       tasks={upcoming} color="#5b8dee" users={users} clients={[client]} onTask={onTask}/>
      <BucketSection label="⏸ Hold / Dropped" tasks={hold}     color="#a78bfa" users={users} clients={[client]} onTask={onTask} defaultOpen={false}/>
      <BucketSection label="✅ Completed"      tasks={done}     color="#22c55e" users={users} clients={[client]} onTask={onTask} defaultOpen={false}/>
    </div>
  )
}

export const ClientsPage = ({ clients, users, tasks, currentUser, onAdd, onTask, onAddAdhoc }) => {
  const [search,  setSearch]  = useState('')
  const [selected,setSelected]=useState(null)
  const [filter,  setFilter]  = useState('all')

  // Visibility: executives/interns only see their assigned clients
  const visibleClientIds = getVisibleClientIds(currentUser, users, clients)
  const visibleClients   = clients.filter(c=>visibleClientIds.includes(c.id))

  const live = selected ? visibleClients.find(c=>c.id===selected.id)||selected : null
  if(live) return (
    <ClientDetail
      client={live} tasks={tasks} users={users} currentUser={currentUser}
      onTask={onTask} onBack={()=>setSelected(null)}
      onAddAdhoc={c=>onAddAdhoc(c)}
    />
  )

  const counts={ all:visibleClients.length, active:visibleClients.filter(c=>(c.clientStatus||'active')==='active').length, on_hold:visibleClients.filter(c=>c.clientStatus==='on_hold').length, discontinued:visibleClients.filter(c=>c.clientStatus==='discontinued').length }
  const filtered = visibleClients.filter(c=>{
    const ms=c.name.toLowerCase().includes(search.toLowerCase())||(c.gstin||'').includes(search)||(c.pan||'').includes(search)
    const mf=filter==='all'||(c.clientStatus||'active')===filter
    return ms&&mf
  })

  return (
    <div className="fade-up" style={{ padding:'24px 28px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20 }}>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',flex:1 }}>Clients</div>
        <button className="btn btn-ghost btn-sm" onClick={()=>onAddAdhoc(null)}>+ Ad-hoc Task</button>
        <button className="btn btn-primary" onClick={onAdd}>+ Onboard New Client</button>
      </div>
      <div style={{ display:'flex',gap:8,marginBottom:14,flexWrap:'wrap' }}>
        <input placeholder="🔍 Search name, GSTIN, PAN…" value={search} onChange={e=>setSearch(e.target.value)} style={{ maxWidth:280 }}/>
        <div style={{ display:'flex',gap:4 }}>
          {[['all','All'],['active','Active'],['on_hold','On Hold'],['discontinued','Discontinued']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{ padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid var(--border2)',background:filter===v?'var(--surface3)':'transparent',color:filter===v?'var(--text)':'var(--text3)' }}>{l} ({counts[v]})</button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
        {filtered.map(c=><ClientRow key={c.id} client={c} users={users} tasks={tasks} onClick={()=>setSelected(c)}/>)}
        {!filtered.length&&<div style={{ textAlign:'center',padding:40,color:'var(--text3)' }}>No clients found.</div>}
      </div>
    </div>
  )
}
