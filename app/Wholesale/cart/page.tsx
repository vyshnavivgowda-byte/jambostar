"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Loader2, PackageCheck } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function CartPage() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const userStr = localStorage.getItem("wholesale_user");
      if (!userStr) { setLoading(false); return; }
      const userId = JSON.parse(userStr).id;

      const { data, error } = await supabase
        .from("cart")
        .select(`
          id,
          quantity,
          product_variants (
            id,
            variant,
            unit,
            wholesale_price,
            mrp,
            min_quantity,
            stock,
            products (name, brand, product_images (image_url))
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;
      setCartItems(data || []);
    } catch (err) {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (id: string, newQty: number, minQty: number) => {
    if (newQty < minQty) {
      toast.error(`Minimum order for this item is ${minQty}`);
      return;
    }
    const { error } = await supabase.from("cart").update({ quantity: newQty }).eq("id", id);
    if (!error) {
      setCartItems(items => items.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    }
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("cart").delete().eq("id", id);
    if (!error) {
      setCartItems(items => items.filter(item => item.id !== id));
      toast.success("Removed from cart");
    }
  };

  const subtotal = cartItems.reduce((acc, item) => 
    acc + (item.product_variants.wholesale_price * item.quantity), 0
  );

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing Bulk Order...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Toaster />
      
      {/* Editorial Header */}
      <div className="bg-white border-b border-slate-100 py-12 px-4 mb-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Wholesale Vault</span>
              <span className="text-slate-300 text-sm font-bold">{cartItems.length} Items</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Your Cart</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 1. ITEMS LIST */}
        <div className="lg:col-span-8 space-y-4">
          {cartItems.length > 0 ? cartItems.map((item) => {
            const variant = item.product_variants;
            const product = variant.products;
            const img = product.product_images?.[0]?.image_url;

            return (
              <div key={item.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                <div className="relative h-24 w-24 bg-slate-50 rounded-2xl flex-shrink-0 overflow-hidden">
                  <Image src={img || "/placeholder.png"} alt={product.name} fill className="object-contain p-2" />
                </div>

                <div className="flex-grow text-center md:text-left">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">{product.brand}</p>
                  <h3 className="font-black text-slate-900 uppercase text-sm mb-1">{product.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">Variant: {variant.variant} {variant.unit}</p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1, variant.min_quantity)} className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 shadow-sm transition-colors"><Minus size={14} /></button>
                  <span className="text-sm font-black text-slate-900 w-8 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1, variant.min_quantity)} className="h-8 w-8 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md"><Plus size={14} /></button>
                </div>

                <div className="text-right min-w-[100px]">
                  <p className="text-xs text-slate-300 line-through font-bold">₹{variant.mrp * item.quantity}</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">₹{(variant.wholesale_price * item.quantity).toLocaleString()}</p>
                </div>

                <button onClick={() => removeItem(item.id)} className="p-4 text-slate-300 hover:text-red-600 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            );
          }) : (
            <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
              <ShoppingBag className="mx-auto text-slate-200 mb-6" size={64} />
              <h2 className="text-2xl font-black text-slate-900 uppercase">Your cart is empty</h2>
              <Link href="/Wholesale/productgallery" className="mt-6 inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all">Browse Inventory <ArrowRight size={18} /></Link>
            </div>
          )}
        </div>

        {/* 2. SUMMARY SECTION */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-900 rounded-[2.5rem] p-8 sticky top-28 shadow-2xl shadow-slate-200">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
              Order Summary <PackageCheck className="text-red-600" />
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-slate-900">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-widest">
                <span>Bulk GST (18%)</span>
                <span className="text-slate-900">₹{(subtotal * 0.18).toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-100 my-4" />
              <div className="flex justify-between items-end">
                <span className="text-xs font-black uppercase text-slate-400">Grand Total</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{(subtotal * 1.18).toLocaleString()}</span>
              </div>
            </div>

         <Link 
  href="/Wholesale/checkout" 
  className="w-full bg-red-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-orange-200 hover:bg-slate-900 transition-all duration-500 flex items-center justify-center"
>
  Proceed to Checkout
</Link>
            
            <p className="text-[10px] text-center text-slate-400 mt-6 font-bold uppercase leading-relaxed">
              * Official Wholesale Invoice will be generated <br /> after payment verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}