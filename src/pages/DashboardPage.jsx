import { useMemo } from 'react'
import { DONE_STATUSES, DONE_NIL, DONE_PROPER } from '../constants.js'
import { getBucket } from '../utils/dates.js'
import { getVisibleUserIds } from '../utils/hierarchy.js'
import { StatCard, BucketSection } from '../components/UI.jsx'

const BUCKETS = [
  { key:'overdue', label:'🔴 Overdue',           color:'#f43f5e', defaultOpen:true  },
  { key:'today',   label:'🟠 Due Today',          color:'#fb923c', defaultOpen:true  },
  { key:'soon3',   label:'🟡 Due in 3 Days',      color:'#f59e0b', defaultOpen:true  },
  { key:'soon7',   label:'🔵 Due in 7 Days',      color:'#5b8dee', defaultOpen:true  },
  { key:'this_month',label:'🩵 This Month',       color:'#38bdf8', defaultOpen:false },
  { key:'others',  label:'⚪ Upcoming / Others',   color:'#8892b0', defaultOpen:false },
  { key:'hold',    label:'⏸ On Hold',             color:'#a78bfa', defaultOpen:false },
  { key:'done',    label:'✅ Completed',           color:'#22c55e', defaultOpen:false },
]

export const DashboardPage = ({ tasks, user, users, clients, onTask, onNavigatePending }) => {
  const mine = tasks.filter(t=>t.assignedTo===user.id)
  const allDone = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]

  const allVisible = useMemo(()=>{
    const ids=getVisibleUserIds(user,users); return tasks.filter(t=>ids.includes(t.assignedTo))
  },[tasks,user,users])

  const buckets = useMemo(()=>{
    const b={ overdue:[],today:[],soon3:[],soon7:[],this_month:[],hold:[],done:[],others:[] }
    mine.forEach(t=>{ const bk=getBucket(t); b[bk]=b[bk]||[]; b[bk].push(t) })
    return b
  },[mine])

  const isManager = ['partner','hod','team_leader'].includes(user.role)
  const today = new Date()
  const g = today.getHours()<12?'Good morning':today.getHours()<17?'Good afternoon':'Good evening'
  const dateStr = today.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  const totalActive = mine.filter(t=>!allDone.includes(t.status)&&t.status!=='dropped').length

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:1100 }}>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:22,fontWeight:800,color:'var(--text)',letterSpacing:'-0.5px' }}>{g}, {user.name.split(' ')[0]} 👋</div>
        <div style={{ fontSize:13,color:'var(--text2)',marginTop:4 }}>{dateStr} · FY 2025–26</div>
      </div>

      <div className="grid-4" style={{ marginBottom:24 }}>
        <StatCard label="My Active Tasks" value={totalActive} color="var(--accent)"
          sub={`${mine.length} total assigned`}
          onClick={()=>onNavigatePending('all')}
        />
        <StatCard label="Overdue" value={buckets.overdue.length} color="var(--danger)"
          sub={buckets.overdue.length>0?'Needs immediate action!':"You're clear ✓"}
          onClick={()=>onNavigatePending('overdue')}
        />
        <StatCard label="Due Today" value={buckets.today.length} color="var(--warn)"
          onClick={()=>onNavigatePending('today')}
        />
        <StatCard label="Due in 7 Days" value={(buckets.soon3?.length||0)+(buckets.soon7?.length||0)} color="var(--info)"
          onClick={()=>onNavigatePending('week')}
        />
      </div>

      {isManager&&(
        <div className="card" style={{ padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:14,cursor:'pointer' }} onClick={()=>onNavigatePending('team')}>
          <div style={{ fontSize:20 }}>👥</div>
          <div>
            <div style={{ fontWeight:600,fontSize:13,color:'var(--text)' }}>Team Overview</div>
            <div style={{ fontSize:12,color:'var(--text2)' }}>
              <span style={{ color:'var(--danger)',fontWeight:700 }}>{allVisible.filter(t=>getBucket(t)==='overdue').length}</span> overdue ·{' '}
              <span style={{ color:'var(--warn)',fontWeight:700 }}>{allVisible.filter(t=>getBucket(t)==='today').length}</span> due today ·{' '}
              {allVisible.filter(t=>!allDone.includes(t.status)&&t.status!=='dropped').length} active across your team
              <span style={{ color:'var(--accent)',marginLeft:8 }}>View all →</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontWeight:700,fontSize:15,color:'var(--text)',marginBottom:14 }}>My Tasks</div>
      {mine.length===0?(
        <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}><div style={{ fontSize:32,marginBottom:12 }}>🎉</div><div>No tasks assigned to you yet.</div></div>
      ):BUCKETS.map(b=>(
        <BucketSection key={b.key} label={b.label} tasks={buckets[b.key]||[]} color={b.color} users={users} clients={clients} onTask={onTask} defaultOpen={b.defaultOpen}/>
      ))}
    </div>
  )
}
