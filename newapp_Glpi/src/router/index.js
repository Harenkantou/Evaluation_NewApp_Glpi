import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Vues BackOffice
import LoginView from '@/views/backoffice/LoginView.vue'
import DashboardView from '@/views/backoffice/DashboardView.vue'
import ImportView from '@/views/backoffice/ImportView.vue'
import ResetView from '@/views/backoffice/ResetView.vue'
import TicketsView from '@/views/backoffice/TicketsView.vue'
import GlpiTicketsView from '@/views/glpi/GlpiTicketsView.vue'

const routes = [
  { path: '/', redirect: '/admin/dashboard' },

  // Page publique de connexion
  { path: '/login', name: 'login', component: LoginView },

  // Pages protégées du BackOffice (meta.requiresAuth)
  { path: '/admin', redirect: '/admin/dashboard', meta: { requiresAuth: true } },
  { path: '/admin/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/admin/import', name: 'import', component: ImportView, meta: { requiresAuth: true } },
  { path: '/admin/reset', name: 'reset', component: ResetView, meta: { requiresAuth: true } },
  { path: '/admin/tickets', name: 'tickets', component: TicketsView, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Garde globale : protège les routes meta.requiresAuth (énoncé 1.a).
 */
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
