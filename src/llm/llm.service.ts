import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async generateCompletion(
    system: string,
    userPrompt: string,
  ): Promise<string> {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('LLM_API_KEY is not configured');
    }

    // [AI] Switched from Anthropic to Groq. Model default updated to
    // openai/gpt-oss-20b — Groq deprecated llama-3.3-70b-versatile and
    // llama-3.1-8b-instant in June 2026, so the old placeholder would have
    // 400'd immediately. gpt-oss-20b chosen for cost/speed on a
    // classification task; gpt-oss-120b is available if quality matters
    // more than latency here.
    // -> MENTION TO TEAM: Groq's model catalog churns often (their own
    //    docs note this) — worth checking https://console.groq.com/docs/models
    //    or GET /v1/models before a demo, not just trusting this default.
    const model = process.env.LLM_MODEL ?? 'openai/gpt-oss-20b';

    try {
      // [AI] Endpoint + auth header changed for Groq's OpenAI-compatible
      // API: Authorization: Bearer, not x-api-key + anthropic-version.
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024, // [AI] arbitrary cap, unchanged from before — not spec-given
            // [AI] Groq/OpenAI-compatible format puts the system prompt
            // INSIDE the messages array, unlike Anthropic's separate top-
            // level `system` field. This is a real shape difference, not
            // cosmetic — a straight copy-paste of the old body would 400.
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userPrompt },
            ],
            // [AI] Optional: Groq supports response_format: { type: "json_object" }
            // on models that support structured outputs, which would enforce
            // the "respond with ONLY JSON" instruction at the API level
            // instead of just hoping the model listens to the prompt.
            // Left OFF here since not every Groq model supports it — verify
            // for whichever model you settle on, then turn it on.
            // -> MENTION TO TEAM as a reliability improvement
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`LLM API responded ${response.status}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content; // OpenAI-compatible shape is choices[0].message.content

      if (typeof text !== 'string') {
        throw new Error('LLM API returned an unexpected response shape');
      }

      return text;
    } catch (err) {
      this.logger.error('LLM completion failed', err as Error);
      throw new InternalServerErrorException(
        'Failed to get a response from the LLM',
      );
    }
  }
}
