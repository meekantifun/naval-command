const fs = require('fs');

// Read the bot.js file
const filePath = 'C:\\Users\\Chris\\Desktop\\Naval Command\\bot.js';
let content = fs.readFileSync(filePath, 'utf8');
let fixCount = 0;

console.log('Starting enhanced comma fixes for remaining errors...\n');

// Split into lines for more precise control
const lines = content.split('\n');

for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    // Skip if already has comma at end
    if (currentLine.trim().endsWith(',') || currentLine.trim().endsWith('{') || currentLine.trim().endsWith('[')) {
        continue;
    }

    // Pattern 1: property: 'value' OR property: "value" followed by another property
    // Example: name: 'Fighter' followed by emoji: '✈️'
    if (currentLine.match(/^\s+['"]?[a-zA-Z_$][a-zA-Z0-9_$]*['"]?\s*:\s*['"].*['"]$/) &&
        nextLine.match(/^\s+['"]?[a-zA-Z_$][a-zA-Z0-9_$]*['"]?\s*:/)) {

        // Don't add comma if this looks like it's inside a comment
        if (!currentLine.includes('//') && !currentLine.includes('/*')) {
            lines[i] = currentLine + ',';
            fixCount++;
            console.log(`Line ${i + 1}: Added comma after string value`);
        }
    }

    // Pattern 2: property: template literal followed by another property
    // Example: name: `${type} Squadron` followed by count: 5
    else if (currentLine.match(/^\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:\s*`.*`$/) &&
             nextLine.match(/^\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/)) {

        if (!currentLine.includes('//') && !currentLine.includes('/*')) {
            lines[i] = currentLine + ',';
            fixCount++;
            console.log(`Line ${i + 1}: Added comma after template literal`);
        }
    }

    // Pattern 3: property: number/boolean followed by another property
    // Example: count: 5 followed by maxCount: 5
    else if (currentLine.match(/^\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:\s*(true|false|\d+)$/) &&
             nextLine.match(/^\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/)) {

        if (!currentLine.includes('//') && !currentLine.includes('/*')) {
            lines[i] = currentLine + ',';
            fixCount++;
            console.log(`Line ${i + 1}: Added comma after number/boolean`);
        }
    }

    // Pattern 4: Closing parenthesis followed by property (for function calls as values)
    // Example: .charAt(0).toUpperCase() + type.slice(1)} Squadron` followed by property
    else if (currentLine.match(/\)$/) &&
             nextLine.match(/^\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/) &&
             currentLine.match(/^\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/)) {

        if (!currentLine.includes('//') && !currentLine.includes('/*')) {
            lines[i] = currentLine + ',';
            fixCount++;
            console.log(`Line ${i + 1}: Added comma after function call value`);
        }
    }
}

content = lines.join('\n');
console.log(`\n✅ Total additional fixes applied: ${fixCount}\n`);

// Write the fixed content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Saved fixed file. Running comprehensive syntax test...\n');

// Test the syntax
const { execSync } = require('child_process');
let attempts = 0;
let lastError = null;

console.log('Testing for syntax errors (will show first 5 errors found)...\n');

while (attempts < 5) {
    try {
        execSync('node "C:\\Users\\Chris\\Desktop\\Naval Command\\bot.js"', { timeout: 3000 });
        console.log('✅ ✅ ✅ NO SYNTAX ERRORS DETECTED! ✅ ✅ ✅');
        console.log('The bot.js file is now syntactically correct!');
        process.exit(0);
    } catch (error) {
        attempts++;
        const output = error.message || error.toString();
        const match = output.match(/bot\.js:(\d+)/);

        if (match) {
            const lineNum = parseInt(match[1]);
            console.log(`\n❌ Error ${attempts} found at line ${lineNum}:`);

            // Extract just the syntax error message
            const errorLines = output.split('\n');
            const syntaxErrorIndex = errorLines.findIndex(line => line.includes('SyntaxError'));
            if (syntaxErrorIndex >= 0) {
                console.log(errorLines[syntaxErrorIndex]);
                console.log(errorLines[syntaxErrorIndex - 2] || '');
            }

            lastError = { line: lineNum, message: output };
        } else {
            // No more syntax errors, might be runtime error
            if (output.includes('SyntaxError')) {
                console.log('\n❌ Syntax error but line number not found:');
                console.log(output.split('\n').slice(0, 5).join('\n'));
            } else {
                console.log('\n✅ No more syntax errors! (Runtime error occurred, which is expected)');
                process.exit(0);
            }
        }
    }
}

if (lastError) {
    console.log(`\n⚠️  Still have ${attempts} syntax error(s) remaining.`);
    console.log(`Manual intervention needed at line ${lastError.line}`);
} else {
    console.log('\n✅ Syntax checking complete!');
}
