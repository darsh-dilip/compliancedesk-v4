import { useState } from 'react'
import { ADHOC_SERVICES, ROLES, FINANCIAL_YEARS } from '../constants.js'
import { createAdhocTask } from '../utils/taskGenerator.js'
import { addTask } from '../hooks/useFirestore.js'
import { writeLog } from '../utils/auditLog.js'
import { LOG_ACTIONS } from '../constants.js'
import { Label, Alert } from '../components/UI.jsx'

export const AddAdHocTask = ({ clients, users, currentUser, onBack, onSuccess }) => {
  const [form, setForm] = useState({
    clientId:'', service:'', description:'', assignedTo:'',
    dueDate:'', notes:'', fy:'2025-26',
  })
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)
  const [success,setSuccess]=useState(false)

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const eligible = currentUser?.role==='sales'
    ? users.filter(u=>['hod','team_leader'].includes(u.role))
    : users.filter(u=>['team_leader','executive','intern'].includes(u.role))
  const selectedClient = clients.find(c=>c.id===form.clientId)

  const submit = async () => {
    if(!form.clientId){ setError('Please select a client.'); return }
    if(!form.service){  setError('Please select a service type.'); return }
    if(!form.description){ setError('Please enter a task description / subject.'); return }
    if(!form.assignedTo){ setError('Please assign to a team member.'); return }
    setSaving(true); setError('')
    try {
      const task = createAdhocTask({
        clientId: form.clientId,
        clientName: selectedClient?.name||'',
        service: form.service,
        description: form.description,
        assignedTo: form.assignedTo,
        dueDate: form.dueDate,
        notes: form.notes,
        fy: form.fy,
      })
      const ref = await addTask(task)
      await writeLog({
        action: LOG_ACTIONS.ADHOC_TASK_CREATED,
        by: currentUser,
        entityId: ref.id,
        entityName: `${form.service} — ${form.description}`,
        clientId: form.clientId,
        clientName: selectedClient?.name||'',
        newValue: form.service,
        note: form.notes,
      })
      setSuccess(true)
      setTimeout(()=>{ onSuccess?.(); onBack() }, 1200)
    } catch(e){ setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:620 }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom:16 }}>← Back</button>
      <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4 }}>Add Ad-hoc Task</div>
      <div style={{ fontSize:13,color:'var(--text2)',marginBottom:22 }}>Create a one-off task for an existing client.</div>

      {success&&<Alert type="success" message="✓ Ad-hoc task created!"/>}

      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div><Label>Client *</Label>
            <select value={form.clientId} onChange={e=>set('clientId',e.target.value)}>
              <option value="">-- Select Client --</option>
              {[...clients].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>(
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div><Label>Service Type *</Label>
            <select value={form.service} onChange={e=>set('service',e.target.value)}>
              <option value="">-- Select Service --</option>
              {ADHOC_SERVICES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div><Label>Task Description / Subject *</Label>
            <input placeholder="e.g. GST registration for new branch in Pune" value={form.description} onChange={e=>set('description',e.target.value)}/>
          </div>

          <div className="grid-2" style={{ gap:10 }}>
            <div><Label>Assign To *</Label>
              <select value={form.assignedTo} onChange={e=>set('assignedTo',e.target.value)}>
                <option value="">-- Select Member --</option>
                {eligible.map(u=><option key={u.id} value={u.id}>{u.name} ({ROLES[u.role]})</option>)}
              </select>
            </div>
            <div><Label>Due Date</Label>
              <input type="date" value={form.dueDate} onChange={e=>set('dueDate',e.target.value)}/>
            </div>
          </div>

          <div><Label>Financial Year</Label>
            <select value={form.fy} onChange={e=>set('fy',e.target.value)}>
              {FINANCIAL_YEARS.map(f=><option key={f} value={f}>FY {f}</option>)}
            </select>
          </div>

          <div><Label>Notes (optional)</Label>
            <textarea placeholder="Any special instructions or context…" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} style={{ resize:'vertical' }}/>
          </div>

          {error&&<Alert message={error}/>}

          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={saving||success}>
              {saving?'Creating…':'✚ Create Ad-hoc Task'}
            </button>
            <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
