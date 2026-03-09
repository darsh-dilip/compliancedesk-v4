import { useState } from 'react'
import { ROLE_CLR, DONE_STATUSES, DONE_NIL, DONE_PROPER, CLIENT_STATUS, getStatusObj } from '../constants.js'
import { daysDiff, fmtDate } from '../utils/dates.js'

export const Avatar = ({ name, init, role, sz=32 }) => {
  const c = ROLE_CLR[role]||'#5b8dee'
  const i = init||(name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
  return <div style={{ width:sz,height:sz,borderRadius:'50%',background:`${c}20`,border:`1.5px solid ${c}45`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:sz*.36,fontWeight:700,color:c,flexShrink:0 }}>{i}</div>
}

export const StatusBadge = ({ service, status }) => {
  const st = getStatusObj(service||'',status)
  return <span className="chip" style={{ background:st.bg,color:st.c,border:`1px solid ${st.c}35` }}>{st.l}</span>
}

export const DueBadge = ({ dueDate, status }) => {
  const allDone = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]
  if (allDone.includes(status)||status==='dropped') return null
  const d = daysDiff(dueDate)
  if (d===null) return null
  let c,bg,txt
  if(d<0){c='#f43f5e';bg='#f43f5e15';txt=`${Math.abs(d)}d overdue`}
  else if(d===0){c='#fb923c';bg='#fb923c15';txt='Due today'}
  else if(d<=3){c='#f59e0b';bg='#f59e0b15';txt=`${d}d left`}
  else if(d<=7){c='#5b8dee';bg='#5b8dee15';txt=`${d}d left`}
  else{c='#4a5578';bg='#4a557815';txt=fmtDate(dueDate)}
  return <span className="chip" style={{ background:bg,color:c,border:`1px solid ${c}30` }}>{txt}</span>
}

const ClientOverlay = ({ clientStatus }) => {
  const st = CLIENT_STATUS[clientStatus]
  if (!st?.badge) return null
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'2px 7px',borderRadius:4,fontSize:9,fontWeight:800,letterSpacing:'0.07em',background:st.badgeBg,color:st.badgeColor,border:`1px solid ${st.badgeBorder}`,flexShrink:0 }}>{st.badge}</span>
}

export const Divider = () => <div style={{ height:1,background:'var(--border)',margin:'8px 0' }}/>
export const Label = ({ children }) => <div style={{ fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>{children}</div>

export const StatCard = ({ label, value, color, sub, onClick }) => (
  <div className="card hover-lift" onClick={onClick} style={{ padding:'16px 18px',cursor:onClick?'pointer':'default' }}>
    <div style={{ fontSize:28,fontWeight:800,color,fontVariantNumeric:'tabular-nums' }}>{value}</div>
    <div style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginTop:2 }}>{label}</div>
    {sub && <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>{sub}</div>}
    {onClick && <div style={{ fontSize:10,color:'var(--text3)',marginTop:4 }}>Click to view →</div>}
  </div>
)

