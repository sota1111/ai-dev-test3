import axios from "axios"
import type { StateMachine, StateMachineDiff } from "../types/stateMachine"

export async function parseStateMachine(text: string): Promise<StateMachine> {
  const res = await axios.post<StateMachine>("/api/parse", { text })
  return res.data
}

export async function modifyStateMachine(
  currentMachine: StateMachine,
  request: string
): Promise<{ updatedMachine: StateMachine; diff: StateMachineDiff }> {
  const res = await axios.post<{ updatedMachine: StateMachine; diff: StateMachineDiff }>(
    "/api/modify",
    { currentMachine, request }
  )
  return res.data
}
