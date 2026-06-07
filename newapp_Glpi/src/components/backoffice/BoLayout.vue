<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const links = [
  { name: 'dashboard', label: 'Tableau de bord', icon: '📊' },
  { name: 'import', label: 'Importer', icon: '📥' },
  { name: 'reset', label: 'Réinitialiser', icon: '🔄' },
  { name: 'tickets', label: 'Tickets', icon: '🎫' },
]

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="bo">
    <aside class="bo-sidebar">
      <div class="bo-brand">NewApp <span>BackOffice</span></div>
      <nav>
        <router-link
          v-for="l in links"
          :key="l.name"
          :to="{ name: l.name }"
          class="bo-link"
          active-class="active"
        >
          <span class="ic">{{ l.icon }}</span> {{ l.label }}
        </router-link>
      </nav>
      <button class="bo-logout" @click="handleLogout">⎋ Déconnexion</button>
    </aside>

    <main class="bo-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.bo {
  display: flex;
  min-height: 100vh;
}
.bo-sidebar {
  width: 240px;
  background: #1e293b;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
}
.bo-brand {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 2rem;
}
.bo-brand span {
  display: block;
  font-size: 0.8rem;
  font-weight: 400;
  color: #94a3b8;
}
.bo-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.8rem;
  margin-bottom: 0.3rem;
  border-radius: 8px;
  color: #cbd5e1;
  text-decoration: none;
  transition: background 0.15s;
}
.bo-link:hover {
  background: #334155;
}
.bo-link.active {
  background: #2563eb;
  color: #fff;
}
.ic {
  width: 1.3rem;
  text-align: center;
}
.bo-logout {
  margin-top: auto;
  background: transparent;
  border: 1px solid #475569;
  color: #e2e8f0;
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
}
.bo-logout:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}
.bo-content {
  flex: 1;
  padding: 2rem;
  overflow: auto;
}
</style>