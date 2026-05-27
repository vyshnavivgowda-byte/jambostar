"use client";

import { useState, useMemo, useEffect } from "react";
// Updated import path to match your local file structure
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Search, Save, RotateCcw, Package, Tag, Loader2, AlertCircle, ChevronRight } from "lucide-react";

type ProductVariant = {
    id: string;
    product_id: string;
    variant: string;
    mrp: number;
    stock: number;
    unit: string;
    wholesale_price: number;
    discount: number;
    min_quantity: number;
    created_at?: string;
    products?: {
        name: string;
    };
};

export default function UpdatePriceStockPage() {
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editedRows, setEditedRows] = useState<Set<string>>(new Set());

    // 1. Fetch Data
    useEffect(() => {
        async function fetchVariants() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from("product_variants")
                    .select(`
            *,
            products ( name )
          `)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setVariants(data || []);
            } catch (error: any) {
                toast.error("Error loading variants: " + error.message);
            } finally {
                setLoading(false);
            }
        }
        fetchVariants();
    }, []);

    // 2. Filter logic
    const filteredVariants = useMemo(() => {
        return variants.filter((v) =>
            v.products?.name.toLowerCase().includes(search.toLowerCase()) ||
            v.variant.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, variants]);

    // 3. Change Handler
    const handleChange = (id: string, field: keyof ProductVariant, value: string) => {
        const updated = variants.map((v) => {
            if (v.id === id) {
                let updatedVariant = { ...v };

                // Handle numbers vs strings
                if (["mrp", "discount", "stock", "min_quantity"].includes(field)) {
                    let numValue = value === "" ? 0 : Number(value);
                    if (field === "discount") numValue = Math.min(99, Math.max(0, numValue));
                    (updatedVariant as any)[field] = numValue;
                } else {
                    (updatedVariant as any)[field] = value;
                }

                // Auto-calculate wholesale_price: MRP - (MRP * Discount / 100)
                if (field === "mrp" || field === "discount") {
                    const mrp = field === "mrp" ? Number(value) : updatedVariant.mrp;
                    const discount = field === "discount" ? Number(value) : updatedVariant.discount;
                    updatedVariant.wholesale_price = Math.round(mrp - (mrp * (discount || 0)) / 100);
                }

                return updatedVariant;
            }
            return v;
        });

        setVariants(updated);
        setEditedRows((prev) => new Set(prev).add(id));
    };

    // 4. Save Changes
    const handleSave = async () => {
        if (editedRows.size === 0) return;

        const itemsToUpdate = variants.filter((v) => editedRows.has(v.id));
        // Clean payload: Remove the joined 'products' object before sending to Postgres
        const payload = itemsToUpdate.map(({ products, ...rest }) => rest);

        const loadingToast = toast.loading(`Saving ${itemsToUpdate.length} updates...`);

        try {
            const { error } = await supabase
                .from("product_variants")
                .upsert(payload, { onConflict: 'id' });

            if (error) throw error;

            toast.success("Inventory updated!", { id: loadingToast });
            setEditedRows(new Set());
        } catch (error: any) {
            toast.error("Failed to save: " + error.message, { id: loadingToast });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
                <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
                <p className="text-slate-500 animate-pulse font-medium">Syncing with database...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
            <div className="max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-widest">
                            <div className="h-1 w-8 bg-red-600 rounded-full" />
                            Admin Portal
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Price & Stock</h1>
                        <p className="text-slate-500 font-medium">Manage your product variants and wholesale pricing.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                        {editedRows.size > 0 && (
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={16} /> Discard
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={editedRows.size === 0}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all
                ${editedRows.size > 0
                                    ? "bg-slate-900 text-white hover:bg-red-600 shadow-lg shadow-red-200"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                        >
                            <Save size={18} /> Update Database {editedRows.size > 0 && `(${editedRows.size})`}
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="group relative mb-8">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by product name or size..."
                        className="w-full pl-14 pr-6 py-5 rounded-2xl border-2 border-transparent bg-white shadow-md shadow-slate-200/50 focus:border-red-500/20 outline-none transition-all text-slate-700 font-bold placeholder:text-slate-300"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Main Table Container */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Product Info</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">MRP (₹)</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Stock </th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Unit</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Min Qty</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Discount</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-100/30">Wholesale Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredVariants.map((v) => {
                                    const isEdited = editedRows.has(v.id);
                                    return (
                                        <tr key={v.id} className={`group transition-all ${isEdited ? "bg-red-50/30" : "hover:bg-slate-50/80"}`}>
                                            <td className="p-6">
                                                <div className="font-black text-slate-800 text-base leading-tight">{v.products?.name || "Untitled"}</div>
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 mt-2 uppercase">
                                                    <Tag size={10} />
                                                    <span>{v.variant}</span>
                                                    <span className="opacity-50">•</span>
                                                    <span>{v.unit}</span>
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <div className="relative w-28">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        className="w-full pl-7 pr-3 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-700 focus:bg-white focus:border-red-500/30 outline-none transition-all"
                                                        value={v.mrp}
                                                        onChange={(e) => handleChange(v.id, "mrp", e.target.value)}
                                                    />
                                                </div>
                                            </td>

                                            <td className="p-6">
                                                <input
                                                    type="number"
                                                    className="w-24 px-3 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-700 focus:bg-white focus:border-red-500/30 outline-none transition-all"
                                                    value={v.stock}
                                                    onChange={(e) => handleChange(v.id, "stock", e.target.value)}
                                                />
                                            </td>

                                            <td className="p-6">
                                                <select
                                                    className="w-24 px-3 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-700 focus:bg-white focus:border-red-500/30 outline-none transition-all appearance-none cursor-pointer"
                                                    value={v.unit}
                                                    onChange={(e) => handleChange(v.id, "unit", e.target.value)}
                                                >
                                                    <option value="L">L</option>
                                                    <option value="kg">kg</option>
                                                    <option value="pcs">pcs</option>
                                                    <option value="gm">gm</option>
                                                    <option value="ml">ml</option>
                                                </select>
                                            </td>
                                            <td className="p-6">
                                                <input
                                                    type="number"
                                                    className="w-20 px-3 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-700 focus:bg-white focus:border-red-500/30 outline-none transition-all"
                                                    value={v.min_quantity}
                                                    onChange={(e) => handleChange(v.id, "min_quantity", e.target.value)}
                                                />
                                            </td>

                                            <td className="p-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="number"
                                                        className="w-20 px-3 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-700 text-center focus:bg-white focus:border-red-500/30 outline-none transition-all"
                                                        value={v.discount}
                                                        onChange={(e) => handleChange(v.id, "discount", e.target.value)}
                                                    />
                                                    <span className="text-slate-400 font-bold">%</span>
                                                </div>
                                            </td>


                                            <td className="p-6 bg-slate-50/50">
                                                <div className="flex flex-col">
                                                    <div className="text-xl font-black text-slate-900 flex items-center gap-2">
                                                        ₹{v.wholesale_price}
                                                        {isEdited && <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Calculated Price</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredVariants.length === 0 && (
                        <div className="p-24 text-center">
                            <div className="inline-flex p-6 rounded-full bg-slate-50 text-slate-300 mb-4">
                                <AlertCircle size={40} />
                            </div>
                            <p className="text-slate-400 font-bold text-lg">No variants found matching your search</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}