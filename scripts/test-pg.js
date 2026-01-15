
try {
    require('pg');
    console.log('PG module loaded successfully');
} catch (e) {
    console.error('Failed to load PG:', e);
}
