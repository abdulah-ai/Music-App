/**
 * Turn any failed API call into a string that is safe to render.
 *
 * FastAPI error shapes vary by status: 4xx guard clauses return
 * `detail: "message"`, but 422 validation errors return `detail` as an
 * ARRAY of `{type, loc, msg, input, ctx}` objects. Rendering that array
 * straight into a <Text> crashes React ("objects are not valid as a React
 * child") and white-screens the app — every error surface must go through
 * this helper instead of reading `err.response.data.detail` directly.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as any)?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        const field = Array.isArray(item?.loc) ? String(item.loc[item.loc.length - 1]) : '';
        const msg = typeof item?.msg === 'string' ? item.msg : '';
        if (!msg) return '';
        return field && field !== 'body' ? `${humanizeField(field)}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join('\n');
  }
  return fallback;
}

function humanizeField(field: string): string {
  const pretty = field.replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

/**
 * Translate raw downloader (yt-dlp) failure text into something a person
 * can act on. Falls back to a cleaned-up version of the original message
 * (never the raw "ERROR: [extractor] id:" prefix noise).
 */
export function friendlyJobError(raw: string | null | undefined): string {
  const msg = (raw ?? '').trim();
  if (!msg) return 'Download failed — try again in a moment.';
  const lower = msg.toLowerCase();

  if (lower.includes('unsupported url') || lower.includes('[generic]')) {
    return "That link doesn't contain any media we can save.";
  }
  if (lower.includes('video unavailable') || lower.includes('this video is not available')) {
    return 'That video is unavailable — it may have been removed.';
  }
  if (lower.includes('private video') || lower.includes('this video is private')) {
    return 'That video is private, so it can’t be saved.';
  }
  if (lower.includes('age') && lower.includes('confirm')) {
    return 'That video is age-restricted and can’t be saved right now.';
  }
  if (lower.includes('sign in') || lower.includes('login required') || lower.includes('cookies')) {
    return 'The site is asking for a sign-in — this link can’t be saved right now.';
  }
  if (lower.includes('unable to download webpage') || lower.includes('getaddrinfo') || lower.includes('timed out')) {
    return "Couldn't reach that site — check the link and try again.";
  }
  if (lower.includes('http error 404') || lower.includes('not found')) {
    return 'Nothing lives at that link anymore (404).';
  }
  if (lower.includes('http error 403') || lower.includes('forbidden')) {
    return 'The site refused the request for this link.';
  }

  // Unknown failure: strip yt-dlp's "ERROR: [extractor] videoid:" prefix and
  // keep a single readable sentence.
  const cleaned = msg
    .replace(/^error:\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^[\w-]{6,}:\s*/, '');
  const firstLine = cleaned.split('\n')[0].trim();
  return firstLine.length > 140 ? `${firstLine.slice(0, 137)}…` : firstLine || 'Download failed — try again in a moment.';
}
