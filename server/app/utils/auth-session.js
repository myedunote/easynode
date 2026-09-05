const socketServers = new Set()
const rdpSockets = new Set()
const getSessionRoom = session => `auth-session:${ session }`

const registerSocketServer = (serverIo) => {
  socketServers.add(serverIo)
  serverIo.on('connection', (socket) => {
    const session = socket.data?.authSession
    if (session) socket.join(getSessionRoom(session))
  })
  return serverIo
}

const registerRdpSocket = (socket) => {
  rdpSockets.add(socket)
  socket.once('close', () => rdpSockets.delete(socket))
}

const revokeAllSessions = async (sessionStore) => {
  return sessionStore.updateAsync(
    {},
    { $set: { revoked: true } },
    { multi: true }
  )
}

const disconnectAllSessionConnections = () => {
  for (const serverIo of socketServers) serverIo.disconnectSockets(true)
  for (const socket of rdpSockets) socket.destroy()
  rdpSockets.clear()
}

const disconnectSessionConnections = (session) => {
  if (!session) return
  const room = getSessionRoom(session)
  for (const serverIo of socketServers) serverIo.in(room).disconnectSockets(true)
}

export {
  disconnectAllSessionConnections,
  disconnectSessionConnections,
  registerRdpSocket,
  registerSocketServer,
  revokeAllSessions
}
