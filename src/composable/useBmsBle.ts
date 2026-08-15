import { ref, watch, computed, reactive } from 'vue'
import { useBluetooth } from '@vueuse/core'
import type { BMSData } from '../types/mainData'

const SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb'
const TX_UUID      = '0000ff02-0000-1000-8000-00805f9b34fb'
const RX_UUID      = '0000ff01-0000-1000-8000-00805f9b34fb'

const BMS_REQUEST_MAIN  = new Uint8Array([0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77])
const BMS_REQUEST_CELLS = new Uint8Array([0xDD, 0xA5, 0x04, 0x00, 0xFF, 0xFC, 0x77])

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// ── Singleton state ──────────────────────────────────────────────────────────
const tx = ref<BluetoothRemoteGATTCharacteristic>()
const rx = ref<BluetoothRemoteGATTCharacteristic>()

const mainData        = ref<BMSData>()
const cellsData       = ref<number[]>([])
const isConnecting    = ref(false)
const isEEPROMMode    = ref(false)
const gattBusy        = ref(false)
const gattInitialized = ref(false)
const eepromData      = reactive<Record<string, number | object>>({})

// Issue 2+3: connection error and BT hardware availability
const connectionError      = ref<string | null>(null)
const bluetoothAvailable   = ref<boolean | null>(null)  // null = not yet checked

// Check BT hardware once at module load (singleton)
let btListenerAdded = false
;(async () => {
  if (!('bluetooth' in navigator)) {
    bluetoothAvailable.value = false
    return
  }
  try {
    bluetoothAvailable.value = await (navigator.bluetooth as any).getAvailability()
    if (!btListenerAdded) {
      btListenerAdded = true
      ;(navigator.bluetooth as any).addEventListener('availabilitychanged', (e: any) => {
        bluetoothAvailable.value = e.value
      })
    }
  } catch {
    bluetoothAvailable.value = null  // browser supports API but can't determine state
  }
})()

// ── Register maps ─────────────────────────────────────────────────────────────
const registers: Record<number, string> = {
  0x10: 'design_cap', 0x11: 'cycle_cap', 0x12: 'cap_100', 0x13: 'cap_0',
  0x14: 'dsg_rate',   0x17: 'cycle_cnt', 0x18: 'chgot',   0x19: 'chgot_rel',
  0x1A: 'chgut',      0x1B: 'chgut_rel', 0x3A: 'chg_t_delays',
  0x3B: 'dsg_t_delays', 0x3C: 'pack_v_delays', 0x3D: 'cell_v_delays',
  0x1C: 'dsgot',      0x1D: 'dsgot_rel', 0x1E: 'dsgut',   0x1F: 'dsgut_rel',
  0x2F: 'cell_cnt',   0x2D: 'func_config', 0x2E: 'ntc_config',
  0x32: 'cap_80',     0x33: 'cap_60',    0x34: 'cap_40',  0x35: 'cap_20',
}

export const registers_description = {
  design_cap: 'Design capacity',
  cycle_cap: 'Cycle capacity',
  cap_100: 'Cell capacity estimate voltage, 100%',
  cap_0: 'Cell capacity estimate voltage, 0%',
  dsg_rate: 'Cell estimated self discharge rate',
  cycle_cnt: 'Cycle count',
  chgot: 'Charge Overtemp threshold',
  chgot_rel: 'Charge Overtemp release threshold',
  chgut: 'Charge Undertemp threshold',
  chgut_rel: 'Charge Undertemp release threshold',
  chg_t_delays: 'Charge over / undertemp release delay',
  dsg_t_delays: 'Discharge over / undertemp release delay',
  pack_v_delays: 'Pack over / under voltage release delay',
  cell_v_delays: 'Cell over / under voltage release delay',
  dsgot: 'Discharge Overtemp threshold',
  dsgot_rel: 'Discharge Overtemp release threshold',
  dsgut: 'Discharge Undertemp threshold',
  dsgut_rel: 'Discharge Undertemp release threshold',
  cell_cnt: 'Number of cells in the pack',
  func_config: {
    switch:        'Switch Function',
    scrl:          'Load Check',
    balance_en:    'Balance Enable',
    chg_balance_en:'Charging Balance Enable',
  },
  ntc_config: 'NTC configuration',
  cap_80: 'Cell capacity estimate voltage, 80%',
  cap_60: 'Cell capacity estimate voltage, 60%',
  cap_40: 'Cell capacity estimate voltage, 40%',
  cap_20: 'Cell capacity estimate voltage, 20%',
}

