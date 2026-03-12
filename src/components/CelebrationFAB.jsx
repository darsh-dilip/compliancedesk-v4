import { useState, useEffect, useRef, useMemo } from 'react'

// ── Date helpers ─────────────────────────────────────────────────────────
const today = () => new Date()
const todayStr = () => today().toISOString().split('T')[0]

const parseMMDD = (dateStr) => {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length < 3) return null
  return { month: parseInt(parts[1]), day: parseInt(parts[2]) }
}

const isToday = (dateStr) => {
  if (!dateStr) return false
  const md = parseMMDD(dateStr)
  const t = today()
  return md?.month === t.getMonth()+1 && md?.day === t.getDate()
}

const isThisMonth = (dateStr) => {
  if (!dateStr) return false
  const md = parseMMDD(dateStr)
  return md?.month === today().getMonth()+1
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

const ordinal = (n) => {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return n + (s[(v-20)%10]||s[v]||s[0])
}

const daysUntil = (dateStr) => {
  if (!dateStr) return null
  const md = parseMMDD(dateStr)
  if (!md) return null
  const t = today()
  const thisYear = new Date(t.getFullYear(), md.month-1, md.day)
  if (thisYear < t) thisYear.setFullYear(t.getFullYear()+1)
  return Math.round((thisYear - t) / 86400000)
}

// ── Confetti ─────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f59e0b','#ec4899','#22c55e','#5b8dee','#f43f5e','#a78bfa','#34d399','#fb923c','#fde68a']
const CONFETTI_SHAPES = ['●','■','▲','◆','★']

const Confetti = ({ count = 80, active }) => {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 2.5 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
      size: 8 + Math.random() * 10,
      rotation: Math.random() * 720 - 360,
      drift: (Math.random() - 0.5) * 120,
    }))
  }, [count])

  if (!active) return null

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg) translateX(0); opacity:1; }
          100% { transform: translateY(110vh) rotate(var(--rot)) translateX(var(--drift)); opacity:0; }
        }
      `}</style>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9998, overflow:'hidden' }}>
        {pieces.map(p => (
          <div key={p.id} style={{
            position:'absolute',
            left:`${p.left}%`,
            top:'-20px',
            color: p.color,
            fontSize: p.size,
            '--rot': `${p.rotation}deg`,
            '--drift': `${p.drift}px`,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
            userSelect:'none',
          }}>{p.shape}</div>
        ))}
      </div>
    </>
  )
}

// ── Birthday today full-screen animation ─────────────────────────────────
const BirthdayHero = ({ person, onContinue }) => {
  const [phase, setPhase] = useState(0) // 0=burst, 1=message, 2=fade

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => setPhase(2), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (phase === 2) {
      const t = setTimeout(onContinue, 800)
      return () => clearTimeout(t)
    }
  }, [phase, onContinue])

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background: 'linear-gradient(135deg, #1a0533, #0f172a, #1a0533)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      transition: 'opacity .8s',
      opacity: phase === 2 ? 0 : 1,
    }}>
      <style>{`
        @keyframes birthday-pop {
          0%   { transform: scale(0) rotate(-10deg); opacity:0; }
          60%  { transform: scale(1.15) rotate(3deg); opacity:1; }
          100% { transform: scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes birthday-float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-12px); }
        }
        @keyframes birthday-glow {
          0%,100% { text-shadow: 0 0 20px #f59e0b, 0 0 40px #f59e0b; }
          50%     { text-shadow: 0 0 40px #f59e0b, 0 0 80px #ec4899, 0 0 120px #f59e0b; }
        }
        @keyframes cake-spin {
          0%   { transform: scale(0) rotate(-180deg); }
          80%  { transform: scale(1.2) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>

      {/* Radial glow */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(circle at 50% 50%, rgba(245,158,11,.15) 0%, transparent 70%)',
        animation: 'birthday-glow 2s ease-in-out infinite',
      }}/>

      {/* Cake emoji */}
      <div style={{
        fontSize: 80,
        animation: phase >= 1 ? 'cake-spin .6s ease-out forwards' : 'none',
        opacity: phase >= 1 ? 1 : 0,
        marginBottom: 16,
      }}>🎂</div>

      {/* Name */}
      <div style={{
        fontSize: 48, fontWeight: 900, color: '#fde68a',
        animation: phase >= 1 ? 'birthday-pop .6s .1s ease-out both, birthday-float 2.5s 1s ease-in-out infinite' : 'none',
        opacity: phase >= 1 ? 1 : 0,
        textAlign:'center',
        letterSpacing:'-0.02em',
      }}>
        Happy Birthday, {person.name.split(' ')[0]}! 🎉
      </div>

      {/* Wishing message */}
      <div style={{
        fontSize: 18, color: '#a78bfa', marginTop: 12,
        animation: phase >= 1 ? 'birthday-pop .6s .3s ease-out both' : 'none',
        opacity: phase >= 1 ? 1 : 0,
        fontStyle:'italic',
      }}>
        Wishing you a wonderful day! 🌟
      </div>

      {/* Star burst */}
      <div style={{
        position:'absolute', fontSize:32, top:'15%', left:'10%',
        animation:'birthday-float 3s 0.5s ease-in-out infinite',
      }}>⭐</div>
      <div style={{
        position:'absolute', fontSize:24, top:'20%', right:'15%',
        animation:'birthday-float 2.5s 1s ease-in-out infinite',
      }}>✨</div>
      <div style={{
        position:'absolute', fontSize:28, bottom:'20%', left:'15%',
        animation:'birthday-float 3.5s 0.2s ease-in-out infinite',
      }}>🌟</div>
      <div style={{
        position:'absolute', fontSize:20, bottom:'15%', right:'10%',
        animation:'birthday-float 2s 0.8s ease-in-out infinite',
      }}>💫</div>
    </div>
  )
}

// ── Person card in modal ──────────────────────────────────────────────────
const CelebCard = ({ person, type, isToday: today_ }) => {
  const md = parseMMDD(type === 'birthday' ? person.birthDate : person.anniversaryDate)
  const days = daysUntil(type === 'birthday' ? person.birthDate : person.anniversaryDate)
  const color = type === 'birthday' ? '#ec4899' : '#a78bfa'
  const icon  = type === 'birthday' ? '🎂' : '💑'
  const label = type === 'birthday' ? 'Birthday' : 'Anniversary'

  // How many years
  const dateStr = type === 'birthday' ? person.birthDate : person.anniversaryDate
  const year = dateStr?.split('-')[0]
  const thisYear = new Date().getFullYear()
  const age = year ? thisYear - parseInt(year) : null
  const years = (type === 'anniversary' && year) ? thisYear - parseInt(year) : null

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
      borderRadius:12, border:`1.5px solid ${today_ ? color : 'var(--border)'}`,
      background: today_ ? `${color}12` : 'var(--surface2)',
      position:'relative', overflow:'hidden',
    }}>
      {today_ && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:3,
          background:`linear-gradient(90deg,${color},${color}80,${color})`,
        }}/>
      )}
      {/* Avatar with initials */}
      <div style={{
        width:46, height:46, borderRadius:'50%', flexShrink:0,
        background:`${color}20`, border:`2px solid ${color}60`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, fontWeight:700, color,
        boxShadow: today_ ? `0 0 0 3px ${color}40, 0 0 12px ${color}50` : 'none',
      }}>
        {person.init || (person.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{person.name}</span>
          {today_ && <span style={{
            fontSize:10, fontWeight:800, background:color, color:'#fff',
            padding:'1px 7px', borderRadius:10, letterSpacing:'0.04em',
          }}>TODAY! 🎉</span>}
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
          {icon} {label} · {MONTHS_FULL[md.month-1]} {ordinal(md.day)}
          {years ? ` · ${years} years together 💕` : ''}
        </div>
      </div>

      <div style={{ textAlign:'right', flexShrink:0 }}>
        {today_ ? (
          <div style={{ fontSize:24 }}>🎊</div>
        ) : (
          <div>
            <div style={{ fontSize:14, fontWeight:700, color }}>{days === 0 ? 'Today!' : `${days}d`}</div>
            <div style={{ fontSize:10, color:'var(--text3)' }}>{days === 0 ? '🎉' : 'to go'}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main FAB ──────────────────────────────────────────────────────────────
export const CelebrationFAB = ({ users }) => {
  const [open,        setOpen]        = useState(false)
  const [confetti,    setConfetti]    = useState(false)
  const [showBday,    setShowBday]    = useState(false)
  const [bdayPerson,  setBdayPerson]  = useState(null)
  const [shownBday,   setShownBday]   = useState(false)
  const hasChecked = useRef(false)

  // Build celebration list
  const { thisMonthAll, birthdayToday } = useMemo(() => {
    const all = []
    let bdToday = null
    ;(users||[]).forEach(u => {
      if (u.birthDate && isThisMonth(u.birthDate)) {
        const md = parseMMDD(u.birthDate)
        all.push({ person:u, type:'birthday', day:md.day, today:isToday(u.birthDate) })
        if (isToday(u.birthDate)) bdToday = u
      }
      if (u.anniversaryDate && isThisMonth(u.anniversaryDate)) {
        const md = parseMMDD(u.anniversaryDate)
        all.push({ person:u, type:'anniversary', day:md.day, today:isToday(u.anniversaryDate) })
      }
    })
    all.sort((a,b) => a.day - b.day)
    return { thisMonthAll: all, birthdayToday: bdToday }
  }, [users])

  const monthName = MONTHS_FULL[today().getMonth()]
  const hasCelebrations = thisMonthAll.length > 0

  // Pulse the FAB if there's a celebration today
  const hasToday = thisMonthAll.some(x => x.today)

  const openModal = () => {
    setOpen(true)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 5000)

    // Show birthday hero animation first (only once per session)
    if (birthdayToday && !shownBday && !hasChecked.current) {
      hasChecked.current = true
      setTimeout(() => {
        setBdayPerson(birthdayToday)
        setShowBday(true)
      }, 300)
    }
  }

  const closeModal = () => { setOpen(false) }

  return (
    <>
      <style>{`
        @keyframes fab-pulse {
          0%,100% { transform: scale(1); box-shadow: 0 4px 20px rgba(236,72,153,.4); }
          50%      { transform: scale(1.08); box-shadow: 0 4px 30px rgba(236,72,153,.7); }
        }
        @keyframes fab-wiggle {
          0%,100% { transform: rotate(0deg) scale(1); }
          20%     { transform: rotate(-12deg) scale(1.1); }
          40%     { transform: rotate(12deg) scale(1.1); }
          60%     { transform: rotate(-6deg); }
          80%     { transform: rotate(6deg); }
        }
        @keyframes modal-in {
          from { opacity:0; transform: scale(.92) translateY(16px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        @keyframes slide-up-card {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* Confetti layer */}
      <Confetti count={90} active={confetti}/>

      {/* Birthday hero */}
      {showBday && bdayPerson && (
        <>
          <Confetti count={120} active={showBday}/>
          <BirthdayHero person={bdayPerson} onContinue={() => { setShowBday(false); setShownBday(true) }}/>
        </>
      )}

      {/* FAB */}
      <button
        onClick={openModal}
        title={hasCelebrations ? `🎉 ${thisMonthAll.length} celebration${thisMonthAll.length>1?'s':''} this month!` : '🎉 Celebrations'}
        style={{
          position:'fixed', bottom:28, right:28, zIndex:9000,
          width:54, height:54, borderRadius:'50%',
          background:'linear-gradient(135deg,#ec4899,#a78bfa)',
          border:'none', cursor:'pointer', fontSize:24,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 20px rgba(236,72,153,.4)',
          animation: hasToday ? 'fab-pulse 2s ease-in-out infinite' : 'fab-wiggle 3s 2s ease-in-out',
          transition:'transform .15s',
        }}>
        🎉
        {hasCelebrations && (
          <span style={{
            position:'absolute', top:-3, right:-3,
            width:20, height:20, borderRadius:'50%',
            background:'#f43f5e', color:'#fff',
            fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid var(--bg)',
          }}>{thisMonthAll.length}</span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={closeModal}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:9001,
            display:'flex', alignItems:'center', justifyContent:'center', padding:20,
          }}>
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              background:'var(--surface)', borderRadius:20,
              width:'100%', maxWidth:500, maxHeight:'85vh', overflow:'auto',
              border:'1px solid rgba(236,72,153,.3)',
              animation:'modal-in .4s cubic-bezier(.34,1.56,.64,1) both',
              boxShadow:'0 24px 80px rgba(0,0,0,.5), 0 0 60px rgba(236,72,153,.15)',
            }}>

            {/* Header */}
            <div style={{
              padding:'22px 22px 16px', textAlign:'center',
              borderBottom:'1px solid var(--border)',
              background:'linear-gradient(180deg,rgba(236,72,153,.08),transparent)',
              position:'relative',
            }}>
              <div style={{ fontSize:42, marginBottom:4 }}>🎊</div>
              <div style={{ fontSize:20, fontWeight:800, color:'var(--text)' }}>
                Celebrations in {monthName}
              </div>
              <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
                {thisMonthAll.length > 0
                  ? `${thisMonthAll.filter(x=>x.type==='birthday').length} birthdays · ${thisMonthAll.filter(x=>x.type==='anniversary').length} anniversaries`
                  : 'No celebrations this month'}
              </div>
              <button onClick={closeModal} style={{
                position:'absolute', top:16, right:16,
                background:'none', border:'none', cursor:'pointer',
                fontSize:18, color:'var(--text3)', borderRadius:6, padding:'4px 8px',
              }}>✕</button>
            </div>

            {/* Celebration cards */}
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {thisMonthAll.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)' }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>📅</div>
                  <div style={{ fontSize:14 }}>No birthdays or anniversaries this month.</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Make sure team members fill their profile!</div>
                </div>
              ) : (
                <>
                  {/* Today's celebrations first */}
                  {thisMonthAll.filter(x=>x.today).map((item, i) => (
                    <div key={`today-${i}`} style={{ animation:`slide-up-card .4s ${i*.08}s both` }}>
                      <CelebCard person={item.person} type={item.type} isToday={true}/>
                    </div>
                  ))}

                  {/* Upcoming */}
                  {thisMonthAll.filter(x=>!x.today).map((item, i) => (
                    <div key={`up-${i}`} style={{ animation:`slide-up-card .4s ${(i+thisMonthAll.filter(x=>x.today).length)*.06+.1}s both` }}>
                      <CelebCard person={item.person} type={item.type} isToday={false}/>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer tip */}
            <div style={{
              padding:'12px 20px 20px', textAlign:'center',
              fontSize:11, color:'var(--text3)', borderTop:'1px solid var(--border)',
              marginTop:4,
            }}>
              💡 Team members can add their birthday and anniversary in their Profile page
            </div>
          </div>
        </div>
      )}
    </>
  )
}
