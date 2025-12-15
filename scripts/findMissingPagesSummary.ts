// @ts-nocheck
// Script to find .mdx files that are not referenced in docs.json
// This version groups by base pages (without language prefixes)

const fs = require('fs');
const path = require('path');

const DOCS_PATH = path.join(__dirname, '..', 'docs.json');
const ROOT_DIR = path.join(__dirname, '..');

// Language codes to identify localized pages
const LANGUAGE_CODES = ['ar', 'cn', 'de', 'es', 'fr', 'id', 'ja', 'ko', 'pt-BR', 'vi'];

// Recursively extract all page paths from navigation structure
function extractPages(value, pages = new Set()) {
  if (typeof value === 'string') {
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
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
        getAllMdxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.mdx')) {
      const relativePath = path.relative(ROOT_DIR, filePath);
      fileList.push(relativePath);
    }
  });

  return fileList;
}

// Extract base page path (remove language prefix)
function getBasePage(filePath) {
  const normalized = filePath.replace(/\\/g, '/').replace(/\.mdx$/, '');
  const parts = normalized.split('/');
  
  if (LANGUAGE_CODES.includes(parts[0])) {
    return parts.slice(1).join('/');
  }
  
  return normalized;
}

function main() {
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

  const allMdxFiles = getAllMdxFiles(ROOT_DIR);
  const normalizedReferenced = new Set(
    Array.from(referencedPages).map((p) => p.replace(/\\/g, '/'))
  );

  // Group missing pages by base path
  const missingByBase = new Map();
  const englishMissing = [];

  allMdxFiles.forEach((file) => {
    const normalized = file.replace(/\\/g, '/').replace(/\.mdx$/, '');
    const basePage = getBasePage(normalized);
    
    if (!normalizedReferenced.has(normalized)) {
      if (LANGUAGE_CODES.some((lang) => normalized.startsWith(`${lang}/`))) {
        // Localized page
        if (!missingByBase.has(basePage)) {
          missingByBase.set(basePage, []);
        }
        missingByBase.get(basePage).push(normalized);
      } else {
        // English/base page
        englishMissing.push(normalized);
      }
    }
  });

  console.log('\n📊 Summary of Missing Pages\n');
  console.log(`Total .mdx files: ${allMdxFiles.length}`);
  console.log(`Total referenced pages: ${normalizedReferenced.size}`);
  console.log(`\nMissing English/base pages: ${englishMissing.length}`);
  console.log(`Missing localized pages: ${Array.from(missingByBase.values()).flat().length}`);
  console.log(`Unique base pages with missing translations: ${missingByBase.size}\n`);

  if (englishMissing.length > 0) {
    console.log('🔴 Missing English/Base Pages:\n');
    englishMissing.sort().forEach((page) => {
      console.log(`  - ${page}.mdx`);
    });
    console.log('');
  }

  if (missingByBase.size > 0) {
    console.log('🌍 Missing Localized Pages (grouped by base page):\n');
    const sortedBases = Array.from(missingByBase.keys()).sort();
    sortedBases.forEach((base) => {
      const missing = missingByBase.get(base);
      console.log(`  ${base}.mdx (${missing.length} missing translations):`);
      missing.sort().forEach((page) => {
        console.log(`    - ${page}.mdx`);
      });
      console.log('');
    });
  }

  if (englishMissing.length === 0 && missingByBase.size === 0) {
    console.log('✅ All pages are referenced in docs.json!');
  }
}

main();

