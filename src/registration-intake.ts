/**
 * Image-first registration intake: read a business card/sign with the fast
 * vision pass, fall back to the structured extractor, ask for anything still
 * missing, and show the ready-to-publish review card.
 *
 * Extracted from src/webhook.ts so the routing file stays about routing. The
 * caller passes its transcript-logging senders; everything else is imported.
 */
import {
  REGISTRATION_BUTTONS,
  getConversationState,
  setConversationState,
  analyseBusinessMaterial,
  categories as sharedCategories,
  logOnboarding,
  maskPhone,
  matchCategoryAgainst,
} from '@wa-directory/shared'
import type { PlanType } from '@wa-directory/shared'
import type { InteractiveButton } from '@wa-directory/shared'
import { extractBusinessCardFast, hasRequiredCardField, type FastCardFields } from '../lib/card-ocr.js'
import { registrationReviewLines } from '../lib/registration-review.js'
import { normalizeOwnerPhone } from '../lib/agents.js'

const REGISTRATION_REQUIRED = ['business_name', 'category', 'phone', 'city', 'description'] as const
const REGISTRATION_FIELD_LABELS: Record<(typeof REGISTRATION_REQUIRED)[number], string> = {
  business_name: 'Business name',
  category: 'Category',
  phone: 'WhatsApp / phone number',
  city: 'City or town',
  description: 'What your business offers',
}

function registrationPromptForField(field: string): string {
  switch (field) {
    case 'business_name':
      return 'What is your business name?'
    case 'category':
      return 'Which category best describes your business? (e.g. Food & Restaurant, Hardware, Clothing & Fashion)'
    case 'phone':
      return 'Which phone number should customers use on WhatsApp?'
    case 'city':
      return '📍 Which city or town is your business in?'
    case 'description':
      return 'In a few words, what products or services does your business offer?'
    default:
      return `Please provide: ${field}`
  }
}

function registrationExtractedField(value: string, confidence = 0.7) {
  return {
    value,
    confidence,
    source: 'uploaded_material' as const,
    evidence: 'fast_card_read',
    needs_confirmation: false,
    status: 'suggested' as const,
  }
}

function fieldsFromFastCard(fast: FastCardFields) {
  const fields: Record<string, ReturnType<typeof registrationExtractedField>> = {}
  const add = (key: string, value: string) => {
    if (value) fields[key] = registrationExtractedField(value)
  }

  add('business_name', fast.business_name)
  const rawCategory = fast.category
  if (rawCategory) {
    // Use the in-code category list here: the fast path must not wait on a
    // Supabase lookup after the vision call.
    const mapped = matchCategoryAgainst(rawCategory, sharedCategories)
    if (mapped && mapped !== 'Other') add('category', mapped)
    else {
      // Keep the owner's wording so a human can confirm the category rather
      // than filing the listing under a guess.
      add('category', rawCategory)
      fields.requested_category = registrationExtractedField(rawCategory)
    }
  }
  add('phone', fast.phone)
  add('city', fast.city)
  add('description', fast.description)
  add('website', fast.website)
  add('address', fast.address)
  add('area', fast.area)
  add('price_range', fast.price_range)
  return fields
}

export function registrationOwnerContext(context: any): {
  onBehalfOf?: string
  regForSelf?: boolean
} {
  const owner =
    typeof context?.onBehalfOf === 'string' ? normalizeOwnerPhone(context.onBehalfOf) : ''
  return {
    ...(owner ? { onBehalfOf: owner } : {}),
    ...(context?.regForSelf === true ? { regForSelf: true } : {}),
  }
}

export type RegistrationIntakeDeps = {
  sendText: (to: string, body: string) => Promise<unknown>
  sendButtons: (
    to: string,
    body: string,
    buttons: InteractiveButton[]
  ) => Promise<unknown>
}

