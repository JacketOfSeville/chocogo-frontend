import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173'
const headless = process.env.E2E_HEADLESS !== 'false'

const options = new chrome.Options()

if (headless) {
  options.addArguments('--headless=new')
}

options.addArguments('--disable-gpu', '--window-size=1280,900')

if (process.platform === 'win32') {
  options.addArguments('--no-sandbox')
}

const driver = await new Builder()
  .forBrowser('chrome')
  .setChromeOptions(options)
  .build()

try {
  await driver.get(frontendUrl)

  const catalogTitle = driver.findElement(By.css('.catalog-header h1'))
  await driver.wait(until.elementTextMatches(catalogTitle, /Catálogo/i), 15000)

  const finishedState = driver.findElement(
    By.css('.product-card, .catalog-shell section h2'),
  )
  await driver.wait(until.elementIsVisible(finishedState), 20000)
} finally {
  await driver.quit()
}
