"use client";

import { useState } from "react";
import { X, Mail, Lock, User, ArrowRight, ArrowLeft, Building2, CheckCircle2, Phone, Globe, Loader2 } from "lucide-react";
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
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [generatedId, setGeneratedId] = useState("");

    const [formData, setFormData] = useState({
        email: "", phone: "", password: "", confirmPassword: "",
        companyName: "", gstNumber: "", firstName: "", lastName: "",
        regAddress: "", shopAddress: "", mapLink: ""
    });

    if (!isOpen) return null;

    // --- HELPERS ---
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const upperFields = ["gstNumber", "firstName", "lastName", "companyName"];
        setFormData(prev => ({
            ...prev,
            [name]: upperFields.includes(name) ? value.toUpperCase() : value
        }));
    };

    const handleLogin = async () => {
        if (!validateEmail(formData.email)) return toast.error("Invalid email format");
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('wholesale_users')
                .select('*')
                .eq('email', formData.email.toLowerCase().trim())
                .eq('password_hash', formData.password)
                .single();

            if (error || !data) throw new Error("Invalid email or password");

            if (data.status === 'pending') {
                toast.error("Account Pending Verification");
                return;
            }

            // Save session
            localStorage.setItem("wholesale_user", JSON.stringify(data));
            window.dispatchEvent(new Event("wholesale_login"));

            toast.success("Login Successful");
            onClose();
            
            // Navigate to Wholesale Home
            router.push("/Wholesale/home");
            
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('wholesale_users')
                .insert([{
                    email: formData.email.toLowerCase(),
                    phone: formData.phone,
                    password_hash: formData.password,
                    company_name: formData.companyName,
                    gst_number: formData.gstNumber,
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    registered_address: formData.regAddress,
                    shop_address: formData.shopAddress,
                    google_maps_link: formData.mapLink,
                    status: 'pending'
                }])
                .select('business_id').single();

            if (error) throw error;
            setGeneratedId(data.business_id);
            setIsSubmitted(true);
            toast.success("Application submitted!");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Form Validators
    const isStep1Valid = validateEmail(formData.email) && validatePhone(formData.phone) && formData.password.length >= 6;
    const isStep2Valid = formData.companyName.length > 3 && formData.gstNumber.length === 15;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <Toaster position="top-center" />
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button onClick={onClose} className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-900 z-10 hover:bg-slate-100 rounded-full transition-all">
                    <X size={20} />
                </button>

                <div className="p-8 md:p-12">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <Image src="/logo.png" alt="Logo" width={120} height={50} className="mx-auto mb-6 object-contain" />
                        
                        {!isSubmitted && (
                            <>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                                    {isLogin ? "Partner Portal" : "Register Business"}
                                </h2>
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mt-2">
                                    Jumbo Star Wholesale
                                </p>
                            </>
                        )}
                    </div>

                    {isSubmitted ? (
                        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto rotate-3 shadow-lg shadow-emerald-100">
                                <CheckCircle2 size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Application Received</h3>
                                <p className="text-slate-500 text-sm mt-2 px-4 leading-relaxed">Our compliance team will review your GST details within 24 business hours.</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Reference ID</span>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter">{generatedId}</p>
                            </div>
                            <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all shadow-lg">
                                Close Window
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {isLogin ? (
                                <div className="space-y-4 animate-in fade-in duration-500">
                                    <Input name="email" icon={<Mail size={18} />} type="email" placeholder="Business Email" onChange={handleChange} value={formData.email} />
                                    <Input name="password" icon={<Lock size={18} />} type="password" placeholder="Password" onChange={handleChange} value={formData.password} />
                                    <button onClick={handleLogin} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-xl active:scale-95 disabled:bg-slate-300">
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Authorize Access"}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Progress Dots */}
                                    <div className="flex gap-2 justify-center mb-6">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${step >= i ? "bg-red-600" : "bg-slate-100"}`} />
                                        ))}
                                    </div>

                                    {step === 1 && (
                                        <div className="space-y-4 animate-in slide-in-from-right-4">
                                            <Input name="email" icon={<Mail size={18} />} type="email" placeholder="Work Email *" onChange={handleChange} value={formData.email} />
                                            <Input name="phone" icon={<Phone size={18} />} type="tel" placeholder="Mobile Number *" onChange={handleChange} value={formData.phone} maxLength={10} />
                                            <Input name="password" icon={<Lock size={18} />} type="password" placeholder="Create Password *" onChange={handleChange} value={formData.password} />
                                            <button disabled={!isStep1Valid} onClick={() => setStep(2)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                                Next Details <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-4 animate-in slide-in-from-right-4">
                                            <Input name="companyName" icon={<Building2 size={18} />} type="text" placeholder="Company Name (GST) *" onChange={handleChange} value={formData.companyName} />
                                            <Input name="gstNumber" icon={<CheckCircle2 size={18} />} type="text" placeholder="GSTIN Number *" onChange={handleChange} value={formData.gstNumber} maxLength={15} />
                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={() => setStep(1)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center"><ArrowLeft size={20} /></button>
                                                <button disabled={!isStep2Valid} onClick={() => setStep(3)} className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-50">Continue</button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-4 animate-in slide-in-from-right-4">
                                            <textarea name="shopAddress" onChange={handleChange} value={formData.shopAddress} className="w-full p-4 bg-slate-50 border-2 border-slate-100 focus:border-red-500/30 rounded-2xl outline-none font-bold text-sm h-28 resize-none" placeholder="Delivery / Shop Address *" />
                                            <Input name="mapLink" icon={<Globe size={18} />} type="url" placeholder="Google Maps Link *" onChange={handleChange} value={formData.mapLink} />
                                            <div className="flex gap-3">
                                                <button onClick={() => setStep(2)} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"><ArrowLeft size={20} /></button>
                                                <button onClick={handleRegister} disabled={loading} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2">
                                                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Submit Application"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Toggle Button */}
                            <p className="text-center mt-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                {isLogin ? "New Wholesale Partner?" : "Already Registered?"}
                                <button onClick={() => { setIsLogin(!isLogin); setStep(1); }} className="ml-2 text-red-600 hover:underline">
                                    {isLogin ? "Apply Here" : "Login Now"}
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Input({ icon, ...props }: any) {
    return (
        <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors">
                {icon}
            </div>
            <input
                {...props}
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-red-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400"
            />
        </div>
    );
}