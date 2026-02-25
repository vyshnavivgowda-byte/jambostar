"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Loader2, PackageCheck, LockKeyhole } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AuthModal from "@/Components/AuthModal"; // Path adjusted to your folder structure

export default function CartPage() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userStr = localStorage.getItem("wholesale_user");
    
    if (session?.user || userStr) {
      setIsLoggedIn(true);
      fetchCart(session?.user?.id || JSON.parse(userStr!).id);
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  };

  const fetchCart = async (userId: string) => {
    try {
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
      toast.error(`Minimum order is ${minQty}`);
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
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Your Vault...</p>
    </div>
  );

  // NOT LOGGED IN STATE
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
       <div className="bg-white rounded-[2.5rem] p-10 md:p-20 text-center border border-slate-100 shadow-xl max-w-lg w-full">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockKeyhole className="text-red-600" size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Access Denied</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">Your wholesale cart is encrypted. Please login to view your bulk selections and custom pricing.</p>
          <button 
            onClick={() => setShowAuthModal(true)}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg"
          >
            Login to Cart
          </button>
          <AuthModal isOpen={showAuthModal} onClose={() => { setShowAuthModal(false); checkUser(); }} />
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <Toaster position="bottom-center" />
      
      {/* Responsive Editorial Header */}
      <div className="bg-white border-b border-slate-100 py-8 md:py-12 px-4 mb-6 md:mb-10">
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Wholesale Vault</span>
              <span className="text-slate-300 text-xs font-bold uppercase">{cartItems.length} Items</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">Your Cart</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        
        {/* 1. ITEMS LIST - Mobile Optimized */}
        <div className="lg:col-span-8 space-y-4">
          {cartItems.length > 0 ? cartItems.map((item) => {
            const variant = item.product_variants;
            const product = variant.products;
            const img = product.product_images?.[0]?.image_url;

            return (
              <div key={item.id} className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4 md:gap-6 group transition-all">
                {/* Image */}
                <div className="relative h-20 w-20 md:h-24 md:w-24 bg-slate-50 rounded-2xl flex-shrink-0">
                  <Image src={img || "/placeholder.png"} alt={product.name} fill className="object-contain p-2" />
                </div>

                {/* Info */}
                <div className="flex-grow text-center sm:text-left">
                  <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">{product.brand}</p>
                  <h3 className="font-black text-slate-900 uppercase text-xs md:text-sm mb-1">{product.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{variant.variant} {variant.unit}</p>
                </div>

                {/* Controls & Price Row for Mobile */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 md:gap-8 border-t sm:border-0 pt-4 sm:pt-0">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1, variant.min_quantity)} className="h-7 w-7 bg-white rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 shadow-sm"><Minus size={12} /></button>
                      <span className="text-xs font-black text-slate-900 w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1, variant.min_quantity)} className="h-7 w-7 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-md"><Plus size={12} /></button>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="text-[10px] text-slate-300 line-through font-bold">₹{variant.mrp * item.quantity}</p>
                      <p className="text-lg font-black text-slate-900 tracking-tighter">₹{(variant.wholesale_price * item.quantity).toLocaleString()}</p>
                    </div>

                    <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                      <Trash2 size={18} />
                    </button>
                </div>
              </div>
            );
          }) : (
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-12 md:p-20 text-center border-2 border-dashed border-slate-200">
              <ShoppingBag className="mx-auto text-slate-200 mb-6" size={48} />
              <h2 className="text-xl font-black text-slate-900 uppercase">Cart is Empty</h2>
              <Link href="/Wholesale/productgallery" className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all">Browse Inventory <ArrowRight size={16} /></Link>
            </div>
          )}
        </div>

        {/* 2. SUMMARY SECTION - Mobile Bottom Sticky style on scroll */}
        <div className="lg:col-span-4">
          <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 md:p-8 sticky top-24 shadow-xl">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
              Order Summary <PackageCheck className="text-red-600" size={20} />
            </h3>
            
            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-slate-900">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Bulk GST (18%)</span>
                <span className="text-slate-900">₹{(subtotal * 0.18).toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-100 my-4" />
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-400">Grand Total</span>
                <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">₹{(subtotal * 1.18).toLocaleString()}</span>
              </div>
            </div>

            <Link 
              href="/Wholesale/checkout" 
              className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
            >
              Proceed to Checkout <ArrowRight size={16} />
            </Link>
            
            <p className="text-[8px] text-center text-slate-400 mt-6 font-bold uppercase leading-relaxed">
              * Official Wholesale Invoice will be generated <br /> after payment verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}