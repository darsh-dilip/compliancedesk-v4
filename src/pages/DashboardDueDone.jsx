import { useState, useMemo } from 'react'
import { ROLES, CLIENT_CATEGORIES, DONE_PROPER, DONE_NIL } from '../constants.js'
import { fmtDate } from '../utils/dates.js'
import { ExcelButton, PrintButton, PrintHeader } from '../components/UI.jsx'

const daysDiff = (dueDate, completedAt) => {
  if (!dueDate || !completedAt) return null
  const due  = new Date(dueDate)
  const done = new Date(completedAt)
  return Math.round((done - due) / 86400000) // positive = late, negative = early
}

const DiffBadge = ({ diff }) => {
  if (diff === null) return <span style={{ color:'var(--text3)' }}>—</span>
  if (diff === 0)    return <span style={{ color:'#22c55e',fontWeight:700 }}>On time</span>
  if (diff < 0)      return <span style={{ color:'#22c55e',fontWeight:700 }}>Early {Math.abs(diff)}d</span>
  if (diff <= 7)     return <span style={{ color:'#f59e0b',fontWeight:700 }}>Late {diff}d</span>
  return <span style={{ color:'#f43f5e',fontWeight:700 }}>Late {diff}d</span>
}

export const DashboardDueDone = ({ tasks, clients, users, user }) => {
  const [fService,  setFService]  = useState('')
  const [fMember,   setFMember]   = useState('')
  const [fClient,   setFClient]   = useState('')
  const [fCat,      setFCat]      = useState('')
  const [fMonth,    setFMonth]    = useState('')
  const [sortBy,    setSortBy]    = useState('completedAt') // completedAt | diff | dueDate

  const MONTHS = useMemo(()=>{
    const ym = new Set()
    tasks.forEach(t => { if(t.completedAt) ym.add(t.completedAt.slice(0,7)) })
    return [...ym].sort().reverse()
  },[tasks])

  const doneTasks = useMemo(()=>{
    const allDone = [...DONE_PROPER, ...DONE_NIL]
    return tasks.filter(t => t.dueDate && (t.completedAt || allDone.includes(t.status)))
      .filter(t => {
        if (fService && t.service !== fService) return false
        if (fMember  && t.assignedTo !== fMember) return false
        if (fClient  && t.clientId !== fClient) return false
        if (fCat) {
          const cl = clients.find(c=>c.id===t.clientId)
          if (cl?.category !== fCat) return false
        }
        const ca2 = t.completedAt || t.updatedAt?.toDate?.()?.toISOString() || (typeof t.updatedAt==='string'?t.updatedAt:null); if (fMonth && (!ca2 || !ca2.startsWith(fMonth))) return false
        return true
      })
      .map(t=>{ const ca = t.completedAt || t.updatedAt?.toDate?.()?.toISOString() || (typeof t.updatedAt==='string'?t.updatedAt:null); return { ...t, _completedAt: ca, _diff: daysDiff(t.dueDate, ca) } })
      .sort((a,b)=>{
        if (sortBy === 'diff') return (b._diff||0) - (a._diff||0)
        if (sortBy === 'dueDate') return new Date(a.dueDate) - new Date(b.dueDate)
        return new Date(b._completedAt||0) - new Date(a._completedAt||0)
      })
  }, [tasks, fService, fMember, fClient, fCat, fMonth, sortBy])

  const allDoneStatuses = [...DONE_PROPER,...DONE_NIL]
  const services = [...new Set(tasks.filter(t=>allDoneStatuses.includes(t.status)).map(t=>t.service))].sort()
  const clientList = [...new Set(tasks.filter(t=>allDoneStatuses.includes(t.status)).map(t=>t.clientId))]
    .map(id=>clients.find(c=>c.id===id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name))

  // Stats
  const totalDone  = doneTasks.length
  const onTime     = doneTasks.filter(t=>t._diff<=0).length
  const lateCount  = doneTasks.filter(t=>t._diff>0).length
  const avgDiff    = totalDone ? Math.round(doneTasks.reduce((s,t)=>s+(t._diff||0),0)/totalDone) : 0

  return (
    <div className="fade-up print-root" style={{ padding:'0',maxWidth:'none' }}>
      <div style={{ position:'sticky',top:0,zIndex:100,background:'var(--bg)',padding:'18px 28px 12px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
          <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',flex:1 }}>📊 Due vs Done</div>
          <ExcelButton filename="DueDone" getData={()=>({
            headers:['Client','Category','Service','Period','FY','Due Date','Done Date','Days Early/Late','Status','Assigned To'],
            rows: doneTasks.map(t=>{
              const u=users.find(u=>u.id===t.assignedTo)
              const cl=clients.find(c=>c.id===t.clientId)
              const diff=t._diff
              return [t.clientName||'',cl?.category||'',t.service||'',t.period||'',t.fy||'',t.dueDate||'',t.completedAt?.slice(0,10)||'',(diff===null?'':(diff===0?'On time':diff<0?`Early ${Math.abs(diff)}d`:`Late ${diff}d`)),t.status||'',u?.name||'']
            })
          })}/>
          <PrintButton title="Due vs Done Report"/>
        </div>
        <div style={{ fontSize:13,color:'var(--text2)',marginBottom:14 }}>
          Track how completed tasks compare against their original due dates.
        </div>

        {/* Filters */}
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end' }}>
          <div>
            <label style={{ fontSize:11,color:'var(--text3)',display:'block',marginBottom:4 }}>Month Completed</label>
            <select value={fMonth} onChange={e=>setFMonth(e.target.value)} style={{ width:130,fontSize:12 }}>
              <option value="">All Time</option>
              {MONTHS.map(m=>{
                const [y,mo]=m.split('-')
                return <option key={m} value={m}>{new Date(+y,+mo-1).toLocaleString('en-IN',{month:'short',year:'numeric'})}</option>
              })}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11,color:'var(--text3)',display:'block',marginBottom:4 }}>Category</label>
            <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{ width:90,fontSize:12 }}>
              <option value="">All</option>
              {CLIENT_CATEGORIES.map(x=><option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11,color:'var(--text3)',display:'block',marginBottom:4 }}>Service</label>
            <select value={fService} onChange={e=>setFService(e.target.value)} style={{ width:180,fontSize:12 }}>
              <option value="">All Services</option>
              {services.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11,color:'var(--text3)',display:'block',marginBottom:4 }}>Client</label>
            <select value={fClient} onChange={e=>setFClient(e.target.value)} style={{ width:180,fontSize:12 }}>
              <option value="">All Clients</option>
              {clientList.map(cl=><option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11,color:'var(--text3)',display:'block',marginBottom:4 }}>Member</label>
            <select value={fMember} onChange={e=>setFMember(e.target.value)} style={{ width:150,fontSize:12 }}>
              <option value="">All Members</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11,color:'var(--text3)',display:'block',marginBottom:4 }}>Sort By</label>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ width:150,fontSize:12 }}>
              <option value="completedAt">Done Date (newest)</option>
              <option value="dueDate">Due Date</option>
              <option value="diff">Most Delayed</option>
            </select>
          </div>
          {(fService||fMember||fClient||fCat||fMonth)&&(
            <button className="btn btn-ghost btn-sm" onClick={()=>{setFService('');setFMember('');setFClient('');setFCat('');setFMonth('')}}>✕ Clear</button>
          )}
        </div>
      </div>

      <div style={{ padding:'16px 28px' }}>
        {/* Summary cards */}
        <div className="grid-4" style={{ marginBottom:20 }}>
          {[
            { l:'Tasks Completed',   v:totalDone,          c:'var(--accent)'   },
            { l:'Filed On Time',     v:onTime,             c:'var(--success)'  },
            { l:'Filed Late',        v:lateCount,          c:lateCount>0?'var(--danger)':'var(--text3)' },
            { l:`Avg Days (${avgDiff>=0?'+':''}${avgDiff})`, v:avgDiff>=0?`+${avgDiff}d`:`${avgDiff}d`, c:avgDiff<=0?'var(--success)':'var(--warn)' },
          ].map(x=>(
            <div key={x.l} style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 18px',textAlign:'center' }}>
              <div style={{ fontWeight:800,fontSize:22,color:x.c }}>{x.v}</div>
              <div style={{ fontSize:11,color:'var(--text3)',marginTop:4 }}>{x.l}</div>
            </div>
          ))}
        </div>

        {totalDone === 0 && (
          <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>
            <div style={{ fontSize:32,marginBottom:12 }}>📭</div>
            <div style={{ fontSize:15,fontWeight:600,marginBottom:6 }}>No completed tasks yet</div>
            <div style={{ fontSize:12 }}>No tasks with a completed status found for the selected filters.</div>
          </div>
        )}

        {totalDone > 0 && (
          <div style={{ background:'var(--surface)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--surface2)',borderBottom:'1px solid var(--border)' }}>
                  {['Client','Cat','Service','Period','Due Date','Done Date','Δ Days','Status','Assigned To'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:700,color:'var(--text3)',fontSize:11,whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doneTasks.map(t=>{
                  const u  = users.find(u=>u.id===t.assignedTo)
                  const cl = clients.find(c=>c.id===t.clientId)
                  const doneDate = (t._completedAt||t.completedAt||'')?.slice(0,10)
                  return (
                    <tr key={t.id} style={{ borderBottom:'1px solid var(--border2)' }}>
                      <td style={{ padding:'10px 14px',fontWeight:600,color:'var(--text)' }}>{t.clientName}</td>
                      <td style={{ padding:'8px 10px' }}>
                        {cl?.category && <span style={{ fontSize:10,padding:'1px 5px',borderRadius:4,background:'var(--surface3)',color:'var(--text3)',fontWeight:700 }}>{cl.category}</span>}
                      </td>
                      <td style={{ padding:'10px 14px',color:'var(--text2)' }}>{t.service}</td>
                      <td style={{ padding:'10px 14px',color:'var(--text3)',fontSize:11 }}>{t.period}</td>
                      <td style={{ padding:'10px 14px',color:'var(--text2)',whiteSpace:'nowrap' }}>{t.dueDate ? fmtDate(t.dueDate) : '—'}</td>
                      <td style={{ padding:'10px 14px',color:'var(--text2)',whiteSpace:'nowrap' }}>{doneDate ? fmtDate(doneDate) : '—'}</td>
                      <td style={{ padding:'10px 14px' }}><DiffBadge diff={t._diff}/></td>
                      <td style={{ padding:'10px 14px',color:'var(--text3)',fontSize:11 }}>{t.status}</td>
                      <td style={{ padding:'10px 14px',color:'var(--text3)',fontSize:11 }}>{u?.name||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
