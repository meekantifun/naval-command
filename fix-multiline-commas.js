const fs = require('fs');

// Read the bot.js file
const filePath = 'C:\\Users\\Chris\\Desktop\\Naval Command\\bot.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing missing commas after template literals before components/embeds...\n');

// Pattern 1: template literal ending (`) followed by newline and spaces and components:
// Must be missing the comma
let fixCount = 0;

content = content.replace(/(`)\s*\n(\s+)(components:|embeds:)/g, (match, backtick, spaces, property) => {
    fixCount++;
    return `\`,\n${spaces}${property}`;
});

console.log(`✅ Fixed ${fixCount} instances of missing commas after template literals\n`);

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
