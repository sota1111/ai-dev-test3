export type DisplayMode =
  | 'all'
  | 'current-parent'
  | 'main-process'
  | 'exception'
  | 'maintenance'

export interface Transition {
  from: string
  trigger: string
  to: string
}

export interface ParentState {
  name: string
  children: string[]
  initialChild?: string
  isInterrupt?: boolean
  stateCategory?: 'normal' | 'pause' | 'exception' | 'maintenance'
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

export interface StateMachineDiff {
  addedStates: string[]
  removedStates: string[]
  addedTransitions: { from: string; trigger: string; to: string }[]
  removedTransitions: { from: string; trigger: string; to: string }[]
  addedParentStates: string[]
  removedParentStates: string[]
  modifiedParentStates: { name: string; addedChildren: string[]; removedChildren: string[] }[]
}

export interface ModifyHistoryEntry {
  step: number
  request: string
  diff: StateMachineDiff
  timestamp: string
}
