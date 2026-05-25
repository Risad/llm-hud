export function formatModelName(model: string): string {
  // Prefix matches ordered longest-first to avoid greedy mismatch
  const prefixes: [string, string][] = [
    ['gpt-4o-mini', 'GPT-4o mini'],
    ['gpt-4o', 'GPT-4o'],
    ['gpt-4.1-mini', 'GPT-4.1 mini'],
    ['gpt-4.1-nano', 'GPT-4.1 nano'],
    ['gpt-4.1', 'GPT-4.1'],
    ['gpt-4-turbo', 'GPT-4 Turbo'],
    ['gpt-4-32k', 'GPT-4 32K'],
    ['gpt-4', 'GPT-4'],
    ['gpt-3.5-turbo-instruct', 'GPT-3.5 Turbo Instruct'],
    ['gpt-3.5-turbo', 'GPT-3.5 Turbo'],
    ['o1-mini', 'o1 mini'],
    ['o1-pro', 'o1 Pro'],
    ['o1', 'o1'],
    ['o3-mini', 'o3 mini'],
    ['o3', 'o3'],
    ['o4-mini', 'o4 mini'],
    ['text-embedding-3-small', 'Embedding 3 small'],
    ['text-embedding-3-large', 'Embedding 3 large'],
    ['text-embedding-ada-002', 'Embedding Ada 002'],
    ['dall-e-3', 'DALL·E 3'],
    ['dall-e-2', 'DALL·E 2'],
    ['whisper-1', 'Whisper'],
    ['tts-1-hd', 'TTS HD'],
    ['tts-1', 'TTS'],
    ['claude-opus-4', 'Claude Opus 4'],
    ['claude-sonnet-4', 'Claude Sonnet 4'],
    ['claude-haiku-4', 'Claude Haiku 4'],
    ['claude-3-5-sonnet', 'Claude 3.5 Sonnet'],
    ['claude-3-5-haiku', 'Claude 3.5 Haiku'],
    ['claude-3-opus', 'Claude 3 Opus'],
    ['claude-3-sonnet', 'Claude 3 Sonnet'],
    ['claude-3-haiku', 'Claude 3 Haiku'],
    ['gemini-2.5-pro', 'Gemini 2.5 Pro'],
    ['gemini-2.0-flash-lite', 'Gemini 2.0 Flash Lite'],
    ['gemini-2.0-flash', 'Gemini 2.0 Flash'],
    ['gemini-1.5-pro', 'Gemini 1.5 Pro'],
    ['gemini-1.5-flash', 'Gemini 1.5 Flash'],
  ]
  for (const [prefix, name] of prefixes) {
    if (model === prefix || model.startsWith(prefix + '-') || model.startsWith(prefix + ':')) {
      return name
    }
  }
  return model
}
