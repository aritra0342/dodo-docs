// @ts-nocheck
// Script to delete .mdx files that are not referenced in docs.json

const fs = require('fs');
const path = require('path');
const { ROOT_DIR, getAllMdxFiles, getNormalizedReferencedPages } = require('./utils');

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const force = args.includes('--force') || args.includes('-f');

  const normalizedReferenced = getNormalizedReferencedPages();

  const allMdxFiles = getAllMdxFiles().map((relative) => ({
    relative,
    absolute: path.join(ROOT_DIR, relative),
  }));

  const missingPages = allMdxFiles.filter((file) => {
    const normalized = file.relative.replace(/\\/g, '/').replace(/\.mdx$/, '');
    return !normalizedReferenced.has(normalized);
  });

  missingPages.sort((a, b) => a.relative.localeCompare(b.relative));

  console.log(`\n📊 Found ${missingPages.length} non-indexed pages\n`);

  if (missingPages.length === 0) {
    console.log('✅ All pages are referenced in docs.json!');
    return;
  }

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
    console.log('Files that would be deleted:\n');
    missingPages.forEach((file) => {
      console.log(`  - ${file.relative}`);
    });
    console.log(`\n💡 Run without --dry-run to actually delete these files.`);
    return;
  }

  console.log('Files to be deleted:\n');
  missingPages.forEach((file) => {
    console.log(`  - ${file.relative}`);
  });

  if (!force) {
    console.log(`\n⚠️  This will delete ${missingPages.length} files!`);
    console.log('💡 Use --force or -f flag to skip this confirmation.\n');
    return;
  }

  console.log('\n🗑️  Deleting files...\n');
  let deletedCount = 0;
  let errorCount = 0;

  missingPages.forEach((file) => {
    try {
      if (fs.existsSync(file.absolute)) {
        fs.unlinkSync(file.absolute);
        console.log(`  ✓ Deleted: ${file.relative}`);
        deletedCount++;
      } else {
        console.log(`  ⚠ File not found: ${file.relative}`);
      }
    } catch (error) {
      console.error(`  ✗ Error deleting ${file.relative}: ${error.message}`);
      errorCount++;
    }
  });

  console.log(`\n✅ Deletion complete!`);
  console.log(`   Deleted: ${deletedCount}`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount}`);
  }
}

main();
