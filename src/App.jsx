import { useState, useCallback, useEffect, useMemo } from 'react'
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase.js'
import { useAuth } from './hooks/useAuth.js'
import { useCollection } from './hooks/useFirestore.js'
import { getBucket } from './utils/dates.js'
import { getVisibleUserIds } from './utils/hierarchy.js'
import { DONE_STATUSES, DONE_NIL, DONE_PROPER } from './constants.js'

import { Sidebar }           from './components/Sidebar.jsx'
import { TaskModal }         from './components/TaskModal.jsx'
import { Spinner }           from './components/UI.jsx'
import { LoginPage }         from './pages/LoginPage.jsx'
import { DashboardPage }     from './pages/DashboardPage.jsx'
import { TasksPage }         from './pages/TasksPage.jsx'
import { ClientsPage }       from './pages/ClientsPage.jsx'
import { AddClientPage }     from './pages/AddClientPage.jsx'
import { AddAdHocTask }      from './pages/AddAdHocTask.jsx'
import { TeamPage }          from './pages/TeamPage.jsx'
import { UsersPage }         from './pages/UsersPage.jsx'
import { DashboardWorkload } from './pages/DashboardWorkload.jsx'
import { DashboardGST }      from './pages/DashboardGST.jsx'
import { DashboardIT }       from './pages/DashboardIT.jsx'
import { DashboardTDS }      from './pages/DashboardTDS.jsx'
import { StatusDashboard }   from './pages/StatusDashboard.jsx'
import { AuditLogPage }          from './pages/AuditLogPage.jsx'
import { CredentialManager }      from './pages/CredentialManager.jsx'
import { DashboardMemberStatus }  from './pages/DashboardMemberStatus.jsx'
import { DashboardClientStatus }  from './pages/DashboardClientStatus.jsx'
import { ProfilePage }            from './pages/ProfilePage.jsx'
import { BulkDueDatePage }        from './pages/BulkDueDatePage.jsx'
import { BulkUpdatesPage }        from './pages/BulkUpdatesPage.jsx'
import { DashboardDueDone }       from './pages/DashboardDueDone.jsx'
import { DashboardLeaderboard }    from './pages/DashboardLeaderboard.jsx'
import { DashboardScoreCard }      from './pages/DashboardScoreCard.jsx'
import { UnassignedPage }          from './pages/UnassignedPage.jsx'
import { CelebrationFAB }          from './components/CelebrationFAB.jsx'
import { YearEndBatchPage }        from './pages/YearEndBatchPage.jsx'
import { BulkImportPage }         from './pages/BulkImportPage.jsx'

const allDone = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]

