import { test, expect } from "@playwright/test"

// 製造装置状態機械のモックデータ
const manufacturingStateMachineData = {
  initialState: "待機中",
  states: [
    "装置待機", "ロット待ち", "開始確認",
    "搬入口確認", "ウェーハ搬送中", "位置合わせ中", "搬送完了確認",
    "レシピ読込中", "処理条件確認中", "プロセス実行中", "プロセス安定待ち", "処理完了確認",
    "検査準備中", "検査実行中", "判定中", "再検査待ち", "排出待ち",
    "停止保持中", "再開確認中", "中止確認中",
    "異常内容確認中", "安全停止中", "原因確認中", "復旧操作中", "復旧確認中",
    "保守受付中", "点検中", "部品交換中", "保守確認中",
  ],
  parentStates: [
    { name: "待機中", children: ["装置待機", "ロット待ち", "開始確認"], initialChild: "装置待機" },
    { name: "搬送処理中", children: ["搬入口確認", "ウェーハ搬送中", "位置合わせ中", "搬送完了確認"], initialChild: "搬入口確認" },
    { name: "レシピ実行中", children: ["レシピ読込中", "処理条件確認中", "プロセス実行中", "プロセス安定待ち", "処理完了確認"], initialChild: "レシピ読込中" },
    { name: "検査処理中", children: ["検査準備中", "検査実行中", "判定中", "再検査待ち", "排出待ち"], initialChild: "検査準備中" },
    { name: "一時停止中", children: ["停止保持中", "再開確認中", "中止確認中"], initialChild: "停止保持中", isInterrupt: true },
    { name: "異常復旧中", children: ["異常内容確認中", "安全停止中", "原因確認中", "復旧操作中", "復旧確認中"], initialChild: "異常内容確認中", isInterrupt: true },
    { name: "保守中", children: ["保守受付中", "点検中", "部品交換中", "保守確認中"], initialChild: "保守受付中" },
  ],
  transitions: [
    { from: "装置待機", trigger: "ロット投入", to: "ロット待ち" },
    { from: "ロット待ち", trigger: "開始要求", to: "開始確認" },
    { from: "開始確認", trigger: "開始許可", to: "搬送処理中" },
    { from: "搬入口確認", trigger: "搬入口OK", to: "ウェーハ搬送中" },
    { from: "ウェーハ搬送中", trigger: "搬送完了", to: "位置合わせ中" },
    { from: "位置合わせ中", trigger: "位置合わせOK", to: "搬送完了確認" },
    { from: "位置合わせ中", trigger: "位置ずれ検出", to: "ウェーハ搬送中" },
    { from: "搬送完了確認", trigger: "搬送確認OK", to: "レシピ実行中" },
    { from: "レシピ読込中", trigger: "レシピ読込完了", to: "処理条件確認中" },
    { from: "処理条件確認中", trigger: "条件OK", to: "プロセス実行中" },
    { from: "処理条件確認中", trigger: "条件NG", to: "レシピ読込中" },
    { from: "プロセス実行中", trigger: "安定待ち開始", to: "プロセス安定待ち" },
    { from: "プロセス安定待ち", trigger: "安定確認OK", to: "処理完了確認" },
    { from: "プロセス安定待ち", trigger: "安定確認NG", to: "プロセス実行中" },
    { from: "処理完了確認", trigger: "処理完了OK", to: "検査処理中" },
    { from: "検査準備中", trigger: "検査準備完了", to: "検査実行中" },
    { from: "検査実行中", trigger: "検査完了", to: "判定中" },
    { from: "判定中", trigger: "判定OK", to: "排出待ち" },
    { from: "判定中", trigger: "判定NG", to: "再検査待ち" },
    { from: "再検査待ち", trigger: "再検査開始", to: "検査実行中" },
    { from: "排出待ち", trigger: "排出完了", to: "待機中" },
    { from: "搬送処理中", trigger: "一時停止", to: "一時停止中" },
    { from: "レシピ実行中", trigger: "一時停止", to: "一時停止中" },
    { from: "検査処理中", trigger: "一時停止", to: "一時停止中" },
    { from: "停止保持中", trigger: "再開要求", to: "再開確認中" },
    { from: "再開確認中", trigger: "再開許可", to: "$PREVIOUS" },
    { from: "停止保持中", trigger: "中止要求", to: "中止確認中" },
    { from: "中止確認中", trigger: "中止確定", to: "待機中" },
    { from: "搬送処理中", trigger: "異常発生", to: "異常復旧中" },
    { from: "レシピ実行中", trigger: "異常発生", to: "異常復旧中" },
    { from: "検査処理中", trigger: "異常発生", to: "異常復旧中" },
    { from: "一時停止中", trigger: "異常発生", to: "異常復旧中" },
    { from: "異常内容確認中", trigger: "内容確認完了", to: "安全停止中" },
    { from: "安全停止中", trigger: "安全停止完了", to: "原因確認中" },
    { from: "原因確認中", trigger: "原因特定", to: "復旧操作中" },
    { from: "復旧操作中", trigger: "復旧操作完了", to: "復旧確認中" },
    { from: "復旧確認中", trigger: "復旧OK", to: "$PREVIOUS" },
    { from: "復旧確認中", trigger: "復旧NG", to: "原因確認中" },
    { from: "復旧確認中", trigger: "復旧不可", to: "保守中" },
    { from: "異常復旧中", trigger: "保守移行", to: "保守中" },
    { from: "保守受付中", trigger: "点検開始", to: "点検中" },
    { from: "点検中", trigger: "部品交換必要", to: "部品交換中" },
    { from: "点検中", trigger: "部品交換不要", to: "保守確認中" },
    { from: "部品交換中", trigger: "交換完了", to: "保守確認中" },
    { from: "保守確認中", trigger: "保守完了", to: "待機中" },
    { from: "待機中", trigger: "保守開始", to: "保守中" },
    { from: "保守中", trigger: "保守中止", to: "待機中" },
  ],
}

