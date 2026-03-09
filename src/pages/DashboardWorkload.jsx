import { useState, useMemo } from 'react'
import { ROLES, ROLE_CLR, ROLE_ORDER, DONE_STATUSES } from '../constants.js'
import { getBucket } from '../utils/dates.js'
import { getSubordinates } from '../utils/hierarchy.js'
import { Avatar, StatCard, BucketSection } from '../components/UI.jsx'

const Bar = ({ value, max, color }) => (
  <div style={{ height:6,background:'var(--surface3)',borderRadius:3,overflow:'hidden',flex:1 }}>
    <div style={{ height:'100%',width:`${max?Math.round((value/max)*100):0}%`,background:color,borderRadius:3,transition:'width .4s ease' }}/>
  </div>
)

const MemberCard = ({ member, tasks, users, onClick }) => {
  const mt      = tasks.filter(t=>t.assignedTo===member.id)
  const overdue = mt.filter(t=>getBucket(t)==='overdue').length
  const today   = mt.filter(t=>getBucket(t)==='today').length
  const soon    = mt.filter(t=>['soon3','soon7'].includes(getBucket(t))).length
  const done    = mt.filter(t=>DONE_STATUSES.includes(t.status)).length
  const active  = mt.filter(t=>!DONE_STATUSES.includes(t.status)&&t.status!=='dropped').length
  const total   = mt.length
  const pct     = total?Math.round((done/total)*100):0
  const mgr     = users.find(u=>u.id===member.reportsTo)
  return (
    <div onClick={onClick} className="hover-lift card" style={{ padding:'16px 18px',cursor:'pointer' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
        <Avatar name={member.name} init={member.init} role={member.role} sz={38}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>{member.name}</div>
          <div style={{ fontSize:11,color:ROLE_CLR[member.role],fontWeight:600 }}>{ROLES[member.role]}{mgr?` · ${mgr.name.split(' ')[0]}`:''}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:22,fontWeight:800,color:'var(--text)' }}>{active}</div>
          <div style={{ fontSize:10,color:'var(--text3)' }}>active</div>
        </div>
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
        <Bar value={done} max={total} color='#22c55e'/>
        <span style={{ fontSize:11,color:'var(--text3)',whiteSpace:'nowrap' }}>{pct}% done</span>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8 }}>
        {[{v:overdue,l:'Overdue',c:'#f43f5e'},{v:today,l:'Today',c:'#fb923c'},{v:soon,l:'This Week',c:'#f59e0b'},{v:done,l:'Done',c:'#22c55e'}].map(x=>(
          <div key={x.l} style={{ background:'var(--surface2)',borderRadius:8,padding:8,textAlign:'center' }}>
            <div style={{ fontWeight:700,color:x.c,fontSize:16 }}>{x.v}</div>
            <div style={{ fontSize:10,color:'var(--text3)' }}>{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const MemberDrill = ({ member, tasks, users, clients, onTask, onBack }) => {
  const mt      = tasks.filter(t=>t.assignedTo===member.id)
  const overdue = mt.filter(t=>getBucket(t)==='overdue')
  const today   = mt.filter(t=>getBucket(t)==='today')
  const upcoming= mt.filter(t=>['soon3','soon7','others'].includes(getBucket(t)))
  const done    = mt.filter(t=>DONE_STATUSES.includes(t.status))
  const hold    = mt.filter(t=>['hold','dropped'].includes(getBucket(t)))
  const services= [...new Set(mt.map(t=>t.service))].sort()
  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:1000 }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom:16 }}>← Back</button>
      <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:20 }}>
        <Avatar name={member.name} init={member.init} role={member.role} sz={44}/>
        <div>
          <div style={{ fontSize:20,fontWeight:800,color:'var(--text)' }}>{member.name}</div>
          <div style={{ fontSize:12,color:ROLE_CLR[member.role],fontWeight:600 }}>{ROLES[member.role]}{member.dept&&` · ${member.dept}`}</div>
        </div>
      </div>
      <div className="grid-4" style={{ marginBottom:20 }}>
        <StatCard label="Overdue"  value={overdue.length}  color="var(--danger)"/>
        <StatCard label="Due Today"value={today.length}    color="var(--warn)"/>
        <StatCard label="Upcoming" value={upcoming.length} color="var(--accent)"/>
        <StatCard label="Completed"value={done.length}     color="var(--success)"/>
      </div>
      <div className="card" style={{ padding:'14px 18px',marginBottom:20 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:12 }}>Workload by Service</div>
        {services.map(svc=>{
          const st=mt.filter(t=>t.service===svc); const d=st.filter(t=>DONE_STATUSES.includes(t.status)).length; const ov=st.filter(t=>getBucket(t)==='overdue').length
          return (
            <div key={svc} style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 3fr',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)',alignItems:'center' }}>
              <div style={{ fontSize:13,color:'var(--text)' }}>{svc}</div>
              <div style={{ fontSize:13,color:'var(--text2)' }}>{st.length}</div>
              <div style={{ fontSize:13,color:'var(--success)' }}>{d}</div>
              <div style={{ fontSize:13,color:ov>0?'var(--danger)':'var(--text3)' }}>{ov}</div>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <Bar value={d} max={st.length} color='#22c55e'/>
                <span style={{ fontSize:11,color:'var(--text3)',width:34 }}>{st.length?Math.round((d/st.length)*100):0}%</span>
              </div>
            </div>
          )
        })}
      </div>
      <BucketSection label="🔴 Overdue"   tasks={overdue}  color="#f43f5e" users={users} clients={clients} onTask={onTask}/>
      <BucketSection label="🟠 Due Today" tasks={today}    color="#fb923c" users={users} clients={clients} onTask={onTask}/>
      <BucketSection label="📋 Upcoming"  tasks={upcoming} color="#5b8dee" users={users} clients={clients} onTask={onTask}/>
      <BucketSection label="⏸ On Hold"   tasks={hold}     color="#a78bfa" users={users} clients={clients} onTask={onTask} defaultOpen={false}/>
      <BucketSection label="✅ Completed" tasks={done}     color="#22c55e" users={users} clients={clients} onTask={onTask} defaultOpen={false}/>
    </div>
  )
}

