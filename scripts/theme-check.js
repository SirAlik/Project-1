#!/usr/bin/env node
/**
 * Theme Check Script
 * Scans for prohibited hardcoded Tailwind colors in source files.
 * Run with: npm run theme:check
 */

const fs = require('fs');
const path = require('path');

// Prohibited color patterns (Tailwind raw colors that should be tokens)
const PROHIBITED_PATTERNS = [
    // Text colors
    /text-(emerald|rose|amber|orange|red|green|blue|purple|violet|indigo|cyan|teal|lime|yellow|pink|fuchsia|sky|slate|gray|zinc|neutral|stone)-\d{2,3}/g,
    // Background colors
    /bg-(emerald|rose|amber|orange|red|green|blue|purple|violet|indigo|cyan|teal|lime|yellow|pink|fuchsia|sky|slate|gray|zinc|neutral|stone)-\d{2,3}/g,
    // Border colors
    /border-(emerald|rose|amber|orange|red|green|blue|purple|violet|indigo|cyan|teal|lime|yellow|pink|fuchsia|sky|slate|gray|zinc|neutral|stone)-\d{2,3}/g,
    // Ring colors
    /ring-(emerald|rose|amber|orange|red|green|blue|purple|violet|indigo|cyan|teal|lime|yellow|pink|fuchsia|sky|slate|gray|zinc|neutral|stone)-\d{2,3}/g,
    // Shadow colors
    /shadow-(emerald|rose|amber|orange|red|green|blue|purple|violet|indigo|cyan|teal|lime|yellow|pink|fuchsia|sky|slate|gray|zinc|neutral|stone)-\d{2,3}/g,
    // Divide colors
    /divide-(emerald|rose|amber|orange|red|green|blue|purple|violet|indigo|cyan|teal|lime|yellow|pink|fuchsia|sky|slate|gray|zinc|neutral|stone)-\d{2,3}/g,
];

// Excluded paths
const EXCLUDED_PATHS = [
    'node_modules',
    '.next',
    '.git',
    'scripts/theme-check.js', // This file
    'globals.css', // Token definitions allowed
    'app/legacy-landing', // Backup files excluded
];

// File extensions to scan
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

function findFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(process.cwd(), fullPath);

        // Skip excluded paths
        if (EXCLUDED_PATHS.some(exc => relativePath.includes(exc))) {
            continue;
        }

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            findFiles(fullPath, files);
        } else if (EXTENSIONS.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
        }
    }

    return files;
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        for (const pattern of PROHIBITED_PATTERNS) {
            // Reset regex lastIndex
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(line)) !== null) {
                violations.push({
                    file: filePath,
                    line: index + 1,
                    match: match[0],
                    context: line.trim().substring(0, 100)
                });
            }
        }
    });

    return violations;
}

function main() {
    console.log('🎨 Theme Check - Scanning for prohibited colors...\n');

    const rootDir = process.cwd();
    const files = findFiles(path.join(rootDir, 'app'))
        .concat(findFiles(path.join(rootDir, 'components')));

    console.log(`📁 Scanning ${files.length} files...\n`);

    let allViolations = [];

    for (const file of files) {
        const violations = scanFile(file);
        allViolations = allViolations.concat(violations);
    }

    if (allViolations.length === 0) {
        console.log('✅ No prohibited colors found! Theme compliance: PASSED\n');
        process.exit(0);
    } else {
        console.log(`❌ Found ${allViolations.length} violations:\n`);

        // Group by file
        const byFile = {};
        for (const v of allViolations) {
            if (!byFile[v.file]) byFile[v.file] = [];
            byFile[v.file].push(v);
        }

        for (const [file, violations] of Object.entries(byFile)) {
            const relativePath = path.relative(rootDir, file);
            console.log(`📄 ${relativePath} (${violations.length} violations)`);
            for (const v of violations.slice(0, 5)) { // Show max 5 per file
                console.log(`   Line ${v.line}: ${v.match}`);
            }
            if (violations.length > 5) {
                console.log(`   ... and ${violations.length - 5} more`);
            }
            console.log('');
        }

        console.log('\n📋 Token Mapping Guide:');
        console.log('   emerald-* → text-success / bg-success');
        console.log('   rose-* → text-destructive / bg-destructive');
        console.log('   amber-* → text-warning / bg-warning');
        console.log('   blue-* → text-info / bg-info OR text-primary');
        console.log('   purple/violet-* → text-accent / bg-accent');
        console.log('   zinc/gray/slate-* → text-muted-foreground / bg-muted / bg-card');
        console.log('');

        process.exit(1);
    }
}

main();
