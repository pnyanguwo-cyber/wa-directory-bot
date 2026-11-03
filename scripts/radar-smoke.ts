// Regression checks for the S18.5 Supplier Demand Radar helpers (pure logic
// only — no DB, no env needed). Run: npx -y tsx scripts/radar-smoke.ts
import { maskSearchTerm, demandPingKey, subCoversCity } from '../lib/radar'

let passed = 0
let failed = 0
function ok(cond: boolean, label: string, extra?: unknown) {
  if (cond) {
    passed++
    console.log(`OK   ${label}`)
  } else {
    failed++
    console.log(`FAIL ${label}${extra !== undefined ? ` (got: ${JSON.stringify(extra)})` : ''}`)
  }
}

// 1 — masking: contact-number hunts are not demand leads
{
  ok(maskSearchTerm('plumber contact number') === true, 'masks "plumber contact number"')
  ok(maskSearchTerm('call this 0771234567') === true, 'masks terms with phone runs')
  ok(maskSearchTerm('+263771234567') === true, 'masks +263 phone run')
  ok(maskSearchTerm('opening hours') === true, 'masks "opening hours"')
  ok(maskSearchTerm('where to buy cement') === true, 'masks "where" location hunts')
  ok(maskSearchTerm('plumber harare') === false, 'plain purchase lead is NOT masked')
  ok(maskSearchTerm('077') === false, 'short digit run is not a phone')
}

// 2 — masking edge cases
{
  ok(maskSearchTerm('') === true, 'empty term masked')
  ok(maskSearchTerm('CONTACT ME') === true, 'case-insensitive masking')
  ok(maskSearchTerm('painters') === false, 'plural trade terms pass')
}

// 3 — demandPingKey stability and variance
{
  const a = demandPingKey('plumber', 'harare')
  ok(a.startsWith('radar_ping:'), 'ping key prefixed radar_ping:', a)
  ok(a === demandPingKey('Plumber', 'Harare'), 'ping key case-insensitive', [
    a,
    demandPingKey('Plumber', 'Harare'),
  ])
  ok(a !== demandPingKey('plumber', 'bulawayo'), 'city changes the key')
  ok(a !== demandPingKey('electrician', 'harare'), 'term changes the key')
}

// 4 — subscription coverage
{
  ok(subCoversCity('all', '') === true, '"all" covers cityless events')
  ok(subCoversCity('all', 'Harare') === true, '"all" covers any city')
  ok(subCoversCity('', 'Harare') === false, 'off subscription covers nothing')
  ok(subCoversCity(null, 'Harare') === false, 'missing subscription covers nothing')
  ok(subCoversCity(undefined, '') === false, 'undefined sub never covers')
  ok(subCoversCity('harare', 'Harare') === true, 'city sub matches, case-insensitive')
  ok(subCoversCity('harare', '') === false, 'city sub does NOT cover cityless events')
  ok(subCoversCity('bulawayo', 'Harare') === false, 'wrong city does not match')
  ok(subCoversCity('  HARARE  ', 'harare') === true, 'whitespace/case tolerant')
}

console.log(`\n${failed === 0 ? 'all green' : `${failed} failing`}`)
process.exit(failed === 0 ? 0 : 1)
