<template>
  <div id="app">
    <header class="app-header">
      <div class="brand">
        <h1>NewApp GLPI</h1>
      </div>
      <nav class="top-nav">
        <router-link to="/elements">📋 Éléments</router-link>
        <router-link to="/nouveau-ticket">➕ Nouveau ticket</router-link>
        <router-link to="/kanban"> Tableau Kanban </router-link>
        <div class="nav-separator"></div>
        <router-link to="/login">Connexion</router-link>
        <router-link to="/admin/dashboard">Tableau de bord</router-link>
        <router-link to="/admin/import">Importer</router-link>
        <router-link to="/admin/reset">Réinitialiser</router-link>
      </nav>
    </header>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: dark light;
}
html, body {
  margin: 0;
  min-height: 100%;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
#app {
  min-height: 100vh;
}
.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: #1e293b;
  color: #f8fafc;
}
.brand h1 {
  margin: 0;
  font-size: 1.5rem;
}
.brand p {
  margin: 0.4rem 0 0;
  color: #cbd5e1;
  font-size: 0.95rem;
}
.top-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.top-nav a {
  color: #cbd5e1;
  text-decoration: none;
  padding: 0.55rem 0.95rem;
  border-radius: 9999px;
  background: rgba(255,255,255,0.08);
  transition: background 0.2s ease, color 0.2s ease;
}
.top-nav a.router-link-active {
  background: #2563eb;
  color: #fff;
}
.top-nav a:hover {
  background: rgba(255,255,255,0.16);
}
.nav-separator {
  width: 1px;
  height: 1.5rem;
  background: rgba(255,255,255,0.2);
  margin: 0 0.25rem;
}
.app-main {
  padding: 2rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
