// @ts-nocheck
// Script to delete .mdx files that are not referenced in docs.json

const fs = require('fs');
const path = require('path');

const DOCS_PATH = path.join(__dirname, '..', 'docs.json');
const ROOT_DIR = path.join(__dirname, '..');

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
      fileList.push({
        relative: relativePath,
        absolute: filePath,
      });
    }
  });

  return fileList;
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const force = args.includes('--force') || args.includes('-f');

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

  // Find missing pages
  const missingPages = allMdxFiles.filter((file) => {
    const normalized = file.relative.replace(/\\/g, '/').replace(/\.mdx$/, '');
    return !normalizedReferenced.has(normalized);
  });

  // Sort for consistent output
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

  // Show files to be deleted
  console.log('Files to be deleted:\n');
  missingPages.forEach((file) => {
    console.log(`  - ${file.relative}`);
  });

  if (!force) {
    console.log(`\n⚠️  This will delete ${missingPages.length} files!`);
    console.log('💡 Use --force or -f flag to skip this confirmation.\n');
    return;
  }

  // Delete files
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

