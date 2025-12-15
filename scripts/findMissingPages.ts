// @ts-nocheck
// Script to find .mdx files that are not referenced in docs.json

const fs = require('fs');
const path = require('path');

const DOCS_PATH = path.join(__dirname, '..', 'docs.json');
const ROOT_DIR = path.join(__dirname, '..');

// Recursively extract all page paths from navigation structure
function extractPages(value, pages = new Set()) {
  if (typeof value === 'string') {
    // This is a page path
    pages.add(value);
    return pages;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extractPages(item, pages));
    return pages;
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.pages)) {
      value.pages.forEach((p) => extractPages(p, pages));
    }
    if (Array.isArray(value.groups)) {
      value.groups.forEach((g) => extractPages(g, pages));
    }
    if (Array.isArray(value.tabs)) {
      value.tabs.forEach((t) => extractPages(t, pages));
    }
    return pages;
  }

  return pages;
}

// Get all .mdx files recursively
function getAllMdxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and other common ignored directories
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
        getAllMdxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.mdx')) {
      // Get relative path from root
      const relativePath = path.relative(ROOT_DIR, filePath);
      fileList.push(relativePath);
    }
  });

  return fileList;
}

function main() {
  // Read docs.json
  const docsContent = fs.readFileSync(DOCS_PATH, 'utf8');
  const docs = JSON.parse(docsContent);

  // Extract all page references from docs.json
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

  // Get all .mdx files in the project
  const allMdxFiles = getAllMdxFiles(ROOT_DIR);

  // Normalize paths: remove .mdx extension and normalize separators
  const normalizedReferenced = new Set(
    Array.from(referencedPages).map((p) => p.replace(/\\/g, '/'))
  );

  const normalizedMdxFiles = allMdxFiles.map((f) => {
    const normalized = f.replace(/\\/g, '/').replace(/\.mdx$/, '');
    return normalized;
  });

  // Find missing pages
  const missingPages = normalizedMdxFiles.filter(
    (file) => !normalizedReferenced.has(file)
  );

  // Sort and display results
  missingPages.sort();

  console.log(`\nTotal .mdx files: ${normalizedMdxFiles.length}`);
  console.log(`Total referenced pages: ${normalizedReferenced.size}`);
  console.log(`\nMissing pages (${missingPages.length}):\n`);

  if (missingPages.length === 0) {
    console.log('✅ All pages are referenced in docs.json!');
  } else {
    missingPages.forEach((page) => {
      console.log(`  - ${page}.mdx`);
    });
  }

  return missingPages;
}

main();