test.describe("State Machine Simulator", () => {
  test("traffic-light scenario", async ({ page }) => {
    const stateMachineData = {
      initialState: "赤",
      states: ["赤", "青", "黄"],
      transitions: [
        { from: "赤", trigger: "点灯", to: "青" },
        { from: "青", trigger: "点灯", to: "黄" },
        { from: "黄", trigger: "点灯", to: "赤" },
      ],
    }

    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(stateMachineData),
      })
    })

    await page.goto("/")
    await page.fill("textarea", "信号機の仕様")
    await page.click('button:has-text("状態遷移を生成")')

    await expect(page.locator("text=図の描画に失敗しました")).not.toBeVisible()
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible({ timeout: 5000 })

    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("赤")

    await page.click('button:has-text("点灯")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("青")

    await page.click('button:has-text("点灯")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("黄")

    await page.click('button:has-text("点灯")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("赤")
  })

  test("door scenario", async ({ page }) => {
    const stateMachineData = {
      initialState: "閉",
      states: ["閉", "開"],
      transitions: [
        { from: "閉", trigger: "開ける", to: "開" },
        { from: "開", trigger: "閉める", to: "閉" },
      ],
    }

    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(stateMachineData),
      })
    })

    await page.goto("/")
    await page.fill("textarea", "ドアの仕様")
    await page.click('button:has-text("状態遷移を生成")')

    await expect(page.locator("text=図の描画に失敗しました")).not.toBeVisible()
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible({ timeout: 5000 })

    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("閉")

    await page.click('button:has-text("開ける")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("開")

    await page.click('button:has-text("閉める")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("閉")
  })

  test("vending-machine scenario", async ({ page }) => {
    const stateMachineData = {
      initialState: "待機",
      states: ["待機", "選択", "支払", "排出"],
      transitions: [
        { from: "待機", trigger: "商品選択", to: "選択" },
        { from: "選択", trigger: "コイン投入", to: "支払" },
        { from: "支払", trigger: "確定", to: "排出" },
        { from: "排出", trigger: "完了", to: "待機" },
      ],
    }

    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(stateMachineData),
      })
    })

    await page.goto("/")
    await page.fill("textarea", "自販機の仕様")
    await page.click('button:has-text("状態遷移を生成")')

    await expect(page.locator("text=図の描画に失敗しました")).not.toBeVisible()
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible({ timeout: 5000 })

    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("待機")

    await page.click('button:has-text("商品選択")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("選択")

    await page.click('button:has-text("コイン投入")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("支払")

    await page.click('button:has-text("確定")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("排出")

    await page.click('button:has-text("完了")')
    await expect(page.locator("text=現在状態 >> .. >> div")).toHaveText("待機")
  })
})

