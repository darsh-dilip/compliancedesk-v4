import { useState, useEffect } from 'react'
import { CRED_SERVICES } from '../constants.js'
import { getClientCredentials, upsertCredential } from '../hooks/useFirestore.js'
import { Label, Alert } from '../components/UI.jsx'
import { ROLES, ROLE_CLR } from '../constants.js'

const EyeIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    }
  </svg>
)
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

const BulkEditModal = ({ clients, currentUser, initialClientId, onClose }) => {
  const [clientId, setClientId]  = useState(initialClientId || '')
  const [rows,     setRows]      = useState(
    CRED_SERVICES.map(s => ({ service:s.v, loginId:'', password:'', notes:'', enabled:false }))
  )
  const [creds,    setCreds]     = useState([])
  const [saving,   setSaving]    = useState(false)
  const [success,  setSuccess]   = useState('')
  const [showPwds, setShowPwds]  = useState({})

  useEffect(()=>{
    if (!clientId) return
    const unsub = getClientCredentials(clientId, data=>{
      setCreds(data)
      setRows(CRED_SERVICES.map(s=>{
        const existing = data.find(c=>c.service===s.v)
        return { service:s.v, loginId:existing?.loginId||'', password:existing?.password||'', notes:existing?.notes||'', enabled:!!existing }
      }))
    })
    return unsub
  }, [clientId])

  const save = async () => {
    if (!clientId) return
    setSaving(true)
    const toSave = rows.filter(r=>r.enabled)
    for (const r of toSave) {
      await upsertCredential(clientId, r.service, {
        loginId: r.loginId, password: r.password, notes: r.notes,
        clientName: clients.find(c=>c.id===clientId)?.name||'',
        updatedBy: { id:currentUser.id, name:currentUser.name },
      })
    }
    setSuccess(`✓ ${toSave.length} credential(s) saved.`)
    setSaving(false)
    setTimeout(()=>{ setSuccess(''); onClose() }, 1200)
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div style={{ background:'var(--surface)',borderRadius:14,border:'1px solid var(--border)',width:'100%',maxWidth:780,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'18px 22px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ fontWeight:800,fontSize:15,color:'var(--text)' }}>Bulk Update Credentials</div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:18 }}>×</button>
        </div>
        <div style={{ padding:'16px 22px',borderBottom:'1px solid var(--border)' }}>
          <Label>Client</Label>
          <select value={clientId} onChange={e=>setClientId(e.target.value)} style={{ maxWidth:320 }}>
            <option value="">-- Select Client --</option>
            {[...clients].sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ overflow:'auto',flex:1,padding:'0 22px' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                <th style={{ padding:'10px 8px',textAlign:'left',color:'var(--text3)',fontWeight:600,width:28 }}></th>
                <th style={{ padding:'10px 8px',textAlign:'left',color:'var(--text3)',fontWeight:600 }}>Portal</th>
                <th style={{ padding:'10px 8px',textAlign:'left',color:'var(--text3)',fontWeight:600 }}>Login ID</th>
                <th style={{ padding:'10px 8px',textAlign:'left',color:'var(--text3)',fontWeight:600 }}>Password</th>
                <th style={{ padding:'10px 8px',textAlign:'left',color:'var(--text3)',fontWeight:600 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row,i)=>{
                const svc = CRED_SERVICES.find(s=>s.v===row.service)
                return (
                  <tr key={row.service} style={{ borderBottom:'1px solid var(--border2)',opacity:row.enabled?1:.5 }}>
                    <td style={{ padding:'8px 8px' }}>
                      <input type="checkbox" checked={row.enabled}
                        onChange={e=>setRows(r=>r.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x))}/>
                    </td>
                    <td style={{ padding:'8px 8px' }}>
                      <div style={{ fontWeight:600,color:'var(--text)' }}>{svc?.icon} {svc?.l}</div>
                      {svc?.url&&<a href={svc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:10,color:'var(--accent)',textDecoration:'none' }}>{svc.url.split('/')[2]}</a>}
                    </td>
                    <td style={{ padding:'8px 8px' }}>
                      <input value={row.loginId} disabled={!row.enabled}
                        onChange={e=>setRows(r=>r.map((x,j)=>j===i?{...x,loginId:e.target.value}:x))}
                        style={{ fontSize:11,padding:'4px 8px',width:'100%' }} placeholder="Login ID"/>
                    </td>
                    <td style={{ padding:'8px 8px' }}>
                      <input type={showPwds[i]?'text':'password'} value={row.password} disabled={!row.enabled}
                        onChange={e=>setRows(r=>r.map((x,j)=>j===i?{...x,password:e.target.value}:x))}
                        style={{ fontSize:11,padding:'4px 8px',width:'100%' }} placeholder="Password"/>
                    </td>
                    <td style={{ padding:'8px 8px' }}>
                      <input value={row.notes} disabled={!row.enabled}
                        onChange={e=>setRows(r=>r.map((x,j)=>j===i?{...x,notes:e.target.value}:x))}
                        style={{ fontSize:11,padding:'4px 8px',width:'100%' }} placeholder="Notes"/>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {success && <div style={{ padding:'10px 22px' }}><Alert type="success" message={success}/></div>}
        <div style={{ padding:'14px 22px',borderTop:'1px solid var(--border)',display:'flex',gap:8 }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={save} disabled={saving||!clientId}>
            {saving?'Saving…':'💾 Save Checked Credentials'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const CredForm = ({ clients, currentUser, editCred, prefillClientId, onDone }) => {
  const [clientId, setClientId] = useState(editCred?.clientId || prefillClientId || '')
  const [service,  setService]  = useState(editCred?.service  || '')
  const [loginId,  setLoginId]  = useState(editCred?.loginId  || '')
  const [password, setPassword] = useState(editCred?.password || '')
  const [notes,    setNotes]    = useState(editCred?.notes    || '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

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
        {editCred ? '✏️ Update Credential' : '+ Add Credential'}
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        <div>
          <Label>Client *</Label>
          <select value={clientId} onChange={e=>setClientId(e.target.value)} disabled={!!prefillClientId}>
            <option value="">-- Select Client --</option>
            {[...clients].sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
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
          <div style={{ background:'var(--surface2)',borderRadius:8,padding:'7px 12px',fontSize:12,color:'var(--text2)' }}>
            🔗 <a href={CRED_SERVICES.find(s=>s.v===service).url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)',textDecoration:'none' }}>
              {CRED_SERVICES.find(s=>s.v===service).url}
            </a>
          </div>
        )}
        <div>
          <Label>Login ID</Label>
          <input placeholder="e.g. GSTIN, PAN, email" value={loginId} onChange={e=>setLoginId(e.target.value)}/>
        </div>
        <div>
          <Label>Password</Label>
          <div style={{ position:'relative' }}>
            <input type={showPwd?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} style={{ paddingRight:40 }}/>
            <button onClick={()=>setShowPwd(v=>!v)}
              style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)',display:'flex',alignItems:'center' }}>
              <EyeIcon open={showPwd}/>
            </button>
          </div>
        </div>
        <div><Label>Notes</Label><textarea placeholder="e.g. 2FA on mobile" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} style={{ resize:'vertical' }}/></div>
        {error && <Alert message={error}/>}
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={saving}>{saving?'Saving…':'💾 Save'}</button>
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
  const [showBulk,         setShowBulk]         = useState(false)
  const [search,           setSearch]           = useState('')
  const [showPwds,         setShowPwds]         = useState({})
  const [copied,           setCopied]           = useState('')

  useEffect(()=>{
    if (!selectedClientId) { setCreds([]); return }
    setLoading(true)
    const unsub = getClientCredentials(selectedClientId, data=>{ setCreds(data); setLoading(false) })
    return unsub
  }, [selectedClientId])

  const selectedClient = clients.find(c=>c.id===selectedClientId)
  const filteredClients = search
    ? clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()))
    : clients

  const copyOne = (cred) => {
    const svc = CRED_SERVICES.find(s=>s.v===cred.service)
    const msg = `Portal: ${svc?.l||cred.service}\nLink: ${svc?.url||'N/A'}\nID: ${cred.loginId||'—'}\nPass: ${cred.password||'—'}`
    navigator.clipboard.writeText(msg)
    setCopied(cred.id); setTimeout(()=>setCopied(''), 1500)
  }

  const copyAll = () => {
    if (!creds.length) return
    const msg = creds.map(c=>{
      const svc = CRED_SERVICES.find(s=>s.v===c.service)
      return `Portal: ${svc?.l||c.service}\nLink: ${svc?.url||'N/A'}\nID: ${c.loginId||'—'}\nPass: ${c.password||'—'}`
    }).join('\n\n')
    navigator.clipboard.writeText(msg)
    setCopied('all'); setTimeout(()=>setCopied(''), 1500)
  }

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:1100,display:'grid',gridTemplateColumns:'240px 1fr',gap:20 }}>
      {showBulk && <BulkEditModal clients={clients} currentUser={currentUser} initialClientId={selectedClientId} onClose={()=>setShowBulk(false)}/>}

      {/* Left: client picker */}
      <div>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4 }}>🔐 Credential Manager</div>
        <div style={{ fontSize:12,color:'var(--text2)',marginBottom:12 }}>Select a client to view or update credentials.</div>
        <input placeholder="🔍 Search clients…" value={search} onChange={e=>setSearch(e.target.value)} style={{ marginBottom:10 }}/>
        <div style={{ display:'flex',flexDirection:'column',gap:2,maxHeight:'calc(100vh - 240px)',overflow:'auto' }}>
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

      {/* Right */}
      {!selectedClientId ? (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:300,color:'var(--text3)',flexDirection:'column',gap:12 }}>
          <span style={{ fontSize:40 }}>🔐</span>
          <div style={{ fontSize:14 }}>Select a client to manage credentials</div>
          <button className="btn btn-primary btn-sm" onClick={()=>setShowBulk(true)}>🗂 Bulk Update All Clients</button>
        </div>
      ) : showForm ? (
        <CredForm clients={clients} currentUser={currentUser} editCred={editCred} prefillClientId={selectedClientId}
          onDone={()=>{ setShowForm(false); setEditCred(null) }}/>
      ) : (
        <div>
          {/* Header */}
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16,fontWeight:800,color:'var(--text)' }}>{selectedClient?.name}</div>
              <div style={{ fontSize:12,color:'var(--text3)' }}>{creds.length} credential{creds.length!==1?'s':''} stored</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={copyAll} style={{ fontSize:11 }}>
              {copied==='all'?'✓ Copied!':'📋 Copy All'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowBulk(true)} style={{ fontSize:11 }}>⚡ Bulk Update</button>
            <button className="btn btn-primary btn-sm" onClick={()=>{ setEditCred(null); setShowForm(true) }}>+ Add</button>
          </div>

          {loading && <div style={{ color:'var(--text3)',fontSize:13 }}>Loading…</div>}

          {!loading && creds.length===0 && (
            <div style={{ textAlign:'center',padding:40,color:'var(--text3)',background:'var(--surface2)',borderRadius:12,border:'1px dashed var(--border)' }}>
              <div style={{ fontSize:30,marginBottom:10 }}>🔑</div>
              <div style={{ fontSize:14,marginBottom:8 }}>No credentials stored yet</div>
              <button className="btn btn-primary btn-sm" onClick={()=>{ setEditCred(null); setShowForm(true) }}>Add First Credential</button>
            </div>
          )}

          {/* Table */}
          {creds.length > 0 && (
            <div style={{ background:'var(--surface)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                <thead>
                  <tr style={{ background:'var(--surface2)',borderBottom:'1px solid var(--border)' }}>
                    {['Portal','Link','Login ID','Password','Notes','Updated',''].map(h=>(
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:700,color:'var(--text3)',fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {creds.sort((a,b)=>a.service.localeCompare(b.service)).map(cred=>{
                    const svc = CRED_SERVICES.find(s=>s.v===cred.service)
                    const showPwd = showPwds[cred.id]
                    return (
                      <tr key={cred.id} style={{ borderBottom:'1px solid var(--border2)' }}>
                        <td style={{ padding:'10px 14px',fontWeight:700,color:'var(--text)' }}>
                          {svc?.icon} {svc?.l||cred.service}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          {svc?.url
                            ? <a href={svc.url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)',textDecoration:'none',fontSize:11 }}>🔗 Open</a>
                            : <span style={{ color:'var(--text3)' }}>—</span>
                          }
                        </td>
                        <td style={{ padding:'10px 14px',fontFamily:'var(--mono)',color:'var(--text)' }}>
                          {cred.loginId||'—'}
                        </td>
                        <td style={{ padding:'10px 14px',fontFamily:'var(--mono)' }}>
                          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                            <span style={{ color:'var(--text)',letterSpacing:showPwd?0:1 }}>
                              {showPwd?(cred.password||'—'):(cred.password?'••••••••':'—')}
                            </span>
                            {cred.password&&(
                              <button onClick={()=>setShowPwds(p=>({...p,[cred.id]:!p[cred.id]}))}
                                style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:0,display:'flex' }}>
                                <EyeIcon open={showPwd}/>
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding:'10px 14px',color:'var(--text3)',fontSize:11,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                          {cred.notes||'—'}
                        </td>
                        <td style={{ padding:'10px 14px',color:'var(--text3)',fontSize:10,whiteSpace:'nowrap' }}>
                          {cred.updatedAt ? new Date(cred.updatedAt?.toDate?.() || cred.updatedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}
                        </td>
                        <td style={{ padding:'10px 10px' }}>
                          <div style={{ display:'flex',gap:5 }}>
                            <button onClick={()=>copyOne(cred)} title="Copy credentials"
                              style={{ background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11,color:copied===cred.id?'var(--success)':'var(--text2)',display:'flex',alignItems:'center',gap:4 }}>
                              <CopyIcon/>{copied===cred.id?'✓':''}
                            </button>
                            <button onClick={()=>{ setEditCred(cred); setShowForm(true) }}
                              style={{ background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11,color:'var(--text2)' }}>
                              ✏️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
