const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../');
const localesDir = path.resolve(__dirname, 'locales');
const enPath = path.join(localesDir, 'en.json');
const esPath = path.join(localesDir, 'es.json');

function flattenKeys(obj, prefix = '') {
  let keys = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(keys, flattenKeys(obj[key], fullKey));
    } else {
      keys[fullKey] = obj[key];
    }
  }
  return keys;
}

function getAllSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.expo' || file === 'dist' || file === '.git') {
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllSourceFiles(fullPath, fileList);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file) && !file.endsWith('.d.ts') && !file.includes('validate-i18n')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function findTCallsInFiles(files) {
  const tCallRegex = /\bt\(\s*['"`]([a-zA-Z0-9_.-]+)['"`]/g;
  const usages = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;
      while ((match = tCallRegex.exec(line)) !== null) {
        usages.push({
          key: match[1],
          file: path.relative(rootDir, file),
          line: i + 1,
        });
      }
    }
  }
  return usages;
}

function findDynamicNamespaces(files) {
  const dynamicTRegex = /\bt\(\s*`([a-zA-Z0-9_.-]+)\.\${/g;
  const namespaces = new Set();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = dynamicTRegex.exec(content)) !== null) {
      namespaces.add(match[1]);
    }
  }
  return namespaces;
}

function findAnyKeyMentions(files, allKeys) {
  const mentionedKeys = new Set();
  const fileContents = files.map(f => fs.readFileSync(f, 'utf8'));

  for (const key of allKeys) {
    // Check if the exact key string appears in any source file
    const keyRegex = new RegExp(`['"\`]${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
    for (const content of fileContents) {
      if (keyRegex.test(content)) {
        mentionedKeys.add(key);
        break;
      }
    }
  }
  return mentionedKeys;
}

function main() {
  const args = process.argv.slice(2);
  const failOnUnused = args.includes('--fail-on-unused');

  console.log('🔍 Running i18n Translation Validator...\n');

  if (!fs.existsSync(enPath) || !fs.existsSync(esPath)) {
    console.error('❌ Error: Locale files not found in ' + localesDir);
    process.exit(1);
  }

  let enData, esData;
  try {
    enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  } catch (err) {
    console.error('❌ Error parsing en.json:', err.message);
    process.exit(1);
  }

  try {
    esData = JSON.parse(fs.readFileSync(esPath, 'utf8'));
  } catch (err) {
    console.error('❌ Error parsing es.json:', err.message);
    process.exit(1);
  }

  const enFlat = flattenKeys(enData);
  const esFlat = flattenKeys(esData);

  const enKeys = new Set(Object.keys(enFlat));
  const esKeys = new Set(Object.keys(esFlat));

  let hasError = false;

  // 1. Check EN keys missing in ES
  const missingInEs = [...enKeys].filter(k => !esKeys.has(k));
  if (missingInEs.length > 0) {
    hasError = true;
    console.error(`❌ ${missingInEs.length} keys defined in en.json are missing in es.json:`);
    missingInEs.forEach(k => console.error(`   - ${k}`));
    console.error('');
  }

  // 2. Check ES keys missing in EN
  const missingInEn = [...esKeys].filter(k => !enKeys.has(k));
  if (missingInEn.length > 0) {
    hasError = true;
    console.error(`❌ ${missingInEn.length} keys defined in es.json are missing in en.json:`);
    missingInEn.forEach(k => console.error(`   - ${k}`));
    console.error('');
  }

  // 3. Check for empty strings in translations
  const emptyInEn = Object.entries(enFlat).filter(([k, v]) => typeof v === 'string' && v.trim() === '');
  if (emptyInEn.length > 0) {
    hasError = true;
    console.error(`❌ ${emptyInEn.length} empty translation values found in en.json:`);
    emptyInEn.forEach(([k]) => console.error(`   - ${k}`));
    console.error('');
  }

  const emptyInEs = Object.entries(esFlat).filter(([k, v]) => typeof v === 'string' && v.trim() === '');
  if (emptyInEs.length > 0) {
    hasError = true;
    console.error(`❌ ${emptyInEs.length} empty translation values found in es.json:`);
    emptyInEs.forEach(([k]) => console.error(`   - ${k}`));
    console.error('');
  }

  // 4. Scan codebase for t('...') calls
  const searchDirs = [
    path.resolve(__dirname, '../'),
    path.resolve(rootDir, 'apps/next/app'),
    path.resolve(rootDir, 'apps/next/pages'),
    path.resolve(rootDir, 'apps/expo'),
  ];

  let allFiles = [];
  searchDirs.forEach(dir => {
    allFiles = allFiles.concat(getAllSourceFiles(dir));
  });

  const usages = findTCallsInFiles(allFiles);
  console.log(`Found ${usages.length} static t('...') calls across ${allFiles.length} source files.`);

  // Find t() usages that do not exist in en.json or es.json
  const missingCodeKeys = [];
  for (const usage of usages) {
    const inEn = enKeys.has(usage.key);
    const inEs = esKeys.has(usage.key);
    if (!inEn || !inEs) {
      missingCodeKeys.push({
        ...usage,
        missingInEn: !inEn,
        missingInEs: !inEs,
      });
    }
  }

  if (missingCodeKeys.length > 0) {
    hasError = true;
    console.error(`\n❌ Found ${missingCodeKeys.length} t('...') calls referencing undefined keys in locale files:`);
    missingCodeKeys.forEach(u => {
      const missingWhere = u.missingInEn && u.missingInEs ? 'both en.json and es.json' : u.missingInEn ? 'en.json' : 'es.json';
      console.error(`   - "${u.key}" at ${u.file}:${u.line} (missing in ${missingWhere})`);
    });
    console.error('');
  }

  // 5. Check for extraneous / unused keys
  const dynamicNamespaces = findDynamicNamespaces(allFiles);
  const mentionedKeys = findAnyKeyMentions(allFiles, enKeys);
  const unusedKeys = [...enKeys].filter(k => {
    if (mentionedKeys.has(k)) return false;
    const prefix = k.split('.')[0];
    if (dynamicNamespaces.has(prefix)) return false;
    return true;
  });

  if (unusedKeys.length > 0) {
    console.warn(`⚠️  Found ${unusedKeys.length} extraneous / unused keys in locale files:`);
    unusedKeys.forEach(k => console.warn(`   - ${k}`));
    console.warn('');
    if (failOnUnused) {
      hasError = true;
    }
  }

  if (hasError) {
    console.error('🚫 i18n Validation FAILED. Please resolve the missing/mismatched translations above.\n');
    process.exit(1);
  } else {
    console.log(`✅ All ${enKeys.size} translation keys are synchronized and verified!\n`);
    process.exit(0);
  }
}

main();
