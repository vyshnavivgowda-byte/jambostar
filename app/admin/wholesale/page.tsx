"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    CheckCircle2, XCircle, Eye, Loader2,
    MapPin, Building2, Phone, Mail, Globe, Hash,
    Users, Filter, ChevronRight, AlertCircle
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { Truck } from "lucide-react";
type Status = 'all' | 'pending' | 'approved' | 'rejected';

export default function WholesaleManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Status>('all');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showApproveInput, setShowApproveInput] = useState(false);
    const [transportCharge, setTransportCharge] = useState<number>(0);
    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("wholesale_users")
            .select("*")
            .order("created_at", { ascending: false });
        if (!error) setUsers(data);
        else toast.error("Failed to load records");
        setLoading(false);
    };

    const handleStatusUpdate = async (userId: string, newStatus: string) => {

        let updateData: any = {
            status: newStatus,
            updated_at: new Date()
        };

        if (newStatus === "approved") {
            updateData.transport_charge = transportCharge;
        }

        const { error } = await supabase
            .from("wholesale_users")
            .update(updateData)
            .eq("id", userId);

        if (error) toast.error("Update failed");
        else {
            toast.success(`User marked as ${newStatus}`);
            fetchUsers();
            setSelectedUser(null);
            setTransportCharge(0);
            setShowApproveInput(false);
        }
    };

    const filteredUsers = filter === 'all' ? users : users.filter(u => u.status === filter);
    const count = (status: Status) => status === 'all' ? users.length : users.filter(u => u.status === status).length;

    return (
        <div className="p-8 bg-[#FFF8F8] min-h-screen font-sans text-slate-900">
            <Toaster position="top-right" />

            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-red-600 p-1.5 rounded-lg text-white shadow-lg shadow-red-200">
                            <Users size={20} />
                        </div>
                        <span className="text-sm font-black text-red-600 uppercase tracking-[0.2em]">Admin Dashboard</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Wholesale <span className="text-red-600">Requests</span></h1>
                    <p className="text-slate-600 mt-2 text-lg font-medium">Verify and manage wholesale partner applications.</p>
                </div>

                {/* All Filter Tabs */}
                <div className="bg-white p-2 rounded-2xl shadow-md border border-red-50 flex flex-wrap gap-1">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-3 ${filter === s
                                ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                : 'text-slate-600 hover:bg-red-50 hover:text-red-600'
                                }`}
                        >
                            <span className="capitalize">{s}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] ${filter === s ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
                                }`}>
                                {count(s)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Table */}
            <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] border border-red-100 shadow-xl shadow-red-900/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-red-50/50 border-b border-red-100">
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700">Company / Tax ID</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700">Primary Contact</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700">Communication</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700">Status</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-red-600" size={40} /></td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="py-32 text-center text-slate-500 font-bold text-lg">No records found for "{filter}"</td></tr>
                            ) : filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-red-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900 uppercase text-base">{user.company_name}</div>
                                        <div className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                                            <Hash size={12} /> {user.gst_number || "NO GST"}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-800">{user.first_name} {user.last_name}</div>
                                        <div className="text-xs text-slate-500 font-medium">Joined {new Date(user.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-bold mb-1"><Mail size={14} className="text-red-400" /> {user.email}</div>
                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-bold"><Phone size={14} className="text-red-400" /> {user.phone}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            user.status === 'approved' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setSelectedUser(user)} className="p-3 bg-white border border-red-100 rounded-2xl text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm">
                                                <Eye size={18} />
                                            </button>
                                            {user.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowApproveInput(true);
                                                        }} className="p-3 bg-white border border-red-100 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                    <button onClick={() => handleStatusUpdate(user.id, 'rejected')} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                                        <XCircle size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Slide-over Detail View */}
            {selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-end transition-all">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl p-0 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Application Details</h2>
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition-colors"><XCircle /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="p-8 bg-red-400 rounded-[2.5rem] text-white shadow-2xl shadow-red-200 relative overflow-hidden">
                                <Building2 className="absolute right-[-10px] bottom-[-10px] text-white/10" size={120} />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Verified Business Name</p>
                                <h3 className="text-3xl font-black uppercase leading-tight">{selectedUser.company_name}</h3>
                                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl text-sm font-black border border-white/10">
                                    <Hash size={16} /> GST: {selectedUser.gst_number || "NOT PROVIDED"}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Owner</p>
                                    <p className="font-black text-slate-900 text-lg">{selectedUser.first_name} {selectedUser.last_name}</p>
                                </div>
                                <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">License ID</p>
                                    <p className="font-black text-slate-900 text-lg uppercase">{selectedUser.business_id || "Pending"}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <DetailItem icon={<Building2 className="text-red-600" />} label="Registered HQ Address" value={selectedUser.registered_address} />
                                <DetailItem icon={<MapPin className="text-red-600" />} label="Operational Warehouse" value={selectedUser.shop_address} />
                                <DetailItem
                                    icon={<Truck className="text-red-600" />}
                                    label="Transport Charge"
                                    value={`₹ ${selectedUser.transport_charge || 0}`}
                                /></div>

                            {selectedUser.google_maps_link && (
                                <a href={selectedUser.google_maps_link} target="_blank" className="flex items-center justify-between gap-3 w-full p-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl">
                                    <span className="flex items-center gap-3"><Globe size={20} /> Open in Maps</span>
                                    <ChevronRight size={20} />
                                </a>
                            )}
                        </div>

                        {selectedUser.status === 'pending' && (
                            <div className="p-8 bg-white border-t border-red-50 space-y-4">

                                {showApproveInput && (
                                    <div>
                                        <label className="text-xs font-black text-red-500 uppercase tracking-widest">
                                            Transport Charge (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={transportCharge}
                                            onChange={(e) => setTransportCharge(Number(e.target.value))}
                                            className="w-full mt-2 p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                            placeholder="Enter transport charge"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleStatusUpdate(selectedUser.id, 'rejected')}
                                        className="py-4 rounded-2xl font-black text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition-all"
                                    >
                                        Reject
                                    </button>

                                    <button
                                        onClick={() => handleStatusUpdate(selectedUser.id, 'approved')}
                                        className="py-4 rounded-2xl font-black bg-red-600 text-white shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                                    >
                                        Approve Partner
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailItem({ icon, label, value }: any) {
    return (
        <div className="flex gap-5 p-5 bg-white border border-red-50 rounded-3xl group hover:border-red-200 transition-all">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
            <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[15px] font-bold text-slate-800 leading-relaxed">{value || "Information not available"}</p>
            </div>
        </div>
    );
}