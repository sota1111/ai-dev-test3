import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DiffPanel } from "../DiffPanel"
import type { StateMachineDiff, ModifyHistoryEntry } from "../../types/stateMachine"
import "@testing-library/jest-dom"

const emptyDiff: StateMachineDiff = {
  addedStates: [],
  removedStates: [],
  addedTransitions: [],
  removedTransitions: [],
  addedParentStates: [],
  removedParentStates: [],
  modifiedParentStates: [],
}

describe("DiffPanel", () => {
  it("renders nothing when no diff and no history", () => {
    const { container } = render(<DiffPanel latestDiff={null} history={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows added states", () => {
    const diff: StateMachineDiff = { ...emptyDiff, addedStates: ["点滅"] }
    render(<DiffPanel latestDiff={diff} history={[]} />)
    expect(screen.getByText("点滅")).toBeInTheDocument()
    expect(screen.getByText(/追加された状態/)).toBeInTheDocument()
  })

  it("shows removed states", () => {
    const diff: StateMachineDiff = { ...emptyDiff, removedStates: ["エラー"] }
    render(<DiffPanel latestDiff={diff} history={[]} />)
    expect(screen.getByText("エラー")).toBeInTheDocument()
    expect(screen.getByText(/削除された状態/)).toBeInTheDocument()
  })

  it("shows no change message when diff is empty", () => {
    render(<DiffPanel latestDiff={emptyDiff} history={[]} />)
    expect(screen.getByText("変更はありませんでした。")).toBeInTheDocument()
  })

  it("shows modify history entries", () => {
    const history: ModifyHistoryEntry[] = [
      {
        step: 1,
        request: "点滅を追加",
        diff: { ...emptyDiff, addedStates: ["点滅"] },
        timestamp: "10:00:00",
      }
    ]
    render(<DiffPanel latestDiff={null} history={history} />)
    expect(screen.getByText("点滅を追加")).toBeInTheDocument()
    expect(screen.getByText("10:00:00")).toBeInTheDocument()
  })
})
