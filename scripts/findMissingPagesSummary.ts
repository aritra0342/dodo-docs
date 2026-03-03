// @ts-nocheck
// Script to find .mdx files that are not referenced in docs.json
// This version groups by base pages (without language prefixes)

const { ROOT_DIR, getAllMdxFiles, getNormalizedReferencedPages } = require('./utils');

const LANGUAGE_CODES = ['ar', 'cn', 'de', 'es', 'fr', 'id', 'ja', 'ko', 'pt-BR', 'sv', 'vi', 'hi', 'it'];

function getBasePage(filePath) {
  const normalized = filePath.replace(/\\/g, '/').replace(/\.mdx$/, '');
  const parts = normalized.split('/');
  
  if (LANGUAGE_CODES.includes(parts[0])) {
    return parts.slice(1).join('/');
  }
  
  return normalized;
}

function main() {
  const normalizedReferenced = getNormalizedReferencedPages();

  const allMdxFiles = getAllMdxFiles();

  const missingByBase = new Map();
  const englishMissing = [];

  allMdxFiles.forEach((file) => {
    const normalized = file.replace(/\\/g, '/').replace(/\.mdx$/, '');
    const basePage = getBasePage(normalized);
    
    if (!normalizedReferenced.has(normalized)) {
      if (LANGUAGE_CODES.some((lang) => normalized.startsWith(`${lang}/`))) {
        if (!missingByBase.has(basePage)) {
          missingByBase.set(basePage, []);
        }
        missingByBase.get(basePage).push(normalized);
      } else {
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
