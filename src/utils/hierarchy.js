export const getSubordinates = (uid, users) => {
  const res = new Set()
  const q = [uid]
  while (q.length) {
    const cur = q.shift()
    users.filter(u => u.reportsTo === cur).forEach(u => { res.add(u.id); q.push(u.id) })
  }
  return [...res]
}
export const getVisibleUserIds = (user, users) => {
  if (user.role === 'partner') return users.map(u => u.id)
  return [user.id, ...getSubordinates(user.id, users)]
}
