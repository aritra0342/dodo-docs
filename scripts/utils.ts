import fs from 'fs';
import path from 'path';

/** Root directory of the documentation project */
export const ROOT_DIR = path.join(__dirname, '..');

/** Path to the docs.json configuration file */
export const DOCS_PATH = path.join(ROOT_DIR, 'docs.json');

/** Directories to skip during MDX file traversal */
const SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'en'];

type NavigationValue = string | NavigationValue[] | { pages?: NavigationValue[]; groups?: NavigationValue[]; tabs?: NavigationValue[] };

/**
 * Recursively extracts page references from a navigation structure.
 * Traverses arrays, objects with pages/groups/tabs properties, and string values.
 * @param value - The value to extract pages from (string, array, or object)
 * @param pages - Set to collect page paths
 * @returns Set of page paths
 */
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

/**
 * Recursively discovers all MDX files in a directory tree.
 * Skips configured directories (node_modules, .git, etc.) and returns relative paths.
 * @param dir - Directory to search
 * @param fileList - Array to collect file paths
 * @returns Array of MDX file paths relative to ROOT_DIR (forward slashes)
 */
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

/**
 * Reads docs.json and extracts all page references from the navigation structure.
 * @returns Set of page paths referenced in docs.json
 */
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

/**
 * Gets all referenced pages with normalized path separators (forward slashes).
 * Converts backslashes to forward slashes for cross-platform compatibility.
 * @returns Set of normalized page paths
 */
export function getNormalizedReferencedPages(): Set<string> {
  const referencedPages = getReferencedPages();
  return new Set(
    Array.from(referencedPages).map((p) => p.replace(/\\/g, '/'))
  );
}
