/**
 * The admin button menu: one WhatsApp list so staff never have to remember
 * command syntax. Every tap maps back to the typed command it replaces, which
 * keeps the existing handlers as the single source of behaviour.
 */
import type { InteractiveRow } from '@wa-directory/shared'

export const ADMIN_MENU_BUTTON = 'Admin menu'

export const ADMIN_MENU_ROWS: InteractiveRow[] = [
  { id: 'adm_pending', title: '⏳ Pending listings', description: 'Verify or reject new submissions' },
  { id: 'adm_requests', title: '📨 Category requests', description: 'Approve, reject or connect a request' },
  { id: 'adm_tree', title: '🌳 Category tree', description: 'Connect or disconnect a branch' },
  { id: 'adm_add', title: '🏪 Add for someone', description: 'Register a business for its owner' },
  { id: 'adm_agents', title: '👥 Agents', description: 'Add or remove field agents' },
  { id: 'adm_listings', title: '🆕 Newest listings', description: 'The last 10 businesses' },
  { id: 'adm_stats', title: '📊 Weekly stats', description: 'Registrations, searches and needs' },
  { id: 'adm_digest', title: '🧾 Digest', description: "Everything since your last check-in" },
  { id: 'adm_emergency', title: '🆘 Emergency list', description: 'Saved emergency contacts' },
]

const COMMANDS: Record<string, string> = {
  adm_pending: 'pending',
  adm_requests: 'requests',
  adm_tree: 'category tree',
  adm_add: 'add business',
  adm_agents: 'agents',
  adm_listings: 'listings',
  adm_stats: 'stats',
  adm_digest: 'digest',
  adm_emergency: 'emergency list',
}

/** Map a menu tap id to the command it stands for (null when it is not ours). */
export function adminMenuCommand(input: string): string | null {
  return COMMANDS[(input || '').trim()] || null
}

export function adminMenuBody(agentCount: number): string {
  return [
    '🛠️ *Admin menu*',
    '',
    'Tap what you need - the typed commands still work too.',
    agentCount > 0
      ? `👥 ${agentCount} field agent${agentCount === 1 ? '' : 's'} can add businesses for owners.`
      : 'No field agents yet. Tap *Agents* to add one.',
    '',
    'Held customer: *reply <number> your message* · *release <number>*',
  ].join('\n')
}
