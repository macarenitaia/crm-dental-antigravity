
function toMadridDate(dateStr) {
    const cleanDate = dateStr.replace('Z', '');
    const offset = '+01:00';
    return new Date(`${cleanDate}${offset}`);
}

console.log("--- TIME DEBUG ---");
const input = "2025-12-23T09:00:00";
console.log(`Input: ${input}`);

const d = toMadridDate(input);
console.log(`Converted Object: ${d.toString()}`);
console.log(`ISO (UTC): ${d.toISOString()}`);
console.log(`Local Hours (Node System): ${d.getHours()}`);

// Check current system time
console.log(`System Now: ${new Date().toString()}`);

// Simulate standard ISO
const isoInput = "2025-12-23T09:00:00.000Z";
const d2 = toMadridDate(isoInput);
console.log(`\nInput with Z: ${isoInput}`);
console.log(`Converted (Z stripped): ${d2.toISOString()}`);
