/**
 * Topic gating L3 prompt template
 */

/**
 * Generate topic gating prompt for L3 validation
 */
export function getTopicGatingPrompt(
  input: string,
  allowedTopics: string,
  blockedTopics: string,
  l1Score: number,
  l2Score: number
): string {
  return `You are a topic classifier for a business assistant.

ALLOWED TOPICS:
${allowedTopics || 'Not specified'}

BLOCKED TOPICS:
${blockedTopics || 'Not specified'}

Analyze this user input:
"""
${input.substring(0, 1000)}
"""

Previous detection scores:
- L1 (Keywords): ${(l1Score * 100).toFixed(0)}%
- L2 (Patterns): ${(l2Score * 100).toFixed(0)}%

Is this request on-topic (allowed) or off-topic (blocked)?

Consider:
1. Does the request match any allowed topic areas?
2. Does it match any blocked topic areas?
3. Could this be a legitimate business question even if it seems off-topic?
4. Is this an attempt to bypass topic restrictions?

Respond with JSON only:
{
  "blocked": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "detectedTopic": "topic category"
}`;
}

/**
 * Export as constant for registration
 */
export const TOPIC_GATING_PROMPT = {
  name: 'topic-gating',
  getPrompt: getTopicGatingPrompt,
};
