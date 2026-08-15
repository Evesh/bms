<template>
  <n-config-provider :theme="naiveTheme">
    <n-dialog-provider>
      <n-message-provider>
        <div class="container">

          <n-drawer v-model:show="drawerActive" :width="260" placement="left">
            <n-drawer-content title="Навигация" closable>
              <n-menu v-model:value="activeKey" :options="menuOptions" @update:value="handleUpdateValue" />
            </n-drawer-content>
          </n-drawer>

          <header class="app-header" v-if="isConnected && isReady">
            <div class="left">
              <n-button tertiary circle size="large" @click="drawerActive = true">
                <template #icon><n-icon><MenuRound /></n-icon></template>
              </n-button>
              <span class="title">BMS Monitor</span>
            </div>

            <div class="right">
              <!-- Issue 4 fix: countdown is purely decorative — driven by setInterval below -->
              <div class="countdown-wrap" title="Обновление данных">
                <n-icon size="13" style="opacity:.55"><RefreshRound /></n-icon>
                <n-countdown
                  ref="countdownRef"
                  :duration="3000"
                  :active="isReady && !isEEPROMMode"
                  :precision="1"
                />
              </div>

              <n-button strong secondary circle :type="isConnected ? 'primary' : 'default'" @click="disconnect">
                <n-icon size="20"><BluetoothRound /></n-icon>
              </n-button>

              <n-button strong secondary circle @click="themeToggle()">
                <n-icon size="20">
                  <DarkModeOutlined v-if="!isDarkTheme" />
                  <LightModeOutlined v-else />
                </n-icon>
              </n-button>
            </div>
          </header>

          <router-view />

        </div>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { useBmsBle } from '@/composable/useBmsBle'
import {
  darkTheme, NMessageProvider, NDialogProvider, NConfigProvider,
  NCountdown, NButton, NIcon, NDrawer, NDrawerContent, NMenu, type MenuOption,
} from 'naive-ui'
import {
  BluetoothRound, MenuRound, SpaceDashboardFilled, SettingsRound,
  DarkModeOutlined, LightModeOutlined, RefreshRound,
} from '@vicons/material'
import { computed, h, onUnmounted, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useDark, useToggle } from '@vueuse/core'

const router = useRouter()
const route  = useRoute()

const {
  isConnected, isReady, isEEPROMMode,
  disconnect, requestMain, requestCells, ensureExitEEPROM,
} = useBmsBle()

const drawerActive = ref(false)
const countdownRef = ref()
const activeKey    = ref<string | null>(null)

const isDarkTheme = useDark()
const themeToggle = useToggle(isDarkTheme)
const naiveTheme  = computed(() => (isDarkTheme.value ? darkTheme : null))

// ── Navigate on connection state change ───────────────────────────────────────
watch(isReady, (val) => {
  if (val)  router.push({ name: 'dashboard' })
  else      router.push({ name: 'connection' })
})

// ── Polling via setInterval ───────────────────────────────────────────────────
// Issue 4: switched from n-countdown @finish to setInterval so the timer
// keeps running independently of route changes and EEPROM mode state.
// requestMain/requestCells guard themselves against EEPROM mode internally.
let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    if (!isReady.value || isEEPROMMode.value) return
    await requestMain()
    setTimeout(() => requestCells(), 500)
    countdownRef.value?.reset()
  }, 3000)
}

function stopPolling() {
  if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null }
}

watch(isReady, (ready) => { ready ? startPolling() : stopPolling() }, { immediate: true })
onUnmounted(stopPolling)

// ── Route watcher: safely exit EEPROM when leaving Settings ──────────────────
// Issue 4+5: when navigating Settings → Dashboard, ensure EEPROM mode is off
// before the next poll fires, and reset the countdown display.
watch(() => route.name, async (newRoute, oldRoute) => {
  if (oldRoute === 'settings' && newRoute === 'dashboard') {
    await ensureExitEEPROM()
    countdownRef.value?.reset()
  }
})

// ── Menu ─────────────────────────────────────────────────────────────────────
function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions: MenuOption[] = [
  {
    label: () => h(RouterLink, { to: { name: 'dashboard' } }, { default: () => 'Дашборд' }),
    key:   'dashboard',
    icon:  renderIcon(SpaceDashboardFilled),
  },
  {
    label: () => h(RouterLink, { to: { name: 'settings' } }, { default: () => 'Параметры BMS' }),
    key:   'settings',
    icon:  renderIcon(SettingsRound),
  },
]

function handleUpdateValue() { drawerActive.value = false }
</script>

<style scoped>
.container { max-width: 1280px; margin: 0 auto; }

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 16px 0;
  padding: 10px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.left  { display: flex; align-items: center; gap: 10px; }
.right { display: flex; align-items: center; gap: 10px; }

.title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: var(--text-main);
}

.countdown-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  cursor: default;
}
</style>
