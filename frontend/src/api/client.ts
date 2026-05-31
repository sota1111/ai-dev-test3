import axios from "axios"
import type { StateMachine, StateMachineDiff, ModelSummary, ModelDetail } from "../types/stateMachine"

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

export async function fetchModels(): Promise<ModelSummary[]> {
  const res = await axios.get<{ models: ModelSummary[] }>("/api/models")
  return res.data.models
}

export async function getModel(id: string): Promise<ModelDetail> {
  const res = await axios.get<ModelDetail>( `/api/models/${id}`)
  return res.data
}

export async function saveModel(name: string, description: string, machine: StateMachine): Promise<ModelDetail> {
  const res = await axios.post<ModelDetail>("/api/models", { name, description, machine })
  return res.data
}

export async function updateModel(id: string, name: string, description: string, machine: StateMachine): Promise<ModelDetail> {
  const res = await axios.put<ModelDetail>( `/api/models/${id}`, { name, description, machine })
  return res.data
}

export async function duplicateModel(id: string): Promise<ModelDetail> {
  const res = await axios.post<ModelDetail>( `/api/models/${id}/duplicate`)
  return res.data
}

export async function deleteModel(id: string): Promise<void> {
  await axios.delete( `/api/models/${id}`)
}
