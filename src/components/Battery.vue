<template>
  <div class="container">

    <div class="battery-index" :class="{ 'battery-min': isMinValue, 'battery-max': isMaxValue }">
      <span>{{ index + 1 }}</span>
    </div>

    <div class="battery">
      <div v-for="i in 5" :key="i" :class="getBarClass(i)" />
      <div class="badge">{{ formattedVoltage }}</div>
    </div>

    <div class="balancing-slot">
      <div class="balancing-icon" :class="{ visible: isBalancing }">
        <n-icon size="22" color="#f1c40f">
          <BoltRound />
        </n-icon>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { BoltRound } from '@vicons/material'

const props = defineProps<{
  index: number
  voltage: number
  isBalancing: boolean
  isMinValue: boolean
  isMaxValue: boolean
}>()



const batteryMeta = computed(() => {
  const v = props.voltage

  if (v < 3.2) return { level: 0, status: 'empty' }
  if (v < 3.4) return { level: 2, status: 'low' }
  if (v < 3.8) return { level: 3, status: 'medium' }
  if (v < 4.0) return { level: 4, status: 'high' }

  return { level: 5, status: 'high' }
})


const getBarClass = (i: number) => [
  'bar',
  batteryMeta.value.status,
  { filled: i <= batteryMeta.value.level }
]


const formattedVoltage = computed(() => props.voltage.toFixed(3))

</script>




<style scoped>
.container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  will-change: transform;
}


.battery-index {
  display: flex;
  min-width: 24px;
  height: 24px;
  border-radius: 10px;
  /* Делаем форму "мягкого квадрата" */
  background: var(--battery-index-background-color);
  color: var(--text-main);
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid #dcdfe6;
  box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.battery-min {
  background: linear-gradient(135deg, #ff6b6b, #e7402e);
  color: white;
  border-color: #e7402e;
  box-shadow: 0 4px 10px rgba(231, 64, 46, 0.3);
}

.battery-max {
  background: var(--battery-filled-high-color);
  color: white;
  border-color: #34a300;
  box-shadow: 0 4px 10px rgba(52, 163, 0, 0.3);
}

/* --- Battery Case --- */
.battery {
  display: flex;
  justify-content: space-between;
  width: 110px;
  height: 50px;
  padding: 3px;
  border-radius: 6px;
  border: 1px solid #adb5bd;
  background: var(--battery-empty-bar-color);
  position: relative;
  transition: all 0.3s ease;
}

.battery::after {
  content: "";
  position: absolute;
  top: 50%;
  right: -10px;
  transform: translateY(-50%);
  width: 6px;
  height: 20px;
  border-radius: 2px;
  background: #c4c4c4;
}

.glow-min .battery {
  border-color: #e7402e;
  box-shadow: 0 0 12px rgba(231, 64, 46, 0.2);
}

.glow-max .battery {
  border-color: #34a300;
  box-shadow: 0 0 12px rgba(52, 163, 0, 0.2);
}

.bar {
  flex: 1;
  margin: 0 1px;
  border-radius: 3px;
  background: var(--battery-empty-bar-color);
  transition: all 0.25s ease;
}

.filled {
  box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.15);
  animation: fillFade 0.3s ease;
}

@keyframes fillFade {
  from {
    transform: scaleY(0.6);
    opacity: 0.5;
  }

  to {
    transform: scaleY(1);
    opacity: 1;
  }
}


.filled.high {
  background: var(--battery-filled-high-color);

}

.filled.medium {
  background: var(--battery-filled-medium-color);
}

.filled.low {
  background: var(--battery-filled-low-color);
}

.badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(2px);
  padding: 2px 6px;
  border-radius: 4px;
  color: #2c3e50;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* --- Balancing Slot (Фиксация размера) --- */
.balancing-slot {
  width: 24px;
  /* Резервируем место под иконку */
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.balancing-icon {
  display: flex;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.balancing-icon.visible {
  opacity: 1;
  transform: scale(1);
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

/* Плавное появление иконки без прыжков */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
