/**
 * Connected categories ("Tree Cutting" filed under "Landscaping").
 *
 * Connections are stored in `learned_mappings` (raw wording -> canonical
 * category): the shared request flow writes one when an admin connects a
 * requested category, and the bot's `connect category <child> to <parent>`
 * command writes one directly. Search only compared raw category names, so
 * the other direction broke: a shop filed under "Tree Cutting" was invisible
 * to someone searching "landscaping", and the owner's own words stopped
 * finding their listing once it was filed under the canonical name.
 *
 * This module loads those connections once per warm instance and expands a
 * search into every name in the same family (parent, child and deeper links).
 * Two names connected either way therefore find the same shops.
 *
 * Fail-soft by design: a missing table or dead network leaves search exactly
 * as it was (raw category names only).
 */
import { getSupabase } from '@wa-directory/shared'
import { learnMapping } from '@wa-directory/shared'

export type CategoryLinks = {
  aliasToCanonical: Map<string, string>
  canonicalToAliases: Map<string, Set<string>>
}

const CACHE_TTL_MS = 5 * 60 * 1000
let cached: { at: number; links: CategoryLinks } | null = null

/** Compare-key for a category name: lowercase, punctuation ignored. */
export function normalizeCategoryName(raw: string | null | undefined): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

function emptyLinks(): CategoryLinks {
  return { aliasToCanonical: new Map(), canonicalToAliases: new Map() }
}

export async function loadCategoryLinks(): Promise<CategoryLinks> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.links

  const links = emptyLinks()
  try {
    const { data } = await getSupabase()
      .from('learned_mappings')
      .select('raw, canonical')
      .eq('kind', 'category')
      .limit(1000)

    for (const row of (data || []) as Array<{ raw?: string; canonical?: string }>) {
      const raw = normalizeCategoryName(row.raw)
      const canonical = normalizeCategoryName(row.canonical)
      if (!raw || !canonical || raw === canonical) continue
      links.aliasToCanonical.set(raw, canonical)
      const aliases = links.canonicalToAliases.get(canonical) || new Set<string>()
      aliases.add(raw)
      links.canonicalToAliases.set(canonical, aliases)
    }
  } catch {
    // Search still works with the raw category names.
  }

  cached = { at: Date.now(), links }
  return links
}

/** Drop the cache so a connection an admin just made applies immediately. */
export function clearCategoryLinkCache(): void {
  cached = null
}

/** Follow a connected category's chain to its top-level name. */
function chainRoot(links: CategoryLinks, name: string): string {
  let current = normalizeCategoryName(name)
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    const next = links.aliasToCanonical.get(current)
    if (!next) break
    current = next
  }
  return current
}

/**
 * Store "child becomes an element of parent". The same learned mapping an
 * approved feature request writes, so search treats both names as one shelf.
 * Rejects a category connected to itself and a connection that would create a
 * loop (parent already under child, directly or through a chain).
 */
export async function linkCategories(
  child: string,
  parent: string
): Promise<{ ok: boolean; error?: string }> {
  const childName = (child || '').trim()
  const parentName = (parent || '').trim()
  if (!childName || !parentName) {
    return { ok: false, error: 'Send both categories.' }
  }
  if (normalizeCategoryName(childName) === normalizeCategoryName(parentName)) {
    return { ok: false, error: '*A category cannot be connected to itself.*' }
  }

  const links = await loadCategoryLinks()
  if (chainRoot(links, parentName) === normalizeCategoryName(childName)) {
    return {
      ok: false,
      error: `*${parentName}* is already under *${childName}*, so connecting them the other way would loop.`,
    }
  }

  const learned = await learnMapping('category', childName, parentName)
  if (!learned) {
    return { ok: false, error: 'Could not save that connection. Please try again.' }
  }
  clearCategoryLinkCache()

  // Re-read instead of assuming the write landed on the parent we asked for:
  // a stored mapping that did not move would otherwise report success while
  // search still treated the child as its old shelf.
  const saved = await loadCategoryLinks()
  if (saved.aliasToCanonical.get(normalizeCategoryName(childName)) !== normalizeCategoryName(parentName)) {
    return { ok: false, error: 'The connection did not save. Please try again.' }
  }
  return { ok: true }
}

export type CategoryConnection = {
  /** Exact raw value stored in learned_mappings - what unlinkCategory deletes. */
  raw: string
  child: string
  parent: string
}

/** Flat list of saved connections, newest wording first, for the admin picker. */
export async function listCategoryConnections(): Promise<CategoryConnection[]> {
  try {
    const { data } = await getSupabase()
      .from('learned_mappings')
      .select('raw, canonical')
      .eq('kind', 'category')
      .order('raw', { ascending: true })
      .limit(200)

    const seen = new Set<string>()
    const out: CategoryConnection[] = []
    for (const row of (data || []) as Array<{ raw?: string; canonical?: string }>) {
      const raw = (row.raw || '').trim()
      const parent = (row.canonical || '').trim()
      const childKey = normalizeCategoryName(raw)
      const parentKey = normalizeCategoryName(parent)
      if (!raw || !parent || !childKey || !parentKey || childKey === parentKey) continue
      if (seen.has(childKey)) continue
      seen.add(childKey)
      out.push({ raw, child: raw, parent })
    }
    return out
  } catch {
    return []
  }
}

