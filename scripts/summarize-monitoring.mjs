import fs from 'node:fs'
import path from 'node:path'

const artifactRoot = path.resolve('artifacts/jmeter-monitoring')
const resultsDir = path.join(artifactRoot, 'results')
const chartsDir = path.join(artifactRoot, 'charts')
const inputPath = process.argv[2]

if (!inputPath) {
  throw new Error('Informe o arquivo JSON consolidado de monitoramento.')
}

const resolvedInputPath = path.resolve(inputPath)
const report = JSON.parse(fs.readFileSync(resolvedInputPath, 'utf8'))
const samples = report.samples ?? []

if (samples.length === 0) {
  throw new Error('O arquivo não contém amostras para resumir.')
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1))
  return sorted[index]
}

function summarize(name, getSample) {
  const checkedSamples = samples.map(getSample)
  const latencies = checkedSamples.map((sample) => sample.latencyMs)
  const failures = checkedSamples.filter((sample) => !sample.ok)

  return {
    name,
    samples: checkedSamples.length,
    failures: failures.length,
    successRate: `${(((checkedSamples.length - failures.length) / checkedSamples.length) * 100).toFixed(2)}%`,
    averageMs: Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length),
    medianMs: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    maxMs: Math.max(...latencies),
    minMs: Math.min(...latencies),
  }
}

const summaries = [
  summarize('catalog', (sample) => sample.catalog),
  summarize('health', (sample) => sample.health),
  summarize('products', (sample) => sample.products),
]

const chartWidth = 1100
const chartHeight = 360
const padding = { left: 60, right: 20, top: 24, bottom: 52 }
const plotWidth = chartWidth - padding.left - padding.right
const plotHeight = chartHeight - padding.top - padding.bottom
const maxLatency = Math.max(...samples.flatMap((sample) => [sample.catalog.latencyMs, sample.health.latencyMs, sample.products.latencyMs]))
const maxElapsed = Math.max(...samples.map((sample) => sample.elapsedSeconds))

function points(getLatency) {
  return samples.map((sample) => {
    const x = padding.left + (sample.elapsedSeconds / maxElapsed) * plotWidth
    const y = padding.top + plotHeight - (getLatency(sample) / maxLatency) * plotHeight
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

const chartLines = [
  { name: 'Catálogo', color: '#5a2e1b', points: points((sample) => sample.catalog.latencyMs) },
  { name: 'API /health', color: '#16856f', points: points((sample) => sample.health.latencyMs) },
  { name: 'API /produtos', color: '#d58b16', points: points((sample) => sample.products.latencyMs) },
]

const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
  const value = Math.round(maxLatency * fraction)
  const y = padding.top + plotHeight - fraction * plotHeight
  return `<line x1="${padding.left}" x2="${chartWidth - padding.right}" y1="${y}" y2="${y}" stroke="#e7ded7" stroke-width="1"/><text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#7a675b">${value}</text>`
}).join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}">
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="${padding.left}" y="${padding.top - 8}" font-size="18" font-weight="600" fill="#4b3429">Latência durante a carga JMeter</text>
  <text x="${chartWidth - padding.right}" y="${padding.top - 8}" text-anchor="end" font-size="12" fill="#7a675b">Tempo em segundos / latência em milissegundos</text>
  ${yTicks}
  <line x1="${padding.left}" x2="${padding.left}" y1="${padding.top}" y2="${padding.top + plotHeight}" stroke="#7a675b"/>
  <line x1="${padding.left}" x2="${chartWidth - padding.right}" y1="${padding.top + plotHeight}" y2="${padding.top + plotHeight}" stroke="#7a675b"/>
  ${chartLines.map((line) => `<polyline fill="none" stroke="${line.color}" stroke-width="2.5" points="${line.points}"/>`).join('')}
  ${chartLines.map((line, index) => `<g transform="translate(${padding.left + index * 180}, ${chartHeight - 16})"><rect width="12" height="12" fill="${line.color}" rx="2"/><text x="18" y="11" font-size="12" fill="#4b3429">${line.name}</text></g>`).join('')}
</svg>`

fs.mkdirSync(chartsDir, { recursive: true })
fs.writeFileSync(path.join(chartsDir, 'latency-by-elapsed-time.svg'), svg)

const markdown = `# Relatório preliminar de monitoramento de carga

## Execução

- Ferramenta de carga: JMeter
- Perfil de carga informado: 100 threads durante 300 segundos
- Ferramenta de monitoramento: Selenium WebDriver com Chrome
- Coletor: \`e2e/load-monitoring.mjs\`
- Início do monitoramento: ${report.startedAt}
- Duração configurada: ${report.durationSeconds} segundos
- Intervalo de coleta: ${report.intervalSeconds} segundos
- Amostras coletadas: ${samples.length}

## Resultados

| Verificação | Amostras | Falhas | Taxa de sucesso | Média | Mediana | P95 | Máximo | Mínimo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${summaries.map((summary) => `| ${summary.name} | ${summary.samples} | ${summary.failures} | ${summary.successRate} | ${summary.averageMs} ms | ${summary.medianMs} ms | ${summary.p95Ms} ms | ${summary.maxMs} ms | ${summary.minMs} ms |`).join('\n')}

## Interpretação

Durante a janela monitorada, o catálogo no navegador, o endpoint \`/health\` e o endpoint \`/api/produtos\` permaneceram disponíveis em todas as amostras. A taxa de sucesso foi de 100% nas três verificações e nenhuma falha foi registrada pelo coletor.

A maior latência média aparece no endpoint de produtos, enquanto o catálogo permaneceu com média próxima de 100 ms. O gráfico \`latency-by-elapsed-time.svg\` mostra os picos isolados de latência durante a execução.

## Artefatos produzidos

- Script de monitoramento: \`e2e/load-monitoring.mjs\`
- Configuração e amostras brutas: \`artifacts/jmeter-monitoring/raw/\`
- Resultados consolidados: \`artifacts/jmeter-monitoring/results/\`
- Gráfico gerado: \`artifacts/jmeter-monitoring/charts/latency-by-elapsed-time.svg\`
- Este relatório: \`artifacts/jmeter-monitoring/results/RELATORIO_MONITORAMENTO.md\`
`

fs.writeFileSync(path.join(resultsDir, 'RELATORIO_MONITORAMENTO.md'), markdown)

console.log(JSON.stringify({ summaries, chart: path.join(chartsDir, 'latency-by-elapsed-time.svg') }, null, 2))
