export type Backlink = { title: string; href: string };

export type PageMetadata = {
  frontmatter: Record<string, unknown>;
  status?: string;
  updated: string;
};

export type Page = {
  path: string;
  title: string;
  metadata: PageMetadata;
  content: string;
  backlinks?: Backlink[];
};
