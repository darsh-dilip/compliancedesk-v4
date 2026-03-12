import React, { useState, useMemo } from 'react'
import { DONE_PROPER, DONE_NIL, DONE_STATUSES, FINANCIAL_YEARS, ROLE_CLR, ROLES } from '../constants.js'
import { Avatar, ExcelButton } from '../components/UI.jsx'
import { getFYOptions } from '../utils/dates.js'

const allDone = [...DONE_PROPER, ...DONE_NIL]

// ── Score helpers ────────────────────────────────────────────────────────
const pct = (n, d) => d === 0 ? 0 : Math.round((n / d) * 100)

// Category weight: A+/A = 1.30x, B = 1.12x, C = 1.05x, others = 1.0x
const CAT_WEIGHT = { 'A+':1.30, 'A':1.30, 'B':1.12, 'C':1.05, 'D':1.00 }
const catWeight = cat => CAT_WEIGHT[String(cat||'').toUpperCase()] ?? 1.00

const toDateStr = v => {
  if (!v) return ''
  if (typeof v === 'string') return v.slice(0,10)
  if (v.toDate) return v.toDate().toISOString().slice(0,10)
  if (v.seconds) return new Date(v.seconds*1000).toISOString().slice(0,10)
  return String(v).slice(0,10)
}

// Points per task: on-time done = +100, late done = -50, overdue (not done) = -50, ongoing = 0
const getMemberStats = (user, tasks, fy, clients=[]) => {
  const mt = tasks.filter(t => t.assignedTo === user.id && (!fy || t.fy === fy))
  const total       = mt.length
  const done        = mt.filter(t => allDone.includes(t.status)).length
  const today       = new Date().toISOString().split('T')[0]
  const overdue     = mt.filter(t => t.dueDate < today && !allDone.includes(t.status)).length
  const doneToday   = mt.filter(t => toDateStr(t.completedAt) === today).length

  // Punctuality (for display only)
  let totalDelay = 0, punctCount = 0, onTime = 0
  mt.forEach(t => {
    if (!t.completedAt || !t.dueDate) return
    const ca = toDateStr(t.completedAt)
    const diff = Math.round((new Date(ca) - new Date(t.dueDate)) / 86400000)
    totalDelay += diff
    punctCount++
    if (diff <= 0) onTime++
  })
  const avgDelay   = punctCount > 0 ? Math.round(totalDelay / punctCount) : null
  const punctScore = punctCount > 0 ? pct(onTime, punctCount) : null

  // ── Category-weighted scoring ────────────────────────────────
  // Build clientId → category map
  const clientCatMap = {}
  clients.forEach(cl => { clientCatMap[cl.id] = cl.category||'D' })

  let rawPoints = 0, maxPoints = 0
  const breakdown = { onTime:0, lateDone:0, overduePending:0, ongoing:0,
    onTimeW:0, lateDoneW:0, overduePendingW:0, onTimeList:[], overdueList:[] }

  mt.forEach(t => {
    const w = catWeight(clientCatMap[t.clientId])
    const taskMax = 100 * w
    maxPoints += taskMax

    if (allDone.includes(t.status)) {
      const ca = toDateStr(t.completedAt)
      const diff = ca && t.dueDate ? Math.round((new Date(ca)-new Date(t.dueDate))/86400000) : null
      if (diff !== null && diff <= 0) {
        rawPoints += 100 * w    // on-time done
        breakdown.onTime++; breakdown.onTimeW += Math.round(100*w)
        breakdown.onTimeList.push({ service:t.service, client:t.clientName, pts:Math.round(100*w) })
      } else {
        rawPoints += (-50) * w  // late done
        breakdown.lateDone++; breakdown.lateDoneW += Math.round(-50*w)
      }
    } else if (t.dueDate && t.dueDate < today) {
      rawPoints += (-50) * w    // overdue
      breakdown.overduePending++; breakdown.overduePendingW += Math.round(-50*w)
      breakdown.overdueList.push({ service:t.service, client:t.clientName, pts:Math.round(-50*w), dueDate:t.dueDate })
    } else {
      breakdown.ongoing++ // 0 points
    }
  })

  const completionPct = pct(done, total)
  const overdueRate   = pct(overdue, total)
  const overallScore  = Math.round(rawPoints)

  return { user, total, done, overdue, doneToday, avgDelay, punctScore, punctCount, onTime,
    completionPct, overdueRate, overallScore, breakdown, rawPoints, maxPoints }
}

