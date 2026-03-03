import fs from 'fs';
import path from 'path';

export const ROOT_DIR = path.join(__dirname, '..');
export const DOCS_PATH = path.join(ROOT_DIR, 'docs.json');

const SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'en'];

type NavigationValue = string | NavigationValue[] | { pages?: NavigationValue[]; groups?: NavigationValue[]; tabs?: NavigationValue[] };

export function extractPages(value: NavigationValue, pages: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') {
    pages.add(value);
    return pages;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      extractPages(item, pages);
    });
    return pages;
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.pages)) {
      value.pages.forEach((p) => {
        extractPages(p, pages);
      });
    }
    if (Array.isArray(value.groups)) {
      value.groups.forEach((g) => {
        extractPages(g, pages);
      });
    }
    if (Array.isArray(value.tabs)) {
      value.tabs.forEach((t) => {
        extractPages(t, pages);
      });
    }
    return pages;
  }

  return pages;
}

export function getAllMdxFiles(dir: string = ROOT_DIR, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.includes(file)) {
        getAllMdxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.mdx')) {
      const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
      fileList.push(relativePath);
    }
  });

  return fileList;
}

export function getReferencedPages(): Set<string> {
  const docsContent = fs.readFileSync(DOCS_PATH, 'utf8');
  const docs = JSON.parse(docsContent);
  const referencedPages = new Set<string>();

  if (docs.navigation && docs.navigation.languages) {
    docs.navigation.languages.forEach((lang: any) => {
      if (lang.tabs) {
        lang.tabs.forEach((tab: NavigationValue) => {
          extractPages(tab, referencedPages);
        });
      }
    });
  }

  return referencedPages;
}

export function getNormalizedReferencedPages(): Set<string> {
  const referencedPages = getReferencedPages();
  return new Set(
    Array.from(referencedPages).map((p) => p.replace(/\\/g, '/'))
  );
}
