export function normalizeKey(description: string): string {
  return description.toLowerCase().trim().split(/\s+/).slice(0, 3).join(' ');
}
