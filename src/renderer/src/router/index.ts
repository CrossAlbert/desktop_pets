import { createRouter, createWebHashHistory } from 'vue-router'
import ManagePages from '@renderer/view/ManagePage.vue'
import PetPage from '@renderer/view/PetPage.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/manage',
      name: 'manage',
      component: ManagePages,
    },
    {
      path: '/pet/:name/:petFilePath/:liveName',
      name: 'pet',
      component: PetPage,
    }
  ]
})

export default router
