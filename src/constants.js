// ── ROLES ────────────────────────────────────────────────────
export const ROLES = {
  partner:'Partner', hod:'Head of Dept', team_leader:'Team Leader',
  executive:'Executive', intern:'Intern', sales:'Sales Member',
}
export const ROLE_ORDER = { partner:0, hod:1, team_leader:2, executive:3, intern:4, sales:5 }
export const ROLE_CLR   = {
  partner:'#f59e0b', hod:'#ec4899', team_leader:'#34d399',
  executive:'#5b8dee', intern:'#fde68a', sales:'#a78bfa',
}

// ── FINANCIAL YEARS ──────────────────────────────────────────
export const FINANCIAL_YEARS = ['2026-27','2027-28']

// ── CLIENT-LEVEL STATUS ──────────────────────────────────────
export const CLIENT_STATUS = {
  active:       { l:'Active',       badge:null },
  on_hold:      { l:'On Hold',      badge:'ON HOLD',      badgeColor:'#f59e0b', badgeBg:'#f59e0b22', badgeBorder:'#f59e0b55' },
  discontinued: { l:'Discontinued', badge:'STOP SERVICE', badgeColor:'#f43f5e', badgeBg:'#f43f5e22', badgeBorder:'#f43f5e55' },
}

// ── STATUS BUILDER ───────────────────────────────────────────
const s = (v, l, c, extra={}) => ({ v, l, c, bg:`${c}18`, ...extra })

// ── GSTR-1 / GSTR-3B ────────────────────────────────────────
const GSTR1_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('filed','Filed','#22c55e',{done:true,requiresArn:true}),
  s('nil_filed','Nil Filed','#34d399',{done:true,requiresArn:true}),
  s('data_pending','Data Pending','#f59e0b'),
  s('not_responding','Not Responding','#f43f5e'),
  s('data_received','Data Received','#38bdf8'),
  s('unregistered','Unregistered','#818cf8',{done:true}),
  s('not_in_compliance','Not in Compliance','#f97316'),
  s('delayed_filing','Delayed Filing','#fb923c',{done:true,requiresArn:true}),
  s('suspended','Suspended','#a78bfa'),
  s('cancelled','Cancelled / Surrendered','#4a5578',{done:true}),
  s('on_hold','On Hold','#f59e0b'),
  s('iff_filed','IFF Filed','#4ade80',{done:true,requiresArn:true}),
  s('no_iff','No IFF','#8892b0',{done:true}),
]
const GSTR3B_STATUSES = [
  ...GSTR1_STATUSES,
  s('payment_pending','Payment Pending','#fb923c'),
]

// ── GSTR-2B ──────────────────────────────────────────────────
const GSTR2B_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('2b_not_available','2B Not Yet Available','#f59e0b'),
  s('in_progress','Recon in Progress','#5b8dee'),
  s('differences_found','Differences Found','#f43f5e'),
  s('differences_resolved','Differences Resolved','#fb923c'),
  s('completed','Completed','#22c55e',{done:true}),
  s('on_hold','On Hold','#a78bfa'),
  s('data_pending','Data Pending','#f59e0b'),
  s('not_responding','Not Responding','#f43f5e'),
]

// ── ACCOUNTING (SINGLE TASK with month-progress) ─────────────
const FY_MON_LABELS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']
const ACCOUNTING_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('data_pending','Data Pending','#f59e0b'),
  s('data_received','Data Received','#38bdf8'),
  ...FY_MON_LABELS.map(m => s(`done_${m.toLowerCase()}`,`Done through ${m}`,'#4ade80')),
  s('completed','Fully Completed','#22c55e',{done:true}),
  s('on_hold','On Hold','#f59e0b'),
  s('not_responding','Not Responding','#f43f5e'),
]
export const ACCOUNTING_MONTH_DONE = FY_MON_LABELS.map(m=>`done_${m.toLowerCase()}`)

// ── IT / FINALISATION ────────────────────────────────────────
const IT_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('data_pending','Data Pending','#f59e0b'),
  s('data_received','Data Received','#38bdf8'),
  s('accounting_done','Accounting Done','#818cf8'),
  s('checkers_query',"Checker's Query",'#f59e0b'),
  s('audited','Audited','#a78bfa'),
  s('fs_sent','FS Sent to Client','#5b8dee'),
  s('confirmed','Confirmed by Client','#4ade80'),
  s('genius_prepared','Genius Prepared','#38bdf8'),
  s('genius_checked','Genius Checked','#34d399'),
  s('payment_pending','Tax Payment Pending','#fb923c'),
  s('payment_made','Payment Made','#4ade80'),
  s('itr_filed','ITR Filed','#22c55e',{done:true,requiresArn:true}),
  s('revision_required','Revision Required','#f43f5e'),
  s('revision_filed','Revision Filed','#fb923c',{done:true,requiresArn:true}),
  s('delayed_filing','Delayed Filing','#fb923c',{done:true,requiresArn:true}),
  s('not_to_be_filed','Not to be Filed','#4a5578',{done:true}),
  s('customer_refused','Customer Refused','#f43f5e',{done:true}),
  s('not_responding','Not Responding','#f43f5e'),
  s('on_hold','On Hold','#f59e0b'),
  s('delayed_data','Delayed Data Received','#fb923c'),
]

