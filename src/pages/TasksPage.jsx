import { useState, useMemo } from 'react'
import { getServiceStatuses, DONE_STATUSES, DONE_NIL, DONE_PROPER, HOLD_REFUSED,
  STATUS_KANBAN_COLS, URGENCY_KANBAN_COLS, getStatusObj } from '../constants.js'
import { getBucket, getStatusKanbanCol, daysDiff, fmtDate, isTaskPending } from '../utils/dates.js'
import { getVisibleUserIds } from '../utils/hierarchy.js'
import { updateTask, deleteTask } from '../hooks/useFirestore.js'
import { logTaskStatusChanged } from '../utils/auditLog.js'
import { TaskRow, DueBadge, Avatar, Modal, Label, ConfirmModal } from '../components/UI.jsx'
import { arrayUnion } from 'firebase/firestore'

const allDone = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]

// ── Kanban Card ────────────────────────────────────────────
const KanbanCard = ({ task, users, clients, onClick, currentUser, onMoved }) => {
  const [showMove, setShowMove] = useState(false)
  const [newStatus, setNewStatus] = useState(task.status)
  const [saving, setSaving] = useState(false)
  const assignee = users?.find(u=>u.id===task.assignedTo)
  const client   = clients?.find(c=>c.id===task.clientId)
  const cst      = client?.clientStatus||'active'
  const st       = getStatusObj(task.service, task.status)
  const statuses = getServiceStatuses(task.service)
  const ov       = getBucket(task)==='overdue'

  const doMove = async () => {
    if(newStatus===task.status){ setShowMove(false); return }
    setSaving(true)
    await updateTask(task.id, {
      status: newStatus,
      history: arrayUnion({ action:`Status → ${getStatusObj(task.service,newStatus).l}`, by:currentUser.id, byName:currentUser.name, at:new Date().toISOString(), oldStatus:task.status }),
    })
    await logTaskStatusChanged(task, task.status, newStatus, currentUser, '')
    setSaving(false); setShowMove(false)
    onMoved?.()
  }

  return (
    <div style={{ background:'var(--surface)',border:`1px solid ${ov?'#f43f5e40':'var(--border)'}`,borderRadius:10,padding:'10px 12px',marginBottom:6,outline:ov?`2px solid #f43f5e30`:'' }}>
      <div onClick={onClick} style={{ cursor:'pointer' }}>
        <div style={{ fontWeight:600,fontSize:12,color:'var(--text)',marginBottom:2 }}>
          {task.service}
          {task.isAdhoc&&<span style={{ marginLeft:6,fontSize:9,color:'#f59e0b',fontWeight:700 }}>AD-HOC</span>}
        </div>
        <div style={{ fontSize:11,color:'var(--text2)',marginBottom:2 }}>{task.clientName}</div>
        <div style={{ fontSize:10,color:'var(--text3)',marginBottom:6 }}>{task.period}</div>
        <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:6 }}>
          <span className="chip" style={{ background:st.bg,color:st.c,border:`1px solid ${st.c}35`,fontSize:10 }}>{st.l}</span>
          {ov&&<span style={{ fontSize:9,color:'var(--danger)',fontWeight:700 }}>{Math.abs(daysDiff(task.dueDate))}d overdue</span>}
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          {assignee&&<Avatar name={assignee.name} init={assignee.init} role={assignee.role} sz={16}/>}
          <span style={{ fontSize:10,color:'var(--text3)' }}>{fmtDate(task.dueDate)}</span>
        </div>
      </div>
      <div style={{ marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)' }}>
        <button onClick={()=>setShowMove(!showMove)} style={{ fontSize:11,color:'var(--accent)',background:'none',border:'none',cursor:'pointer',padding:0,fontWeight:600 }}>
          {showMove?'✕ Cancel':'→ Change Status'}
        </button>
        {showMove&&(
          <div style={{ marginTop:6,display:'flex',gap:6,flexWrap:'wrap' }}>
            <select value={newStatus} onChange={e=>setNewStatus(e.target.value)} style={{ fontSize:11,padding:'4px 8px',flex:1,minWidth:0 }}>
              {statuses.map(x=><option key={x.v} value={x.v}>{x.l}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={doMove} disabled={saving} style={{ fontSize:11 }}>{saving?'…':'Save'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export const TasksPage = ({ tasks, user, users, clients, onTask, initialBucket=null, showPendingOnly=false }) => {
  const [view,      setView]      = useState('list')
  const [kanbanType,setKanbanType]=useState('status') // 'status' | 'urgency'
  const [fClient,   setFClient]   = useState('')
  const [fService,  setFService]  = useState('')
  const [fStatus,   setFStatus]   = useState('')
  const [fAssignee, setFAssignee] = useState('')
  const [search,    setSearch]    = useState('')
  const [refreshK,  setRefreshK]  = useState(0)

  const visible = useMemo(()=>{
    const ids = getVisibleUserIds(user,users)
    let t = tasks.filter(t=>ids.includes(t.assignedTo))
    if (showPendingOnly) t = t.filter(x=>isTaskPending(x))
    if (initialBucket==='overdue') t = t.filter(x=>getBucket(x)==='overdue')
    if (initialBucket==='today')   t = t.filter(x=>getBucket(x)==='today')
    if (initialBucket==='week')    t = t.filter(x=>['soon3','soon7'].includes(getBucket(x)))
    if (fClient)   t = t.filter(x=>x.clientId===fClient)
    if (fService)  t = t.filter(x=>x.service===fService)
    if (fStatus)   t = t.filter(x=>x.status===fStatus)
    if (fAssignee) t = t.filter(x=>x.assignedTo===fAssignee)
    if (search)    t = t.filter(x=>`${x.service} ${x.clientName} ${x.period}`.toLowerCase().includes(search.toLowerCase()))
    return t.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))
  },[tasks,user,users,showPendingOnly,initialBucket,fClient,fService,fStatus,fAssignee,search])

  const services     = [...new Set(tasks.map(t=>t.service))].sort()
  const visibleUsers = users.filter(u=>getVisibleUserIds(user,users).includes(u.id))
  const hasFilters   = fClient||fService||fStatus||fAssignee||search
  const statusesForSvc = fService ? getServiceStatuses(fService) : []

  // Status Kanban groups
  const statusGroups = useMemo(()=>{
    const g={}; STATUS_KANBAN_COLS.forEach(c=>g[c.key]=[])
    visible.forEach(t=>{ const col=getStatusKanbanCol(t); if(g[col]) g[col].push(t) })
    return g
  },[visible])

  // Urgency Kanban groups
  const urgencyGroups = useMemo(()=>{
    const g={overdue:[],today:[],soon3:[],soon7:[],this_month:[],hold:[],completed:[]}
    visible.forEach(t=>{
      if(allDone.includes(t.status)){ g.completed.push(t); return }
      if(HOLD_REFUSED.includes(t.status)){ g.hold.push(t); return }
      const b=getBucket(t)
      if(b==='overdue') g.overdue.push(t)
      else if(b==='today') g.today.push(t)
      else if(b==='soon3') g.soon3.push(t)
      else if(b==='soon7') g.soon7.push(t)
      else if(b==='this_month') g.this_month.push(t)
      else g.this_month.push(t) // others go to this_month
    })
    return g
  },[visible])

  const urgencyCols = [
    { key:'overdue',    label:'🔴 Overdue',        color:'#f43f5e' },
    { key:'today',      label:'🟠 Today',           color:'#fb923c' },
    { key:'soon3',      label:'🟡 3 Days',          color:'#f59e0b' },
    { key:'soon7',      label:'🔵 7 Days',          color:'#5b8dee' },
    { key:'this_month', label:'🩵 This Month',      color:'#38bdf8' },
    { key:'hold',       label:'⏸ Hold / Refused',  color:'#a78bfa' },
    { key:'completed',  label:'✅ Completed',        color:'#22c55e' },
  ]

  return (
    <div className="fade-up" style={{ padding:'24px 28px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20 }}>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',flex:1 }}>
          {showPendingOnly?'Pending Tasks':'All Tasks'}
          {initialBucket&&<span style={{ fontSize:13,color:'var(--text3)',fontWeight:400,marginLeft:8 }}>· {initialBucket}</span>}
        </div>
        <div style={{ display:'flex',gap:4,background:'var(--surface2)',borderRadius:8,padding:3,border:'1px solid var(--border)' }}>
          {[['list','≡ List'],['status','⊞ Status Kanban'],['urgency','⏱ Urgency Kanban']].map(([v,l])=>(
            <button key={v} onClick={()=>{ setView(v==='list'?'list':'kanban'); if(v!=='list') setKanbanType(v) }} style={{ padding:'6px 12px',borderRadius:6,fontSize:12,fontWeight:500,cursor:'pointer',border:(view==='list'&&v==='list')||(view==='kanban'&&kanbanType===v)?'1px solid var(--border2)':'none',background:(view==='list'&&v==='list')||(view==='kanban'&&kanbanType===v)?'var(--surface3)':'transparent',color:(view==='list'&&v==='list')||(view==='kanban'&&kanbanType===v)?'var(--text)':'var(--text2)' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr',gap:8,marginBottom:8 }}>
        <input placeholder="🔍  Search tasks, clients…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={fClient} onChange={e=>setFClient(e.target.value)}>
          <option value="">All Clients</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={fService} onChange={e=>{setFService(e.target.value);setFStatus('')}}>
          <option value="">All Services</option>
          {services.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {(fService?statusesForSvc:[]).map(x=><option key={x.v} value={x.v}>{x.l}</option>)}
        </select>
        <select value={fAssignee} onChange={e=>setFAssignee(e.target.value)}>
          <option value="">All Members</option>
          {visibleUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
        <div style={{ fontSize:12,color:'var(--text3)' }}>{visible.length} tasks</div>
        {hasFilters&&<button className="btn btn-ghost btn-sm" onClick={()=>{setFClient('');setFService('');setFStatus('');setFAssignee('');setSearch('')}}>✕ Clear</button>}
      </div>

      {/* ── List View ──────────────────────────────── */}
      {view==='list'&&(
        <>
          <div style={{ display:'grid',gridTemplateColumns:'2fr 1.2fr 1fr 150px 110px 20px',gap:12,padding:'4px 16px 8px' }}>
            {['Task / Client','Due Date','Assigned To','Status','Urgency',''].map((h,i)=>(
              <div key={i} style={{ fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em' }}>{h}</div>
            ))}
          </div>
          {visible.map(t=><TaskRow key={t.id} task={t} users={users} clients={clients} onClick={()=>onTask(t)}/>)}
          {!visible.length&&<div style={{ textAlign:'center',padding:40,color:'var(--text3)' }}>No tasks match your filters.</div>}
        </>
      )}

      {/* ── Status Kanban ──────────────────────────── */}
      {view==='kanban'&&kanbanType==='status'&&(
        <div>
          <div style={{ fontSize:12,color:'var(--text3)',marginBottom:12 }}>
            <strong>Status Kanban</strong> — grouped by work stage · click "→ Change Status" on any card to update
          </div>
          <div style={{ display:'flex',gap:10,overflowX:'auto',paddingBottom:12 }}>
            {STATUS_KANBAN_COLS.map(col=>{
              const colTasks = statusGroups[col.key]||[]
              return (
                <div key={col.key} style={{ minWidth:240,flex:'0 0 240px',background:'var(--surface2)',borderRadius:12,border:'1px solid var(--border)' }}>
                  <div style={{ padding:'10px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:col.color }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700,fontSize:12,color:'var(--text)' }}>{col.label}</div>
                      <div style={{ fontSize:10,color:'var(--text3)' }}>{col.desc}</div>
                    </div>
                    <span className="chip" style={{ background:`${col.color}20`,color:col.color,fontSize:11 }}>{colTasks.length}</span>
                  </div>
                  <div style={{ padding:8,maxHeight:580,overflow:'auto' }}>
                    {colTasks.map(t=>(
                      <KanbanCard key={`${t.id}-${refreshK}`} task={t} users={users} clients={clients} onClick={()=>onTask(t)} currentUser={user} onMoved={()=>setRefreshK(k=>k+1)}/>
                    ))}
                    {!colTasks.length&&<div style={{ fontSize:11,color:'var(--text3)',textAlign:'center',padding:16 }}>Empty</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Urgency Kanban ─────────────────────────── */}
      {view==='kanban'&&kanbanType==='urgency'&&(
        <div>
          <div style={{ fontSize:12,color:'var(--text3)',marginBottom:12 }}>
            <strong>Urgency Kanban</strong> — grouped by deadline urgency
          </div>
          <div style={{ display:'flex',gap:10,overflowX:'auto',paddingBottom:12 }}>
            {urgencyCols.map(col=>{
              const colTasks=urgencyGroups[col.key]||[]
              return (
                <div key={col.key} style={{ minWidth:240,flex:'0 0 240px',background:'var(--surface2)',borderRadius:12,border:'1px solid var(--border)' }}>
                  <div style={{ padding:'10px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:col.color }}/>
                    <span style={{ fontWeight:700,fontSize:12,color:'var(--text)',flex:1 }}>{col.label}</span>
                    <span className="chip" style={{ background:`${col.color}20`,color:col.color,fontSize:11 }}>{colTasks.length}</span>
                  </div>
                  <div style={{ padding:8,maxHeight:580,overflow:'auto' }}>
                    {colTasks.map(t=>(
                      <KanbanCard key={`${t.id}-${refreshK}`} task={t} users={users} clients={clients} onClick={()=>onTask(t)} currentUser={user} onMoved={()=>setRefreshK(k=>k+1)}/>
                    ))}
                    {!colTasks.length&&<div style={{ fontSize:11,color:'var(--text3)',textAlign:'center',padding:16 }}>Empty</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
