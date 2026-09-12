/** Normalize an environment-provided Resend sender address. */
export function normalizeEmailSender(value: string): string {
  const trimmed = value.trim();

  // Hosting dashboards occasionally retain quotes pasted around an entire value.
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

/** Resend accepts either an address or a display name plus an address. */
export function isValidEmailSender(value: string): boolean {
  const sender = normalizeEmailSender(value);
  const address = "[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+";

  return new RegExp(`^(?:${address}|[^<>\\r\\n]+ <${address}>)$`).test(sender);
}
