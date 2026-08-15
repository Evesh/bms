<template>
  <div class="main">

    <!-- I-15: Loading state while initial data is being polled -->
    <div v-if="!isReady" class="loading-state">
      <n-spin size="large" />
      <p class="loading-text">Получение данных от BMS...</p>
    </div>

    <template v-else>

      <!-- Заряд батареи -->
      <!-- Заряд батареи -->
      <div class="section">
        <div class="section-header">Заряд батареи</div>
        <div class="section-container">
          <Progressbar
            :value="mainData?.remainingPercentage"
            :isCharging="mainData?.current > 0"
          />
        </div>

        <!-- Футер с информацией о времени -->
        <div class="section-footer">
          <!-- Идет зарядка -->
          <template v-if="mainData?.current > 0">
            <span class="status-text">До окончания зарядки:</span>
            <n-tag type="success">{{ chargeRemainingTime }}</n-tag>
          </template>

          <!-- Идет разрядка -->
          <template v-else-if="mainData?.current < 0">
            <span class="status-text">Ориентировочное время работы:</span>
            <n-tag type="info" :bordered="false">{{ dischargeRemainingTime }}</n-tag>
          </template>

          <!-- Состояние покоя (ток около нуля) -->
          <template v-else>
            <span class="status-text">Батарея в режиме ожидания</span>
          </template>
        </div>
      </div>

      <!-- Основные параметры -->
      <div class="section">
        <div class="section-header">Основные параметры</div>
        <div class="section-container">
          <Card title="Напряжение" :value="mainData?.voltage"   vtype="V" />
          <Card title="Ток"        :value="mainData?.current"   vtype="A" />
          <Card title="Мощность"   :value="mainData?.power"     vtype="W" />
          <Card title="Ёмкость"    :value="mainData?.remainCapacity" vtype="Ah" />
        </div>
      </div>

      <!-- Температура -->
      <div class="section">
        <div class="section-header">Температура</div>
        <div class="section-container">
          <Card
            v-for="(tempSensor, index) in mainData?.temperature"
            :key="index"
            :title="`Датчик ${index + 1}`"
            :value="tempSensor"
            vtype="°C"
          />
        </div>
      </div>

      <!-- Управление MOSFET -->
      <div class="section">
        <div class="section-header">Управление MOSFET</div>
        <div class="section-container">
          <!-- I-12: Intercept toggle, show confirmation before writing to BMS -->
          <Switch
            :disabled="!isReady"
            title="Заряд"
            :active="isChargeEnabled"
            @update:active="(val) => requestMosfet('charge', val)"
          />
          <Switch
            :disabled="!isReady"
            title="Разряд"
            :active="isDischargeEnabled"
            @update:active="(val) => requestMosfet('discharge', val)"
          />
        </div>
      </div>

      <!-- Статус защит -->
      <div class="section">
        <div class="section-header">Статус защит</div>
        <div class="section-container" style="place-items: flex-start">
          <span v-if="activeProtections.length === 0" class="no-protections">
            ✓ Активных защит нет
          </span>
          <n-list v-else size="small" style="background-color: transparent;" :bordered="false">
            <n-list-item v-for="(protection, index) in activeProtections" :key="index">
              <n-space align="center">
                <n-tag :bordered="false" type="warning" size="small" round>
                  {{ protection }}
                  <template #icon><n-icon :component="WarningOutlined" /></template>
                </n-tag>
              </n-space>
            </n-list-item>
          </n-list>
        </div>
      </div>

      <!-- Ячейки батареи -->
      <!-- BUG-3: "Function Configuration" section removed — was dead UI (raw n-switch with no data binding).
           The func_config EEPROM register is shown correctly in the Settings page. -->
      <div class="section">
        <div class="section-header">Ячейки батареи</div>
        <div class="section-subheader">Разброс напряжений: {{ voltageDiff }} В</div>

        <!-- I-16: auto-fill grid instead of hardcoded 3 cols — works for 4S, 8S, 16S etc. -->
        <div class="section-battery-container">
          <div v-for="(cell, index) in cellsData" :key="index">
            <Battery
              :index="index"
              :voltage="cell"
              :is-balancing="balancingCellIndices.has(index)"
              :isMinValue="minMaxBatteryValue.minIndex === index"
              :isMaxValue="minMaxBatteryValue.maxIndex === index"
            />
          </div>
        </div>
      </div>

    </template>

    <!-- I-12: Confirmation modal for MOSFET state changes -->
    <n-modal
      v-model:show="confirmDialog.show"
      preset="dialog"
      type="warning"
      title="Подтверждение"
      :content="confirmDialog.message"
      positive-text="Подтвердить"
      negative-text="Отмена"
      @positive-click="onMosfetConfirmed"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NTag, NList, NListItem, NSpace, NIcon, NModal, NSpin } from 'naive-ui'
