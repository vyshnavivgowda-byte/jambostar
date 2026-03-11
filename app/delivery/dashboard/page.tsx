"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    LogOut, MapPin, Loader2, CheckCircle2,
    ShoppingBag, X, AlertOctagon, Package, Clock, Check, ChevronRight, Wallet
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function DeliveryDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [rider, setRider] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState("out_for_delivery");

    const [paymentModal, setPaymentModal] = useState<{ show: boolean, order: any | null }>({ show: false, order: null });
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [itemReasons, setItemReasons] = useState<Record<string, string>>({});
    const [utrNumber, setUtrNumber] = useState("");

    useEffect(() => {
        const riderStr = localStorage.getItem("delivery_user");
        if (!riderStr) { window.location.href = "/deliverylogin"; return; }
        const user = JSON.parse(riderStr);
        setRider(user);
        fetchOrders(user.id);
    }, []);

    const fetchOrders = async (riderId: string) => {
        // We select everything from orders, plus the business_id from the linked wholesale_user
        const { data, error } = await supabase
            .from("orders")
            .select(`
            *,
            wholesale_users (
                business_id
            )
        `)
            .eq("delivery_person_id", riderId)
            .order("created_at", { ascending: false });

        if (error) {
            toast.error("Error loading tasks");
            console.error("Fetch Error:", error);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };
    const filteredOrders = orders.filter(o => {
        if (activeFilter === "all") return true;
        if (activeFilter === "delivered") return o.order_status === "delivered";
        if (activeFilter === "out_for_delivery") return o.order_status !== "delivered" && o.order_status !== "cancelled";
        return true;
    });

    const openPaymentModal = (order: any) => {
        setPaymentModal({ show: true, order });
        setSelectedItemIds(order.items.map((_: any, i: number) => `item-${i}`));
        setItemReasons({});
    };

    const calculateNewTotal = () => {
        if (!paymentModal.order) return 0;
        return paymentModal.order.items.reduce((acc: number, item: any, i: number) => {
            return selectedItemIds.includes(`item-${i}`) ? acc + Number(item.subtotal) : acc;
        }, 0);
    };

    const handleProcessOrder = async () => {
        const { order } = paymentModal;
        if (!order) return;

        const newTotal = calculateNewTotal();

        // 1. Identify which items are being returned
        const rejectedIndices = order.items
            .map((_: any, i: number) => i)
            .filter((i: number) => !selectedItemIds.includes(`item-${i}`));

        // 2. Validation for reasons
        for (let idx of rejectedIndices) {
            if (!itemReasons[`item-${idx}`]) {
                toast.error(`Reason required for ${order.items[idx].product_name}`);
                return;
            }
        }

        // 3. Extract Business ID from the new joined structure
        // It will be under order.wholesale_users.business_id because of our new fetch
        // Find this line inside handleProcessOrder (around line 93)
        // Find this block inside handleProcessOrder (around line 93)
        const finalBusinessId =
            order.business_id || // Fallback if it exists on order directly
            order.wholesale_users?.business_id || // Standard Supabase join object
            (Array.isArray(order.wholesale_users) ? order.wholesale_users[0]?.business_id : null); // Fallback for array returns

        if (!finalBusinessId) {
            console.error("Missing Business ID for order:", order.order_id_custom);
            toast.error("System Error: Business ID not found for this order.");
            return;
        }

        setUpdatingId(order.id);

        try {
            // --- STEP A: SAVE RETURNS TO DATABASE ---
            if (rejectedIndices.length > 0) {
                const returnsData = rejectedIndices.map((idx: number) => ({
                    order_id: order.order_id_custom,
                    product_name: order.items[idx].product_name,
                    quantity: parseInt(order.items[idx].quantity) || 0,
                    subtotal: parseFloat(order.items[idx].subtotal) || 0,
                    reason: itemReasons[`item-${idx}`],
                    rider_id: rider.id,
                    business_id: finalBusinessId // This should now be populated
                }));

                const { error: returnError } = await supabase
                    .from("returns")
                    .insert(returnsData);

                if (returnError) throw returnError;
            }

            // --- STEP B: UPDATE ORDER STATUS ---
            const isFullCancel = selectedItemIds.length === 0;
            const updateData = {
                order_status: isFullCancel ? "cancelled" : "delivered",
                payment_status: "paid",
                amount_paid_now: newTotal,
                remaining_balance: 0,
                utr_number: utrNumber || null,
                items: order.items.filter((_: any, i: number) => selectedItemIds.includes(`item-${i}`))
            };

            const { error: orderError } = await supabase
                .from("orders")
                .update(updateData)
                .eq("id", order.id);

            if (orderError) throw orderError;

            toast.success(isFullCancel ? "Order Cancelled" : "Order Delivered!");
            setPaymentModal({ show: false, order: null });
            fetchOrders(rider.id);

        } catch (err: any) {
            console.error("Return Process Error:", err);
            toast.error(err.message || "Process failed");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
            <Toaster position="top-center" />

            {/* HEADER */}
            <div className="bg-slate-900 px-6 pt-12 pb-24 rounded-b-[3.5rem] shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">DTS Logistics</p>
                        <h2 className="text-3xl font-black text-white mt-1">Hi, {rider?.name || 'Rider'} 👋</h2>
                    </div>
                    <button onClick={() => { localStorage.clear(); window.location.href = "/deliverylogin"; }} className="p-4 bg-white/10 rounded-3xl text-white backdrop-blur-md border border-white/10">
                        <LogOut size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-[2rem] border border-white/5">
                        <p className="text-[10px] text-slate-400 font-black uppercase">Tasks</p>
                        <p className="text-2xl font-black text-white">{orders.length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-[2rem] border border-white/5">
                        <p className="text-[10px] text-slate-400 font-black uppercase">Done</p>
                        <p className="text-2xl font-black text-green-400">{orders.filter(o => o.order_status === 'delivered').length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-[2rem] border border-white/5">
                        <p className="text-[10px] text-slate-400 font-black uppercase">Left</p>
                        <p className="text-2xl font-black text-orange-400">{orders.filter(o => o.order_status !== 'delivered' && o.order_status !== 'cancelled').length}</p>
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div className="px-6 -mt-8">
                <div className="bg-white p-2 rounded-3xl shadow-xl flex gap-2 border border-slate-100">
                    {['out_for_delivery', 'delivered', 'all'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`flex-1 py-4 px-2 rounded-2xl text-xs font-black uppercase transition-all ${activeFilter === filter ? 'bg-slate-900 text-white' : 'text-slate-400'
                                }`}
                        >
                            {filter.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* ORDER CARDS */}
            <div className="px-6 mt-10 space-y-6">
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-12 text-center border-2 border-dashed border-slate-200">
                        <Package className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="font-black text-slate-400 uppercase tracking-widest">No Orders Found</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100">
                            {/* ID & Status */}
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-xs font-black bg-slate-100 text-slate-500 px-4 py-2 rounded-full uppercase tracking-tighter">Order #{order.order_id_custom}</span>
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase ${order.order_status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                    <div className={`w-2 h-2 rounded-full ${order.order_status === 'delivered' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
                                    {order.order_status}
                                </div>
                            </div>

                            {/* Address */}
                            <div className="flex gap-4 mb-8">
                                <div className="bg-red-50 p-3 rounded-2xl h-fit">
                                    <MapPin size={24} className="text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 uppercase leading-tight mb-1">{order.customer_name || 'Retail Store'}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase">{order.address_snapshot}</p>
                                </div>
                            </div>

                            {/* Detailed Products List */}
                            <div className="bg-slate-50 rounded-[2rem] p-5 mb-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Items in Parcel</p>
                                <div className="space-y-3">
                                    {order.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                            <p className="text-xs font-black uppercase text-slate-700">{item.product_name} <span className="text-slate-400 ml-1">x{item.quantity}</span></p>
                                            <p className="text-xs font-black text-slate-900">₹{item.subtotal}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Financial Details */}
                            <div className="grid grid-cols-3 gap-3 mb-8">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total</p>
                                    <p className="text-sm font-black">₹{order.total_amount || 0}</p>
                                </div>
                                <div className="text-center border-x border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Paid</p>
                                    <p className="text-sm font-black text-green-600">₹{order.paid_amount || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Balance</p>
                                    <p className="text-sm font-black text-red-600">₹{order.remaining_balance}</p>
                                </div>
                            </div>

                            {/* Action Button */}
                            {order.order_status !== 'delivered' && order.order_status !== 'cancelled' ? (
                                <button
                                    onClick={() => openPaymentModal(order)}
                                    className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-sm flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                                >
                                    <Wallet size={20} /> Collect Cash & Deliver
                                </button>
                            ) : (
                                <div className="w-full bg-green-600 text-white py-5 rounded-[2rem] font-black uppercase text-sm text-center flex items-center justify-center gap-2">
                                    <CheckCircle2 size={20} /> Job Completed
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* PROCESSING MODAL */}
            {paymentModal.show && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-8 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-20 duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black uppercase text-base tracking-widest">Confirm Delivery</h3>
                            <button onClick={() => setPaymentModal({ show: false, order: null })} className="p-3 bg-slate-100 rounded-2xl"><X size={24} /></button>
                        </div>

                        <div className="space-y-4 mb-8">
                            {paymentModal.order.items.map((item: any, i: number) => {
                                const itemId = `item-${i}`;
                                const isSelected = selectedItemIds.includes(itemId);
                                return (
                                    <div key={i} className="space-y-3">
                                        <div
                                            onClick={() => setSelectedItemIds(prev => isSelected ? prev.filter(id => id !== itemId) : [...prev, itemId])}
                                            className={`flex items-center gap-5 p-5 rounded-[2rem] border-2 transition-all cursor-pointer ${isSelected ? 'border-green-500 bg-green-50' : 'border-red-200 bg-red-50'}`}
                                        >
                                            {isSelected ? <CheckCircle2 className="text-green-600" size={28} /> : <AlertOctagon className="text-red-500" size={28} />}
                                            <div className="flex-1">
                                                <p className="text-sm font-black uppercase leading-tight">{item.product_name}</p>
                                                <p className="text-xs font-bold text-slate-400 mt-1">₹{item.subtotal}</p>
                                            </div>
                                        </div>
                                        {!isSelected && (
                                            <div className="px-4">
                                                <select
                                                    onChange={(e) => setItemReasons({ ...itemReasons, [itemId]: e.target.value })}
                                                    className="w-full p-5 bg-white border-2 border-red-100 rounded-[1.5rem] text-xs font-black uppercase outline-none focus:border-red-500"
                                                >
                                                    <option value="">Choose Return Reason</option>
                                                    <option value="Damaged">Product Damaged</option>
                                                    <option value="Wrong Item">Wrong Item Sent</option>
                                                    <option value="Refused">Customer Refused</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] mb-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold uppercase text-slate-400 tracking-widest">Final Amount to Collect</span>
                                <span className="text-3xl font-black">₹{calculateNewTotal()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase italic">* Excluding returned items</p>
                        </div>

                        <button
                            disabled={updatingId === paymentModal.order.id}
                            onClick={handleProcessOrder}
                            className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-base shadow-xl active:scale-95 transition-all"
                        >
                            {updatingId ? <Loader2 className="animate-spin mx-auto" /> : "Confirm & Save Delivery"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}