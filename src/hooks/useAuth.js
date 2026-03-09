import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

export const useAuth = () => {
  const [firebaseUser, setFirebaseUser] = useState(undefined)
  const [userProfile,  setUserProfile]  = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        setFirebaseUser(fbUser)
        const snap = await getDoc(doc(db,'users',fbUser.uid))
        if (snap.exists()) setUserProfile({ id:fbUser.uid, ...snap.data() })
        else setUserProfile(null)
      } else {
        setFirebaseUser(null)
        setUserProfile(null)
      }
    })
    return unsub
  }, [])

  const login       = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout      = () => signOut(auth)
  const createUser  = (email, password) => createUserWithEmailAndPassword(auth, email, password)
  const resetPwd    = email => sendPasswordResetEmail(auth, email)

  return { firebaseUser, userProfile, login, logout, createUser, resetPwd, loading: firebaseUser === undefined }
}
