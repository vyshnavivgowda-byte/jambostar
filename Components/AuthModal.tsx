"use client";

import { useState, useEffect } from "react";
import { X, Mail, Lock, User, ArrowRight, ArrowLeft, Building2, CheckCircle2, Phone, Globe, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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

    // --- VALIDATION HELPERS ---
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);
    const validateGST = (gst: string) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const upperFields = ["gstNumber", "firstName", "lastName", "companyName"];
        setFormData(prev => ({
            ...prev,
            [name]: upperFields.includes(name) ? value.toUpperCase() : value
        }));
    };

    // --- CHECK DUPLICATE EMAIL (Step 1) ---
    const handleNextToStep2 = async () => {
        setCheckingEmail(true);
        try {
            const { data, error } = await supabase
                .from('wholesale_users')
                .select('email')
                .eq('email', formData.email.toLowerCase())
                .maybeSingle();

            if (data) {
                toast.error("This email is already registered.");
                return;
            }
            setStep(2);
        } catch (err) {
            toast.error("Connection error. Try again.");
        } finally {
            setCheckingEmail(false);
        }
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

            // --- ADD THIS PART ---
            localStorage.setItem("wholesale_user", JSON.stringify(data));
            // Trigger the custom event so the Header updates immediately
            window.dispatchEvent(new Event("wholesale_login"));

            toast.success("Welcome back!");
            onClose();
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
    const isStep1Valid = validateEmail(formData.email) && validatePhone(formData.phone) && formData.password.length >= 6 && (formData.password === formData.confirmPassword);
    const isStep2Valid = formData.companyName.length > 3 && formData.gstNumber.length === 15 && formData.firstName && formData.lastName;
    const isStep3Valid = formData.regAddress.length > 10 && formData.shopAddress.length > 10 && formData.mapLink.startsWith("https://");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
                <button onClick={onClose} className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-900 z-10 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>

                <div className="p-8 md:p-10">
                    <div className="text-center mb-8">
                        <Image src="/logo.png" alt="Logo" width={100} height={40} className="mx-auto mb-6" />

                        {isSubmitted ? (
                            <div className="space-y-6 py-4 animate-in fade-in zoom-in duration-300">
                                <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
                                    <CheckCircle2 size={40} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">Application Sent</h2>
                                    <p className="text-slate-500 text-sm mt-2 leading-relaxed px-4">Our team is reviewing your business details. Verification usually completes within <b>24 hours</b>.</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business ID Reference</p>
                                    <p className="text-3xl font-black text-red-600 tracking-tighter">{generatedId}</p>
                                </div>
                                <div className="space-y-3 pt-4">
                                    <button onClick={() => { setIsSubmitted(false); setIsLogin(true); setStep(1); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-red-600 transition-all shadow-lg shadow-slate-200">
                                        Back to Login
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {isLogin ? "Partner Login" : `Registration`}
                                </h2>
                                {isLogin ? (
                                    <p className="text-red-600 font-black text-sm uppercase tracking-widest mt-1">Jumbo Star Wholesale</p>
                                ) : (
                                    <div className="flex gap-2 mt-4 max-w-[160px] mx-auto">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? "bg-red-600" : "bg-slate-100"}`} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!isSubmitted && (
                        <div className="space-y-4">
                            {isLogin ? (
                                <div className="space-y-4 animate-in fade-in duration-500">
                                    <Input name="email" icon={<Mail size={18} />} type="email" placeholder="Business Email" onChange={handleChange} value={formData.email} />
                                    <Input name="password" icon={<Lock size={18} />} type="password" placeholder="Password" onChange={handleChange} value={formData.password} />
                                    <button onClick={handleLogin} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-300">
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In to Dashboard"}
                                    </button>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    {step === 1 && (
                                        <div className="space-y-4">
                                            <Input name="email" icon={<Mail size={18} />} type="email" placeholder="Work Email Address *" onChange={handleChange} value={formData.email} />
                                            <Input name="phone" icon={<Phone size={18} />} type="tel" placeholder="Mobile Number (India) *" onChange={handleChange} value={formData.phone} maxLength={10} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input name="password" icon={<Lock size={18} />} type="password" placeholder="Create Password *" onChange={handleChange} value={formData.password} />
                                                <Input name="confirmPassword" icon={<Lock size={18} />} type="password" placeholder="Confirm Password *" onChange={handleChange} value={formData.confirmPassword} />
                                            </div>
                                            <button disabled={!isStep1Valid || checkingEmail} onClick={handleNextToStep2} className="w-full py-4 bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100">
                                                {checkingEmail ? <Loader2 className="animate-spin" size={20} /> : <>Next Step <ArrowRight size={18} /></>}
                                            </button>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-4">
                                            <Input name="companyName" icon={<Building2 size={18} />} type="text" placeholder="Legal Entity Name (GST Registered) *" onChange={handleChange} value={formData.companyName} />
                                            <Input name="gstNumber" icon={<CheckCircle2 size={18} />} type="text" placeholder="15-Digit GSTIN *" onChange={handleChange} value={formData.gstNumber} maxLength={15} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input name="firstName" icon={<User size={18} />} type="text" placeholder="Owner First Name *" onChange={handleChange} value={formData.firstName} />
                                                <Input name="lastName" icon={<User size={18} />} type="text" placeholder="Owner Last Name *" onChange={handleChange} value={formData.lastName} />
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => setStep(1)} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"><ArrowLeft size={20} /></button>
                                                <button disabled={!isStep2Valid} onClick={() => setStep(3)} className="flex-1 py-4 bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black shadow-lg shadow-red-100">Continue</button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-4">
                                            <textarea name="regAddress" onChange={handleChange} value={formData.regAddress} className="w-full p-5 bg-slate-50 border-2 border-slate-100 focus:border-red-500/30 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm h-24 text-slate-900 placeholder:text-slate-400 transition-all" placeholder="Registered Office Address (as per GST) *" />
                                            <textarea name="shopAddress" onChange={handleChange} value={formData.shopAddress} className="w-full p-5 bg-slate-50 border-2 border-slate-100 focus:border-red-500/30 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm h-24 text-slate-900 placeholder:text-slate-400 transition-all" placeholder="Shop / Delivery Location Address *" />
                                            <Input name="mapLink" icon={<Globe size={18} />} type="url" placeholder="Google Maps Link *" onChange={handleChange} value={formData.mapLink} />

                                            <div className="flex gap-3">
                                                <button onClick={() => setStep(2)} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"><ArrowLeft size={20} /></button>
                                                <button disabled={!isStep3Valid || loading} onClick={handleRegister} className="flex-1 py-4 bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black shadow-xl shadow-slate-200">
                                                    {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Complete Registration"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <p className="text-center mt-8 text-[13px] font-bold text-slate-400 uppercase tracking-widest">
                                {isLogin ? "Not a partner yet?" : "Already a business partner?"}
                                <button onClick={() => { setIsLogin(!isLogin); setStep(1); }} className="ml-2 text-red-600 hover:text-red-700 transition-colors">
                                    {isLogin ? "Apply Now" : "Sign In"}
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
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors">{icon}</div>
            <input
                {...props}
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-red-500/30 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400"
            />
        </div>
    );
}