export default function App() {
  const { firebaseUser: authUser, loading: authLoading } = useAuth()
  const { data: users,   loading: uLoad } = useCollection('users')
  const { data: clients, loading: cLoad } = useCollection('clients')
  const { data: tasks,   loading: tLoad } = useCollection('tasks')

  const [page,         setPage]         = useState('dashboard')
  const [selectedTask,  setSelectedTask]  = useState(null)
  const [profileUser,   setProfileUser]    = useState(null)
  const navTo = (p) => { if (p !== 'profile') setProfileUser(null); setPage(p) }
  const [navFilter,    setNavFilter]    = useState(null)
  const [adhocClient,  setAdhocClient]  = useState(null)

  const currentUser = users.find(u => u.id === authUser?.uid)

  const login  = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout = () => signOut(auth)
  const createUser  = (email, password) => createUserWithEmailAndPassword(auth, email, password)

  const navigatePending = useCallback((bucket) => {
    setNavFilter(bucket === 'all' ? null : bucket)
    setPage('pending')
  }, [])

  // Redirect to profile if phone not filled (must be before any conditional returns)
  useEffect(() => {
    if (currentUser && (!currentUser.phone || !currentUser.birthDate) && page !== 'profile') {
      setPage('profile')
    }
  }, [currentUser?.id, currentUser?.phone, currentUser?.birthDate])

  const goAddClient = () => setPage('add_client')

  const goAddAdhoc = (client) => {
    setAdhocClient(client)
    setPage('add_adhoc')
  }

  const overdueMine = currentUser
    ? tasks.filter(t => t.assignedTo === currentUser.id && getBucket(t) === 'overdue').length
    : 0

  if (authLoading || (authUser && (uLoad || cLoad || tLoad))) {
    return (
      <div style={{ minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <Spinner text="Loading ComplianceDesk…"/>
      </div>
    )
  }

  if (!authUser) return <LoginPage onLogin={login}/>

  if (!currentUser) return (
    <div style={{ minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32,marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:18,fontWeight:700,marginBottom:8 }}>Account Not Set Up</div>
        <div style={{ fontSize:13,color:'var(--text2)',marginBottom:16 }}>Your login exists but no profile was found.</div>
        <button className="btn btn-ghost" onClick={logout}>Sign Out</button>
      </div>
    </div>
  )

  const visibleIds   = getVisibleUserIds(currentUser, users)
  const visibleTasks = tasks.filter(t => visibleIds.includes(t.assignedTo))
  const isMgr        = ['partner','hod','team_leader'].includes(currentUser.role)
  const isSales       = currentUser.role === 'sales'


  // ── Global member ranks + streak (used by Avatar throughout portal) ──
  const memberMeta = useMemo(() => {
    const allDone = [...(DONE_PROPER||[]),...(DONE_NIL||[])]
    const today     = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now()-86400000).toISOString().split('T')[0]
    const dayBefore = new Date(Date.now()-172800000).toISOString().split('T')[0]
    const team = (users||[]).filter(u=>u.role!=='partner')
    const scores = team.map(u=>{
      const mt = (tasks||[]).filter(t=>t.assignedTo===u.id)
      const total=mt.length, done=mt.filter(t=>allDone.includes(t.status)).length
      const overdue=mt.filter(t=>!allDone.includes(t.status)&&t.dueDate<today).length
      const cpct=total?Math.round(done/total*100):0
      const opct=total?Math.round(overdue/total*100):0
      const comp=mt.filter(t=>t.completedAt&&t.dueDate)
      const onTime=comp.filter(t=>t.completedAt.slice(0,10)<=t.dueDate).length
      const pct=comp.length?Math.round(onTime/comp.length*100):null
      const score=Math.round(0.4*cpct+0.4*(pct??cpct)+0.2*(100-opct))
      const streak=[today,yesterday,dayBefore].every(day=>
        (tasks||[]).some(t=>t.assignedTo===u.id&&allDone.includes(t.status)&&(t.completedAt||'').slice(0,10)===day)
      )
      return {id:u.id,score,streak}
    })
    const sorted=[...scores].sort((a,b)=>b.score-a.score)
    const meta={}
    scores.forEach(s=>{
      const ri=sorted.findIndex(x=>x.id===s.id)
      meta[s.id]={rank:ri<3?ri+1:null,streak:s.streak,score:s.score}
    })
    return meta
  }, [users, tasks])

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage
          tasks={visibleTasks} user={currentUser} users={users} clients={clients}
          onTask={setSelectedTask} onNavigatePending={navigatePending}
        />
      case 'pending':
        return <TasksPage
          tasks={visibleTasks} user={currentUser} users={users} clients={clients}
          onTask={setSelectedTask} showPendingOnly initialBucket={navFilter}
          key={`pending-${navFilter}`}
        />
      case 'tasks':
        return <TasksPage
          tasks={visibleTasks} user={currentUser} users={users} clients={clients}
          onTask={setSelectedTask}
        />
      case 'clients':
        return <ClientsPage onBulkImport={()=>setPage('bulkimport')}
          clients={clients} users={users} tasks={visibleTasks}
          currentUser={currentUser} onAdd={goAddClient}
          onTask={setSelectedTask} onAddAdhoc={goAddAdhoc}
        />
      case 'add_client':
        return <AddClientPage
          users={users} clients={clients} currentUser={currentUser}
          onBack={() => setPage('clients')}
          onSuccess={() => setPage('clients')}
        />
      case 'add_adhoc':
        return <AddAdHocTask
          clients={clients} users={users} currentUser={currentUser}
          initialClient={adhocClient}
          onBack={() => setPage('clients')}
          onSuccess={() => setPage('clients')}
        />
      case 'team':
        return isMgr ? <TeamPage users={users} tasks={visibleTasks} clients={clients} user={currentUser} onTask={setSelectedTask} memberMeta={memberMeta}/> : null
      case 'workload':
        return isMgr ? <DashboardWorkload tasks={visibleTasks} users={users} clients={clients} user={currentUser} onTask={setSelectedTask} onNavigatePending={navigatePending} memberMeta={memberMeta}/> : null
      case 'gst':
        return <DashboardGST tasks={visibleTasks} clients={clients} users={users} user={currentUser} onTask={setSelectedTask}/>
      case 'tds':
        return <DashboardTDS tasks={visibleTasks} clients={clients} users={users} user={currentUser} onTask={setSelectedTask}/>
      case 'it':
        return <DashboardIT tasks={visibleTasks} clients={clients} users={users} user={currentUser} onTask={setSelectedTask}/>
      case 'status':
        return <StatusDashboard tasks={visibleTasks} users={users} user={currentUser}/>
      case 'audit':
        return <AuditLogPage users={users} clients={clients} currentUser={currentUser}/>
      case 'creds':
        return isSales ? null : <CredentialManager clients={clients} currentUser={currentUser}/>
      case 'memberstatus':
        return <DashboardMemberStatus tasks={visibleTasks} users={users} user={currentUser} onTask={setSelectedTask}/>
      case 'clientstatus':
        return <DashboardClientStatus tasks={visibleTasks} clients={clients} users={users} onTask={setSelectedTask}/>
      case 'profile':
        return <ProfilePage currentUser={profileUser||currentUser} memberMeta={memberMeta} onUpdated={()=>{}} onBack={()=>setPage('dashboard')}/>
      case 'bulkimport':
        return <BulkImportPage users={users} clients={clients} onBack={()=>setPage('clients')}/>
      case 'bulkdate':
        return isMgr ? <BulkUpdatesPage tasks={visibleTasks} clients={clients} users={users} currentUser={currentUser}/> : null
      case 'duedone':
        return <DashboardDueDone tasks={visibleTasks} clients={clients} users={users} user={currentUser}/>
      case 'leaderboard':
        return <DashboardLeaderboard tasks={visibleTasks} users={users} clients={clients} memberMeta={memberMeta}/>
      case 'scorecard':
        return <DashboardScoreCard tasks={visibleTasks} users={users} clients={clients}/>
      case 'unassigned':
        return isMgr ? <UnassignedPage tasks={tasks} clients={clients} users={users} currentUser={currentUser}/> : null
      case 'yearend':
        return isMgr ? <YearEndBatchPage tasks={tasks} clients={clients} users={users} currentUser={currentUser}/> : null
      case 'users':
        return currentUser.role === 'partner' ? <UsersPage users={users} currentUser={currentUser} createFirebaseUser={createUser} onViewProfile={(u)=>{ setProfileUser(u); setPage('profile') }}/> : null
      default:
        return <DashboardPage
          tasks={visibleTasks} user={currentUser} users={users} clients={clients}
          onTask={setSelectedTask} onNavigatePending={navigatePending}
        />
    }
  }

  return (
    <div style={{ display:'flex',minHeight:'100vh',background:'var(--bg)' }}>
      <Sidebar
        page={page} setPage={p => { setNavFilter(null); setPage(p) }}
        user={currentUser} onLogout={logout}
        overdueCount={overdueMine}
      />
      <main style={{ flex:1,overflow:'auto' }}>
        {renderPage()}
      </main>
      {selectedTask && (
        <TaskModal
          task={selectedTask} users={users} clients={clients}
          currentUser={currentUser} allTasks={tasks}
          onClose={() => setSelectedTask(null)}
          onDeleted={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
