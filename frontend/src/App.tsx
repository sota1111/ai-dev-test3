import { useState, useCallback, useEffect } from "react"
import axios from "axios"
import { LoginPage } from "./components/LoginPage"
import { InputPanel } from "./components/InputPanel"
import { DiagramPanel } from "./components/DiagramPanel"
import { ControlPanel } from "./components/ControlPanel"
import { HistoryPanel } from "./components/HistoryPanel"
import { ModifyPanel } from "./components/ModifyPanel"
import { DiffPanel } from "./components/DiffPanel"
import { ModelListPanel } from "./components/ModelListPanel"
import { SaveDialog } from "./components/SaveDialog"
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog"
import { parseStateMachine, modifyStateMachine, fetchModels, getModel, saveModel, updateModel, duplicateModel, deleteModel } from "./api/client"
import type { StateMachine, Transition, HistoryEntry, ParentState, StateMachineDiff, ModifyHistoryEntry, DisplayMode, ModelSummary } from "./types/stateMachine"
import styles from "./App.module.css"

function getParentOf(stateName: string, parentStates: ParentState[]): string | null {
  return parentStates.find(p => p.children.includes(stateName))?.name ?? null
}

function isParentName(name: string, parentStates: ParentState[]): boolean {
  return parentStates.some(p => p.name === name)
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"))
  const [stateMachine, setStateMachine] = useState<StateMachine | null>(null)
  const [currentState, setCurrentState] = useState("")
  const [currentParentState, setCurrentParentState] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [returnStack, setReturnStack] = useState<{ state: string; parentState: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [modifyLoading, setModifyLoading] = useState(false)
  const [latestDiff, setLatestDiff] = useState<StateMachineDiff | null>(null)
  const [modifyHistory, setModifyHistory] = useState<ModifyHistoryEntry[]>([])
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all")
  const [description, setDescription] = useState("")
  const [currentModelId, setCurrentModelId] = useState<string | null>(null)
  const [currentModelName, setCurrentModelName] = useState<string>("")
  const [savedModels, setSavedModels] = useState<ModelSummary[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState("")

  const handleLogin = (newToken: string) => {
    localStorage.setItem("auth_token", newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    setToken(null)
  }

  function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail
      if (typeof detail === "string") return detail
      if (detail) return JSON.stringify(detail)
      return error.message
    }
    return error instanceof Error ? error.message : "処理に失敗しました"
  }

  const loadModelList = useCallback(async () => {
    if (!token) return
    try {
      const models = await fetchModels()
      setSavedModels(models)
    } catch {
      // ignore
    }
  }, [token])

  useEffect(() => {
    loadModelList()
  }, [loadModelList])

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
    setError("")
    try {
      const sm = await parseStateMachine(text)
      setStateMachine(sm)
      initSimulation(sm)
      setLatestDiff(null)
      setModifyHistory([])
      setDisplayMode("all")
      setCurrentModelId(null)
      setCurrentModelName("")
    } catch (err) {
      setError(`状態遷移の生成に失敗しました: ${getErrorMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleModify(request: string) {
    if (!stateMachine) return
    setModifyLoading(true)
    setError("")
    try {
      const { updatedMachine, diff } = await modifyStateMachine(stateMachine, request)
      setStateMachine(updatedMachine)
      initSimulation(updatedMachine)
      setLatestDiff(diff)
      setDisplayMode("all")
      const entry: ModifyHistoryEntry = {
        step: modifyHistory.length + 1,
        request,
        diff,
        timestamp: new Date().toLocaleTimeString("ja-JP"),
      }
      setModifyHistory(prev => prev.concat(entry))
    } catch (err) {
      setError(`状態遷移の変更に失敗しました: ${getErrorMessage(err)}`)
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

    if (to === "$PREVIOUS") {
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

  async function handleLoadModel(id: string) {
    try {
      const detail = await getModel(id)
      setDescription(detail.description)
      setStateMachine(detail.machine)
      initSimulation(detail.machine)
      setLatestDiff(null)
      setModifyHistory([])
      setDisplayMode("all")
      setCurrentModelId(id)
      setCurrentModelName(detail.name)
    } catch {
      // ignore
    }
  }

  async function handleSaveNew(name: string) {
    if (!stateMachine) return
    try {
      const detail = await saveModel(name, description, stateMachine)
      setCurrentModelId(detail.id)
      setCurrentModelName(detail.name)
      setShowSaveDialog(false)
      await loadModelList()
    } catch {
      setShowSaveDialog(false)
    }
  }

  async function handleOverwrite() {
    if (!stateMachine || !currentModelId) return
    try {
      await updateModel(currentModelId, currentModelName, description, stateMachine)
      await loadModelList()
    } catch {
      // ignore
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await duplicateModel(id)
      await loadModelList()
    } catch {
      // ignore
    }
  }

  function handleDeleteRequest(id: string, name: string) {
    setDeleteTarget({ id, name })
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await deleteModel(deleteTarget.id)
      if (currentModelId === deleteTarget.id) {
        setCurrentModelId(null)
        setCurrentModelName("")
      }
      setDeleteTarget(null)
      await loadModelList()
    } catch {
      setDeleteTarget(null)
    }
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Simulator</h1>
        <button onClick={handleLogout} className={styles.logoutBtn}>ログアウト</button>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      <main className={styles.main}>
        <div className={styles.inputCol}>
          <InputPanel
            value={description}
            onChange={setDescription}
            onGenerate={handleGenerate}
            loading={loading}
          />
          {stateMachine && (
            <div className={styles.saveActions}>
              <button className={styles.saveBtn} onClick={() => setShowSaveDialog(true)}>
                保存
              </button>
              {currentModelId && (
                <button className={styles.overwriteBtn} onClick={handleOverwrite}>
                  上書き保存
                </button>
              )}
            </div>
          )}
          {stateMachine && (
            <div className={styles.modifyArea}>
              <ModifyPanel onModify={handleModify} loading={modifyLoading} />
            </div>
          )}
        </div>
        <DiagramPanel
          stateMachine={stateMachine}
          currentState={currentState}
          currentParentState={currentParentState}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        />
        <div className={styles.rightCol}>
          <ControlPanel
            stateMachine={stateMachine}
            currentState={currentState}
            currentParentState={currentParentState}
            onTrigger={handleTrigger}
            onReset={handleReset}
          />
          <DiffPanel latestDiff={latestDiff} history={modifyHistory} />
        </div>
      </main>
      <div className={styles.modelListArea}>
        <ModelListPanel
          models={savedModels}
          currentModelId={currentModelId}
          onLoad={handleLoadModel}
          onDuplicate={handleDuplicate}
          onDelete={handleDeleteRequest}
          onRefresh={loadModelList}
        />
      </div>

      <HistoryPanel history={history} onReset={handleReset} hasStateMachine={stateMachine !== null} />
      <SaveDialog
        open={showSaveDialog}
        onSave={handleSaveNew}
        onCancel={() => setShowSaveDialog(false)}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        modelName={deleteTarget?.name ?? ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
