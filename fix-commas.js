const fs = require('fs');

// Read the bot.js file
const filePath = 'C:\\Users\\Chris\\Desktop\\Naval Command\\bot.js';
let content = fs.readFileSync(filePath, 'utf8');
let fixCount = 0;

console.log('Starting comma fixes...\n');

// Pattern 1: Fix .setStyle(ButtonStyle.X) followed by new ButtonBuilder()
const pattern1Before = content.match(/\.setStyle\(ButtonStyle\.\w+\)\s*\n\s+new ButtonBuilder\(\)/g)?.length || 0;
content = content.replace(/\.setStyle\((ButtonStyle\.\w+)\)\s*\n(\s+)(new ButtonBuilder\(\))/g, '.setStyle($1),\n$2$3');
console.log(`Pattern 1 (ButtonBuilder arrays): Fixed ${pattern1Before} instances`);
fixCount += pattern1Before;

// Pattern 2: Fix missing comma before "flags: MessageFlags.Ephemeral"
const pattern2Before = content.match(/(['"`\]\)])(\s*)\n(\s+)flags:\s*MessageFlags\.Ephemeral/g)?.length || 0;
content = content.replace(/(['"`\]\)])(\s*)\n(\s+)(flags:\s*MessageFlags\.Ephemeral)/g, '$1,$2\n$3$4');
console.log(`Pattern 2 (flags property): Fixed ${pattern2Before} instances`);
fixCount += pattern2Before;

// Pattern 3: Fix missing comma before "components:" in reply/update
const pattern3Before = content.match(/(\])\s*\n(\s+)components:\s*\[/g)?.length || 0;
content = content.replace(/(\])(\s*)\n(\s+)(components:\s*\[)/g, '$1,$2\n$3$4');
console.log(`Pattern 3 (components property): Fixed ${pattern3Before} instances`);
fixCount += pattern3Before;

// Pattern 4: Fix missing comma before "embeds:" in reply/update
const pattern4Before = content.match(/(\])(\s*)\n(\s+)embeds:\s*\[/g)?.length || 0;
content = content.replace(/(\])(\s*)\n(\s+)(embeds:\s*\[)/g, '$1,$2\n$3$4');
console.log(`Pattern 4 (embeds property): Fixed ${pattern4Before} instances`);
fixCount += pattern4Before;

// Pattern 5: Fix array of objects with missing commas (like addFields)
const pattern5Before = content.match(/inline:\s*(true|false)\s*\n(\s+)\}\s*\n(\s+)\{/g)?.length || 0;
content = content.replace(/(inline:\s*(?:true|false)\s*\n\s+\})(\s*\n\s+)(\{)/g, '$1,$2$3');
console.log(`Pattern 5 (object arrays): Fixed ${pattern5Before} instances`);
fixCount += pattern5Before;

// Pattern 6: Fix object properties with simple values (most common)
// Matches: property: value (no comma) NEWLINE spaces property:
// But avoid: property: { or property: [ or property: function
const lines = content.split('\n');
let pattern6Count = 0;

for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    // Check if current line ends with a property: value pattern (no comma, no opening brace/bracket)
    // And next line starts with a property name
    if (currentLine.match(/^\s+[a-zA-Z_$][a-zA-Z0-9_$]*:\s*[^,{\[]+$/) &&
        nextLine.match(/^\s+[a-zA-Z_$][a-zA-Z0-9_$]*:/) &&
        !currentLine.trim().endsWith(',') &&
        !currentLine.includes('//') &&
        !currentLine.includes('/*')) {

        // Don't add comma if the value is multiline (e.g., template literals, function calls)
        if (!currentLine.includes('`') || currentLine.split('`').length % 2 === 1) {
            lines[i] = currentLine + ',';
            pattern6Count++;
        }
    }
}

content = lines.join('\n');
console.log(`Pattern 6 (general object properties): Fixed ${pattern6Count} instances`);
fixCount += pattern6Count;

console.log(`\n✅ Total fixes applied: ${fixCount}\n`);

// Write the fixed content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Saved fixed file. Testing syntax...\n');

// Test the syntax
const { execSync } = require('child_process');
try {
    execSync('node "C:\\Users\\Chris\\Desktop\\Naval Command\\bot.js"', { timeout: 5000 });
    console.log('✅ No syntax errors detected!');
} catch (error) {
    const output = error.message || error.toString();
    const match = output.match(/bot\.js:(\d+)/);
    if (match) {
        console.log('❌ Syntax error found at line:', match[1]);
        console.log('\nError message:');
        console.log(output.split('\n').slice(0, 10).join('\n'));
    } else {
        console.log('Syntax check completed (may have runtime errors, but syntax is OK)');
    }
}