// ── PTEC ─────────────────────────────────────────────────────
const PTEC_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('paid','Paid','#22c55e',{done:true,requiresRef:true,refLabel:'Challan / Ref No.'}),
  s('nil_filed','Nil Filed','#34d399',{done:true}),
  s('no_employee','No Employees','#4a5578',{done:true}),
  s('delayed_filing','Delayed Filing','#fb923c',{done:true}),
  s('no_response','No Response','#f43f5e'),
  s('on_hold','On Hold','#f59e0b'),
  s('state_issue','State Issue','#f97316'),
]

// ── PT Monthly ───────────────────────────────────────────────
const PT_MONTHLY_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('paid','Paid','#22c55e',{done:true,requiresRef:true,refLabel:'Challan / Ref No.'}),
  s('no_employee','No Employees','#4a5578',{done:true}),
  s('delayed_filing','Delayed Filing','#fb923c',{done:true}),
  s('on_hold','On Hold','#f59e0b'),
  s('state_issue','State Issue','#f97316'),
  s('no_response','No Response','#f43f5e'),
]

// ── Advance Tax ──────────────────────────────────────────────
const ADV_TAX_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('denied','Denied','#f43f5e'),
  s('no_profits','No Profits','#4a5578',{done:true}),
  s('paid','Paid','#22c55e',{done:true,requiresRef:true,refLabel:'BSR Code & Challan No.'}),
  s('delayed_filing','Delayed Filing','#fb923c',{done:true}),
  s('no_response','No Response','#f43f5e'),
  s('on_hold','On Hold','#f59e0b'),
]

// ── TDS Payment ──────────────────────────────────────────────
const TDS_PMT_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('paid','Paid','#22c55e',{done:true,requiresRef:true,refLabel:'BSR Code & Challan No.'}),
  s('na','N/A (No TDS)','#4a5578',{done:true}),
  s('on_hold','On Hold','#f59e0b'),
  s('late','Paid Late','#f97316',{done:true}),
]

// ── TDS Return (24Q / 26Q) ───────────────────────────────────
const TDS_RETURN_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('nil','Nil','#34d399',{done:true,requiresArn:true}),
  s('filed','Filed','#22c55e',{done:true,requiresArn:true}),
  s('delayed_filing','Delayed Filing','#fb923c',{done:true,requiresArn:true}),
  s('on_hold','On Hold','#f59e0b'),
  s('na','N/A (No TDS)','#4a5578',{done:true}),
]


// ── Onboarding Call statuses ─────────────────────────────────────────────
const ONBOARDING_STATUSES = [
  s('pending',           'Pending',            '#8892b0'),
  s('partial',           'Partial',            '#5b8dee'),
  s('not_responding',    'Not Responding',     '#f43f5e'),
  s('completed',         'Completed',          '#22c55e', {done:true}),
  s('existing_client',   'Existing Client',    '#34d399', {done:true}),
  s('on_hold',           'On Hold',            '#a78bfa', {hold:true}),
  s('refused',           'Refused / Cancelled','#4a5578', {hold:true}),
]

// ── Ad-hoc generic statuses ──────────────────────────────────
const ADHOC_STATUSES = [
  s('pending','Pending','#8892b0'),
  s('in_progress','In Progress','#5b8dee'),
  s('pending_client','Pending @ Client','#f59e0b'),
  s('completed','Completed','#22c55e',{done:true}),
  s('delayed_filing','Delayed Filing','#fb923c',{done:true}),
  s('on_hold','On Hold','#a78bfa'),
  s('cancelled','Cancelled','#4a5578',{done:true}),
  s('not_responding','Not Responding','#f43f5e'),
]

