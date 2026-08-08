import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  // [AI] Kept generic on purpose (system prompt + user prompt in, raw text
  // out) so summarize-vendor and extract-fields can reuse this later
  // without a rewrite — that reuse plan isn't in the spec, just anticipating
  // the other two optional LLM endpoints listed in the PDF.
  async generateCompletion(system: string, userPrompt: string): Promise<string> {
    // [AI] process.env.LLM_API_KEY — this variable does not exist in
    // .env.example (currently an EMPTY file) or anywhere in the repo.
    // Someone has to add it before this ever runs.
    // -> MENTION TO TEAM (likely a config/.env addition — check with
    //    Thịnh since he owns config/.env.example in the task split, even
    //    though the LLM key itself is Sơn's module's concern)
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('LLM_API_KEY is not configured');
    }

    // [AI] Provider/endpoint/model choice — the PDF never names a specific
    // LLM provider or model. Used native fetch() against the Anthropic
    // Messages API here to avoid adding an unrequested SDK dependency
    // (@anthropic-ai/sdk is NOT in package.json). Team may prefer a
    // different provider or the official SDK instead.
    // -> MENTION TO TEAM
    const model = process.env.LLM_MODEL ?? 'claude-sonnet-4-6'; // [AI] placeholder model string, not spec-given

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01', // [AI] API version pinned arbitrarily
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024, // [AI] arbitrary cap, not spec-given
          system,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        // [AI] Wrapping any upstream failure as 500 — spec doesn't say
        // what HTTP status a failed LLM call should return to the caller.
        // -> MENTION TO TEAM (502 Bad Gateway might read better than 500)
        throw new Error(`LLM API responded ${response.status}`);
      }

      const data = await response.json();
      const text = data?.content?.[0]?.text;

      if (typeof text !== 'string') {
        throw new Error('LLM API returned an unexpected response shape');
      }

      return text;
    } catch (err) {
      this.logger.error('LLM completion failed', err as Error);
      throw new InternalServerErrorException('Failed to get a response from the LLM');
    }
  }
}
