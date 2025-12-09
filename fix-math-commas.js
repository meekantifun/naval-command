const fs = require('fs');

// Read the bot.js file
const filePath = 'C:\\Users\\Chris\\Desktop\\Naval Command\\bot.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing missing commas in Math.min/Math.max function calls...\n');

// Pattern: Math.min(99 followed by newline (missing comma)
// Replace with Math.min(99,
let fixCount = 0;

content = content.replace(/Math\.min\((\d+)\s*\n/g, (match, num) => {
    fixCount++;
    return `Math.min(${num},\n`;
});

console.log(`✅ Fixed ${fixCount} instances of missing commas in Math.min calls\n`);

// Write the fixed content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Testing syntax...\n');

// Test the syntax
const { execSync } = require('child_process');
try {
    execSync('node "C:\\Users\\Chris\\Desktop\\Naval Command\\bot.js"', { timeout: 5000 });
    console.log('✅ ✅ ✅ NO SYNTAX ERRORS! ✅ ✅ ✅');
} catch (error) {
    const output = error.message || error.toString();
    const match = output.match(/bot\.js:(\d+)/);

    if (match) {
        console.log(`⚠️  Syntax error still found at line ${match[1]}`);
        const errorLines = output.split('\n');
        const syntaxErrorIndex = errorLines.findIndex(line => line.includes('SyntaxError'));
        if (syntaxErrorIndex >= 0) {
            console.log(errorLines[syntaxErrorIndex - 2] || '');
            console.log(errorLines[syntaxErrorIndex] || '');
        }
    } else if (!output.includes('SyntaxError')) {
        console.log('✅ No syntax errors! (Runtime error is normal)');
    } else {
        console.log('Error checking syntax:');
        console.log(output.split('\n').slice(0, 5).join('\n'));
    }
}
