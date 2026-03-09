import { useState } from 'react'
import { Alert } from '../components/UI.jsx'

export const LoginPage = ({ onLogin }) => {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async () => {
    if (!email||!password) { setError('Please enter email and password.'); return }
    setLoading(true); setError('')
    try { await onLogin(email, password) }
    catch(err) {
      const m = {
        'auth/user-not-found':'No account found.',
        'auth/wrong-password':'Incorrect password.',
        'auth/invalid-email':'Invalid email address.',
        'auth/invalid-credential':'Incorrect email or password.',
        'auth/too-many-requests':'Too many attempts. Try later.',
      }
      setError(m[err.code]||'Login failed. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div className="fade-up" style={{ width:'100%',maxWidth:400,padding:20 }}>
        <div style={{ textAlign:'center',marginBottom:36 }}>
          <div style={{ fontSize:40,marginBottom:10 }}>⚖️</div>
          <div style={{ fontSize:28,fontWeight:800,color:'var(--text)',letterSpacing:'-0.5px' }}>ComplianceDesk</div>
          <div style={{ fontSize:13,color:'var(--text2)',marginTop:6 }}>CA Firm Task &amp; Compliance Manager</div>
        </div>
        <div className="card" style={{ padding:28 }}>
          <div style={{ fontWeight:700,fontSize:16,color:'var(--text)',marginBottom:20 }}>Sign In</div>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div>
              <div style={{ fontSize:12,color:'var(--text2)',marginBottom:6,fontWeight:600 }}>Email</div>
              <input
                type="email" name="email" autoComplete="username"
                placeholder="you@yourfirm.com" value={email}
                onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&submit()} autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize:12,color:'var(--text2)',marginBottom:6,fontWeight:600 }}>Password</div>
              <div style={{ position:'relative' }}>
                <input
                  type={showPwd?'text':'password'} name="password"
                  autoComplete="current-password"
                  placeholder="••••••••" value={password}
                  onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&submit()}
                  style={{ paddingRight:40 }}
                />
                <button
                  onClick={()=>setShowPwd(!showPwd)}
                  style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:16,padding:4 }}
                  tabIndex={-1} type="button"
                >{showPwd?'🙈':'👁'}</button>
              </div>
            </div>
            {error && <Alert message={error}/>}
            <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center',marginTop:4 }} onClick={submit} disabled={loading}>
              {loading?'Signing in…':'Sign In →'}
            </button>
          </div>
        </div>
        <div style={{ textAlign:'center',marginTop:16,fontSize:12,color:'var(--text3)' }}>New members: ask your Partner/Admin to create your account.</div>
      </div>
    </div>
  )
}
