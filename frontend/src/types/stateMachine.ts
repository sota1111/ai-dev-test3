export interface Transition {
  from: string
  trigger: string
  to: string
}

export interface StateMachine {
  initialState: string
  states: string[]
  transitions: Transition[]
}

export interface HistoryEntry {
  step: number
  from: string
  trigger: string
  to: string
}
