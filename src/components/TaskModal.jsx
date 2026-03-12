import { useState } from 'react'
import { arrayUnion } from 'firebase/firestore'
import { getServiceStatuses, getStatusObj, COMMENT_STATUSES, ROLES, CLIENT_STATUS, getCredForTask, ONBOARDING_CALL_URL, ONBOARDING_CALL_PASSWORD, DONE_PROPER, DONE_NIL, SOFT_DEPS } from '../constants.js'
import { fmtDate } from '../utils/dates.js'
import { updateTask, addTaskComment, deleteTask, getClientCredentials } from '../hooks/useFirestore.js'
import { logTaskStatusChanged, logTaskReassigned, logCommentAdded } from '../utils/auditLog.js'
import { Modal, Label, Avatar, Divider, Alert, ConfirmModal } from './UI.jsx'

export const TaskModal = ({ task, users, clients, currentUser, allTasks, onClose, onDeleted }) => {
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
  const [taskCreds,  setTaskCreds]  = useState([])
  const [credsLoaded,setCredsLoaded]= useState(false)
  const [editDue,    setEditDue]    = useState(task.dueDate||'')
  const [editNotes,  setEditNotes]  = useState(task.statusNote||'')
  const [editDesc,   setEditDesc]   = useState(task.period||'')
  const [editSaving, setEditSaving] = useState(false)

  const assignee   = users.find(u=>u.id===task.assignedTo)
  const client     = clients?.find(c=>c.id===task.clientId)
  const cst        = client?.clientStatus||'active'
  const cBadge     = CLIENT_STATUS[cst]
  const selectedSt = statuses.find(x=>x.v===status)||{}
  const canDelete  = !(['sales'].includes(currentUser.role)) && (['partner','hod'].includes(currentUser.role) || (task.isAdhoc && task.assignedTo===currentUser.id))

  const save = async () => {
    setSaving(true); setError('')
    try {
      const old = task.status
      const isDone = [...DONE_PROPER, ...DONE_NIL].includes(status)
      const wasNotDone = !([...DONE_PROPER, ...DONE_NIL].includes(old))
      await updateTask(task.id, {
        status, statusNote:note,
        arn: selectedSt.requiresArn ? arn : (task.arn||''),
        ref: selectedSt.requiresRef ? ref : (task.ref||''),
        history: arrayUnion({ action:`Status → ${selectedSt.l||status}`, by:currentUser.id, byName:currentUser.name, at:new Date().toISOString(), oldStatus:old }),
        ...(isDone && wasNotDone ? { completedAt: new Date().toISOString() } : {}),
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

  // Load credentials when creds tab is opened
  const relevantPortals = getCredForTask(task.service)
  const loadCreds = () => {
    if (credsLoaded || !relevantPortals.length) return
    setCredsLoaded(true)
    getClientCredentials(task.clientId, data => {
      setTaskCreds(data.filter(d => relevantPortals.some(p => p.v === d.service)))
    })
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
          {[['status','✏️ Status'],['edit','🖊 Edit'],['comments','💬 Comments'],['history','📋 History'],['creds','🔐 Credentials']].filter(([t])=>currentUser.role==='sales'?t!=='creds':true).map(([t,l])=>(
            <button key={t} onClick={()=>{ setTab(t); if(t==='creds') loadCreds() }} style={tabSt(tab===t)}>{l}</button>
          ))}
          <button onClick={()=>setReassigning(!reassigning)} style={{ ...tabSt(reassigning),marginLeft:'auto' }}>↔ Reassign</button>
          {canDelete&&(
            <button onClick={()=>setConfirmDel(true)} style={{ padding:'6px 12px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',background:'#f43f5e15',color:'var(--danger)',border:'1px solid #f43f5e30' }}>🗑 Delete</button>
          )}
        </div>


        {tab==='creds'&&(
          <div>
            {relevantPortals.length===0 ? (
              <div style={{ color:'var(--text3)',fontSize:13,padding:'20px 0',textAlign:'center' }}>No portals linked to this service type.</div>
            ) : taskCreds.length===0 ? (
              <div style={{ color:'var(--text3)',fontSize:13,padding:'20px 0',textAlign:'center' }}>
                No credentials saved for this client yet.<br/>
                <span style={{ fontSize:11,marginTop:6,display:'block' }}>Add them in Credential Manager.</span>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                {taskCreds.map(cr=>{
                  const svc = relevantPortals.find(p=>p.v===cr.service)
                  return (
                    <div key={cr.id} style={{ background:'var(--surface2)',borderRadius:10,padding:'12px 14px',border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                        <span style={{ fontSize:14 }}>{svc?.icon||'🔐'}</span>
                        <div style={{ fontWeight:700,fontSize:13,color:'var(--text)' }}>{svc?.l||cr.service}</div>
                        {svc?.url&&<a href={svc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:10,color:'var(--accent)',marginLeft:'auto' }}>Open Portal ↗</a>}
                      </div>
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
                        <div><Label>Login ID</Label><div style={{ fontSize:13,fontFamily:'var(--mono)',color:'var(--text)',background:'var(--surface3)',borderRadius:6,padding:'4px 8px',marginTop:2 }}>{cr.loginId||'—'}</div></div>
                        <div><Label>Password</Label><div style={{ fontSize:13,fontFamily:'var(--mono)',color:'var(--text)',background:'var(--surface3)',borderRadius:6,padding:'4px 8px',marginTop:2 }}>{cr.password||'—'}</div></div>
                      </div>
                      {cr.notes&&<div style={{ marginTop:6,fontSize:11,color:'var(--text3)' }}>📝 {cr.notes}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

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


        {task.service === 'Onboarding Call' && (
          <div style={{ background:'#5b8dee15',border:'1px solid #5b8dee40',borderRadius:10,padding:'14px 16px',marginBottom:16 }}>
            <div style={{ fontWeight:700,fontSize:13,color:'var(--accent)',marginBottom:10 }}>🔗 Onboarding Portal</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <span style={{ fontSize:12,color:'var(--text2)',width:70,flexShrink:0 }}>Link</span>
                <a href={ONBOARDING_CALL_URL} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:12,color:'var(--accent)',wordBreak:'break-all' }}>{ONBOARDING_CALL_URL}</a>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <span style={{ fontSize:12,color:'var(--text2)',width:70,flexShrink:0 }}>Password</span>
                <code style={{ fontSize:13,color:'var(--text)',background:'var(--surface3)',padding:'3px 8px',borderRadius:6,fontFamily:'var(--mono)',letterSpacing:'0.05em' }}>{ONBOARDING_CALL_PASSWORD}</code>
                <button className="btn btn-ghost btn-sm" style={{ padding:'2px 8px',fontSize:11 }}
                  onClick={()=>navigator.clipboard.writeText(ONBOARDING_CALL_PASSWORD)}>Copy</button>
              </div>
              <div style={{ marginTop:4 }}>
                <a href={ONBOARDING_CALL_URL} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary btn-sm" style={{ display:'inline-flex',alignItems:'center',gap:6,textDecoration:'none' }}>
                  Open Onboarding Portal ↗
                </a>
              </div>
            </div>
          </div>
        )}
        {tab==='status'&&(
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>


              {/* Sales Member: restricted status changes */}
              {currentUser.role === 'sales' && !task.isAdhoc && (
                <div style={{ background:'#f43f5e12',border:'1px solid #f43f5e30',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#f43f5e' }}>
                  🔒 Sales Members can only update status on Ad-hoc tasks.
                </div>
              )}
              {/* ── Soft dependency highlight ── */}
              {(() => {
                const deps = SOFT_DEPS[task.service] || []
                const taskList = allTasks || []
                if (!deps.length) return null
                const pending = deps.filter(dep => {
                  const depTask = taskList.find(t =>
                    t.clientId === task.clientId &&
                    t.service === dep &&
                    t.period === task.period &&
                    ![...DONE_PROPER,...DONE_NIL].includes(t.status)
                  )
                  return !!depTask
                })
                if (!pending.length) return null
                return (
                  <div style={{ background:'#f59e0b12',border:'1px solid #f59e0b40',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12 }}>
                    <div style={{ fontWeight:700,color:'#f59e0b',marginBottom:4 }}>⚠ Prerequisite tasks pending</div>
                    {pending.map(d=><div key={d} style={{ color:'var(--text2)' }}>• {d} · {task.period}</div>)}
                    <div style={{ color:'var(--text3)',marginTop:4,fontSize:11 }}>You can still update — this is a soft reminder only.</div>
                  </div>
                )
              })()}
              <Label>Update Status</Label>
              <select value={status} onChange={e=>setStatus(e.target.value)}
                disabled={currentUser.role==='sales' && !task.isAdhoc}>
                {(currentUser.role==='sales'
                  ? statuses.filter(x=>x.v==='on_hold'||x.v==='pending')
                  : statuses
                ).map(x=><option key={x.v} value={x.v}>{x.l}</option>)}
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
            <button className="btn btn-primary" onClick={save}
              disabled={saving||(currentUser.role==='sales'&&!task.isAdhoc)}>
              {saving?'Saving…':'Save Status Update'}
            </button>
          </div>
        )}

        {tab==='edit'&&(
          <>{currentUser.role==='sales'&&!task.isAdhoc&&(
            <div style={{background:'#f43f5e12',border:'1px solid #f43f5e30',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#f43f5e'}}>🔒 Sales Members can only edit due date on Ad-hoc tasks.</div>
          )}</>
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
