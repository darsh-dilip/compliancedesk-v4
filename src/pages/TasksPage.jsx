import { useState, useMemo, useRef } from 'react'
import { getServiceStatuses, DONE_STATUSES, DONE_NIL, DONE_PROPER, HOLD_REFUSED,
  PENDING_AT_CLIENT, STATUS_KANBAN_COLS, URGENCY_KANBAN_COLS, getStatusObj, ROLE_CLR,
  CLIENT_CATEGORIES } from '../constants.js'
import { getBucket, getStatusKanbanCol, daysDiff, fmtDate, isTaskPending } from '../utils/dates.js'
import { getVisibleUserIds } from '../utils/hierarchy.js'
import { updateTask, deleteTask } from '../hooks/useFirestore.js'
import { logTaskStatusChanged } from '../utils/auditLog.js'
import { TaskRow, DueBadge, Avatar, Modal, Label, ConfirmModal, PrintButton, ExcelButton } from '../components/UI.jsx'
import { arrayUnion } from 'firebase/firestore'

const allDone = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]

// Map kanban column → valid statuses for drag-drop context
const COL_STATUS_FILTER = {
  ongoing_clean:   (all) => all.filter(s => !allDone.includes(s.v) && !HOLD_REFUSED.includes(s.v) && !PENDING_AT_CLIENT.includes(s.v)),
  ongoing_overdue: (all) => all.filter(s => !allDone.includes(s.v) && !HOLD_REFUSED.includes(s.v)),
  pending_client:  (all) => all.filter(s => PENDING_AT_CLIENT.includes(s.v)),
  hold_refused:    (all) => all.filter(s => HOLD_REFUSED.includes(s.v)),
  done_nil:        (all) => all.filter(s => DONE_NIL.includes(s.v)),
  done:            (all) => all.filter(s => DONE_PROPER.includes(s.v) || DONE_STATUSES.includes(s.v)),
}

