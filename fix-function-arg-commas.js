const fs = require('fs');

// Read the bot.js file
const filePath = 'C:\\Users\\Chris\\Desktop\\Naval Command\\bot.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing missing commas in multiline function arguments...\n');

const lines = content.split('\n');
let fixCount = 0;

// Look for patterns like:
//     functionCall(
//         arg1
//         arg2  <- missing comma here
//         arg3
//     )

for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    // Skip if current line already has comma, opening brace, or opening bracket
    if (currentLine.trim().endsWith(',') ||
        currentLine.trim().endsWith('{') ||
        currentLine.trim().endsWith('[') ||
        currentLine.trim().endsWith('(')) {
        continue;
    }

    // Check if current line looks like a function argument (indented identifier or template literal or string)
    // And next line also looks like a function argument or closing paren
    const argPattern = /^\s+([\w.]+|`[^`]+`|'[^']+'|"[^"]+")\s*$/;
    const nextArgPattern = /^\s+([\w.]+|`|'|"|[)])/;

    if (argPattern.test(currentLine) && nextArgPattern.test(nextLine)) {
        // Check if this looks like it's inside a function call
        // Look backwards for an opening paren
        let foundOpenParen = false;
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
            if (lines[j].includes('(') && !lines[j].includes(')')) {
                foundOpenParen = true;
                break;
            }
            if (lines[j].includes(')')) {
                break;
            }
        }

        if (foundOpenParen && !currentLine.includes('//')) {
            lines[i] = currentLine + ',';
            fixCount++;
            console.log(`Line ${i + 1}: Added comma after function argument`);
        }
    }
}

content = lines.join('\n');
console.log(`\n✅ Total fixes applied: ${fixCount}\n`);

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