export const registers_unit = {
  design_cap: 'Ah', cycle_cap: 'Ah',
  cap_100: 'mV', cap_0: 'mV', cap_80: 'mV', cap_60: 'mV', cap_40: 'mV', cap_20: 'mV',
  dsg_rate: '%', cycle_cnt: 'times',
  chgot: '°C', chgot_rel: '°C', chgut: '°C', chgut_rel: '°C',
  chg_t_delays: 'ms', dsg_t_delays: 'ms', pack_v_delays: 'ms', cell_v_delays: 'ms',
  dsgot: '°C', dsgot_rel: '°C', dsgut: '°C', dsgut_rel: '°C',
  cell_cnt: 'cells', func_config: '', ntc_config: '',
}

export const registers_diveder = {
  design_cap: 10, cycle_cap: 10,
  cap_100: 1, cap_0: 1, dsg_rate: 1, cycle_cnt: 1,
  chgot: 1, chgot_rel: 1, chgut: 1, chgut_rel: 1,
  chg_t_delays: 1, dsg_t_delays: 1, pack_v_delays: 1, cell_v_delays: 1,
  dsgot: 1, dsgot_rel: 1, dsgut: 1, dsgut_rel: 1,
  cell_cnt: 1, func_config: 1, ntc_config: 1,
  cap_80: 10, cap_60: 10, cap_40: 10, cap_20: 10,
}

const registerMap: Record<number, keyof typeof registers_description> = {
  0x10: 'design_cap', 0x11: 'cycle_cap', 0x12: 'cap_100', 0x13: 'cap_0',
  0x14: 'dsg_rate',   0x17: 'cycle_cnt', 0x18: 'chgot',   0x19: 'chgot_rel',
  0x1A: 'chgut',      0x1B: 'chgut_rel', 0x1C: 'dsgot',   0x1D: 'dsgot_rel',
  0x1E: 'dsgut',      0x1F: 'dsgut_rel', 0x2D: 'func_config', 0x2E: 'ntc_config',
  0x2F: 'cell_cnt',   0x32: 'cap_80',    0x33: 'cap_60',  0x34: 'cap_40',
  0x35: 'cap_20',     0x3A: 'chg_t_delays', 0x3B: 'dsg_t_delays',
  0x3C: 'pack_v_delays', 0x3D: 'cell_v_delays',
}

export const protectionStatusBits: Record<number, string> = {
  0: 'Cell Block Over-Vol',     1: 'Cell Block Under-Vol',
  2: 'Battery Over-Vol',        3: 'Battery Under-Vol',
  4: 'Charging Over-temp',      5: 'Charging Low-temp',
  6: 'Discharging Over-temp',   7: 'Discharging Low-temp',
  8: 'Charging Over-current',   9: 'Discharging Over-current',
  10: 'Short Circuit',          11: 'Fore-end IC Error',
  12: 'Software Lock-in',       13: 'Reserve bit 13',
  14: 'Reserve bit 14',         15: 'Reserve bit 15',
}

const { server, isConnected, requestDevice, isSupported } = useBluetooth({
  acceptAllDevices: true,
  optionalServices: [SERVICE_UUID],
})

