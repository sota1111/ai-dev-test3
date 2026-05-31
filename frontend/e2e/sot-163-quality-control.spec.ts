import { test } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SS = path.join(__dirname, "../../docs/screenshots/SOT-163")

const data = {
  initialState: "生産中",
  states: ["生産中","品質異常検知","生産停止","原因調査","暫定対策","再開判定","生産再開","恒久対策検討","効果確認","クローズ"],
  parentStates: [],
  transitions: [
    {from:"生産中",trigger:"異常検知",to:"品質異常検知"},
    {from:"品質異常検知",trigger:"停止指示",to:"生産停止"},
    {from:"生産停止",trigger:"調査開始",to:"原因調査"},
    {from:"原因調査",trigger:"原因特定",to:"暫定対策"},
    {from:"原因調査",trigger:"再調査必要",to:"原因調査"},
    {from:"暫定対策",trigger:"暫定対策実施",to:"再開判定"},
    {from:"再開判定",trigger:"再開許可",to:"生産再開"},
    {from:"再開判定",trigger:"再調査必要",to:"原因調査"},
    {from:"生産再開",trigger:"恒久対策開始",to:"恒久対策検討"},
    {from:"恒久対策検討",trigger:"対策実施",to:"効果確認"},
    {from:"効果確認",trigger:"効果確認OK",to:"クローズ"},
    {from:"効果確認",trigger:"効果不足",to:"原因調査"},
    {from:"クローズ",trigger:"運用再開",to:"生産中"},
  ],
}

async function setup(page) {
  await page.route("**/api/parse", r => r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)}))
  await page.goto("/")
  await page.fill("textarea", "製造工場の品質異常対応フロー")
  await page.screenshot({ path: SS+"/01_input.png", fullPage:true })
  await page.click('button:has-text("状態遷移を生成")')
  await page.waitForSelector('button:has-text("異常検知")', {timeout:10000})
}

test("SOT-163: 入力・状態遷移図", async ({page}) => {
  await setup(page)
  await page.screenshot({ path: SS+"/02_diagram.png", fullPage:true })
})

test("SOT-163: 異常検知・生産停止", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("異常検知")')
  await page.screenshot({ path: SS+"/03_anomaly_detected.png", fullPage:true })
  await page.click('button:has-text("停止指示")')
  await page.screenshot({ path: SS+"/04_production_stopped.png", fullPage:true })
})

test("SOT-163: 原因調査・暫定対策", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("異常検知")')
  await page.click('button:has-text("停止指示")')
  await page.click('button:has-text("調査開始")')
  await page.screenshot({ path: SS+"/05_investigation.png", fullPage:true })
  await page.click('button:has-text("原因特定")')
  await page.click('button:has-text("暫定対策実施")')
  await page.screenshot({ path: SS+"/06_interim_measure.png", fullPage:true })
})

test("SOT-163: 恒久対策・効果確認", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("異常検知")')
  await page.click('button:has-text("停止指示")')
  await page.click('button:has-text("調査開始")')
  await page.click('button:has-text("原因特定")')
  await page.click('button:has-text("暫定対策実施")')
  await page.click('button:has-text("再開許可")')
  await page.click('button:has-text("恒久対策開始")')
  await page.click('button:has-text("対策実施")')
  await page.screenshot({ path: SS+"/07_effect_check.png", fullPage:true })
  await page.click('button:has-text("効果確認OK")')
  await page.screenshot({ path: SS+"/08_closed.png", fullPage:true })
})

test("SOT-163: 再調査ループ", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("異常検知")')
  await page.click('button:has-text("停止指示")')
  await page.click('button:has-text("調査開始")')
  await page.click('button:has-text("原因特定")')
  await page.click('button:has-text("暫定対策実施")')
  await page.click('button:has-text("再調査必要")')
  await page.screenshot({ path: SS+"/09_re_investigation.png", fullPage:true })
})

test("SOT-163: 履歴画面", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("異常検知")')
  await page.click('button:has-text("停止指示")')
  await page.click('button:has-text("調査開始")')
  await page.screenshot({ path: SS+"/10_history.png", fullPage:true })
})
