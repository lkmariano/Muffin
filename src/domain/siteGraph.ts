export type SiteGraph = {
  forwardLinks: Record<string, string[]>;
  backlinks: Record<string, string[]>;
};
