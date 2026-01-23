import { ChatCompletionTool } from "openai/resources/chat/completions";

export const crmTools: ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "check_calendar_availability",
            description: "Checks if a specific time slot is available on a given date. Returns all available slots for that day. IMPORTANT: If user requested a specific time (e.g. 12:00), check if it's in the returned slots. Only offer alternatives if their requested time is busy.",
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
                    },
                    full_name: {
                        type: "string",
                        description: "The client's full name (first and last name)."
                    },
                    email: {
                        type: "string",
                        description: "The client's email address."
                    }
                },
                required: ["start_time", "reason", "full_name", "email"]
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
    },
    {
        type: "function",
        function: {
            name: "reschedule_appointment",
            description: "Reschedules an existing appointment to a new date/time. Use this when a user wants to CHANGE their existing appointment to a different time. This updates the existing appointment instead of creating a new one.",
            parameters: {
                type: "object",
                properties: {
                    original_date: {
                        type: "string",
                        description: "The date of the CURRENT appointment to reschedule (YYYY-MM-DD)"
                    },
                    new_start_time: {
                        type: "string",
                        description: "ISO 8601 string for the NEW appointment start time (e.g. 2023-10-27T10:00:00.000Z)"
                    },
                    clinicId: {
                        type: "string",
                        description: "Optional: The ID of the clinic if changing location"
                    }
                },
                required: ["original_date", "new_start_time"]
            }
        }
    }
];
