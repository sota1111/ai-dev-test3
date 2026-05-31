import { test } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SS = path.join(__dirname, "../../docs/screenshots/SOT-162")

const data = {
  initialState: "搬送依頼受付",
  states: ["搬送依頼受付","搬送計画中","ロボット待機","搬送実行中","エレベータ待機","荷物受け渡し","完了","エラー発生","オペレータ確認","再搬送"],
  parentStates: [],
  transitions: [
    {from:"搬送依頼受付",trigger:"受付完了",to:"搬送計画中"},
    {from:"搬送計画中",trigger:"計画確定",to:"ロボット待機"},
    {from:"ロボット待機",trigger:"ロボット出発",to:"搬送実行中"},
    {from:"搬送実行中",trigger:"エレベータ前到着",to:"エレベータ待機"},
    {from:"エレベータ待機",trigger:"エレベータ乗車",to:"搬送実行中"},
    {from:"搬送実行中",trigger:"目的地到着",to:"荷物受け渡し"},
    {from:"荷物受け渡し",trigger:"受け渡し完了",to:"完了"},
    {from:"完了",trigger:"次の依頼",to:"搬送依頼受付"},
    {from:"搬送実行中",trigger:"障害物検出",to:"エラー発生"},
    {from:"エレベータ待機",trigger:"タイムアウト",to:"エラー発生"},
    {from:"エラー発生",trigger:"オペレータ呼び出し",to:"オペレータ確認"},
    {from:"オペレータ確認",trigger:"解決",to:"再搬送"},
    {from:"再搬送",trigger:"再搬送開始",to:"ロボット待機"},
  ],
}

async function setup(page) {
  await page.route("**/api/parse", r => r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)}))
  await page.goto("/")
  await page.fill("textarea", "病院内ロボット搬送業務フロー")
  await page.screenshot({ path: SS+"/01_input.png", fullPage:true })
  await page.click('button:has-text("状態遷移を生成")')
  await page.waitForSelector('button:has-text("受付完了")', {timeout:10000})
}

test("SOT-162: 入力・状態遷移図", async ({page}) => {
  await setup(page)
  await page.screenshot({ path: SS+"/02_diagram.png", fullPage:true })
})

test("SOT-162: 正常搬送", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("受付完了")')
  await page.click('button:has-text("計画確定")')
  await page.click('button:has-text("ロボット出発")')
  await page.screenshot({ path: SS+"/03_in_progress.png", fullPage:true })
  await page.click('button:has-text("エレベータ前到着")')
  await page.screenshot({ path: SS+"/04_elevator_wait.png", fullPage:true })
  await page.click('button:has-text("エレベータ乗車")')
  await page.click('button:has-text("目的地到着")')
  await page.click('button:has-text("受け渡し完了")')
  await page.screenshot({ path: SS+"/05_completed.png", fullPage:true })
})

test("SOT-162: エラー発生", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("受付完了")')
  await page.click('button:has-text("計画確定")')
  await page.click('button:has-text("ロボット出発")')
  await page.click('button:has-text("障害物検出")')
  await page.screenshot({ path: SS+"/06_error.png", fullPage:true })
})

test("SOT-162: 再搬送", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("受付完了")')
  await page.click('button:has-text("計画確定")')
  await page.click('button:has-text("ロボット出発")')
  await page.click('button:has-text("障害物検出")')
  await page.click('button:has-text("オペレータ呼び出し")')
  await page.click('button:has-text("解決")')
  await page.click('button:has-text("再搬送開始")')
  await page.screenshot({ path: SS+"/07_re_transport.png", fullPage:true })
})

test("SOT-162: 履歴画面", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("受付完了")')
  await page.click('button:has-text("計画確定")')
  await page.click('button:has-text("ロボット出発")')
  await page.screenshot({ path: SS+"/08_history.png", fullPage:true })
})
