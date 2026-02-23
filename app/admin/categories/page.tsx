"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Pencil, Trash2, X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  image_url: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
    if (data) setCategories(data);
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
    setLoading(true);
    let imageUrl = previewUrl || "";

    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`;
      const { data, error } = await supabase.storage.from("category-images").upload(fileName, imageFile);
      if (!error) {
        const { data: publicUrlData } = supabase.storage.from("category-images").getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    if (editingId) {
      await supabase.from("categories").update({ name, image_url: imageUrl }).eq("id", editingId);
    } else {
      await supabase.from("categories").insert([{ name, image_url: imageUrl }]);
    }

    closeModal();
    fetchCategories();
    setLoading(false);
  };

// Update your handleDelete function
const handleDelete = async (id: string) => {
  // Simple confirmation popup
  const isConfirmed = confirm(
    "Are you sure? This will automatically delete all subcategories and products inside this Main Category."
  );

  if (isConfirmed) {
    setLoading(true); // Shows the loader
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Success: Refresh the UI list
      fetchCategories();
      alert("Main Category and all linked items deleted.");
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false); // Hides the loader
    }
  }
};

  const openModal = (category?: Category) => {
    if (category) {
      setEditingId(category.id);
      setName(category.name);
      setPreviewUrl(category.image_url);
    } else {
      setEditingId(null);
      setName("");
      setPreviewUrl(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setName("");
    setImageFile(null);
    setPreviewUrl(null);
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [categories, searchTerm]);

  return (
    <div className="min-h-screen bg-[#fffafa] p-6 md:p-6">

      {/* Header Section */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6">

        {/* Left Side: Title */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
           Main Category <span className="text-red-500">Studio</span>
          </h1>
          <p className="text-gray-500 mt-1">Manage and organize your store collections</p>
        </div>

        {/* Right Side: Search & Button Group */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">

          {/* Search Input Container */}
          <div className="relative group w-full sm:w-72">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 group-focus-within:text-red-600 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search Main categories..."
              className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 border border-red-100 rounded-2xl focus:ring-4 focus:ring-red-50 focus:border-red-300 outline-none shadow-sm transition-all text-base placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* New Category Button */}
          <button
            onClick={() => openModal()}
            className="w-full sm:w-auto bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white font-bold py-3 px-8 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} />
            NEW Main Category
          </button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300"
          >
            {/* Image Section */}
            <div className="relative h-74 w-full bg-gray-50 overflow-hidden">
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-red-200">
                  <ImageIcon size={48} strokeWidth={1.5} />
                  <span className="text-xs font-medium mt-2 uppercase tracking-widest text-red-300">No Image</span>
                </div>
              )}

              {/* Subtle Gradient Overlay for Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content Section */}
            <div className="p-5">
              <div className="flex flex-col gap-4">
                {/* Title - Bold and Center-left */}
                <div>
                  <h3 className="font-black text-xl text-gray-900 truncate tracking-tight uppercase">
                    {cat.name}
                  </h3>
                  <div className="h-1 w-8 bg-red-500 mt-1 rounded-full group-hover:w-16 transition-all duration-500"></div>
                </div>

                {/* Action Buttons - Horizontal Layout Below Title */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => openModal(cat)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 ounded-xl font-bold text-xs bg-red-50 text-red-600 transition-colors border border-transparent border-red-100"
                  >
                    <Pencil size={16} />
                    EDIT
                  </button>

                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="px-3 py-2.5 bg-white text-gray-400 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 border border-gray-100 hover:border-red-500 shadow-sm"
                    title="Delete Main Category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-red-50/50 px-8 py-6 flex justify-between items-center border-b border-red-100">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? "Edit Main Category" : "Create New Main Category"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-red-100 rounded-full text-gray-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Image Uploader */}
              <div className="relative group">
                <div className={`relative w-full h-44 rounded-[1.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden 
                  ${previewUrl ? 'border-red-200' : 'border-gray-200 hover:border-red-300 bg-gray-50'}`}>

                  {previewUrl ? (
                    <>
                      <img src={previewUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="bg-red-100 p-3 rounded-full inline-block">
                        <Upload className="text-red-500" size={24} />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Click to Upload</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              {/* Text Input - High Visibility */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500  ml-1">Main Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name..."
                  className="w-full p-4 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:border-red-400 focus:ring-4 focus:ring-red-50 outline-none font-medium transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl text-lg transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={20} />}
                {editingId ? "Update Main Category" : "Create Main Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}