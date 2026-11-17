export function parseAllowedOrigins(
  raw: string | undefined,
  isProd: boolean
): string[] {
  const output: string[] =
    raw
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => normalizeOrigin(s)) ?? [];

  if (!isProd) {
    output.push('http://localhost:5173');
    output.push('http://localhost:5174');
  }

  return [...new Set(output)];
}

export function normalizeOrigin(entry: string): string {
  let url: URL;
  try {
    url = new URL(entry);
  } catch {
    throw new Error(`ALLOWED_ORIGINS entry is not a valid URL: "${entry}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `ALLOWED_ORIGINS entry must start with http:// or https://: "${entry}"`
    );
  }
  return url.origin;
}
