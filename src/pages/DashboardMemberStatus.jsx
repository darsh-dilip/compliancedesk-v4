import { useState, useMemo } from 'react'
import { SERVICE_STATUSES, getStatusObj, DONE_STATUSES, DONE_NIL, DONE_PROPER, FINANCIAL_YEARS, ROLES, ROLE_CLR } from '../constants.js'
import { getBucket , getFYOptions } from '../utils/dates.js'
import { Avatar, PrintButton, PrintHeader, ExcelButton } from '../components/UI.jsx'

const SERVICES = Object.keys(SERVICE_STATUSES)
const allDone = [...DONE_STATUSES, ...DONE_NIL, ...DONE_PROPER]

// Compliance services + one ad-hoc bucket
const SERVICE_OPTIONS = [
  ...SERVICES,
  'Ad-Hoc Tasks',
]


const getUrgency = (t) => {
  if (!t.dueDate) return 'Unknown'
  const today = new Date().toISOString().split('T')[0]
  if (t.dueDate < today) return 'Overdue'
  const diff = Math.round((new Date(t.dueDate) - new Date()) / 86400000)
  if (diff <= 3)  return 'Due in 3 days'
  if (diff <= 7)  return 'Due this week'
  if (diff <= 30) return 'Due this month'
  return 'Upcoming'
}

