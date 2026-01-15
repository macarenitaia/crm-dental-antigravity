
import { useEffect, useState, useRef } from 'react';
import { Mic, Paperclip } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Client, Message } from '@/types';

const ChatWindow = ({ client, onOpenProfile }: { client: Client | null, onOpenProfile: () => void }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!client) return;

        // 1. Load initial messages
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: true });

            if (data) setMessages(data as Message[]);
        };

        fetchMessages();

        // 2. Subscribe to new messages
        const channel = supabase
            .channel(`chat:${client.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `client_id=eq.${client.id}`
            }, (payload) => {
                setMessages((prev) => [...prev, payload.new as Message]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [client]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!client) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f0f2f5] text-gray-500 flex-col">
                <div className="w-64 h-64 bg-gray-200 rounded-full mb-8 flex items-center justify-center opacity-50">
                    {/* WhatsApp Style Intro Image Placeholder */}
                    <span className="text-4xl">👋</span>
                </div>
                <h2 className="text-xl font-light">Select a chat to start messaging</h2>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[#efeae2] relative">
            {/* Background Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.4] pointer-events-none"
                style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
            </div>

            {/* Header */}
            <div
                className="px-4 py-3 bg-[#f0f2f5] border-b border-gray-200 flex justify-between items-center z-10 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={onOpenProfile}
            >
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 overflow-hidden bg-gray-300 text-gray-600 font-bold">
                        {client.profile_picture ? (
                            <img
                                src={client.profile_picture}
                                alt={client.name || 'User'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span>{client.name?.[0] || '?'}</span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-gray-800 font-medium">{client.name || client.whatsapp_id}</h2>
                        <p className="text-xs text-gray-500">managed by AI Agent</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 z-10 space-y-4" ref={scrollRef}>
                {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                            <div className={`
                        ${isUser ? 'bg-white text-gray-900 rounded-tl-none shadow-sm' : 'bg-[#d9fdd3] text-gray-900 rounded-tr-none shadow-sm'}
                        rounded-lg px-3 py-2 max-w-[60%] relative text-sm
                    `}>
                                <p>{msg.content}</p>
                                <span className="text-[10px] text-gray-500 flex justify-end mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area (Visual Only for now) */}
            <div className="px-4 py-3 bg-[#f0f2f5] flex items-center gap-4 z-10">
                <button className="text-gray-500 hover:text-gray-700">
                    <Paperclip size={20} />
                </button>
                <div className="flex-1 bg-white rounded-lg flex items-center px-4 py-2 border border-white focus-within:border-white">
                    <input
                        type="text"
                        placeholder="Type a message (Agent is auto-replying)"
                        className="bg-transparent w-full text-gray-800 text-sm focus:outline-none placeholder-gray-500"
                    />
                </div>
                <button className="text-gray-500 hover:text-gray-700">
                    <Mic size={20} />
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;
