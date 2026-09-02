import { apiPrefix } from '../config/index.js'
import koaRouter from 'koa-router'
const router = new koaRouter({ prefix: apiPrefix })

import routeList from './routes.js'

// 统一注册路由
routeList.forEach(item => {
  const { method, path, controller, middlewares = [] } = item
  router[method](path, ...middlewares, controller)
})

export default router
