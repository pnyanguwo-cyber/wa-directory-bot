/**
 * Interactive category tree (admin).
 *
 * The tree message owns its own buttons, and a tap starts a short guided flow
 * (child -> parent -> confirm, or pick a connection -> confirm). Kept out of
 * the webhook so the routing file only decides *when* to call these steps.
 */
import { getApprovedCategories } from '@wa-directory/shared'
import type { InteractiveButton } from '@wa-directory/shared'
import {
  categoryTree,
  linkCategories,
  unlinkCategory,
  type CategoryTreeNode,
} from './category-links.js'
import type { ChatSession } from './chat-session.js'

export type CategoryTreeDeps = {
  sendText: (to: string, body: string) => Promise<unknown>
  sendButtons: (
    to: string,
    body: string,
    buttons: InteractiveButton[]
  ) => Promise<unknown>
  getSession: (phone: string) => Promise<ChatSession | null>
  saveSession: (phone: string, step: string, data: ChatSession['data']) => Promise<unknown>
  clearSession: (phone: string) => Promise<unknown>
}

/** Resolve an admin-typed category against the approved list. */
export function pickApprovedCategory(
  approved: Array<{ name: string }>,
  input: string
): { name?: string; error?: string } {
  const wanted = (input || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[.;]$/, '')
    .trim()
  if (!wanted) return { error: 'Send a category name.' }
  const exact = approved.find((c) => c.name.toLowerCase() === wanted.toLowerCase())
  if (exact) return { name: exact.name }
  const close = approved
    .filter(
      (c) =>
        c.name.toLowerCase().includes(wanted.toLowerCase()) ||
        wanted.toLowerCase().includes(c.name.toLowerCase())
    )
    .map((c) => c.name)
    .slice(0, 5)
  return {
    error:
      `*${wanted}* is not an approved category.` +
      (close.length ? `\nClosest: ${close.join(', ')}` : '') +
      '\nApprove it first with *approve req <n>*, then connect it.',
  }
}

export function renderCategoryTree(trees: CategoryTreeNode[], connections: number): string {
  const lines = [`🌳 *Category tree* - ${connections} connection${connections === 1 ? '' : 's'}`, '']
  const countNodes = (nodes: CategoryTreeNode[]): number =>
    nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0)
  const total = countNodes(trees)
  const cap = 60
  let shown = 0

  const walk = (nodes: CategoryTreeNode[], depth: number) => {
    for (const node of nodes) {
      if (shown >= cap) return
      shown++
      lines.push(depth === 0 ? `*${node.name}*` : `${'  '.repeat(depth)}└ ${node.name}`)
      walk(node.children, depth + 1)
    }
  }
  walk(trees, 0)
  if (total > shown) lines.push(`… and ${total - shown} more`)
  return lines.join('\n')
}

export function createAdminCategoryTree(deps: CategoryTreeDeps) {
  const show = async (from: string): Promise<void> => {
    const tree = await categoryTree()
    const current = await deps.getSession(from)
    await deps.saveSession(from, 'admin_tree', {
      ...(current?.data || {}),
      treeConnectChild: undefined,
      treeConnectParent: undefined,
      treeLinks: undefined,
      treeLink: undefined,
    })

    if (!tree.connections) {
      await deps.sendButtons(
        from,
        '🌳 *Category tree*\n\nNo category connections yet. Connect a child category to a parent and buyers searching either name will see both.',
        [{ id: 'tree_connect', title: '🔗 Connect branch' }]
      )
      return
    }

    const body = `${renderCategoryTree(tree.trees, tree.connections)}\n\nConnect or disconnect a branch:`
    const buttons: InteractiveButton[] = [
      { id: 'tree_connect', title: '🔗 Connect' },
      { id: 'tree_disconnect', title: '✂️ Disconnect' },
      { id: 'tree_done', title: '✖ Close' },
    ]
    if (body.length <= 1000) {
      await deps.sendButtons(from, body, buttons)
    } else {
      await deps.sendText(from, body)
      await deps.sendButtons(from, 'Connect or disconnect a branch:', buttons)
    }
  }

  const finishConnect = async (from: string, session: ChatSession | null): Promise<void> => {
    const child = session?.data.treeConnectChild
    const parent = session?.data.treeConnectParent
    if (!child || !parent) {
      await deps.clearSession(from)
      await deps.sendText(from, '⌛ That connection expired. Send *category tree* to start again.')
      return
    }
    const linked = await linkCategories(child, parent)
    if (!linked.ok) {
      await deps.sendText(from, `⚠️ ${linked.error || 'Could not connect those categories.'}`)
      return
    }
    await deps.clearSession(from)
    await deps.sendText(from, `🔗 *${child}* is now an element of *${parent}*.`)
    await show(from)
  }

  const finishDisconnect = async (
    from: string,
    session: ChatSession | null
  ): Promise<void> => {
    const link = session?.data.treeLink
    if (!link) {
      await deps.clearSession(from)
      await deps.sendText(from, '⌛ That connection expired. Send *category tree* to start again.')
      return
    }
    const removed = await unlinkCategory(link.raw)
    if (!removed.ok) {
      await deps.sendText(from, `⚠️ ${removed.error || 'Could not remove that connection.'}`)
      return
    }
    await deps.clearSession(from)
    await deps.sendText(
      from,
      `✂️ *${link.child}* is no longer under *${link.parent}*. Searching either name keeps its own results.`
    )
    await show(from)
  }

  return {
    show,
    finishConnect,
    finishDisconnect,
    approvedCategories: getApprovedCategories,
  }
}
