<script setup>
</script>

<template>
  <main class="home">
    <section class="hero">
      <p class="eyebrow">NewApp GLPI</p>
      <h1>Base de l'application</h1>
      <p>
        Cette version garde une structure simple et centrale pour démarrer le
        projet NewApp GLPI.
      </p>
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

</style>