// ── Medal colours ────────────────────────────────────────────────────────
const MEDAL = ['🥇','🥈','🥉']
const RANK_CLR = ['#f59e0b','#94a3b8','#cd7f32']

// ── Sub-leaderboard card ─────────────────────────────────────────────────
const LeaderCard = ({ title, icon, subtitle, rows, valueKey, valueFmt, higherBetter=true, emptyMsg, memberMeta={} }) => {
  const sorted = [...rows].sort((a,b) => higherBetter ? b[valueKey] - a[valueKey] : a[valueKey] - b[valueKey])
    .filter(r => r[valueKey] != null && !isNaN(r[valueKey]))

  return (
    <div className="card" style={{ padding:18 }}>
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <div>
          <div style={{ fontWeight:800,fontSize:14,color:'var(--text)' }}>{title}</div>
          <div style={{ fontSize:11,color:'var(--text3)' }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ marginTop:12,display:'flex',flexDirection:'column',gap:6 }}>
        {sorted.length === 0 && <div style={{ fontSize:12,color:'var(--text3)',padding:'8px 0' }}>{emptyMsg||'No data yet'}</div>}
        {sorted.map((r, i) => (
          <div key={r.user.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,
            background: i===0 ? '#f59e0b08' : 'var(--surface2)',
            border: `1px solid ${i===0 ? '#f59e0b30' : 'var(--border)'}` }}>
            <span style={{ fontSize:16,width:22,textAlign:'center' }}>{MEDAL[i] || `#${i+1}`}</span>
            <Avatar name={r.user.name} init={r.user.init} role={r.user.role} sz={26} rank={memberMeta[r.user.id]?.rank} streak={memberMeta[r.user.id]?.streak}/>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:12,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.user.name}</div>
              <div style={{ fontSize:10,color:ROLE_CLR[r.user.role] }}>{ROLES[r.user.role]}</div>
            </div>
            <div style={{ fontWeight:800,fontSize:14,color: i===0 ? RANK_CLR[0] : 'var(--text)',minWidth:44,textAlign:'right' }}>
              {valueFmt(r[valueKey])}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Overall score table ──────────────────────────────────────────────────
const OverallTable = ({ stats, memberMeta={} }) => {
  const [selBreakdown, setSelBreakdown] = React.useState(null)
  const sorted = [...stats].sort((a,b) => b.overallScore - a.overallScore)
  return (
    <div className="card" style={{ padding:18 }}>
      <div style={{ fontWeight:800,fontSize:15,color:'var(--text)',marginBottom:4 }}>🏆 Overall Leaderboard</div>
      <div style={{ fontSize:11,color:'var(--text3)',marginBottom:14 }}>
        Category-weighted points · On-time = +100pts · Late done / Overdue = −50pts · A/A+ ×1.3 · B ×1.12 · C ×1.05
        <span style={{ marginLeft:6,color:'var(--accent)' }}>Click a row to see score breakdown →</span>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['#','Member','Role','Tasks','Done','Overdue','Punctual','Avg Delay','Score'].map(h => (
                <th key={h} style={{ padding:'6px 10px',textAlign: h==='#'||h==='Score'?'center':'left',
                  fontWeight:700,color:'var(--text3)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.user.id} onClick={()=>setSelBreakdown(selBreakdown?.user.id===r.user.id?null:r)} style={{ borderBottom:'1px solid var(--border)',cursor:'pointer',
                background: i===0 ? '#f59e0b06' : i%2===0 ? 'transparent' : 'var(--surface2)' }}>
                <td style={{ padding:'8px 10px',textAlign:'center',fontWeight:800,color:RANK_CLR[i]||'var(--text3)' }}>
                  {MEDAL[i]||i+1}
                </td>
                <td style={{ padding:'8px 10px' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <Avatar name={r.user.name} init={r.user.init} role={r.user.role} sz={24} rank={memberMeta[r.user.id]?.rank} streak={memberMeta[r.user.id]?.streak}/>
                    <div>
                      <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                        <span style={{ fontWeight:600,color:'var(--text)' }}>{r.user.name}</span>
                        {r.doneToday>0&&<span style={{ fontSize:9,fontWeight:700,color:'#f59e0b',background:'#f59e0b15',padding:'1px 5px',borderRadius:4,border:'1px solid #f59e0b40' }}>🔥 {r.doneToday}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'8px 10px',color:ROLE_CLR[r.user.role],fontSize:11,fontWeight:600 }}>{ROLES[r.user.role]}</td>
                <td style={{ padding:'8px 10px',color:'var(--text2)' }}>{r.total}</td>
                <td style={{ padding:'8px 10px',color:'#22c55e',fontWeight:600 }}>{r.done} <span style={{ color:'var(--text3)',fontWeight:400 }}>({r.completionPct}%)</span></td>
                <td style={{ padding:'8px 10px',color: r.overdue>0?'#f43f5e':'var(--text3)' }}>{r.overdue}</td>
                <td style={{ padding:'8px 10px',color:'var(--text2)' }}>
                  {r.punctScore!=null ? `${r.punctScore}%` : <span style={{ color:'var(--text3)' }}>—</span>}
                </td>
                <td style={{ padding:'8px 10px',color: r.avgDelay==null?'var(--text3)':r.avgDelay<=0?'#22c55e':r.avgDelay<=7?'#f59e0b':'#f43f5e' }}>
                  {r.avgDelay==null ? '—' : r.avgDelay>0 ? `+${r.avgDelay}d late` : `${Math.abs(r.avgDelay)}d early`}
                </td>
                <td style={{ padding:'8px 10px',textAlign:'center' }}>
                  <span style={{ fontWeight:800,fontSize:14,
                    color: r.overallScore>0?'#22c55e':r.overallScore===0?'#f59e0b':'#f43f5e' }}>
                    {r.overallScore}
                  </span>
                  <div style={{ fontSize:9,color:'var(--text3)',marginTop:1 }}>{r.rawPoints>0?`+${Math.round(r.rawPoints)}`:Math.round(r.rawPoints)} raw</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────
export const DashboardLeaderboard = ({ tasks, users, clients=[], memberMeta={} }) => {
  const [fy, setFY] = useState('2026-27')

  const teamMembers = useMemo(() =>
    (users||[]).filter(u => !['partner'].includes(u.role))
  , [users])

  const stats = useMemo(() =>
    teamMembers.map(u => getMemberStats(u, tasks||[], fy, clients||[]))
  , [teamMembers, tasks, fy])

  const excelRows = useMemo(() =>
    [...stats].sort((a,b)=>b.overallScore-a.overallScore).map((r,i) => [
      i+1, r.user.name, ROLES[r.user.role], r.total, r.done,
      `${r.completionPct}%`, r.overdue, r.doneToday,
      r.punctScore!=null?`${r.punctScore}%`:'—',
      r.avgDelay!=null?(r.avgDelay>0?`+${r.avgDelay}d`:`${r.avgDelay}d`):'—',
      r.overallScore
    ])
  , [stats])

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:1200 }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:22,fontWeight:800,color:'var(--text)' }}>🏆 Team Leaderboard</div>
          <div style={{ fontSize:13,color:'var(--text3)',marginTop:2 }}>Rankings across completion, punctuality, and daily performance</div>
        </div>
        <select value={fy} onChange={e=>setFY(e.target.value)} style={{ fontSize:12,minWidth:110 }}>
          {getFYOptions(tasks).map(f=><option key={f} value={f}>FY {f}</option>)}
        </select>
        <ExcelButton filename={`Leaderboard-FY${fy}`} getData={()=>({
          headers:['Rank','Member','Role','Total Tasks','Done','Completion %','Overdue','Done Today','Punctuality %','Avg Delay','Overall Score'],
          rows: excelRows
        })}/>
      </div>


      {/* Champion spotlight */}
      {(() => {
        const champ = stats.find(r => memberMeta[r.user.id]?.rank === 1)
        if (!champ) return null
        return (
          <div style={{ marginBottom:20,borderRadius:16,padding:'20px 24px',
            background:'linear-gradient(135deg,#f59e0b08,#fde68a12)',
            border:'1.5px solid #f59e0b40',display:'flex',alignItems:'center',gap:20 }}>
            <div style={{ position:'relative' }}>
              <Avatar name={champ.user.name} init={champ.user.init} role={champ.user.role} sz={64}
                rank={1} streak={memberMeta[champ.user.id]?.streak}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#f59e0b',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:2 }}>🏆 Overall Champion · FY {fy}</div>
              <div style={{ fontSize:22,fontWeight:800,color:'var(--text)' }}>{champ.user.name}</div>
              <div style={{ fontSize:12,color:'var(--text2)',marginTop:2 }}>
                Score {champ.overallScore} · {champ.completionPct}% completion · {champ.punctScore!=null?`${champ.punctScore}% punctual`:'building history'}
                {memberMeta[champ.user.id]?.streak&&<span style={{ marginLeft:8,color:'#f59e0b',fontWeight:700 }}>🔥 On a 3-day streak!</span>}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:48,fontWeight:900,color:'#f59e0b',lineHeight:1 }}>{champ.overallScore}</div>
              <div style={{ fontSize:11,color:'var(--text3)' }}>Total Points</div>
            </div>
          </div>
        )
      })()}
      {/* Overall table */}
      <div style={{ marginBottom:20 }}>
        <OverallTable stats={stats} memberMeta={memberMeta}/>
      </div>

      {/* Sub-leaderboards grid */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:16 }}>
        <LeaderCard
          title="% Completion"
          icon="✅"
          subtitle="Tasks marked done vs total assigned"
          rows={stats}
          valueKey="completionPct"
          valueFmt={v=>`${v}%`}
          memberMeta={memberMeta}
        />
        <LeaderCard
          title="Daily Hero"
          icon="⚡"
          subtitle="Tasks completed today"
          rows={stats}
          valueKey="doneToday"
          valueFmt={v=>`${v} today`}
          emptyMsg="No tasks completed today yet"
          memberMeta={memberMeta}
        />
        <LeaderCard
          title="Punctuality"
          icon="⏱"
          subtitle="% of tasks filed on or before due date"
          rows={stats.filter(r=>r.punctCount>0)}
          valueKey="punctScore"
          valueFmt={v=>`${v}%`}
          emptyMsg="Needs completedAt data — update task statuses to build history"
          memberMeta={memberMeta}
        />
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16 }}>
        <LeaderCard
          title="Volume Champion"
          icon="📦"
          subtitle="Most tasks handled this FY"
          rows={stats}
          valueKey="total"
          valueFmt={v=>`${v} tasks`}
          memberMeta={memberMeta}
        />
        <LeaderCard
          title="Least Delayed"
          icon="🎯"
          subtitle="Lowest avg days late (needs history)"
          rows={stats.filter(r=>r.avgDelay!=null)}
          valueKey="avgDelay"
          valueFmt={v=>v<=0?`${Math.abs(v)}d early`:`${v}d late`}
          higherBetter={false}
          emptyMsg="Needs completedAt data — update task statuses to build history"
          memberMeta={memberMeta}
        />
        <LeaderCard
          title="Fewest Overdue"
          icon="🚨"
          subtitle="Least number of overdue tasks right now"
          rows={stats}
          valueKey="overdue"
          valueFmt={v=>`${v} overdue`}
          higherBetter={false}
          memberMeta={memberMeta}
        />
      </div>
    </div>
  )
}
