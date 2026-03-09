import { useState } from 'react'
import { ROLES, ROLE_CLR } from '../constants.js'
import { updateUser } from '../hooks/useFirestore.js'
import { Avatar } from '../components/UI.jsx'
import { Label, Alert } from '../components/UI.jsx'

const HOBBIES_LIST = ['Reading','Cricket','Football','Chess','Cooking','Travelling','Music','Photography','Gaming','Yoga','Cycling','Movies','Trekking','Painting','Coding']

export const ProfilePage = ({ currentUser, onUpdated }) => {
  const [form, setForm] = useState({
    name:     currentUser.name     || '',
    nickname: currentUser.nickname || '',
    phone:    currentUser.phone    || '',
    bio:      currentUser.bio      || '',
    hobbies:  currentUser.hobbies  || [],
    funFact:  currentUser.funFact  || '',
    favFood:  currentUser.favFood  || '',
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
        hobbies:  form.hobbies,
        funFact:  form.funFact,
        favFood:  form.favFood,
      })
      setSuccess(true)
      setTimeout(()=>setSuccess(false), 2000)
      onUpdated?.()
    } catch(e) { setError(e.message) } finally { setSaving(false) }
  }

  const roleColor = ROLE_CLR[currentUser.role]

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:680 }}>
      <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:20 }}>My Profile</div>

      {/* Profile card header */}
      <div style={{ background:'var(--surface2)',borderRadius:16,padding:'24px',marginBottom:24,display:'flex',gap:20,alignItems:'center',border:'1px solid var(--border)',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${roleColor},${roleColor}80)` }}/>
        <Avatar name={form.name} init={currentUser.init} role={currentUser.role} sz={64}/>
        <div>
          <div style={{ fontSize:22,fontWeight:800,color:'var(--text)' }}>
            {form.nickname || form.name}
          </div>
          {form.nickname && <div style={{ fontSize:13,color:'var(--text3)' }}>{form.name}</div>}
          <div style={{ display:'flex',alignItems:'center',gap:10,marginTop:4 }}>
            <span style={{ fontSize:12,fontWeight:700,color:roleColor,background:`${roleColor}15`,padding:'2px 10px',borderRadius:20 }}>{ROLES[currentUser.role]}</span>
            {currentUser.email && <span style={{ fontSize:12,color:'var(--text3)' }}>· {currentUser.email}</span>}
          </div>
          {form.bio && <div style={{ fontSize:13,color:'var(--text2)',marginTop:8,fontStyle:'italic' }}>"{form.bio}"</div>}
        </div>
      </div>

      {success && <Alert type="success" message="✓ Profile updated!"/>}

      <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
        {/* Basic info */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:14 }}>👤 Basic Info</div>
          <div className="grid-2" style={{ gap:12 }}>
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
            <div style={{ gridColumn:'1/-1' }}>
              <Label>Bio / One-liner about yourself</Label>
              <input value={form.bio} onChange={e=>set('bio',e.target.value)} placeholder="e.g. CA passionate about making compliance easy"/>
            </div>
          </div>
        </div>

        {/* Fun section */}
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

        {/* Read-only info */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:14 }}>🔒 Account Info (read-only)</div>
          <div className="grid-2" style={{ gap:10 }}>
            {[
              { l:'Email', v:currentUser.email },
              { l:'Role',  v:ROLES[currentUser.role] },
              { l:'Initials', v:currentUser.init },
            ].map(x=>(
              <div key={x.l}>
                <Label>{x.l}</Label>
                <div style={{ fontSize:13,color:'var(--text2)',background:'var(--surface2)',borderRadius:7,padding:'8px 12px' }}>{x.v||'—'}</div>
              </div>
            ))}
          </div>
        </div>

        {error && <Alert message={error}/>}

        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ alignSelf:'flex-start',minWidth:160 }}>
          {saving ? 'Saving…' : '💾 Save Profile'}
        </button>
      </div>
    </div>
  )
}
