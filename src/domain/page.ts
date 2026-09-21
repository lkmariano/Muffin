export type Backlink = { title: string; href: string };

export type TocEntry = {
  depth: number;
  text: string;
  id: string;
};

export type PageMetadata = {
  frontmatter: Record<string, unknown>;
  status?: string;
  updated: string;
  tags: string[];
};

export type Page = {
  path: string;
  /** Root-relative canonical identity (same string loadContent emits). */
  relPath: string;
  slug: string;
  title: string;
  metadata: PageMetadata;
  content: string;
  backlinks?: Backlink[];
  toc: TocEntry[];
};