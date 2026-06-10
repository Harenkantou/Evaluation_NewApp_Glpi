<script setup>
// FrontOffice public : pas d'authentification, pas de deconnexion.
// Juste un menu de navigation partage par les pages publiques.
const links = [
  { name: 'fo-elements', label: 'Éléments', icon: '📋' },
  { name: 'fo-create-ticket', label: 'Nouveau ticket', icon: '➕' },
  { name: 'fo-kanban', label: 'Tableau Kanban', icon: '📋'}
]
</script>

<template>
  <div class="fo">
    <header class="fo-header">
      <div class="fo-brand">NewApp <span>FrontOffice</span></div>
      <nav class="fo-nav">
        <router-link
          v-for="l in links"
          :key="l.name"
          :to="{ name: l.name }"
          class="fo-link"
          active-class="active"
        >
          <span class="ic">{{ l.icon }}</span> {{ l.label }}
        </router-link>
      </nav>
    </header>

    <main class="fo-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.fo {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.fo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0f766e;            /* teal, pour distinguer du BackOffice */
  color: #fff;
  padding: 0.9rem 2rem;
}
.fo-brand {
  font-size: 1.3rem;
  font-weight: 700;
}
.fo-brand span {
  font-size: 0.8rem;
  font-weight: 400;
  color: #99f6e4;
  margin-left: 0.3rem;
}
.fo-nav {
  display: flex;
  gap: 0.5rem;
}
.fo-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  color: #e2e8f0;
  text-decoration: none;
  transition: background 0.15s;
}
.fo-link:hover {
  background: rgba(255, 255, 255, 0.15);
}
.fo-link.active {
  background: #fff;
  color: #0f766e;
}
.ic {
  font-size: 1rem;
}
.fo-content {
  flex: 1;
  padding: 2rem;
  background: #f4f6f9;
}
</style>