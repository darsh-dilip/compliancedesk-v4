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
  if (user.role === 'partner' || user.role === 'sales') return users.map(u => u.id)
  return [user.id, ...getSubordinates(user.id, users)]
}

export const getVisibleClientIds = (user, users, clients) => {
  // Partner and Sales see all clients
  if (user.role === 'partner' || user.role === 'sales') return clients.map(c => c.id)
  // Everyone else sees clients assigned to themselves or their subordinates
  const visibleUserIds = new Set(getVisibleUserIds(user, users))
  return clients.filter(c => visibleUserIds.has(c.assignedTo)).map(c => c.id)
}
