"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Plus, Search, Pencil, Trash2, X, Upload,
    Image as ImageIcon, Loader2, Filter, AlertCircle
} from "lucide-react";

interface Category {
    id: string;
    name: string;
}

interface Subcategory {
    id: string;
    title: string;
    image_url: string;
    category_id: string;
    categories: {
        name: string;
    };
}

export default function SubcategoriesPage() {
    // Data States
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form States
    const [title, setTitle] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchCategories();
        fetchSubcategories();
    }, []);

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from("categories")
            .select("id, name");

        console.log("CATEGORIES:", data);
        console.log("ERROR:", error);

        if (data) setCategories(data);
    };

    const fetchSubcategories = async () => {
        const { data, error } = await supabase
            .from("subcategories")
            .select(`
      id,
      title,
      image_url,
      category_id,
      categories!subcategories_category_id_fkey(name)
    `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Fetch error:", error.message);
            return;
        }

        setSubcategories(data || []);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setLoading(true);

        // VALIDATION: Check for duplicates in the same category
        const isDuplicate = subcategories.some(sub =>
            sub.title.toLowerCase().trim() === title.toLowerCase().trim() &&
            sub.category_id === selectedCategory &&
            sub.id !== editingId
        );

        if (isDuplicate) {
            setErrorMessage("This category name already exists in the selected category.");
            setLoading(false);
            return;
        }

        let imageUrl = previewUrl || "";

        if (imageFile) {
            const fileName = `${Date.now()}-${imageFile.name}`;
            const { data, error } = await supabase.storage.from("category-images").upload(fileName, imageFile);
            if (!error) {
                const { data: publicUrlData } = supabase.storage.from("category-images").getPublicUrl(fileName);
                imageUrl = publicUrlData.publicUrl;
            }
        }

        const payload = { title, image_url: imageUrl, category_id: selectedCategory };



        let error;

        if (editingId) {
            const res = await supabase
                .from("subcategories")
                .update(payload)
                .eq("id", editingId);
            error = res.error;
        } else {
            const res = await supabase
                .from("subcategories")
                .insert([payload]);
            error = res.error;
        }

        if (error) {
            setErrorMessage(error.message);
        } else {
            closeModal();
            fetchSubcategories();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this category?")) {
            await supabase.from("subcategories").delete().eq("id", id);
            fetchSubcategories();
        }
    };

    const openModal = (sub?: Subcategory) => {
        setErrorMessage(null);
        if (sub) {
            setEditingId(sub.id);
            setTitle(sub.title);
            setSelectedCategory(sub.category_id);
            setPreviewUrl(sub.image_url);
        } else {
            setEditingId(null);
            setTitle("");
            setSelectedCategory("");
            setPreviewUrl(null);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setImageFile(null);
        setPreviewUrl(null);
        setErrorMessage(null);
    };

    // ADVANCED FILTERING
    const filteredSubs = useMemo(() => {
        return subcategories.filter(sub => {
            const matchesSearch = sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sub.categories?.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedFilterCategory === "all" || sub.category_id === selectedFilterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [subcategories, searchTerm, selectedFilterCategory]);

    return (
        <div className="min-h-screen bg-[#fffafa] p-4 md:p-10">

            {/* Header Section */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        Categories <span className="text-red-500">Studio</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Manage and organize secondary collections</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Category Filter Dropdown */}
                    <div className="relative w-full sm:w-52">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            value={selectedFilterCategory}
                            onChange={(e) => setSelectedFilterCategory(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all text-sm font-bold text-gray-700 appearance-none shadow-sm cursor-pointer"
                        >
                            <option value="all">All Main Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative group w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 group-focus-within:text-red-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search Categories..."
                            className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 border border-red-100 rounded-2xl focus:ring-4 focus:ring-red-50 outline-none shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => openModal()}
                        className="w-full sm:w-auto bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white font-bold py-3 px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                    >
                        <Plus size={20} /> ADD NEW
                    </button>
                </div>
            </div>

            {/* Grid Display */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredSubs.map((sub) => (
                    <div
                        key={sub.id}
                        className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300"
                    >
                        {/* Image Section */}
                        <div className="relative h-74 w-full bg-gray-50 overflow-hidden">
                            {sub.image_url ? (
                                <img
                                    src={sub.image_url}
                                    alt={sub.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-red-200">
                                    <ImageIcon size={48} strokeWidth={1.5} />
                                    <span className="text-xs font-medium mt-2 uppercase tracking-widest text-red-300">
                                        No Image
                                    </span>
                                </div>
                            )}

                            {/* Hover Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        {/* Content Section */}
                        <div className="p-5">
                            <div className="flex flex-col gap-4">

                                {/* Title */}
                                <div>
                                    <h3 className="font-black text-xl text-gray-900 truncate tracking-tight uppercase">
                                        {sub.title}
                                    </h3>

                                    {/* Category Tag */}
                                    <span className="text-xs text-red-500 font-semibold uppercase tracking-wider">
                                        {sub.categories?.name}
                                    </span>

                                    <div className="h-1 w-8 bg-red-500 mt-1 rounded-full group-hover:w-16 transition-all duration-500"></div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                                    <button
                                        onClick={() => openModal(sub)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-red-50 text-red-600 transition-colors border border-red-100 hover:bg-red-100"
                                    >
                                        <Pencil size={16} />
                                        EDIT
                                    </button>

                                    <button
                                        onClick={() => handleDelete(sub.id)}
                                        className="px-3 py-2.5 bg-white text-gray-400 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 border border-gray-100 hover:border-red-500 shadow-sm"
                                        title="Delete Subcategory"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                        {/* Header */}
                        <div className="bg-red-50 px-8 py-6 flex justify-between items-center border-b border-red-100">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingId ? "Update Category" : "Create Category"}
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-2 hover:bg-red-100 rounded-full text-gray-600 transition-colors"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">

                            {/* Error */}
                            {errorMessage && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
                                    <AlertCircle size={18} />
                                    <p className="text-xs font-semibold">{errorMessage}</p>
                                </div>
                            )}

                            {/* Image Upload */}
                            <div className="relative group">
                                <div
                                    className={`relative w-full h-40 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden
            ${previewUrl ? "border-red-200" : "border-gray-300 bg-gray-50 hover:border-red-400"}`}
                                >
                                    {previewUrl ? (
                                        <>
                                            <img
                                                src={previewUrl}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                <Upload className="text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <Upload className="text-red-400 mx-auto mb-1" size={22} />
                                            <p className="text-xs font-semibold text-gray-500 uppercase">
                                                Upload Image
                                            </p>
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Title Input (FIXED VISIBILITY) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">
                                    Category Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Basmati Rice"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 border border-gray-300 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none transition-all"
                                />
                            </div>

                            {/* Category Select (FIXED VISIBILITY) */}
                            <div className="space-y-2 relative">
                                <label className="text-xs font-bold text-gray-500 uppercase">
                                    Parent Category
                                </label>

                                <select
                                    required
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full px-4 py-3 bg-white text-gray-800 border border-gray-300 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none transition-all appearance-none"
                                >
                                    <option value="" className="text-gray-400">
                                        Select Main Category
                                    </option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Custom Arrow */}
                                <div className="absolute right-4 top-[42px] pointer-events-none text-gray-400">
                                    ▼
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={18} />}
                                {editingId ? "SAVE CHANGES" : "CREATE CATEGORY"}
                            </button>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}