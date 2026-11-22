// Shared reads these at module load, so set them before any shared import runs.
if (!process.env.GEMINI_MODEL) {
  process.env.GEMINI_MODEL = 'gemini-flash-lite-latest'
}
if (!process.env.AI_DAILY_BUDGET_USD) {
  process.env.AI_DAILY_BUDGET_USD = '10.00'
}
