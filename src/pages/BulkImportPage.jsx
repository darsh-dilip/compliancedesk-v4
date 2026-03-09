import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { CONSTITUTIONS, CLIENT_CATEGORIES, FINANCIAL_YEARS, ROLES } from '../constants.js'
import { generateTasks } from '../utils/taskGenerator.js'
import { addClient, bulkAddTasks } from '../hooks/useFirestore.js'
import { Alert } from '../components/UI.jsx'

// ── Template column definitions ──────────────────────────────────────────
const COLS = [
  { k:'name',           h:'Client Name *',       eg:'Sharma Enterprises Pvt Ltd' },
  { k:'constitution',   h:'Constitution *',       eg:'Private Limited' },
  { k:'category',       h:'Category (A+/A/B/C/D)',eg:'A' },
  { k:'phone',          h:'Phone',                eg:'9876543210' },
  { k:'email',          h:'Email',                eg:'ca@firm.com' },
  { k:'gstin',          h:'GSTIN',                eg:'27AAAAA0000A1Z5' },
  { k:'pan',            h:'PAN',                  eg:'AAAAA0000A' },
  { k:'tan',            h:'TAN',                  eg:'ABCD01234E' },
  { k:'gst',            h:'GST (Y/N)',             eg:'Y' },
  { k:'gstFreq',        h:'GST Freq (M/Q)',        eg:'M' },
  { k:'tds',            h:'TDS (Y/N)',             eg:'Y' },
  { k:'ptMH',           h:'PT Maharashtra (Y/N)', eg:'N' },
  { k:'ptKA',           h:'PT Karnataka (Y/N)',   eg:'N' },
  { k:'it',             h:'Income Tax (Y/N)',      eg:'N' },
  { k:'auditCase',      h:'Audit Case (Y/N)',      eg:'N' },
  { k:'advanceTax',     h:'Advance Tax (Y/N)',     eg:'N' },
  { k:'accounting',     h:'Accounting (Y/N)',      eg:'N' },
  { k:'assignTo',       h:'Assign To (Name) *',   eg:'Priya Sharma' },
  { k:'fy',             h:'FY',                    eg:'2025-26' },
]

const yn = v => String(v||'').trim().toUpperCase() === 'Y'

const parseRow = (row, users) => {
  const get = k => String(row[k]||'').trim()
  const name = get('name')
  const assignTo = get('assignTo')
  const user = users.find(u => u.name.toLowerCase() === assignTo.toLowerCase())
  const errors = []
  if (!name)     errors.push('Name missing')
  if (!assignTo) errors.push('Assign To missing')
  if (assignTo && !user) errors.push(`User "${assignTo}" not found`)
  const constitution = get('constitution') || 'Private Limited'
  if (!CONSTITUTIONS.includes(constitution)) errors.push(`Unknown constitution "${constitution}"`)
  const category = get('category') || 'A'
  if (!CLIENT_CATEGORIES.includes(category)) errors.push(`Unknown category "${category}"`)
  const fy = get('fy') || '2025-26'
  const gstFreqRaw = get('gstFreq').toUpperCase()
  return {
    parsed: {
      name, constitution, category, phone: get('phone'), email: get('email'),
      gstin: get('gstin').toUpperCase(), pan: get('pan').toUpperCase(), tan: get('tan').toUpperCase(),
      gstApplicable: yn(get('gst')), gstFreq: gstFreqRaw==='Q'?'quarterly':'monthly',
      tdsApplicable: yn(get('tds')), ptMH: yn(get('ptMH')), ptKA: yn(get('ptKA')),
      itApplicable: yn(get('it')), auditCase: yn(get('auditCase')),
      advanceTax: yn(get('advanceTax')), accounting: yn(get('accounting')),
      assignedTo: user?.id || '', fy, complianceStartMonth: '04',
      complianceStartYM: `${parseInt(fy)}-04`,
    },
    assigneeName: user?.name || assignTo,
    errors,
  }
}

