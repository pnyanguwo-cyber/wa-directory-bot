// One-shot sanity of the typed-order parser + matcher (no build step needed).
const ts = require('typescript')
const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'order-intake.ts'), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const out = path.join(__dirname, 'order-intake.compiled.js')
fs.writeFileSync(out, js)
const { parseOrderLine, matchOrder } = require(out)

function eq(name, a, b) {
  const sa = JSON.stringify(a)
  const sb = JSON.stringify(b)
  console.log((sa === sb ? 'PASS' : 'FAIL') + ' ' + name + (sa === sb ? '' : ` got=${sa} want=${sb}`))
}

// ── parseOrderLine ──
eq('qty-first', JSON.parse(JSON.stringify(parseOrderLine('2 bread, 1 cake'))).pairs, [{ qty: 2, term: 'bread' }, { qty: 1, term: 'cake' }])
eq('x-suffix', parseOrderLine('bread x2').pairs, [{ qty: 2, term: 'bread' }])
eq('chained', parseOrderLine('1 bread 2 scones').pairs, [{ qty: 1, term: 'bread' }, { qty: 2, term: 'scones' }])
eq('bare', parseOrderLine('bread').pairs, [{ qty: 1, term: 'bread' }])
eq('junk-only', parseOrderLine('order a nice logo for my shop').junk.length, 0)

// ── matchOrder across shelves ──
const shelves = [
  {
    businessId: 'bread',
    businessName: 'Bread Shop',
    supplierDigits: '263777111222',
    city: 'Bulawayo',
    items: [
      { id: 's1', name: 'Sourdough Loaf', price: 2.5 },
      { id: 's2', name: 'Plain Scones', price: 1 },
    ],
  },
  {
    businessId: 'cem',
    businessName: 'Cement Shop',
    supplierDigits: '263777333444',
    city: 'Gweru',
    items: [{ id: 'c1', name: 'Cement Bags', price: 10 }],
  },
]
const r = matchOrder(parseOrderLine('2 sourdough, 1 cement bags').pairs, shelves)
eq('two shops split', r.groups.map(g => [g.supplier.businessId, g.lines.length]), [['bread', 1], ['cem', 1]])
eq('no unmatched', r.unmatched.length, 0)

const r2 = matchOrder(parseOrderLine('2 scones').pairs, shelves, 'bread')
eq('explicit wins', r2.groups[0].supplier.businessId, 'bread')
eq('qty carried', r2.groups[0].lines[0].qty, 2)

const r3 = matchOrder(parseOrderLine('3 chex mix').pairs, shelves)
eq('unknown drops', r3.unmatched.length === 1 && r3.groups.length === 0, true)
