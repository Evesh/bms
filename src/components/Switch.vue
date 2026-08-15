<template>
  <div class="switch-card" :class="{ 'is-active': isActive, 'is-disabled': disabled }">
    <span class="switch-label">{{ title }}</span>
    <n-switch v-model:value="isActive" size="medium" :disabled="disabled">
      <template #checked>ON</template>
      <template #unchecked>OFF</template>
    </n-switch>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSwitch } from 'naive-ui'

const props = defineProps<{
  title: string,
  active: boolean,
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:active', value: boolean): void
}>()

const isActive = computed({
  get() {
    return props.active
  },
  set(value) {
    emit('update:active', value)
  }
})
</script>

<style scoped>
.switch-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;

  width: 140px;
  padding: 16px;

  background: var(--card-bg);
  border-radius: 20px;
  border: 1px solid var(--border-color);

  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05),
    0 8px 10px -6px rgba(0, 0, 0, 0.05);

  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.switch-card.is-active {
  border-color: rgba(24, 160, 88, 0.3);
  background-color: var(--card-bg-active);
}

.switch-card.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.switch-card:not(.is-disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08);
}

.switch-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.3s ease;
}

.is-active .switch-label {
  color: var(--text-main);
}

:deep(.n-switch) {
  --n-rail-color-active: #18a058 !important;
}
</style>
