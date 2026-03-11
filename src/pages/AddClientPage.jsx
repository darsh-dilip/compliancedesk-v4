import { useState } from 'react'
import { CONSTITUTIONS, CLIENT_CATEGORIES, ROLES, FINANCIAL_YEARS, CRED_SERVICES } from '../constants.js'
import { generateTasks } from '../utils/taskGenerator.js'
import { addClient, bulkAddTasks, upsertCredential } from '../hooks/useFirestore.js'
import { logClientOnboarded } from '../utils/auditLog.js'
import { Label, Alert } from '../components/UI.jsx'

const FY_START_MONTHS = [
  {v:'04',l:'April'},{v:'05',l:'May'},{v:'06',l:'June'},{v:'07',l:'July'},
  {v:'08',l:'August'},{v:'09',l:'September'},{v:'10',l:'October'},{v:'11',l:'November'},
  {v:'12',l:'December'},{v:'01',l:'January (next yr)'},{v:'02',l:'February (next yr)'},{v:'03',l:'March (next yr)'},
]

const FIRM_CONSTITUTIONS = ['Private Limited','Public Limited','LLP','Partnership Firm','HUF','Trust','Society']
const directorLabel = (constitution) =>
  ['Partnership Firm','LLP'].includes(constitution) ? 'Partner' : 'Director'

