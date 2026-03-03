// @ts-nocheck
// Script to find .mdx files that are not referenced in docs.json

const { ROOT_DIR, getAllMdxFiles, getNormalizedReferencedPages } = require('./utils');

function main() {
  const normalizedReferenced = getNormalizedReferencedPages();

  const allMdxFiles = getAllMdxFiles();

  const normalizedMdxFiles = allMdxFiles.map((f) => {
    const normalized = f.replace(/\\/g, '/').replace(/\.mdx$/, '');
    return normalized;
  });

  const missingPages = normalizedMdxFiles.filter(
    (file) => !normalizedReferenced.has(file)
  );

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
