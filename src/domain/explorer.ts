export type ExplorerNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  slug?: string;
  href?: string;
  children?: ExplorerNode[];
};
