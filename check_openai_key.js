
require('dotenv').config({ path: '.env.local' });
if (process.env.OPENAI_API_KEY) {
    console.log("OPENAI_KEY_PRESENT");
} else {
    console.log("OPENAI_KEY_MISSING");
}
