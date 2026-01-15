"use client";

import { useEffect, useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types';
import { useTenant } from '@/contexts/TenantContext';

const ChatList = ({ onSelectClient }: { onSelectClient: (client: Client) => void }) => {
    const { tenantId } = useTenant();
    const [clients, setClients] = useState<Client[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);

    useEffect(() => {
        if (!tenantId) return;

        // Initial fetch
        const fetchClients = async () => {
            const { data } = await supabase
                .from('clients')
                .select('*')
                .eq('cliente_id', tenantId) // Filter by tenant!
                .order('created_at', { ascending: false });
            if (data) {
                setClients(data);
                setFilteredClients(data);
            }
        };

        fetchClients();

        // Real-time subscription for new clients
        const channel = supabase
            .channel('clients_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, (payload) => {
                setClients((prev) => {
                    const updated = [payload.new as Client, ...prev];
                    return updated;
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [tenantId]);

    useEffect(() => {
        const normalize = (str: string) =>
            str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const terms = normalize(searchQuery).split(' ').filter(t => t.length > 0);

        const filtered = clients.filter(client => {
            const name = normalize(client.name || '');
            const phone = normalize(client.whatsapp_id || '');

            if (terms.length === 0) return true;

            // Check if ALL search terms are present in EITHER the name OR the phone
            return terms.every(term => name.includes(term) || phone.includes(term));
        });
        setFilteredClients(filtered);
    }, [searchQuery, clients]);

    return (
        <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 bg-[#f0f2f5] flex justify-between items-center border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Chats</h2>
                <div className="flex gap-2">
                    <MessageSquare className="text-gray-500 hover:text-gray-800 cursor-pointer" size={20} />
                </div>
            </div>

            {/* Search */}
            <div className="p-3">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search or start new chat"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#f0f2f5] text-gray-700 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-none placeholder-gray-500"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredClients.map(client => (
                    <div
                        key={client.id}
                        onClick={() => onSelectClient(client)}
                        className="flex px-4 py-3 border-b border-gray-100 hover:bg-[#f0f2f5] cursor-pointer transition-colors group"
                    >
                        <div className="flex-shrink-0 mr-4">
                            {client.profile_picture ? (
                                <img
                                    src={client.profile_picture}
                                    alt={client.name || 'User'}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-lg">
                                    {client.name?.[0] || '?'}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h3 className="text-gray-900 font-medium truncate">{client.name || client.whatsapp_id}</h3>
                                <span className="text-xs text-gray-400">
                                    {new Date(client.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {/* Last message preview could be added here independently */}
                            <p className="text-sm text-gray-500 truncate group-hover:text-gray-700">
                                Click to view conversation
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatList;
