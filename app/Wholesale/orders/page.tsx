"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
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

            // CLEAN FETCH: Only select, no update here!
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error: any) {
            console.error("Fetch Error:", error.message);
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
                toast.error("This order is already settled.");
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
                    // This is where the UPDATE belongs
                    const { error } = await supabase
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

                    if (error) {
                        toast.error("Database update failed. Please contact support.");
                    } else {
                        toast.success("Order Fully Settled!");
                        fetchOrders();
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
            setProcessingId(null);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div>;


    return (
        <div className="min-h-screen bg-[#F9FAFB] pb-20 font-sans">
            <Toaster position="top-right" />
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <div className="max-w-6xl mx-auto px-4 pt-10">
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Purchase Ledger</h1>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Real-time Wholesale Settlements</p>
                </div>

                <div className="space-y-8">
                    {orders.map((order) => {
                        // 1. Calculate the logic variables first
                        const displayTotal = Number(order.total_payable_amount || order.total_amount);
                        const displayPaid = Number(order.amount_paid_now || 0);

                        let displayBalance = 0;
                        if (order.remaining_balance !== null) {
                            displayBalance = Number(order.remaining_balance);
                        } else {
                            displayBalance = order.payment_status === 'paid' ? 0 : displayTotal;
                        }

                        const isPaid = displayBalance <= 0 || order.payment_status === 'paid';

                        // 2. Return the JSX using the correct variable names
                        return (
                            <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-8">
                                    <div className="flex flex-col lg:flex-row justify-between gap-8">
                                        <div className="flex-1 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase">
                                                    {order.order_id_custom}
                                                </span>
                                                {/* FIX: Changed 'balance' to 'displayBalance' */}
                                                <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${displayBalance > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                    {displayBalance > 0 ? 'Partial Payment' : 'Fully Settled'}
                                                </span>
                                            </div>

                                            {/* Products Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {order.items?.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                        <div className="h-10 w-10 bg-white rounded-lg flex-shrink-0 overflow-hidden border border-slate-200 p-1">
                                                            <img src={item.image || 'https://via.placeholder.com/100'} alt="" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black text-slate-800 truncate uppercase leading-tight">{item.product_name || 'Product'}</p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Qty: {item.quantity} {item.unit || ''}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">Order Date</p>
                                                    <p className="text-xs font-bold text-slate-700">{new Date(order.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">Shipping To</p>
                                                    <p className="text-xs font-bold text-slate-700 truncate max-w-xs">{order.address_snapshot}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side Math */}
                                        <div className="lg:w-80 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-center">
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                                    <span>Total Value</span>
                                                    {/* FIX: Changed 'total' to 'displayTotal' */}
                                                    <span>₹{displayTotal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-bold uppercase text-emerald-600">
                                                    <span>Already Paid</span>
                                                    {/* FIX: Changed 'paid' to 'displayPaid' */}
                                                    <span>₹{displayPaid.toLocaleString()}</span>
                                                </div>
                                                <div className="h-px bg-slate-200" />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase text-slate-900">Balance</span>
                                                    {/* FIX: Changed 'balance' to 'displayBalance' */}
                                                    <span className={`text-xl font-black ${displayBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        ₹{displayBalance.toLocaleString()}
                                                    </span>
                                                </div>

                                                {!isPaid ? (
                                                    <button
                                                        onClick={() => handleBalancePayment(order)}
                                                        disabled={processingId === order.id}
                                                        className="w-full mt-4 bg-red-600 hover:bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    >
                                                        {processingId === order.id ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
                                                        Clear Balance
                                                    </button>
                                                ) : (
                                                    <div className="mt-4 flex items-center justify-center gap-2 py-3 bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200">
                                                        <CheckCircle2 size={16} />
                                                        <span className="text-[10px] font-black uppercase">Settled</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}