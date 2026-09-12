export const BASE_PATH = process.env.MUFFIN_BASE_PATH ?? "";

export function withBasePath(basePath: string, urlPath: string): string {
  const prefix = basePath.replace(/\/$/, "");
  if (!prefix) {
    return urlPath;
  }
  return `${prefix}${urlPath}`;
}