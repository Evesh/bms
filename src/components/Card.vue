<template>
  <div class="card" :class="{ 'has-change': delta !== 0 }">
    <span class="card-title">{{ title }}</span>

    <div class="card-body">
      <div class="card-value">{{ formattedValue }}</div>
      <div v-if="previousValue !== null && delta !== 0" class="card-delta" :class="deltaClass">
        {{ deltaSign }}{{ Math.abs(delta).toFixed(2) }}
      </div>
      <div class="unit">{{ vtype }}</div>



      <!-- <div class="sparkline-placeholder" v-if="points">
        <svg v-if="points" class="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline :points="points" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div> -->


    </div>

    <div class="status-bar" :class="deltaClass"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  title?: string
  value?: number
  vtype?: string
}>()


const previousValue = ref<number | null>(null)
const history = ref<number[]>([])

watch(
  () => props.value,
  (newVal, oldVal) => {
    if (newVal === undefined) return

    // Fix: capture previous value so delta actually works
    if (oldVal !== undefined) {
      previousValue.value = oldVal
    }

    history.value.push(newVal)

    if (history.value.length > 30) {
      history.value.shift()
    }
  },
  { immediate: true }
)

const delta = computed(() => {
  if (previousValue.value === null || props.value === undefined) return 0
  return Number((props.value - previousValue.value).toFixed(3))
})

const formattedValue = computed(() => {
  return (props.value !== undefined ? props.value : 0).toFixed(2)
})

const deltaSign = computed(() => (delta.value > 0 ? '↑' : '↓'))

const deltaClass = computed(() => {
  if (delta.value > 0) return 'up'
  if (delta.value < 0) return 'down'
  return 'same'
})

</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 130px;
  min-width: 120px;
  height: 130px;
  min-height: 120px;
  padding: 18px;
  background: var(--card-bg);
  color: var(--text-color);
  border-radius: 24px;
  /* Более мягкие углы */
  border: 1px solid var(--border-color);
  box-shadow: var(--box-shadow);

  backdrop-filter: blur(12px);
  /* Размытие фона за карточкой */

  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  user-select: none;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.07);
  border-color: rgba(0, 0, 0, 0.08);
}


.card-title {
  display: flex;
  justify-content: center;

  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-main);
  text-transform: uppercase;
  letter-spacing: 0.09em;
}

.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-main);
  /* Slate 800 */
  font-variant-numeric: tabular-nums;
  /* Чтобы цифры не прыгали при изменении */
}

.unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
}

/* Стили дельты (изменений) */
.card-delta {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 8px;
  background: var(--card-bg);
}

.card-delta.up {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
}

.card-delta.down {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

/* Нижняя полоска-индикатор */
.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: transparent;
  transition: background 0.3s ease;
}

.status-bar.up {
  background: #10b981;
}

.status-bar.down {
  background: #ef4444;
}

/* Анимация при обновлении значения */
.has-change .card-value {
  animation: value-pop 0.3s ease-out;
}

@keyframes value-pop {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
    color: #18a058;
  }

  100% {
    transform: scale(1);
  }
}


.sparkline-placeholder {
  position: absolute;
  bottom: 10px;
  width: 100%;
  height: 30px;
  margin-top: 8px;
}

.sparkline {
  width: 100%;
  height: 30px;

  margin-top: 8px;
  opacity: 0.7;
}

.card.up .sparkline {
  color: #16a34a;
}

.card.down .sparkline {
  color: #dc2626;
}

.card.same .sparkline {
  color: #6b7280;
}
</style>
