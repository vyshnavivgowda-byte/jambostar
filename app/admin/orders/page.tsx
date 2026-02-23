"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
    Search, Package, Building2, MapPin, Calendar, 
    RefreshCcw, ChevronRight, Filter, History, ShoppingBag
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [groupedClients, setGroupedClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const { data: ordersData, error: oError } = await supabase
                .from("orders").select('*').order("created_at", { ascending: false });
            if (oError) throw oError;

            const { data: usersData, error: uError } = await supabase
                .from("wholesale_users").select('id, business_id, company_name, first_name, last_name, phone');
            if (uError) throw uError;

            // Combine data
            const combined = ordersData.map(order => ({
                ...order,
                wholesale_users: usersData.find(u => u.id === order.user_id) || null
            }));
            setOrders(combined);

            // Group by Business ID
            const groups = combined.reduce((acc: any, order) => {
                const bId = order.wholesale_users?.business_id || 'Unknown';
                if (!acc[bId]) {
                    acc[bId] = {
                        business_id: bId,
                        company_name: order.wholesale_users?.company_name || "Unknown Business",
                        client_info: order.wholesale_users,
                        all_orders: [],
                        total_spent: 0
                    };
                }
                acc[bId].all_orders.push(order);
                acc[bId].total_spent += (order.total_amount || 0);
                return acc;
            }, {});

            setGroupedClients(Object.values(groups));
        } catch (error: any) {
            toast.error("Failed to load data");
        } finally { setLoading(false); }
    };

    const updateStatus = async (orderId: string, updates: any) => {
        try {
            setUpdating(true);
            const { error } = await supabase.from("orders").update(updates).eq('id', orderId);
            if (error) throw error;
            toast.success("Status Updated");
            await fetchOrders(); // Refresh data
            
            // Update the local selected client view
            if (selectedClient) {
                const updatedClients = groupedClients.find(c => c.business_id === selectedClient.business_id);
                setSelectedClient(updatedClients);
            }
        } catch (err) {
            toast.error("Update Failed");
        } finally { setUpdating(false); }
    };

    const getStatusStyle = (status: string) => {
        const s = status?.toLowerCase();
        if(['paid', 'fully_paid', 'delivered'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if(['processing', 'shipped', 'partially_paid'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    const filteredClients = groupedClients.filter(c => 
        c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.business_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#FDF8F8] p-4 md:p-10">
            <Toaster position="top-right" />
            
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-[900] text-slate-900 tracking-tight uppercase">Client Registry</h1>
                    <p className="text-black font-medium">Manage orders by business entity</p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" placeholder="Search Business ID or Name..." 
                        className="w-full pl-12 pr-4 py-4 text-black bg-white border-0 shadow-sm rounded-2xl focus:ring-2 ring-red-500 transition-all outline-none text-sm font-bold"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Business Table */}
            <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-red-50 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-red-50/50 border-b border-red-100">
                        <tr>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400">Business Entity</th>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400">Order Volume</th>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400">Total Revenue</th>
                            <th className="px-8 py-5 text-[11px] font-black uppercase text-red-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                        {filteredClients.map(client => (
                            <tr key={client.business_id} className="hover:bg-red-50/30 transition-all cursor-pointer group" onClick={() => setSelectedClient(client)}>
                                <td className="px-8 py-6">
                                    <div className="text-lg font-black text-slate-900 tracking-tighter uppercase">{client.company_name}</div>
                                    <div className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{client.business_id}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag size={16} className="text-slate-400" />
                                        <span className="font-black text-slate-700">{client.all_orders.length} Orders</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="text-sm font-black text-slate-900">₹{client.total_spent?.toLocaleString()}</div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-600 transition-all">
                                        View History
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Slide-over Detail View: ALL ORDERS FOR BUSINESS */}
            {selectedClient && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="w-full max-w-4xl bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-500">
                        <div className="p-10">
                            <button onClick={() => setSelectedClient(null)} className="mb-6 px-4 py-2 bg-slate-100 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-red-600 hover:text-white transition-all">
                                ← Back to Registry
                            </button>

                            <div className="mb-10 border-b border-red-50 pb-10">
                                <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-2">{selectedClient.company_name}</h2>
                                <p className="text-red-500 font-black text-sm tracking-widest uppercase">{selectedClient.business_id} • {selectedClient.client_info?.phone}</p>
                            </div>

                            {/* Section: ACTIVE / PENDING ORDERS */}
                            <div className="mb-12">
                                <h3 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center gap-2">
                                    <RefreshCcw size={16} className="text-amber-500" /> Active Shipments & Processing
                                </h3>
                                <div className="space-y-4">
                                    {selectedClient.all_orders.filter((o:any) => o.order_status !== 'delivered' && o.order_status !== 'cancelled').map((order: any) => (
                                        <OrderCard key={order.id} order={order} updateStatus={updateStatus} getStatusStyle={getStatusStyle} updating={updating} />
                                    ))}
                                </div>
                            </div>

                            {/* Section: COMPLETED ORDERS */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center gap-2">
                                    <History size={16} className="text-emerald-500" /> Past Deliveries
                                </h3>
                                <div className="space-y-4 opacity-80">
                                    {selectedClient.all_orders.filter((o:any) => o.order_status === 'delivered').map((order: any) => (
                                        <OrderCard key={order.id} order={order} updateStatus={updateStatus} getStatusStyle={getStatusStyle} updating={updating} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for individual orders within the client view
function OrderCard({ order, updateStatus, getStatusStyle, updating }: any) {
    return (
        <div className="border-2 border-red-50 rounded-3xl p-6 hover:border-red-200 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-lg font-black text-slate-900">{order.order_id_custom}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        className={`p-2 rounded-xl border text-[10px] font-black uppercase ${getStatusStyle(order.order_status)}`}
                        value={order.order_status}
                        onChange={(e) => updateStatus(order.id, { order_status: e.target.value })}
                        disabled={updating}
                    >
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <select 
                        className={`p-2 rounded-xl border text-[10px] font-black uppercase ${getStatusStyle(order.payment_status)}`}
                        value={order.payment_status}
                        onChange={(e) => updateStatus(order.id, { payment_status: e.target.value })}
                        disabled={updating}
                    >
                        <option value="pending">Unpaid</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Items</p>
                    <div className="text-xs font-bold text-slate-700">
                        {order.items?.map((i:any) => `${i.quantity}x ${i.product_name}`).join(", ")}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Amount</p>
                    <div className="text-lg font-black text-red-600">₹{order.total_amount?.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}