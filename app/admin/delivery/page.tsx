"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
    UserPlus, Truck, Loader2, MapPin, Phone, 
    Hash, ShieldCheck, Package as PackageIcon 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function DeliveryManagement() {
    const [activeTab, setActiveTab] = useState<"register" | "assign">("register");
    const [loading, setLoading] = useState(false);
    
    // Data State
    const [formData, setFormData] = useState({ name: "", phone: "", vehicle: "", aadhar: "" });
    const [deliveryStaff, setDeliveryStaff] = useState<any[]>([]);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [activeShipments, setActiveShipments] = useState<any[]>([]);
    
    // Selection State
    const [selectedOrder, setSelectedOrder] = useState("");
    const [selectedStaff, setSelectedStaff] = useState("");

    // UseCallback to prevent unnecessary re-renders
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch active riders
            const { data: staff, error: staffErr } = await supabase
                .from("delivery_persons")
                .select("*")
                .eq("status", "active");
            if (staffErr) throw staffErr;

            // 2. Fetch orders waiting for assignment (processing & no rider assigned)
            const { data: pending, error: pendingErr } = await supabase
                .from("orders")
                .select("*")
                .eq("order_status", "processing")
                .is("delivery_person_id", null);
            if (pendingErr) throw pendingErr;

            // 3. Fetch active shipments (Joined with rider info)
            const { data: active, error: activeErr } = await supabase
                .from("orders")
                .select(`
                    *,
                    delivery_persons (
                        name,
                        vehicle_number,
                        phone_number
                    )
                `)
                .eq("order_status", "out_for_delivery");
            if (activeErr) throw activeErr;

            setDeliveryStaff(staff || []);
            setPendingOrders(pending || []);
            setActiveShipments(active || []);
        } catch (error: any) {
            toast.error(error.message || "Data fetch failed");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, activeTab]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from("delivery_persons").insert([{
            name: formData.name,
            phone_number: formData.phone,
            vehicle_number: formData.vehicle,
            aadhar_number: formData.aadhar,
            status: 'active'
        }]);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("New Rider Added to Fleet");
            setFormData({ name: "", phone: "", vehicle: "", aadhar: "" });
            fetchData();
        }
        setLoading(false);
    };

    const handleAssign = async () => {
        if (!selectedOrder || !selectedStaff) return toast.error("Please select both Order and Rider");
        
        setLoading(true);
        const { error } = await supabase.from("orders")
            .update({ 
                delivery_person_id: selectedStaff,
                order_status: "out_for_delivery",
                updated_at: new Date().toISOString()
            })
            .eq("id", selectedOrder);

        if (error) {
            toast.error("Dispatch failed: " + error.message);
        } else {
            toast.success("Rider Dispatched successfully!");
            setSelectedOrder("");
            fetchData();
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <Toaster position="top-right" />
            
            {/* Header Section */}
            <div className="bg-white border-b border-slate-100 pt-12 pb-8 px-6 shadow-sm">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter italic">Logistics Control</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Live Fleet & Dispatch Management</p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 mt-10 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
                        <button 
                            onClick={() => setActiveTab("register")} 
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === "register" ? "bg-white text-red-600 shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Rider Registration
                        </button>
                        <button 
                            onClick={() => setActiveTab("assign")} 
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === "assign" ? "bg-white text-red-600 shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Dispatch Center
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 mt-8">
                {activeTab === "register" ? (
                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm max-w-2xl animate-in fade-in slide-in-from-bottom-4">
                        <form onSubmit={handleRegister} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { label: "Rider Name", val: "name", icon: <UserPlus size={14}/>, placeholder: "John Doe" },
                                    { label: "Phone Number", val: "phone", icon: <Phone size={14}/>, placeholder: "+91..." },
                                    { label: "Vehicle Number", val: "vehicle", icon: <Truck size={14}/>, placeholder: "KA-01-..." },
                                    { label: "Aadhar Number", val: "aadhar", icon: <Hash size={14}/>, placeholder: "0000 0000 0000" }
                                ].map((field) => (
                                    <div key={field.val}>
                                        <label className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 mb-3 ml-1 tracking-widest">
                                            {field.icon} {field.label}
                                        </label>
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder={field.placeholder}
                                            value={(formData as any)[field.val]} 
                                            onChange={(e) => setFormData({...formData, [field.val]: e.target.value})} 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all" 
                                        />
                                    </div>
                                ))}
                            </div>
                            <button disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-red-600 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3">
                                {loading ? <Loader2 className="animate-spin" size={16}/> : "Activate New Rider"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                        
                        {/* Dispatch Control */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm sticky top-24">
                                <h3 className="text-[11px] font-black uppercase text-slate-900 mb-6 flex items-center gap-2">
                                    <PackageIcon size={16} className="text-red-600" /> Dispatch Order
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[8px] font-black uppercase text-slate-400 mb-2 block ml-1">Select Pending Order</label>
                                        <select 
                                            value={selectedOrder} 
                                            onChange={(e) => setSelectedOrder(e.target.value)} 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none"
                                        >
                                            <option value="">Choose Order ID...</option>
                                            {pendingOrders.map(o => (
                                                <option key={o.id} value={o.id}>{o.order_id_custom} (₹{o.total_payable_amount})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[8px] font-black uppercase text-slate-400 mb-2 block ml-1">Assign To Rider</label>
                                        <select 
                                            value={selectedStaff} 
                                            onChange={(e) => setSelectedStaff(e.target.value)} 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none"
                                        >
                                            <option value="">Select Available Rider...</option>
                                            {deliveryStaff.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.vehicle_number})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button 
                                        onClick={handleAssign} 
                                        disabled={loading || !selectedOrder || !selectedStaff} 
                                        className="w-full bg-red-600 disabled:bg-slate-200 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-4 hover:bg-slate-900 transition-all shadow-lg shadow-red-100"
                                    >
                                        {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : "Initialize Delivery"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Live Tracking List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                                <div className="px-8 py-7 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-wider">Live Shipments</h3>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">{activeShipments.length} currently out for delivery</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">System Live</span>
                                    </div>
                                </div>
                                
                                <div className="divide-y divide-slate-50">
                                    {activeShipments.length > 0 ? activeShipments.map((ship) => (
                                        <div key={ship.id} className="p-8 hover:bg-slate-50/30 transition-colors group">
                                            <div className="flex flex-wrap justify-between items-center gap-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                                        <Truck size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-black text-slate-900 uppercase">{ship.order_id_custom}</span>
                                                            <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md uppercase">On Route</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <MapPin size={12} />
                                                            <p className="text-[10px] font-bold truncate max-w-[200px] md:max-w-xs italic">{ship.address_snapshot}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="text-right border-l border-slate-100 pl-6">
                                                    <p className="text-[10px] font-black text-slate-900 uppercase mb-1 tracking-tight">{ship.delivery_persons?.name}</p>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md uppercase">{ship.delivery_persons?.vehicle_number}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-24 text-center">
                                            <div className="bg-slate-50 w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                                <Truck className="text-slate-200" size={32} />
                                            </div>
                                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Fleet Currently Idle</p>
                                            <p className="text-slate-300 text-[9px] mt-2 font-bold uppercase tracking-widest">Awaiting dispatch orders</p>
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