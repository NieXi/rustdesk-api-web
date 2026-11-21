import { ref } from 'vue'
import en from '@/utils/i18n/en.json'
import zhCN from '@/utils/i18n/zh_CN.json'
import { useAppStore } from '@/store/app'

// 只把默认语言 zh-CN 和 fallback en 打进首屏包，
// 其余 5 种语言第一次用到时再动态加载。
const trans = {
  'en': en,
  'zh-CN': zhCN,
}
const loaders = {
  'fr': () => import('@/utils/i18n/fr.json'),
  'ko': () => import('@/utils/i18n/ko.json'),
  'ru': () => import('@/utils/i18n/ru.json'),
  'es': () => import('@/utils/i18n/es.json'),
  'zh-TW': () => import('@/utils/i18n/zh_TW.json'),
}
const loading = new Set()
// 响应式版本号：语言包加载完后 +1，触发用到 T() 的模板重新渲染
const loadedVersion = ref(0)
function ensureLang (lang) {
  if (trans[lang] || !loaders[lang] || loading.has(lang)) {
    return
  }
  loading.add(lang)
  loaders[lang]().then(m => {
    trans[lang] = m.default
    loadedVersion.value++
  }).catch(() => loading.delete(lang))
}
export function T (key, params, num = 0) {
  // 读一下版本号，让模板追踪它，语言包到货后自动重渲染
  // eslint-disable-next-line no-unused-expressions
  loadedVersion.value
  const appStore = useAppStore()
  const lang = appStore.setting.lang
  ensureLang(lang)
  const tran = trans[lang]?.[key]
  if (!tran) {
    return key
  }
  const msg = num > 1 ? (tran.Other ? tran.Other : tran.One) : tran.One
  //msg 是这样 {name} is name
  //params 是这样 {name: 'zhangsan'}
  //替换
  return msg.replace(/{(\w+)}/g, function (match, key) {
    return params[key] || match
  })
}
