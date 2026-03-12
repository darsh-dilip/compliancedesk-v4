import { useState, useMemo } from 'react'
import { DONE_PROPER, DONE_NIL, FINANCIAL_YEARS, CLIENT_CATEGORIES, ROLES, ROLE_CLR } from '../constants.js'
import { Avatar, ExcelButton } from '../components/UI.jsx'

const allDone = [...DONE_PROPER, ...DONE_NIL]

const daysDiff = (dueDate, completedAt) => {
  if (!dueDate || !completedAt) return null
  return Math.round((new Date(completedAt) - new Date(dueDate)) / 86400000)
}

const getGrade = (score) => {
  if (score == null) return { grade:'—', color:'var(--text3)' }
  if (score >= 90)   return { grade:'A+', color:'#22c55e' }
  if (score >= 75)   return { grade:'A',  color:'#4ade80' }
  if (score >= 60)   return { grade:'B',  color:'#f59e0b' }
  if (score >= 45)   return { grade:'C',  color:'#fb923c' }
  return               { grade:'D',  color:'#f43f5e' }
}

const GradeBadge = ({ score }) => {
  const { grade, color } = getGrade(score)
  return (
    <span style={{ fontWeight:800,fontSize:13,color,background:`${color}15`,
      border:`1px solid ${color}40`,padding:'2px 8px',borderRadius:6 }}>
      {grade}
    </span>
  )
}

const DiffBadge = ({ diff }) => {
  if (diff == null) return <span style={{ color:'var(--text3)' }}>—</span>
  if (diff < 0)  return <span style={{ color:'#22c55e',fontWeight:700 }}>Early {Math.abs(diff)}d</span>
  if (diff === 0) return <span style={{ color:'#22c55e',fontWeight:700 }}>On time</span>
  if (diff <= 7)  return <span style={{ color:'#f59e0b',fontWeight:700 }}>Late {diff}d</span>
  return           <span style={{ color:'#f43f5e',fontWeight:700 }}>Late {diff}d</span>
}

// Compute punctuality stats for a group of tasks
const computeStats = (tasks) => {
  const completed = tasks.filter(t => {
    const ca = t.completedAt || (allDone.includes(t.status) ? t.updatedAt : null)
    return ca && t.dueDate
  })
  if (!completed.length) return null

  const diffs = completed.map(t => {
    const ca = t.completedAt || (typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt?.toDate?.()?.toISOString())
    return daysDiff(t.dueDate, ca)
  }).filter(d => d != null)

  if (!diffs.length) return null

  const onTime   = diffs.filter(d => d <= 0).length
  const total    = diffs.length
  const avgDelay = Math.round(diffs.reduce((s,d) => s+d, 0) / total)
  const punctPct = Math.round((onTime / total) * 100)

  // Score: 50% punctuality %, 30% avg delay factor, 20% volume factor
  const delayFactor = Math.max(0, 100 - Math.max(0, avgDelay) * 5)
  const score = Math.round(0.5 * punctPct + 0.3 * delayFactor + 0.2 * Math.min(100, total * 5))

  return { total, onTime, late: total - onTime, avgDelay, punctPct, score }
}

