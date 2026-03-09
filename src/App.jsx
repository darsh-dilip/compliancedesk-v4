import { useState, useCallback } from 'react'
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
import { AuditLogPage }      from './pages/AuditLogPage.jsx'

const allDone = [...DONE_STATUSES,...DONE_NIL,...DONE_PROPER]

export default function App() {
  const { firebaseUser: authUser, loading: authLoading } = useAuth()
  const { data: users,   loading: uLoad } = useCollection('users')
  const { data: clients, loading: cLoad } = useCollection('clients')
  const { data: tasks,   loading: tLoad } = useCollection('tasks')

  const [page,         setPage]         = useState('dashboard')
  const [selectedTask, setSelectedTask] = useState(null)
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
        return <ClientsPage
          clients={clients} users={users} tasks={visibleTasks}
          currentUser={currentUser} onAdd={goAddClient}
          onTask={setSelectedTask} onAddAdhoc={goAddAdhoc}
        />
      case 'add_client':
        return <AddClientPage
          users={users} currentUser={currentUser}
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
        return isMgr ? <TeamPage users={users} tasks={visibleTasks} clients={clients} user={currentUser} onTask={setSelectedTask}/> : null
      case 'workload':
        return isMgr ? <DashboardWorkload tasks={visibleTasks} users={users} clients={clients} user={currentUser} onTask={setSelectedTask} onNavigatePending={navigatePending}/> : null
      case 'gst':
        return isMgr ? <DashboardGST tasks={visibleTasks} clients={clients} users={users} user={currentUser} onTask={setSelectedTask}/> : null
      case 'tds':
        return isMgr ? <DashboardTDS tasks={visibleTasks} clients={clients} users={users} user={currentUser} onTask={setSelectedTask}/> : null
      case 'it':
        return isMgr ? <DashboardIT tasks={visibleTasks} clients={clients} users={users} user={currentUser} onTask={setSelectedTask}/> : null
      case 'status':
        return isMgr ? <StatusDashboard tasks={visibleTasks} users={users} user={currentUser}/> : null
      case 'audit':
        return isMgr ? <AuditLogPage users={users} clients={clients} currentUser={currentUser}/> : null
      case 'users':
        return currentUser.role === 'partner' ? <UsersPage users={users} currentUser={currentUser} createFirebaseUser={createUser}/> : null
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
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onDeleted={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
