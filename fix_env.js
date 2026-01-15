
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const key = "OPENAI_API_KEY=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";

try {
    let content = "";
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }

    // Ensure newline
    if (!content.endsWith('\n')) {
        content += '\n';
    }

    if (!content.includes('OPENAI_API_KEY=')) {
        content += key + '\n';
        fs.writeFileSync(envPath, content);
        console.log("Appended key to .env.local");
    } else {
        console.log("Key already present (maybe check formatting?)");
        // Force replace to be sure
        const lines = content.split('\n').filter(l => !l.startsWith('OPENAI_API_KEY='));
        lines.push(key);
        fs.writeFileSync(envPath, lines.join('\n') + '\n');
        console.log("Replaced key in .env.local");
    }
} catch (e) {
    console.error("Error updating .env.local", e);
}
