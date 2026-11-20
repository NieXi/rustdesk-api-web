import { router } from '@/router'
import { useRouteStore } from '@/store/router'
import { useUserStore } from '@/store/user'
import { getToken } from '@/utils/auth'
import { pinia } from '@/store'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css'
import { useAppStore } from '@/store/app' // progress bar style
import { T } from '@/utils/i18n'

NProgress.configure({ showSpinner: false }) // NProgress Configuration

const whiteList = ['/login', '/register']
const routeStore = useRouteStore(pinia)
const appStore = useAppStore(pinia)
appStore.getAdminConfig()
router.beforeEach(async (to, from, next) => {

  document.title = T(to.meta?.title) + ' - ' + appStore.setting.title
  NProgress.start()

  const token = getToken()
  if (!token) {
    //无token，跳转到登录
    if (whiteList.indexOf(to.path) !== -1) {
      next()
    } else {
      next(`/login?redirect=${to.path}`)
    }

  } else {
    //有token

    const userStore = useUserStore(pinia)

    if (!userStore.route_names.length) {
      const info = await userStore.info()
      if (!info) {
        userStore.logout()
        next(`/login?redirect=${to.path}`)
      } else if (to.path !== '/404') {
        // 刚按当前账号权限加完路由，目标页可能根本不在该账号的路由表里
        // （比如刷新停在 admin 的 /user/index 上再以普通账号进），直接 next({...to})
        // 只会命中 catch-all 跳 404，改回首页。
        const resolved = router.resolve(to.fullPath)
        const matched = resolved.matched
        if (!matched.length || matched[matched.length - 1].path === '/:catchAll(.*)') {
          next({ path: '/', replace: true })
        } else {
          next({ ...to, replace: true })
        }
      } else {
        next({ ...to, replace: true })
      }
    }/* else if (to.path === '/404') {
      next({path: to.redirectedFrom?.fullPath, replace: true})
    }*/ else {
      next()
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})
