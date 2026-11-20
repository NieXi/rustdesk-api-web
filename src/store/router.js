import { defineStore, acceptHMRUpdate } from 'pinia'
import { lastRoutes, asyncRoutes, router } from '@/router'

function filterRoute (routes, enableNames) {
  return routes.filter(route => {
    if (route.children && route.children.length) {
      return enableNames.includes(route.name) || route.children.some(r => enableNames.includes(r.name))
    } else {
      return enableNames.includes(route.name)
    }
  }).map(route => {
    if (route.children && route.children.length) {
      return {
        ...route,
        children: filterRoute(route.children, enableNames),
      }
    } else {
      return { ...route }
    }
  })
}

export const useRouteStore = defineStore({
  id: 'router',
  state: () => ({
    routes: [],
    activeRoute: '',
    loaded: 0,
    keepAlive: [],
    // 本次登录实际注册到 router 上的动态路由名（顶层），切换账号/退出时按名删掉
    addedRouteNames: [],
  }),
  actions: {
    // 删掉上一个账号注册的动态路由（含 catch-all），否则：
    // 1. admin 的 /user、/oauth 等路由会残留给普通账号（越权可达）；
    // 2. catch-all 会重复注册。
    // 子路由（含 /oauth、/userToken 这类绝对路径子路由）随父路由一起删掉，实测 removeRoute('User') 即可。
    resetRoutes () {
      this.addedRouteNames.forEach(name => {
        if (router.hasRoute(name)) {
          router.removeRoute(name)
        }
      })
      if (router.hasRoute('CatchAll')) {
        router.removeRoute('CatchAll')
      }
      this.$patch({ routes: [], keepAlive: [], addedRouteNames: [] })
    },
    addRoutes (accessRouteNames) {
      // 先清旧账号的路由再加新账号的，同一页内换号（不刷新）也不会串权限
      this.resetRoutes()
      if (accessRouteNames.includes('*')) {
        this.routes = asyncRoutes
      } else {
        this.routes = filterRoute(asyncRoutes, accessRouteNames)
      }

      this.routes.forEach(route => {
        router.addRoute(route)
        this.addedRouteNames.push(route.name)
      })
      lastRoutes.forEach(route => {
        router.addRoute(route)
      })
      this.addKeepAlive(this.routes)
    },
    addKeepAlive (route) {
      if (route instanceof Array) {
        route.forEach(r => {
          this.addKeepAlive(r)
        })
      } else if (route.children && route.children.length) {
        this.addKeepAlive(route.children)
      } else if (route.meta?.keepAlive && !this.keepAlive.includes(route.name)) {
        this.keepAlive.push(route.name)
      }
    },

  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRouteStore, import.meta.hot))
}
