import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Vues BackOffice
import LoginView from '@/views/backoffice/LoginView.vue'
import DashboardView from '@/views/backoffice/DashboardView.vue'
import ImportView from '@/views/backoffice/ImportView.vue'
import ImportTicketCSV from '@/views/backoffice/ImportTicketCSV.vue'
import ResetView from '@/views/backoffice/ResetView.vue'
import TicketsView from '@/views/backoffice/TicketsView.vue'
import TicketDetailView from '@/views/backoffice/TicketDetailView.vue'
import KanbanSettingsView from '@/views/backoffice/KanbanSettingsView.vue'

// Vue CostManagement (importer directement au lieu du lazy loading)
import CostManagement from '@/views/backoffice/CostManagement.vue'

// routes frontoffice
import HomeView from '@/views/HomeView.vue'
import ElementListView from '@/views/frontoffice/ElementListView.vue'
import CreateTicketView from '@/views/frontoffice/CreateTicketView.vue'
import KanbanView from '@/views/frontoffice/KanbanView.vue'
import FoTicketDetailView from '@/views/frontoffice/TicketDetailView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },

  // Page publique de connexion
  { path: '/login', name: 'login', component: LoginView },

  // Pages protégées du BackOffice (meta.requiresAuth)
  { path: '/admin', redirect: '/admin/dashboard', meta: { requiresAuth: true } },
  { path: '/admin/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/admin/import', name: 'import', component: ImportView, meta: { requiresAuth: true } },
  { path: '/admin/import-ticket-csv', name: 'import-ticket-csv', component: ImportTicketCSV, meta: { requiresAuth: true } },
  { path: '/admin/reset', name: 'reset', component: ResetView, meta: { requiresAuth: true } },
  { path: '/admin/tickets', name: 'tickets', component: TicketsView, meta: { requiresAuth: true } },
  { path: '/admin/tickets/:id', name: 'ticket-detail', component: TicketDetailView, meta: { requiresAuth: true } },
  { path: '/admin/kanban-settings', name: 'kanban-settings', component: KanbanSettingsView, meta: { requiresAuth: true } },
  
  // Route CostManagement - CORRIGÉE
  {
    path: '/backoffice/costs',
    name: 'CostManagement',
    component: CostManagement,  // Import direct au lieu de lazy loading
    meta: { requiresAuth: true }
  },
  
  // Pages FrontOffice sans auth
  { path: '/elements', name: 'fo-elements', component: ElementListView },
  { path: '/nouveau-ticket', name: 'fo-create-ticket', component: CreateTicketView },
  { path: '/tickets/:id', name: 'fo-ticket-detail', component: FoTicketDetailView },
  { path: '/kanban', name: 'fo-kanban', component: KanbanView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Garde globale : protège les routes meta.requiresAuth
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
