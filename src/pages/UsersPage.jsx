import { useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { ROLES, ROLE_CLR, ROLE_ORDER, DEPARTMENTS } from '../constants.js'
import { Avatar, Modal, Label, Alert } from '../components/UI.jsx'
import { saveUser, updateUser } from '../hooks/useFirestore.js'
import { logUserCreated } from '../utils/auditLog.js'

const secondaryApp = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}, 'secondary')
const secondaryAuth = getAuth(secondaryApp)

const createFirebaseUser = (email, password) =>
  createUserWithEmailAndPassword(secondaryAuth, email, password)

export const UsersPage = ({ users, currentUser, onViewProfile }) => {
  const [showAdd,    setShowAdd]    = useState(false)
  const [editUser,   setEditUser]   = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)
  const [form,       setForm]       = useState({ name:'',email:'',role:'executive',dept:'',reportsTo:'',init:'' })
  const [pwd,        setPwd]        = useState('')
  const [saving,     setSaving]     = useState(false)
  const [resetMsg,   setResetMsg]   = useState('')
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const sorted = [...users].sort((a,b)=>ROLE_ORDER[a.role]-ROLE_ORDER[b.role])

  const canResetFor = (u) =>
    currentUser.role === 'partner' ||
    (['hod','team_leader'].includes(currentUser.role) && u.reportsTo === currentUser.id)

  const submit = async () => {
    if (!form.name||!form.email||!pwd) { setError('Name, email and password required.'); return }
    if (pwd.length<6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true); setError('')
    try {
      const cred = await createFirebaseUser(form.email, pwd)
      const init = form.init||form.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
      await saveUser(cred.user.uid, { ...form, init, createdAt:new Date().toISOString() })
      await logUserCreated({ ...form, init, id:cred.user.uid }, currentUser)
      setSuccess(`✓ ${form.name} added. Share their temporary password securely.`)
      setForm({ name:'',email:'',role:'executive',dept:'',reportsTo:'',init:'' })
      setPwd(''); setShowAdd(false)
    } catch(e) {
      const m = {'auth/email-already-in-use':'Email already registered.','auth/invalid-email':'Invalid email.','auth/weak-password':'Password too weak.'}
      setError(m[e.code]||e.message)
    } finally { setSaving(false) }
  }

  const saveEdit = async () => {
    if (!editUser) return
    setSaving(true); setError('')
    try {
      await updateUser(editUser.id, {
        name:      form.name,
        role:      form.role,
        dept:      form.dept,
        reportsTo: form.reportsTo,
        init:      form.init || form.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(),
        active:    form.active,
      })
      setSuccess(`✓ ${form.name} updated.`)
      setEditUser(null)
    } catch(e) { setError(e.message) } finally { setSaving(false) }
  }

  const sendReset = async (u) => {
    try {
      await sendPasswordResetEmail(getAuth(), u.email)
      setResetMsg(`✓ Password reset email sent to ${u.email}`)
      setTimeout(()=>setResetMsg(''), 4000)
    } catch(e) { setError(e.message) }
  }

  const openEdit = (u) => {
    setForm({ name:u.name, role:u.role, dept:u.dept||'', reportsTo:u.reportsTo||'', init:u.init||'', active:u.active!==false })
    setEditUser(u)
    setError('')
  }

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:800 }}>
      <div style={{ display:'flex',alignItems:'center',marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20,fontWeight:800,color:'var(--text)' }}>Manage Team</div>
          <div style={{ fontSize:13,color:'var(--text2)',marginTop:2 }}>Add team members and set roles. Partners only.</div>
        </div>
        <button className="btn btn-primary" onClick={()=>{ setForm({ name:'',email:'',role:'executive',dept:'',reportsTo:'',init:'' }); setPwd(''); setError(''); setShowAdd(true) }}>+ Add Member</button>
      </div>

      {success && <Alert type="success" message={success}/>}
      {resetMsg && <Alert type="success" message={resetMsg}/>}
      <div style={{ height:(success||resetMsg)?12:0 }}/>

      <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
        {sorted.map((u,i) => {
          const mgr = users.find(x=>x.id===u.reportsTo)
          const isMe = u.id === currentUser.id
          return (
            <div key={u.id} style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:14 }}>
              <button onClick={()=>onViewProfile?.(u)} style={{ background:'none',border:'none',cursor:'pointer',padding:0 }}>
                <Avatar name={u.name} init={u.init} role={u.role} sz={34}/>
              </button>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,fontSize:13,color:'var(--text)' }}>{u.name}{isMe&&<span style={{ marginLeft:6,fontSize:10,color:'var(--text3)' }}>(you)</span>}</div>
                <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>
                  <span style={{ color:ROLE_CLR[u.role],fontWeight:600 }}>{ROLES[u.role]}</span>
                  {u.dept&&` · ${u.dept}`}
                  {mgr&&<span> · Reports to <strong style={{ color:'var(--text2)' }}>{mgr.name}</strong></span>}
                </div>
              </div>
              <div style={{ fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)',marginRight:8 }}>{u.email}</div>
              {/* Actions */}
              <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                {canResetFor(u) && (
                  <button className="btn btn-ghost btn-sm" onClick={()=>sendReset(u)} title="Send password reset email" style={{ fontSize:11 }}>
                    🔑 Reset
                  </button>
                )}
                {currentUser.role==='partner' && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(u)} style={{ fontSize:11 }}>
                      ✏️ Edit
                    </button>
                    {!isMe && (
                      <button className="btn btn-ghost btn-sm" onClick={()=>setDeleteUser(u)}
                        style={{ fontSize:11,color:'var(--danger)',borderColor:'#f43f5e30' }}>
                        🗑
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={()=>{setShowAdd(false);setError('')}} title="Add Team Member" width={480}>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div className="grid-2">
            <div style={{ gridColumn:'1/-1' }}><Label>Full Name *</Label><input placeholder="e.g. Anjali Mehta" value={form.name} onChange={e=>set('name',e.target.value)}/></div>
            <div style={{ gridColumn:'1/-1' }}><Label>Email *</Label><input type="email" placeholder="anjali@firm.com" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
            <div style={{ gridColumn:'1/-1' }}><Label>Temporary Password *</Label><input type="password" placeholder="Min. 6 characters" value={pwd} onChange={e=>setPwd(e.target.value)}/></div>
            <div><Label>Role *</Label>
              <select value={form.role} onChange={e=>set('role',e.target.value)}>
                {Object.entries(ROLES).filter(([k])=>k!=='partner').map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><Label>Department</Label><select value={form.dept} onChange={e=>set('dept',e.target.value)}><option value="">-- Select Dept --</option>{DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
            <div><Label>Reports To</Label>
              <select value={form.reportsTo} onChange={e=>set('reportsTo',e.target.value)}>
                <option value="">-- Select Manager --</option>
                {users.filter(u=>['partner','hod','team_leader'].includes(u.role)).map(u=><option key={u.id} value={u.id}>{u.name} ({ROLES[u.role]})</option>)}
              </select>
            </div>
            <div><Label>Initials (auto if blank)</Label><input placeholder="e.g. AM" maxLength={2} value={form.init} onChange={e=>set('init',e.target.value.toUpperCase())}/></div>
          </div>
          {error && <Alert message={error}/>}
          <div style={{ background:'#f59e0b15',border:'1px solid #f59e0b30',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#f59e0b' }}>
            ⚠️ Share the temporary password with the new member securely.
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={saving}>{saving?'Creating…':'Create Account'}</button>
            <button className="btn btn-ghost" onClick={()=>{setShowAdd(false);setError('')}}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editUser} onClose={()=>{setEditUser(null);setError('')}} title={`Edit — ${editUser?.name}`} width={480}>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div className="grid-2">
            <div style={{ gridColumn:'1/-1' }}><Label>Full Name *</Label><input value={form.name} onChange={e=>set('name',e.target.value)}/></div>
            <div><Label>Role *</Label>
              <select value={form.role} onChange={e=>set('role',e.target.value)}>
                {Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><Label>Department</Label><select value={form.dept} onChange={e=>set('dept',e.target.value)}><option value="">-- Select Dept --</option>{DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
            <div><Label>Reports To</Label>
              <select value={form.reportsTo} onChange={e=>set('reportsTo',e.target.value)}>
                <option value="">-- None --</option>
                {users.filter(u=>u.id!==editUser?.id&&['partner','hod','team_leader'].includes(u.role)).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div><Label>Initials</Label><input maxLength={2} value={form.init} onChange={e=>set('init',e.target.value.toUpperCase())}/></div>
            <div style={{ display:'flex',alignItems:'center',gap:8,paddingTop:20 }}>
              <label style={{ fontSize:12,color:'var(--text2)',display:'flex',alignItems:'center',gap:8,cursor:'pointer' }}>
                <input type="checkbox" checked={form.active!==false} onChange={e=>set('active',e.target.checked)}/>
                Account Active
              </label>
            </div>
          </div>
          {error && <Alert message={error}/>}
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={saveEdit} disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
            <button className="btn btn-ghost" onClick={()=>{setEditUser(null);setError('')}}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteUser} onClose={()=>setDeleteUser(null)} title="Deactivate Member?" width={400}>
        <div style={{ fontSize:13,color:'var(--text2)',marginBottom:16 }}>
          This will mark <strong style={{ color:'var(--text)' }}>{deleteUser?.name}</strong> as inactive. Their tasks and history will be preserved. You can reactivate them from Edit.
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn btn-primary" style={{ flex:1,background:'var(--danger)',borderColor:'var(--danger)' }}
            onClick={async()=>{
              await updateUser(deleteUser.id,{active:false})
              setSuccess(`${deleteUser.name} deactivated.`)
              setDeleteUser(null)
            }}>
            Deactivate
          </button>
          <button className="btn btn-ghost" onClick={()=>setDeleteUser(null)}>Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
