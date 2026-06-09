<script setup>
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { ref } from 'vue'

const ticket = ref({
  title: '',
  description: '',
  priority: 'medium',
  category: ''
})

const submit = async () => {
  console.log('Nouveau ticket :', ticket.value)
  // TODO: implémenter l'envoi vers l'API backend
}
</script>

<template>
  <FoLayout>
    <h1>Créer un ticket</h1>
    
    <form @submit.prevent="submit" class="ticket-form">
      <div class="form-group">
        <label for="title">Titre *</label>
        <input
          id="title"
          v-model="ticket.title"
          type="text"
          placeholder="Titre du ticket"
          required
          class="input"
        />
      </div>

      <div class="form-group">
        <label for="description">Description *</label>
        <textarea
          id="description"
          v-model="ticket.description"
          placeholder="Décrivez votre problème..."
          required
          class="input"
          rows="5"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="priority">Priorité</label>
        <select id="priority" v-model="ticket.priority" class="input">
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>

      <div class="form-group">
        <label for="category">Catégorie</label>
        <input
          id="category"
          v-model="ticket.category"
          type="text"
          placeholder="Ex: Matériel, Logiciel..."
          class="input"
        />
      </div>

      <button type="submit" class="btn-primary">Soumettre le ticket</button>
    </form>
  </FoLayout>
</template>

<style scoped>
h1 {
  margin-top: 0;
  color: #111827;
}

.ticket-form {
  max-width: 600px;
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
}

label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
  font-size: 0.95rem;
}

.input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.15s;
}

.input:focus {
  outline: none;
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
}

.input:placeholder-shown {
  color: #9ca3af;
}

textarea.input {
  resize: vertical;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #0f766e;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 1rem;
}

.btn-primary:hover {
  background: #0d5d57;
}

.btn-primary:active {
  transform: scale(0.98);
}
</style>
