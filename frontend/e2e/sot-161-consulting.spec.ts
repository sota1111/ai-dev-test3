import { test } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SS = path.join(__dirname, "../../docs/screenshots/SOT-161")

const data = {
  initialState: "現状調査",
  states: ["現状調査","課題整理","改善案作成","提案レビュー","顧客確認","修正依頼","再提案","承認","導入支援","効果測定","追加改善"],
  parentStates: [],
  transitions: [
    {from:"現状調査",trigger:"調査完了",to:"課題整理"},
    {from:"課題整理",trigger:"課題特定",to:"改善案作成"},
    {from:"改善案作成",trigger:"案完成",to:"提案レビュー"},
    {from:"提案レビュー",trigger:"レビューOK",to:"顧客確認"},
    {from:"提案レビュー",trigger:"差し戻し",to:"修正依頼"},
    {from:"修正依頼",trigger:"修正完了",to:"再提案"},
    {from:"再提案",trigger:"再提案実施",to:"顧客確認"},
    {from:"顧客確認",trigger:"承認",to:"承認"},
    {from:"顧客確認",trigger:"追加修正",to:"修正依頼"},
    {from:"承認",trigger:"導入開始",to:"導入支援"},
    {from:"導入支援",trigger:"導入完了",to:"効果測定"},
    {from:"効果測定",trigger:"改善点発見",to:"追加改善"},
    {from:"効果測定",trigger:"次フェーズ開始",to:"現状調査"},
    {from:"追加改善",trigger:"追加改善開始",to:"改善案作成"},
  ],
}

async function setup(page) {
  await page.route("**/api/parse", r => r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)}))
  await page.goto("/")
  await page.fill("textarea", "業務改革コンサルティングの提案フロー")
  await page.screenshot({ path: SS+"/01_input.png", fullPage:true })
  await page.click('button:has-text("状態遷移を生成")')
  await page.waitForSelector('button:has-text("調査完了")', {timeout:10000})
}

test("SOT-161: 入力・状態遷移図", async ({page}) => {
  await setup(page)
  await page.screenshot({ path: SS+"/02_diagram.png", fullPage:true })
})

test("SOT-161: レビュー差し戻し", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("調査完了")')
  await page.click('button:has-text("課題特定")')
  await page.click('button:has-text("案完成")')
  await page.click('button:has-text("差し戻し")')
  await page.screenshot({ path: SS+"/03_rollback.png", fullPage:true })
})

test("SOT-161: 承認フロー", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("調査完了")')
  await page.click('button:has-text("課題特定")')
  await page.click('button:has-text("案完成")')
  await page.click('button:has-text("レビューOK")')
  await page.click('button:has-text("承認")')
  await page.screenshot({ path: SS+"/04_approved.png", fullPage:true })
})

test("SOT-161: 効果測定", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("調査完了")')
  await page.click('button:has-text("課題特定")')
  await page.click('button:has-text("案完成")')
  await page.click('button:has-text("レビューOK")')
  await page.click('button:has-text("承認")')
  await page.click('button:has-text("導入開始")')
  await page.click('button:has-text("導入完了")')
  await page.screenshot({ path: SS+"/05_effect_measurement.png", fullPage:true })
})

test("SOT-161: 改善サイクル", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("調査完了")')
  await page.click('button:has-text("課題特定")')
  await page.click('button:has-text("案完成")')
  await page.click('button:has-text("レビューOK")')
  await page.click('button:has-text("承認")')
  await page.click('button:has-text("導入開始")')
  await page.click('button:has-text("導入完了")')
  await page.click('button:has-text("改善点発見")')
  await page.screenshot({ path: SS+"/06_improvement_cycle.png", fullPage:true })
})

test("SOT-161: 履歴画面", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("調査完了")')
  await page.click('button:has-text("課題特定")')
  await page.screenshot({ path: SS+"/07_history.png", fullPage:true })
})