/** Remove one saved connection by its exact stored wording. */
export async function unlinkCategory(raw: string): Promise<{ ok: boolean; error?: string }> {
  const value = (raw || '').trim()
  if (!value) return { ok: false, error: 'That connection is missing.' }
  try {
    const { error } = await getSupabase()
      .from('learned_mappings')
      .delete()
      .eq('kind', 'category')
      .eq('raw', value)
    if (error) return { ok: false, error: 'Could not remove that connection. Please try again.' }
    clearCategoryLinkCache()
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not remove that connection. Please try again.' }
  }
}

export type CategoryTreeNode = {
  name: string
  children: CategoryTreeNode[]
}

/**
 * The category connections as a tree an admin can read in WhatsApp: each
 * parent with its connected children (and their children), plus any connection
 * that does not reach a root (legacy loops) as its own top-level entry.
 * Display casing prefers the approved/canonical spelling; children keep the
 * wording the connection was saved with.
 */
export async function categoryTree(): Promise<{
  trees: CategoryTreeNode[]
  connections: number
}> {
  type Row = { raw?: string; canonical?: string }
  let rows: Row[] = []
  try {
    const { data } = await getSupabase()
      .from('learned_mappings')
      .select('raw, canonical')
      .eq('kind', 'category')
      .limit(1000)
    rows = (data || []) as Row[]
  } catch {
    rows = []
  }

  const display = new Map<string, string>()
  const childToParent = new Map<string, string>()

  // Canonicals first so a parent shows the approved spelling, not an owner's
  // later wording for the same name.
  for (const row of rows) {
    const key = normalizeCategoryName(row.canonical)
    const shown = (row.canonical || '').trim()
    if (key && shown && !display.has(key)) display.set(key, shown)
  }
  for (const row of rows) {
    const childKey = normalizeCategoryName(row.raw)
    const parentKey = normalizeCategoryName(row.canonical)
    if (!childKey || !parentKey || childKey === parentKey) continue
    const shown = (row.raw || '').trim()
    if (shown && !display.has(childKey)) display.set(childKey, shown)
    childToParent.set(childKey, parentKey)
  }
  const connections = childToParent.size

  const childrenOf = new Map<string, string[]>()
  const parents = new Set<string>()
  const children = new Set<string>()
  for (const [child, parent] of childToParent) {
    const list = childrenOf.get(parent) || []
    if (!list.includes(child)) list.push(child)
    childrenOf.set(parent, list)
    parents.add(parent)
    children.add(child)
  }

  const visited = new Set<string>()
  const build = (key: string, stack: Set<string>): CategoryTreeNode => {
    visited.add(key)
    const nextStack = new Set(stack)
    nextStack.add(key)
    const kids = (childrenOf.get(key) || [])
      .filter((child) => !nextStack.has(child))
      .map((child) => build(child, nextStack))
    return { name: display.get(key) || key, children: kids }
  }

  const trees: CategoryTreeNode[] = []
  for (const key of parents) {
    if (!children.has(key)) trees.push(build(key, new Set()))
  }
  // A loop (legacy/bad data) has no root; still show every name once.
  for (const key of [...parents, ...children]) {
    if (!visited.has(key)) trees.push(build(key, new Set()))
  }

  return { trees, connections }
}

/**
 * Every category name a search for `term` should count as a hit: the matched
 * category, the searched wording, the canonical name it belongs to, and every
 * wording connected to that canonical name.
 */
export async function connectedCategoryNames(term: string, category: string): Promise<string[]> {
  const links = await loadCategoryLinks()
  const names = new Set<string>()

  const add = (value: string | null | undefined) => {
    const name = normalizeCategoryName(value)
    if (name && name !== 'other') names.add(name)
  }

  add(category)
  add(term)

  const starts = [normalizeCategoryName(term), normalizeCategoryName(category)].filter(
    (name) => name && name !== 'other'
  )
  const roots = new Set(starts.map((name) => chainRoot(links, name)))
  if (!roots.size) return [...names]

  // Everything in the same family: the parent, the child and any further
  // children connected to them, so a multi-level connection still shares one
  // set of search results.
  for (const root of roots) {
    add(root)
    for (const alias of links.canonicalToAliases.get(root) || []) add(alias)
  }
  for (const [raw, canonical] of links.aliasToCanonical) {
    if (roots.has(chainRoot(links, canonical))) add(raw)
  }

  return [...names]
}

/** True when a listing's category array contains one of the accepted names. */
export function listingHasCategory(
  categories: string[] | null | undefined,
  names: string[]
): boolean {
  if (!categories?.length || !names.length) return false
  return categories.some((category) =>
    names.some((name) => normalizeCategoryName(category) === normalizeCategoryName(name))
  )
}
