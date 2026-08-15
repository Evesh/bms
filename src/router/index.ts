import { createRouter, createWebHistory } from 'vue-router'
import Connection from '@/views/Connection.vue'
import Dashboard from '@/views/Dashboard.vue'
import Settings from '@/views/Settings.vue'
import { useBmsBle } from '@/composable/useBmsBle'

const routes = [
  {
    path: '/',
    name: 'connection',
    component: Connection
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const { isConnected } = useBmsBle()

  if (!isConnected.value && to.name !== 'connection') {
    return { name: 'connection' }
  }
})

export default router
