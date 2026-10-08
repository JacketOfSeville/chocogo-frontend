import fs from 'node:fs'
import path from 'node:path'
import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

const frontendUrl = (process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const apiUrl = (process.env.E2E_API_URL ?? 'http://localhost:15000').replace(/\/$/, '')
const durationSeconds = Number(process.env.E2E_LOAD_DURATION_SECONDS ?? 300)
const intervalSeconds = Number(process.env.E2E_LOAD_INTERVAL_SECONDS ?? 5)
const headless = process.env.E2E_HEADLESS !== 'false'
const artifactRoot = path.resolve('artifacts/jmeter-monitoring')
const rawDir = path.join(artifactRoot, 'raw')
const resultDir = path.join(artifactRoot, 'results')

fs.mkdirSync(rawDir, { recursive: true })
fs.mkdirSync(resultDir, { recursive: true })

const options = new chrome.Options()

if (headless) {
  options.addArguments('--headless=new')
}

options.addArguments('--disable-gpu', '--window-size=1366,900')

if (process.platform === 'win32') {
  options.addArguments('--no-sandbox')
}

async function measureJson(url, timeoutMs = 10000) {
  const startedAt = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    const latencyMs = Math.round(performance.now() - startedAt)
    let payload = null

    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    return {
      ok: response.ok,
      status: response.status,
      latencyMs,
      payload,
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Math.round(performance.now() - startedAt),
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function measureCatalogPage(driver) {
  const startedAt = performance.now()

  try {
    await driver.get(frontendUrl)
    const title = driver.findElement(By.css('.catalog-header h1'))
    await driver.wait(until.elementIsVisible(title), 20000)
    await driver.wait(until.elementTextMatches(title, /Catálogo/i), 20000)

    const timing = await driver.executeScript(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      return navigation?.responseEnd ?? null
    })

    return {
      ok: true,
      status: 200,
      latencyMs: Math.round(performance.now() - startedAt),
      navigationMs: typeof timing === 'number' ? Math.round(timing) : null,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Math.round(performance.now() - startedAt),
      navigationMs: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()
  const startedAt = Date.now()
  const startedAtIso = new Date(startedAt).toISOString()
  const samples = []

  try {
    while (Date.now() - startedAt < durationSeconds * 1000) {
      const timestamp = new Date().toISOString()
      const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000)
      const [catalog, health, products] = await Promise.all([
        measureCatalogPage(driver),
        measureJson(`${apiUrl}/health`),
        measureJson(`${apiUrl}/api/produtos`),
      ])
      const sample = {
        timestamp,
        elapsedSeconds,
        catalog,
        health,
        products: {
          ...products,
          payloadCount: Array.isArray(products.payload) ? products.payload.length : null,
        },
      }

      samples.push(sample)
      fs.writeFileSync(
        path.join(rawDir, `${timestamp.replace(/[:.]/g, '-')}.json`),
        `${JSON.stringify(sample, null, 2)}\n`,
      )
      console.log(`sample ${samples.length}: ${timestamp}`)

      if (Date.now() - startedAt < durationSeconds * 1000) {
        await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000))
      }
    }
  } finally {
    await driver.quit()
  }

  const jsonPath = path.join(resultDir, `monitoring-${startedAtIso.slice(0, 19).replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(jsonPath, `${JSON.stringify({ startedAt: startedAtIso, durationSeconds, intervalSeconds, samples }, null, 2)}\n`)

  const csvPath = path.join(resultDir, `monitoring-${startedAtIso.slice(0, 19).replace(/[:.]/g, '-')}.csv`)
  const csvRows = [
    'timestamp,elapsedSeconds,catalogOk,catalogMs,catalogStatus,healthOk,healthMs,healthStatus,productsOk,productsMs,productsStatus,productsCount',
    ...samples.map((sample) => [
      sample.timestamp,
      sample.elapsedSeconds,
      sample.catalog.ok,
      sample.catalog.latencyMs,
      sample.catalog.status ?? '',
      sample.health.ok,
      sample.health.latencyMs,
      sample.health.status ?? '',
      sample.products.ok,
      sample.products.latencyMs,
      sample.products.status ?? '',
      sample.products.payloadCount ?? '',
    ].join(',')),
  ]
  fs.writeFileSync(csvPath, `${csvRows.join('\n')}\n`)

  const failures = samples.filter((sample) => !sample.catalog.ok || !sample.health.ok || !sample.products.ok)
  console.log(`samples=${samples.length} failures=${failures.length} json=${jsonPath} csv=${csvPath}`)

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

await main()
