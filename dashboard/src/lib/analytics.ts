import posthog from 'posthog-js';

// Si no hay key, PostHog no enviará eventos, así que es seguro inicializarlo igual.
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_placeholder', {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
    loaded: (posthog_instance) => {
      if (process.env.NODE_ENV === 'development') posthog_instance.debug(false);
    },
    capture_pageview: false // Lo haremos manual en Next.js App Router
  });
}

// ----------------------------------------------------
// TAXONOMÍA DE EVENTOS ESTRICTA
// ----------------------------------------------------
export type TrackingEvent =
  // Onboarding
  | { name: 'user_signed_up' }
  | { name: 'user_logged_in' }
  | { name: 'workspace_created' }
  | { name: 'onboarding_step_completed', properties: { step_name: string } }
  | { name: 'channel_connected', properties: { provider: 'whatsapp' | 'instagram' | 'messenger' } }
  | { name: 'ecommerce_connected', properties: { provider: 'woocommerce' | 'shopify' } }
  
  // Knowledge / AI
  | { name: 'knowledge_source_added', properties: { source_type: 'url' | 'pdf' | 'text', size_bytes?: number, chunks_generated?: number } }
  | { name: 'knowledge_source_deleted', properties: { source_type: string } }
  | { name: 'knowledge_sync_triggered', properties: { source_type: string, status: 'success' | 'error' } }
  | { name: 'knowledge_audited', properties: { source_id: string, type: string } }
  | { name: 'ai_test_executed', properties: { has_instruction: boolean } }
  
  // Conversations
  | { name: 'session_started', properties: { channel: string } }
  | { name: 'message_sent', properties: { role: 'assistant' | 'user' | 'internal_note', type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'NOTE' } }
  | { name: 'internal_note_added', properties: { session_id: string, length: number } }
  | { name: 'session_escalated', properties: { direction: 'ai_to_human' | 'human_to_ai', reason?: string } }
  | { name: 'session_resolved', properties: { resolved_by: 'ai' | 'human', session_duration_seconds?: number } }
  | { name: 'session_filtered', properties: { filter_type: 'pending' | 'ai' | 'history' } }
  
  // Billing
  | { name: 'checkout_started', properties: { target_plan: 'PRO' } }
  | { name: 'subscription_upgraded', properties: { mrr_amount?: number, currency?: string } }
  | { name: 'subscription_canceled', properties: { reason?: string } }
  
  // System / Errors
  | { name: 'error_encountered', properties: { type: 'api' | 'ui' | 'webhook', message: string, code?: string } }
  | { name: 'integration_failed', properties: { provider: string, reason: string } };

// ----------------------------------------------------
// SDK Wrapper
// ----------------------------------------------------
export const analytics = {
  identify: (userId: string, traits?: Record<string, any>) => {
    posthog.identify(userId, traits);
  },
  
  group: (groupType: string, groupKey: string, groupTraits?: Record<string, any>) => {
    posthog.group(groupType, groupKey, groupTraits);
  },
  
  track: <E extends TrackingEvent>(event: E['name'], properties?: E extends { properties: infer P } ? P : undefined) => {
    posthog.capture(event, properties);
  },

  page: (url: string) => {
    posthog.capture('$pageview', { $current_url: url });
  },
  
  reset: () => {
    posthog.reset();
  }
};
