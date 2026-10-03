// How the agents authenticate with Claude.
//
// Default: API authentication, the way Anthropic's Agent SDK docs require for third-party tools:
// ANTHROPIC_API_KEY, or a cloud provider (Amazon Bedrock, Google Vertex, Microsoft Foundry, Claude
// Platform on AWS). The user's claude.ai login (the `claude` CLI's subscription/OAuth session) is
// only used when explicitly opted into with --use-claude-login, for one's own personal use:
// "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai
// login or rate limits for their products" (https://code.claude.com/docs/en/agent-sdk/overview).

/** Env switches the Agent SDK / Claude Code CLI read to use a cloud provider instead of the Claude API. */
export const PROVIDER_SWITCHES: Record<string, string> = {
  CLAUDE_CODE_USE_BEDROCK: 'Amazon Bedrock',
  CLAUDE_CODE_USE_VERTEX: 'Google Vertex AI',
  CLAUDE_CODE_USE_FOUNDRY: 'Microsoft Foundry',
  CLAUDE_CODE_USE_ANTHROPIC_AWS: 'Claude Platform on AWS',
};

/** Variables that carry a claude.ai (subscription) login into the CLI; removed unless opted in. */
export const CLAUDE_LOGIN_VARS = ['CLAUDE_CODE_OAUTH_TOKEN'];

/**
 * Variables that make the CLI use API billing instead of the claude.ai login; removed with
 * --use-claude-login. The CLI ranks a cloud provider, ANTHROPIC_AUTH_TOKEN and ANTHROPIC_API_KEY above
 * the subscription login, so one stray key in the shell would bill the API while the banner says
 * "subscription". ANTHROPIC_BASE_URL goes too: the login token must only reach Anthropic.
 */
export const API_AUTH_VARS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', ...Object.keys(PROVIDER_SWITCHES)];

export type ApiAuth = { ok: true; source: string } | { ok: false };

const truthy = (v: string | undefined) => !!v && v !== '0' && v.toLowerCase() !== 'false';

/** Which API authentication the environment provides, if any. */
export function detectApiAuth(env: NodeJS.ProcessEnv = process.env): ApiAuth {
  if (env.ANTHROPIC_API_KEY?.trim()) return { ok: true, source: 'API key' };
  for (const [k, name] of Object.entries(PROVIDER_SWITCHES)) if (truthy(env[k])) return { ok: true, source: name };
  if (env.ANTHROPIC_AUTH_TOKEN?.trim() && env.ANTHROPIC_BASE_URL?.trim()) return { ok: true, source: 'API gateway' };
  return { ok: false };
}

/**
 * The environment for agent CLI processes. API mode: no claude.ai login token is passed on (the CLI
 * then authenticates with the key/provider). --use-claude-login: no API key, gateway or provider
 * switch is passed on (the CLI then uses the stored login, or CLAUDE_CODE_OAUTH_TOKEN).
 */
export function withAuthMode(env: Record<string, string | undefined>, useClaudeLogin: boolean): Record<string, string | undefined> {
  const out = { ...env };
  for (const k of useClaudeLogin ? API_AUTH_VARS : CLAUDE_LOGIN_VARS) delete out[k];
  return out;
}

export const NO_API_AUTH_MESSAGE =
  'No Claude API key. Set ANTHROPIC_API_KEY (from console.anthropic.com) or a cloud provider ' +
  '(CLAUDE_CODE_USE_BEDROCK / _VERTEX / _FOUNDRY), then restart the Foreman. For your own personal ' +
  'use only, --use-claude-login uses your claude.ai subscription instead (run `claude` and /login ' +
  'once). The sim backend works without either.';
