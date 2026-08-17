/**
 * A product-owned scoped persona row for the bundled Chinese legal expert presets.
 * It follows the upstream dsh-persona contract without adding an unpublished runtime
 * dependency to the desktop package.
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { PERSONA_ORDER, PERSONA_SECTION } from '@deepseek-ai/dsh-system-prompt'

/** Cordis plugin name. */
export const name = 'legal-persona'

/** The prompt registry this row contributes to. */
export const inject = ['systemPrompt']

/** Plugin config for one legal expert persona. */
export interface Config {
  /** Persona prose rendered as the scoped deployment persona. */
  text: string
  /** Make this persona the complete system prompt for the scoped agent. */
  complete?: boolean
  /** Keep dynamic runtime-context snapshots for this agent scope. */
  includeRuntimeContext?: boolean
}

/** Runtime schema for the legal persona row. */
export const Config: z<Config> = z.object({
  text: z.string().required(),
  complete: z.boolean().default(false),
  includeRuntimeContext: z.boolean().default(true),
})

/** Register the persona in the preset-provided agent scope. */
export function apply(ctx: Context, config: Config): void {
  ctx.effect(
    () => ctx.systemPrompt.section({
      name: PERSONA_SECTION,
      order: PERSONA_ORDER,
      text: config.text,
      ...(config.complete ? { complete: true } : {}),
    }),
    'legal-persona.section()',
  )
  if (!(config.includeRuntimeContext ?? true)) ctx.systemPrompt.suppressRuntimeContext()
}
