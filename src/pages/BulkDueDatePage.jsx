import { useState, useMemo } from 'react'
import { getServiceStatuses, CLIENT_CATEGORIES } from '../constants.js'
import { fmtDate, getBucket } from '../utils/dates.js'
import { updateTask } from '../hooks/useFirestore.js'
import { Label, Alert } from '../components/UI.jsx'
import { PrintButton } from '../components/UI.jsx'

export const BulkDueDatePage = ({ tasks, clients, users, currentUser }) => {
  const [fClient,  setFClient]  = useState('')
  const [fCat,     setFCat]     = useState('')
  const [fService, setFService] = useState('')
  const [fStatus,  setFStatus]  = useState('pending')
  const [newDate,  setNewDate]  = useState('')
  const [selected, setSelected] = useState(new Set())
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState('')

  const services = [...new Set(tasks.map(t=>t.service))].sort()

  const filtered = useMemo(()=>{
    return tasks.filter(t=>{
      if (fClient  && t.clientId !== fClient)   return false
      const cl = clients.find(c=>c.id===t.clientId)
      if (fCat && cl?.category !== fCat) return false
      if (fService && t.service  !== fService)  return false
      if (fStatus === 'pending') {
        const b = getBucket(t)
        return !['done','nil','dropped'].includes(b)
      }
      if (fStatus === 'overdue') return getBucket(t) === 'overdue'
      return true
    }).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))
  }, [tasks, fClient, fService, fStatus])

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(t=>t.id)))
    }
  }

  const toggleOne = (id) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const applyUpdate = async () => {
    if (!newDate)         { alert('Pick a new due date first.'); return }
    if (!selected.size)   { alert('Select at least one task.'); return }
    setSaving(true)
    const toUpdate = [...selected]
    for (const id of toUpdate) {
      await updateTask(id, { dueDate: newDate })
    }
    setSaving(false)
    setSuccess(`✓ Updated due date for ${toUpdate.length} task(s) to ${fmtDate(newDate)}`)
    setSelected(new Set())
    setTimeout(()=>setSuccess(''), 3000)
  }

  return (
    <div className="fade-up" style={{ padding:'0' }}>
      <PrintButton title="Bulk Due Date Update"/>
      {/* Sticky header */}
      <div style={{ position:'sticky',top:0,zIndex:100,background:'var(--bg)',padding:'18px 28px 12px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:12 }}>📅 Bulk Due Date Update</div>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end' }}>
          <div>
            <Label>Category</Label>
            <select value={fCat} onChange={e=>{setFCat(e.target.value);setFClient('')}} style={{ width:130 }}>
              <option value="">All</option>
              {CLIENT_CATEGORIES.map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <Label>Client</Label>
            <select value={fClient} onChange={e=>setFClient(e.target.value)} style={{ width:200 }}>
              <option value="">All Clients</option>
              {[...clients].sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Service</Label>
            <select value={fService} onChange={e=>setFService(e.target.value)} style={{ width:200 }}>
              <option value="">All Services</option>
              {services.map(s=><option key={s} value={s}>{s}</option>)}
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
          <div>
            <Label>New Due Date *</Label>
            <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={applyUpdate} disabled={saving||!selected.size||!newDate}
            style={{ alignSelf:'flex-end' }}>
            {saving ? 'Saving…' : `✓ Update ${selected.size} Task${selected.size!==1?'s':''}`}
          </button>
        </div>
        {success && <div style={{ marginTop:8 }}><Alert type="success" message={success}/></div>}
      </div>

      {/* Table */}
      <div style={{ padding:'16px 28px' }}>
        <div style={{ fontSize:12,color:'var(--text3)',marginBottom:10 }}>
          {filtered.length} tasks · {selected.size} selected
        </div>
        <div style={{ background:'var(--surface)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
            <thead>
              <tr style={{ background:'var(--surface2)',borderBottom:'1px solid var(--border)' }}>
                <th style={{ padding:'10px 14px',width:36 }}>
                  <input type="checkbox" checked={selected.size===filtered.length&&filtered.length>0}
                    onChange={toggleAll}/>
                </th>
                {['Client','Service','Period','Current Due Date','Status'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:700,color:'var(--text3)',fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t=>{
                const ov = getBucket(t) === 'overdue'
                return (
                  <tr key={t.id} style={{ borderBottom:'1px solid var(--border2)',background:selected.has(t.id)?'#5b8dee10':'transparent' }}
                    onClick={()=>toggleOne(t.id)}>
                    <td style={{ padding:'10px 14px' }}>
                      <input type="checkbox" checked={selected.has(t.id)} onChange={()=>toggleOne(t.id)} onClick={e=>e.stopPropagation()}/>
                    </td>
                    <td style={{ padding:'10px 14px',fontWeight:600,color:'var(--text)' }}>{t.clientName}</td>
                    <td style={{ padding:'10px 14px',color:'var(--text2)' }}>{t.service}</td>
                    <td style={{ padding:'10px 14px',color:'var(--text3)' }}>{t.period}</td>
                    <td style={{ padding:'10px 14px',color:ov?'var(--danger)':'var(--text2)',fontWeight:ov?700:400 }}>
                      {t.dueDate ? fmtDate(t.dueDate) : '—'}
                      {ov && ' ⚠️'}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ fontSize:10,padding:'2px 7px',borderRadius:4,background:'var(--surface3)',color:'var(--text3)' }}>
                        {t.status}
                      </span>
                    </td>
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
