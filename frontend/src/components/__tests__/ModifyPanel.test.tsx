import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ModifyPanel } from "../ModifyPanel"
import "@testing-library/jest-dom"

describe("ModifyPanel", () => {
  it("renders textarea and button", () => {
    render(<ModifyPanel onModify={() => {}} loading={false} />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "変更を適用" })).toBeInTheDocument()
  })

  it("button is disabled when textarea is empty", () => {
    render(<ModifyPanel onModify={() => {}} loading={false} />)
    expect(screen.getByRole("button", { name: "変更を適用" })).toBeDisabled()
  })

  it("button is enabled when textarea has text", () => {
    render(<ModifyPanel onModify={() => {}} loading={false} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "変更依頼" } })
    expect(screen.getByRole("button", { name: "変更を適用" })).not.toBeDisabled()
  })

  it("calls onModify with entered text when button clicked", () => {
    const onModify = vi.fn()
    render(<ModifyPanel onModify={onModify} loading={false} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "変更依頼テスト" } })
    fireEvent.click(screen.getByRole("button", { name: "変更を適用" }))
    expect(onModify).toHaveBeenCalledWith("変更依頼テスト")
  })

  it("shows loading state", () => {
    render(<ModifyPanel onModify={() => {}} loading={true} />)
    expect(screen.getByRole("button", { name: "変更中..." })).toBeDisabled()
  })

  it("clears textarea after submit", () => {
    render(<ModifyPanel onModify={() => {}} loading={false} />)
    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "変更依頼" } })
    fireEvent.click(screen.getByRole("button", { name: "変更を適用" }))
    expect(textarea).toHaveValue("")
  })
})
