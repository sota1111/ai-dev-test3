import { useState } from "react"
import { InputPanel } from "./components/InputPanel"
import { DiagramPanel } from "./components/DiagramPanel"
import { ControlPanel } from "./components/ControlPanel"
import { HistoryPanel } from "./components/HistoryPanel"
import { parseStateMachine } from "./api/client"
import type { StateMachine, Transition, HistoryEntry, ParentState } from "./types/stateMachine"
import styles from "./App.module.css"

function getParentOf(stateName: string, parentStates: ParentState[]): string | null {
  return parentStates.find(p => p.children.includes(stateName))?.name ?? null
}

function isParentName(name: string, parentStates: ParentState[]): boolean {
  return parentStates.some(p => p.name === name)
}

export default function App() {
  const [stateMachine, setStateMachine] = useState<StateMachine | null>(null)
  const [currentState, setCurrentState] = useState("")
  const [currentParentState, setCurrentParentState] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  function initSimulation(sm: StateMachine) {
    const parents = sm.parentStates ?? []
    if (isParentName(sm.initialState, parents)) {
      const parentDef = parents.find(p => p.name === sm.initialState)!
      const initChild = parentDef.initialChild ?? parentDef.children[0] ?? sm.initialState
      setCurrentState(initChild)
      setCurrentParentState(sm.initialState)
    } else {
      setCurrentState(sm.initialState)
      setCurrentParentState(getParentOf(sm.initialState, parents))
    }
    setHistory([])
  }

  async function handleGenerate(text: string) {
    setLoading(true)
    try {
      const sm = await parseStateMachine(text)
      setStateMachine(sm)
      initSimulation(sm)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function handleTrigger(transition: Transition) {
    const { to } = transition
    const parents = stateMachine?.parentStates ?? []
    let nextState: string
    let nextParent: string | null

    if (isParentName(to, parents)) {
      const parentDef = parents.find(p => p.name === to)!
      nextState = parentDef.initialChild ?? parentDef.children[0] ?? to
      nextParent = to
    } else {
      nextState = to
      nextParent = getParentOf(to, parents)
    }

    const entry: HistoryEntry = {
      step: history.length + 1,
      from: currentState,
      trigger: transition.trigger,
      to: nextState
    }
    setHistory(prev => prev.concat(entry))
    setCurrentState(nextState)
    setCurrentParentState(nextParent)
  }

  function handleReset() {
    if (stateMachine) {
      initSimulation(stateMachine)
    }
  }

  return (
    <div className={styles.app}>
      <h1>Simulator</h1>
      <main className={styles.main}>
        <InputPanel onGenerate={handleGenerate} loading={loading} />
        <DiagramPanel stateMachine={stateMachine} currentState={currentState} currentParentState={currentParentState} />
        <ControlPanel stateMachine={stateMachine} currentState={currentState} currentParentState={currentParentState} onTrigger={handleTrigger} />
      </main>
      <HistoryPanel history={history} onReset={handleReset} hasStateMachine={stateMachine !== null} />
    </div>
  )
}
