export interface BMSData {
  voltage: number
  current: number
  remainCapacity: number
  nominalCapacity: number
  totalCycles: number
  cellsBalancing: number
  protectionStatus: number
  remainingPercentage: number
  mosfState: number
  numberOfCells: number
  numberOfTemperatureSensors: number
  temperature: number[],
  bmsState: number
  power: number
}
