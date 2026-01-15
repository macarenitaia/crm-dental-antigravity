"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import ClientProfile from "@/components/ClientProfile";
import { Client } from "@/types";

function ChatContent() {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const chatWithId = searchParams.get('chat_with');
        if (chatWithId) {
            const fetchClientToChat = async () => {
                const { data } = await supabase.from('clients').select('*').eq('id', chatWithId).single();
                if (data) {
                    setSelectedClient(data);
                    setIsProfileOpen(false); // Ensure profile is closed to show chat
                }
            };
            fetchClientToChat();
        }
    }, [searchParams]);

    return (
        <div className="flex h-full w-full bg-[#f0f2f5] overflow-hidden">
            {/* Left Side: Client List */}
            <ChatList onSelectClient={(client) => {
                setSelectedClient(client);
                setIsProfileOpen(false); // Reset profile when changing chat
            }} />

            {/* Right Side: Chat Conversation */}
            <ChatWindow
                client={selectedClient}
                onOpenProfile={() => {
                    if (selectedClient) {
                        router.push(`/clients?clientId=${selectedClient.id}`);
                    }
                }}
            />

            {/* Far Right: Client Profile */}
            <ClientProfile
                client={isProfileOpen ? selectedClient : null}
                onClose={() => setIsProfileOpen(false)}
            />
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatContent />
        </Suspense>
    );
}
