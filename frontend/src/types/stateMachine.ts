export interface Transition {
  from: string
  trigger: string
  to: string
}

export interface ParentState {
  name: string
  children: string[]
  initialChild?: string
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
  fromParent?: string | null
  trigger: string
  to: string
  toParent?: string | null
}