export const BulkImportPage = ({ users, onBack }) => {
  const [step,      setStep]    = useState('upload') // upload | preview | importing | done
  const [rows,      setRows]    = useState([])
  const [error,     setError]   = useState('')
  const [progress,  setProgress]= useState({ done:0, total:0 })
  const fileRef = useRef()

  const eligible = users.filter(u => ['executive','intern','team_leader','hod'].includes(u.role))

  // ── Download template ────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const header = COLS.map(c => c.h)
    const example = COLS.map(c => c.eg)
    const ws = XLSX.utils.aoa_to_sheet([header, example])
    ws['!cols'] = COLS.map(() => ({ wch: 22 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Clients')
    XLSX.writeFile(wb, 'ComplianceDesk_Import_Template.xlsx')
  }

  // ── Parse uploaded file ──────────────────────────────────────
  const handleFile = async e => {
    setError('')
    const file = e.target.files[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type:'array' })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval:'' })
      if (!raw.length) { setError('File is empty.'); return }
      const parsed = raw.map(r => parseRow(r, eligible))
      setRows(parsed)
      setStep('preview')
    } catch(e) {
      setError('Failed to read file: ' + e.message)
    }
    e.target.value = ''
  }

  // ── Run import ───────────────────────────────────────────────
  const runImport = async () => {
    const validRows = rows.filter(r => !r.errors.length)
    if (!validRows.length) return
    setStep('importing')
    setProgress({ done:0, total:validRows.length })
    let done = 0
    for (const r of validRows) {
      try {
        const ref   = await addClient({ ...r.parsed, clientStatus:'active' })
        const tasks = generateTasks({ ...r.parsed, id:ref.id }, r.parsed.assignedTo, r.parsed.fy, r.parsed.complianceStartYM)
        await bulkAddTasks(tasks)
        done++
        setProgress({ done, total:validRows.length })
      } catch(e) {
        console.error('Import error for', r.parsed.name, e)
        done++
        setProgress({ done, total:validRows.length })
      }
    }
    setStep('done')
  }

  const totalTasks = rows.filter(r=>!r.errors.length).reduce((acc,r) => {
    let n = 0
    const p = r.parsed
    if(p.gstApplicable) n += p.gstFreq==='monthly'?37:13
    if(p.tdsApplicable) n += 20
    if(p.ptMH) n += 13; if(p.ptKA) n += 2
    if(p.itApplicable) n += 1; if(p.advanceTax) n += 4; if(p.accounting) n += 1
    return acc + n
  }, 0)

  const validCount   = rows.filter(r => !r.errors.length).length
  const invalidCount = rows.filter(r => r.errors.length).length

  return (
    <div className="fade-up" style={{ padding:'24px 28px', maxWidth:1000 }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom:16 }}>← Back</button>
      <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:24 }}>
        <div>
          <div style={{ fontSize:20,fontWeight:800,color:'var(--text)' }}>📥 Bulk Client Import</div>
          <div style={{ fontSize:13,color:'var(--text2)',marginTop:2 }}>Upload an Excel file to onboard multiple clients and auto-create their tasks.</div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={downloadTemplate}>
          ⬇ Download Template
        </button>
      </div>

      {/* ── Step: Upload ── */}
      {step==='upload'&&(
        <div className="card" style={{ padding:32,display:'flex',flexDirection:'column',alignItems:'center',gap:16,border:'2px dashed var(--border2)' }}>
          <div style={{ fontSize:40 }}>📄</div>
          <div style={{ fontWeight:700,color:'var(--text)' }}>Upload Excel File</div>
          <div style={{ fontSize:12,color:'var(--text3)',textAlign:'center',maxWidth:420 }}>
            Download the template above, fill in your client data, then upload here.<br/>
            Supports .xlsx and .xls files.
          </div>
          {error&&<Alert message={error}/>}
          <button className="btn btn-primary" onClick={()=>fileRef.current.click()}>Choose File</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleFile}/>
          <div style={{ fontSize:11,color:'var(--text3)',marginTop:8 }}>
            <strong>Required columns:</strong> Client Name, Constitution, Assign To, FY
          </div>
        </div>
      )}

      {/* ── Step: Preview ── */}
      {step==='preview'&&(
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {/* Summary chips */}
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            {[
              { l:'Total rows',     v:rows.length,    c:'var(--accent)' },
              { l:'Ready to import',v:validCount,     c:'var(--success)' },
              { l:'Has errors',     v:invalidCount,   c: invalidCount?'var(--danger)':'var(--text3)' },
              { l:'Tasks to create',v:totalTasks,     c:'var(--warn)' },
            ].map(x=>(
              <div key={x.l} style={{ background:'var(--surface2)',border:`1px solid var(--border)`,borderRadius:10,padding:'10px 16px',textAlign:'center',minWidth:110 }}>
                <div style={{ fontWeight:800,fontSize:20,color:x.c }}>{x.v}</div>
                <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>{x.l}</div>
              </div>
            ))}
          </div>

          {error&&<Alert message={error}/>}

          {/* Preview table */}
          <div style={{ overflowX:'auto',borderRadius:10,border:'1px solid var(--border)' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--surface2)',borderBottom:'1px solid var(--border)' }}>
                  {['#','Client Name','Constitution','Cat','Assigned To','Services','Tasks','FY','Status'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px',textAlign:'left',fontWeight:600,color:'var(--text3)',fontSize:11,whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>{
                  const p = r.parsed
                  const svcs = [p.gstApplicable&&'GST',p.tdsApplicable&&'TDS',p.ptMH&&'PT-MH',p.itApplicable&&'IT',p.advanceTax&&'AdvTax',p.accounting&&'Accts'].filter(Boolean)
                  const rowTasks = [0,p.gstApplicable?(p.gstFreq==='monthly'?37:13):0,p.tdsApplicable?20:0,p.ptMH?13:0,p.ptKA?2:0,p.itApplicable?1:0,p.advanceTax?4:0,p.accounting?1:0].reduce((a,b)=>a+b,0)
                  const hasErr = r.errors.length>0
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid var(--border)',background:hasErr?'#f43f5e08':'transparent' }}>
                      <td style={{ padding:'8px 12px',color:'var(--text3)' }}>{i+1}</td>
                      <td style={{ padding:'8px 12px',fontWeight:600,color:'var(--text)' }}>{p.name||'—'}</td>
                      <td style={{ padding:'8px 12px',color:'var(--text2)' }}>{p.constitution}</td>
                      <td style={{ padding:'8px 12px',color:'var(--text2)' }}>{p.category}</td>
                      <td style={{ padding:'8px 12px',color:'var(--text2)',whiteSpace:'nowrap' }}>{r.assigneeName}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <div style={{ display:'flex',gap:3,flexWrap:'wrap' }}>
                          {svcs.map(s=><span key={s} style={{ background:'#5b8dee15',color:'#5b8dee',border:'1px solid #5b8dee25',borderRadius:4,padding:'1px 5px',fontSize:10 }}>{s}</span>)}
                        </div>
                      </td>
                      <td style={{ padding:'8px 12px',color:'var(--text)',fontWeight:600 }}>{rowTasks}</td>
                      <td style={{ padding:'8px 12px',color:'var(--text2)' }}>{p.fy}</td>
                      <td style={{ padding:'8px 12px' }}>
                        {hasErr ? (
                          <div>
                            {r.errors.map((e,j)=>(
                              <div key={j} style={{ color:'var(--danger)',fontSize:11 }}>⚠ {e}</div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color:'var(--success)',fontSize:11,fontWeight:600 }}>✓ Ready</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display:'flex',gap:10,marginTop:4 }}>
            <button className="btn btn-ghost" onClick={()=>{ setRows([]); setStep('upload') }}>← Re-upload</button>
            <button className="btn btn-primary" style={{ flex:1 }}
              onClick={runImport} disabled={validCount===0}>
              🚀 Import {validCount} Client{validCount!==1?'s':''} &amp; Create ~{totalTasks} Tasks
            </button>
          </div>
          {invalidCount>0&&(
            <div style={{ fontSize:12,color:'var(--warn)',textAlign:'center' }}>
              ⚠ {invalidCount} row{invalidCount!==1?'s':''} with errors will be skipped.
            </div>
          )}
        </div>
      )}

      {/* ── Step: Importing ── */}
      {step==='importing'&&(
        <div className="card" style={{ padding:40,display:'flex',flexDirection:'column',alignItems:'center',gap:16 }}>
          <div style={{ fontSize:32 }}>⏳</div>
          <div style={{ fontWeight:700,color:'var(--text)',fontSize:16 }}>Importing clients…</div>
          <div style={{ width:'100%',maxWidth:360,background:'var(--surface2)',borderRadius:8,height:8,overflow:'hidden' }}>
            <div style={{ height:'100%',background:'var(--accent)',borderRadius:8,transition:'width .3s',
              width:`${progress.total?Math.round(progress.done/progress.total*100):0}%` }}/>
          </div>
          <div style={{ fontSize:13,color:'var(--text3)' }}>{progress.done} / {progress.total} clients</div>
        </div>
      )}

      {/* ── Step: Done ── */}
      {step==='done'&&(
        <div className="card" style={{ padding:40,display:'flex',flexDirection:'column',alignItems:'center',gap:16 }}>
          <div style={{ fontSize:48 }}>✅</div>
          <div style={{ fontWeight:800,color:'var(--success)',fontSize:18 }}>Import Complete!</div>
          <div style={{ fontSize:13,color:'var(--text2)' }}>{progress.done} clients onboarded with all their compliance tasks.</div>
          <button className="btn btn-primary" onClick={onBack}>← Back to Clients</button>
        </div>
      )}
    </div>
  )
}
