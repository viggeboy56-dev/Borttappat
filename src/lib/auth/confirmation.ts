export function getEmailConfirmationNextPath(value: string | null) {
  if (!value) return "/login";

  const inviteMatch = /^\/invite\/([^/?#]+)$/.exec(value);
  if (inviteMatch && /^[A-Za-z0-9_-]{43}$/.test(inviteMatch[1])) return value;

  const joinMatch = /^\/join\/([^/?#]+)$/.exec(value);
  if (
    joinMatch &&
    joinMatch[1].length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(joinMatch[1])
  ) {
    return value;
  }

  return "/login";
}
