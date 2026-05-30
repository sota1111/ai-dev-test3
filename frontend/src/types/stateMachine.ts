export interface Transition {
  from: string
  trigger: string
  to: string
}

export interface ParentState {
  name: string
  children: string[]
}

export interface StateMachine {
  initialState: string
  states: string[]
  parentStates?: ParentState[]
  transitions: Transition[]
}

export interface HistoryEntry {
  step: number
  from: string
  trigger: string
  to: string
}
