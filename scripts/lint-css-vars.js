const fs = require('fs');
const path = require('path');

// Configuration
const CSS_DIR = path.join(__dirname, '../app');
const CSS_FILES = ['globals.css']; // Add other CSS files if needed

let hasError = false;

console.log('🔍 Scanning CSS files for self-referencing variables...');

CSS_FILES.forEach(file => {
    const filePath = path.join(CSS_DIR, file);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        // Regex to find --variable: var(--variable)
        // Captures the variable name in group 1 and checks if it repeats inside var()
        const regex = /--([a-zA-Z0-9-]+):\s*var\(--\1\)/;
        const match = line.match(regex);

        if (match) {
            console.error(`\n❌ CRITICAL ERROR in ${file}:${index + 1}`);
            console.error(`   Found self-referencing CSS variable: --${match[1]}`);
            console.error(`   Line: ${line.trim()}`);
            console.error(`   Violation of Typography Contract. Self-reference causes font failure.`);
            hasError = true;
        }
    });
});

if (hasError) {
    console.error('\n💥 VALIDATION FAILED. Fix CSS variable references before committing.');
    process.exit(1);
} else {
    console.log('✅ CSS Variable Contract: PASSED');
    process.exit(0);
}
