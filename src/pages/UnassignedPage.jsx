import { useState, useMemo } from 'react'
import { updateTask, updateClient } from '../hooks/useFirestore.js'
import { ROLES, ROLE_CLR, FINANCIAL_YEARS } from '../constants.js'
import { Avatar } from '../components/UI.jsx'
import { writeLog } from '../utils/auditLog.js'
import { LOG_ACTIONS } from '../constants.js'

// ── helpers ──────────────────────────────────────────────────────────────
const assignableUsers = (users) =>
  (users||[]).filter(u => ['hod','team_leader','executive','intern'].includes(u.role))
    .sort((a,b) => a.name.localeCompare(b.name))

// ── main ─────────────────────────────────────────────────────────────────
export const UnassignedPage = ({ tasks, clients, users, currentUser }) => {
  const [tab,         setTab]         = useState('tasks')   // 'tasks' | 'clients'
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [assignTo,    setAssignTo]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [done,        setDone]        = useState(0)
  const [fy,          setFY]          = useState('2026-27')
  const [search,      setSearch]      = useState('')

  const eligible = useMemo(() => assignableUsers(users), [users])

  // Unassigned tasks
  const unassignedTasks = useMemo(() => {
    return (tasks||[]).filter(t => {
      if (t.assignedTo) return false
      if (fy && t.fy !== fy) return false
      if (search && !(t.clientName||'').toLowerCase().includes(search.toLowerCase()) &&
          !(t.service||'').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tasks, fy, search])

  // Unassigned clients
  const unassignedClients = useMemo(() => {
    return (clients||[]).filter(c => {
      if (c.assignedTo) return false
      if (search && !(c.name||'').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [clients, search])

  const rows = tab === 'tasks' ? unassignedTasks : unassignedClients

  // Toggle selection
  const toggle = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  const toggleAll = () => {
    if (selectedIds.size === rows.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(rows.map(r => r.id)))
  }

  // Bulk assign
  const bulkAssign = async () => {
    if (!assignTo || selectedIds.size === 0) return
    setSaving(true)
    setDone(0)
    const assignee = users.find(u => u.id === assignTo)
    let count = 0
    for (const id of selectedIds) {
      try {
        if (tab === 'tasks') {
          await updateTask(id, { assignedTo: assignTo })
          await writeLog({ action:LOG_ACTIONS.TASK_REASSIGNED, by:currentUser, entityId:id, entityName:'', clientId:'', clientName:'', oldValue:'Unassigned', newValue:assignee?.name||assignTo })
        } else {
          await updateClient(id, { assignedTo: assignTo })
        }
        count++
        setDone(count)
      } catch(e) { console.error(e) }
    }
    setSelectedIds(new Set())
    setAssignTo('')
    setSaving(false)
  }

  const tabSt = (active) => ({
    padding:'7px 18px', borderRadius:6, fontSize:13, fontWeight:active?700:500,
    cursor:'pointer', border:'none',
    background: active ? 'var(--accent)' : 'var(--surface2)',
    color: active ? '#fff' : 'var(--text2)',
  })

  return (
    <div className="fade-up" style={{ padding:'24px 28px', maxWidth:1100 }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>📌 Unassigned</div>
        <div style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
          Tasks and clients with no assignee — select and bulk assign below
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <button style={tabSt(tab==='tasks')} onClick={()=>{ setTab('tasks'); setSelectedIds(new Set()) }}>
          📋 Unassigned Tasks
          <span style={{ marginLeft:8, fontSize:11, fontWeight:700,
            background:'rgba(255,255,255,0.2)', padding:'1px 7px', borderRadius:10 }}>
            {unassignedTasks.length}
          </span>
        </button>
        <button style={tabSt(tab==='clients')} onClick={()=>{ setTab('clients'); setSelectedIds(new Set()) }}>
          🏢 Unassigned Clients
          <span style={{ marginLeft:8, fontSize:11, fontWeight:700,
            background:'rgba(255,255,255,0.2)', padding:'1px 7px', borderRadius:10 }}>
            {unassignedClients.length}
          </span>
        </button>
      </div>

      {/* Filters + assign bar */}
      <div className="card" style={{ padding:'12px 16px', marginBottom:12,
        display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <input placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ fontSize:12, minWidth:180, flex:1, maxWidth:260 }}/>
        {tab==='tasks' && (
          <select value={fy} onChange={e=>setFY(e.target.value)} style={{ fontSize:12, minWidth:110 }}>
            <option value="">All FY</option>
            {FINANCIAL_YEARS.map(f=><option key={f} value={f}>FY {f}</option>)}
          </select>
        )}
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          {selectedIds.size > 0 && (
            <span style={{ fontSize:12, color:'var(--text3)' }}>
              {selectedIds.size} selected
            </span>
          )}
          <select value={assignTo} onChange={e=>setAssignTo(e.target.value)}
            style={{ fontSize:12, minWidth:180 }}>
            <option value="">— Assign to… —</option>
            {eligible.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({ROLES[u.role]})</option>
            ))}
          </select>
          <button className="btn btn-primary"
            disabled={!assignTo || selectedIds.size===0 || saving}
            onClick={bulkAssign}
            style={{ whiteSpace:'nowrap' }}>
            {saving ? `Assigning… (${done}/${selectedIds.size})` : `Assign ${selectedIds.size||''}`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text3)', fontSize:14 }}>
            🎉 No unassigned {tab} — everything is covered!
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
                <th style={{ padding:'10px 14px', width:40 }}>
                  <input type="checkbox"
                    checked={selectedIds.size===rows.length && rows.length>0}
                    onChange={toggleAll}
                    style={{ cursor:'pointer' }}/>
                </th>
                {tab==='tasks' ? (
                  <>
                    <th style={thSt}>Client</th>
                    <th style={thSt}>Service</th>
                    <th style={thSt}>Period</th>
                    <th style={thSt}>FY</th>
                    <th style={thSt}>Due Date</th>
                  </>
                ) : (
                  <>
                    <th style={thSt}>Client</th>
                    <th style={thSt}>Constitution</th>
                    <th style={thSt}>Category</th>
                    <th style={thSt}>Status</th>
                    <th style={thSt}>Created</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}
                  onClick={() => toggle(r.id)}
                  style={{ borderBottom:'1px solid var(--border)', cursor:'pointer',
                    background: selectedIds.has(r.id) ? 'var(--accent)10' : i%2===0 ? 'transparent' : 'var(--surface2)',
                    outline: selectedIds.has(r.id) ? '1px solid var(--accent)' : 'none' }}>
                  <td style={{ padding:'10px 14px' }}>
                    <input type="checkbox" checked={selectedIds.has(r.id)}
                      onChange={()=>toggle(r.id)} onClick={e=>e.stopPropagation()}
                      style={{ cursor:'pointer' }}/>
                  </td>
                  {tab==='tasks' ? (
                    <>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'var(--text)' }}>{r.clientName||'—'}</td>
                      <td style={{ padding:'10px 14px', color:'var(--text2)' }}>{r.service}</td>
                      <td style={{ padding:'10px 14px', color:'var(--text3)' }}>{r.period}</td>
                      <td style={{ padding:'10px 14px', color:'var(--text3)' }}>{r.fy}</td>
                      <td style={{ padding:'10px 14px', color: r.dueDate<new Date().toISOString().split('T')[0]?'#f43f5e':'var(--text2)' }}>
                        {r.dueDate||'—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'var(--text)' }}>{r.name}</td>
                      <td style={{ padding:'10px 14px', color:'var(--text2)' }}>{r.constitution||'—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        {r.category && <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)',
                          background:'var(--surface3)', padding:'2px 7px', borderRadius:4,
                          border:'1px solid var(--border2)' }}>{r.category}</span>}
                      </td>
                      <td style={{ padding:'10px 14px', color:'var(--text3)', fontSize:12 }}>
                        {r.clientStatus||'active'}
                      </td>
                      <td style={{ padding:'10px 14px', color:'var(--text3)', fontSize:12 }}>
                        {r.createdAt ? new Date(r.createdAt?.toDate?.()??r.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {done > 0 && !saving && (
        <div style={{ marginTop:12, padding:'10px 16px', background:'#22c55e12',
          border:'1px solid #22c55e40', borderRadius:8, fontSize:13, color:'#22c55e', fontWeight:600 }}>
          ✓ {done} {tab} assigned successfully
        </div>
      )}
    </div>
  )
}

const thSt = {
  padding:'10px 14px', textAlign:'left', fontWeight:700,
  fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.05em'
}
