import axios from "axios"
import type { StateMachine } from "../types/stateMachine"

export async function parseStateMachine(text: string): Promise<StateMachine> {
  const res = await axios.post<StateMachine>("/api/parse", { text })
  return res.data
}
