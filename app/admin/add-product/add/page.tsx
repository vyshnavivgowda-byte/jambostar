"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Trash2, Plus, Upload, X, Package, Tag, Layers, ChevronDown,
  IndianRupee, RotateCcw, CheckCircle2, ArrowLeft, GitMerge
} from "lucide-react";

const UNITS = ["kg", "g", "L", "ml", "pieces", "pack", "box"];

interface Variant {
  variant: string;
  mrp: string;
  stock: string;
  unit: string;
  wholesale_price: string;
  discount: string;
  min_quantity: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // --- STATE ---
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [innerCategories, setInnerCategories] = useState<any[]>([]); // New State

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [selectedInner, setSelectedInner] = useState(""); // New Selection State

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const initialVariant: Variant = {
    variant: "", mrp: "", stock: "", unit: "kg",
    wholesale_price: "", discount: "", min_quantity: "1",
  };

  const [variants, setVariants] = useState<Variant[]>([initialVariant]);

  // --- FETCH DATA ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");
    fetchCategories();
    if (productId) {
      setEditingId(productId);
      fetchCompleteProductData(productId);
    }
  }, []);

  // Fetch Subcategories when Category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories();
      setSelectedSub(""); // Reset child
      setInnerCategories([]); // Clear grandchild
      setSelectedInner("");
    }
  }, [selectedCategory]);

  // Fetch Inner Categories when Subcategory changes
  useEffect(() => {
    if (selectedSub) {
      fetchInnerCategories();
      // Only reset if we aren't currently loading existing data
      if (!isFetching) {
        setSelectedInner("");
      }
    } else {
      setInnerCategories([]);
    }
  }, [selectedSub]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*");
    if (data) setCategories(data);
  };

  const fetchSubcategories = async () => {
    const { data } = await supabase.from("subcategories").select("*").eq("category_id", selectedCategory);
    if (data) setSubcategories(data);
  };

  const fetchInnerCategories = async () => {
    const { data } = await supabase.from("inner_categories").select("*").eq("subcategory_id", selectedSub);
    if (data) setInnerCategories(data);
  };
  const fetchCompleteProductData = async (id: string) => {
    setIsFetching(true);
    try {
      const { data: product } = await supabase.from("products").select("*").eq("id", id).single();

      if (product) {
        setName(product.name);
        setBrand(product.brand);
        setDescription(product.description);
        setSelectedCategory(product.category_id);

        // 1. Fetch Subcategories immediately so the dropdown populates
        const { data: subs } = await supabase.from("subcategories")
          .select("*")
          .eq("category_id", product.category_id);
        if (subs) setSubcategories(subs);
        setSelectedSub(product.subcategory_id);

        // 2. Fetch Inner Categories immediately so the dropdown populates
        if (product.subcategory_id) {
          const { data: inners } = await supabase.from("inner_categories")
            .select("*")
            .eq("subcategory_id", product.subcategory_id);
          if (inners) setInnerCategories(inners);
        }

        // 3. Now set the selected inner category
        setSelectedInner(product.inner_category_id || "");
      }

      const { data: varData } = await supabase.from("product_variants").select("*").eq("product_id", id);
      if (varData) setVariants(varData);

      const { data: imgData } = await supabase.from("product_images").select("*").eq("product_id", id);
      if (imgData) setPreviewUrls(imgData.map(img => img.image_url));
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product details");
    } finally {
      setIsFetching(false);
    }
  };
  // --- HANDLERS ---
  const handleVariantChange = (index: number, field: keyof Variant, value: string) => {
    const updated = [...variants];
    updated[index][field] = value;
    const mrp = Number(updated[index].mrp);
    const discount = Number(updated[index].discount);
    if ((field === "mrp" || field === "discount") && mrp > 0 && discount >= 0 && discount <= 100) {
      const wholesale = mrp - (mrp * discount) / 100;
      updated[index].wholesale_price = wholesale.toFixed(2);
    }
    setVariants(updated);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages((prev) => [...prev, ...files]);
      const previews = files.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...previews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };
  // --- CLEAR FORM ---
  const clearForm = () => {
    setName("");
    setBrand("");
    setDescription("");
    setSelectedCategory("");
    setSelectedSub("");
    setSelectedInner("");
    setImages([]);
    setPreviewUrls([]);
    setVariants([{ ...initialVariant }]);
    toast.success("Form cleared");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !selectedCategory) {
      return toast.error("Name and Category are required");
    }

    setLoading(true);

    try {
      let productId = editingId;

      const productPayload = {
        name,
        brand,
        description,
        category_id: selectedCategory,
        subcategory_id: selectedSub || null,
        inner_category_id: selectedInner || null,
      };

      // ✅ STEP 1: INSERT OR UPDATE PRODUCT
      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", editingId);

        if (error) throw error;

      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(productPayload)
          .select()
          .single();

        if (error) throw error;

        if (!data?.id) {
          throw new Error("Product ID not returned");
        }

        productId = data.id;
      }

      // 🔎 Verify product really exists in DB
      const { data: checkProduct, error: checkError } = await supabase
        .from("products")
        .select("id")
        .eq("id", productId)
        .single();

      if (checkError || !checkProduct) {
        throw new Error("Product does not exist in database");
      }

      // ✅ STEP 2: DELETE OLD VARIANTS (IF EDITING)
      if (editingId) {
        const { error } = await supabase
          .from("product_variants")
          .delete()
          .eq("product_id", productId);

        if (error) throw error;
      }

      const validVariants = variants.filter(
        (v) => v.variant && v.mrp && v.stock
      );

      if (validVariants.length === 0) {
        throw new Error("At least one valid variant is required");
      }

      const variantData = validVariants.map((v) => ({
        product_id: productId,
        variant: v.variant,
        mrp: Number(v.mrp),
        stock: Number(v.stock),
        unit: v.unit,
        wholesale_price: Number(v.wholesale_price),
        discount: Number(v.discount),
        min_quantity: Number(v.min_quantity),
      }));

      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(variantData);

      if (variantError) throw variantError;

      // ✅ STEP 4: HANDLE IMAGES
      if (images.length > 0) {
        if (editingId) {
          await supabase
            .from("product_images")
            .delete()
            .eq("product_id", productId);
        }

        for (const file of images) {
          const fileName = `${Date.now()}-${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(fileName);

          const { error: imageError } = await supabase
            .from("product_images")
            .insert({
              product_id: productId,
              image_url: publicUrlData.publicUrl,
            });

          if (imageError) throw imageError;
        }
      }

      toast.success("Product saved successfully 🎉");
      router.push("/admin/add-product");

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-10xl mx-auto p-4 md:p-10 space-y-8 min-h-screen bg-[#f8fafc]">
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "16px",
            fontWeight: "bold",
            padding: "16px",
          },
        }}
      />
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-gray-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/add-product")}
            className="p-3 bg-red-600 hover:text-white rounded-2xl transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Add New Product</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inventory Console</p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {!editingId && (
            <button
              onClick={clearForm}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-2xl font-bold text-sm transition-all"
            >
              <RotateCcw size={18} /> CLEAR FORM
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-red-600 text-white hover:bg-red-700 rounded-2xl font-black text-sm shadow-lg shadow-red-200 disabled:opacity-50 transition-all"
          >
            {loading ? "SAVING..." : <><CheckCircle2 size={18} /> PUBLISH PRODUCT</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* MAIN FORM */}
        <div className="lg:col-span-2 space-y-9">

          <div className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-red-600 font-black uppercase text-xs tracking-widest pb-4 border-b">
              <Package size={18} /> Product Details
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 ml-1">PRODUCT NAME *</label>
                <input
                  placeholder="e.g. Premium Basmati Rice"
                  className="w-full p-4 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-gray-900 font-bold placeholder:text-gray-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 ml-1">BRAND</label>
                <input
                  placeholder="e.g. Jumbostar"
                  className="w-full p-4 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-gray-900 font-bold placeholder:text-gray-400"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 ml-1">DESCRIPTION</label>
              <textarea
                placeholder="Enter product details and highlights..."
                rows={4}
                className="w-full p-4 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-gray-800 font-medium placeholder:text-gray-400"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* PRICING & VARIANTS - FORCED VISIBILITY */}
          <div className="bg-white p-8 rounded-[2rem] border-2 border-red-100 shadow-md space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-red-600"></div>

            <div className="flex justify-between items-center border-b pb-4">
              <div className="flex items-center gap-2 text-red-600 font-black uppercase text-xs tracking-widest">
                <IndianRupee size={18} /> Pricing & Variants (All Required *)
              </div>
              <button
                onClick={() => setVariants([...variants, { ...initialVariant }])}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-700 transition-all"
              >
                <Plus size={16} /> ADD VARIANT
              </button>
            </div>

            <div className="space-y-6">
              {variants.map((v, i) => (
                <div key={i} className="relative group bg-slate-50 p-6 pt-8 md:pt-6 rounded-2xl border border-gray-200 transition-all hover:border-red-100 hover:shadow-sm">

                  {/* Remove Button - Positioned absolutely to avoid breaking the grid */}
                  {variants.length > 1 && (
                    <button
                      onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                      className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                      title="Remove Variant"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                    {/* Size */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Size *</label>
                      <input
                        placeholder="500g"
                        className="w-full bg-white p-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-red-500 transition-colors"
                        value={v.variant}
                        onChange={(e) => handleVariantChange(i, "variant", e.target.value)}
                      />
                    </div>

                    {/* MRP */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">MRP *</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-white p-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-red-500"
                        value={v.mrp}
                        onChange={(e) => handleVariantChange(i, "mrp", e.target.value)}
                      />
                    </div>

                    {/* Stock */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Stock *</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-white p-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-red-500"
                        value={v.stock}
                        onChange={(e) => handleVariantChange(i, "stock", e.target.value)}
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Unit *</label>
                      <div className="relative">
                        <select
                          className="w-full bg-white p-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none appearance-none focus:border-red-500"
                          value={v.unit}
                          onChange={(e) => handleVariantChange(i, "unit", e.target.value)}
                        >
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {/* Disc % */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Disc % *</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        className="w-full bg-white p-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-red-500"
                        value={v.discount}
                        onChange={(e) => {
                          let value = Number(e.target.value);
                          if (value >= 100) value = 99;
                          if (value < 0) value = 0;
                          handleVariantChange(i, "discount", value.toString());
                        }}
                      />
                    </div>

                    {/* Wholesale */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Wholesale</label>
                      <div className="w-full bg-gray-100 p-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 cursor-not-allowed">
                        {v.wholesale_price || 0}
                      </div>
                    </div>

                    {/* Min Qty */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Min Qty *</label>
                      <input
                        type="number"
                        placeholder="1"
                        className="w-full bg-white p-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-red-500"
                        value={v.min_quantity}
                        onChange={(e) => handleVariantChange(i, "min_quantity", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR FORM */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-red-600 font-black uppercase text-xs tracking-widest pb-4 border-b">
              <Layers size={18} /> Organization
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase">Main Category *</label>
                <select
                  className="w-full p-4 bg-white border border-gray-300 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Choose Category</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase">Sub-Category</label>
                <select
                  className="w-full p-4 bg-white border border-gray-300 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50"
                  value={selectedSub}
                  disabled={!selectedCategory}
                  onChange={(e) => setSelectedSub(e.target.value)}
                >
                  <option value="">None</option>
                  {subcategories.map((sub) => <option key={sub.id} value={sub.id}>{sub.title}</option>)}
                </select>
              </div>
              {/* NEW INNER CATEGORY DROPDOWN */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-red-600 uppercase flex items-center gap-1">
                  <GitMerge size={12} /> Inner Category
                </label>
                <select className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50" value={selectedInner} disabled={!selectedSub} onChange={(e) => setSelectedInner(e.target.value)}>
                  <option value="">Choose Inner Category</option>
                  {innerCategories.map((inner) => <option key={inner.id} value={inner.id}>{inner.title}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-red-600 font-black uppercase text-xs tracking-widest pb-4 border-b">
              <Tag size={18} /> Media Upload
            </div>
            <div className="grid grid-cols-2 gap-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={url} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-white text-red-600 rounded-full p-1.5 shadow-md hover:scale-110 transition-transform"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="aspect-square border-2 border-dashed border-gray-300 flex flex-col items-center justify-center rounded-2xl cursor-pointer hover:bg-red-50 hover:border-red-400 transition-all group">
                <Upload className="text-gray-400 group-hover:text-red-600" />
                <span className="text-[10px] font-black text-gray-400 mt-2 group-hover:text-red-600 uppercase">Add Photo</span>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}