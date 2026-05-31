import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const UI_DIRS = ['app', 'components'];

const HEX_REGEX = /#[0-9a-fA-F]{3,6}/g;
const IGNORE_FILES = ['app/globals.css', 'app/student/metaverse/layout.tsx']; // Base layout/styles allowed some for background

let violations = 0;

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(HEX_REGEX);

    if (matches) {
        matches.forEach(match => {
            // Check if it's inside a template/JSX and not a CSS variable definition
            console.log(`[VIOLATION] ${match} found in ${path.relative(ROOT, filePath)}`);
            violations++;
        });
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');

        if (IGNORE_FILES.includes(relPath)) return;

        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                traverse(fullPath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            checkFile(fullPath);
        }
    });
}

console.log('--- SENTINEL HEX CHECKER ---');
UI_DIRS.forEach(dir => traverse(path.join(ROOT, dir)));
console.log(`\nTOTAL VIOLATIONS: ${violations}`);

if (violations > 0) {
    console.log('\n[!] Hardcoded hex codes detected. Please use CSS variables (tokens).');
    // process.exit(1); // Enable to fail build
} else {
    console.log('\n[PASS] No hardcoded hex codes found.');
}
