"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserPlus, Truck, Loader2, CheckCircle2, MapPin, Phone, Hash, ShieldCheck, package as PackageIcon } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function DeliveryManagement() {
    const [activeTab, setActiveTab] = useState<"register" | "assign">("register");
    const [loading, setLoading] = useState(false);
    
    // Form & Data State
    const [formData, setFormData] = useState({ name: "", phone: "", vehicle: "", aadhar: "" });
    const [deliveryStaff, setDeliveryStaff] = useState<any[]>([]);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [activeShipments, setActiveShipments] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState("");
    const [selectedStaff, setSelectedStaff] = useState("");

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        // Fetch active riders
        const { data: staff } = await supabase.from("delivery_persons").select("*").eq("status", "active");
        
        // Fetch orders waiting for assignment
        const { data: pending } = await supabase.from("orders")
            .select("*")
            .eq("order_status", "processing")
            .is("delivery_person_id", null);
        
        // Fetch orders already assigned (joined with delivery_persons table)
        const { data: active } = await supabase.from("orders")
            .select(`
                *,
                delivery_persons (
                    name,
                    vehicle_number,
                    phone_number
                )
            `)
            .eq("order_status", "out_for_delivery");

        setDeliveryStaff(staff || []);
        setPendingOrders(pending || []);
        setActiveShipments(active || []);
        setLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from("delivery_persons").insert([{
            name: formData.name,
            phone_number: formData.phone,
            vehicle_number: formData.vehicle,
            aadhar_number: formData.aadhar
        }]);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Personnel Added to Fleet!");
            setFormData({ name: "", phone: "", vehicle: "", aadhar: "" });
            fetchData();
        }
        setLoading(false);
    };

    const handleAssign = async () => {
        if (!selectedOrder || !selectedStaff) return toast.error("Select Order & Rider");
        
        setLoading(true);
        const { error } = await supabase.from("orders")
            .update({ 
                delivery_person_id: selectedStaff,
                order_status: "out_for_delivery" 
            })
            .eq("id", selectedOrder);

        if (error) {
            toast.error("Allocation failed");
        } else {
            toast.success("Rider Dispatched!");
            setSelectedOrder("");
            fetchData();
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <Toaster position="top-right" />
            
            {/* Header */}
            <div className="bg-white border-b border-slate-100 pt-12 pb-8 px-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">Fleet Console</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <ShieldCheck size={14} className="text-red-600" />
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Authorized Logistics Access Only</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-10 bg-slate-100 p-1 rounded-2xl w-fit">
                        <button onClick={() => setActiveTab("register")} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "register" ? "bg-white text-red-600 shadow-sm" : "text-slate-500"}`}>
                            Rider Intake
                        </button>
                        <button onClick={() => setActiveTab("assign")} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "assign" ? "bg-white text-red-600 shadow-sm" : "text-slate-500"}`}>
                            Dispatch & Tracking
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 mt-8">
                {activeTab === "register" ? (
                    /* REGISTRATION FORM */
                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm max-w-2xl">
                        <form onSubmit={handleRegister} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { label: "Full Name", val: "name", icon: <UserPlus size={14}/> },
                                    { label: "Phone", val: "phone", icon: <Phone size={14}/> },
                                    { label: "Vehicle ID", val: "vehicle", icon: <Truck size={14}/> },
                                    { label: "Aadhar Num", val: "aadhar", icon: <Hash size={14}/> }
                                ].map((field) => (
                                    <div key={field.val}>
                                        <label className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 mb-3 ml-1 tracking-widest">
                                            {field.icon} {field.label}
                                        </label>
                                        <input required type="text" value={(formData as any)[field.val]} onChange={(e) => setFormData({...formData, [field.val]: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-red-500 transition-all" />
                                    </div>
                                ))}
                            </div>
                            <button disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-red-600 transition-all shadow-xl shadow-slate-200">
                                {loading ? "Processing..." : "Register Personnel"}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* ALLOCATION & TRACKING */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Assignment Side */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                <h3 className="text-[11px] font-black uppercase text-slate-900 mb-6 flex items-center gap-2">
                                    <MapPin size={16} className="text-red-600" /> New Dispatch
                                </h3>
                                <div className="space-y-4">
                                    <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold">
                                        <option value="">Select Order</option>
                                        {pendingOrders.map(o => <option key={o.id} value={o.id}>{o.order_id_custom} (₹{o.total_payable_amount})</option>)}
                                    </select>
                                    <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold">
                                        <option value="">Select Rider</option>
                                        {deliveryStaff.map(s => <option key={s.id} value={s.id}>{s.name} - {s.vehicle_number}</option>)}
                                    </select>
                                    <button onClick={handleAssign} disabled={loading} className="w-full bg-red-600 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-4">
                                        Assign & Dispatch
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Allocated/Active List Side */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                    <h3 className="text-[11px] font-black uppercase text-slate-900">Active Shipments ({activeShipments.length})</h3>
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                                
                                <div className="divide-y divide-slate-50">
                                    {activeShipments.length > 0 ? activeShipments.map((ship) => (
                                        <div key={ship.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex flex-wrap justify-between items-start gap-4">
                                                <div>
                                                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase mb-2 inline-block">
                                                        {ship.order_id_custom}
                                                    </span>
                                                    <p className="text-xs font-bold text-slate-500 truncate max-w-xs">{ship.address_snapshot}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-900 uppercase">{ship.delivery_persons?.name}</p>
                                                    <p className="text-[9px] font-bold text-red-600 uppercase mt-0.5">{ship.delivery_persons?.vehicle_number}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-20 text-center">
                                            <Truck className="mx-auto text-slate-200 mb-4" size={40} />
                                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">No orders currently on road</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}