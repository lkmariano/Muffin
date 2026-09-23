export function withBasePath(
  urlPath: string,
  basePath = process.env.MUFFIN_BASE_PATH ?? "",
): string {
  const prefix = basePath.replace(/\/$/, "");
  if (!prefix) {
    return urlPath;
  }
  return `${prefix}${urlPath}`;
}