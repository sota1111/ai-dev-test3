import { test } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOT_DIR = path.join(__dirname, "../../docs/screenshots/SOT-158")

const robotMaintenanceData = {
  initialState: "問い合わせ受付",
  states: [
    "問い合わせ受付",
    "障害分析中",
    "一次切り分け",
    "開発会社確認待ち",
    "保守会社対応中",
    "現地訪問調整中",
    "修正対応中",
    "動作確認中",
    "完了",
    "再調査",
  ],
  parentStates: [],
  transitions: [
    { from: "問い合わせ受付", trigger: "分析開始", to: "障害分析中" },
    { from: "障害分析中", trigger: "分析完了", to: "一次切り分け" },
    { from: "一次切り分け", trigger: "開発会社確認必要", to: "開発会社確認待ち" },
    { from: "一次切り分け", trigger: "保守会社対応可能", to: "保守会社対応中" },
    { from: "開発会社確認待ち", trigger: "確認完了", to: "保守会社対応中" },
    { from: "開発会社確認待ち", trigger: "差し戻し", to: "再調査" },
    { from: "保守会社対応中", trigger: "現地対応必要", to: "現地訪問調整中" },
    { from: "保守会社対応中", trigger: "リモート修正開始", to: "修正対応中" },
    { from: "現地訪問調整中", trigger: "現地到着", to: "修正対応中" },
    { from: "修正対応中", trigger: "修正完了", to: "動作確認中" },
    { from: "動作確認中", trigger: "確認OK", to: "完了" },
    { from: "動作確認中", trigger: "確認NG", to: "再調査" },
    { from: "再調査", trigger: "再調査開始", to: "障害分析中" },
    { from: "完了", trigger: "再問い合わせ", to: "問い合わせ受付" },
  ],
}

async function setupRobotMaintenance(page) {
  await page.route("**/api/parse", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(robotMaintenanceData),
    })
  })
  await page.goto("/")
  await page.fill("textarea", "ロボット開発会社が保守会社へ障害対応を依頼するフロー")
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01_input_screen.png`, fullPage: true })
  await page.click('button:has-text("状態遷移を生成")')
  await page.waitForSelector('button:has-text("分析開始")', { timeout: 10000 })
}

test("SOT-158: 入力画面と状態遷移図", async ({ page }) => {
  await setupRobotMaintenance(page)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02_state_diagram.png`, fullPage: true })
})

test("SOT-158: 差し戻し遷移", async ({ page }) => {
  await setupRobotMaintenance(page)
  await page.click('button:has-text("分析開始")')
  await page.click('button:has-text("分析完了")')
  await page.click('button:has-text("開発会社確認必要")')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03_waiting_for_dev.png`, fullPage: true })
  await page.click('button:has-text("差し戻し")')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04_rollback.png`, fullPage: true })
})

test("SOT-158: 完了状態", async ({ page }) => {
  await setupRobotMaintenance(page)
  await page.click('button:has-text("分析開始")')
  await page.click('button:has-text("分析完了")')
  await page.click('button:has-text("保守会社対応可能")')
  await page.click('button:has-text("リモート修正開始")')
  await page.click('button:has-text("修正完了")')
  await page.click('button:has-text("確認OK")')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05_completed.png`, fullPage: true })
})

test("SOT-158: 完了後の再オープン", async ({ page }) => {
  await setupRobotMaintenance(page)
  await page.click('button:has-text("分析開始")')
  await page.click('button:has-text("分析完了")')
  await page.click('button:has-text("保守会社対応可能")')
  await page.click('button:has-text("リモート修正開始")')
  await page.click('button:has-text("修正完了")')
  await page.click('button:has-text("確認OK")')
  await page.click('button:has-text("再問い合わせ")')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06_reopened.png`, fullPage: true })
})

test("SOT-158: シミュレーション履歴", async ({ page }) => {
  await setupRobotMaintenance(page)
  await page.click('button:has-text("分析開始")')
  await page.click('button:has-text("分析完了")')
  await page.click('button:has-text("保守会社対応可能")')
  await page.click('button:has-text("リモート修正開始")')
  await page.click('button:has-text("修正完了")')
  await page.click('button:has-text("確認OK")')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/07_history.png`, fullPage: true })
})

test("SOT-158: リセット確認", async ({ page }) => {
  await setupRobotMaintenance(page)
  await page.click('button:has-text("分析開始")')
  await page.click('button:has-text("分析完了")')
  await page.click('button:has-text("保守会社対応可能")')
  await page.click('button:has-text("リセット")')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/08_reset.png`, fullPage: true })
})
