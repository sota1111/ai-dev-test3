import { test } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SS = path.join(__dirname, "../../docs/screenshots/SOT-160")

const data = {
  initialState: "リード獲得",
  states: ["リード獲得","初回接触","ヒアリング","提案準備","提案中","稟議待ち","見積提出","契約確認","受注","失注","再提案"],
  parentStates: [],
  transitions: [
    {from:"リード獲得",trigger:"アポイント取得",to:"初回接触"},
    {from:"初回接触",trigger:"興味あり",to:"ヒアリング"},
    {from:"ヒアリング",trigger:"ニーズ確認",to:"提案準備"},
    {from:"提案準備",trigger:"提案書完成",to:"提案中"},
    {from:"提案中",trigger:"提案受け入れ",to:"稟議待ち"},
    {from:"提案中",trigger:"提案却下",to:"失注"},
    {from:"稟議待ち",trigger:"稟議通過",to:"見積提出"},
    {from:"稟議待ち",trigger:"稟議否決",to:"失注"},
    {from:"見積提出",trigger:"見積承認",to:"契約確認"},
    {from:"契約確認",trigger:"契約締結",to:"受注"},
    {from:"契約確認",trigger:"契約破談",to:"失注"},
    {from:"失注",trigger:"再挑戦",to:"再提案"},
    {from:"再提案",trigger:"再提案実施",to:"提案中"},
  ],
}

async function setup(page) {
  await page.route("**/api/parse", r => r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)}))
  await page.goto("/")
  await page.fill("textarea", "SaaS営業プロセスの状態遷移")
  await page.screenshot({ path: SS+"/01_input.png", fullPage:true })
  await page.click('button:has-text("状態遷移を生成")')
  await page.waitForSelector('button:has-text("アポイント取得")', {timeout:10000})
}

test("SOT-160: 入力・状態遷移図", async ({page}) => {
  await setup(page)
  await page.screenshot({ path: SS+"/02_diagram.png", fullPage:true })
})

test("SOT-160: 受注ルート", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("アポイント取得")')
  await page.click('button:has-text("興味あり")')
  await page.click('button:has-text("ニーズ確認")')
  await page.click('button:has-text("提案書完成")')
  await page.click('button:has-text("提案受け入れ")')
  await page.screenshot({ path: SS+"/03_approval_pending.png", fullPage:true })
  await page.click('button:has-text("稟議通過")')
  await page.click('button:has-text("見積承認")')
  await page.click('button:has-text("契約締結")')
  await page.screenshot({ path: SS+"/04_won.png", fullPage:true })
})

test("SOT-160: 失注ルート", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("アポイント取得")')
  await page.click('button:has-text("興味あり")')
  await page.click('button:has-text("ニーズ確認")')
  await page.click('button:has-text("提案書完成")')
  await page.click('button:has-text("提案却下")')
  await page.screenshot({ path: SS+"/05_lost.png", fullPage:true })
})

test("SOT-160: 再提案ルート", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("アポイント取得")')
  await page.click('button:has-text("興味あり")')
  await page.click('button:has-text("ニーズ確認")')
  await page.click('button:has-text("提案書完成")')
  await page.click('button:has-text("提案却下")')
  await page.click('button:has-text("再挑戦")')
  await page.click('button:has-text("再提案実施")')
  await page.screenshot({ path: SS+"/06_re_proposal.png", fullPage:true })
})

test("SOT-160: 稟議待ち状態", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("アポイント取得")')
  await page.click('button:has-text("興味あり")')
  await page.click('button:has-text("ニーズ確認")')
  await page.click('button:has-text("提案書完成")')
  await page.click('button:has-text("提案受け入れ")')
  await page.screenshot({ path: SS+"/07_pending_approval.png", fullPage:true })
})

test("SOT-160: 履歴画面", async ({page}) => {
  await setup(page)
  await page.click('button:has-text("アポイント取得")')
  await page.click('button:has-text("興味あり")')
  await page.click('button:has-text("ニーズ確認")')
  await page.screenshot({ path: SS+"/08_history.png", fullPage:true })
})