// ── Compact Kanban Card ─────────────────────────────────────
const KanbanCard = ({ task, users, clients, onClick, currentUser, onMoved, dragColKey, contextStatuses }) => {
  const [showMove, setShowMove] = useState(false)
  const [newStatus, setNewStatus] = useState(task.status)
  const [saving, setSaving] = useState(false)
  const assignee = users?.find(u=>u.id===task.assignedTo)
  const st       = getStatusObj(task.service, task.status)
  const allSvcs  = getServiceStatuses(task.service)
  const ov       = getBucket(task)==='overdue'
  const dDiff    = daysDiff(task.dueDate)

  // Use context statuses (from drag target col) or full list
  const moveStatuses = contextStatuses || allSvcs

  const doMove = async () => {
    if (newStatus===task.status) { setShowMove(false); return }
    setSaving(true)
    await updateTask(task.id, {
      status: newStatus,
      history: arrayUnion({ action:`Status → ${getStatusObj(task.service,newStatus).l}`, by:currentUser.id, byName:currentUser.name, at:new Date().toISOString(), oldStatus:task.status }),
    })
    await logTaskStatusChanged(task, task.status, newStatus, currentUser, '')
    setSaving(false); setShowMove(false)
    onMoved?.()
  }

  const dueDateColor = ov ? '#f43f5e' : dDiff===0 ? '#fb923c' : dDiff!==null&&dDiff<=3 ? '#f59e0b' : dDiff!==null&&dDiff<=7 ? '#a3e635' : 'var(--text3)'
  const dueLabelColor = ov ? '#f43f5e' : dDiff===0 ? '#fb923c' : dDiff!==null&&dDiff<=3 ? '#f59e0b' : '#6b7280'
  const dueLabel = ov
    ? `${Math.abs(dDiff)}d late`
    : dDiff===0 ? 'Today'
    : dDiff!==null&&dDiff<=7 ? `${dDiff}d left`
    : null

  return (
    <div
      draggable
      onDragStart={e=>{ e.dataTransfer.setData('taskId', task.id); e.dataTransfer.setData('taskService', task.service) }}
      style={{
        background:'var(--surface)',
        border:`1px solid ${ov?'#f43f5e50':'var(--border)'}`,
        borderLeft:`3px solid ${st.c}`,
        borderRadius:8,
        padding:'10px 10px 8px 10px',
        marginBottom:6,
        cursor:'grab',
        width:'100%',
        boxSizing:'border-box',
      }}
    >
      {/* ── Top: left=client+period, right=service+date+overdue ── */}
      <div onClick={onClick} style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:8,cursor:'pointer',marginBottom:8 }}>

        {/* Left: client name (2-line clamp) + period */}
        <div style={{ minWidth:0 }}>
          <div style={{
            fontWeight:700, fontSize:12, color:'var(--text)', lineHeight:'1.35',
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
            overflow:'hidden', wordBreak:'break-word', marginBottom:3,
          }}>
            {task.clientName}
            {task.isAdhoc&&<span style={{ marginLeft:4,fontSize:8,color:'#f59e0b',fontWeight:700,verticalAlign:'middle' }}> ★</span>}
          </div>
          <div style={{ fontSize:10,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
            {task.period}
          </div>
        </div>

        {/* Right: service name + due date + overdue badge */}
        <div style={{ textAlign:'right',flexShrink:0,maxWidth:90 }}>
          <div style={{
            fontSize:11,fontWeight:700,color:'var(--text2)',
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
            marginBottom:3,
          }}>
            {task.service}
          </div>
          {task.dueDate&&(
            <div style={{ fontSize:10,color:dueDateColor,fontWeight:600,whiteSpace:'nowrap' }}>
              {fmtDate(task.dueDate)}
            </div>
          )}
          {dueLabel&&(
            <div style={{ fontSize:9,fontWeight:700,color:dueLabelColor,marginTop:2,whiteSpace:'nowrap' }}>
              {dueLabel}
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height:1,background:'var(--border)',margin:'0 0 7px 0' }}/>

      {/* ── Bottom: status pill + edit icon | assignee initials ── */}
      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
        {/* Status pill */}
        <span style={{
          fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:4,
          background:st.bg,color:st.c,border:`1px solid ${st.c}40`,
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:100,
        }}>
          {st.l}
        </span>

        {/* Edit / pencil toggle */}
        <button
          onClick={(e)=>{ e.stopPropagation(); setShowMove(!showMove); setNewStatus(task.status) }}
          title="Change Status"
          style={{ background:'none',border:'none',cursor:'pointer',padding:'1px 3px',color:showMove?'var(--accent)':'var(--text3)',fontSize:12,lineHeight:1,flexShrink:0 }}
        >
          ✏️
        </button>

        {/* Spacer */}
        <div style={{ flex:1 }}/>

        {/* Assignee initials — rectangular badge */}
        {assignee&&(
          <div style={{
            fontSize:9,fontWeight:700,
            background:`${ROLE_CLR[assignee.role]||'#5b8dee'}20`,
            color:ROLE_CLR[assignee.role]||'var(--accent)',
            border:`1px solid ${ROLE_CLR[assignee.role]||'#5b8dee'}40`,
            borderRadius:4,padding:'2px 6px',whiteSpace:'nowrap',flexShrink:0,
          }}>
            {assignee.init}
          </div>
        )}
      </div>

      {/* ── Status change dropdown (shown when edit icon clicked) ── */}
      {showMove&&(
        <div style={{ marginTop:7,display:'flex',gap:5 }}>
          <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
            style={{ fontSize:10,padding:'3px 6px',flex:1,minWidth:0 }}>
            {moveStatuses.map(x=><option key={x.v} value={x.v}>{x.l}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={doMove} disabled={saving}
            style={{ fontSize:10,padding:'3px 8px',borderRadius:4 }}>
            {saving?'…':'✓'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Kanban Column with drag-drop ────────────────────────────
const KanbanCol = ({ col, tasks, allTasks, users, clients, onTask, currentUser, onMoved, kanbanType }) => {
  const [dragOver, setDragOver] = useState(false)
  const [dropTaskId, setDropTaskId] = useState(null)
  const [dropService, setDropService] = useState(null)
  const [dropStatus, setDropStatus] = useState('')
  const [dropSaving, setDropSaving] = useState(false)

  const contextStatuses = kanbanType==='status' && col.key && COL_STATUS_FILTER[col.key]
    ? COL_STATUS_FILTER[col.key](dropService ? getServiceStatuses(dropService) : [])
    : null

  const onDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    const taskId = e.dataTransfer.getData('taskId')
    const svc    = e.dataTransfer.getData('taskService')
    if (!taskId || kanbanType!=='status') return
    const validStatuses = COL_STATUS_FILTER[col.key]?.(getServiceStatuses(svc)) || []
    if (!validStatuses.length) return
    setDropTaskId(taskId)
    setDropService(svc)
    setDropStatus(validStatuses[0]?.v || '')
  }

  const confirmDrop = async () => {
    if (!dropTaskId || !dropStatus) return
    setDropSaving(true)
    // Look in allTasks (not just column tasks) since task is still in source column
    const task = allTasks.find(t=>t.id===dropTaskId)
    if (task) {
      await updateTask(dropTaskId, {
        status: dropStatus,
        history: arrayUnion({ action:`Status → ${getStatusObj(dropService,dropStatus).l}`, by:currentUser.id, byName:currentUser.name, at:new Date().toISOString(), oldStatus:task.status }),
      })
      await logTaskStatusChanged(task, task.status, dropStatus, currentUser, '')
      onMoved?.()
    }
    setDropSaving(false); setDropTaskId(null); setDropService(null); setDropStatus('')
  }

  const dropStatuses = dropService ? (COL_STATUS_FILTER[col.key]?.(getServiceStatuses(dropService)) || []) : []

  return (
    <div
      onDragOver={e=>{ e.preventDefault(); setDragOver(true) }}
      onDragLeave={()=>setDragOver(false)}
      onDrop={onDrop}
      style={{ minWidth:190,flex:'0 0 190px',background:dragOver?`${col.color}08`:'var(--surface2)',borderRadius:12,border:`1px solid ${dragOver?col.color:'var(--border)'}`,transition:'border-color .15s,background .15s' }}
    >
      <div style={{ padding:'8px 10px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:6 }}>
        <div style={{ width:7,height:7,borderRadius:'50%',background:col.color }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:11,color:'var(--text)' }}>{col.label}</div>
          {col.desc&&<div style={{ fontSize:9,color:'var(--text3)' }}>{col.desc}</div>}
        </div>
        <span className="chip" style={{ background:`${col.color}20`,color:col.color,fontSize:10 }}>{tasks.length}</span>
      </div>

      {/* Drop confirmation */}
      {dropTaskId&&(
        <div style={{ margin:8,padding:'8px',background:`${col.color}12`,borderRadius:8,border:`1px solid ${col.color}30` }}>
          <div style={{ fontSize:10,color:'var(--text2)',marginBottom:5 }}>Set status for dropped task:</div>
          <select value={dropStatus} onChange={e=>setDropStatus(e.target.value)} style={{ fontSize:10,padding:'3px 6px',width:'100%',marginBottom:5 }}>
            {dropStatuses.map(x=><option key={x.v} value={x.v}>{x.l}</option>)}
          </select>
          <div style={{ display:'flex',gap:5 }}>
            <button className="btn btn-primary btn-sm" onClick={confirmDrop} disabled={dropSaving} style={{ flex:1,fontSize:10 }}>{dropSaving?'…':'✓ Confirm'}</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setDropTaskId(null);setDropService(null)}} style={{ fontSize:10 }}>✕</button>
          </div>
        </div>
      )}

      <div style={{ padding:6,maxHeight:560,overflow:'auto' }}>
        {tasks.map(t=>(
          <KanbanCard key={t.id} task={t} users={users} clients={clients}
            onClick={()=>onTask(t)} currentUser={currentUser} onMoved={onMoved} kanbanType={kanbanType}
            contextStatuses={null}
          />
        ))}
        {!tasks.length&&<div style={{ fontSize:10,color:'var(--text3)',textAlign:'center',padding:12 }}>Empty</div>}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────

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

export const TasksPage = ({ tasks, user, users, clients, onTask, initialBucket=null, showPendingOnly=false }) => {
  const [view,      setView]      = useState('kanban')
  const [kanbanType,setKanbanType]=useState('urgency')
  const [fClient,   setFClient]   = useState('')
  const [fService,  setFService]  = useState('')
  const [fStatus,   setFStatus]   = useState('')
  const [fAssignee,  setFAssignee]  = useState('')
  const [fCat,       setFCat]       = useState('')
  const [fDateFrom,  setFDateFrom]  = useState('')
  const [fDateTo,    setFDateTo]    = useState('')
  const [fMonth,     setFMonth]     = useState('')
  const [search,    setSearch]    = useState('')
  const [refreshK,  setRefreshK]  = useState(0)

  // Map clientId → clientStatus for hold logic
  const clientStatusMap = useMemo(()=>{
    const m={}; clients.forEach(c=>m[c.id]=c.clientStatus||'active'); return m
  },[clients])

  const isClientOnHold = cid => ['on_hold','suspended','customer_refused','not_in_compliance','discontinued'].includes(clientStatusMap[cid])

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
    if (fCat) {
      const catClients = new Set(clients.filter(c=>c.category===fCat).map(c=>c.id))
      t = t.filter(x=>catClients.has(x.clientId))
    }
    if (fMonth)    t = t.filter(x=>x.dueDate && x.dueDate.startsWith(fMonth))
    if (!fMonth && fDateFrom) t = t.filter(x=>x.dueDate && x.dueDate >= fDateFrom)
    if (!fMonth && fDateTo)   t = t.filter(x=>x.dueDate && x.dueDate <= fDateTo)
    if (search)    t = t.filter(x=>`${x.service} ${x.clientName} ${x.period}`.toLowerCase().includes(search.toLowerCase()))
    return t.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))
  },[
  tasks,user,users,showPendingOnly,initialBucket,
  fClient,fService,fStatus,fAssignee,fCat,
  fDateFrom,fDateTo,fMonth,search
])

  const services     = [...new Set(tasks.map(t=>t.service))].sort()
  const visibleUsers = users.filter(u=>getVisibleUserIds(user,users).includes(u.id))
  const hasFilters   = fClient||fService||fStatus||fAssignee||search
  const statusesForSvc = fService ? getServiceStatuses(fService) : []

  // Status Kanban — hold clients go to hold_refused
  const statusGroups = useMemo(()=>{
    const g={}; STATUS_KANBAN_COLS.forEach(c=>g[c.key]=[])
    visible.forEach(t=>{
      if (isClientOnHold(t.clientId)) { g.hold_refused.push(t); return }
      const col=getStatusKanbanCol(t)
      if(g[col]) g[col].push(t)
    })
    return g
  },[visible,clientStatusMap])

  // Urgency Kanban — hold clients go to hold
  const urgencyGroups = useMemo(()=>{
    const g={overdue:[],today:[],soon3:[],soon7:[],this_month:[],hold:[],completed:[]}
    visible.forEach(t=>{
      if (isClientOnHold(t.clientId)) { g.hold.push(t); return }
      if(allDone.includes(t.status)){ g.completed.push(t); return }
      if(HOLD_REFUSED.includes(t.status)){ g.hold.push(t); return }
      const b=getBucket(t)
      if(b==='overdue') g.overdue.push(t)
      else if(b==='today') g.today.push(t)
      else if(b==='soon3') g.soon3.push(t)
      else if(b==='soon7') g.soon7.push(t)
      else g.this_month.push(t)
    })
    return g
  },[visible,clientStatusMap])

  const urgencyCols = [
    { key:'overdue',    label:'Overdue',        color:'#f43f5e' },
    { key:'today',      label:'Today',           color:'#fb923c' },
    { key:'soon3',      label:'3 Days',          color:'#f59e0b' },
    { key:'soon7',      label:'7 Days',          color:'#5b8dee' },
    { key:'this_month', label:'This Month',      color:'#38bdf8' },
    { key:'hold',       label:'Hold / Refused',  color:'#a78bfa' },
    { key:'completed',  label:'Completed',        color:'#22c55e' },
  ]

  const refresh = () => setRefreshK(k=>k+1)

  return (
    <div className="fade-up print-root" style={{ padding:'0' }}>
      <div style={{ position:'sticky',top:0,zIndex:100,background:'var(--bg)',padding:'16px 28px 12px',borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',flex:1 }}>
          {showPendingOnly?'Pending Tasks':'All Tasks'}
          {initialBucket&&<span style={{ fontSize:13,color:'var(--text3)',fontWeight:400,marginLeft:8 }}>· {initialBucket}</span>}
        </div>
        <ExcelButton filename="Tasks" getData={()=>({
          headers:['Client','Service','Period','Due Date','Status','Assigned To'],
          rows: visibleTasks.map(t=>[t.clientName||'',t.service||'',t.period||'',t.dueDate||'',t.status||'',users.find(u=>u.id===t.assignedTo)?.name||''])
        })}/><ExcelButton filename="Tasks" getData={()=>({
          headers:['Client Name','FY','Task / Service','Period','Due Date','Assigned To','Status','Urgency','Client Category'],
          rows:(visible||[]).map(t=>{
            const u=(users||[]).find(u=>u.id===t.assignedTo)
            const cl=(clients||[]).find(c=>c.id===t.clientId)
            return [t.clientName||'',t.fy||'',t.service||'',t.period||'',t.dueDate||'',u?.name||'',t.status||'',getUrgency(t),cl?.category||t.category||'']
          })
        })}/><PrintButton title={showPendingOnly?'Pending Tasks':'All Tasks'}/>
        <div style={{ display:'flex',gap:3,background:'var(--surface2)',borderRadius:8,padding:3,border:'1px solid var(--border)' }}>
          {[['list','≡ List'],['status','⊞ Status'],['urgency','⏱ Urgency']].map(([v,l])=>(
            <button key={v} onClick={()=>{ setView(v==='list'?'list':'kanban'); if(v!=='list') setKanbanType(v) }}
              style={{ padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:500,cursor:'pointer',
                border:(view==='list'&&v==='list')||(view==='kanban'&&kanbanType===v)?'1px solid var(--border2)':'none',
                background:(view==='list'&&v==='list')||(view==='kanban'&&kanbanType===v)?'var(--surface3)':'transparent',
                color:(view==='list'&&v==='list')||(view==='kanban'&&kanbanType===v)?'var(--text)':'var(--text2)' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr 0.7fr',gap:8,marginBottom:6 }}>
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
        <select value={fCat} onChange={e=>setFCat(e.target.value)}>
          <option value="">All Cat.</option>
          {CLIENT_CATEGORIES.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      <div style={{ display:'flex',gap:8,marginBottom:8,alignItems:'center',flexWrap:'wrap' }}>
        <div style={{ fontSize:11,color:'var(--text3)',whiteSpace:'nowrap' }}>Due:</div>
        <select value={fMonth} onChange={e=>{setFMonth(e.target.value);setFDateFrom('');setFDateTo('')}} style={{ width:130,fontSize:12 }}>
          <option value="">Month…</option>
          {['2024-10','2024-11','2024-12','2025-01','2025-02','2025-03','2025-04','2025-05','2025-06','2025-07','2025-08','2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'].map(m=>{
            const [y,mo]=m.split('-'); const label=new Date(+y,+mo-1).toLocaleString('en-IN',{month:'short',year:'numeric'})
            return <option key={m} value={m}>{label}</option>
          })}
        </select>
        <div style={{ fontSize:11,color:'var(--text3)',whiteSpace:'nowrap' }}>or range:</div>
        <input type="date" value={fDateFrom} onChange={e=>{setFDateFrom(e.target.value);setFMonth('')}} style={{ width:136 }} title="From"/>
        <div style={{ fontSize:11,color:'var(--text3)' }}>→</div>
        <input type="date" value={fDateTo} onChange={e=>{setFDateTo(e.target.value);setFMonth('')}} style={{ width:136 }} title="To"/>
        {(fDateFrom||fDateTo||fMonth)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setFDateFrom('');setFDateTo('');setFMonth('')}}>✕</button>}
      </div>

      </div>{/* end filters sticky */}
      <div style={{ padding:'0 28px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14,paddingTop:10 }}>
        <div style={{ fontSize:12,color:'var(--text3)' }}>{visible.length} tasks</div>
        {hasFilters&&<button className="btn btn-ghost btn-sm" onClick={()=>{setFClient('');setFService('');setFStatus('');setFAssignee('');setSearch('');setFDateFrom('');setFDateTo('');setFCat('');setFMonth('')}}>✕ Clear</button>}
        {view==='kanban'&&<div style={{ fontSize:11,color:'var(--text3)',marginLeft:'auto' }}>💡 Drag cards between columns to change status</div>}
      </div>

      {/* ── List View ──────────────────────────────── */}
      {view==='list'&&(
        <>
          <div style={{ display:'grid',gridTemplateColumns:'2fr 1.2fr 1fr 150px 110px 20px',gap:12,padding:'4px 16px 8px',position:'sticky',top:0,zIndex:10,background:'var(--bg)',borderBottom:'1px solid var(--border2)' }}>
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
          <div className="kanban-scroll" style={{ display:'flex',gap:8,overflowX:'auto',paddingBottom:12 }}>
            {STATUS_KANBAN_COLS.map(col=>(
              <KanbanCol key={`${col.key}-${refreshK}`} col={col} tasks={statusGroups[col.key]||[]}
                allTasks={visible} users={users} clients={clients} onTask={onTask} currentUser={user}
                onMoved={refresh} kanbanType="status"
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Urgency Kanban ─────────────────────────── */}
      {view==='kanban'&&kanbanType==='urgency'&&(
        <div>
          <div className="kanban-scroll" style={{ display:'flex',gap:8,overflowX:'auto',paddingBottom:12 }}>
            {urgencyCols.map(col=>(
              <KanbanCol key={`${col.key}-${refreshK}`} col={col} tasks={urgencyGroups[col.key]||[]}
                allTasks={visible} users={users} clients={clients} onTask={onTask} currentUser={user}
                onMoved={refresh} kanbanType="urgency"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
