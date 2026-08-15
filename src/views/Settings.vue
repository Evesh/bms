<template>
  <div class="settings-wrap">

    <!-- Header + refresh -->
    <div class="settings-head">
      <div>
        <h2 class="settings-title">Параметры BMS</h2>
        <p class="settings-subtitle">Данные из EEPROM — только чтение</p>
      </div>
      <n-button :loading="isLoading" @click="refresh" size="small" secondary>
        Обновить
      </n-button>
    </div>

    <!-- Empty / loading state -->
    <div v-if="valueRows.length === 0 && configRows.length === 0" class="empty-state">
      <n-spin v-if="isLoading" />
      <template v-else>
        <p class="empty-text">Данные не загружены</p>
        <n-button @click="refresh" type="primary" size="small">Прочитать EEPROM</n-button>
      </template>
    </div>

    <!-- BUG-4: Only ONE rendering — n-data-table with proper columns (removed bms-data-list duplicate) -->
    <!-- I-11: Columns now include Параметр (description), Значение, and Ед. изм. -->
    <n-data-table
      v-if="valueRows.length > 0"
      :columns="columns"
      :data="valueRows"
      :row-key="row => row.key"
      size="small"
      striped
      class="params-table"
    />

    <!-- Config registers (func_config, ntc_config) shown as separate cards -->
    <div v-if="configRows.length > 0" class="config-section">
      <h3 class="config-title">Конфигурационные регистры</h3>
      <div v-for="cfg in configRows" :key="cfg.key" class="config-card">
        <p class="config-name">{{ cfg.description }}</p>
        <div class="flags-grid">
          <div v-for="flag in cfg.flags" :key="flag.name" class="flag-row">
            <span class="flag-name">{{ flag.name }}</span>
            <n-tag :type="flag.isEnabled ? 'success' : 'default'" size="small" round>
              {{ flag.isEnabled ? 'ВКЛ' : 'ВЫКЛ' }}
            </n-tag>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NDataTable, NButton, NSpin, NTag } from 'naive-ui'
import { registers_description, registers_unit, registers_diveder, useBmsBle } from '@/composable/useBmsBle'

const { isConnected, readAllRegisters, eepromData } = useBmsBle()

const isLoading = ref(false)

async function refresh() {
  if (!isConnected.value) return
  isLoading.value = true
  await readAllRegisters()
  isLoading.value = false
}

onMounted(() => {
  if (isConnected.value) refresh()
})

// ── I-11: Proper columns — description + value + unit ───────────────────────
const columns = [
  {
    title: 'Параметр',
    key: 'description',
    ellipsis: { tooltip: true },
    width: 280,
  },
  {
    title: 'Значение',
    key: 'value',
    align: 'right' as const,
    width: 120,
  },
  {
    title: 'Ед. изм.',
    key: 'unit',
    width: 90,
  },
]

// ── Computed: split value rows and config rows ───────────────────────────────
const valueRows = computed(() => {
  return Object.entries(eepromData)
    .map(([key, rawValue]) => {
      const desc = registers_description[key as keyof typeof registers_description]
      if (typeof desc !== 'string') return null

      const unit    = registers_unit[key as keyof typeof registers_unit] || ''
      const divider = registers_diveder[key as keyof typeof registers_diveder] || 1
      const calculated = (rawValue as number) / divider
      const value   = divider > 1 ? Number(calculated.toFixed(2)) : calculated

      return { type: 'value', key, description: desc, value, unit }
    })
    .filter(Boolean) as Array<{ type: string; key: string; description: string; value: number; unit: string }>
})

const configRows = computed(() => {
  return Object.entries(eepromData)
    .map(([key, rawValue]) => {
      const desc = registers_description[key as keyof typeof registers_description]
      if (typeof desc !== 'object' || desc === null) return null

      // BUG FIX: rawValue is already decoded as {flagKey: boolean} by decodeRegister(),
      // NOT a raw number — using bitwise ops on an object always returns 0 (was always false).
      const decodedObj = rawValue as Record<string, boolean>
      const flags = Object.entries(desc).map(([flagKey, flagName]) => ({
        name: flagName as string,
        isEnabled: !!decodedObj[flagKey],
      }))

      const label =
        key === 'func_config' ? 'Конфигурация функций' :
        key === 'ntc_config'  ? 'Конфигурация NTC датчиков' :
        key

      return { type: 'config', key, description: label, flags }
    })
    .filter(Boolean) as Array<{ type: string; key: string; description: string; flags: { name: string; isEnabled: boolean }[] }>
})
</script>

<style scoped>
.settings-wrap {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 2px;
}

.settings-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  text-align: center;
}

.empty-text {
  color: var(--text-muted);
  font-size: 14px;
  margin: 0;
}

.params-table {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.config-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 16px 20px;
}

.config-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 12px;
}

.flags-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flag-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
}

.flag-row:last-child {
  border-bottom: none;
}

.flag-name {
  color: var(--text-muted);
}
</style>
