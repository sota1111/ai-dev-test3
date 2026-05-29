import { useState } from "react"
import { InputPanel } from "./components/InputPanel"
import { DiagramPanel } from "./components/DiagramPanel"
import { ControlPanel } from "./components/ControlPanel"
import { HistoryPanel } from "./components/HistoryPanel"
import { parseStateMachine } from "./api/client"
import type { StateMachine, Transition, HistoryEntry } from "./types/stateMachine"
import styles from "./App.module.css"

export default function App() {
  const [stateMachine, setStateMachine] = useState<StateMachine | null>(null)
  const [currentState, setCurrentState] = useState("")
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  async function handleGenerate(text: string) {
    setLoading(true)
    try {
      const sm = await parseStateMachine(text)
      setStateMachine(sm)
      setCurrentState(sm.initialState)
      setHistory([])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function handleTrigger(transition: Transition) {
    const entry: HistoryEntry = {
      step: history.length + 1,
      from: currentState,
      trigger: transition.trigger,
      to: transition.to
    }
    setHistory(prev => prev.concat(entry))
    setCurrentState(transition.to)
  }

  function handleReset() {
    if (stateMachine) {
      setCurrentState(stateMachine.initialState)
      setHistory([])
    }
  }

  return (
    <div className={styles.app}>
      <h1>Simulator</h1>
      <main className={styles.main}>
        <InputPanel onGenerate={handleGenerate} loading={loading} />
        <DiagramPanel stateMachine={stateMachine} currentState={currentState} />
        <ControlPanel stateMachine={stateMachine} currentState={currentState} onTrigger={handleTrigger} />
      </main>
      <HistoryPanel history={history} onReset={handleReset} hasStateMachine={stateMachine !== null} />
    </div>
  )
}
