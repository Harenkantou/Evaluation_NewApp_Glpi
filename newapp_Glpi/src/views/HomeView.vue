<script setup>
</script>

<template>
  <main class="home">
    <section class="hero">
      <p class="eyebrow">NewApp GLPI</p>
      <h1>Bienvenue</h1>
      <p>
        Veuillez choisir votre espace :
      </p>

      <div class="action-buttons">
        <router-link to="/elements" class="btn btn-primary">
          📋 FrontOffice - Consulter et créer des tickets
        </router-link>
        <router-link to="/login" class="btn btn-secondary">
          🔐 BackOffice - Administration
        </router-link>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: radial-gradient(circle at top, #e0e7ff 0%, #f8fafc 55%, #ffffff 100%);
  color: #111827;
}

.hero {
  max-width: 760px;
  padding: 2.5rem;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
}

.eyebrow {
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.75rem;
  color: #4f46e5;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.05;
}

p {
  font-size: 1.05rem;
  line-height: 1.65;
  color: #334155;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 1rem 1.5rem;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: inline-block;
  text-align: center;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-secondary:hover {
  background: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

</style>