"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    UserPlus, Truck, Loader2, Phone,
    Hash, Package as PackageIcon,
    ChevronRight, UserCircle, Search, X, Edit3, Trash2
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function DeliveryManagement() {
    const [activeTab, setActiveTab] = useState<"register" | "assign">("assign");
    const [loading, setLoading] = useState(false);
    const [editRiderId, setEditRiderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({ name: "", phone: "", vehicle: "", aadhar: "" });
    
    // Assignment States
    const [selectedOrder, setSelectedOrder] = useState("");
    const [selectedStaff, setSelectedStaff] = useState("");
    const [editShipment, setEditShipment] = useState<string | null>(null);
    const [newRider, setNewRider] = useState("");

    // Data States
    const [deliveryStaff, setDeliveryStaff] = useState<any[]>([]);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [activeShipments, setActiveShipments] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: staff } = await supabase.from("delivery_persons").select("*").order('created_at', { ascending: false });
            const { data: pending } = await supabase.from("orders").select("*").eq("order_status", "processing").is("delivery_person_id", null);
            const { data: active } = await supabase.from("orders").select(`*, delivery_persons (name, vehicle_number, phone_number)`).eq("order_status", "out_for_delivery");

            setDeliveryStaff(staff || []);
            setPendingOrders(pending || []);
            setActiveShipments(active || []);
        } catch (error: any) {
            toast.error("Sync Error: " + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const validateRegistration = () => {
        const { name, phone, vehicle, aadhar } = formData;
        if (name.length < 3) return "Name must be at least 3 characters.";
        if (!/^[6-9]\d{9}$/.test(phone)) return "Enter a valid 10-digit phone number.";
        if (vehicle.length < 5) return "Enter a valid vehicle number.";
        if (!/^\d{12}$/.test(aadhar)) return "ID must be exactly 12 digits.";
        return null;
    };

    const handleRegisterOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const errorMsg = validateRegistration();
        if (errorMsg) return toast.error(errorMsg);

        setLoading(true);
        const payload = {
            name: formData.name,
            phone_number: formData.phone,
            vehicle_number: formData.vehicle,
            aadhar_number: formData.aadhar,
            status: 'active'
        };

        let result;
        if (editRiderId) {
            result = await supabase.from("delivery_persons").update(payload).eq("id", editRiderId);
        } else {
            result = await supabase.from("delivery_persons").insert([payload]);
        }

        if (result.error) {
            toast.error(result.error.message);
        } else {
            toast.success(editRiderId ? "Rider Details Updated" : "Rider Onboarded Successfully");
            setFormData({ name: "", phone: "", vehicle: "", aadhar: "" });
            setEditRiderId(null);
            fetchData();
        }
        setLoading(false);
    };

    const handleAssign = async () => {
        if (!selectedOrder || !selectedStaff) return toast.error("Select both order and rider");
        setLoading(true);
        const { error } = await supabase
            .from("orders")
            .update({ 
                delivery_person_id: selectedStaff, 
                order_status: "out_for_delivery",
                dispatched_at: new Date().toISOString()
            })
            .eq("id", selectedOrder);

        if (error) toast.error(error.message);
        else {
            toast.success("Shipment Dispatched!");
            setSelectedOrder("");
            setSelectedStaff("");
            fetchData();
        }
        setLoading(false);
    };

    const updateRider = async (orderId: string) => {
        if (!newRider) return toast.error("Select a new rider");
        const { error } = await supabase.from("orders").update({ delivery_person_id: newRider }).eq("id", orderId);
        if (error) toast.error(error.message);
        else {
            toast.success("Rider Updated");
            setEditShipment(null);
            fetchData();
        }
    };

    const removeRider = async (orderId: string) => {
        const { error } = await supabase.from("orders").update({ delivery_person_id: null, order_status: "processing" }).eq("id", orderId);
        if (error) toast.error(error.message);
        else {
            toast.success("Shipment Aborted");
            fetchData();
        }
    };

    const handleDeleteRider = async (id: string) => {
        if (!confirm("Are you sure you want to remove this rider?")) return;
        setLoading(true);
        const { error } = await supabase.from("delivery_persons").delete().eq("id", id);
        if (error) toast.error("Cannot delete rider with active history");
        else {
            toast.success("Rider removed from fleet");
            fetchData();
        }
        setLoading(false);
    };

    const startEdit = (rider: any) => {
        setEditRiderId(rider.id);
        setFormData({
            name: rider.name,
            phone: rider.phone_number,
            vehicle: rider.vehicle_number,
            aadhar: rider.aadhar_number
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            <Toaster position="top-right" />

            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Logistics Manager</h1>
                    </div>
                    <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button onClick={() => setActiveTab("assign")} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === "assign" ? "bg-white text-red-600 shadow-sm" : "text-slate-500"}`}>Dispatch</button>
                        <button onClick={() => setActiveTab("register")} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === "register" ? "bg-white text-red-600 shadow-sm" : "text-slate-500"}`}>Rider Fleet</button>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === "register" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* LEFT: FORM */}
                        <div className="lg:col-span-5 sticky top-28">
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="font-black text-xl uppercase tracking-tight">
                                        {editRiderId ? "Edit Rider Details" : "Onboard New Rider"}
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500">Provide details for fleet verification.</p>
                                </div>
                                <form onSubmit={handleRegisterOrUpdate} className="p-8 space-y-5">
                                    {[
                                        { label: "Full Name", val: "name", icon: <UserPlus size={16} /> },
                                        { label: "Phone Number", val: "phone", icon: <Phone size={16} /> },
                                        { label: "Vehicle Number", val: "vehicle", icon: <Truck size={16} /> },
                                        { label: "ID Number", val: "aadhar", icon: <Hash size={16} /> }
                                    ].map((field) => (
                                        <div key={field.val}>
                                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">{field.label}</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{field.icon}</span>
                                                <input 
                                                    type="text" 
                                                    value={(formData as any)[field.val]} 
                                                    onChange={(e) => setFormData({ ...formData, [field.val]: e.target.value })} 
                                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-red-500 outline-none transition-all" 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-3 pt-2">
                                        <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-100">
                                            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : (editRiderId ? "Update Info" : "Register Rider")}
                                        </button>
                                        {editRiderId && (
                                            <button type="button" onClick={() => { setEditRiderId(null); setFormData({ name: "", phone: "", vehicle: "", aadhar: "" }); }} className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase">Cancel</button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT: LIST */}
                        <div className="lg:col-span-7">
                            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase tracking-widest">Active Fleet ({deliveryStaff.length})</h3>
                                    <Search size={18} className="text-slate-300" />
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {deliveryStaff.map((rider) => (
                                        <div key={rider.id} className="p-6 hover:bg-slate-50 transition-all flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                                                    <UserCircle size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase">{rider.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Truck size={12}/> {rider.vehicle_number}</span>
                                                        <span className="text-slate-200">|</span>
                                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Phone size={12}/> {rider.phone_number}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => startEdit(rider)} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteRider(rider.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {deliveryStaff.length === 0 && (
                                        <div className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No Riders Registered</div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
              
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT: Assignment Card */}
                        <div className="lg:col-span-4">
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sticky top-28">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><PackageIcon size={20} /></div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Quick Assign</h3>
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Select Order</label>
                                        <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-xs font-bold focus:ring-4 focus:ring-red-500/5 focus:border-red-500 outline-none transition-all appearance-none">
                                            <option value="">Choose Pending Order...</option>
                                            {pendingOrders.map(o => <option key={o.id} value={o.id}>{o.order_id_custom} — ₹{o.total_payable_amount}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex justify-center py-1">
                                        <div className="bg-slate-100 p-2 rounded-full"><ChevronRight className="text-slate-400 rotate-90 lg:rotate-0" size={18} /></div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Select Rider</label>
                                        <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-xs font-bold focus:ring-4 focus:ring-red-500/5 focus:border-red-500 outline-none transition-all appearance-none">
                                            <option value="">Select Available Rider...</option>
                                            {deliveryStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.vehicle_number})</option>)}
                                        </select>
                                    </div>

                                    <button onClick={handleAssign} disabled={loading} className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest mt-4 transition-all flex items-center justify-center gap-2">
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Dispatch Now"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Active List */}
                        <div className="lg:col-span-8">
                            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                                <div className="px-8 py-8 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div>
                                        <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest">Live Shipments</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1">{activeShipments.length} Active in Transit</p>
                                    </div>
                                    
                                    <div className="relative w-full md:w-80">
                                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text"
                                            placeholder="Search Order or Rider..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-10 py-3 text-xs font-bold focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none transition-all"
                                        />
                                        {searchTerm && (
                                            <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {activeShipments
                                        .filter(ship => 
                                            ship.order_id_custom?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                            ship.delivery_persons?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).length > 0 ? (
                                        activeShipments
                                            .filter(ship => 
                                                ship.order_id_custom?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                ship.delivery_persons?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                                            ).map((ship) => (
                                            <div key={ship.id} className="p-6 hover:bg-slate-50/50 transition-all group">
                                                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                                                    <div className="flex items-center gap-5 flex-1">
                                                        <div className="h-14 w-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-slate-200">
                                                            <Truck size={22} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{ship.order_id_custom}</span>
                                                                <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md uppercase tracking-widest">In Transit</span>
                                                            </div>
                                                            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 mt-1.5">
                                                                <UserCircle size={14} className="text-red-500" /> 
                                                                <span className="text-slate-700">{ship.delivery_persons?.name || "Unassigned"}</span>
                                                                <span className="text-slate-300 mx-1">|</span>
                                                                <span className="text-slate-400 uppercase">{ship.delivery_persons?.vehicle_number}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => { setEditShipment(ship.id); setNewRider(ship.delivery_person_id); }}
                                                            className="px-5 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                        >
                                                            Update Rider
                                                        </button>
                                                        <button
                                                            onClick={() => { if (confirm("Abort shipment and return to pending?")) removeRider(ship.id); }}
                                                            className="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                                                        >
                                                            Abort
                                                        </button>
                                                    </div>
                                                </div>

                                                {editShipment === ship.id && (
                                                    <div className="mt-5 p-6 bg-slate-900 rounded-3xl flex flex-col sm:flex-row gap-3 animate-in fade-in zoom-in-95 duration-200">
                                                        <select
                                                            value={newRider}
                                                            onChange={(e) => setNewRider(e.target.value)}
                                                            className="flex-1 bg-slate-800 border-none text-white px-4 py-3 rounded-2xl text-xs font-bold outline-none ring-1 ring-slate-700"
                                                        >
                                                            <option value="">Choose New Personnel...</option>
                                                            {deliveryStaff.map((s) => (
                                                                <option key={s.id} value={s.id}>{s.name} ({s.vehicle_number})</option>
                                                            ))}
                                                        </select>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => updateRider(ship.id)} className="px-6 py-3 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 transition-all">Save Changes</button>
                                                            <button onClick={() => setEditShipment(null)} className="px-6 py-3 bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-600 transition-all">Cancel</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-32 text-center">
                                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <PackageIcon size={32} className="text-slate-200" />
                                            </div>
                                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">No active shipments found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}