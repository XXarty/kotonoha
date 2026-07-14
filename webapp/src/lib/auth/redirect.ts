const DEFAULT_REDIRECT_TARGET = "/profile";
const REDIRECT_BASE_ORIGIN = "https://kotonoha.invalid";
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function getSafeRedirectTarget(target: string | string[] | undefined): string {
  if (
    typeof target !== "string" ||
    target.trim() !== target ||
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.includes("\\") ||
    CONTROL_CHARACTER.test(target)
  ) {
    return DEFAULT_REDIRECT_TARGET;
  }

  try {
    const resolved = new URL(target, REDIRECT_BASE_ORIGIN);
    if (resolved.origin !== REDIRECT_BASE_ORIGIN) {
      return DEFAULT_REDIRECT_TARGET;
    }
  } catch {
    return DEFAULT_REDIRECT_TARGET;
  }

  return target;
}