// ── SERVICE → STATUS MAP ─────────────────────────────────────
export const SERVICE_STATUSES = {
  'GSTR-1':                   GSTR1_STATUSES,
  'GSTR-1 (Quarterly)':       GSTR1_STATUSES,
  'GSTR-2B Reconciliation':   GSTR2B_STATUSES,
  'GSTR-3B':                  GSTR3B_STATUSES,
  'GSTR-3B (Quarterly)':      GSTR3B_STATUSES,
  'GSTR-9 Annual Return':     IT_STATUSES,
  'Income Tax Filing':        IT_STATUSES,
  'Accounting':               ACCOUNTING_STATUSES,
  'PT Payment (Maharashtra)': PT_MONTHLY_STATUSES,
  'PT Return (Maharashtra)':  PTEC_STATUSES,
  'PT Payment (Karnataka)':   PTEC_STATUSES,
  'PT Return (Karnataka)':    PTEC_STATUSES,
  'Advance Tax':              ADV_TAX_STATUSES,
  'TDS Payment':              TDS_PMT_STATUSES,
  'TDS Return':               TDS_RETURN_STATUSES,
  'TDS Return 24Q':           TDS_RETURN_STATUSES,
  'TDS Return 26Q':           TDS_RETURN_STATUSES,
}
// Ad-hoc services all use ADHOC_STATUSES
export const ADHOC_SERVICES = [
  'Onboarding Call',
  'GST APOB','GST Surrender','15CA/CB','CA Certification',
  'GST Address Change','Financial Due Diligence','GSTR-9/9C',
  'Individual ITR','IT Notice','GST Notice','IT Appeal',
  'GST Appeal','Other GST Change','Ad-hoc TDS Filing',
  'Preparation of Financials','Other CA Services',
]
ADHOC_SERVICES.forEach(svc => { SERVICE_STATUSES[svc] = ADHOC_STATUSES })
SERVICE_STATUSES['Onboarding Call'] = ONBOARDING_STATUSES

const FALLBACK = [
  s('pending','Pending','#8892b0'),
  s('in_progress','In Progress','#5b8dee'),
  s('completed','Completed','#22c55e',{done:true}),
  s('on_hold','On Hold','#f59e0b'),
]
export const getServiceStatuses = svc => SERVICE_STATUSES[svc] || FALLBACK
export const getStatusObj = (svc, v) => {
  const list = getServiceStatuses(svc)
  return list.find(x=>x.v===v) || { v, l:v, c:'#8892b0', bg:'#8892b015' }
}

// ── COMMENT STATUS LIST ──────────────────────────────────────
export const COMMENT_STATUSES = [
  'Bank Statement Pending','Client Unresponsive','Tally, not Zoho','Closure',
  'Payment Due','No Sales','NIL ITR to be filed','Change Email ID',
  'DND / Discontinued','Zoho Deleted','Only Bank Received','Part Data Received',
  'Genius Prepared','Genius Queries','ITR Email Sent','Half Bank St. Received',
  'Bank A/c Not Opened','Genius Ongoing','Genius Checked','Login to be created',
  'DSC Expired','NIL - Revision','Not Responding - Penalty',
]

// ── DONE STATUSES ────────────────────────────────────────────
export const DONE_STATUSES = [
  'filed','nil_filed','completed','paid','itr_filed','iff_filed','no_iff',
  'unregistered','cancelled','not_to_be_filed','no_profits','na','no_employee',
  'nil','delayed_filing','differences_resolved','customer_refused','late',
  'payment_made','revision_filed','not_in_compliance',
]

// ── KANBAN STATUS GROUPINGS ──────────────────────────────────
export const PENDING_AT_CLIENT = ['data_pending','not_responding','fs_sent','no_response','payment_pending']
export const HOLD_REFUSED      = ['on_hold','customer_refused','suspended','cancelled','state_issue','denied','not_in_compliance']
export const DONE_NIL          = ['nil_filed','nil','no_iff','no_employee','no_profits','not_to_be_filed','na','unregistered']
export const DONE_PROPER       = ['filed','itr_filed','paid','completed','late','delayed_filing','iff_filed','differences_resolved','payment_made','revision_filed']

// Status Kanban columns
export const STATUS_KANBAN_COLS = [
  { key:'ongoing_clean',   label:'✅ Ongoing (Clean)',   color:'#5b8dee',  desc:'Active, not overdue'     },
  { key:'ongoing_overdue', label:'🔴 Ongoing (Overdue)', color:'#f43f5e',  desc:'Active but past due date' },
  { key:'pending_client',  label:'⏳ Pending @ Client',  color:'#f59e0b',  desc:'Waiting on client'        },
  { key:'hold_refused',    label:'⏸ Hold / Refused',    color:'#a78bfa',  desc:'On hold or refused'       },
  { key:'done_nil',        label:'◎ Done (Nil)',         color:'#8892b0',  desc:'Nil / N/A / Not applicable' },
  { key:'done',            label:'🎯 Done',              color:'#22c55e',  desc:'Filed / Paid / Completed'  },
]

