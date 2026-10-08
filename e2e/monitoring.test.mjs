import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

const frontendUrl = (process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const headless = process.env.E2E_HEADLESS !== 'false'

const options = new chrome.Options()

if (headless) {
  options.addArguments('--headless=new')
}

options.addArguments('--disable-gpu', '--window-size=1366,900')

if (process.platform === 'win32') {
  options.addArguments('--no-sandbox')
}

async function waitVisible(driver, selector, timeout = 15000) {
  const element = await driver.wait(until.elementLocated(By.css(selector)), timeout)
  await driver.wait(until.elementIsVisible(element), timeout)
  return element
}

async function expectLocation(driver, pathname) {
  await driver.wait(async () => new URL(await driver.getCurrentUrl()).pathname === pathname, 15000)
}

const checks = [
  {
    name: 'Catálogo carrega e conclui a fase de carregamento',
    run: async (driver) => {
      await driver.get(frontendUrl)
      const title = await waitVisible(driver, '.catalog-header h1')
      await driver.wait(until.elementTextMatches(title, /Catálogo/i), 15000)
      const finishedState = await waitVisible(driver, '.product-card, .catalog-shell section h2', 20000)
      return `Estado final visível: ${await finishedState.getText()}`
    },
  },
  {
    name: 'Login público mostra ações de entrada e cadastro',
    run: async (driver) => {
      await driver.get(`${frontendUrl}/login`)
      await waitVisible(driver, 'button[type="submit"]')
      await waitVisible(driver, 'a[href="/register"]')
      await waitVisible(driver, 'a[href="/recuperar-senha"]')
    },
  },
  {
    name: 'Cadastro público mostra formulário e volta ao login',
    run: async (driver) => {
      await driver.get(`${frontendUrl}/register`)
      await waitVisible(driver, 'button[type="submit"]')
      await waitVisible(driver, 'a[href="/login"]')
      await waitVisible(driver, 'input[type="password"]')
    },
  },
  {
    name: 'Recuperação de senha aceita e-mail sem revelar a conta',
    run: async (driver) => {
      await driver.get(`${frontendUrl}/recuperar-senha`)
      const emailInput = await waitVisible(driver, 'input[type="email"]')
      await emailInput.sendKeys('monitoramento@example.com')
      const submit = await waitVisible(driver, 'button[type="submit"]')
      await submit.click()
      await waitVisible(driver, '[role="status"], [role="alert"]', 20000)
    },
  },
  {
    name: 'Navegação entre páginas públicas segue os links corretos',
    run: async (driver) => {
      await driver.get(frontendUrl)
      const loginLink = await waitVisible(driver, 'a[href="/login"]')
      await loginLink.click()
      await expectLocation(driver, '/login')

      const registerLink = await waitVisible(driver, 'a[href="/register"]')
      await registerLink.click()
      await expectLocation(driver, '/register')

      const catalogLink = await waitVisible(driver, 'a[href="/"]')
      await catalogLink.click()
      await expectLocation(driver, '/')
    },
  },
]

async function main() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()
  const results = []

  try {
    for (const check of checks) {
      const startedAt = Date.now()

      try {
        const detail = await check.run(driver)
        results.push({
          name: check.name,
          status: 'passed',
          durationMs: Date.now() - startedAt,
          detail: detail ?? null,
        })
      } catch (error) {
        results.push({
          name: check.name,
          status: 'failed',
          durationMs: Date.now() - startedAt,
          detail: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } finally {
    await driver.quit()
  }

  const failed = results.filter((result) => result.status === 'failed')
  console.log(JSON.stringify({ frontendUrl, results }, null, 2))

  if (failed.length > 0) {
    process.exitCode = 1
  }
}

await main()
