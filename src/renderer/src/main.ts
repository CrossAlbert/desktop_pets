import './assets/main.css'
import type {} from '@shared/types'
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')


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


