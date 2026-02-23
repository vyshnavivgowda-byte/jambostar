"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ImageOff, ArrowRight, ShoppingCart, Minus, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

// 1. PLACE IT HERE (Outside the component)
const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  const userStr = localStorage.getItem("wholesale_user");
  return userStr ? JSON.parse(userStr).id : null;
};

export default function ProductCard({ product }: { product: any }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showMoqModal, setShowMoqModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const variants = product.product_variants || [];
  const currentVariant = variants[activeIdx] || {};
  const displayImage = product.product_images?.[0]?.image_url;

  const wholesale = currentVariant.wholesale_price || 0;
  const mrp = currentVariant.mrp || 0;
  const stock = currentVariant.stock || 0;
  const minQty = currentVariant.min_quantity || 1;
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  // Inside ProductCard component...

  useEffect(() => {
    const checkStatus = async () => {
      const userId = await getUserId();
      if (!userId) return;

      // Check Wishlist
      const { data: wish } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", product.id)
        .maybeSingle();
      if (wish) setIsInWishlist(true);

      // Check Cart
      const variantIds = variants.map((v: any) => v.id);
      const { data: cart } = await supabase
        .from("cart")
        .select("id")
        .eq("user_id", userId)
        .in("variant_id", variantIds)
        .maybeSingle();
      if (cart) setIsInCart(true);
    };

    checkStatus();
  }, [product.id, variants]);
  // --- WISHLIST LOGIC ---
  const toggleWishlist = async () => {
    const userId = await getUserId();
    if (!userId) {
      toast.error("Please login first");
      return;
    }

    if (isInWishlist) {
      // REMOVE from wishlist
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", product.id);

      if (!error) {
        setIsInWishlist(false);
        toast.success("Removed from Wishlist");
      }
    } else {
      // ADD to wishlist
      const { error } = await supabase
        .from("wishlist")
        .insert([{ user_id: userId, product_id: product.id }]);

      if (!error) {
        setIsInWishlist(true);
        toast.success("Added to Wishlist!");
      }
    }
  };

  // --- CART LOGIC ---
  // 2. MAKE THIS ASYNC TO CHECK LOGIN BEFORE OPENING MODAL
  const handleAddToCartClick = async () => {
    const userId = await getUserId();
    if (!userId) {
      toast.error("Please login to source products", { icon: '🔒' });
      return;
    }
    setQuantity(minQty);
    setShowMoqModal(true);
  };

  const confirmAddToCart = async () => {
    setLoading(true);
    const userId = await getUserId();
    // ... validation logic ...
    try {
      const { error } = await supabase.from("cart").insert([
        { user_id: userId, variant_id: currentVariant.id, quantity: quantity }
      ]);

      if (error) throw error;

      setIsInCart(true); // Turns button BLACK
      toast.success(`Added ${quantity} units to cart!`);
      setShowMoqModal(false);
    } catch (err: any) {
      toast.error("Error updating cart");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="group bg-white rounded-[2.5rem] p-4 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-100 border border-slate-50 flex flex-col h-full relative">
      <Toaster position="bottom-right" />

      {/* 1. IMAGE SECTION */}
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-slate-50 mb-4 group/img">
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
          <div className={`px-2 py-1 rounded-full flex items-center gap-1.5 border backdrop-blur-md shadow-sm ${stock > 0 ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-red-500/10 border-red-500/20 text-red-600"
            }`}>
            <div className={`h-1 w-1 rounded-full ${stock > 0 ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-[8px] font-black uppercase tracking-widest">
              {stock > 0 ? `${stock} In Stock` : "Sold Out"}
            </span>
          </div>
        </div>

        {/* QUICK ACTION BUTTONS - ALWAYS VISIBLE */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 transition-all duration-300">
          {/* WISHLIST BUTTON: Red when active, Slate when not */}
          <button
            onClick={toggleWishlist}
            className={`h-10 w-10 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${isInWishlist
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-white text-slate-400 hover:text-red-500"
              }`}
          >
            <Heart size={16} fill={isInWishlist ? "currentColor" : "none"} />
          </button>

          {/* CART BUTTON: Black/Orange when active */}
          <button
            onClick={handleAddToCartClick}
            className={`h-10 w-10 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${isInCart
                ? "bg-slate-900 text-white scale-110" // Make it slightly larger if in cart
                : "bg-white text-slate-900 hover:bg-red-600 hover:text-white border border-slate-100"
              }`}
          >
            <ShoppingCart size={16} className={isInCart ? "animate-pulse" : ""} />
          </button>
        </div>
        {displayImage ? (
          <Image src={displayImage} alt={product.name} fill className="object-contain p-8 transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-200">
            <ImageOff size={40} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* 2. VARIANT SELECTION */}
      <div className="flex flex-wrap gap-2 mb-6">
        {variants.map((v: any, i: number) => (
          <button
            key={v.id}
            onClick={() => setActiveIdx(i)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeIdx === i ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              }`}
          >
            {v.variant}{v.unit}
          </button>
        ))}
      </div>

      {/* 3. CONTENT AREA */}
      <div className="px-2 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[9px] font-black text-red-600 uppercase tracking-[0.3em]">{product.brand || "JumboStar"}</p>
          {currentVariant.discount > 0 && (
            <span className="text-[8px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full">-{currentVariant.discount}%</span>
          )}
        </div>
        <h3 className="text-sm font-black text-slate-900 mb-4 line-clamp-1 uppercase tracking-tight">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between border-t border-slate-50 pt-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-300 line-through">MRP ₹{mrp}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{wholesale}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">/wholesale</span>
            </div>
          </div>
          <Link href={`/Wholesale/products/${product.id}`} className="h-12 w-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all duration-300 group/btn shadow-sm">
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* --- MOQ BULK ADD POPUP --- */}
      {showMoqModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-xl font-black text-slate-900">Bulk Sourcing</h4>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Min. Order: {minQty} {currentVariant.unit}</p>
              </div>
              <button onClick={() => setShowMoqModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 flex items-center justify-between mb-8">
              <button
                disabled={quantity <= minQty}
                onClick={() => setQuantity(q => q - 1)}
                className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm disabled:opacity-30"
              >
                <Minus size={20} />
              </button>
              <div className="text-center">
                <span className="text-3xl font-black text-slate-900">{quantity}</span>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Units</p>
              </div>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm font-bold px-2">
                <span className="text-slate-400">Total Bulk Price:</span>
                <span className="text-slate-900">₹{(wholesale * quantity).toLocaleString()}</span>
              </div>
              <button
                onClick={confirmAddToCart}
                disabled={loading}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all disabled:bg-slate-200"
              >
                {loading ? "Processing..." : "Add to Bulk Cart"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}