export const DashboardWorkload = ({ users, tasks, clients, user, onTask, onNavigatePending }) => {
  const [selected, setSelected] = useState(null)
  const team = useMemo(()=>{
    if (user.role==='partner') return users.filter(u=>u.id!==user.id)
    return users.filter(u=>getSubordinates(user.id,users).includes(u.id))
  },[users,user])
  const sorted = [...team].sort((a,b)=>ROLE_ORDER[a.role]-ROLE_ORDER[b.role])
  const teamTasks = tasks.filter(t=>team.some(m=>m.id===t.assignedTo))
  if (selected) return <MemberDrill member={selected} tasks={tasks} users={users} clients={clients} onTask={onTask} onBack={()=>setSelected(null)}/>
  return (
    <div className="fade-up" style={{ padding:'24px 28px' }}>
      <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:6 }}>Team Workload</div>
      <div style={{ fontSize:13,color:'var(--text2)',marginBottom:20 }}>Click any member to drill into their tasks.</div>
      <div className="grid-4" style={{ marginBottom:24 }}>
        <StatCard label="Team Members"  value={team.length}                                                       color="var(--accent)"/>
        <StatCard label="Total Overdue" value={teamTasks.filter(t=>getBucket(t)==='overdue').length}              color="var(--danger)"  onClick={()=>onNavigatePending?.('overdue')}/>
        <StatCard label="Due Today"     value={teamTasks.filter(t=>getBucket(t)==='today').length}                color="var(--warn)"    onClick={()=>onNavigatePending?.('today')}/>
        <StatCard label="Done This FY"  value={teamTasks.filter(t=>DONE_STATUSES.includes(t.status)).length}      color="var(--success)"/>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12 }}>
        {sorted.map(m=><MemberCard key={m.id} member={m} tasks={tasks} users={users} onClick={()=>setSelected(m)}/>)}
      </div>
    </div>
  )
}
