"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { 
    Building2, 
    User, 
    MapPin, 
    CreditCard, 
    Globe, 
    Phone, 
    Mail, 
    ShieldCheck, 
    Loader2, 
    Save,
    ExternalLink,
    Store
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function WholesaleProfile() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            if (!userStr) return router.push("/");
            const user = JSON.parse(userStr);

            const { data, error } = await supabase
                .from("wholesale_users")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error: any) {
            toast.error("Failed to load profile");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const { error } = await supabase
                .from("wholesale_users")
                .update({
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    phone: profile.phone,
                    shop_address: profile.shop_address,
                    google_maps_link: profile.google_maps_link
                })
                .eq("id", profile.id);

            if (error) throw error;
            toast.success("Profile updated successfully!");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#F9FAFB]">
            <Loader2 className="animate-spin text-[#FF4F18]" size={40} />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F9FAFB] pb-20">
            <Toaster />
            <div className="max-w-5xl mx-auto px-4 pt-10">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-[#FF4F18] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                {profile.status}
                            </span>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                ID: {profile.business_id}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Business Profile</h1>
                    </div>
                    <div className="flex gap-3 text-black">
                        <button onClick={() => router.push("/Wholesale/orders")} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all">
                            Orders
                        </button>
                    </div>
                </div>

                <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Business Verification (Disabled) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl">
                            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ShieldCheck className="text-[#FF4F18]" size={18}/> Verification
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Company Name</label>
                                    <p className="font-bold text-lg">{profile.company_name}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">GST Number</label>
                                    <p className="font-mono text-orange-400 font-bold">{profile.gst_number}</p>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Registered Email</label>
                                    <p className="text-sm text-slate-300">{profile.email}</p>
                                </div>
                            </div>
                            <p className="mt-8 text-[9px] leading-relaxed text-slate-500 uppercase font-bold italic">
                                * To change your GST or Company name, please contact our wholesale support desk.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Editable Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                            <h3 className="text-lg text-[#FF4F18] font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
                                <User className="text-[#FF4F18]" size={20}/> Contact Information
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">First Name</label>
                                    <input 
                                        type="text" 
                                        value={profile.first_name}
                                        onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Last Name</label>
                                    <input 
                                        type="text" 
                                        value={profile.last_name}
                                        onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                        <input 
                                            type="text" 
                                            value={profile.phone}
                                            onChange={(e) => setProfile({...profile, phone: e.target.value})}
                                            className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                            <h3 className="text-lg text-[#FF4F18] font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
                                <Store className="text-[#FF4F18]" size={20}/> Operating Address
                            </h3>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Shop / Warehouse Address</label>
                                    <textarea 
                                        rows={3}
                                        value={profile.shop_address}
                                        onChange={(e) => setProfile({...profile, shop_address: e.target.value})}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Google Maps Link</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                        <input 
                                            type="url" 
                                            value={profile.google_maps_link}
                                            onChange={(e) => setProfile({...profile, google_maps_link: e.target.value})}
                                            className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={updating}
                            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-[#FF4F18] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                        >
                            {updating ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}