export function createRegistrationIntake(deps: RegistrationIntakeDeps) {
  const sendRegistrationReview = async (
    from: string,
    context: any,
    opts: { updated?: string; hint?: string } = {}
  ): Promise<void> => {
    const step = context?.step === 'final_review' ? 'final_review' : 'review_extracted'
    const lines = registrationReviewLines(context)
    const body = [
      opts.updated || '',
      '🏪 *Your listing — Ready to publish*',
      '',
      ...lines,
      '',
      opts.hint || 'Reply `City: Bulawayo` to change a detail (or `edit City: Bulawayo`).',
    ]
      .filter((line, i, all) => line || all[i - 1])
      .join('\n')
    const buttons: InteractiveButton[] =
      step === 'final_review'
        ? [
            { id: 'reg_publish', title: '🚀 Publish listing' },
            { id: 'reg_edit', title: '✏️ Edit details' },
            { id: 'reg_cancel', title: '✖ Cancel' },
          ]
        : [
            { id: 'reg_review_publish', title: '🚀 Publish listing' },
            { id: 'reg_edit', title: '✏️ Edit details' },
          ]
    if (body.length <= 1000) {
      await deps.sendButtons(from, body, buttons)
    } else {
      await deps.sendText(from, body)
      await deps.sendButtons(from, 'Ready to publish?', buttons)
    }
  }

  const applyRegistrationExtraction = async (
    from: string,
    fields: Record<string, any>,
    opts: {
      approvedPlan?: 'trial' | PlanType
      trialRequested: boolean
      draft?: any
      source: string
      onBehalfOf?: string
      regForSelf?: boolean
    }
  ): Promise<void> => {
    // The owner's number wins over whatever the card says: it is the number the
    // listing (and its portal account) belongs to.
    if (opts.onBehalfOf) {
      fields = {
        ...fields,
        phone: registrationExtractedField(opts.onBehalfOf, 1),
      }
    }
    const missing = REGISTRATION_REQUIRED.filter((key) => !fields?.[key]?.value)
    const draft = opts.draft || {
      fields,
      missing_required_fields: missing,
      next_questions: [],
      warnings: [],
      model: 'fast_card_read',
      analysed_at: new Date().toISOString(),
    }
    const context = {
      step: missing.length ? 'collecting_missing' : 'review_extracted',
      approvedPlan: opts.approvedPlan,
      trialRequested: opts.trialRequested,
      draft,
      fields,
      missing,
      currentMissingIndex: 0,
      ...(opts.onBehalfOf ? { onBehalfOf: opts.onBehalfOf } : {}),
      ...(opts.regForSelf ? { regForSelf: true } : {}),
    }

    if (missing.length) {
      const saved = await setConversationState(from, 'REGISTRATION_COLLECTING_FIELDS', context)
      if (!saved) {
        await deps.sendText(
          from,
          '⚠️ Something went wrong saving your listing. Please send the picture again.'
        )
        return
      }
      logOnboarding('registration_image_extracted', {
        phone: maskPhone(from),
        missing: missing.length,
        source: opts.source,
      })
      const found = registrationReviewLines(context)
      const foundBlock = found.length ? `${found.join('\n')}\n\n` : ''
      const missingBlock = missing.map((key) => `○ ${REGISTRATION_FIELD_LABELS[key]}`).join('\n')
      const heading =
        opts.source === 'fast_card'
          ? '🔍 *Quick read of your business information*'
          : '🔍 *We read your business information*'
      await deps.sendText(
        from,
        `${heading}\n\n${foundBlock}We still need:\n${missingBlock}\n\n${registrationPromptForField(missing[0])}`
      )
      return
    }

    const saved = await setConversationState(from, 'REGISTRATION_REVIEW_EXTRACTED', context)
    if (!saved) {
      await deps.sendText(
        from,
        '⚠️ Something went wrong saving your listing. Please send the picture again.'
      )
      return
    }
    logOnboarding('registration_image_extracted', {
      phone: maskPhone(from),
      missing: 0,
      source: opts.source,
    })
    await sendRegistrationReview(from, context)
  }

  const handleImage = async (
    from: string,
    bytes: Uint8Array,
    caption: string
  ): Promise<void> => {
    const previous = await getConversationState(from)
    const approvedPlan = previous?.context?.approvedPlan as 'trial' | PlanType | undefined
    const trialRequested =
      previous?.context?.trialRequested === true || approvedPlan === 'trial'
    const ownerContext = registrationOwnerContext(previous?.context)

    await setConversationState(from, 'REGISTRATION_PROCESSING_IMAGE', {
      step: 'processing',
      approvedPlan,
      trialRequested,
      ...ownerContext,
    })
    logOnboarding('registration_image_received', { phone: maskPhone(from) })
    await deps.sendText(from, '🔍 Reading your business material with AI... Please give us a moment.')

    const started = Date.now()
    let fast: FastCardFields | null = null
    try {
      fast = await extractBusinessCardFast(bytes, caption)
    } catch (err) {
      console.error('[bot-media] fast card read failed:', err)
    }
    const elapsed = Date.now() - started

    if (hasRequiredCardField(fast)) {
      await applyRegistrationExtraction(from, fieldsFromFastCard(fast!), {
        approvedPlan,
        trialRequested,
        source: 'fast_card',
        ...ownerContext,
      })
      return
    }

    // A quick miss leaves room for the full extractor. A timeout does not: the
    // user would wait another 50s only to be told the same thing.
    if (elapsed < 8_000) {
      try {
        const outcome = await analyseBusinessMaterial(
          [bytes],
          sharedCategories.map((category) => category.name)
        )
        if (outcome.ok) {
          await applyRegistrationExtraction(from, outcome.draft.fields as any, {
            approvedPlan,
            trialRequested,
            draft: outcome.draft,
            source: 'structured',
            ...ownerContext,
          })
          return
        }
      } catch (err) {
        console.error('[bot-media] registration image analysis error:', err)
      }
    }

    await setConversationState(from, 'REGISTRATION_AWAITING_IMAGE', {
      step: 'choose_material',
      approvedPlan,
      trialRequested,
      ...ownerContext,
    })
    logOnboarding('registration_image_failed', {
      phone: maskPhone(from),
      reason: fast ? 'no_fields' : 'fast_timeout',
    })
    await deps.sendButtons(
      from,
      `⚠️ *We couldn't read the information in that image.*\n\n` +
        `You can try another picture or enter your details manually.`,
      [
        { id: REGISTRATION_BUTTONS.upload, title: '📷 Try another picture' },
        { id: REGISTRATION_BUTTONS.skip, title: 'Enter manually' },
      ]
    )
  }

  return { handleImage, sendRegistrationReview, applyRegistrationExtraction }
}
