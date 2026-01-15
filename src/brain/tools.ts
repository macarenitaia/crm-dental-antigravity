import { ChatCompletionTool } from "openai/resources/chat/completions";

export const crmTools: ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "check_calendar_availability",
            description: "Checks for available appointment slots for a given date. Use this before booking to ensure the slot is free.",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "Date in YYYY-MM-DD format to check availability for."
                    },
                    clinicId: {
                        type: "string",
                        description: "The ID of the clinic to check availability for."
                    }
                },
                required: ["date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "book_appointment",
            description: "Books a new appointment for the client. ONLY use this if the user has explicitly confirmed the time and reason.",
            parameters: {
                type: "object",
                properties: {
                    start_time: {
                        type: "string",
                        description: "ISO 8601 string for the appointment start time (e.g. 2023-10-27T10:00:00.000Z)"
                    },
                    reason: {
                        type: "string",
                        description: "Reason for the appointment (e.g. 'Limpieza', 'Consulta', 'Dolor de muelas')"
                    },
                    clinicId: {
                        type: "string",
                        description: "The ID of the clinic. REQUIRED if the user specified a location."
                    }
                },
                required: ["start_time", "reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_knowledge_base",
            description: "Searches the dental clinic's knowledge base for prices, treatments, and general info.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query (e.g. 'precio implante', 'duracion ortodoncia')"
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "cancel_appointment",
            description: "Cancels an existing appointment. Use this when a user wants to cancel or reschedule (cancel + book new).",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "The date of the appointment to cancel (YYYY-MM-DD)"
                    },
                    time: {
                        type: "string",
                        description: "Approximate time of the appointment to cancel (e.g. '17:00')"
                    }
                },
                required: ["date"]
            }
        }
    }
];
