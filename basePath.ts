export const BASE_PATH = process.env.MUFFIN_BASE_PATH ?? "";

export function withBasePath(urlPath: string): string {
  if (!BASE_PATH) {
    return urlPath;
  }
  return `${BASE_PATH.replace(/\/$/, "")}${urlPath}`;
}