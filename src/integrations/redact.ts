/** Remove a password from a message before it is logged or returned. */
export function redactSecret(message: string, secret: string | undefined): string {
  if (!secret) return message;
  return message.split(secret).join('[redacted]');
}
