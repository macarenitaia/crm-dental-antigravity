
const http = require('http');

const data = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
        {
            id: "123456789",
            changes: [
                {
                    value: {
                        messaging_product: "whatsapp",
                        metadata: { display_phone_number: "123456789", phone_number_id: "123456789" },
                        contacts: [{ profile: { name: "Juan Perez" }, wa_id: "34600999999" }],
                        messages: [
                            {
                                from: "34600999999",
                                id: "wamid.HBgLM...",
                                timestamp: Date.now().toString(),
                                text: { body: "Quiero agendar una cita para mañana a las 10:00" }, // Trigger Booking
                                type: "text"
                            }
                        ]
                    },
                    field: "messages"
                }
            ]
        }
    ]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

console.log("📨 Enviando solicitud de CITA a la IA...");

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    res.on('data', (d) => {
        process.stdout.write(d);
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log("\n✅ ÉXITO: Mensaje enviado.");
            console.log("👉 Mira tu consola del servidor para ver si la IA responde y AGENDA la cita.");
            console.log("👉 SI funciona, 'Juan Perez' aparecerá en la lista de Clientes (pestaña Clients) en unos segundos.");
        } else {
            console.log("\n❌ ERROR: El servidor rechazó la petición.");
        }
    });
});

req.on('error', (error) => {
    console.error("❌ ERROR DE CONEXIÓN:", error.message);
    console.log("💡 Sugerencia: Asegúrate de que tu servidor Next.js está corriendo en el puerto 3000 (`npm run dev`).");
});

req.write(data);
req.end();
