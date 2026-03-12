import { useState } from 'react'
import { ROLES, ROLE_CLR } from '../constants.js'
import { updateUser } from '../hooks/useFirestore.js'
import { Avatar, Label, Alert } from '../components/UI.jsx'

const HOBBIES_LIST = ['Reading','Cricket','Football','Chess','Cooking','Travelling','Music','Photography','Gaming','Yoga','Cycling','Movies','Trekking','Painting','Coding']

export const ProfilePage = ({ currentUser, onUpdated, onBack, memberMeta={} }) => {
  const [form, setForm] = useState({
    name:     currentUser.name     || '',
    nickname: currentUser.nickname || '',
    phone:    currentUser.phone    || '',
    bio:      currentUser.bio      || '',
    hobbies:  currentUser.hobbies  || [],
    funFact:        currentUser.funFact        || '',
    favFood:        currentUser.favFood        || '',
    birthDate:      currentUser.birthDate      || '',
    maritalStatus:  currentUser.maritalStatus  || 'single',
    anniversaryDate:currentUser.anniversaryDate|| '',
  })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const toggleHobby = (h) => {
    set('hobbies', form.hobbies.includes(h)
      ? form.hobbies.filter(x=>x!==h)
      : [...form.hobbies, h]
    )
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Name cannot be empty.'); return }
    setSaving(true); setError('')
    try {
      await updateUser(currentUser.id, {
        name:     form.name,
        nickname: form.nickname,
        phone:    form.phone,
        bio:      form.bio,
        hobbies:         form.hobbies,
        funFact:         form.funFact,
        favFood:         form.favFood,
        birthDate:       form.birthDate,
        maritalStatus:   form.maritalStatus,
        anniversaryDate: form.maritalStatus==='married'?form.anniversaryDate:'',
      })
      setSuccess(true)
      setTimeout(()=>setSuccess(false), 2000)
      onUpdated?.()
    } catch(e) { setError(e.message) } finally { setSaving(false) }
  }

  const roleColor = ROLE_CLR[currentUser.role]

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:960 }}>
      {/* Page header */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20 }}>
        <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',flex:1 }}>My Profile</div>
        {onBack && (
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back to Dashboard</button>
        )}
      </div>

      {/* Profile banner */}
      <div style={{ background:'var(--surface2)',borderRadius:16,padding:'24px',marginBottom:20,display:'flex',gap:20,alignItems:'center',border:'1px solid var(--border)',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${roleColor},${roleColor}80)` }}/>
        <Avatar name={form.name} init={currentUser.init} role={currentUser.role} sz={64} rank={memberMeta[currentUser.id]?.rank} streak={memberMeta[currentUser.id]?.streak}/>
        <div>
          <div style={{ fontSize:22,fontWeight:800,color:'var(--text)' }}>
            {form.name}
          </div>
          {form.nickname && (
            <div style={{ fontSize:13,color:'var(--text3)',marginTop:1 }}>"{form.nickname}"</div>
          )}
          <div style={{ display:'flex',alignItems:'center',gap:10,marginTop:4 }}>
            <span style={{ fontSize:12,fontWeight:700,color:roleColor,background:`${roleColor}15`,padding:'2px 10px',borderRadius:20 }}>
              {ROLES[currentUser.role]}
            </span>
            {currentUser.email && (
              <span style={{ fontSize:12,color:'var(--text3)' }}>· {currentUser.email}</span>
            )}
            {memberMeta[currentUser.id]?.rank===1&&<span style={{ fontSize:12,fontWeight:700,color:'#f59e0b' }}>👑 #1 Overall</span>}
            {memberMeta[currentUser.id]?.rank===2&&<span style={{ fontSize:12,fontWeight:700,color:'#94a3b8' }}>🥈 #2 Overall</span>}
            {memberMeta[currentUser.id]?.rank===3&&<span style={{ fontSize:12,fontWeight:700,color:'#cd7f32' }}>🥉 #3 Overall</span>}
            {memberMeta[currentUser.id]?.streak&&<span style={{ fontSize:12,fontWeight:700,color:'#f59e0b' }}>🔥 3-Day Streak!</span>}
          </div>
          {form.bio && (
            <div style={{ fontSize:13,color:'var(--text2)',marginTop:8,fontStyle:'italic' }}>"{form.bio}"</div>
          )}
        </div>
      </div>

      {success && <Alert type="success" message="✓ Profile updated!"/>}

      {/* Two-column grid */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>

        {/* Col 1: Basic info */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:14 }}>👤 Basic Info</div>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <Label>Full Name *</Label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Your full name"/>
            </div>
            <div>
              <Label>Nickname / What colleagues call you</Label>
              <input value={form.nickname} onChange={e=>set('nickname',e.target.value)} placeholder="e.g. DD, Darsh, Boss"/>
            </div>
            <div>
              <Label>Phone Number</Label>
              <input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+91 98765 43210" type="tel"/>
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <input type="date" value={form.birthDate} onChange={e=>set('birthDate',e.target.value)}
                style={{ colorScheme:'dark' }}/>
              {!form.birthDate&&<div style={{ fontSize:11,color:'#f59e0b',marginTop:3 }}>⚠ Required — please fill your date of birth</div>}
            </div>
            <div>
              <Label>Marital Status</Label>
              <div style={{ display:'flex',gap:8,marginTop:4 }}>
                {[['single','💍 Single'],['married','💑 Married']].map(([v,l])=>(
                  <button key={v} onClick={()=>set('maritalStatus',v)}
                    style={{ flex:1,padding:'8px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                      background:form.maritalStatus===v?'var(--accent)':'var(--surface2)',
                      color:form.maritalStatus===v?'#fff':'var(--text2)',
                      border:`1px solid ${form.maritalStatus===v?'var(--accent)':'var(--border)'}` }}>{l}</button>
                ))}
              </div>
            </div>
            {form.maritalStatus==='married'&&(
              <div>
                <Label>Wedding Anniversary Date</Label>
                <input type="date" value={form.anniversaryDate} onChange={e=>set('anniversaryDate',e.target.value)}
                  style={{ colorScheme:'dark' }}/>
              </div>
            )}
            <div>
              <Label>Bio / One-liner about yourself</Label>
              <input value={form.bio} onChange={e=>set('bio',e.target.value)} placeholder="e.g. CA passionate about making compliance easy"/>
            </div>
          </div>
        </div>

        {/* Col 2: Fun stuff */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:14 }}>🎉 The Fun Stuff</div>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <Label>Hobbies & Interests</Label>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginTop:6 }}>
                {HOBBIES_LIST.map(h=>(
                  <button key={h} onClick={()=>toggleHobby(h)}
                    style={{ padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',transition:'all .15s',
                      background:form.hobbies.includes(h)?'var(--accent)':'var(--surface2)',
                      color:form.hobbies.includes(h)?'#fff':'var(--text2)',
                      border:`1px solid ${form.hobbies.includes(h)?'var(--accent)':'var(--border)'}` }}>
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>🤫 Fun Fact about you</Label>
              <input value={form.funFact} onChange={e=>set('funFact',e.target.value)} placeholder="e.g. I can solve a Rubik's cube in 2 minutes"/>
            </div>
            <div>
              <Label>🍽️ Favourite Food</Label>
              <input value={form.favFood} onChange={e=>set('favFood',e.target.value)} placeholder="e.g. Pani Puri, Biryani…"/>
            </div>
          </div>
        </div>
      </div>

      {/* Read-only info — full width */}
      <div className="card" style={{ padding:18,marginBottom:16 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:14 }}>🔒 Account Info (read-only)</div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
          {[
            { l:'Email',    v:currentUser.email },
            { l:'Role',     v:ROLES[currentUser.role] },
            { l:'Initials', v:currentUser.init },
          ].map(x=>(
            <div key={x.l}>
              <Label>{x.l}</Label>
              <div style={{ fontSize:13,color:'var(--text2)',background:'var(--surface2)',borderRadius:7,padding:'8px 12px' }}>
                {x.v||'—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <Alert message={error}/>}

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ minWidth:160 }}>
        {saving ? 'Saving…' : '💾 Save Profile'}
      </button>
    </div>
  )
}
