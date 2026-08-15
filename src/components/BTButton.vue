<template>
  <div class="container">
    <!-- I-08: Show clear message when Web Bluetooth not supported -->
    <div v-if="!isSupported" class="unsupported">
      <n-icon size="36" color="#e88080"><BluetoothDisabledRound /></n-icon>
      <p class="unsupported-title">Bluetooth не поддерживается</p>
      <p class="unsupported-text">
        Используйте <strong>Chrome</strong> или <strong>Edge</strong> на ПК или Android.
        Safari и Firefox не поддерживают Web Bluetooth.
      </p>
    </div>

    <!-- Normal connect button -->
    <n-button
      v-else
      :disabled="isConnecting"
      round size="large"
      :type="isConnected ? 'error' : 'primary'"
      :loading="isConnecting"
      class="bluetooth-btn"
      @click="$emit('click')"
    >
      <template #icon>
        <n-icon size="32"><BluetoothRound /></n-icon>
      </template>
      <!-- I-06: Fix v-if priority — isConnecting must be checked first -->
      <span v-if="isConnecting">Подключение...</span>
      <span v-else-if="isConnected">Отключить</span>
      <span v-else>Подключить</span>
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { BluetoothRound, BluetoothDisabledRound } from '@vicons/material'

defineProps<{
  isConnecting?: boolean,
  isConnected?: boolean,
  isSupported?: boolean
}>()

defineEmits(['click'])
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.bluetooth-btn {
  height: 64px !important;
  padding: 0 32px !important;
  font-size: 18px !important;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.bluetooth-btn:hover {
  transform: translateY(-2px);
}

.bluetooth-btn:active {
  transform: translateY(0);
}

.unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 320px;
  text-align: center;
  padding: 32px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
}

.unsupported-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.unsupported-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}

@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(24, 160, 88, 0.4); }
  70%  { box-shadow: 0 0 0 15px rgba(24, 160, 88, 0); }
  100% { box-shadow: 0 0 0 0 rgba(24, 160, 88, 0); }
}

.bluetooth-btn:not(:disabled):hover {
  animation: pulse 1.5s infinite;
}
</style>
