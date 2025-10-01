import './assets/main.css'
import type { } from '@shared/types'
import 'element-plus/dist/index.css'
import { loadLive2DCore } from './utils/loadLive2d'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'


loadLive2DCore()
  .then(() => {
    const app = createApp(App)
    app.use(router)
    app.mount('#app')
  })
  .catch(
    e => {
      alert(`启动异常:${e}`)
    }
  )






// 禁止刷新快捷键
window.addEventListener('keydown', (e) => {
  if (
    (e.key === 'F5') ||
    (e.ctrlKey && e.key.toLowerCase() === 'r') ||
    (e.metaKey && e.key.toLowerCase() === 'r')
  ) {
    e.preventDefault();
  }
});