export const AddClientPage = ({ users, clients, currentUser, onBack, onSuccess }) => {
  const [form, setForm] = useState({
    name:'', constitution:'Private Limited', category:'A', phone:'', email:'',
    gstin:'', pan:'', tan:'',
    gstApplicable:false, gstFreq:'monthly', tdsApplicable:true,
    ptMH:false, ptKA:false, itApplicable:true, auditCase:false,
    advanceTax:true, accounting:true,
    assignedTo:'', fy:'2025-26', complianceStartMonth:'04',
  })
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [directors,setDirectors]= useState([])  // {name, includeITR}
  const [showCreds,setShowCreds]= useState(false)
  const [credRows, setCredRows] = useState([])  // {service, loginId, password, notes}

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const eligible = users.filter(u=>['team_leader','executive','intern'].includes(u.role))

  const fyS = parseInt(form.fy)
  const fyE = fyS + 1
  const monthNum = parseInt(form.complianceStartMonth)
  const startYear = monthNum >= 4 ? fyS : fyE
  const complianceStartYM = `${startYear}-${form.complianceStartMonth}`

  const dirITRCount = directors.filter(d => d.name.trim() && d.includeITR).length

  const taskCount = () => {
    let n = 0
    if(form.gstApplicable) n += form.gstFreq==='monthly' ? 37 : 13
    if(form.tdsApplicable) n += 20
    if(form.ptMH) n += 13
    if(form.ptKA) n += 2
    if(form.itApplicable) n += 1
    if(form.advanceTax) n += 4
    if(form.accounting) n += 1
    n += dirITRCount // one ITR task per director
    return n
  }

  const submit = async () => {
    if (!form.name.trim())    { setError('Client name is required.'); return }
    if (!form.phone.trim())   { setError('Phone number is required.'); return }
    if (!form.email.trim())   { setError('Email is required.'); return }
    if (!form.assignedTo)     { setError('Please assign to a team member.'); return }
    // Duplicate name check
    const duplicate = clients?.find(c => c.name.trim().toLowerCase() === form.name.trim().toLowerCase())
    if (duplicate) { setError(`A client named "${duplicate.name}" already exists.`); return }

    setSaving(true); setError('')
    try {
      const ref   = await addClient({ ...form, complianceStartYM })
      const tasks = generateTasks({ ...form, id:ref.id }, form.assignedTo, form.fy, complianceStartYM)
      await bulkAddTasks(tasks)

      // Optional credentials
      for (const cr of credRows) {
        if (cr.service && cr.loginId) {
          await upsertCredential(ref.id, cr.service, { loginId:cr.loginId, password:cr.password||'', notes:cr.notes||'' })
        }
      }

      // Directors/Partners — create individual client + ITR task per person
      const dLabel = directorLabel(form.constitution)
      for (const d of directors) {
        if (!d.name.trim() || !d.includeITR) continue
        const dirData = {
          name: d.name.trim(),
          constitution: 'Individual',
          category: form.category,
          phone:'', email:'', gstin:'', pan:'', tan:'',
          assignedTo: form.assignedTo,
          fy: form.fy, complianceStartMonth:'04',
          complianceStartYM: `${fyS}-04`,
          gstApplicable:false, tdsApplicable:false, ptMH:false, ptKA:false,
          itApplicable:true, auditCase:false, advanceTax:false, accounting:false,
          gstFreq:'monthly',
          linkedFirm: ref.id, linkedFirmName: form.name, linkedRole: dLabel,
        }
        const dirRef = await addClient(dirData)
        const ayLabel = `AY ${fyE}-${String(fyE+1).slice(2)}`
        await bulkAddTasks([{
          clientId: dirRef.id, clientName: d.name.trim(),
          service: 'Income Tax Filing', period: ayLabel,
          dueDate: `${fyE}-07-31`,
          assignedTo: form.assignedTo,
          status:'pending', statusNote:'', arn:'', ref:'',
          comments:[], history:[], fy: form.fy, periodYM:`${fyE}-04`,
          isAdhoc:false, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
        }])
      }

      if (currentUser) await logClientOnboarded({ ...form, id:ref.id }, currentUser)
      setSuccess(true)
      setTimeout(() => { onSuccess?.(); onBack() }, 1400)
    } catch(e) { setError(e.message) } finally { setSaving(false) }
  }

  const Toggle = ({ k, label }) => (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)' }}>
      <span style={{ fontSize:13,color:'var(--text)',fontWeight:500 }}>{label}</span>
      <label className="toggle"><input type="checkbox" checked={form[k]} onChange={e=>set(k,e.target.checked)}/><span className="slider"/></label>
    </div>
  )

  return (
    <div className="fade-up" style={{ padding:'24px 28px',maxWidth:1140 }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom:16 }}>← Back</button>
      <div style={{ fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:4 }}>Onboard New Client</div>
      <div style={{ fontSize:13,color:'var(--text2)',marginBottom:22 }}>Tasks for the selected period will be auto-created.</div>

      {success && <Alert type="success" message="✓ Client onboarded! Tasks created. Redirecting…"/>}

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,alignItems:'start' }}>

        {/* ══ LEFT COLUMN ══════════════════════════════════════ */}
        <div style={{ display:'flex',flexDirection:'column',gap:18 }}>

        {/* ── Basic Information ── */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:12 }}>📋 Basic Information</div>
          <div className="grid-2" style={{ gap:10 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <Label>Client / Business Name *</Label>
              <input placeholder="e.g. Sharma Enterprises Pvt Ltd" value={form.name} onChange={e=>set('name',e.target.value)}/>
            </div>
            <div><Label>Phone Number *</Label><input placeholder="+91 98765 43210" type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)}/></div>
            <div><Label>Email ID *</Label><input placeholder="contact@business.com" type="email" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
            <div>
              <Label>Constitution *</Label>
              <select value={form.constitution} onChange={e=>set('constitution',e.target.value)}>
                {CONSTITUTIONS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={e=>set('category',e.target.value)}>
                {CLIENT_CATEGORIES.map(c=><option key={c} value={c}>Category {c}</option>)}
              </select>
            </div>
            <div>
              <Label>Financial Year</Label>
              <select value={form.fy} onChange={e=>set('fy',e.target.value)}>
                {FINANCIAL_YEARS.map(f=><option key={f} value={f}>FY {f}</option>)}
              </select>
            </div>
            <div>
              <Label>Compliance Starts From</Label>
              <select value={form.complianceStartMonth} onChange={e=>set('complianceStartMonth',e.target.value)}>
                {FY_START_MONTHS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <Label>Assign To *</Label>
              <select value={form.assignedTo} onChange={e=>set('assignedTo',e.target.value)}>
                <option value="">-- Select Team Member --</option>
                {eligible.map(u=><option key={u.id} value={u.id}>{u.name} ({ROLES[u.role]})</option>)}
              </select>
            </div>
            <div><Label>GSTIN</Label><input placeholder="27AAAAA0000A1Z5" value={form.gstin} onChange={e=>set('gstin',e.target.value.toUpperCase())}/></div>
            <div><Label>PAN</Label><input placeholder="AAAAA0000A" value={form.pan} onChange={e=>set('pan',e.target.value.toUpperCase())}/></div>
            <div><Label>TAN</Label><input placeholder="ABCD01234E" value={form.tan} onChange={e=>set('tan',e.target.value.toUpperCase())}/></div>
          </div>
          {complianceStartYM && (
            <div style={{ marginTop:10,background:'#5b8dee15',borderRadius:8,padding:'8px 12px',fontSize:12,color:'var(--accent)' }}>
              📅 Tasks will be created from <strong>{complianceStartYM}</strong> onwards within FY {form.fy}
            </div>
          )}
        </div>

        {/* ── Compliance Package ── */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:12 }}>⚖️ Compliance Package</div>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            <Toggle k="gstApplicable" label="GST (GSTR-1, GSTR-2B Recon, GSTR-3B, GSTR-9)"/>
            {form.gstApplicable && (
              <div style={{ background:'var(--surface3)',borderRadius:8,padding:'10px 12px',border:'1px solid var(--border2)',marginTop:-2 }}>
                <Label>Filing Frequency</Label>
                <div style={{ display:'flex',gap:8,marginTop:4 }}>
                  {[['monthly','Monthly (11th)'],['quarterly','Quarterly QRMP (13th)']].map(([v,l])=>(
                    <button key={v} onClick={()=>set('gstFreq',v)} className={`btn btn-sm ${form.gstFreq===v?'btn-primary':'btn-ghost'}`}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            <Toggle k="tdsApplicable" label="TDS (Monthly Payments + Quarterly 24Q & 26Q Returns)"/>
            <Toggle k="ptMH"          label="PT Maharashtra (Monthly + Annual Return)"/>
            <Toggle k="ptKA"          label="PT Karnataka (Annual)"/>
            <Toggle k="itApplicable"  label="Income Tax Filing"/>
            {form.itApplicable && (
              <div style={{ background:'var(--surface3)',borderRadius:8,padding:'10px 12px',border:'1px solid var(--border2)',marginTop:-2,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <span style={{ fontSize:13,color:'var(--text)' }}>Audit Case? (due Oct 31)</span>
                <label className="toggle"><input type="checkbox" checked={form.auditCase} onChange={e=>set('auditCase',e.target.checked)}/><span className="slider"/></label>
              </div>
            )}
            <Toggle k="advanceTax" label="Advance Tax (Quarterly)"/>
            <Toggle k="accounting" label="Accounting (Single task — tracks monthly progress)"/>
          </div>
          <div style={{ marginTop:10,fontSize:11,color:'var(--text3)' }}>
            💡 CA Certification and other ad-hoc services can be added individually from the client detail page.
          </div>
        </div>

        </div>{/* end left column */}

        {/* ══ RIGHT COLUMN ═════════════════════════════════════ */}
        <div style={{ display:'flex',flexDirection:'column',gap:18 }}>

        {/* ── Directors / Partners ── */}
        {FIRM_CONSTITUTIONS.includes(form.constitution) && (
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:4 }}>
              👥 {directorLabel(form.constitution)}s
            </div>
            <div style={{ fontSize:11,color:'var(--text3)',marginBottom:12 }}>
              Add names to auto-create individual ITR clients (non-audit, due July 31).
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {directors.map((d,i) => (
                <div key={i} style={{ display:'grid',gridTemplateColumns:'1fr auto auto',gap:8,alignItems:'center',background:'var(--surface2)',borderRadius:8,padding:'10px 12px',border:'1px solid var(--border)' }}>
                  <input
                    placeholder={`${directorLabel(form.constitution)} ${i+1} — full name`}
                    value={d.name}
                    onChange={e=>{ const n=[...directors]; n[i]={...n[i],name:e.target.value}; setDirectors(n) }}
                  />
                  <label style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:'var(--text2)',whiteSpace:'nowrap' }}>
                    <input type="checkbox" checked={d.includeITR}
                      onChange={e=>{ const n=[...directors]; n[i]={...n[i],includeITR:e.target.checked}; setDirectors(n) }}/>
                    Include ITR
                  </label>
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                    onClick={()=>setDirectors(directors.filter((_,j)=>j!==i))}>✕</button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start' }}
                onClick={()=>setDirectors([...directors,{name:'',includeITR:false}])}>
                + Add {directorLabel(form.constitution)}
              </button>
              {dirITRCount > 0 && (
                <div style={{ fontSize:12,color:'var(--accent)',background:'#5b8dee12',borderRadius:6,padding:'6px 10px' }}>
                  ✓ {dirITRCount} individual ITR client{dirITRCount>1?'s':''} will be created
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Optional Credentials ── */}
        <div className="card" style={{ padding:18 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer' }}
            onClick={()=>setShowCreds(v=>!v)}>
            <div style={{ fontWeight:700,fontSize:13,color:'var(--text)' }}>🔐 Portal Credentials</div>
            <span style={{ fontSize:11,color:'var(--accent)',background:'var(--surface2)',padding:'2px 8px',borderRadius:10,marginLeft:4 }}>Optional</span>
            <span style={{ marginLeft:'auto',color:'var(--text3)',fontSize:12 }}>{showCreds?'▲':'▼'}</span>
          </div>
          {showCreds && (
            <div style={{ marginTop:14,display:'flex',flexDirection:'column',gap:10 }}>
              {credRows.map((cr,i) => (
                <div key={i} style={{ display:'grid',gridTemplateColumns:'160px 1fr 1fr 1fr auto',gap:8,alignItems:'end' }}>
                  <div>
                    <Label>Portal</Label>
                    <select value={cr.service} onChange={e=>{ const n=[...credRows]; n[i]={...n[i],service:e.target.value}; setCredRows(n) }}>
                      <option value="">-- Select --</option>
                      {CRED_SERVICES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </div>
                  <div><Label>Login ID</Label><input value={cr.loginId} onChange={e=>{ const n=[...credRows]; n[i]={...n[i],loginId:e.target.value}; setCredRows(n) }} placeholder="username or email"/></div>
                  <div><Label>Password</Label><input value={cr.password} onChange={e=>{ const n=[...credRows]; n[i]={...n[i],password:e.target.value}; setCredRows(n) }} placeholder="password"/></div>
                  <div><Label>Notes</Label><input value={cr.notes} onChange={e=>{ const n=[...credRows]; n[i]={...n[i],notes:e.target.value}; setCredRows(n) }} placeholder="e.g. OTP on mobile"/></div>
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)',alignSelf:'flex-end',paddingBottom:6 }}
                    onClick={()=>setCredRows(credRows.filter((_,j)=>j!==i))}>✕</button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start',marginTop:4 }}
                onClick={()=>setCredRows([...credRows,{service:'',loginId:'',password:'',notes:''}])}>
                + Add Portal
              </button>
            </div>
          )}
        </div>

        </div>{/* end right column */}

      </div>{/* end 2-col grid */}

      {/* ══ FULL WIDTH BOTTOM ════════════════════════════════ */}
      <div style={{ display:'flex',flexDirection:'column',gap:14,marginTop:18 }}>

        {/* ── Task preview ── */}
        {taskCount() > 0 && (
          <div style={{ background:'#5b8dee15',border:'1px solid #5b8dee30',borderRadius:10,padding:'12px 16px' }}>
            <div style={{ fontSize:13,color:'var(--accent)',fontWeight:700 }}>✓ Preview</div>
            <div style={{ fontSize:12,color:'var(--text2)',marginTop:4 }}>
              ~<strong style={{ color:'var(--text)' }}>{taskCount()} tasks</strong> will be created for FY {form.fy}
              {form.assignedTo && ` · assigned to ${users.find(u=>u.id===form.assignedTo)?.name}`}
              {dirITRCount > 0 && ` · +${dirITRCount} individual ITR`}
            </div>
          </div>
        )}

        {error && <Alert message={error}/>}

        <div style={{ display:'flex',gap:10 }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={saving||success}>
            {saving ? 'Creating…' : '🚀 Onboard Client & Create Tasks'}
          </button>
          <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
        </div>

      </div>{/* end bottom section */}
    </div>
  )
}
