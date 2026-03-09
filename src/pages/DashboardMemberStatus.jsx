import { useState, useMemo } from 'react'
import { SERVICE_STATUSES, getStatusObj, DONE_STATUSES, FINANCIAL_YEARS } from '../constants.js'
import { getBucket } from '../utils/dates.js'
import { Avatar } from '../components/UI.jsx'

const SERVICES = Object.keys(SERVICE_STATUSES)

export const DashboardMemberStatus = ({ tasks, users, user, onTask }) => {
  const [selMember, setSelMember] = useState('')
  const [selService, setSelService] = useState('')
  const [fy, setFY] = useState('2025-26')

  const teamMembers = users.filter(u => u.id !== user.id || user.role === 'partner')

  const memberTasks = useMemo(() => {
    if (!selMember || !selService) return []
    return tasks.filter(t =>
      t.assignedTo === selMember &&
      t.service === selService &&
      t.fy === fy
    )
  }, [tasks, selMember, selService, fy])

  // Group by status
  const byStatus = useMemo(() => {
    const g = {}
    memberTasks.forEach(t => {
      const st = getStatusObj(t.service, t.status)
      const key = t.status
      if (!g[key]) g[key] = { label: st.l, color: st.c, bg: st.bg, tasks: [] }
      g[key].tasks.push(t)
    })
    return g
  }, [memberTasks])

  const selectedMember = users.find(u => u.id === selMember)

  return (
    <div className="fade-up" style={{ padding:'24px 28px' }}>
      <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4 }}>Team Member Status</div>
      <div style={{ fontSize:13,color:'var(--text2)',marginBottom:20 }}>View all task statuses for a specific team member and service.</div>

      <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
        <select value={selMember} onChange={e=>setSelMember(e.target.value)} style={{ minWidth:200 }}>
          <option value="">-- Select Team Member --</option>
          {teamMembers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={selService} onChange={e=>setSelService(e.target.value)} style={{ minWidth:200 }}>
          <option value="">-- Select Service --</option>
          {SERVICES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fy} onChange={e=>setFY(e.target.value)}>
          {FINANCIAL_YEARS.map(f=><option key={f} value={f}>FY {f}</option>)}
        </select>
      </div>

      {!selMember || !selService ? (
        <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>
          <div style={{ fontSize:36,marginBottom:12 }}>👤</div>
          <div>Select a team member and service to view their status breakdown</div>
        </div>
      ) : (
        <>
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,background:'var(--surface2)',borderRadius:12,padding:'12px 16px' }}>
            {selectedMember && <Avatar name={selectedMember.name} init={selectedMember.init} role={selectedMember.role} sz={36}/>}
            <div>
              <div style={{ fontWeight:700,fontSize:15,color:'var(--text)' }}>{selectedMember?.name}</div>
              <div style={{ fontSize:12,color:'var(--text3)' }}>{selService} · FY {fy} · {memberTasks.length} tasks</div>
            </div>
          </div>

          {Object.keys(byStatus).length === 0 ? (
            <div style={{ textAlign:'center',padding:40,color:'var(--text3)' }}>No tasks found for this combination.</div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12 }}>
              {Object.entries(byStatus).map(([status, { label, color, bg, tasks: sts }]) => (
                <div key={status} className="card" style={{ padding:0,overflow:'hidden',border:`1px solid ${color}30` }}>
                  <div style={{ padding:'10px 14px',background:`${color}12`,borderBottom:`1px solid ${color}25`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                    <span style={{ fontWeight:700,fontSize:13,color }}>{label}</span>
                    <span style={{ fontSize:12,fontWeight:700,color,background:`${color}20`,padding:'2px 8px',borderRadius:10 }}>{sts.length}</span>
                  </div>
                  <div style={{ padding:8,maxHeight:220,overflow:'auto' }}>
                    {sts.map(t => (
                      <div key={t.id} onClick={()=>onTask?.(t)}
                        style={{ padding:'8px 10px',borderRadius:7,background:'var(--surface2)',marginBottom:5,cursor:'pointer',border:'1px solid var(--border)' }}
                        className="hover-lift">
                        <div style={{ fontWeight:600,fontSize:12,color:'var(--text)' }}>{t.clientName}</div>
                        <div style={{ fontSize:10,color:'var(--text3)',marginTop:2 }}>{t.period}</div>
                        {getBucket(t)==='overdue' && <span style={{ fontSize:9,color:'var(--danger)',fontWeight:700 }}>OVERDUE</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
