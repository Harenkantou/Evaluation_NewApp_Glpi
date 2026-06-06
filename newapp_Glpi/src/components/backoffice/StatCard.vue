<script setup>
defineProps({
  label: String,
  value: [String, Number],
  icon: String
})
</script>

<template>
  <div class="stat-card">
    <div class="icon">{{ icon }}</div>
    <div class="info">
      <div class="value">{{ value }}</div>
      <div class="label">{{ label }}</div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
  min-width: 200px;
}
.icon {
  font-size: 2.5rem;
  background: #f1f5f9;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
}
.info {
  display: flex;
  flex-direction: column;
}
.value {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}
.label {
  color: #64748b;
  font-size: 1rem;
  font-weight: 500;
}
</style>
