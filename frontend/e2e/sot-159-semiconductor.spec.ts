import { test } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SS = path.join(__dirname, "../../docs/screenshots/SOT-159")

const data = {
  initialState: "電源OFF",
  states: ["電源OFF","起動中","初期化中","待機","レシピ準備","搬送中","処理中","完了","警報発生","装置停止","復旧作業中","再起動中"],
  parentStates: [],
  transitions: [
    {from:"電源OFF",trigger:"電源ON",to:"起動中"},
    {from:"起動中",trigger:"起動完了",to:"初期化中"},
    {from:"初期化中",trigger:"初期化完了",to:"待機"},
    {from:"待機",trigger:"ロット投入",to:"レシピ準備"},
    {from:"レシピ準備",trigger:"レシピ確認OK",to:"搬送中"},
    {from:"搬送中",trigger:"搬送完了",to:"処理中"},
    {from:"処理中",trigger:"処理完了",to:"完了"},
    {from:"完了",trigger:"次ロット待ち",to:"待機"},
    {from:"処理中",trigger:"警報検知",to:"警報発生"},
    {from:"搬送中",trigger:"警報検知",to:"警報発生"},
    {from:"警報発生",trigger:"緊急停止",to:"装置停止"},
    {from:"装置停止",trigger:"復旧開始",to:"復旧作業中"},
    {from:"復旧作業中",trigger:"復旧完了",to:"再起動中"},
    {from:"再起動中",trigger:"再起動完了",to:"待機"},
  ],
}

async function setup(page) {
  await page.route("**/api/parse", r => r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)}))
  await page.goto("/")
  await page.fill("textarea", "半導体製造装置の運転・異常・復旧フロー")
  await page.screenshot({ path: SS+"/01_input.png", fullPage:true })
  await page.click('button:has-text("状態遷移を生成")')
  await page.waitForSelector('button:has-text("電源ON")', {timeout:10000})
}

test("SOT-159: 入力・状態遷移図", async ({page}) => {
  await setup(page)
  await page.screenshot({ path: SS+"/02_diagram.png", fullPage:true })
})

test("SOT-159: 正常運転ルート", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("電源ON")')
  await page.click('button:has-text("起動完了")')
  await page.click('button:has-text("初期化完了")')
  await page.click('button:has-text("ロット投入")')
  await page.click('button:has-text("レシピ確認OK")')
  await page.click('button:has-text("搬送完了")')
  await page.click('button:has-text("処理完了")')
  await page.screenshot({ path: SS+"/03_normal_completed.png", fullPage:true })
})

test("SOT-159: 異常発生ルート", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("電源ON")')
  await page.click('button:has-text("起動完了")')
  await page.click('button:has-text("初期化完了")')
  await page.click('button:has-text("ロット投入")')
  await page.click('button:has-text("レシピ確認OK")')
  await page.click('button:has-text("警報検知")')
  await page.screenshot({ path: SS+"/04_alarm.png", fullPage:true })
  await page.click('button:has-text("緊急停止")')
  await page.screenshot({ path: SS+"/05_stopped.png", fullPage:true })
})

test("SOT-159: 復旧ルート", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("電源ON")')
  await page.click('button:has-text("起動完了")')
  await page.click('button:has-text("初期化完了")')
  await page.click('button:has-text("ロット投入")')
  await page.click('button:has-text("レシピ確認OK")')
  await page.click('button:has-text("警報検知")')
  await page.click('button:has-text("緊急停止")')
  await page.click('button:has-text("復旧開始")')
  await page.screenshot({ path: SS+"/06_recovery.png", fullPage:true })
  await page.click('button:has-text("復旧完了")')
  await page.click('button:has-text("再起動完了")')
  await page.screenshot({ path: SS+"/07_standby_restored.png", fullPage:true })
})

test("SOT-159: シミュレーション履歴", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("電源ON")')
  await page.click('button:has-text("起動完了")')
  await page.click('button:has-text("初期化完了")')
  await page.click('button:has-text("ロット投入")')
  await page.screenshot({ path: SS+"/08_history.png", fullPage:true })
})
