"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Plus, Search, Pencil, Trash2, X, Upload,
    Image as ImageIcon, Loader2, Filter, ChevronRight, AlertCircle
} from "lucide-react";

interface Category { id: string; name: string; }
interface Subcategory { id: string; title: string; category_id: string; }
interface InnerCategory {
    id: string;
    title: string;
    image_url: string;
    subcategory_id: string;
    subcategories: {
        id: string;
        title: string;
        categories: {
            id: string;
            name: string;
        };
    };
}
export default function InnerCategoriesPage() {
    // Data States
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [innerCategories, setInnerCategories] = useState<InnerCategory[]>([]);

    // UI Search & Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilterCategory, setSelectedFilterCategory] = useState("all");
    const [selectedFilterSubcategory, setSelectedFilterSubcategory] = useState("all");

    // Global UI States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form States
    const [title, setTitle] = useState("");
    const [modalSelectedCat, setModalSelectedCat] = useState("");
    const [modalSelectedSub, setModalSelectedSub] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const [catRes, subRes] = await Promise.all([
            supabase.from("categories").select("id, name"),
            supabase.from("subcategories").select("id, title, category_id")
        ]);
        if (catRes.data) setCategories(catRes.data);
        if (subRes.data) setSubcategories(subRes.data);
        fetchInnerCategories();
    };

    const fetchInnerCategories = async () => {
        const { data, error } = await supabase
            .from("inner_categories")
            .select(`
      id,
      title,
      image_url,
      subcategory_id,
      subcategories:subcategory_id (
          id,
          title,
          categories:category_id (
              id,
              name
          )
      )
  `)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Detailed Fetch Error:", error.message, error.details, error.hint);
        }
        if (data) setInnerCategories(data as any);
    };

    // Logical Filter: Subcategories available in the MODAL based on selected Category
    const filteredSubcategoriesForModal = useMemo(() => {
        return subcategories.filter(sub => sub.category_id === modalSelectedCat);
    }, [modalSelectedCat, subcategories]);

    // Logical Filter: Subcategories available in the TOP FILTER based on selected Category
    const filteredSubcategoriesForTopFilter = useMemo(() => {
        return subcategories.filter(sub => sub.category_id === selectedFilterCategory);
    }, [selectedFilterCategory, subcategories]);

    // MAIN DATA FILTERING (Search + Category Filter + Subcategory Filter)
    const finalFilteredData = useMemo(() => {
        return innerCategories.filter(inner => {
            const matchesSearch = inner.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCat = selectedFilterCategory === "all" || inner.subcategories?.categories?.id === selectedFilterCategory;
            const matchesSub = selectedFilterSubcategory === "all" || inner.subcategory_id === selectedFilterSubcategory;
            return matchesSearch && matchesCat && matchesSub;
        });
    }, [innerCategories, searchTerm, selectedFilterCategory, selectedFilterSubcategory]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        let imageUrl = previewUrl || "";
        if (imageFile) {
            const fileName = `inner-${Date.now()}-${imageFile.name}`;
            const { data, error } = await supabase.storage.from("category-images").upload(fileName, imageFile);
            if (!error) {
                const { data: pub } = supabase.storage.from("category-images").getPublicUrl(fileName);
                imageUrl = pub.publicUrl;
            }
        }

        const payload = { title, image_url: imageUrl, subcategory_id: modalSelectedSub };

        const { error } = editingId
            ? await supabase.from("inner_categories").update(payload).eq("id", editingId)
            : await supabase.from("inner_categories").insert([payload]);

        if (!error) {
            closeModal();
            fetchInnerCategories();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this inner category?")) {
            const { error } = await supabase.from("inner_categories").delete().eq("id", id);
            if (!error) {
                fetchInnerCategories();
            } else {
                alert("Error deleting: " + error.message);
            }
        }
    };

    const openModal = (inner?: InnerCategory) => {
        if (inner) {
            setEditingId(inner.id);
            setTitle(inner.title);
            setModalSelectedCat(inner.subcategories.categories.id);
            setModalSelectedSub(inner.subcategory_id);
            setPreviewUrl(inner.image_url);
        } else {
            setEditingId(null);
            setTitle("");
            setModalSelectedCat("");
            setModalSelectedSub("");
            setPreviewUrl(null);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setImageFile(null);
        setPreviewUrl(null);
        setEditingId(null);
    };

    return (
        <div className="min-h-screen bg-[#fffafa] p-4 md:p-10">
            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900">Sub Category <span className="text-red-500">CATEGORIES</span></h1>
                        <p className="text-slate-500 font-medium">Deep Hierarchy Management</p>
                    </div>
                    <button onClick={() => openModal()} className="w-full md:w-auto bg-red-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-100">
                        <Plus size={20} /> ADD NEW Sub Category
                    </button>
                </div>

                {/* Top Filters Bar */}
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            placeholder="Search by name..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 text-black border-none rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        value={selectedFilterCategory}
                        onChange={(e) => {
                            setSelectedFilterCategory(e.target.value);
                            setSelectedFilterSubcategory("all"); // Reset subfilter when cat changes
                        }}
                        className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-600 outline-none border-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="all">All Main Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        value={selectedFilterSubcategory}
                        disabled={selectedFilterCategory === "all"}
                        onChange={(e) => setSelectedFilterSubcategory(e.target.value)}
                        className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-600 outline-none border-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    >
                        <option value="all">All Categories</option>
                        {filteredSubcategoriesForTopFilter.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>
            </div>

            {/* Grid Display */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {finalFilteredData.map((inner) => (
                    <div key={inner.id} className="bg-white rounded-[2rem] p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
                        {/* Image Section */}
                        <div className="relative aspect-square rounded-[1.5rem] overflow-hidden bg-slate-100 mb-5">
                            {inner.image_url ? (
                                <img src={inner.image_url} className="w-full h-full object-cover" alt={inner.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={48} /></div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="px-1">
                            <h3 className="text-2xl font-black text-slate-900 uppercase leading-none truncate">{inner.title}</h3>
                            <div className="mt-2">
                                <p className="text-xs font-bold text-red-600 uppercase tracking-widest">{inner.subcategories?.title}</p>
                                <div className="h-1 w-10 bg-red-600 mt-1.5 rounded-full"></div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => openModal(inner)}
                                    className="flex-1 py-3.5 bg-red-50 text-red-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all"
                                >
                                    <Pencil size={16} /> EDIT
                                </button>
                                <button
                                    onClick={() => handleDelete(inner.id)}
                                    className="p-3.5 border border-slate-100 text-slate-300 rounded-2xl hover:text-red-600 hover:border-red-100 transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-black text-slate-800 text-xl tracking-tight">
                                {editingId ? "UPDATE" : "CREATE"} Sub Category
                            </h2>
                            <button onClick={closeModal} className="p-2 bg-white rounded-full shadow-sm hover:text-red-500"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="flex justify-center mb-4">
                                <label className="w-36 h-36 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-red-400 overflow-hidden bg-slate-50 transition-all">
                                    {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <Upload className="text-slate-400" />}
                                    <input type="file" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Sub Category Title</label>
                                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-5 py-4 rounded-2xl text-black bg-slate-50 border-none outline-none focus:ring-2 focus:ring-red-500 font-bold" placeholder="e.g. Broken Rice" />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Main Category</label>
                                    <select
                                        required
                                        value={modalSelectedCat}
                                        onChange={(e) => {
                                            setModalSelectedCat(e.target.value);
                                            setModalSelectedSub("");
                                        }}
                                        className="w-full px-5 py-4 text-black rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-red-500 font-bold appearance-none"
                                    >
                                        <option value="">Choose Main Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Category</label>
                                    <select
                                        required
                                        disabled={!modalSelectedCat}
                                        value={modalSelectedSub}
                                        onChange={(e) => setModalSelectedSub(e.target.value)}
                                        className="w-full px-5 py-4 text-black rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-red-500 font-bold disabled:opacity-50 appearance-none"
                                    >
                                        <option value="">Choose Category</option>
                                        {filteredSubcategoriesForModal.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button disabled={loading} className="w-full py-5 bg-red-500 text-white rounded-2xl font-black shadow-xl shadow-red-100 hover:bg-red-600 transition-all flex items-center justify-center gap-2 mt-4">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "SAVE CATEGORY"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}