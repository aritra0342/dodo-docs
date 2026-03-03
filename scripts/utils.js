// @ts-nocheck
// Shared utilities for documentation scripts

const fs = require('fs');
const path = require('path');

/** Root directory of the documentation project */
const ROOT_DIR = path.join(__dirname, '..');

/** Path to the docs.json configuration file */
const DOCS_PATH = path.join(ROOT_DIR, 'docs.json');

/** Directories to skip during MDX file traversal */
const SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'en'];

/**
 * Recursively extracts page references from a navigation structure.
 * Traverses arrays, objects with pages/groups/tabs properties, and string values.
 * @param {*} value - The value to extract pages from (string, array, or object)
 * @param {Set<string>} [pages=new Set()] - Set to collect page paths
 * @returns {Set<string>} Set of page paths
 */
function extractPages(value, pages = new Set()) {
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
 * @param {string} [dir=ROOT_DIR] - Directory to search
 * @param {string[]} [fileList=[]] - Array to collect file paths
 * @returns {string[]} Array of MDX file paths relative to ROOT_DIR (forward slashes)
 */
function getAllMdxFiles(dir = ROOT_DIR, fileList = []) {
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
 * @returns {Set<string>} Set of page paths referenced in docs.json
 */
function getReferencedPages() {
  const docsContent = fs.readFileSync(DOCS_PATH, 'utf8');
  const docs = JSON.parse(docsContent);
  const referencedPages = new Set();

  if (docs.navigation && docs.navigation.languages) {
    docs.navigation.languages.forEach((lang) => {
      if (lang.tabs) {
        lang.tabs.forEach((tab) => {
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
 * @returns {Set<string>} Set of normalized page paths
 */
function getNormalizedReferencedPages() {
  const referencedPages = getReferencedPages();
  return new Set(
    Array.from(referencedPages).map((p) => p.replace(/\\/g, '/'))
  );
}

module.exports = {
  ROOT_DIR,
  DOCS_PATH,
  extractPages,
  getAllMdxFiles,
  getReferencedPages,
  getNormalizedReferencedPages,
};