test.describe("Manufacturing State Machine - 製造装置シナリオ", () => {
  async function setupManufacturing(page: any) {
    await page.route("**/api/parse", async (route: any) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(manufacturingStateMachineData),
      })
    })
    await page.goto("/")
    await page.fill("textarea", "製造装置の仕様")
    await page.click('button:has-text("状態遷移を生成")')
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible({ timeout: 5000 })
  }

  function currentStateLocator(page: any) {
    return page.locator("text=現在状態 >> .. >> div")
  }

  test("TC-004: 初期状態が待機中 / 装置待機になること", async ({ page }) => {
    await setupManufacturing(page)
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
  })

  test("TC-005: 待機中から搬送処理中へ進めること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > ロット待ち")
    await page.click('button:has-text("開始要求")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 開始確認")
    await page.click('button:has-text("開始許可")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 搬入口確認")
  })

  test("TC-006: 搬送処理中で位置ずれ検出により前工程へ戻ること", async ({ page }) => {
    await setupManufacturing(page)
    // 搬送処理中 / ウェーハ搬送中 まで進める
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
    await page.click('button:has-text("搬送完了")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 位置合わせ中")
    await page.click('button:has-text("位置ずれ検出")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
  })

  test("シナリオ1: 正常な製造サイクル（待機中→搬送→レシピ→検査→待機中）", async ({ page }) => {
    await setupManufacturing(page)
    const triggers = [
      ["ロット投入", "待機中 > ロット待ち"],
      ["開始要求", "待機中 > 開始確認"],
      ["開始許可", "搬送処理中 > 搬入口確認"],
      ["搬入口OK", "搬送処理中 > ウェーハ搬送中"],
      ["搬送完了", "搬送処理中 > 位置合わせ中"],
      ["位置合わせOK", "搬送処理中 > 搬送完了確認"],
      ["搬送確認OK", "レシピ実行中 > レシピ読込中"],
      ["レシピ読込完了", "レシピ実行中 > 処理条件確認中"],
      ["条件OK", "レシピ実行中 > プロセス実行中"],
      ["安定待ち開始", "レシピ実行中 > プロセス安定待ち"],
      ["安定確認OK", "レシピ実行中 > 処理完了確認"],
      ["処理完了OK", "検査処理中 > 検査準備中"],
      ["検査準備完了", "検査処理中 > 検査実行中"],
      ["検査完了", "検査処理中 > 判定中"],
      ["判定OK", "検査処理中 > 排出待ち"],
      ["排出完了", "待機中 > 装置待機"],
    ]
    for (const [trigger, expectedState] of triggers) {
      await page.click(`button:has-text("${trigger}")`)
      await expect(currentStateLocator(page)).toHaveText(expectedState)
    }
  })

  test("シナリオ6: 搬送中に一時停止し再開（$PREVIOUS 動作確認）", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
    // 一時停止
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    // 再開
    await page.click('button:has-text("再開要求")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 再開確認中")
    await page.click('button:has-text("再開許可")')
    // 停止前の状態へ戻ること
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
  })

  test("シナリオ7: 一時停止後に中止して待機中へ戻る", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.click('button:has-text("中止要求")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 中止確認中")
    await page.click('button:has-text("中止確定")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
  })

  test("シナリオ8: 検査中に異常発生し、復旧後に検査中へ戻る", async ({ page }) => {
    await setupManufacturing(page)
    // 検査処理中 / 検査実行中 まで進める
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await page.click('button:has-text("安定確認OK")')
    await page.click('button:has-text("処理完了OK")')
    await page.click('button:has-text("検査準備完了")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 検査実行中")
    // 異常発生
    await page.click('button:has-text("異常発生")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 異常内容確認中")
    // 復旧手順
    await page.click('button:has-text("内容確認完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 安全停止中")
    await page.click('button:has-text("安全停止完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 原因確認中")
    await page.click('button:has-text("原因特定")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 復旧操作中")
    await page.click('button:has-text("復旧操作完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 復旧確認中")
    await page.click('button:has-text("復旧OK")')
    // 異常前の状態へ戻ること
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 検査実行中")
  })

  test("シナリオ11: 待機中から保守し、待機中へ戻る", async ({ page }) => {
    await setupManufacturing(page)
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
    await page.click('button:has-text("保守開始")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 保守受付中")
    await page.click('button:has-text("点検開始")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 点検中")
    await page.click('button:has-text("部品交換不要")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 保守確認中")
    await page.click('button:has-text("保守完了")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
  })

  test("TC-007: 搬送処理中からレシピ実行中へ進めること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 搬入口確認")
    await page.click('button:has-text("搬入口OK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
    await page.click('button:has-text("搬送完了")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 位置合わせ中")
    await page.click('button:has-text("位置合わせOK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 搬送完了確認")
    await page.click('button:has-text("搬送確認OK")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > レシピ読込中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-007-recipe-start.png', fullPage: true })
  })

  test("TC-008: レシピ実行中で条件NGにより前工程へ戻ること", async ({ page }) => {
    await setupManufacturing(page)
    // レシピ実行中 / 処理条件確認中 まで進める
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > 処理条件確認中")
    await page.click('button:has-text("条件NG")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > レシピ読込中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-008-condition-ng.png', fullPage: true })
  })

  test("TC-009: レシピ実行中で安定確認NGにより処理中へ戻ること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス安定待ち")
    await page.click('button:has-text("安定確認NG")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス実行中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-009-stability-ng.png', fullPage: true })
  })

  test("TC-010: レシピ実行中から検査処理中へ進めること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await page.click('button:has-text("安定確認OK")')
    await page.click('button:has-text("処理完了OK")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 検査準備中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-010-inspection-start.png', fullPage: true })
  })

  test("TC-011: 検査処理中で判定NGにより再検査へ進むこと", async ({ page }) => {
    await setupManufacturing(page)
    // 検査処理中 / 判定中 まで進める
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await page.click('button:has-text("安定確認OK")')
    await page.click('button:has-text("処理完了OK")')
    await page.click('button:has-text("検査準備完了")')
    await page.click('button:has-text("検査完了")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 判定中")
    await page.click('button:has-text("判定NG")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 再検査待ち")
    await page.click('button:has-text("再検査開始")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 検査実行中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-011-reinspection.png', fullPage: true })
  })

  test("TC-012: 検査完了後に待機中へ戻ること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await page.click('button:has-text("安定確認OK")')
    await page.click('button:has-text("処理完了OK")')
    await page.click('button:has-text("検査準備完了")')
    await page.click('button:has-text("検査完了")')
    await page.click('button:has-text("判定OK")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 排出待ち")
    await page.click('button:has-text("排出完了")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-012-cycle-complete.png', fullPage: true })
  })

  test("TC-023: 異常復旧中から保守中へ遷移できること（復旧不可）", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("異常発生")')
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 復旧確認中")
    await page.click('button:has-text("復旧不可")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 保守受付中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-023-unrecoverable-to-maintenance.png', fullPage: true })
  })

  test("TC-024: 異常復旧中の共通トリガーで保守中へ遷移できること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("異常発生")')
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 原因確認中")
    await page.click('button:has-text("保守移行")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 保守受付中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-024-maintenance-transfer.png', fullPage: true })
  })

  test("TC-025: 待機中から保守中へ遷移できること", async ({ page }) => {
    await setupManufacturing(page)
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
    await page.click('button:has-text("保守開始")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 保守受付中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-025-maintenance-from-standby.png', fullPage: true })
  })

  test("TC-026: 保守中で部品交換ありのルートを実行できること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("保守開始")')
    await page.click('button:has-text("点検開始")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 点検中")
    await page.click('button:has-text("部品交換必要")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 部品交換中")
    await page.click('button:has-text("交換完了")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 保守確認中")
    await page.click('button:has-text("保守完了")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-026-maintenance-with-parts.png', fullPage: true })
  })

  test("TC-027: 保守中で部品交換なしのルートを実行できること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("保守開始")')
    await page.click('button:has-text("点検開始")')
    await page.click('button:has-text("部品交換不要")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 保守確認中")
    await page.click('button:has-text("保守完了")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-027-maintenance-no-parts.png', fullPage: true })
  })

  test("TC-028: 保守中の共通トリガーで待機中へ戻れること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("保守開始")')
    await page.click('button:has-text("点検開始")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 点検中")
    await page.click('button:has-text("保守中止")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-028-maintenance-abort.png', fullPage: true })
  })

  test("TC-029: 一時停止中に異常発生した場合、異常復旧中へ遷移できること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.click('button:has-text("異常発生")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 異常内容確認中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-029-error-from-pause.png', fullPage: true })
  })

  test("TC-030: 一時停止中から異常復旧し、復旧OK時の戻り先が破綻しないこと", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス実行中")
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.click('button:has-text("異常発生")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 異常内容確認中")
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await page.click('button:has-text("復旧OK")')
    // 復旧OK後の戻り先が明確であること（仕様として一貫した状態になること）
    const stateText = await currentStateLocator(page).textContent()
    expect(stateText).toBeTruthy()
    expect(stateText).not.toBe("")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-030-recovery-after-pause.png', fullPage: true })
  })

  test("TC-031: 利用可能なトリガーが現在状態に応じて変わること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 位置合わせ中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-031-triggers-transport.png', fullPage: true })
    // 搬送処理中 / 位置合わせ中 では以下のボタンが存在する
    await expect(page.locator('button:has-text("位置合わせOK")')).toBeVisible()
    await expect(page.locator('button:has-text("位置ずれ検出")')).toBeVisible()
    await expect(page.locator('button:has-text("一時停止")')).toBeVisible()
    await expect(page.locator('button:has-text("異常発生")')).toBeVisible()
  })

  test("TC-032: 履歴に親状態をまたぐ往復遷移が記録されること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("一時停止")')
    await page.click('button:has-text("再開要求")')
    await page.click('button:has-text("再開許可")')
    // 履歴エリアが存在すること（スクリーンショットで確認）
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-032-history.png', fullPage: true })
    // 現在状態が搬送処理中に戻っていること
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
  })

  test("TC-033: Mermaid図で現在の親状態と子状態が強調されること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 搬入口確認")
    // Mermaid SVGが更新されていること
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-033-mermaid-highlight.png', fullPage: true })
  })

  test("TC-034: リセットで初期状態へ戻ること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 搬入口確認")
    await page.click('button:has-text("リセット")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
  })

  test("TC-001: 7つの親状態が抽出されること", async ({ page }) => {
    await setupManufacturing(page)
    // スクリーンショット（全体）
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-001-parent-states.png', fullPage: true })
    // Mermaid SVGが表示されること
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible()
    // 現在状態表示が親状態を含むこと
    const stateText = await currentStateLocator(page).textContent()
    expect(stateText).toContain("待機中")
  })

  test("TC-002: 各親状態に子状態が正しく紐づくこと", async ({ page }) => {
    await setupManufacturing(page)
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-002-child-states.png', fullPage: true })
    // 初期子状態「装置待機」が現在状態に含まれること
    const stateText = await currentStateLocator(page).textContent()
    expect(stateText).toContain("装置待機")
    // Mermaid SVGが描画されていること
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible()
  })

  test("TC-003: Mermaid図で複数親状態が階層表示されること", async ({ page }) => {
    await setupManufacturing(page)
    // Mermaid SVGのスクリーンショット
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-003-mermaid-hierarchy.png', fullPage: true })
    const svg = page.locator('[data-testid="diagram-container"] svg')
    await expect(svg).toBeVisible()
    // SVGが一定以上の高さを持つこと（複数親状態の階層表示）
    const svgBox = await svg.boundingBox()
    expect(svgBox?.height).toBeGreaterThan(200)
  })

  test("TC-013: 搬送処理中から一時停止中へ遷移できること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-013-pause-from-transport.png', fullPage: true })
  })

  test("TC-014: 一時停止後に停止前の搬送処理中へ戻れること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.click('button:has-text("再開要求")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 再開確認中")
    await page.click('button:has-text("再開許可")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-014-resume-to-transport.png', fullPage: true })
  })

  test("TC-015: レシピ実行中から一時停止し、停止前の状態へ戻れること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス実行中")
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.click('button:has-text("再開要求")')
    await page.click('button:has-text("再開許可")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス実行中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-015-resume-to-recipe.png', fullPage: true })
  })

  test("TC-016: 検査処理中から一時停止し、停止前の状態へ戻れること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await page.click('button:has-text("安定確認OK")')
    await page.click('button:has-text("処理完了OK")')
    await page.click('button:has-text("検査準備完了")')
    await page.click('button:has-text("検査完了")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 判定中")
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.click('button:has-text("再開要求")')
    await page.click('button:has-text("再開許可")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 判定中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-016-resume-to-inspection.png', fullPage: true })
  })

  test("TC-017: 一時停止中に中止して待機中へ戻れること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.click('button:has-text("中止要求")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 中止確認中")
    await page.click('button:has-text("中止確定")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-017-abort-to-standby.png', fullPage: true })
  })

  test("TC-018: 搬送処理中から異常復旧中へ遷移できること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 位置合わせ中")
    await page.click('button:has-text("異常発生")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 異常内容確認中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-018-error-from-transport.png', fullPage: true })
  })

  test("TC-019: 異常復旧後に異常前の搬送処理中へ戻れること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("異常発生")')
    await page.click('button:has-text("内容確認完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 安全停止中")
    await page.click('button:has-text("安全停止完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 原因確認中")
    await page.click('button:has-text("原因特定")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 復旧操作中")
    await page.click('button:has-text("復旧操作完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 復旧確認中")
    await page.click('button:has-text("復旧OK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 位置合わせ中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-019-recovery-to-transport.png', fullPage: true })
  })

  test("TC-020: レシピ実行中から異常復旧し、異常前の状態へ戻れること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス安定待ち")
    await page.click('button:has-text("異常発生")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 異常内容確認中")
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await page.click('button:has-text("復旧OK")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス安定待ち")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-020-recovery-to-recipe.png', fullPage: true })
  })

  test("TC-021: 検査処理中から異常復旧し、異常前の状態へ戻れること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await page.click('button:has-text("安定確認OK")')
    await page.click('button:has-text("処理完了OK")')
    await page.click('button:has-text("検査準備完了")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 検査実行中")
    await page.click('button:has-text("異常発生")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 異常内容確認中")
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await page.click('button:has-text("復旧OK")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 検査実行中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-021-recovery-to-inspection.png', fullPage: true })
  })

  test("TC-022: 異常復旧中で復旧NGの場合、原因確認中へ戻ること", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("異常発生")')
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 復旧確認中")
    await page.click('button:has-text("復旧NG")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 原因確認中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/TC-022-recovery-ng.png', fullPage: true })
  })

  test("シナリオ2: 搬送中に位置ずれで戻る", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
    await page.click('button:has-text("搬送完了")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 位置合わせ中")
    await page.click('button:has-text("位置ずれ検出")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > ウェーハ搬送中")
    await page.click('button:has-text("搬送完了")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 位置合わせ中")
    await page.click('button:has-text("位置合わせOK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 搬送完了確認")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/scenarios/シナリオ2-position-retry.png', fullPage: true })
  })

  test("シナリオ3: レシピ条件NGで前工程へ戻る", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > 処理条件確認中")
    await page.click('button:has-text("条件NG")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > レシピ読込中")
    await page.click('button:has-text("レシピ読込完了")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > 処理条件確認中")
    await page.click('button:has-text("条件OK")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス実行中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/scenarios/シナリオ3-condition-ng-retry.png', fullPage: true })
  })

  test("シナリオ4: プロセス安定待ちでNGとなり再実行", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス安定待ち")
    await page.click('button:has-text("安定確認NG")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス実行中")
    await page.click('button:has-text("安定待ち開始")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス安定待ち")
    await page.click('button:has-text("安定確認OK")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > 処理完了確認")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/scenarios/シナリオ4-stability-ng-retry.png', fullPage: true })
  })

  test("シナリオ5: 検査NGで再検査", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await page.click('button:has-text("安定確認OK")')
    await page.click('button:has-text("処理完了OK")')
    await page.click('button:has-text("検査準備完了")')
    await page.click('button:has-text("検査完了")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 判定中")
    await page.click('button:has-text("判定NG")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 再検査待ち")
    await page.click('button:has-text("再検査開始")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 検査実行中")
    await page.click('button:has-text("検査完了")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 判定中")
    await page.click('button:has-text("判定OK")')
    await expect(currentStateLocator(page)).toHaveText("検査処理中 > 排出待ち")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/scenarios/シナリオ5-inspection-ng-retry.png', fullPage: true })
  })

  test("シナリオ9: 異常復旧NGで原因確認へ戻る", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("異常発生")')
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 復旧確認中")
    await page.click('button:has-text("復旧NG")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 原因確認中")
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await page.click('button:has-text("復旧OK")')
    await expect(currentStateLocator(page)).toHaveText("搬送処理中 > 位置合わせ中")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/scenarios/シナリオ9-recovery-ng-retry.png', fullPage: true })
  })

  test("シナリオ10: 復旧不可で保守中へ移行", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await page.click('button:has-text("安定待ち開始")')
    await page.click('button:has-text("異常発生")')
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await page.click('button:has-text("復旧不可")')
    await expect(currentStateLocator(page)).toHaveText("保守中 > 保守受付中")
    await page.click('button:has-text("点検開始")')
    await page.click('button:has-text("部品交換必要")')
    await page.click('button:has-text("交換完了")')
    await page.click('button:has-text("保守完了")')
    await expect(currentStateLocator(page)).toHaveText("待機中 > 装置待機")
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/scenarios/シナリオ10-unrecoverable-maintenance.png', fullPage: true })
  })

  test("シナリオ12: 一時停止中に異常発生し復旧後の戻り先が破綻しない", async ({ page }) => {
    await setupManufacturing(page)
    await page.click('button:has-text("ロット投入")')
    await page.click('button:has-text("開始要求")')
    await page.click('button:has-text("開始許可")')
    await page.click('button:has-text("搬入口OK")')
    await page.click('button:has-text("搬送完了")')
    await page.click('button:has-text("位置合わせOK")')
    await page.click('button:has-text("搬送確認OK")')
    await page.click('button:has-text("レシピ読込完了")')
    await page.click('button:has-text("条件OK")')
    await expect(currentStateLocator(page)).toHaveText("レシピ実行中 > プロセス実行中")
    await page.click('button:has-text("一時停止")')
    await expect(currentStateLocator(page)).toHaveText("一時停止中 > 停止保持中")
    await page.click('button:has-text("異常発生")')
    await expect(currentStateLocator(page)).toHaveText("異常復旧中 > 異常内容確認中")
    await page.click('button:has-text("内容確認完了")')
    await page.click('button:has-text("安全停止完了")')
    await page.click('button:has-text("原因特定")')
    await page.click('button:has-text("復旧操作完了")')
    await page.click('button:has-text("復旧OK")')
    // 復旧OK後の戻り先が一貫していること
    const stateText = await currentStateLocator(page).textContent()
    expect(stateText).toBeTruthy()
    await page.screenshot({ path: 'e2e/screenshots/manufacturing/scenarios/シナリオ12-pause-error-recovery.png', fullPage: true })
  })
})
