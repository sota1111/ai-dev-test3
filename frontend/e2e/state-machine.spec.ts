import { test, expect } from '@playwright/test'

test.describe('State Machine Simulator', () => {
  test('traffic-light scenario', async ({ page }) => {
    const stateMachineData = {
      initialState: '赤',
      states: ['赤', '青', '黄'],
      transitions: [
        { from: '赤', trigger: '点灯', to: '青' },
        { from: '青', trigger: '点灯', to: '黄' },
        { from: '黄', trigger: '点灯', to: '赤' },
      ],
    }

    await page.route('**/api/parse', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(stateMachineData),
      })
    })

    await page.goto('/')
    await page.fill('textarea', '信号機の仕様')
    await page.click('button:has-text("状態遷移を生成")')

    // 図の描画に失敗しました が表示されていないことを確認
    await expect(page.locator('text=図の描画に失敗しました')).not.toBeVisible()
    // SVG が diagram-container 内に存在することを確認
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible({ timeout: 5000 })

    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('赤')
    await page.screenshot({ path: 'e2e/screenshots/traffic-light/step0.png' })

    // Transition 1: 赤 -> 青
    await page.click('button:has-text("点灯")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('青')
    await page.screenshot({ path: 'e2e/screenshots/traffic-light/step1.png' })

    // Transition 2: 青 -> 黄
    await page.click('button:has-text("点灯")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('黄')
    await page.screenshot({ path: 'e2e/screenshots/traffic-light/step2.png' })

    // Transition 3: 黄 -> 赤
    await page.click('button:has-text("点灯")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('赤')
    await page.screenshot({ path: 'e2e/screenshots/traffic-light/step3.png' })
  })

  test('door scenario', async ({ page }) => {
    const stateMachineData = {
      initialState: '閉',
      states: ['閉', '開'],
      transitions: [
        { from: '閉', trigger: '開ける', to: '開' },
        { from: '開', trigger: '閉める', to: '閉' },
      ],
    }

    await page.route('**/api/parse', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(stateMachineData),
      })
    })

    await page.goto('/')
    await page.fill('textarea', 'ドアの仕様')
    await page.click('button:has-text("状態遷移を生成")')

    // 図の描画に失敗しました が表示されていないことを確認
    await expect(page.locator('text=図の描画に失敗しました')).not.toBeVisible()
    // SVG が diagram-container 内に存在することを確認
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible({ timeout: 5000 })

    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('閉')
    await page.screenshot({ path: 'e2e/screenshots/door/step0.png' })

    // Transition 1: 閉 -> 開
    await page.click('button:has-text("開ける")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('開')
    await page.screenshot({ path: 'e2e/screenshots/door/step1.png' })

    // Transition 2: 開 -> 閉
    await page.click('button:has-text("閉める")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('閉')
    await page.screenshot({ path: 'e2e/screenshots/door/step2.png' })
  })

  test('vending-machine scenario', async ({ page }) => {
    const stateMachineData = {
      initialState: '待機',
      states: ['待機', '選択', '支払', '排出'],
      transitions: [
        { from: '待機', trigger: '商品選択', to: '選択' },
        { from: '選択', trigger: 'コイン投入', to: '支払' },
        { from: '支払', trigger: '確定', to: '排出' },
        { from: '排出', trigger: '完了', to: '待機' },
      ],
    }

    await page.route('**/api/parse', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(stateMachineData),
      })
    })

    await page.goto('/')
    await page.fill('textarea', '自販機の仕様')
    await page.click('button:has-text("状態遷移を生成")')

    // 図の描画に失敗しました が表示されていないことを確認
    await expect(page.locator('text=図の描画に失敗しました')).not.toBeVisible()
    // SVG が diagram-container 内に存在することを確認
    await expect(page.locator('[data-testid="diagram-container"] svg')).toBeVisible({ timeout: 5000 })

    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('待機')
    await page.screenshot({ path: 'e2e/screenshots/vending-machine/step0.png' })

    // Transition 1: 待機 -> 選択
    await page.click('button:has-text("商品選択")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('選択')
    await page.screenshot({ path: 'e2e/screenshots/vending-machine/step1.png' })

    // Transition 2: 選択 -> 支払
    await page.click('button:has-text("コイン投入")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('支払')
    await page.screenshot({ path: 'e2e/screenshots/vending-machine/step2.png' })

    // Transition 3: 支払 -> 排出
    await page.click('button:has-text("確定")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('排出')
    await page.screenshot({ path: 'e2e/screenshots/vending-machine/step3.png' })

    // Transition 4: 排出 -> 待機
    await page.click('button:has-text("完了")')
    await expect(page.locator('text=現在状態 >> .. >> div')).toHaveText('待機')
    await page.screenshot({ path: 'e2e/screenshots/vending-machine/step4.png' })
  })
})
