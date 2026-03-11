import { useState, useMemo } from 'react'
import { getServiceStatuses, CLIENT_CATEGORIES } from '../constants.js'
import { fmtDate, getBucket } from '../utils/dates.js'
import { updateTask } from '../hooks/useFirestore.js'
import { logTaskStatusChanged } from '../utils/auditLog.js'
import { Label, Alert } from '../components/UI.jsx'

const MONTHS = []
;[['2025','04'],['2025','05'],['2025','06'],['2025','07'],['2025','08'],['2025','09'],
  ['2025','10'],['2025','11'],['2025','12'],['2026','01'],['2026','02'],['2026','03'],
  ['2026','04'],['2026','05'],['2026','06'],['2026','07']].forEach(([y,m])=>{
  const label = new Date(+y,+m-1).toLocaleString('en-IN',{month:'short',year:'numeric'})
  MONTHS.push({v:`${y}-${m}`,l:label})
})

export const BulkUpdatesPage = ({ tasks, clients, users, currentUser }) => {
  const [fClient,  setFClient]  = useState('')
  const [fCat,     setFCat]     = useState('')
  const [fService, setFService] = useState('')
  const [fStatus,  setFStatus]  = useState('pending')
  const [fMonth,   setFMonth]   = useState('')
  const [selected, setSelected] = useState(new Set())
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState('')
  const [error,    setError]    = useState('')
  const [action,   setAction]   = useState('date') // 'date' | 'status'
  const [newDate,  setNewDate]  = useState('')
  const [newStatus,setNewStatus]= useState('')

  const services = [...new Set(tasks.map(t=>t.service))].sort()

  const filtered = useMemo(()=>{
    return tasks.filter(t=>{
      if (fClient  && t.clientId !== fClient) return false
      const cl = clients.find(c=>c.id===t.clientId)
      if (fCat && cl?.category !== fCat) return false
      if (fService && t.service !== fService) return false
      if (fMonth && (!t.dueDate || !t.dueDate.startsWith(fMonth))) return false
      if (fStatus === 'pending') {
        const b = getBucket(t)
        return !['done','nil','dropped'].includes(b)
      }
      if (fStatus === 'overdue') return getBucket(t) === 'overdue'
      return true
    }).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))
  }, [tasks, fClient, fService, fStatus, fCat, fMonth])

  const selectedTasks    = filtered.filter(t=>selected.has(t.id))
  const selectedServices = [...new Set(selectedTasks.map(t=>t.service))]
  const singleService    = selectedServices.length === 1
  const statusOptions    = singleService ? getServiceStatuses(selectedServices[0]) : []

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(t=>t.id)))
  }
  const toggleOne = (id) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const applyUpdate = async () => {
    if (!selected.size) { setError('Select at least one task.'); return }
    if (action === 'date' && !newDate) { setError('Pick a new due date.'); return }
    if (action === 'status' && !newStatus) { setError('Pick a new status.'); return }
    if (action === 'status' && !singleService) { setError('Select tasks of the same service type for bulk status update.'); return }
    setSaving(true); setError(''); setSuccess('')
    const ids = [...selected]
    try {
      for (const id of ids) {
        const t = tasks.find(x=>x.id===id)
        if (!t) continue
        if (action === 'date') {
          await updateTask(id, { dueDate: newDate })
        } else {
          const st = statusOptions.find(s=>s.v===newStatus)
          const isDone = [...(st?.done?[newStatus]:[])].length > 0 || st?.done
          await updateTask(id, {
            status: newStatus,
            ...(isDone ? { completedAt: new Date().toISOString() } : {}),
          })
          await logTaskStatusChanged(t, t.status, newStatus, currentUser, '')
        }
      }
      const msg = action === 'date'
        ? `✓ Due date updated to ${fmtDate(newDate)} for ${ids.length} task(s)`
        : `✓ Status updated to "${statusOptions.find(s=>s.v===newStatus)?.l||newStatus}" for ${ids.length} task(s)`
      setSuccess(msg)
      setSelected(new Set())
      setTimeout(()=>setSuccess(''), 4000)
    } catch(e) { setError(e.message) }
    setSaving(false)
  }

  const getStatusColor = (v, svc) => {
    const st = getServiceStatuses(svc).find(s=>s.v===v)
    return st ? st.c : '#8892b0'
  }

  return (
    <div className="fade-up print-root" style={{ padding:'0' }}>
      <div style={{ position:'sticky',top:0,zIndex:100,background:'var(--bg)',padding:'18px 28px 12px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:14 }}>⚡ Bulk Updates</div>

        {/* ── Filters ── */}
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end',marginBottom:10 }}>
          <div>
            <Label>Category</Label>
            <select value={fCat} onChange={e=>{setFCat(e.target.value);setFClient('')}} style={{ width:100 }}>
              <option value="">All</option>
              {CLIENT_CATEGORIES.map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <Label>Client</Label>
            <select value={fClient} onChange={e=>setFClient(e.target.value)} style={{ width:190 }}>
              <option value="">All Clients</option>
              {[...clients].sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Service</Label>
            <select value={fService} onChange={e=>setFService(e.target.value)} style={{ width:190 }}>
              <option value="">All Services</option>
              {services.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Month</Label>
            <select value={fMonth} onChange={e=>setFMonth(e.target.value)} style={{ width:130 }}>
              <option value="">All Months</option>
              {MONTHS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div>
            <Label>Show</Label>
            <select value={fStatus} onChange={e=>setFStatus(e.target.value)}>
              <option value="pending">Pending / Upcoming</option>
              <option value="overdue">Overdue Only</option>
              <option value="all">All Tasks</option>
            </select>
          </div>
        </div>

        {/* ── Action Panel ── */}
        {selected.size > 0 && (
          <div style={{ background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',marginTop:8 }}>
            <div style={{ fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:10 }}>
              ⚡ {selected.size} task{selected.size!==1?'s':''} selected — Choose action:
            </div>
            <div style={{ display:'flex',gap:8,marginBottom:12 }}>
              <button className={`btn btn-sm ${action==='date'?'btn-primary':'btn-ghost'}`} onClick={()=>setAction('date')}>📅 Update Due Date</button>
              <button className={`btn btn-sm ${action==='status'?'btn-primary':'btn-ghost'}`} onClick={()=>setAction('status')}>
                🔄 Update Status {!singleService && selected.size>0 && <span style={{ fontSize:10,color:'var(--warn)',marginLeft:4 }}>(select 1 service type)</span>}
              </button>
            </div>
            {action === 'date' && (
              <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                <Label>New Due Date</Label>
                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{ width:160 }}/>
                <button className="btn btn-primary" onClick={applyUpdate} disabled={saving||!newDate}>
                  {saving?'Saving…':`✓ Update ${selected.size} Task${selected.size!==1?'s':''}`}
                </button>
              </div>
            )}
            {action === 'status' && (
              <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
                {singleService ? (
                  <>
                    <Label>New Status</Label>
                    <select value={newStatus} onChange={e=>setNewStatus(e.target.value)} style={{ minWidth:200 }}>
                      <option value="">-- Select Status --</option>
                      {statusOptions.map(s=>(
                        <option key={s.v} value={s.v}>{s.l}{s.done?' ✓':''}</option>
                      ))}
                    </select>
                    <button className="btn btn-primary" onClick={applyUpdate} disabled={saving||!newStatus}>
                      {saving?'Saving…':`✓ Update ${selected.size} Task${selected.size!==1?'s':''}`}
                    </button>
                    <div style={{ fontSize:11,color:'var(--text3)' }}>Service: {selectedServices[0]}</div>
                  </>
                ) : (
                  <div style={{ fontSize:12,color:'var(--warn)',padding:'4px 0' }}>
                    ⚠ All selected tasks must be the same service type for bulk status update.<br/>
                    Currently selected: {selectedServices.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {success && <div style={{ marginTop:8 }}><Alert type="success" message={success}/></div>}
        {error   && <div style={{ marginTop:8 }}><Alert message={error}/></div>}
      </div>

      {/* ── Task Table ── */}
      <div style={{ padding:'16px 28px' }}>
        <div style={{ fontSize:12,color:'var(--text3)',marginBottom:10 }}>
          {filtered.length} tasks · {selected.size} selected
        </div>
        <div style={{ background:'var(--surface)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
            <thead>
              <tr style={{ background:'var(--surface2)',borderBottom:'1px solid var(--border)' }}>
                <th style={{ padding:'10px 14px',width:36 }}>
                  <input type="checkbox" checked={selected.size===filtered.length&&filtered.length>0} onChange={toggleAll}/>
                </th>
                {['Client','Cat','Service','Period','Due Date','Status','Assignee'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:700,color:'var(--text3)',fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t=>{
                const ov = getBucket(t) === 'overdue'
                const cl = clients.find(c=>c.id===t.clientId)
                const u  = users.find(u=>u.id===t.assignedTo)
                const stColor = getStatusColor(t.status, t.service)
                return (
                  <tr key={t.id} style={{ borderBottom:'1px solid var(--border2)',background:selected.has(t.id)?'#5b8dee12':'transparent',cursor:'pointer' }}
                    onClick={()=>toggleOne(t.id)}>
                    <td style={{ padding:'10px 14px' }}>
                      <input type="checkbox" checked={selected.has(t.id)} onChange={()=>toggleOne(t.id)} onClick={e=>e.stopPropagation()}/>
                    </td>
                    <td style={{ padding:'10px 14px',fontWeight:600,color:'var(--text)' }}>{t.clientName}</td>
                    <td style={{ padding:'8px 10px' }}>
                      {cl?.category && <span style={{ fontSize:10,padding:'1px 6px',borderRadius:4,background:'var(--surface3)',color:'var(--text3)',fontWeight:700 }}>{cl.category}</span>}
                    </td>
                    <td style={{ padding:'10px 14px',color:'var(--text2)' }}>{t.service}</td>
                    <td style={{ padding:'10px 14px',color:'var(--text3)',fontSize:11 }}>{t.period}</td>
                    <td style={{ padding:'10px 14px',color:ov?'var(--danger)':'var(--text2)',fontWeight:ov?700:400 }}>
                      {t.dueDate ? fmtDate(t.dueDate) : '—'}{ov&&' ⚠'}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ fontSize:11,padding:'2px 8px',borderRadius:4,background:`${stColor}18`,color:stColor,border:`1px solid ${stColor}30`,whiteSpace:'nowrap' }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px',color:'var(--text3)',fontSize:11 }}>{u?.name||'—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <div style={{ textAlign:'center',padding:40,color:'var(--text3)' }}>No tasks match your filters.</div>
          )}
        </div>
      </div>
    </div>
  )
}
