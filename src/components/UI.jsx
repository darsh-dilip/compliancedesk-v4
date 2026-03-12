import { useState } from 'react'
import { ROLE_CLR, DONE_STATUSES, DONE_NIL, DONE_PROPER, CLIENT_STATUS, getStatusObj } from '../constants.js'
import { daysDiff, fmtDate } from '../utils/dates.js'

export const Avatar = ({ name, init, role, sz=32, rank=null, streak=false }) => {
  const c = ROLE_CLR[role]||'#5b8dee'
  const i = init||(name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
  // rank rings: gold=double border, silver=white ring, bronze=copper ring
  // Technique: outline + box-shadow gives a clean double-ring effect
  const ringStyle = rank===1
    ? { boxShadow:'0 0 0 2px #1e293b, 0 0 0 4px #f59e0b, 0 0 0 5px #fde68a50' }   // gold
    : rank===2
    ? { boxShadow:'0 0 0 2px #1e293b, 0 0 0 4px #cbd5e1, 0 0 0 5px #f1f5f950' }   // silver
    : rank===3
    ? { boxShadow:'0 0 0 2px #1e293b, 0 0 0 4px #b45309, 0 0 0 5px #d9770640' }   // bronze
    : null
  if (!rank && !streak) {
    return <div style={{ width:sz,height:sz,borderRadius:'50%',background:`${c}20`,border:`1.5px solid ${c}45`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:sz*.36,fontWeight:700,color:c,flexShrink:0 }}>{i}</div>
  }
  return (
    <div style={{ position:'relative',flexShrink:0,width:sz+(rank?10:0),height:sz+(rank?10:0),display:'inline-flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{
        width:sz,height:sz,borderRadius:'50%',background:`${c}20`,
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:sz*.36,fontWeight:700,color:c,
        ...(ringStyle||{ boxShadow:`0 0 0 1.5px ${c}45` }),
      }}>{i}</div>
      {rank===1&&<span style={{ position:'absolute',top:-sz*.28,left:'50%',transform:'translateX(-50%)',fontSize:sz*.32,lineHeight:1,pointerEvents:'none' }}>👑</span>}
      {streak&&<span style={{ position:'absolute',bottom:-sz*.16,right:-sz*.16,fontSize:sz*.32,lineHeight:1,pointerEvents:'none' }}>🔥</span>}
    </div>
  )
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
  const bdr      = cst==='discontinued'?'#f43f5e30':cst==='struck_off'?'#6b728040':cst==='on_hold'?'#f59e0b30':cst==='closure'?'#06b6d440':'var(--border)'
  return (
    <div onClick={onClick} className="hover-lift" style={{ display:'grid',gridTemplateColumns:'2fr 1.2fr 1fr 150px 110px 20px',alignItems:'center',gap:12,padding:'11px 16px',background:cst==='closure'?'#06b6d408':cst==='struck_off'?'#6b728008':'var(--surface2)',borderRadius:10,cursor:'pointer',border:`1px solid ${bdr}`,borderLeft:cst==='closure'?'3px solid #06b6d460':cst==='struck_off'?'3px solid #6b728060':undefined,opacity:isDone?.65:1,marginBottom:4 }}>
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

// ── Print Button ────────────────────────────────────────────
export const PrintButton = ({ title = 'ComplianceDesk' }) => {
  const handlePrint = () => {
    const prev = document.title
    document.title = title
    window.print()
    document.title = prev
  }
  return (
    <button
      className="no-print btn btn-ghost btn-sm"
      onClick={handlePrint}
      style={{ borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:600 }}
    >
      PDF
    </button>
  )
}


// ── Excel Export Button ──────────────────────────────────────────────────
export const ExcelButton = ({ getData, filename = 'export' }) => {
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx')
      const { headers, rows } = getData()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      ws['!cols'] = headers.map(() => ({ wch: 20 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data')
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch(e) { console.error('Excel export failed', e) }
  }
  return (
    <button
      className="btn btn-ghost btn-sm no-print"
      onClick={handleExport}
      style={{ borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:600 }}
    >
      Excel
    </button>
  )
}
// ── Print Header (visible only on print) ────────────────────
export const PrintHeader = ({ title, subtitle }) => (
  <div className="print-header" style={{ display: 'none' }}>
    <div style={{ fontWeight: 800, fontSize: 18 }}>⚖️ ComplianceDesk — {title}</div>
    {subtitle && <div style={{ fontSize: 12, marginTop: 4 }}>{subtitle}</div>}
    <div style={{ fontSize: 11, marginTop: 4, color: '#555' }}>
      Printed: {new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
    </div>
  </div>
)
