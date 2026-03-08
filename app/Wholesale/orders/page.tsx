"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { CheckCircle2, Loader2, Wallet, ArrowLeft, History, Package } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function WholesaleOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            if (!userStr) return router.push("/");
            const user = JSON.parse(userStr);

            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error: any) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleBalancePayment = async (order: any) => {
        if (processingId) return;
        setProcessingId(order.id);

        try {
            if (!(window as any).Razorpay) await loadRazorpay();

            const fullAmount = Number(order.total_payable_amount || order.total_amount);
            const balanceToPay = order.remaining_balance !== null
                ? Number(order.remaining_balance)
                : fullAmount;

            if (balanceToPay <= 0) {
                toast.error("Order is already settled.");
                setProcessingId(null);
                return;
            }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: Math.round(balanceToPay * 100),
                currency: "INR",
                name: "Jumbo Star Wholesale",
                description: `Settling Order ${order.order_id_custom}`,
                handler: async function (response: any) {
                    // 1. Update Database
                    const { error: dbError } = await supabase
                        .from("orders")
                        .update({
                            payment_status: 'paid',
                            amount_paid_now: fullAmount,
                            remaining_balance: 0,
                            payment_id: response.razorpay_payment_id,
                            payment_type: 'full',
                            balance_due_date: null
                        })
                        .eq('id', order.id);

                    if (dbError) {
                        console.error("DB Update Error:", dbError);
                        toast.error("Update failed. Contact support.");
                    } else {
                        toast.success("Order Fully Settled!");

                        // 2. Trigger Settlement Email
                        try {
                            const userStr = localStorage.getItem("wholesale_user");
                            const user = userStr ? JSON.parse(userStr) : null;

                            await fetch("/api/send-order-email", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    email: user?.email || order.user_email, // Fallback to order email if user state is lost
                                    orderId: order.order_id_custom,
                                    status: "Order Fully Paid",
                                    items: order.items, // Already exists in the order object
                                    total: fullAmount,
                                    paid: fullAmount,   // Now fully paid
                                    remaining: 0,       // Zero balance
                                    address: order.address_snapshot,
                                }),
                            });
                        } catch (emailErr) {
                            console.error("Settlement Email failed:", emailErr);
                            // We don't block the UI for email failures since payment/DB succeeded
                        }

                        fetchOrders(); // Refresh the list
                    }
                    setProcessingId(null);
                },
                prefill: {
                    contact: JSON.parse(localStorage.getItem("wholesale_user") || "{}").phone || ""
                },
                theme: { color: "#E11D48" },
                modal: { ondismiss: () => setProcessingId(null) }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("Payment initialization error:", err);
            setProcessingId(null);
        }
    };
    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-white">
            <Loader2 className="animate-spin text-red-600 mb-4" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying Ledger...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <Toaster position="bottom-center" />
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            {/* Header Area */}
            <div className="bg-white border-b border-slate-100 pt-10 pb-8 px-4">
                <div className="max-w-5xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6"
                    >
                        <ArrowLeft size={14} /> Back to sourcing
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Purchase Ledger</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <History size={14} className="text-red-600" />
                                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.1em]">Transaction Records</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
                {orders.length > 0 ? orders.map((order) => {
                    const displayTotal = Number(order.total_payable_amount || order.total_amount);
                    const displayPaid = Number(order.amount_paid_now || 0);
                    let displayBalance = order.remaining_balance !== null ? Number(order.remaining_balance) : (order.payment_status === 'paid' ? 0 : displayTotal);
                    const isPaid = displayBalance <= 0 || order.payment_status === 'paid';

                    return (
                        <div key={order.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            {/* Top Info Bar */}
                            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                                        {order.order_id_custom}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border ${displayBalance > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        {displayBalance > 0 ? 'Credit/Partial' : 'Paid in Full'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                                {/* Order Items Section */}
                                <div className="flex-1 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {order.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="h-12 w-12 bg-slate-50 rounded-xl flex-shrink-0 overflow-hidden border border-slate-100 p-1">
                                                    <img src={item.image || 'https://via.placeholder.com/100'} alt="" className="w-full h-full object-contain" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-800 truncate uppercase leading-tight">{item.product_name}</p>
                                                    <p className="text-[9px] font-bold text-red-600 uppercase mt-0.5">{item.quantity} {item.unit}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Address Snapshot - Hidden on very small mobile if too long, or truncated */}
                                    <div className="pt-4 border-t border-slate-50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery Destination</p>
                                        <p className="text-xs font-bold text-slate-600 leading-relaxed">{order.address_snapshot}</p>
                                    </div>
                                </div>

                                {/* Financial Summary - This part pops on mobile */}
                                <div className="lg:w-72 bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 text-white shadow-xl">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center opacity-60">
                                            <span className="text-[9px] font-black uppercase tracking-widest">Total Invoice</span>
                                            <span className="text-xs font-bold">₹{displayTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-emerald-400">
                                            <span className="text-[9px] font-black uppercase tracking-widest">Collected</span>
                                            <span className="text-xs font-bold">₹{displayPaid.toLocaleString()}</span>
                                        </div>

                                        <div className="h-px bg-white/10" />

                                        <div className="py-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1 text-center">Outstanding Balance</p>
                                            <p className={`text-3xl font-black text-center tracking-tighter ${displayBalance > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                                ₹{displayBalance.toLocaleString()}
                                            </p>
                                        </div>

                                        {!isPaid ? (
                                            <button
                                                onClick={() => handleBalancePayment(order)}
                                                disabled={processingId === order.id}
                                                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                                            >
                                                {processingId === order.id ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
                                                Settle Now
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                                                <CheckCircle2 size={14} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">No Dues</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-20">
                        <Package className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No order history found</p>
                    </div>
                )}
            </div>
        </div>
    );
}