// ── useBmsBle ────────────────────────────────────────────────────────────────
export function useBmsBle() {
  let receiveBuffer: number[] = []

  const isReady = computed(() => isConnected.value && !!mainData.value)

  const isChargeEnabled    = computed(() => mainData.value ? (mainData.value.mosfState & 0x01) !== 0 : false)
  const isDischargeEnabled = computed(() => mainData.value ? (mainData.value.mosfState & 0x02) !== 0 : false)

  const activeProtections = computed(() => {
    if (!mainData.value) return []
    const out: string[] = []
    for (let i = 0; i < 16; i++) {
      if (mainData.value.protectionStatus & (1 << i)) out.push(protectionStatusBits[i])
    }
    return out
  })

  // ── GATT write ─────────────────────────────────────────────────────────────
  async function gattWrite(data: Uint8Array) {
    if (!tx.value) return
    const maxWait = 3000
    let waited = 0
    while (gattBusy.value && waited < maxWait) { await delay(20); waited += 20 }
    if (gattBusy.value) { console.warn('[BLE] GATT busy timeout, forcing'); gattBusy.value = false }
    try {
      gattBusy.value = true
      await tx.value.writeValue(data)
    } catch (e) {
      console.error('[BLE] Write error:', e)
    } finally {
      gattBusy.value = false
    }
  }

  // ── Data requests — guarded against EEPROM mode ───────────────────────────
  // Issue 5: before sending normal commands we MUST be out of EEPROM mode.
  const requestMain = async () => {
    if (isEEPROMMode.value) {
      console.warn('[BLE] Skipping requestMain — EEPROM mode active')
      return
    }
    await gattWrite(BMS_REQUEST_MAIN)
  }

  const requestCells = async () => {
    if (isEEPROMMode.value) {
      console.warn('[BLE] Skipping requestCells — EEPROM mode active')
      return
    }
    await gattWrite(BMS_REQUEST_CELLS)
  }

  // ── EEPROM ─────────────────────────────────────────────────────────────────
  async function EEPROM(type: 'enter' | 'exit') {
    if (!tx.value) return
    const register = type === 'enter' ? 0x00 : 0x01
    const data     = type === 'enter' ? [0x56, 0x78] : [0x00, 0x00]
    const dataLen  = 0x02
    const payload  = [register, dataLen, ...data]
    let sum = 0
    for (const b of payload) sum += b
    const crc    = (0xFFFF - sum + 1) & 0xFFFF
    const packet = new Uint8Array([0xDD, 0x5A, register, dataLen, ...data, (crc >> 8) & 0xFF, crc & 0xFF, 0x77])
    try { await gattWrite(packet) } catch (e) { console.error('[BLE] EEPROM cmd error:', e) }
  }

  // Issue 4+5: safe exit — waits for BMS confirmation, force-resets on timeout
  async function ensureExitEEPROM(): Promise<void> {
    if (!isEEPROMMode.value) return
    console.log('[BLE] ensureExitEEPROM: sending exit command')
    await EEPROM('exit')
    let waited = 0
    while (isEEPROMMode.value && waited < 2000) { await delay(50); waited += 50 }
    if (isEEPROMMode.value) {
      console.warn('[BLE] EEPROM exit timeout — forcing isEEPROMMode = false')
      isEEPROMMode.value = false
    }
  }

  async function readRegister(addr: number) {
    if (!tx.value) return
    const payload = [addr, 0x00]
    let sum = 0
    for (const b of payload) sum += b
    const crc    = (0xFFFF - sum + 1) & 0xFFFF
    const packet = new Uint8Array([0xDD, 0xA5, addr, 0x00, (crc >> 8) & 0xFF, crc & 0xFF, 0x77])
    try { await tx.value.writeValueWithResponse(packet) } catch (e) { console.error('[BLE] readRegister error:', e) }
  }

  async function readAllRegisters() {
    await EEPROM('enter')
    await delay(500)
    if (!isEEPROMMode.value) { console.warn('[BLE] EEPROM mode not confirmed'); return }
    for (const addr of Object.keys(registers)) {
      await readRegister(Number(addr))
      await delay(100)
    }
    await delay(300)
    await EEPROM('exit')
  }

  // ── Packet parsing ─────────────────────────────────────────────────────────
  function decodeRegister(key: string, value: number) {
    if (key === 'func_config') {
      return {
        switch:        (value & 0x0001) !== 0,
        scrl:          (value & 0x0002) !== 0,
        balance_en:    (value & 0x0004) !== 0,
        chg_balance_en:(value & 0x0008) !== 0,
      }
    }
    return value
  }

  function parseRegister(packet: Uint8Array) {
    const reg    = packet[1]
    const status = packet[2]
    const len    = packet[3]
    if (status !== 0 || len !== 2) return
    const value  = (packet[4] << 8) | packet[5]
    const key    = registerMap[reg]
    if (!key) return
    eepromData[key] = decodeRegister(key, value)
  }

  function getTemperature(sensorsNum: number, packet: Uint8Array): number[] {
    const out: number[] = []
    for (let i = 0; i < sensorsNum; i++) {
      const raw = (packet[27 + i * 2] << 8) | packet[28 + i * 2]
      out.push(Number(((raw - 2731) * 0.1).toFixed(1)))
    }
    return out
  }

  function bytesToHexArray(b: Uint8Array) {
    return Array.from(b, x => x.toString(16).padStart(2, '0'))
  }

  function parsePacket(packet: Uint8Array) {
    // ── CRITICAL FIX (Issue 4) ──────────────────────────────────────────────
    // EEPROM mode-control packets (0x00 enter, 0x01 exit) MUST be processed
    // unconditionally — BEFORE any isEEPROMMode early-return branch.
    //
    // Bug: the old code had `if (isEEPROMMode) { parseRegister(); return }` at
    // the top, so the 0x01 exit-confirmation packet was consumed by parseRegister
    // (which silently drops it because len≠2) and isEEPROMMode was NEVER reset.
    // That left the flag stuck at true forever after visiting Settings.
    if (packet[1] === 0x00) {
      console.log('[BLE] EEPROM mode: ON')
      isEEPROMMode.value = true
      return
    }
    if (packet[1] === 0x01) {
      console.log('[BLE] EEPROM mode: OFF')
      isEEPROMMode.value = false
      return
    }

    // Register read responses (while in EEPROM session)
    if (isEEPROMMode.value) {
      parseRegister(packet)
      return
    }

    // Normal data packets
    switch (packet[1]) {
      case 0x03: {
        // Issue 5 (signed int16): positive = charging, negative = discharging
        const rawCurrent    = (packet[6] << 8) | packet[7]
        const signedCurrent = rawCurrent > 0x7FFF ? rawCurrent - 0x10000 : rawCurrent
        const voltage       = ((packet[4] << 8) | packet[5]) * 0.01
        mainData.value = {
          voltage,
          current:                   signedCurrent * 0.01,
          remainCapacity:            ((packet[8]  << 8) | packet[9])  * 0.01,
          nominalCapacity:           ((packet[10] << 8) | packet[11]) * 0.01,
          totalCycles:               ((packet[12] << 8) | packet[13]),
          cellsBalancing:            (packet[16] << 24) | (packet[17] << 16) | (packet[18] << 8) | packet[19],
          protectionStatus:          ((packet[20] << 8) | packet[21]),
          remainingPercentage:       packet[23],
          mosfState:                 packet[24],
          numberOfCells:             packet[25],
          numberOfTemperatureSensors:packet[26],
          temperature:               getTemperature(packet[26], packet),
          bmsState:                  packet[27 + packet[26] * 2],
          power:                     voltage * (signedCurrent * 0.01),
        }
        break
      }
      case 0x04: {
        const cells: number[] = []
        for (let i = 0; i < packet[3]; i += 2)
          cells.push(((packet[4 + i] << 8) | packet[5 + i]) / 1000)
        cellsData.value = cells
        break
      }
      default:
        console.warn('[BLE] Unknown packet:', bytesToHexArray(packet))
    }
  }

  // ── GATT setup & notifications ────────────────────────────────────────────
  function handleNotify(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const data   = new Uint8Array(target.value!.buffer)
    for (let i = 0; i < data.length; i++) receiveBuffer.push(data[i])
    processBuffer()
  }

  function processBuffer() {
    while (receiveBuffer.length >= 7) {
      if (receiveBuffer[0] !== 0xDD) { receiveBuffer.shift(); continue }
      const dataLength       = receiveBuffer[3]
      const fullPacketLength = dataLength + 7
      if (receiveBuffer.length < fullPacketLength) return
      const packet   = new Uint8Array(receiveBuffer.slice(0, fullPacketLength))
      receiveBuffer  = receiveBuffer.slice(fullPacketLength)
      parsePacket(packet)
    }
  }

  async function pollInitialData() {
    try {
      while (isConnected.value && !mainData.value) {
        await requestMain()
        await delay(500)
      }
      while (isConnected.value && cellsData.value.length === 0) {
        await requestCells()
        await delay(500)
      }
    } catch (e) {
      console.error('[BLE] Polling error:', e)
    } finally {
      isConnecting.value = false
    }
  }

  async function setupGatt() {
    if (!server.value?.connected) return false
    try {
      const service = await server.value.getPrimaryService(SERVICE_UUID)
      tx.value      = await service.getCharacteristic(TX_UUID)
      rx.value      = await service.getCharacteristic(RX_UUID)
      await rx.value.startNotifications()
      rx.value.removeEventListener('characteristicvaluechanged', handleNotify)
      rx.value.addEventListener('characteristicvaluechanged', handleNotify)
      pollInitialData()
      return true
    } catch (e: any) {
      console.error('[BLE] GATT setup error:', e)
      connectionError.value = `Ошибка GATT: ${e?.message ?? e}`
      isConnecting.value    = false
      return false
    }
  }

  watch(isConnected, async (connected) => {
    if (connected && !gattInitialized.value) {
      gattInitialized.value = true
      await setupGatt()
    }
    if (!connected) {
      gattInitialized.value = false
      mainData.value        = undefined
      cellsData.value       = []
      receiveBuffer         = []
      isConnecting.value    = false
      isEEPROMMode.value    = false
    }
  })

  // ── MOSFET ────────────────────────────────────────────────────────────────
  function encodeMosCommand(charge: boolean, discharge: boolean): number {
    if ( charge &&  discharge) return 0x00
    if (!charge &&  discharge) return 0x01
    if ( charge && !discharge) return 0x02
    return 0x03
  }

  async function updateMosfetState(type: 'charge' | 'discharge', newState: boolean) {
    if (!tx.value || !mainData.value) return
    // Issue 5: must not be in EEPROM mode
    if (isEEPROMMode.value) {
      console.warn('[BLE] Skipping MOSFET update — EEPROM mode active')
      return
    }
    let charge    = isChargeEnabled.value
    let discharge = isDischargeEnabled.value
    if (type === 'charge')    charge    = newState
    else                      discharge = newState
    const xx       = encodeMosCommand(charge, discharge)
    const register = 0xE1
    const data     = [0x00, xx]
    const dataLen  = 0x02
    const payload  = [register, dataLen, ...data]
    let sum = 0
    for (const b of payload) sum += b
    const crc    = (0xFFFF - sum + 1) & 0xFFFF
    const packet = new Uint8Array([0xDD, 0x5A, register, dataLen, ...data, (crc >> 8) & 0xFF, crc & 0xFF, 0x77])
    try {
      await gattWrite(packet)
      setTimeout(() => requestMain(), 300)
    } catch (e) {
      console.error('[BLE] MOSFET error:', e)
    }
  }

  // ── Connect / disconnect ──────────────────────────────────────────────────
  async function connect() {
    if (isConnecting.value || isConnected.value) return
    connectionError.value = null
    try {
      isConnecting.value = true
      await requestDevice()
    } catch (err: any) {
      isConnecting.value = false
      // NotFoundError = user cancelled picker — not a real error
      if (err?.name !== 'NotFoundError') {
        if (err?.name === 'SecurityError') {
          connectionError.value = 'Доступ к Bluetooth заблокирован. Проверьте разрешения браузера.'
        } else {
          connectionError.value = `Ошибка подключения: ${err?.message ?? err}`
        }
      }
    }
  }

  const disconnect = async () => await server.value?.disconnect()

  return {
    // state
    isSupported, isConnected, isReady, isConnecting,
    isEEPROMMode, mainData, cellsData, eepromData,
    isChargeEnabled, isDischargeEnabled, activeProtections,
    connectionError, bluetoothAvailable,
    // actions
    connect, disconnect,
    requestMain, requestCells,
    updateMosfetState,
    EEPROM, ensureExitEEPROM, readAllRegisters,
  }
}
