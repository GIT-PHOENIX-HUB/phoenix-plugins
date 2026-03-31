/**
 * MCP server stub (TypeScript)
 * - Exposes simple JSON tools to be extended.
 * - Keep auth & secret access in backend code (Azure Functions) not in MCP.
 */
import express from 'express'
const app = express()
app.use(express.json())

app.post('/mcp/tools/getDailyJobSummary', async (req, res) => {
  // Call into your Azure Function / ServiceTitan client here.
  res.json({ ok: true, message: 'Tool stub: getDailyJobSummary' })
})

app.get('/health', (_req, res) => res.send('OK'))
app.listen(3000, () => console.log('MCP stub running on :3000'))
