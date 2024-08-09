const { Server: ServerIO } = require('socket.io')
const { io: ClientIO } = require('socket.io-client')
const { readHostList } = require('../utils')
const { clientPort } = require('../config')
const { verifyAuthSync } = require('../utils')

let clientSockets = []
let clientsData = {}

async function getClientsInfo(clientSockets) {
  let hostList = await readHostList()
  clientSockets.forEach((clientItem) => {
    // 被删除的客户端断开连接
    if (!hostList.some(item => item.host === clientItem.host)) clientItem.close && clientItem.close()
  })
  hostList
    .map(({ host, name }) => {
      if (clientSockets.some(item => item.host === host)) return { name, isIo: true } // 已经建立io连接(无论是否连接成功)的host不再重复建立连接,因为存在多次(reconnectionAttempts)的重试机制
      let clientSocket = ClientIO(`http://${ host }:${ clientPort }`, {
        path: '/client/os-info',
        forceNew: true,
        timeout: 5000,
        reconnectionDelay: 5000,
        reconnectionAttempts: 1000
      })
      // 将与客户端连接的socket实例保存起来，web端断开时关闭这些连接
      clientSockets.push({ host, name, clientSocket })
      return {
        host,
        name,
        clientSocket
      }
    })
    .forEach((item) => {
      if (item.isIo) return // console.log('已经建立io连接的host不再重复建立连接', item.name)
      const { host, name, clientSocket } = item
      // clientsData[host] = { connect: false }
      clientSocket
        .on('connect', () => {
          consola.success('client connect success:', host, name)
          clientSocket.on('client_data', (osData) => {
            clientsData[host] = { connect: true, ...osData }
          })
          clientSocket.on('client_error', (error) => {
            clientsData[host] = { connect: true, error: `client_error: ${ error }` }
          })
        })
        .on('connect_error', (error) => { // 连接失败
          // consola.error('client connect fail:', host, name, error.message)
          clientsData[host] = { connect: false, error: `client_connect_error: ${ error }` }
        })
        .on('disconnect', (error) => { // 一方主动断开连接
          // consola.info('client connect disconnect:', host, name)
          clientsData[host] = { connect: false, error: `client_disconnect: ${ error }` }
        })
    })
}

module.exports = (httpServer) => {
  const serverIo = new ServerIO(httpServer, {
    path: '/clients',
    cors: {
      origin: '*' // 需配置跨域
    }
  })

  serverIo.on('connection', (socket) => {
    // 前者兼容nginx反代, 后者兼容nodejs自身服务
    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address
    socket.on('init_clients_data', async ({ token }) => {
      const { code, msg } = await verifyAuthSync(token, clientIp)
      if (code !== 1) {
        socket.emit('token_verify_fail', msg || '鉴权失败')
        socket.disconnect()
        return
      }

      getClientsInfo(clientSockets)

      socket.on('refresh_clients_data', async () => {
        consola.info('refresh clients-socket')
        getClientsInfo(clientSockets)
      })

      let timer = null
      timer = setInterval(() => {
        socket.emit('clients_data', clientsData)
      }, 1000)

      socket.on('disconnect', () => {
        if (timer) clearInterval(timer)
        clientSockets.forEach(item => item.clientSocket.close && item.clientSocket.close())
        clientSockets = []
        clientsData = {}
        consola.info('clients-socket 连接断开: ', socket.id)
      })
    })
  })
}
