"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/Components/ProductCard";
// import ProductCard from "@/components/ProductCard"; // Adjust path as needed
import { Heart, ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const userStr = localStorage.getItem("wholesale_user");
      if (!userStr) {
        setLoading(false);
        return;
      }
      const userId = JSON.parse(userStr).id;

      // Fetch wishlist with nested product and variant data
      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          id,
          products (
            *,
            product_images (image_url),
            product_variants (*)
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      // Format the data to match what ProductCard expects
      const formattedProducts = data.map((item: any) => item.products);
      setItems(formattedProducts);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-red-600" size={40} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading your vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header Section */}
      <div className="bg-slate-50 py-16 px-4 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200">
              <Heart size={24} fill="currentColor" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
              My Wishlist
            </h1>
          </div>
          <p className="text-slate-500 font-medium max-w-md">
            Your curated selection of premium wholesale products ready for sourcing.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[3rem]">
            <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
               <ShoppingBag className="text-slate-300" size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Your wishlist is empty</h3>
            <p className="text-slate-400 mb-8">Start exploring our premium wholesale collection.</p>
            <Link 
              href="/Wholesale/productgallery" 
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all"
            >
              Browse Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}