import { WarningOutlined } from '@vicons/material'
import { useBmsBle } from '@/composable/useBmsBle'
import Battery from '@/components/Battery.vue'
import Card from '@/components/Card.vue'
import Switch from '@/components/Switch.vue'
import Progressbar from '@/components/Progressbar.vue'

const {
  mainData,
  cellsData,
  isReady,
  isChargeEnabled,
  isDischargeEnabled,
  updateMosfetState,
  activeProtections,
} = useBmsBle()

// ── MOSFET confirmation ──────────────────────────────────────────────────────
// I-12: Critical action — writing to MOSFET immediately affects load/charger.
// Show a confirmation dialog before committing the state change.
const confirmDialog = ref({
  show: false,
  message: '',
  pendingType: '' as 'charge' | 'discharge',
  pendingVal: false,
})

function requestMosfet(type: 'charge' | 'discharge', val: boolean) {
  const label = type === 'charge' ? 'зарядку' : 'разряд'
  const action = val ? 'Включить' : 'Отключить'
  confirmDialog.value = {
    show: true,
    message: `${action} ${label}? Действие немедленно применяется к BMS.`,
    pendingType: type,
    pendingVal: val,
  }
}

function onMosfetConfirmed() {
  updateMosfetState(confirmDialog.value.pendingType, confirmDialog.value.pendingVal)
}

// ── Remaining charge time ────────────────────────────────────────────────────
const chargeRemainingTime = computed(() => {
  const data = mainData.value
  // current > 0 = charging; coefficient 1.2 accounts for charging efficiency loss
  if (data && data.current > 0 && data.nominalCapacity && data.remainCapacity !== undefined) {
    const hours = (data.nominalCapacity - data.remainCapacity) / data.current * 1.2
    return formatFloatToTime(hours)
  }
  return '—'
})

// ── Voltage diff ─────────────────────────────────────────────────────────────
const voltageDiff = computed(() => {
  if (!cellsData.value || cellsData.value.length === 0) return '0.000'
  return (Math.max(...cellsData.value) - Math.min(...cellsData.value)).toFixed(3)
})

// ── Balancing cells bitmask ──────────────────────────────────────────────────
const balancingCellIndices = computed(() => {
  if (!mainData.value) return new Set<number>()
  const bits = mainData.value.cellsBalancing
  const active = new Set<number>()
  for (let i = 0; i < 32; i++) {
    if ((bits & (1 << i)) !== 0) active.add(i)
  }
  return active
})

// ── Min / max cell ───────────────────────────────────────────────────────────
const minMaxBatteryValue = computed(() => {
  if (cellsData.value && cellsData.value.length > 0) {
    const min = Math.min(...cellsData.value)
    const max = Math.max(...cellsData.value)
    return {
      min,
      max,
      minIndex: cellsData.value.indexOf(min),
      maxIndex: cellsData.value.indexOf(max),
    }
  }
  return { min: 0, max: 0, minIndex: -1, maxIndex: -1 }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatFloatToTime(floatHours: number): string {
  let hours = Math.floor(floatHours)
  let minutes = Math.round((floatHours - hours) * 60)
  if (minutes === 60) { hours++; minutes = 0 }
  return `${hours} ч. ${minutes < 10 ? '0' + minutes : minutes} мин.`
}
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 60vh;
}

.loading-text {
  color: var(--text-muted);
  font-size: 14px;
}

.section {
  position: relative;
  padding: 22px 24px 26px;
  border-radius: 28px;
  margin: 20px;

  background: var(--background);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--border-color);

  box-shadow:
    0 20px 40px -12px rgba(0, 0, 0, 0.08),
    0 8px 16px -6px rgba(0, 0, 0, 0.04);
}

.section-header {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-main);
  margin-bottom: 16px;
  padding-left: 4px;
}

.section-subheader {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 14px;
  padding-left: 4px;
}

.section-container {
  display: grid;
  place-items: center;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 18px;
}

.section-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.mosfet-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 14px;
  padding-left: 4px;
}

.no-protections {
  color: var(--text-muted);
  font-size: 13px;
}

/* I-16: auto-fill — works for any cell count (4S, 8S, 16S…) */
.section-battery-container {
  display: grid;
  justify-content: center;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

@media (max-width: 600px) {
  .section-battery-container {
    grid-template-columns: repeat(2, 150px);
  }
}
</style>
