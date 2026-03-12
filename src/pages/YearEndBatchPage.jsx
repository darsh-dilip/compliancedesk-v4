import { useState, useMemo } from 'react'
import { bulkAddTasks } from '../hooks/useFirestore.js'
import { generateTasks } from '../utils/taskGenerator.js'
import { FINANCIAL_YEARS } from '../constants.js'
import { getFYOptions } from '../utils/dates.js'

// ── helpers ──────────────────────────────────────────────────────────────
const nextFY = (fy) => {
  const y = parseInt(fy)
  return `${y+1}-${String(y+2).slice(2)}`
}

const taskCount = (client, fy) => {
  const tasks = generateTasks(client, client.assignedTo||'', fy, null)
  // Exclude Onboarding Call from year-end batch
  return tasks.filter(t => t.service !== 'Onboarding Call')
}

// FY_OPTIONS now dynamic (see getFYOptions below)

// ── main ─────────────────────────────────────────────────────────────────
export const YearEndBatchPage = ({ tasks, clients, users, currentUser }) => {
  const [sourceFY,  setSourceFY]  = useState('2026-27')
  const targetFY = nextFY(sourceFY)

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [running,     setRunning]     = useState(false)
  const [progress,    setProgress]    = useState({ done:0, total:0, errors:[] })
  const [finished,    setFinished]    = useState(false)
  const [search,      setSearch]      = useState('')

  // Active clients with tasks in sourceFY but NOT yet in targetFY
  const eligibleClients = useMemo(() => {
    const withSource = new Set(tasks.filter(t=>t.fy===sourceFY).map(t=>t.clientId))
    const withTarget = new Set(tasks.filter(t=>t.fy===targetFY).map(t=>t.clientId))
    return (clients||[]).filter(c => {
      if ((c.clientStatus||'active') !== 'active') return false
      if (!withSource.has(c.id)) return false
      if (withTarget.has(c.id))  return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }).sort((a,b) => a.name.localeCompare(b.name))
  }, [clients, tasks, sourceFY, targetFY, search])

  // Already done for targetFY
  const alreadyDone = useMemo(() => {
    const withTarget = new Set(tasks.filter(t=>t.fy===targetFY).map(t=>t.clientId))
    return (clients||[]).filter(c =>
      (c.clientStatus||'active')==='active' && withTarget.has(c.id)
    ).length
  }, [clients, tasks, targetFY])

  const toggle = (id) => {
    setSelectedIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }
  const toggleAll = () => {
    setSelectedIds(selectedIds.size===eligibleClients.length
      ? new Set()
      : new Set(eligibleClients.map(c=>c.id)))
  }

  const run = async () => {
    if (selectedIds.size === 0) return
    setRunning(true)
    setFinished(false)
    const errors = []
    const total  = selectedIds.size
    setProgress({ done:0, total, errors:[] })

    let done = 0
    for (const id of selectedIds) {
      const client = clients.find(c => c.id === id)
      if (!client) { done++; continue }
      try {
        const newTasks = taskCount(client, targetFY).map(t => ({
          ...t,
          clientEmail: client.email || '',   // ← required by portal security rules
          fy: targetFY,
        }))
        await bulkAddTasks(newTasks)
      } catch(e) {
        errors.push({ name: client.name, err: e.message })
      }
      done++
      setProgress({ done, total, errors: [...errors] })
    }

    setRunning(false)
    setFinished(true)
    setSelectedIds(new Set())
  }

  const taskPreviewTotal = useMemo(() => {
    return [...selectedIds].reduce((sum, id) => {
      const c = clients.find(cl=>cl.id===id)
      return sum + (c ? taskCount(c, targetFY).length : 0)
    }, 0)
  }, [selectedIds, clients, targetFY])

  const pct = progress.total > 0 ? Math.round((progress.done/progress.total)*100) : 0

  return (
    <div className="fade-up" style={{ padding:'24px 28px', maxWidth:1000 }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>🗓 Year-End Batch Mode</div>
        <div style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
          One-click task generation for the new financial year across all active clients
        </div>
      </div>

      {/* FY selector + summary */}
      <div className="card" style={{ padding:'16px 20px', marginBottom:16, display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Source FY (existing tasks)</div>
          <select value={sourceFY} onChange={e=>{ setSourceFY(e.target.value); setSelectedIds(new Set()); setFinished(false) }}
            style={{ fontSize:13, fontWeight:700 }}>
            {getFYOptions(tasks).map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div style={{ fontSize:22, color:'var(--text3)' }}>→</div>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Target FY (new tasks)</div>
          <div style={{ fontSize:18, fontWeight:800, color:'var(--accent)', padding:'6px 14px', background:'var(--surface3)', borderRadius:8, border:'1px solid var(--border2)' }}>
            {targetFY}
          </div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:800, color:'var(--text)' }}>{eligibleClients.length}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>Pending clients</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:800, color:'#22c55e' }}>{alreadyDone}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>Already done</div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div style={{ background:'#5b8dee12', border:'1px solid #5b8dee30', borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:12, color:'var(--text2)' }}>
        <strong>How it works:</strong> Selects all active clients that have tasks in FY {sourceFY} but none yet in FY {targetFY}.
        Generates the full compliance calendar (GST, TDS, IT, PT, Accounting) based on each client's service flags.
        Skips Onboarding Call tasks. <strong>Existing tasks are never modified.</strong>
      </div>

      {/* Search + action bar */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <input placeholder="🔍 Search clients…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ fontSize:12, minWidth:200, flex:1, maxWidth:280 }}/>
        <button className="btn btn-ghost btn-sm" onClick={toggleAll} disabled={running}>
          {selectedIds.size===eligibleClients.length&&eligibleClients.length>0 ? 'Deselect All' : `Select All (${eligibleClients.length})`}
        </button>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          {selectedIds.size > 0 && !running && (
            <span style={{ fontSize:12, color:'var(--text3)' }}>
              {selectedIds.size} clients · ~{taskPreviewTotal} tasks to create
            </span>
          )}
          <button className="btn btn-primary"
            disabled={selectedIds.size===0||running}
            onClick={run}
            style={{ minWidth:160 }}>
            {running
              ? `Generating… ${progress.done}/${progress.total}`
              : `Generate FY ${targetFY} Tasks`}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {running && (
        <div style={{ marginBottom:12 }}>
          <div style={{ height:6, background:'var(--surface3)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'var(--accent)', transition:'width .3s', borderRadius:3 }}/>
          </div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{pct}% — {progress.done} of {progress.total} clients done</div>
        </div>
      )}

      {/* Success / error summary */}
      {finished && (
        <div style={{ marginBottom:12, padding:'12px 16px', borderRadius:8,
          background: progress.errors.length===0 ? '#22c55e12' : '#f59e0b12',
          border:`1px solid ${progress.errors.length===0?'#22c55e40':'#f59e0b40'}` }}>
          <div style={{ fontWeight:700, fontSize:13, color: progress.errors.length===0?'#22c55e':'#f59e0b' }}>
            {progress.errors.length===0
              ? `✓ Done! Tasks generated for FY ${targetFY} for ${progress.done} clients.`
              : `⚠ Completed with ${progress.errors.length} error(s). ${progress.done-progress.errors.length} clients succeeded.`}
          </div>
          {progress.errors.map((e,i)=>(
            <div key={i} style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
              • {e.name}: {e.err}
            </div>
          ))}
        </div>
      )}

      {/* Client table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {eligibleClients.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--text3)', fontSize:14 }}>
            {finished
              ? `🎉 All clients now have FY ${targetFY} tasks generated!`
              : search
              ? 'No clients match your search.'
              : `All active clients already have FY ${targetFY} tasks. Nothing to generate.`}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
                <th style={{ padding:'10px 14px', width:40 }}>
                  <input type="checkbox"
                    checked={selectedIds.size===eligibleClients.length&&eligibleClients.length>0}
                    onChange={toggleAll}
                    style={{ cursor:'pointer' }}/>
                </th>
                {['Client','Constitution','Services','Tasks to Create','Assignee'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700,
                    fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eligibleClients.map((client, i) => {
                const preview = taskCount(client, targetFY)
                const assignee = users.find(u=>u.id===client.assignedTo)
                const services = [
                  client.gstApplicable && `GST (${client.gstFreq||'monthly'})`,
                  client.tdsApplicable && 'TDS',
                  client.itApplicable  && 'IT',
                  client.advanceTax    && 'Adv Tax',
                  client.accounting    && 'Accounting',
                  client.ptMH          && 'PT-MH',
                  client.ptKA          && 'PT-KA',
                ].filter(Boolean)
                const sel = selectedIds.has(client.id)
                return (
                  <tr key={client.id}
                    onClick={()=>toggle(client.id)}
                    style={{ borderBottom:'1px solid var(--border)', cursor:'pointer',
                      background: sel ? 'var(--accent)10' : i%2===0 ? 'transparent' : 'var(--surface2)',
                      outline: sel ? '1px solid var(--accent)' : 'none' }}>
                    <td style={{ padding:'10px 14px' }}>
                      <input type="checkbox" checked={sel} onChange={()=>toggle(client.id)}
                        onClick={e=>e.stopPropagation()} style={{ cursor:'pointer' }}/>
                    </td>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:'var(--text)' }}>
                      {client.name}
                      {client.category && <span style={{ marginLeft:6, fontSize:10, fontWeight:700,
                        color:'var(--accent)', background:'var(--surface3)', padding:'1px 5px',
                        borderRadius:3, border:'1px solid var(--border2)' }}>{client.category}</span>}
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--text3)', fontSize:12 }}>{client.constitution||'—'}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {services.map(s=>(
                          <span key={s} style={{ fontSize:10, fontWeight:600, color:'var(--text2)',
                            background:'var(--surface3)', padding:'2px 6px', borderRadius:4,
                            border:'1px solid var(--border)' }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px', fontWeight:700, color:'var(--accent)' }}>
                      {preview.length}
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--text2)', fontSize:12 }}>
                      {assignee ? assignee.name : <span style={{ color:'var(--text3)' }}>Unassigned</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
