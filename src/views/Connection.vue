<template>
  <div class="page">
    <div class="card">

      <div class="brand">
        <span class="logo">⚡</span>
        <div>
          <h1 class="title">BMS Monitor</h1>
          <p class="subtitle">Управление и мониторинг через Bluetooth</p>
        </div>
      </div>

      <div class="divider" />

      <!-- ① Браузер не поддерживает Web Bluetooth -->
      <div v-if="!isSupported" class="alert alert-error">
        <span class="alert-icon">🚫</span>
        <span>Браузер не поддерживает Web Bluetooth.<br>Используйте <strong>Chrome</strong> или <strong>Edge</strong>.</span>
      </div>

      <!-- ② Bluetooth отключён или недоступен на устройстве -->
      <div v-else-if="bluetoothAvailable === false" class="alert alert-warn">
        <span class="alert-icon">📵</span>
        <span>Bluetooth недоступен. Включите Bluetooth на устройстве и обновите страницу.</span>
      </div>

      <!-- ③ Идёт подключение -->
      <div v-else-if="isConnecting" class="status-row">
        <n-spin size="small" />
        <span class="status-text">Поиск устройств...</span>
      </div>

      <!-- ④ Ошибка подключения -->
      <div v-if="connectionError" class="alert alert-error">
        <span class="alert-icon">⚠️</span>
        <span>{{ connectionError }}</span>
      </div>

      <!-- ⑤ Кнопка (только если API доступен и BT не заведомо выключен) -->
      <n-button
        v-if="isSupported && bluetoothAvailable !== false"
        :disabled="isConnecting"
        :loading="isConnecting"
        :type="isConnecting ? 'default' : 'primary'"
        round size="large"
        class="connect-btn"
        @click="connect"
      >
        <template #icon>
          <n-icon size="20"><BluetoothRound /></n-icon>
        </template>
        {{ isConnecting ? 'Подключение...' : 'Подключить BMS' }}
      </n-button>

      <!-- Подпись -->
      <p class="hint">Совместимо с Xiaoxiang / JBD BMS</p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSpin } from 'naive-ui'
import { BluetoothRound } from '@vicons/material'
import { useBmsBle } from '@/composable/useBmsBle'

const {
  isSupported, isConnecting,
  bluetoothAvailable, connectionError,
  connect,
} = useBmsBle()
</script>

<style scoped>
/* ── Page ── */
.page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 24px;
}

/* ── Card — compact ── */
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 340px;
  padding: 28px 24px 22px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 12px 32px rgba(0,0,0,0.08);
}

/* ── Brand row ── */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
}

.logo {
  font-size: 36px;
  line-height: 1;
  flex-shrink: 0;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 2px;
  line-height: 1.2;
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

/* ── Divider ── */
.divider {
  width: 100%;
  height: 1px;
  background: var(--border-color);
}

/* ── Alerts ── */
.alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
}

.alert-error {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  color: var(--text-main);
}

.alert-warn {
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.25);
  color: var(--text-main);
}

.alert-icon { flex-shrink: 0; font-size: 16px; }

/* ── Connecting status ── */
.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 13px;
}

/* ── Button ── */
.connect-btn {
  width: 100%;
  height: 48px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
}

/* ── Hint ── */
.hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
}
</style>
