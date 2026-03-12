import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, doc, addDoc, updateDoc, setDoc, where,
  writeBatch, serverTimestamp, arrayUnion, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { ROLE_ORDER } from '../constants.js'

export const useCollection = (name) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    if(!name) return
    let unsub
    const subscribe = () => {
      unsub = onSnapshot(
        query(collection(db, name)),
        snap => { setData(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false) },
        err  => { console.error('Firestore listener error:', name, err); setLoading(false); setTimeout(subscribe, 3000) }
      )
    }
    subscribe()
    return () => unsub?.()
  },[name])
  return { data, loading }
}

// Get client IDs visible to a given user
export const getVisibleClientIds = (user, users, clients) => {
  if (['partner','hod','sales'].includes(user.role)) return clients.map(c=>c.id)
  if (user.role === 'team_leader') {
    const subIds = getSubordinateIds(user.id, users)
    return clients.filter(c=>[user.id,...subIds].includes(c.assignedTo)).map(c=>c.id)
  }
  return clients.filter(c=>c.assignedTo===user.id).map(c=>c.id)
}
const getSubordinateIds = (uid, users) => {
  const res=[]; const q=[uid]
  while(q.length){ const cur=q.shift(); users.filter(u=>u.reportsTo===cur).forEach(u=>{res.push(u.id);q.push(u.id)}) }
  return res
}

export const saveUser    = (uid, data) => setDoc(doc(db,'users',uid), data, {merge:true})
export const updateUser  = (uid, data) => updateDoc(doc(db,'users',uid), {...data, updatedAt:serverTimestamp()})
export const addClient   = data => addDoc(collection(db,'clients'), {...data, clientStatus:'active', createdAt:serverTimestamp()})
export const updateClient= (id, data) => updateDoc(doc(db,'clients',id), {...data, updatedAt:serverTimestamp()})
export const setClientStatus = (cid, st) => updateClient(cid, {clientStatus:st})
export const addTask     = data => addDoc(collection(db,'tasks'), data)
export const updateTask  = (id, data) => updateDoc(doc(db,'tasks',id), {...data, updatedAt:serverTimestamp()})
export const deleteTask   = id => deleteDoc(doc(db,'tasks',id))
export const deleteClient = id => deleteDoc(doc(db,'clients',id))
export const addTaskComment = (tid, comment) => updateDoc(doc(db,'tasks',tid), {comments:arrayUnion(comment), updatedAt:serverTimestamp()})

export const bulkAddTasks = async arr => {
  const chunks=[]
  for(let i=0;i<arr.length;i+=499) chunks.push(arr.slice(i,i+499))
  for(const chunk of chunks){
    const b=writeBatch(db)
    chunk.forEach(t=>b.set(doc(collection(db,'tasks')),t))
    await b.commit()
  }
}

export const bulkReassignClientTasks = async (clientId, newAssigneeId, currentTasks) => {
  const DONE=['filed','nil_filed','completed','paid','itr_filed','no_profits','na','no_employee','nil','cancelled','not_to_be_filed','late','delayed_filing','differences_resolved','customer_refused','iff_filed','no_iff','unregistered','payment_made']
  const b=writeBatch(db)
  currentTasks.filter(t=>t.clientId===clientId&&!DONE.includes(t.status)).forEach(t=>b.update(doc(db,'tasks',t.id),{assignedTo:newAssigneeId,updatedAt:serverTimestamp()}))
  await b.commit()
  await updateClient(clientId,{assignedTo:newAssigneeId})
}

// ── Credentials ────────────────────────────────────────────
export const getClientCredentials = (clientId, onData) => {
  const q = query(collection(db,'credentials'), where('clientId','==',clientId))
  return onSnapshot(q, snap => onData(snap.docs.map(d=>({id:d.id,...d.data()}))))
}
export const upsertCredential = async (clientId, service, data) => {
  // Find existing doc for this client+service
  const { getDocs } = await import('firebase/firestore')
  const q = query(collection(db,'credentials'), where('clientId','==',clientId), where('service','==',service))
  const snap = await getDocs(q)
  if (!snap.empty) {
    return updateDoc(doc(db,'credentials',snap.docs[0].id), {...data, updatedAt:serverTimestamp()})
  }
  return addDoc(collection(db,'credentials'), {...data, clientId, service, createdAt:serverTimestamp(), updatedAt:serverTimestamp()})
}
export const deleteCredential = id => deleteDoc(doc(db,'credentials',id))
