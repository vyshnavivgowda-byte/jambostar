"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
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
        <div className="min-h-screen bg-white flex flex-col justify-center px-6">
            <Toaster position="top-center" />
            <div className="max-w-sm mx-auto w-full">
                <div className="mb-10 text-center">
                    <div className="h-16 w-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={32} className="text-red-600" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Fleet Login</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Jumbo Star Logistics Portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <Phone className="absolute left-5 top-5 text-slate-400" size={18} />
                        <input
                            required
                            type="tel"
                            placeholder="Registered Phone Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-5 text-sm font-bold focus:ring-2 focus:ring-red-600 transition-all"
                        />
                    </div>
                    
                    <button
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-red-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Verify Identity"}
                        <ArrowRight size={18} />
                    </button>
                </form>

                <p className="text-center mt-10 text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Contact Admin if you are unable <br/> to access your route profile.
                </p>
            </div>
        </div>
    );
}