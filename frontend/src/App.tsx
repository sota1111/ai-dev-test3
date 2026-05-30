import { useState } from "react"
import { InputPanel } from "./components/InputPanel"
import { DiagramPanel } from "./components/DiagramPanel"
import { ControlPanel } from "./components/ControlPanel"
import { HistoryPanel } from "./components/HistoryPanel"
import { ModifyPanel } from "./components/ModifyPanel"
import { DiffPanel } from "./components/DiffPanel"
import { parseStateMachine, modifyStateMachine } from "./api/client"
import type { StateMachine, Transition, HistoryEntry, ParentState, StateMachineDiff, ModifyHistoryEntry, DisplayMode } from "./types/stateMachine"
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
  const [returnStack, setReturnStack] = useState<{ state: string; parentState: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [modifyLoading, setModifyLoading] = useState(false)
  const [latestDiff, setLatestDiff] = useState<StateMachineDiff | null>(null)
  const [modifyHistory, setModifyHistory] = useState<ModifyHistoryEntry[]>([])
  const [displayMode, setDisplayMode] = useState<DisplayMode>('all')

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
    setReturnStack([])
  }

  async function handleGenerate(text: string) {
    setLoading(true)
    try {
      const sm = await parseStateMachine(text)
      setStateMachine(sm)
      initSimulation(sm)
      setLatestDiff(null)
      setModifyHistory([])
      setDisplayMode('all')
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function handleModify(request: string) {
    if (!stateMachine) return
    setModifyLoading(true)
    try {
      const { updatedMachine, diff } = await modifyStateMachine(stateMachine, request)
      setStateMachine(updatedMachine)
      initSimulation(updatedMachine)
      setLatestDiff(diff)
      const entry: ModifyHistoryEntry = {
        step: modifyHistory.length + 1,
        request,
        diff,
        timestamp: new Date().toLocaleTimeString("ja-JP"),
      }
      setModifyHistory(prev => prev.concat(entry))
    } catch {
    } finally {
      setModifyLoading(false)
    }
  }

  function handleTrigger(transition: Transition) {
    const { to } = transition
    const parents = stateMachine?.parentStates ?? []
    let nextState: string
    let nextParent: string | null
    let newReturnStack = returnStack

    if (to === '$PREVIOUS') {
      const prev = returnStack[returnStack.length - 1]
      if (!prev) return
      newReturnStack = returnStack.slice(0, -1)
      nextState = prev.state
      nextParent = prev.parentState
    } else if (isParentName(to, parents)) {
      const parentDef = parents.find(p => p.name === to)!
      if (parentDef.isInterrupt) {
        newReturnStack = [...returnStack, { state: currentState, parentState: currentParentState }]
      }
      nextState = parentDef.initialChild ?? parentDef.children[0] ?? to
      nextParent = to
    } else {
      nextState = to
      nextParent = getParentOf(to, parents)
    }

    const entry: HistoryEntry = {
      step: history.length + 1,
      from: currentState,
      fromParent: currentParentState,
      trigger: transition.trigger,
      to: nextState,
      toParent: nextParent,
    }
    setHistory(prev => prev.concat(entry))
    setReturnStack(newReturnStack)
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
        <DiagramPanel
          stateMachine={stateMachine}
          currentState={currentState}
          currentParentState={currentParentState}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        />
        <ControlPanel stateMachine={stateMachine} currentState={currentState} currentParentState={currentParentState} onTrigger={handleTrigger} />
      </main>
      {stateMachine && (
        <div className={styles.footer}>
          <ModifyPanel onModify={handleModify} loading={modifyLoading} />
          <DiffPanel latestDiff={latestDiff} history={modifyHistory} />
        </div>
      )}
      <HistoryPanel history={history} onReset={handleReset} hasStateMachine={stateMachine !== null} />
    </div>
  )
}
