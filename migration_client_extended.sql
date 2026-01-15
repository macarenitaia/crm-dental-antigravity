-- Add new columns to clients table for extended data
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dni TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS clinical_history TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add sample data for a few clients
UPDATE clients SET 
    dni = '12345678A',
    address = 'Carrer de Balmes, 123, Barcelona',
    clinical_history = 'Sin alergias conocidas. Buena salud general.',
    notes = 'Paciente puntual y colaborador'
WHERE name = 'Carla Martí';