// Urgency Kanban columns
export const URGENCY_KANBAN_COLS = [
  { key:'overdue',    label:'🔴 Overdue',       color:'#f43f5e' },
  { key:'today',      label:'🟠 Due Today',     color:'#fb923c' },
  { key:'soon3',      label:'🟡 3 Days',        color:'#f59e0b' },
  { key:'soon7',      label:'🔵 7 Days',        color:'#5b8dee' },
  { key:'this_month', label:'🩵 This Month',    color:'#38bdf8' },
  { key:'hold',       label:'⏸ Hold / Refused', color:'#a78bfa' },
  { key:'completed',  label:'✅ Completed',      color:'#22c55e' },
]

// ── MISC ─────────────────────────────────────────────────────
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const CLIENT_CATEGORIES = ['A+','A','B','C','D']
export const CAT_CLR = { 'A+':'#22c55e','A':'#5b8dee','B':'#f59e0b','C':'#fb923c','D':'#f43f5e' }

export const CONSTITUTIONS = [
  'Private Limited','LLP','Public Limited','Partnership Firm',
  'Proprietorship','Trust / Section 8','HUF',
]
export const LOG_ACTIONS = {
  CLIENT_ONBOARDED:      'client_onboarded',
  CLIENT_STATUS_CHANGED: 'client_status_changed',
  CLIENT_REASSIGNED:     'client_reassigned',
  TASK_STATUS_CHANGED:   'task_status_changed',
  TASK_REASSIGNED:       'task_reassigned',
  TASK_DELETED:          'task_deleted',
  COMMENT_ADDED:         'comment_added',
  USER_CREATED:          'user_created',
  ADHOC_TASK_CREATED:    'adhoc_task_created',
}

// ── Credential Services ────────────────────────────────────

export const ONBOARDING_CALL_URL      = 'https://bizexpress.in/solutions/CC-onboarding/login.html'
export const ONBOARDING_CALL_PASSWORD = 'OB25@Bizexpress'
export const CRED_SERVICES = [
  { v:'gst',        l:'GST Portal',          url:'https://www.gst.gov.in/',                          icon:'🔐', tasks:['GSTR-1','GSTR-1 (Quarterly)','GSTR-3B','GSTR-3B (Quarterly)','GSTR-9 Annual Return'] },
  { v:'incometax',  l:'Income Tax (e-Filing)',url:'https://www.incometax.gov.in/iec/foportal/',        icon:'📋', tasks:['Income Tax Filing','Advance Tax'] },
  { v:'traces',     l:'TRACES (TDS)',         url:'https://www.tdscpc.gov.in/',                        icon:'🧾', tasks:['TDS Payment','TDS Return 24Q','TDS Return 26Q'] },
  { v:'pt',         l:'PT Portal',            url:'https://mahagst.gov.in/',                           icon:'🏛️', tasks:['PT Payment (Maharashtra)','PT Return (Maharashtra)','PT Payment (Karnataka)','PT Return (Karnataka)'] },
  { v:'mca',        l:'MCA / ROC',            url:'https://efiling.mca.gov.in/',                       icon:'🏢', tasks:[] },
  { v:'zoho',       l:'Zoho Books',           url:'https://accounts.zoho.in/signin',                   icon:'📗', tasks:['Accounting'] },
  { v:'tally',      l:'Tally (Desktop)',       url:null,                                                icon:'💽', tasks:['Accounting'] },
  { v:'tallycloud', l:'Tally Cloud',           url:'https://in.cloudaccess.tallysolutions.com/login',  icon:'☁️', tasks:['Accounting'] },
  { v:'odoo',       l:'Odoo',                  url:'https://www.odoo.com/web/login',                   icon:'🟣', tasks:['Accounting'] },
  { v:'custom',     l:'Custom / Other',        url:null,                                                icon:'⚙️', tasks:[] },
]

export const getCredForTask = (service) => {
  return CRED_SERVICES.filter(cs => cs.tasks.includes(service))
}

export const DEPARTMENTS = ['CC','RR','FF','SS','HR','MM','LL']

// ── Soft task dependency map ─────────────────────────────────────────────
export const SOFT_DEPS = {
  'GSTR-3B':              ['GSTR-1', 'GSTR-2B Reconciliation'],
  'GSTR-3B (Quarterly)':  ['GSTR-1 (Quarterly)', 'GSTR-2B Reconciliation'],
  'GSTR-2B Reconciliation': ['GSTR-1'],
  'Income Tax Filing':    ['Accounting'],
  'TDS Return 24Q':       ['TDS Payment'],
  'TDS Return 26Q':       ['TDS Payment'],
  'GSTR-9 Annual Return': ['GSTR-3B'],
}