export const DashboardMemberStatus = ({ tasks, users, clients, user, onTask, memberMeta={} }) => {
  const [selMember,  setSelMember]  = useState('')
  const [selService, setSelService] = useState('')
  const [fy,         setFY]         = useState('2026-27')

  const teamMembers = [...users].sort((a,b)=>a.name.localeCompare(b.name))
  const selectedMember = users.find(u => u.id === selMember)

  const memberTasks = useMemo(() => {
    if (!selMember) return []
    let t = tasks.filter(t => t.assignedTo === selMember && t.fy === fy)
    if (selService === 'Ad-Hoc Tasks') return t.filter(t => t.isAdhoc)
    if (selService) return t.filter(t => t.service === selService)
    return t
  }, [tasks, selMember, selService, fy])

  // Group into: Overdue, Pending, Done, Hold/Cancelled
  const buckets = useMemo(() => {
    const overdue = [], pending = [], done = [], hold = []
    memberTasks.forEach(t => {
      if (allDone.includes(t.status)) { done.push(t); return }
      if (['on_hold','dropped','discontinued','refused','client_unresponsive'].includes(t.status)) { hold.push(t); return }
      if (getBucket(t) === 'overdue') { overdue.push(t); return }
      pending.push(t)
    })
    return [
      { key:'overdue', label:'Overdue',         color:'#f43f5e', tasks:overdue },
      { key:'pending', label:'Pending',          color:'#f59e0b', tasks:pending },
      { key:'done',    label:'Done',             color:'#22c55e', tasks:done    },
      { key:'hold',    label:'Hold / Cancelled', color:'#6b7280', tasks:hold    },
    ]
  }, [memberTasks])

  const MemberCard = ({ u }) => {
    const myTasks   = tasks.filter(t => t.assignedTo === u.id && t.fy === fy)
    const myOverdue = myTasks.filter(t => getBucket(t) === 'overdue').length
    const isActive  = selMember === u.id
    return (
      <button onClick={() => setSelMember(u.id)}
        style={{ width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:9,border:`1px solid ${isActive?ROLE_CLR[u.role]+'60':'var(--border)'}`,cursor:'pointer',
          background:isActive?`${ROLE_CLR[u.role]}10`:'var(--surface)',
          borderLeft:`3px solid ${isActive?ROLE_CLR[u.role]:'transparent'}`,marginBottom:5,transition:'all .12s' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <Avatar name={u.name} init={u.init} role={u.role} sz={28} rank={memberMeta[u.id]?.rank} streak={memberMeta[u.id]?.streak}/>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontWeight:isActive?700:500,fontSize:12,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{u.name}</div>
            <div style={{ fontSize:10,color:ROLE_CLR[u.role],fontWeight:600 }}>{ROLES[u.role]}</div>
          </div>
          {myOverdue>0 && <span style={{ fontSize:9,fontWeight:700,background:'#f43f5e20',color:'#f43f5e',border:'1px solid #f43f5e30',padding:'1px 5px',borderRadius:4 }}>{myOverdue} late</span>}
        </div>
      </button>
    )
  }

  return (
    <div className="fade-up print-root" style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 48px)',overflow:'hidden' }}>
      {/* Sticky top bar */}
      <div style={{ display:'flex',alignItems:'center',gap:8,padding:'14px 28px 12px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',flex:1 }}>👥 Team Member Status</div>
        <ExcelButton filename="MemberStatus" getData={()=>({
          headers:['Client Name','FY','Task / Service','Period','Due Date','Assigned To','Status','Urgency','Client Category'],
          rows:(memberTasks||[]).map(t=>{
            const u=(users||[]).find(u=>u.id===t.assignedTo)
            const cl=(clients||[]).find(c=>c.id===t.clientId)
            return [t.clientName||'',t.fy||'',t.service||'',t.period||'',t.dueDate||'',u?.name||'',t.status||'',getUrgency(t),cl?.category||t.category||'']
          })
        })}/>
        <PrintButton title="Team Member Status"/>
      </div>
      <div style={{ flex:1,overflow:'hidden',padding:'20px 28px 0',display:'grid',gridTemplateColumns:'220px 1fr',gap:20 }}>

      {/* Left: team member cards */}
      <div style={{ display:'flex',flexDirection:'column',overflow:'hidden' }}>
        <div style={{ fontSize:16,fontWeight:800,color:'var(--text)',marginBottom:4 }}>Team Member Status</div>
        <div style={{ fontSize:11,color:'var(--text3)',marginBottom:12 }}>Select a member to see their tasks.</div>
        <div style={{ flex:1,overflow:'auto' }}>
          {teamMembers.map(u => <MemberCard key={u.id} u={u}/>)}
        </div>
      </div>

      {/* Right: content */}
      {!selMember ? (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'var(--text3)' }}>
          <span style={{ fontSize:40 }}>👤</span>
          <div>Select a team member from the left</div>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',overflow:'hidden' }}>
          {/* Member header + filters (sticky) */}
          <div style={{ position:'sticky',top:0,zIndex:50,background:'var(--bg)',paddingBottom:12,borderBottom:'1px solid var(--border)',marginBottom:14 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'nowrap' }}>
            <Avatar name={selectedMember.name} init={selectedMember.init} role={selectedMember.role} sz={36} rank={memberMeta[selectedMember.id]?.rank} streak={memberMeta[selectedMember.id]?.streak}/>
            <div style={{ minWidth:0,maxWidth:220 }}>
              <div style={{ fontWeight:700,fontSize:15,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{selectedMember.name}</div>
              <div style={{ fontSize:11,color:ROLE_CLR[selectedMember.role],fontWeight:600 }}>{ROLES[selectedMember.role]}</div>
            </div>
            <div style={{ width:1,height:32,background:'var(--border2)',flexShrink:0 }}/>
            <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <select value={selService} onChange={e=>setSelService(e.target.value)} style={{ fontSize:12,minWidth:160 }}>
              <option value="">All Services</option>
              <optgroup label="GST">
                <option value="GSTR-1">GSTR-1</option>
                <option value="GSTR-1 (Quarterly)">GSTR-1 (Quarterly)</option>
                <option value="GSTR-3B">GSTR-3B</option>
                <option value="GSTR-3B (Quarterly)">GSTR-3B (Quarterly)</option>
                <option value="GSTR-9 Annual Return">GSTR-9 Annual Return</option>
              </optgroup>
              <optgroup label="TDS">
                <option value="TDS Payment">TDS Payment</option>
                <option value="TDS Return 24Q">TDS Return 24Q</option>
                <option value="TDS Return 26Q">TDS Return 26Q</option>
              </optgroup>
              <optgroup label="Professional Tax">
                <option value="PT Payment (Maharashtra)">PT Payment (Maharashtra)</option>
                <option value="PT Return (Maharashtra)">PT Return (Maharashtra)</option>
                <option value="PT Payment (Karnataka)">PT Payment (Karnataka)</option>
                <option value="PT Return (Karnataka)">PT Return (Karnataka)</option>
              </optgroup>
              <optgroup label="Income Tax">
                <option value="Income Tax Filing">Income Tax Filing</option>
                <option value="Advance Tax">Advance Tax</option>
              </optgroup>
              <optgroup label="Other">
                <option value="Accounting">Accounting</option>
                <option value="Ad-Hoc Tasks">Ad-Hoc Tasks</option>
              </optgroup>
            </select>
            <select value={fy} onChange={e=>setFY(e.target.value)} style={{ fontSize:12,minWidth:110 }}>
              {getFYOptions(tasks).map(f=><option key={f} value={f}>FY {f}</option>)}
            </select>
            </div>
          </div>
          </div>

          {/* Summary chips */}
          <div style={{ display:'flex',gap:8,marginBottom:14,flexWrap:'wrap' }}>
            {buckets.map(b=>(
              <div key={b.key} style={{ display:'flex',alignItems:'center',gap:6,background:`${b.color}12`,border:`1px solid ${b.color}30`,borderRadius:8,padding:'5px 12px' }}>
                <span style={{ fontWeight:800,fontSize:15,color:b.color }}>{b.tasks.length}</span>
                <span style={{ fontSize:11,color:'var(--text2)' }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* Bucket columns */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,flex:1,overflow:'hidden' }}>
            {buckets.map(b=>(
              <div key={b.key} style={{ background:'var(--surface2)',borderRadius:12,border:`1px solid ${b.color}25`,display:'flex',flexDirection:'column',overflow:'hidden' }}>
                <div style={{ padding:'8px 12px',borderBottom:`1px solid ${b.color}25`,display:'flex',alignItems:'center',gap:6 }}>
                  <div style={{ width:7,height:7,borderRadius:'50%',background:b.color }}/>
                  <span style={{ fontWeight:700,fontSize:11,color:b.color }}>{b.label}</span>
                  <span style={{ marginLeft:'auto',fontSize:10,fontWeight:700,color:b.color,background:`${b.color}20`,padding:'1px 6px',borderRadius:8 }}>{b.tasks.length}</span>
                </div>
                <div style={{ padding:6,overflow:'auto',flex:1 }}>
                  {b.tasks.length===0 && <div style={{ padding:12,textAlign:'center',fontSize:11,color:'var(--text3)' }}>None</div>}
                  {b.tasks.map(t=>{
                    const st = getStatusObj(t.service, t.status)
                    return (
                      <div key={t.id} onClick={()=>onTask?.(t)}
                        style={{ padding:'8px 10px',borderRadius:7,background:'var(--surface)',marginBottom:5,cursor:'pointer',border:'1px solid var(--border)' }}>
                        <div style={{ fontWeight:600,fontSize:11,color:'var(--text)',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{t.clientName}</div>
                        <div style={{ fontSize:10,color:'var(--text3)',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{t.service} · {t.period}</div>
                        <span style={{ fontSize:9,padding:'1px 6px',borderRadius:3,background:st.bg,color:st.c,border:`1px solid ${st.c}30` }}>{st.l}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
