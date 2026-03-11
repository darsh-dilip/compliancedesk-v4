import { ROLES, ROLE_CLR } from '../constants.js'
import { Avatar } from './UI.jsx'

const NAV_GROUPS = [
  {
    label: 'MY TASKS',
    items: [
      { id:'dashboard', icon:'◈',  label:'My Dashboard'   },
      { id:'tasks',     icon:'≡',  label:'All Tasks'      },
      { id:'pending',   icon:'📋', label:'Pending Tasks'  },
    ]
  },
  {
    label: 'CUSTOMERS',
    items: [
      { id:'clients',  icon:'🏢', label:'Clients'            },
      { id:'creds',    icon:'🔐', label:'Credential Manager' },
    ]
  },
  {
    label: 'SERVICE DASHBOARDS',
    items: [
      { id:'gst',  icon:'📊', label:'GST'            },
      { id:'tds',  icon:'💰', label:'TDS & Accounting'},
      { id:'it',   icon:'📁', label:'Income Tax'     },
    ]
  },
  {
    label: 'STATUS REPORTS',
    items: [
      { id:'status',       icon:'📈', label:'Service Wise'      },
      { id:'memberstatus', icon:'👤', label:'Team Member Wise'  },
      { id:'clientstatus', icon:'🏢', label:'Client Wise'       },
      { id:'duedone',      icon:'📊', label:'Due vs Done'       },
    ]
  },
  {
    label: 'TEAM',
    items: [
      { id:'users',    icon:'⚙️', label:'Manage Team',  partner:true },
      { id:'workload', icon:'👥', label:'Team Workload', mgr:true    },
      { id:'audit',    icon:'🔍', label:'Audit Log'                   },
      { id:'bulkdate', icon:'⚡', label:'Bulk Updates',   mgr:true     },
    ]
  },
]

export const Sidebar = ({ page, setPage, user, onLogout, overdueCount=0 }) => {
  const isMgr     = ['partner','hod','team_leader'].includes(user.role)
  const isPartner = user.role==='partner'

  return (
    <div className="sidebar-root" style={{ width:214,flexShrink:0,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',height:'100vh',position:'sticky',top:0 }}>
      {/* Logo / Brand */}
      <div style={{ padding:'16px 16px 14px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:15,fontWeight:800,color:'var(--text)' }}>⚖️ ComplianceDesk</div>
        <div style={{ fontSize:10,color:'var(--text3)',marginTop:2,letterSpacing:'0.05em' }}>CA FIRM MANAGER</div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'6px 8px',flex:1,overflow:'auto' }}>
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(n => {
            if (n.partner && !isPartner) return false
            if (n.mgr && !isMgr) return false
            return true
          })
          if (!visibleItems.length) return null
          return (
            <div key={gi}>
              {/* Divider BEFORE section label (except first group) */}
              {gi > 0 && <div style={{ height:1,background:'var(--border)',margin:'6px 4px 0' }}/>}
              {/* Section label */}
              <div style={{ fontSize:9,fontWeight:700,color:'var(--text3)',letterSpacing:'0.09em',padding:'8px 10px 4px' }}>
                {group.label}
              </div>
              {/* Items */}
              {visibleItems.map(n => {
                const active = page === n.id
                return (
                  <button key={n.id} onClick={()=>setPage(n.id)}
                    style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,border:'none',cursor:'pointer',
                      background:active?'var(--surface3)':'transparent',
                      color:active?'var(--text)':'var(--text2)',
                      fontWeight:active?700:500,fontSize:12,
                      borderLeft:active?'2px solid var(--accent)':'2px solid transparent',
                      marginBottom:1,transition:'all .1s',justifyContent:'space-between' }}>
                    <span style={{ display:'flex',alignItems:'center',gap:9 }}>
                      <span style={{ fontSize:14 }}>{n.icon}</span>{n.label}
                    </span>
                    {n.id==='dashboard' && overdueCount>0 && (
                      <span className="chip" style={{ background:'#f43f5e20',color:'var(--danger)',border:'1px solid #f43f5e30',fontSize:10 }}>{overdueCount}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div style={{ padding:'10px 16px' }}>
        <button onClick={()=>setPage('profile')}
          style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8,width:'100%',background:'none',border:'none',cursor:'pointer',padding:'4px 0',borderRadius:8 }}>
          <Avatar name={user.name} init={user.init} role={user.role} sz={28}/>
          <div style={{ flex:1,minWidth:0,textAlign:'left' }}>
            <div style={{ fontWeight:600,fontSize:12,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user.nickname||user.name}</div>
            <div style={{ fontSize:10,color:ROLE_CLR[user.role],fontWeight:600 }}>{ROLES[user.role]}</div>
          </div>
        </button>
        <button className="btn btn-ghost btn-sm" style={{ width:'100%',justifyContent:'center' }} onClick={onLogout}>Sign Out</button>
      </div>
      <div style={{ background:'#fff',padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <img
          src="https://bizexpress.in/wp-content/uploads/2021/08/BizE-Logo-HD.png"
          alt="BizExpress"
          style={{ height:20,objectFit:'contain',display:'block',maxWidth:'80%' }}
          onError={e=>{ e.target.parentElement.style.display='none' }}
        />
      </div>
    </div>
  )
}
