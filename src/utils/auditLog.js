import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { LOG_ACTIONS } from '../constants.js'

export const writeLog = async ({ action, by, entityId='', entityName='', clientId='', clientName='', oldValue=null, newValue=null, note='' }) => {
  try {
    await addDoc(collection(db,'logs'), {
      action, by:{ id:by.id, name:by.name }, entityId, entityName,
      clientId, clientName, oldValue, newValue, note,
      createdAt: serverTimestamp(),
      createdAtISO: new Date().toISOString(),
    })
  } catch(e) { console.warn('Log write failed:',e.message) }
}

export const logClientOnboarded      = (c,by) => writeLog({ action:LOG_ACTIONS.CLIENT_ONBOARDED, by, entityId:c.id, entityName:c.name, clientId:c.id, clientName:c.name, newValue:c.constitution, note:`FY ${c.fy}` })
export const logClientStatusChanged  = (c,oldS,newS,by) => writeLog({ action:LOG_ACTIONS.CLIENT_STATUS_CHANGED, by, entityId:c.id, entityName:c.name, clientId:c.id, clientName:c.name, oldValue:oldS, newValue:newS })
export const logTaskStatusChanged    = (t,oldS,newS,by,ref='') => writeLog({ action:LOG_ACTIONS.TASK_STATUS_CHANGED, by, entityId:t.id, entityName:`${t.service} — ${t.period}`, clientId:t.clientId, clientName:t.clientName, oldValue:oldS, newValue:newS, note:ref?`Ref: ${ref}`:'' })
export const logTaskReassigned       = (t,oldN,newN,by) => writeLog({ action:LOG_ACTIONS.TASK_REASSIGNED, by, entityId:t.id, entityName:`${t.service} — ${t.period}`, clientId:t.clientId, clientName:t.clientName, oldValue:oldN, newValue:newN })
export const logClientReassigned     = (c,oldN,newN,by) => writeLog({ action:LOG_ACTIONS.CLIENT_REASSIGNED, by, entityId:c.id, entityName:c.name, clientId:c.id, clientName:c.name, oldValue:oldN, newValue:newN })
export const logCommentAdded         = (t,text,by) => writeLog({ action:LOG_ACTIONS.COMMENT_ADDED, by, entityId:t.id, entityName:`${t.service} — ${t.period}`, clientId:t.clientId, clientName:t.clientName, note:text })
export const logUserCreated          = (u,by) => writeLog({ action:LOG_ACTIONS.USER_CREATED, by, entityName:u.name, newValue:u.role })

export const subscribeLogs = (onData, count=300, filterClientId=null) => {
  const col = collection(db,'logs')
  const q = filterClientId
    ? query(col, where('clientId','==',filterClientId), orderBy('createdAt','desc'), limit(count))
    : query(col, orderBy('createdAt','desc'), limit(count))
  return onSnapshot(q, snap => onData(snap.docs.map(d=>({id:d.id,...d.data()}))))
}
