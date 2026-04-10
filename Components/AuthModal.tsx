"use client";

import { useState } from "react";
import { X, Mail, User, ArrowRight, ArrowLeft, Building2, CheckCircle2, Phone, Globe, Loader2, MapPin } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [step, setStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedId, setGeneratedId] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        phone: "",
        companyName: "",
        gstNumber: "",
        ownerName: "",
        ownerDob: "",
        regAddress: "",
        shopAddress: "",
        mapLink: ""
    });

    if (!isOpen) return null;

    // --- VALIDATION LOGIC ---
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);
    
    // UPDATED: Broad validation for all common Google Maps link types
   const validateMapsLink = (link: string) => {
    const lowerLink = link.toLowerCase().trim();
    return (
        lowerLink.includes("goo.gl/maps") || 
        lowerLink.includes("google.com/maps") ||
        lowerLink.includes("googleusercontent.com/maps.google.com/10") ||
        lowerLink.includes("googleusercontent.com/maps.google.com/13")
    );
};

    const checkStep1 = () => {
        if (!validateEmail(formData.email)) { toast.error("Please enter a valid email"); return false; }
        if (!validatePhone(formData.phone)) { toast.error("Phone number must be 10 digits starting with 6-9"); return false; }
        return true;
    };

    const checkStep2 = () => {
        if (formData.companyName.length < 3) { toast.error("Shop Name is too short"); return false; }
        if (formData.ownerName.length < 3) { toast.error("Owner Name is required"); return false; }
        if (formData.gstNumber.length > 0 && formData.gstNumber.length !== 15) { toast.error("GST Number must be 15 characters"); return false; }
        return true;
    };

    const checkStep3 = () => {
        if (!formData.regAddress.trim()) { toast.error("Registered Office Address is required"); return false; }
        if (!formData.shopAddress.trim()) { toast.error("Shop/Delivery Address is required"); return false; }
        
        // Final check for the Maps Link
        if (!formData.mapLink.trim()) {
            toast.error("Please provide a Google Maps link");
            return false;
        }
        if (!validateMapsLink(formData.mapLink)) {
            toast.error("Format error: Please copy the link from Google Maps");
            return false;
        }
        return true;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Fields we want to force to UPPERCASE for professional look
        const upperFields = ["gstNumber", "companyName", "ownerName"];
        setFormData(prev => ({
            ...prev,
            [name]: upperFields.includes(name) ? value.toUpperCase() : value
        }));
    };

    const handleLogin = async () => {
        if (!validatePhone(formData.phone)) return toast.error("Enter a valid 10-digit phone");
        setLoading(true);
        try {
            const { data, error } = await supabase.from("wholesale_users").select("*").eq("phone", formData.phone).maybeSingle();
            if (error) throw error;
            if (!data) return toast.error("Mobile number not registered");
            if (data.status !== "approved") return toast.error(`Account Status: ${data.status.toUpperCase()}`);

            localStorage.setItem("wholesale_user", JSON.stringify(data));
            window.dispatchEvent(new Event("wholesale_login"));
            onClose();
            router.push("/Wholesale/home");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!checkStep3()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from("wholesale_users").insert([{ 
                email: formData.email.toLowerCase(),
                phone: formData.phone,
                company_name: formData.companyName,
                gst_number: formData.gstNumber || null,
                owner_name: formData.ownerName,
                owner_dob: formData.ownerDob || null,
                registered_address: formData.regAddress,
                shop_address: formData.shopAddress,
                google_maps_link: formData.mapLink,
                status: "pending" 
            }]).select("business_id").single();

            if (error) throw error;
            setGeneratedId(data.business_id);
            setIsSubmitted(true);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-4xl flex rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* LEFT: BRAND SECTION */}
                <div className="hidden lg:flex w-[35%] relative bg-slate-900">
                    <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600" alt="Grocery" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-red-900/90 via-transparent to-transparent" />
                    <div className="absolute bottom-8 left-8 text-white">
                        <h3 className="text-xl font-black uppercase tracking-tighter leading-tight">Jumbo Star</h3>
                        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Wholesale Channel</p>
                    </div>
                </div>

                {/* RIGHT: FORM SECTION */}
                <div className="flex-1 flex flex-col bg-white">
                    <button onClick={onClose} className="absolute right-4 top-4 p-1.5 text-slate-300 hover:text-red-600 transition-all"><X size={20} /></button>

                    <div className="p-6 md:p-8 flex flex-col h-full max-h-[90vh] overflow-y-auto">
                        <div className="mb-4">
                            <Image src="/logo.png" alt="Logo" width={70} height={30} className="mb-2 object-contain" />
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{isLogin ? "Partner Login" : "Registration"}</h2>
                        </div>

                        {isSubmitted ? (
                            <div className="text-center py-6 space-y-4">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto"><CheckCircle2 size={32} /></div>
                                <p className="text-sm font-bold text-slate-600 text-balance">Your application is being reviewed.</p>
                                <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed">
                                    <span className="text-[9px] text-slate-400 font-black">APPLICATION ID</span>
                                    <p className="text-lg font-black text-slate-900 tracking-wider">{generatedId}</p>
                                </div>
                                <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px]">Close Window</button>
                            </div>
                        ) : (
                            <div className="space-y-3 flex-1">
                                {isLogin ? (
                                    <>
                                        <Input name="phone" icon={<Phone size={16} />} type="tel" placeholder="Registered Mobile Number" onChange={handleChange} value={formData.phone} maxLength={10} />
                                        <button onClick={handleLogin} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-colors">
                                            {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Authorize Access"}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex gap-1 mb-3">
                                            {[1, 2, 3].map((i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${step >= i ? "bg-red-600" : "bg-slate-100"}`} />)}
                                        </div>

                                        {step === 1 && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
                                                <Input name="email" icon={<Mail size={16} />} type="email" placeholder="Email Address" onChange={handleChange} value={formData.email} />
                                                <Input name="phone" icon={<Phone size={16} />} type="tel" placeholder="Phone Number" onChange={handleChange} value={formData.phone} maxLength={10} />
                                                <button onClick={() => checkStep1() && setStep(2)} className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-200">Next: Business Info</button>
                                            </div>
                                        )}

                                        {step === 2 && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
                                                <Input name="companyName" icon={<Building2 size={16} />} type="text" placeholder="Shop / Company Name" onChange={handleChange} value={formData.companyName} />
                                                <Input name="gstNumber" icon={<CheckCircle2 size={16} />} type="text" placeholder="GST Number (Optional)" onChange={handleChange} value={formData.gstNumber} maxLength={15} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input name="ownerName" icon={<User size={16} />} type="text" placeholder="Owner Name" onChange={handleChange} value={formData.ownerName} />
                                                    <Input name="ownerDob" icon={<User size={16} />} type="date" placeholder="DOB" onChange={handleChange} value={formData.ownerDob} />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setStep(1)} className="p-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"><ArrowLeft size={16}/></button>
                                                    <button onClick={() => checkStep2() && setStep(3)} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-200">Next: Location Details</button>
                                                </div>
                                            </div>
                                        )}

                                        {step === 3 && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-right-2">
                                                <textarea name="regAddress" onChange={handleChange} value={formData.regAddress} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-bold text-[10px] h-16 resize-none focus:border-slate-300 transition-all" placeholder="REGISTERED OFFICE ADDRESS *" />
                                                <textarea name="shopAddress" onChange={handleChange} value={formData.shopAddress} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-bold text-[10px] h-16 resize-none focus:border-slate-300 transition-all" placeholder="SHOP / DELIVERY ADDRESS *" />
                                                <Input name="mapLink" icon={<Globe size={16} />} type="text" placeholder="PASTE GOOGLE MAPS LINK HERE" onChange={handleChange} value={formData.mapLink} />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setStep(2)} className="p-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"><ArrowLeft size={16}/></button>
                                                    <button onClick={handleRegister} disabled={loading} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] hover:bg-black transition-colors">
                                                        {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Submit Application"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest mt-6">
                                    {isLogin ? "Not a Wholesale Partner?" : "Already Have an Account?"}
                                    <button onClick={() => { setIsLogin(!isLogin); setStep(1); }} className="ml-2 text-red-600 hover:underline">{isLogin ? "Apply Now" : "Login"}</button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Input({ icon, ...props }: any) {
    return (
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
            <input {...props} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 focus:border-red-500/20 rounded-xl outline-none font-bold text-xs text-slate-900 transition-all placeholder:text-slate-400" />
        </div>
    );
}