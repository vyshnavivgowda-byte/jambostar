"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Phone, Smartphone, Lock , ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function DeliveryLogin() {
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Check if phone number exists in delivery_persons table
        const { data, error } = await supabase
            .from("delivery_persons")
            .select("*")
            .eq("phone_number", phone)
            .eq("status", "active")
            .single();

        if (error || !data) {
            toast.error("Rider not found or unauthorized");
            setLoading(false);
            return;
        }

        // Store rider session locally
        localStorage.setItem("delivery_user", JSON.stringify(data));
        toast.success(`Welcome back, ${data.name}`);

        // Redirect to dashboard
        router.push("/delivery/dashboard");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 relative overflow-hidden">
            <Toaster position="top-center" />
            
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-60"></div>

            <div className="max-w-md mx-auto w-full z-10">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 p-8 md:p-12">
                    
                    {/* Header Section */}
                    <div className="mb-10 text-center">
                        <div className="relative inline-block">
                            <div className="h-20 w-20 bg-gradient-to-br from-red-500 to-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-200 rotate-3 transition-transform hover:rotate-0 cursor-default">
                                <ShieldCheck size={36} className="text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                                <Lock size={14} className="text-slate-400" />
                            </div>
                        </div>
                        
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                            deliver <span className="text-red-600">Login</span>
                        </h1>
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <span className="h-[1px] w-4 bg-slate-200"></span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Jumbo Star Logistics
                            </p>
                            <span className="h-[1px] w-4 bg-slate-200"></span>
                        </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
                                Registered Mobile
                            </label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
                                    <Smartphone size={20} />
                                </div>
                                <input
                                    required
                                    type="tel"
                                    placeholder="9876543210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-red-600/10 focus:ring-4 focus:ring-red-600/5 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.15em] hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 group"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Verify Identity
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Support Footer */}
                    <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            Need help with your route? <br />
                            <span className="text-slate-900 cursor-pointer hover:text-red-600 transition-colors">Contact System Administrator</span>
                        </p>
                    </div>
                </div>

                {/* Secure Badge */}
                <div className="mt-8 flex items-center justify-center gap-2 text-slate-300">
                    <ShieldCheck size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Secure End-to-End Portal</span>
                </div>
            </div>
        </div>
    );
}