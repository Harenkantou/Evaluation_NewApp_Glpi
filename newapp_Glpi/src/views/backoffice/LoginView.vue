<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const code = ref('')
const error = ref('')

// Pré-remplir le champ avec le code par défaut (énoncé 1.a)
onMounted(() => {
  code.value = auth.getDefaultCode()
})

function submit() {
  error.value = ''
  if (auth.login(code.value)) {
    const redirect = route.query.redirect || { name: 'dashboard' }
    router.push(redirect)
  } else {
    error.value = 'Code invalide.'
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="submit">
      <h1>NewApp</h1>
      <p class="subtitle">BackOffice — accès protégé</p>

      <label for="code">Code d'accès</label>
      <input
        id="code"
        v-model="code"
        type="password"
        autocomplete="off"
        placeholder="Entrez le code"
      />
      <p class="hint">Code par défaut : <strong>admin</strong></p>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit">Entrer</button>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e293b, #2563eb);
}
.login-card {
  background: #fff;
  padding: 2.5rem;
  border-radius: 14px;
  width: 340px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
}
h1 { margin: 0; color: #1e293b; }
.subtitle { margin: 0.3rem 0 1.5rem; color: #64748b; font-size: 0.9rem; }
label { font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; color: #334155; }
input {
  padding: 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
}
input:focus { outline: none; border-color: #2563eb; }
button {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}
.error {
  color: #dc2626;
  background: #fee2e2;
  padding: 0.6rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin: 0 0 1rem;
}
</style>