// ── Main page ─────────────────────────────────────────────────────────────
export const DashboardScoreCard = ({ tasks, users, clients, memberMeta={} }) => {
  const [view,    setView]    = useState('member')   // 'member' | 'client'
  const [fCat,    setFCat]    = useState('')
  const [fMember, setFMember] = useState('')
  const [fService,setFService]= useState('')
  const [search,  setSearch]  = useState('')
  const [sortBy,  setSortBy]  = useState('score')    // score | name | delay | volume

  const teamMembers = useMemo(() =>
    (users||[]).filter(u => u.role !== 'partner').sort((a,b) => a.name.localeCompare(b.name))
  , [users])

  const services = useMemo(() => {
    const s = new Set((tasks||[]).map(t=>t.service))
    return [...s].sort()
  }, [tasks])

  // ── Member view ──────────────────────────────────────────────────────
  const memberRows = useMemo(() => {
    return teamMembers.map(u => {
      let mt = (tasks||[]).filter(t => t.assignedTo === u.id)
      if (fService) mt = mt.filter(t => t.service === fService)
      const stats = computeStats(mt)
      return { user: u, stats, taskCount: mt.length }
    }).filter(r => {
      if (search && !r.user.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [teamMembers, tasks, fService, search])

  // ── Client view ──────────────────────────────────────────────────────
  const clientRows = useMemo(() => {
    let cl = (clients||[])
    if (fCat)    cl = cl.filter(c => c.category === fCat)
    if (fMember) cl = cl.filter(c => c.assignedTo === fMember)
    if (search)  cl = cl.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

    return cl.map(client => {
      let ct = (tasks||[]).filter(t => t.clientId === client.id)
      if (fService) ct = ct.filter(t => t.service === fService)
      const stats = computeStats(ct)
      const assignee = users.find(u => u.id === client.assignedTo)
      return { client, stats, taskCount: ct.length, assignee }
    })
  }, [clients, tasks, users, fCat, fMember, fService, search])

  // Sort
  const sortRows = (rows, key) => {
    const getVal = r => r.stats?.[key] ?? (key==='name' ? (r.user||r.client)?.name : -999)
    const desc = key !== 'name' && key !== 'avgDelay'
    return [...rows].sort((a,b) => {
      const av = getVal(a), bv = getVal(b)
      if (av == null || av === -999) return 1
      if (bv == null || bv === -999) return -1
      if (key === 'name') return String(av).localeCompare(String(bv))
      return desc ? bv - av : av - bv
    })
  }

  const sortedMemberRows = useMemo(() => sortRows(memberRows, sortBy), [memberRows, sortBy])
  const sortedClientRows = useMemo(() => sortRows(clientRows, sortBy), [clientRows, sortBy])

  const noDataMsg = 'No history yet — start updating task statuses to track scores'

  const SortBtn = ({ k, label }) => (
    <button onClick={()=>setSortBy(k)} style={{ fontSize:11,padding:'4px 10px',borderRadius:6,
      background: sortBy===k?'var(--accent)':'var(--surface2)',
      color: sortBy===k?'#fff':'var(--text2)',
      border:`1px solid ${sortBy===k?'var(--accent)':'var(--border)'}`,
      fontWeight: sortBy===k?700:400,cursor:'pointer' }}>{label}</button>
  )

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:1100 }}>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:22,fontWeight:800,color:'var(--text)' }}>🎯 Punctuality Score Card</div>
          <div style={{ fontSize:13,color:'var(--text3)',marginTop:2 }}>
            Per-member and per-client filing punctuality — graded A+ to D
          </div>
        </div>
        <ExcelButton
          filename={`ScoreCard-${view}`}
          getData={()=>({
            headers: view==='member'
              ? ['Member','Role','Tasks','On Time','Late','Avg Delay','Punctuality %','Score','Grade']
              : ['Client','Category','Assigned To','Tasks','On Time','Late','Avg Delay','Punctuality %','Score','Grade'],
            rows: view==='member'
              ? sortedMemberRows.map(r => [
                  r.user.name, ROLES[r.user.role], r.taskCount,
                  r.stats?.onTime??'—', r.stats?.late??'—',
                  r.stats?.avgDelay!=null?(r.stats.avgDelay>0?`+${r.stats.avgDelay}d`:`${r.stats.avgDelay}d`):'—',
                  r.stats?.punctPct!=null?`${r.stats.punctPct}%`:'—',
                  r.stats?.score??'—', getGrade(r.stats?.score).grade
                ])
              : sortedClientRows.map(r => [
                  r.client.name, r.client.category||'', r.assignee?.name||'',
                  r.taskCount, r.stats?.onTime??'—', r.stats?.late??'—',
                  r.stats?.avgDelay!=null?(r.stats.avgDelay>0?`+${r.stats.avgDelay}d`:`${r.stats.avgDelay}d`):'—',
                  r.stats?.punctPct!=null?`${r.stats.punctPct}%`:'—',
                  r.stats?.score??'—', getGrade(r.stats?.score).grade
                ])
          })}
        />
      </div>

      {/* View toggle */}
      <div style={{ display:'flex',gap:4,marginBottom:16,background:'var(--surface2)',borderRadius:8,padding:3,width:'fit-content',border:'1px solid var(--border)' }}>
        {[['member','👤 By Member'],['client','🏢 By Client']].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)}
            style={{ padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:view===v?700:500,cursor:'pointer',
              border:view===v?'1px solid var(--border2)':'none',
              background:view===v?'var(--surface3)':'transparent',
              color:view===v?'var(--text)':'var(--text2)' }}>{l}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:16,alignItems:'center' }}>
        <input placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ fontSize:12,minWidth:160,maxWidth:200 }}/>
        <select value={fService} onChange={e=>setFService(e.target.value)} style={{ fontSize:12,minWidth:160 }}>
          <option value="">All Services</option>
          {services.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {view==='client' && <>
          <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{ fontSize:12 }}>
            <option value="">All Categories</option>
            {CLIENT_CATEGORIES.map(c=><option key={c} value={c}>Cat {c}</option>)}
          </select>
          <select value={fMember} onChange={e=>setFMember(e.target.value)} style={{ fontSize:12,minWidth:150 }}>
            <option value="">All Members</option>
            {teamMembers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </>}
        <div style={{ display:'flex',gap:4,marginLeft:'auto',alignItems:'center' }}>
          <span style={{ fontSize:11,color:'var(--text3)' }}>Sort:</span>
          <SortBtn k="score"    label="Score"     />
          <SortBtn k="punctPct" label="Punctual %"/>
          <SortBtn k="avgDelay" label="Delay"     />
          <SortBtn k="total"    label="Volume"    />
        </div>
      </div>

      {/* Grade legend */}
      <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap' }}>
        {[['A+','#22c55e','≥90'],['A','#4ade80','75–89'],['B','#f59e0b','60–74'],['C','#fb923c','45–59'],['D','#f43f5e','<45']].map(([g,c,r])=>(
          <span key={g} style={{ fontSize:11,color:c,background:`${c}12`,border:`1px solid ${c}30`,
            padding:'2px 10px',borderRadius:6,fontWeight:700 }}>{g} {r}</span>
        ))}
        <span style={{ fontSize:11,color:'var(--text3)',alignSelf:'center',marginLeft:4 }}>
          Score = 50% punctuality + 30% speed + 20% volume
        </span>
      </div>

      {/* Table */}
      {view === 'member' ? (
        <div className="card" style={{ padding:0,overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)',background:'var(--surface2)' }}>
                {['Member','Tasks','On Time','Late','Avg Delay','Punctual %','Score','Grade'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:700,
                    fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMemberRows.map((r,i) => (
                <tr key={r.user.id} style={{ borderBottom:'1px solid var(--border)',
                  background: i%2===0?'transparent':'var(--surface2)' }}>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <Avatar name={r.user.name} init={r.user.init} role={r.user.role} sz={28} rank={memberMeta[r.user.id]?.rank} streak={memberMeta[r.user.id]?.streak}/>
                      <div>
                        <div style={{ fontWeight:600,color:'var(--text)' }}>{r.user.name}</div>
                        <div style={{ fontSize:10,color:ROLE_CLR[r.user.role] }}>{ROLES[r.user.role]}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px',color:'var(--text2)' }}>{r.taskCount}</td>
                  <td style={{ padding:'10px 14px',color:'#22c55e',fontWeight:600 }}>{r.stats?.onTime??'—'}</td>
                  <td style={{ padding:'10px 14px',color: (r.stats?.late||0)>0?'#f43f5e':'var(--text3)' }}>{r.stats?.late??'—'}</td>
                  <td style={{ padding:'10px 14px' }}><DiffBadge diff={r.stats?.avgDelay}/></td>
                  <td style={{ padding:'10px 14px',color:'var(--text)' }}>
                    {r.stats?.punctPct!=null ? `${r.stats.punctPct}%` : <span style={{color:'var(--text3)'}}>—</span>}
                  </td>
                  <td style={{ padding:'10px 14px',fontWeight:800,fontSize:15,
                    color: r.stats?.score==null?'var(--text3)':r.stats.score>=80?'#22c55e':r.stats.score>=60?'#f59e0b':'#f43f5e' }}>
                    {r.stats?.score??'—'}
                  </td>
                  <td style={{ padding:'10px 14px' }}><GradeBadge score={r.stats?.score}/></td>
                </tr>
              ))}
              {sortedMemberRows.length === 0 && (
                <tr><td colSpan={8} style={{ padding:32,textAlign:'center',color:'var(--text3)' }}>{noDataMsg}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding:0,overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)',background:'var(--surface2)' }}>
                {['Client','Cat','Assigned To','Tasks','On Time','Late','Avg Delay','Punctual %','Score','Grade'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:700,
                    fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedClientRows.map((r,i) => (
                <tr key={r.client.id} style={{ borderBottom:'1px solid var(--border)',
                  background: i%2===0?'transparent':'var(--surface2)' }}>
                  <td style={{ padding:'10px 14px',fontWeight:600,color:'var(--text)' }}>{r.client.name}</td>
                  <td style={{ padding:'10px 14px' }}>
                    {r.client.category && <span style={{ fontSize:11,fontWeight:700,color:'var(--accent)',background:'var(--surface3)',
                      padding:'2px 6px',borderRadius:4,border:'1px solid var(--border2)' }}>{r.client.category}</span>}
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    {r.assignee && (
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <Avatar name={r.assignee.name} init={r.assignee.init} role={r.assignee.role} sz={20} rank={memberMeta[r.assignee.id]?.rank} streak={memberMeta[r.assignee.id]?.streak}/>
                        <span style={{ fontSize:12,color:'var(--text2)' }}>{r.assignee.name}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'10px 14px',color:'var(--text2)' }}>{r.taskCount}</td>
                  <td style={{ padding:'10px 14px',color:'#22c55e',fontWeight:600 }}>{r.stats?.onTime??'—'}</td>
                  <td style={{ padding:'10px 14px',color:(r.stats?.late||0)>0?'#f43f5e':'var(--text3)' }}>{r.stats?.late??'—'}</td>
                  <td style={{ padding:'10px 14px' }}><DiffBadge diff={r.stats?.avgDelay}/></td>
                  <td style={{ padding:'10px 14px',color:'var(--text)' }}>
                    {r.stats?.punctPct!=null?`${r.stats.punctPct}%`:<span style={{color:'var(--text3)'}}>—</span>}
                  </td>
                  <td style={{ padding:'10px 14px',fontWeight:800,fontSize:15,
                    color: r.stats?.score==null?'var(--text3)':r.stats.score>=80?'#22c55e':r.stats.score>=60?'#f59e0b':'#f43f5e' }}>
                    {r.stats?.score??'—'}
                  </td>
                  <td style={{ padding:'10px 14px' }}><GradeBadge score={r.stats?.score}/></td>
                </tr>
              ))}
              {sortedClientRows.length === 0 && (
                <tr><td colSpan={10} style={{ padding:32,textAlign:'center',color:'var(--text3)' }}>{noDataMsg}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
