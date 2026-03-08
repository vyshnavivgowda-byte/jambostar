"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
    Package, MapPin, CheckCircle2, LogOut, Loader2, 
    Banknote, CreditCard, ChevronDown, ChevronUp, Info 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function DeliveryDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [rider, setRider] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        const riderStr = localStorage.getItem("delivery_user");
        if (!riderStr) { window.location.href = "/deliverylogin"; return; }
        const user = JSON.parse(riderStr);
        setRider(user);
        fetchOrders(user.id);
    }, []);

    const fetchOrders = async (riderId: string) => {
        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("delivery_person_id", riderId)
            .order("created_at", { ascending: false });

        if (error) toast.error("Error loading tasks");
        else setOrders(data || []);
        setLoading(false);
    };

    const handleCompleteDelivery = async (order: any) => {
        setUpdatingId(order.id);
        
        // When delivering, we set status to delivered. 
        // If they paid balance via Cash to Rider, you might want to update payment_status too.
        const { error } = await supabase
            .from("orders")
            .update({ 
                order_status: "delivered",
                // If it was partial, we assume rider collected cash, so we mark fully paid
                payment_status: "paid", 
                remaining_balance: 0,
                amount_paid_now: order.total_payable_amount
            })
            .eq("id", order.id);

        if (error) {
            toast.error("Update failed");
        } else {
            toast.success("Order Delivered & Settled!");
            fetchOrders(rider.id);
        }
        setUpdatingId(null);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-red-600" /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-10">
            <Toaster position="top-center" />
            
            {/* Header */}
            <div className="bg-slate-900 px-6 pt-12 pb-8 text-white rounded-b-[2.5rem] shadow-xl">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] mb-1">On Duty</p>
                        <h2 className="text-3xl font-black uppercase tracking-tighter">{rider?.name.split(' ')[0]}</h2>
                    </div>
                    <button onClick={() => { localStorage.clear(); window.location.href="/delivery/login"; }} className="p-3 bg-white/10 rounded-2xl text-white">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4 -mt-4">
                {orders.map((order) => {
                    const isRemaining = Number(order.remaining_balance) > 0;
                    const isExpanded = expandedOrder === order.id;

                    return (
                        <div key={order.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                            {/* Card Header */}
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.order_id_custom}</span>
                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${order.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                                        {order.order_status}
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 mb-6">
                                    <MapPin size={18} className="text-red-600 mt-1 flex-shrink-0" />
                                    <p className="text-sm font-bold text-slate-700 leading-tight">{order.address_snapshot}</p>
                                </div>

                                {/* Payment Logic UI */}
                                <div className={`flex items-center justify-between p-4 rounded-2xl ${isRemaining ? 'bg-amber-50 border border-amber-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                                    <div className="flex items-center gap-3">
                                        {isRemaining ? <Banknote className="text-amber-600" /> : <CreditCard className="text-emerald-600" />}
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                {isRemaining ? "Collect Cash/UPI" : "Already Paid"}
                                            </p>
                                            <p className={`text-xl font-black ${isRemaining ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                ₹{isRemaining ? order.remaining_balance : order.total_payable_amount}
                                            </p>
                                        </div>
                                    </div>
                                    {isRemaining && <span className="bg-amber-200 text-amber-800 text-[8px] font-black px-2 py-1 rounded uppercase">COD</span>}
                                </div>

                                {/* Toggle Items Details */}
                                <button 
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                    className="w-full mt-4 flex items-center justify-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest py-2"
                                >
                                    {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                    {isExpanded ? "Hide Items" : "View Order Items"}
                                </button>

                                {/* Items List (Conditional) */}
                                {isExpanded && (
                                    <div className="mt-4 space-y-2 pt-4 border-t border-slate-50">
                                        {order.items?.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <img src={item.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{item.product_name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 mt-1">{item.quantity} {item.unit}</p>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-black text-slate-900">₹{item.subtotal}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Action Button */}
                                {order.order_status !== 'delivered' && (
                                    <button 
                                        disabled={updatingId === order.id}
                                        onClick={() => handleCompleteDelivery(order)}
                                        className="w-full mt-6 bg-slate-900 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-slate-200"
                                    >
                                        {updatingId === order.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                        Confirm Delivery
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}