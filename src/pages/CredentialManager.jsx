import { useState, useEffect } from 'react'
import { CRED_SERVICES } from '../constants.js'
import { getClientCredentials, upsertCredential } from '../hooks/useFirestore.js'
import { Label, Alert, Avatar } from '../components/UI.jsx'

const EyeIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    }
  </svg>
)

const CredentialCard = ({ cred, onEdit }) => {
  const [showPwd, setShowPwd] = useState(false)
  const svc = CRED_SERVICES.find(s => s.v === cred.service)

  return (
    <div className="card" style={{ padding:'14px 16px',marginBottom:8 }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
        <span style={{ fontSize:18 }}>{svc?.icon||'🔑'}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--text)' }}>{svc?.l||cred.service}</div>
          {svc?.url && (
            <a href={svc.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:10,color:'var(--accent)',textDecoration:'none' }}>
              🔗 {svc.url.replace('https://','').replace('http://','').split('/')[0]}
            </a>
          )}
        </div>
        <button onClick={()=>onEdit(cred)}
          style={{ fontSize:11,color:'var(--accent)',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',padding:'4px 10px',fontWeight:600 }}>
          Edit
        </button>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
        <div>
          <div style={{ fontSize:10,color:'var(--text3)',marginBottom:2 }}>LOGIN ID</div>
          <div style={{ fontSize:12,color:'var(--text)',fontFamily:'var(--mono)',background:'var(--surface2)',borderRadius:5,padding:'4px 8px' }}>
            {cred.loginId||'—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10,color:'var(--text3)',marginBottom:2 }}>PASSWORD</div>
          <div style={{ fontSize:12,color:'var(--text)',fontFamily:'var(--mono)',background:'var(--surface2)',borderRadius:5,padding:'4px 8px',display:'flex',alignItems:'center',gap:6 }}>
            <span style={{ flex:1,letterSpacing:showPwd?0:2 }}>
              {showPwd ? (cred.password||'—') : (cred.password ? '••••••••' : '—')}
            </span>
            {cred.password && (
              <button onClick={()=>setShowPwd(v=>!v)}
                style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:0,display:'flex',alignItems:'center' }}>
                <EyeIcon open={showPwd}/>
              </button>
            )}
          </div>
        </div>
      </div>
      {cred.notes && (
        <div style={{ marginTop:8,fontSize:11,color:'var(--text3)',borderTop:'1px solid var(--border)',paddingTop:6 }}>
          📝 {cred.notes}
        </div>
      )}
      {cred.updatedAt && (
        <div style={{ fontSize:9,color:'var(--text3)',marginTop:6 }}>
          Updated {new Date(cred.updatedAt?.toDate?.() || cred.updatedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
        </div>
      )}
    </div>
  )
}

const CredentialForm = ({ clients, currentUser, editCred, prefillClientId, onDone }) => {
  const [clientId, setClientId]   = useState(editCred?.clientId || prefillClientId || '')
  const [service,  setService]    = useState(editCred?.service  || '')
  const [loginId,  setLoginId]    = useState(editCred?.loginId  || '')
  const [password, setPassword]   = useState(editCred?.password || '')
  const [notes,    setNotes]      = useState(editCred?.notes    || '')
  const [saving,   setSaving]     = useState(false)
  const [error,    setError]      = useState('')
  const [showPwd,  setShowPwd]    = useState(false)

  const submit = async () => {
    if (!clientId) { setError('Select a client.'); return }
    if (!service)  { setError('Select a service.'); return }
    setSaving(true); setError('')
    try {
      await upsertCredential(clientId, service, {
        loginId, password, notes,
        clientName: clients.find(c=>c.id===clientId)?.name||'',
        updatedBy: { id:currentUser.id, name:currentUser.name },
      })
      onDone()
    } catch(e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="card" style={{ padding:20,maxWidth:520 }}>
      <div style={{ fontWeight:700,fontSize:14,color:'var(--text)',marginBottom:16 }}>
        {editCred ? '✏️ Update Credential' : '+ Add / Update Credential'}
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        <div>
          <Label>Client *</Label>
          <select value={clientId} onChange={e=>setClientId(e.target.value)} disabled={!!prefillClientId}>
            <option value="">-- Select Client --</option>
            {[...clients].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>(
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Service / Portal *</Label>
          <select value={service} onChange={e=>setService(e.target.value)}>
            <option value="">-- Select Service --</option>
            {CRED_SERVICES.map(s=><option key={s.v} value={s.v}>{s.icon} {s.l}</option>)}
          </select>
        </div>
        {service && CRED_SERVICES.find(s=>s.v===service)?.url && (
          <div style={{ background:'var(--surface2)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'var(--text2)',display:'flex',alignItems:'center',gap:8 }}>
            🔗 Login URL:
            <a href={CRED_SERVICES.find(s=>s.v===service).url} target="_blank" rel="noopener noreferrer"
              style={{ color:'var(--accent)',textDecoration:'none',fontWeight:600 }}>
              {CRED_SERVICES.find(s=>s.v===service).url}
            </a>
          </div>
        )}
        <div>
          <Label>Login ID / Username</Label>
          <input placeholder="e.g. GSTIN, PAN, email" value={loginId} onChange={e=>setLoginId(e.target.value)}/>
        </div>
        <div>
          <Label>Password</Label>
          <div style={{ position:'relative' }}>
            <input
              type={showPwd?'text':'password'}
              placeholder="Enter password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              style={{ paddingRight:40 }}
            />
            <button onClick={()=>setShowPwd(v=>!v)}
              style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)',display:'flex',alignItems:'center' }}>
              <EyeIcon open={showPwd}/>
            </button>
          </div>
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <textarea placeholder="e.g. 2FA on mobile, recovery email..." value={notes} onChange={e=>setNotes(e.target.value)} rows={2} style={{ resize:'vertical' }}/>
        </div>
        {error && <Alert message={error}/>}
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Credential'}
          </button>
          <button className="btn btn-ghost" onClick={onDone}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export const CredentialManager = ({ clients, currentUser }) => {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [creds,            setCreds]            = useState([])
  const [loading,          setLoading]          = useState(false)
  const [showForm,         setShowForm]         = useState(false)
  const [editCred,         setEditCred]         = useState(null)
  const [search,           setSearch]           = useState('')

  useEffect(() => {
    if (!selectedClientId) { setCreds([]); return }
    setLoading(true)
    const unsub = getClientCredentials(selectedClientId, data => {
      setCreds(data); setLoading(false)
    })
    return unsub
  }, [selectedClientId])

  const selectedClient = clients.find(c=>c.id===selectedClientId)
  const filteredClients = search
    ? clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()))
    : clients

  const handleEdit = (cred) => { setEditCred(cred); setShowForm(true) }
  const handleDone = () => { setShowForm(false); setEditCred(null) }

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:960,display:'grid',gridTemplateColumns:'260px 1fr',gap:20 }}>
      {/* Left: client picker */}
      <div>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4 }}>🔐 Credential Manager</div>
        <div style={{ fontSize:12,color:'var(--text2)',marginBottom:16 }}>Select a client to view or update their portal credentials.</div>
        <input placeholder="🔍 Search clients…" value={search} onChange={e=>setSearch(e.target.value)} style={{ marginBottom:10 }}/>
        <div style={{ display:'flex',flexDirection:'column',gap:3,maxHeight:'calc(100vh - 240px)',overflow:'auto' }}>
          {[...filteredClients].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>(
            <button key={c.id} onClick={()=>{ setSelectedClientId(c.id); setShowForm(false); setEditCred(null) }}
              style={{ width:'100%',textAlign:'left',padding:'9px 12px',borderRadius:8,border:'none',cursor:'pointer',
                background:selectedClientId===c.id?'var(--surface3)':'transparent',
                color:selectedClientId===c.id?'var(--text)':'var(--text2)',
                fontWeight:selectedClientId===c.id?700:400,fontSize:12,
                borderLeft:selectedClientId===c.id?'2px solid var(--accent)':'2px solid transparent' }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Right: credentials panel */}
      <div>
        {!selectedClientId ? (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:300,color:'var(--text3)',flexDirection:'column',gap:12 }}>
            <span style={{ fontSize:40 }}>🔐</span>
            <div style={{ fontSize:14 }}>Select a client to manage credentials</div>
          </div>
        ) : showForm ? (
          <CredentialForm
            clients={clients}
            currentUser={currentUser}
            editCred={editCred}
            prefillClientId={selectedClientId}
            onDone={handleDone}
          />
        ) : (
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16,fontWeight:800,color:'var(--text)' }}>{selectedClient?.name}</div>
                <div style={{ fontSize:12,color:'var(--text3)' }}>{creds.length} credential{creds.length!==1?'s':''} stored</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={()=>{ setEditCred(null); setShowForm(true) }}>
                + Add Credential
              </button>
            </div>

            {loading && <div style={{ color:'var(--text3)',fontSize:13 }}>Loading…</div>}

            {!loading && creds.length===0 && (
              <div style={{ textAlign:'center',padding:40,color:'var(--text3)',background:'var(--surface2)',borderRadius:12,border:'1px dashed var(--border)' }}>
                <div style={{ fontSize:30,marginBottom:10 }}>🔑</div>
                <div style={{ fontSize:14,marginBottom:8 }}>No credentials stored yet</div>
                <button className="btn btn-primary btn-sm" onClick={()=>{ setEditCred(null); setShowForm(true) }}>
                  Add First Credential
                </button>
              </div>
            )}

            {creds.sort((a,b)=>a.service.localeCompare(b.service)).map(cred=>(
              <CredentialCard key={cred.id} cred={cred} onEdit={handleEdit}/>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