export const Modal = ({ open, onClose, title, children, width=520 }) => {
  if(!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.72)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div onClick={e=>e.stopPropagation()} className="fade-up" style={{ background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:16,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'auto' }}>
        <div style={{ padding:'18px 22px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'var(--surface)',zIndex:1 }}>
          <div style={{ fontWeight:700,fontSize:16,color:'var(--text)' }}>{title}</div>
          <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
        </div>
        <div style={{ padding:'20px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

export const Alert = ({ type='error', message }) => {
  if(!message) return null
  const m={error:{bg:'#f43f5e15',border:'#f43f5e30',color:'var(--danger)'},success:{bg:'#22c55e15',border:'#22c55e30',color:'var(--success)'},info:{bg:'#5b8dee15',border:'#5b8dee30',color:'var(--accent)'},warn:{bg:'#f59e0b15',border:'#f59e0b30',color:'var(--warn)'}}
  const st=m[type]||m.error
  return <div style={{ background:st.bg,border:`1px solid ${st.border}`,borderRadius:8,padding:'10px 12px',color:st.color,fontSize:13 }}>{message}</div>
}

export const Spinner = ({ text='Loading…' }) => (
  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12,padding:60,color:'var(--text3)' }}>
    <div className="spinner"/><span style={{ fontSize:13 }}>{text}</span>
  </div>
)

export const ConfirmModal = ({ open, onClose, onConfirm, title, message, danger=false }) => (
  <Modal open={open} onClose={onClose} title={title} width={420}>
    <div style={{ fontSize:14,color:'var(--text2)',marginBottom:20 }}>{message}</div>
    <div style={{ display:'flex',gap:8 }}>
      <button className={`btn btn-sm ${danger?'btn-danger':'btn-primary'}`} onClick={onConfirm}>{danger?'Delete':'Confirm'}</button>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
    </div>
  </Modal>
)

export const TaskRow = ({ task, users, clients, onClick, compact=false }) => {
  const assignee = users?.find(u=>u.id===task.assignedTo)
  const client   = clients?.find(c=>c.id===task.clientId)
  const cst      = client?.clientStatus||'active'
  const allDone  = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]
  const isDone   = allDone.includes(task.status)
  const st       = getStatusObj(task.service,task.status)
  const bdr      = cst==='discontinued'?'#f43f5e30':cst==='on_hold'?'#f59e0b30':'var(--border)'
  return (
    <div onClick={onClick} className="hover-lift" style={{ display:'grid',gridTemplateColumns:'2fr 1.2fr 1fr 150px 110px 20px',alignItems:'center',gap:12,padding:'11px 16px',background:'var(--surface2)',borderRadius:10,cursor:'pointer',border:`1px solid ${bdr}`,opacity:isDone?.65:1,marginBottom:4 }}>
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:2 }}>
          <span style={{ fontWeight:600,fontSize:13,color:'var(--text)' }}>{task.service}</span>
          {task.isAdhoc&&<span className="chip" style={{ background:'#f59e0b15',color:'#f59e0b',border:'1px solid #f59e0b30',fontSize:9 }}>AD-HOC</span>}
          {cst!=='active'&&<ClientOverlay clientStatus={cst}/>}
        </div>
        <div style={{ fontSize:11,color:'var(--text2)' }}>{task.clientName} · {task.period}</div>
      </div>
      <div style={{ fontSize:12,color:'var(--text2)' }}>{fmtDate(task.dueDate)}</div>
      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
        {assignee&&<Avatar name={assignee.name} init={assignee.init} role={assignee.role} sz={22}/>}
        <span style={{ fontSize:12,color:'var(--text2)' }}>{assignee?.name?.split(' ')[0]||'?'}</span>
      </div>
      <span className="chip" style={{ background:st.bg,color:st.c,border:`1px solid ${st.c}35` }}>{st.l}</span>
      <DueBadge dueDate={task.dueDate} status={task.status}/>
      <div style={{ color:'var(--text3)' }}>›</div>
    </div>
  )
}

export const BucketSection = ({ label, tasks, color, users, clients, onTask, defaultOpen=true }) => {
  const [open,setOpen]=useState(defaultOpen)
  if(!tasks.length) return null
  return (
    <div style={{ marginBottom:20 }}>
      <div onClick={()=>setOpen(!open)} style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginBottom:open?10:0 }}>
        <div style={{ width:3,height:18,borderRadius:2,background:color }}/>
        <span style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>{label}</span>
        <span className="chip" style={{ background:`${color}20`,color,border:`1px solid ${color}30`,fontSize:11 }}>{tasks.length}</span>
        <span style={{ color:'var(--text3)',fontSize:12,marginLeft:'auto' }}>{open?'▲':'▼'}</span>
      </div>
      {open&&(
        <div>
          <div style={{ display:'grid',gridTemplateColumns:'2fr 1.2fr 1fr 150px 110px 20px',gap:12,padding:'4px 16px 6px',marginBottom:4 }}>
            {['Task / Client','Due Date','Assigned To','Status','Urgency',''].map((h,i)=>(
              <div key={i} style={{ fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em' }}>{h}</div>
            ))}
          </div>
          {tasks.map(t=><TaskRow key={t.id} task={t} users={users} clients={clients} onClick={()=>onTask(t)}/>)}
        </div>
      )}
    </div>
  )
}
