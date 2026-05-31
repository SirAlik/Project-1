const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const extensions = ['.tsx', '.ts', '.js', '.jsx', '.css'];
const ignoreDirs = ['node_modules', '.next', '.git', '.gemini', '.idea', '.vscode'];

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (!ignoreDirs.includes(file)) {
                    getAllFiles(filePath, fileList);
                }
            } else {
                if (extensions.includes(path.extname(file))) {
                    fileList.push(filePath);
                }
            }
        } catch {
            // ignore errors
        }
    });
    return fileList;
}

const files = getAllFiles(rootDir);
let modifiedFiles = [];

const replacements = [
    // Mandatory Replacements (Priority)
    { regex: /bg-amber-600/g, replacement: 'bg-[hsl(var(--gold))]' },
    { regex: /hover:bg-amber-700/g, replacement: 'hover:bg-[hsl(var(--gold-strong))]' },
    { regex: /text-amber-600/g, replacement: 'text-[hsl(var(--gold))]' },
    { regex: /text-amber-700/g, replacement: 'text-[hsl(var(--gold-strong))]' },
    { regex: /border-amber-200/g, replacement: 'border-[hsla(var(--gold),.35)]' },
    { regex: /border-amber-300/g, replacement: 'border-[hsla(var(--gold),.45)]' },
    { regex: /bg-amber-50/g, replacement: 'bg-[hsla(var(--gold),.08)]' },

    { regex: /bg-orange-600/g, replacement: 'bg-[hsl(var(--gold))]' },
    { regex: /hover:bg-orange-700/g, replacement: 'hover:bg-[hsl(var(--gold-strong))]' },
    { regex: /text-orange-600/g, replacement: 'text-[hsl(var(--gold))]' },
    { regex: /text-orange-700/g, replacement: 'text-[hsl(var(--gold-strong))]' },
    { regex: /border-orange-200/g, replacement: 'border-[hsla(var(--gold),.35)]' },
    { regex: /border-orange-300/g, replacement: 'border-[hsla(var(--gold),.45)]' },
    { regex: /bg-orange-50/g, replacement: 'bg-[hsla(var(--gold),.08)]' },

    // Shadows
    { regex: /shadow-amber-[a-zA-Z0-9]+/g, replacement: 'shadow-[hsla(var(--gold),.25)]' },
    { regex: /shadow-orange-[a-zA-Z0-9]+/g, replacement: 'shadow-[hsla(var(--gold),.25)]' },

    // Fallbacks for remaining ambers
    { regex: /bg-amber-500/g, replacement: 'bg-[hsl(var(--gold))]' },
    { regex: /bg-amber-[1-4][0-9]{2}/g, replacement: 'bg-[hsla(var(--gold),.15)]' }, // lighter bgs
    { regex: /bg-amber-(?:800|900|950)/g, replacement: 'bg-[hsl(var(--gold-strong))]' },

    { regex: /text-amber-500/g, replacement: 'text-[hsl(var(--gold))]' },
    { regex: /text-amber-[1-4][0-9]{2}/g, replacement: 'text-[hsl(var(--gold))]' }, // questionable but mapping to gold
    { regex: /text-amber-(?:800|900|950)/g, replacement: 'text-[hsl(var(--gold-strong))]' },

    { regex: /border-amber-500/g, replacement: 'border-[hsl(var(--gold))]' },
    { regex: /border-amber-[1-4][0-9]{2}/g, replacement: 'border-[hsla(var(--gold),.45)]' },
    { regex: /border-amber-(?:800|900|950)/g, replacement: 'border-[hsl(var(--gold-strong))]' },

    // Fallbacks for remaining oranges
    { regex: /bg-orange-500/g, replacement: 'bg-[hsl(var(--gold))]' },
    { regex: /bg-orange-[1-4][0-9]{2}/g, replacement: 'bg-[hsla(var(--gold),.15)]' },
    { regex: /bg-orange-(?:800|900|950)/g, replacement: 'bg-[hsl(var(--gold-strong))]' },

    { regex: /text-orange-500/g, replacement: 'text-[hsl(var(--gold))]' },
    { regex: /text-orange-[1-4][0-9]{2}/g, replacement: 'text-[hsl(var(--gold))]' },
    { regex: /text-orange-(?:800|900|950)/g, replacement: 'text-[hsl(var(--gold-strong))]' },

    { regex: /border-orange-500/g, replacement: 'border-[hsl(var(--gold))]' },
    { regex: /border-orange-[1-4][0-9]{2}/g, replacement: 'border-[hsla(var(--gold),.45)]' },
    { regex: /border-orange-(?:800|900|950)/g, replacement: 'border-[hsl(var(--gold-strong))]' },

    // Generic Catch-all (Dangerous but requested: "ensure no amber/orange remaining")
    // We'll be careful with this one. Maybe just log if we missed any.
];

// Special replacements for gradients or others?
// from-[amber/orange]-* -> from-[hsl(var(--gold))]
// to-[amber/orange]-* -> to-[hsl(var(--gold))]
// via-[amber/orange]-* -> via-[hsl(var(--gold))]
// ring-amber-* -> ring-[hsl(var(--gold))]

const extraReplacements = [
    { regex: /(from|to|via|ring|outline|decoration|divide)-amber-[0-9]+/g, replacement: '$1-[hsl(var(--gold))]' },
    { regex: /(from|to|via|ring|outline|decoration|divide)-orange-[0-9]+/g, replacement: '$1-[hsl(var(--gold))]' },
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    replacements.forEach(rule => {
        content = content.replace(rule.regex, rule.replacement);
    });

    extraReplacements.forEach(rule => {
        content = content.replace(rule.regex, rule.replacement);
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedFiles.push(path.relative(rootDir, file));
    }
});

console.log(JSON.stringify(modifiedFiles));
