"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, 
  Loader2, X, Upload, CheckCircle2 
} from "lucide-react";

type Banner = {
  id: number;
  title: string;
  short_description: string;
  image_url: string;
};

type BannerType = "general_banners" | "discount_banners";

export default function BannerManagementPage() {
  const [activeTab, setActiveTab] = useState<BannerType>("general_banners");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBanners();
  }, [activeTab]);

  async function fetchBanners() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(activeTab)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBanners(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Open Modal for Edit
  const openEditModal = (banner: Banner) => {
    setEditingId(banner.id);
    setFormData({ title: banner.title, description: banner.short_description });
    setPreviewUrl(banner.image_url);
    setIsModalOpen(true);
  };

  // Open Modal for New
  const openAddModal = () => {
    setEditingId(null);
    setFormData({ title: "", description: "" });
    setPreviewUrl("");
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this banner?")) return;
    try {
      const { error } = await supabase.from(activeTab).delete().eq("id", id);
      if (error) throw error;
      toast.success("Banner deleted");
      fetchBanners();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading(editingId ? "Updating banner..." : "Uploading banner...");

    try {
      let finalImageUrl = previewUrl;

      // 1. Handle New Image Upload if file is selected
      if (selectedFile) {
        const fileName = `${Date.now()}-${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("banner-images")
          .upload(`${activeTab}/${fileName}`, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("banner-images")
          .getPublicUrl(`${activeTab}/${fileName}`);
        
        finalImageUrl = publicUrl;
      }

      // 2. Database Operation (Upsert logic)
      const payload = {
        title: formData.title,
        short_description: formData.description,
        image_url: finalImageUrl
      };

      if (editingId) {
        // UPDATE
        const { error } = await supabase
          .from(activeTab)
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase.from(activeTab).insert([payload]);
        if (error) throw error;
      }

      toast.success(editingId ? "Banner updated!" : "Banner added!", { id: toastId });
      setIsModalOpen(false);
      fetchBanners();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Banner Management</h1>
            <p className="text-slate-500 font-medium">Manage promotional banners</p>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-[#e11d48] hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-rose-200"
          >
            <Plus size={20} /> Add Banner
          </button>
        </div>

        {/* Tabs */}
        <div className="inline-flex p-1 bg-slate-200/60 rounded-xl mb-10">
          {(["general_banners", "discount_banners"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "general_banners" ? "General Banners" : "Discount Banners"}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="animate-spin text-rose-600 mb-4" size={40} />
            <p className="text-slate-400 font-medium">Syncing banners...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                  <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{banner.title}</h3>
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2 min-h-[40px]">{banner.short_description}</p>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <button 
                      onClick={() => openEditModal(banner)}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(banner.id)}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-100 text-rose-600 font-bold text-sm hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setIsModalOpen(false)} className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>

              <h2 className="text-2xl font-black text-slate-900 mb-8">
                {editingId ? "Edit Banner" : "New Banner"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-rose-500 transition-colors font-bold text-slate-800 placeholder:text-slate-300"
                    placeholder="E.g. Summer Collection"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-rose-500 transition-colors font-bold text-slate-800 placeholder:text-slate-300 resize-none"
                    placeholder="Enter short description..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Image</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-rose-300 cursor-pointer transition-colors bg-slate-50 overflow-hidden"
                  >
                    {previewUrl ? (
                      <img src={previewUrl} className="h-32 w-full object-cover rounded-xl" alt="Preview" />
                    ) : (
                      <div className="py-6">
                        <Upload className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-sm text-slate-500 font-bold">Upload Media</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full bg-[#e11d48] text-white py-4 rounded-2xl font-black text-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : (editingId ? "Save Changes" : "Publish Banner")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}