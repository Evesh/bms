<template>
  <div class="progress-wrapper">
    <div class="progress-container">
      <svg :viewBox="`0 0 ${width} ${height}`" class="progress-svg">
        <defs>
          <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" :stop-color="statusColor" stop-opacity="0.8" />
            <stop offset="100%" :stop-color="statusColor" />
          </linearGradient>

          <filter :id="glowId" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <path :d="arcPath" fill="none" stroke="#f3f4f6" :stroke-width="strokeWidth" stroke-linecap="round" />

        <path :d="arcPath" fill="none" :stroke="`url(#${gradientId})`" :stroke-width="strokeWidth"
          stroke-linecap="round" :stroke-dasharray="arcLength" :stroke-dashoffset="dashOffset" class="progress-line"
          :filter="`url(#${glowId})`" />
      </svg>


      <div class="progress-content">
        <div v-if="isCharging" class="charging-status">
          <n-icon size="20" :color="statusColor">
            <BoltOutlined />
          </n-icon>
        </div>
        <div class="value-group">
          <span class="value">{{ value }}</span>
          <span class="unit">%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { NIcon } from 'naive-ui';
import { BoltOutlined } from '@vicons/material';

const uid = useId();
const gradientId = `progressGradient-${uid}`;
const glowId = `glow-${uid}`;

const props = defineProps({
  value: { type: Number, default: 0 },
  isCharging: { type: Boolean, default: false },
});

const strokeWidth = 14;
const width = 200;
// Высота должна быть ровно половиной круга + запас на толщину линии
const height = computed(() => width / 2 + strokeWidth);
const radius = computed(() => (width - strokeWidth) / 2);

const statusColor = computed(() => {
  if (props.value < 20) return '#ff4d4f';
  if (props.value < 60) return '#faad14';
  return '#18a058';
});

const arcPath = computed(() => {
  const r = radius.value;
  const x = width / 2;
  const y = height.value - strokeWidth / 2; // Точка основания
  // Рисуем идеальный полукруг сверху вниз
  return `M ${x - r},${y} A ${r},${r} 0 0 1 ${x + r},${y}`;
});

const arcLength = computed(() => Math.PI * radius.value);
const dashOffset = computed(() => {
  const progress = Math.min(Math.max(props.value, 0), 100);
  return arcLength.value * (1 - progress / 100);
});
</script>

<style scoped>
.progress-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.progress-container {
  position: relative;
  width: v-bind('width + "px"');
  height: v-bind('height + "px"');
}

.progress-svg {
  width: 100%;
  height: auto;
  display: block;
}

.progress-line {
  transition: stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.4s ease;
}

.progress-content {
  position: absolute;
  /* Центрируем текст внутри дуги */
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
}

.value-group {
  display: flex;
  align-items: baseline;
  margin-top: -5px;
}

.value {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1;
}

.unit {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-left: 2px;
}

.charging-status {
  margin-bottom: 2px;
  animation: bounce 2s infinite ease-in-out;
}

@keyframes bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}
</style>
