// @ts-nocheck
// Shared utilities for documentation scripts

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DOCS_PATH = path.join(ROOT_DIR, 'docs.json');

const SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'en'];

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
      const relativePath = path.relative(ROOT_DIR, filePath);
      fileList.push(relativePath);
    }
  });

  return fileList;
}

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

