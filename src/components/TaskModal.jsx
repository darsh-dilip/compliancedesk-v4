import { useState } from 'react'
import { arrayUnion } from 'firebase/firestore'
import { getServiceStatuses, getStatusObj, COMMENT_STATUSES, ROLES, CLIENT_STATUS } from '../constants.js'
import { fmtDate } from '../utils/dates.js'
import { updateTask, addTaskComment, deleteTask } from '../hooks/useFirestore.js'
import { logTaskStatusChanged, logTaskReassigned, logCommentAdded } from '../utils/auditLog.js'
import { Modal, Label, Avatar, Divider, Alert, ConfirmModal } from './UI.jsx'

export const TaskModal = ({ task, users, clients, currentUser, onClose, onDeleted }) => {
  const statuses  = getServiceStatuses(task.service)
  const currentSt = getStatusObj(task.service, task.status)

  const [status,     setStatus]     = useState(task.status)
  const [note,       setNote]       = useState(task.statusNote||'')
  const [arn,        setArn]        = useState(task.arn||'')
  const [ref,        setRef]        = useState(task.ref||'')
  const [comment,    setComment]    = useState('')
  const [commentTag, setCommentTag] = useState('')
  const [reassigning,setReassigning]=useState(false)
  const [newAssignee,setNewAssignee]=useState(task.assignedTo)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error,      setError]      = useState('')
  const [tab,        setTab]        = useState('status')
  const [editDue,    setEditDue]    = useState(task.dueDate||'')
  const [editNotes,  setEditNotes]  = useState(task.statusNote||'')
  const [editDesc,   setEditDesc]   = useState(task.period||'')
  const [editSaving, setEditSaving] = useState(false)

  const assignee   = users.find(u=>u.id===task.assignedTo)
  const client     = clients?.find(c=>c.id===task.clientId)
  const cst        = client?.clientStatus||'active'
  const cBadge     = CLIENT_STATUS[cst]
  const selectedSt = statuses.find(x=>x.v===status)||{}
  const canDelete  = ['partner','hod'].includes(currentUser.role) || (task.isAdhoc && task.assignedTo===currentUser.id)

  const save = async () => {
    setSaving(true); setError('')
    try {
      const old = task.status
      await updateTask(task.id, {
        status, statusNote:note,
        arn: selectedSt.requiresArn ? arn : (task.arn||''),
        ref: selectedSt.requiresRef ? ref : (task.ref||''),
        history: arrayUnion({ action:`Status → ${selectedSt.l||status}`, by:currentUser.id, byName:currentUser.name, at:new Date().toISOString(), oldStatus:old }),
      })
      await logTaskStatusChanged(task, old, status, currentUser, arn||ref)
      onClose()
    } catch(e){ setError(e.message) } finally { setSaving(false) }
  }

  const addComment = async () => {
    const text=[commentTag,comment].filter(Boolean).join(' — ')
    if(!text.trim()) return
    const entry={ text, tag:commentTag, at:new Date().toISOString(), by:currentUser.id, byName:currentUser.name }
    await addTaskComment(task.id, entry)
    await logCommentAdded(task, text, currentUser)
    setComment(''); setCommentTag('')
  }

  const doReassign = async () => {
    const oldN=assignee?.name||'Unknown'; const newN=users.find(u=>u.id===newAssignee)?.name||'Unknown'
    await updateTask(task.id, { assignedTo:newAssignee, history:arrayUnion({ action:`Reassigned → ${newN}`, by:currentUser.id, byName:currentUser.name, at:new Date().toISOString() }) })
    await logTaskReassigned(task, oldN, newN, currentUser)
    setReassigning(false)
  }

  const doDelete = async () => {
    setDeleting(true)
    await deleteTask(task.id)
    setDeleting(false); setConfirmDel(false)
    onDeleted?.()
    onClose()
  }

  const saveEdit = async () => {
    setEditSaving(true); setError('')
    try {
      await updateTask(task.id, { dueDate:editDue, notes:editNotes })
      onClose()
    } catch(e){ setError(e.message) } finally { setEditSaving(false) }
  }

  const tabSt = active => ({
    padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',
    background:active?'var(--surface3)':'transparent',color:active?'var(--text)':'var(--text3)',
    border:active?'1px solid var(--border2)':'1px solid transparent',
  })

  return (
    <>
      <Modal open onClose={onClose} title={task.service} width={580}>
        {cBadge?.badge&&(
          <div style={{ background:cBadge.badgeBg,border:`1px solid ${cBadge.badgeBorder}`,borderRadius:8,padding:'8px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontWeight:800,fontSize:12,color:cBadge.badgeColor }}>{cBadge.badge}</span>
            <span style={{ fontSize:12,color:cBadge.badgeColor }}>{client?.name} is {CLIENT_STATUS[cst]?.l?.toLowerCase()}</span>
          </div>
        )}

        <div style={{ background:'var(--surface2)',borderRadius:10,padding:'12px 14px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16 }}>
          <div><Label>Client</Label><div style={{ fontWeight:600,fontSize:13 }}>{task.clientName}</div></div>
          <div><Label>Period</Label><div style={{ fontSize:13 }}>{task.period}</div></div>
          <div><Label>Due Date</Label><div style={{ fontSize:13 }}>{fmtDate(task.dueDate)}</div></div>
          <div>
            <Label>Assigned To</Label>
            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
              {assignee&&<Avatar name={assignee.name} init={assignee.init} role={assignee.role} sz={20}/>}
              <span style={{ fontSize:13 }}>{assignee?.name||'Unassigned'}</span>
            </div>
          </div>
          <div><Label>Current Status</Label><span className="chip" style={{ background:currentSt.bg,color:currentSt.c,border:`1px solid ${currentSt.c}35` }}>{currentSt.l||task.status}</span></div>
          {(task.arn||task.ref)&&(
            <div><Label>{task.arn?'ARN':'Reference'}</Label><div style={{ fontSize:12,color:'var(--success)',fontFamily:'var(--mono)' }}>{task.arn||task.ref}</div></div>
          )}
        </div>

        <div style={{ display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--border)',paddingBottom:10,flexWrap:'wrap' }}>
          {[['status','✏️ Status'],['edit','🖊 Edit'],['comments','💬 Comments'],['history','📋 History']].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={tabSt(tab===t)}>{l}</button>
          ))}
          <button onClick={()=>setReassigning(!reassigning)} style={{ ...tabSt(reassigning),marginLeft:'auto' }}>↔ Reassign</button>
          {canDelete&&(
            <button onClick={()=>setConfirmDel(true)} style={{ padding:'6px 12px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',background:'#f43f5e15',color:'var(--danger)',border:'1px solid #f43f5e30' }}>🗑 Delete</button>
          )}
        </div>

        {reassigning&&(
          <div style={{ background:'var(--surface2)',borderRadius:10,padding:12,marginBottom:14 }}>
            <Label>Reassign to</Label>
            <div style={{ display:'flex',gap:8,marginTop:6 }}>
              <select value={newAssignee} onChange={e=>setNewAssignee(e.target.value)} style={{ flex:1 }}>
                {users.filter(u=>u.role!=='partner').map(u=><option key={u.id} value={u.id}>{u.name} ({ROLES[u.role]})</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={doReassign}>Confirm</button>
            </div>
          </div>
        )}

        {tab==='status'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <Label>Update Status</Label>
              <select value={status} onChange={e=>setStatus(e.target.value)}>
                {statuses.map(x=><option key={x.v} value={x.v}>{x.l}</option>)}
              </select>
              {selectedSt.l&&(
                <div style={{ marginTop:6,display:'flex',alignItems:'center',gap:8 }}>
                  <span className="chip" style={{ background:selectedSt.bg,color:selectedSt.c,border:`1px solid ${selectedSt.c}35` }}>{selectedSt.l}</span>
                  {selectedSt.done&&<span style={{ fontSize:11,color:'var(--success)' }}>✓ Marks task as done</span>}
                </div>
              )}
            </div>
            {selectedSt.requiresArn&&(
              <div><Label>ARN / Acknowledgement *</Label><input placeholder="Enter ARN or Ack. No." value={arn} onChange={e=>setArn(e.target.value)}/></div>
            )}
            {selectedSt.requiresRef&&(
              <div><Label>{selectedSt.refLabel||'Reference Number'} *</Label><input placeholder={`Enter ${selectedSt.refLabel||'reference'}`} value={ref} onChange={e=>setRef(e.target.value)}/></div>
            )}
            <div><Label>Internal Note (optional)</Label><textarea placeholder="Add an internal note…" value={note} onChange={e=>setNote(e.target.value)} rows={2} style={{ resize:'vertical' }}/></div>
            {error&&<Alert message={error}/>}
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save Status Update'}</button>
          </div>
        )}

        {tab==='edit'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <Label>Due Date</Label>
              <input type="date" value={editDue} onChange={e=>setEditDue(e.target.value)}/>
            </div>
            {task.isAdhoc&&(
              <div>
                <Label>Task Description / Subject</Label>
                <input value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="Task description…"/>
              </div>
            )}
            <div>
              <Label>Internal Note</Label>
              <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} rows={3} style={{ resize:'vertical' }} placeholder="Add an internal note…"/>
            </div>
            <button className="btn btn-primary" onClick={saveEdit} disabled={editSaving}>{editSaving?'Saving…':'Save Changes'}</button>
          </div>
        )}

        {tab==='comments'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            <div>
              <Label>Quick Tag</Label>
              <select value={commentTag} onChange={e=>setCommentTag(e.target.value)}>
                <option value="">-- Select tag (optional) --</option>
                {COMMENT_STATUSES.map(cs=><option key={cs} value={cs}>{cs}</option>)}
              </select>
            </div>
            <div>
              <Label>Comment</Label>
              <div style={{ display:'flex',gap:8 }}>
                <input placeholder="Type a comment…" value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} style={{ flex:1 }}/>
                <button className="btn btn-primary btn-sm" onClick={addComment}>Add</button>
              </div>
            </div>
            <Divider/>
            <div style={{ maxHeight:280,overflow:'auto',display:'flex',flexDirection:'column',gap:8 }}>
              {!(task.comments?.length)&&<div style={{ color:'var(--text3)',fontSize:12,textAlign:'center',padding:20 }}>No comments yet.</div>}
              {[...(task.comments||[])].reverse().map((c,i)=>{
                const u=users.find(x=>x.id===c.by)
                return (
                  <div key={i} style={{ display:'flex',gap:8 }}>
                    <Avatar name={u?.name||c.byName} init={u?.init} role={u?.role} sz={26}/>
                    <div style={{ background:'var(--surface2)',borderRadius:8,padding:'8px 10px',flex:1 }}>
                      <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4 }}>
                        <span style={{ fontSize:11,fontWeight:600,color:'var(--text2)' }}>{u?.name||c.byName}</span>
                        {c.tag&&<span className="chip" style={{ background:'#5b8dee15',color:'#5b8dee',border:'1px solid #5b8dee25',fontSize:10 }}>{c.tag}</span>}
                        <span style={{ fontSize:10,color:'var(--text3)',marginLeft:'auto' }}>{new Date(c.at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <div style={{ fontSize:13,color:'var(--text)' }}>{c.text}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab==='history'&&(
          <div style={{ maxHeight:320,overflow:'auto' }}>
            {!(task.history?.length)&&<div style={{ color:'var(--text3)',fontSize:12,textAlign:'center',padding:20 }}>No history yet.</div>}
            {[...(task.history||[])].reverse().map((h,i)=>(
              <div key={i} style={{ display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:'var(--accent)',marginTop:5,flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:13,color:'var(--text)' }}>{h.action}</div>
                  <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>by {h.byName||'?'} · {new Date(h.at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDel} onClose={()=>setConfirmDel(false)} onConfirm={doDelete}
        title="Delete Task" danger
        message={`Are you sure you want to delete "${task.service} — ${task.period}" for ${task.clientName}? This cannot be undone.`}
      />
    </>
  )
}
