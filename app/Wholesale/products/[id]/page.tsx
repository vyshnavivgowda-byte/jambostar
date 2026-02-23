"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import {
    Star, ArrowLeft, ArrowRight,
    ShoppingCart, Heart, Plus, Minus, ChevronLeft, ChevronRight, CheckCircle2, X, Flashlight, Zap
} from "lucide-react";
import Link from "next/link";
import ProductCard from "@/Components/ProductCard";
import toast, { Toaster } from "react-hot-toast";

const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
    const userStr = localStorage.getItem("wholesale_user");
    return userStr ? JSON.parse(userStr).id : null;
};

export default function ProductPage() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [activeImg, setActiveImg] = useState(0);
    const [activeVariantIdx, setActiveVariantIdx] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isInCart, setIsInCart] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showMoqModal, setShowMoqModal] = useState(false);
    const [modalMode, setModalMode] = useState<"cart" | "buy">("cart");

    useEffect(() => {
        async function fetchFullData() {
            setLoading(true);
            const { data: mainProduct } = await supabase
                .from("products")
                .select(`*, product_images (*), product_variants (*)`)
                .eq("id", id)
                .single();

            if (mainProduct) {
                setProduct(mainProduct);
                const firstVariant = mainProduct.product_variants?.[0];
                setQuantity(firstVariant?.min_quantity || 1);

                const userId = await getUserId();
                if (userId) {
                    const { data: wish } = await supabase.from("wishlist").select("id").eq("user_id", userId).eq("product_id", id).maybeSingle();
                    if (wish) setIsInWishlist(true);

                    const variantIds = mainProduct.product_variants.map((v: any) => v.id);
                    const { data: cart } = await supabase.from("cart").select("id").eq("user_id", userId).in("variant_id", variantIds).maybeSingle();
                    if (cart) setIsInCart(true);
                }

                const { data: related } = await supabase
                    .from("products")
                    .select(`*, product_images (*), product_variants (*)`)
                    .or(`subcategory_id.eq.${mainProduct.subcategory_id},inner_category_id.eq.${mainProduct.inner_category_id}`)
                    .neq("id", id)
                    .limit(10);
                setRelatedProducts(related || []);
            }
            setLoading(false);
        }
        fetchFullData();
    }, [id]);

    const toggleWishlist = async () => {
        const userId = await getUserId();
        if (!userId) {
            toast.error("Please login first");
            return;
        }
        if (isInWishlist) {
            const { error } = await supabase.from("wishlist").delete().eq("user_id", userId).eq("product_id", id);
            if (!error) {
                setIsInWishlist(false);
                toast.success("Removed from wishlist");
            }
        } else {
            const { error } = await supabase.from("wishlist").insert([{ user_id: userId, product_id: id }]);
            if (!error) {
                setIsInWishlist(true);
                toast.success("Added to wishlist", { icon: '❤️' });
            }
        }
    };

    const handleActionClick = async (mode: "cart" | "buy") => {
        const userId = await getUserId();
        if (!userId) {
            toast.error("Please login to source products", { icon: '🔒' });
            return;
        }

        // If already in cart and clicking "Cart" mode, just go to checkout
        if (isInCart && mode === "cart") {
            router.push("/Wholesale/cart");
            return;
        }

        setModalMode(mode);
        setQuantity(currentVariant.min_quantity);
        setShowMoqModal(true);
    };

    const confirmAction = async () => {
        setActionLoading(true);
        const userId = await getUserId();

        try {
            // 1. Add to the Supabase "cart" table
            const { error } = await supabase.from("cart").insert([
                {
                    user_id: userId,
                    variant_id: currentVariant.id,
                    quantity: quantity
                }
            ]);

            if (error) {
                // If the item is already in cart, Supabase might throw an error 
                // depending on your unique constraints. We handle it here:
                if (error.code === '23505') { // Unique violation code
                    toast.error("Item already in cart. Redirecting...");
                } else {
                    throw error;
                }
            };

            setIsInCart(true);
            setShowMoqModal(false);

            // 2. Logic Check: Where to redirect?
            if (modalMode === "buy") {
                toast.success("Added to cart! Opening your vault...");
                router.push("/Wholesale/cart"); // Go to Cart Page
            } else {
                toast.success(`Added ${quantity} units to cart!`);
            }

        } catch (err: any) {
            console.error(err);
            toast.error("Could not update cart");
        } finally {
            setActionLoading(false);
        }
    };
    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="h-12 w-12 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin" />
        </div>
    );

    if (!product) return <div className="p-20 text-center font-black">PRODUCT_NOT_FOUND</div>;

    const currentVariant = product.product_variants[activeVariantIdx];
    const images = product.product_images;
    const minQty = currentVariant.min_quantity;
    const wholesale = currentVariant.wholesale_price;

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Toaster position="bottom-center" />

            <nav className="bg-white/80  top-0 z-50 border-b border-slate-100 ">
                <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/Wholesale/productgallery" className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Gallery
                    </Link>
                </div>
            </nav>

            <main className="max-w-[1400px] mx-auto px-6 pt-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">

                    {/* IMAGE GALLERY */}
                    <div className="lg:col-span-6">
                        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm relative group">
                            <div className="absolute top-6 left-6 z-10">
                                <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                                    {product.brand}
                                </span>
                            </div>
                            <div className="relative aspect-square">
                                <Image
                                    src={images[activeImg]?.image_url}
                                    alt={product.name}
                                    fill
                                    className="object-contain p-12 lg:p-20 group-hover:scale-105 transition-transform duration-700"
                                    priority
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6 justify-center">
                            {images.map((img: any, i: number) => (
                                <button
                                    key={img.id}
                                    onClick={() => setActiveImg(i)}
                                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${activeImg === i ? 'border-red-600 shadow-md' : 'border-transparent bg-white opacity-60'}`}
                                >
                                    <Image src={img.image_url} alt="thumb" fill className="object-cover p-1" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CONTENT */}
                    <div className="lg:col-span-6 space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-[1px] w-6 bg-red-600"></div>
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em]">Commercial Grade</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <h1 className="text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">{product.name}</h1>
                                <Heart
                                    onClick={toggleWishlist}
                                    size={24}
                                    fill={isInWishlist ? "#ef4444" : "none"}
                                    className={`${isInWishlist ? "text-red-500" : "text-slate-300"} hover:text-red-500 cursor-pointer transition-all mt-2`}
                                />
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                                {product.description || "Engineered for high-volume distribution and professional grade environments."}
                            </p>
                        </div>

                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Wholesale Price</p>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-5xl font-black text-slate-900 tracking-tighter">₹{currentVariant.wholesale_price}</span>
                                        <span className="text-lg text-slate-300 line-through font-bold">₹{currentVariant.mrp}</span>
                                    </div>
                                </div>
                                <div className="text-right pb-1">
                                    <div className="flex items-center gap-2 text-green-500 font-bold text-xs"><CheckCircle2 size={14} /> In Stock</div>
                                    <p className="text-[10px] text-slate-400 font-medium">{currentVariant.stock} units ready</p>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-slate-50 pt-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Variant</p>
                                <div className="flex flex-wrap gap-2">
                                    {product.product_variants.map((v: any, i: number) => (
                                        <button
                                            key={v.id}
                                            onClick={() => { setActiveVariantIdx(i); setQuantity(v.min_quantity); }}
                                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${activeVariantIdx === i ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-slate-50 text-slate-500 border-transparent hover:border-slate-200"}`}
                                        >
                                            {v.variant} {v.unit}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={() => handleActionClick("cart")}
                                    disabled={actionLoading}
                                    className={`h-14 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border-2 ${isInCart
                                            ? "border-slate-900 text-slate-900 hover:bg-slate-50"
                                            : "border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900"
                                        }`}
                                >
                                    <ShoppingCart size={16} />
                                    {isInCart ? "In Bulk Cart" : "Add To Cart"}
                                </button>

                                <button
                                    onClick={() => handleActionClick("buy")}
                                    disabled={actionLoading}
                                    className="h-14 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] bg-red-600 text-white hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                                >
                                    <Zap size={16} fill="white" />
                                    Buy Now
                                </button>
                            </div>

                            <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                                Minimum Order: {currentVariant.min_quantity} units
                            </p>
                        </div>
                    </div>
                </div>

                {/* RECOMMENDED SECTION (Kept same as before) */}
                <section className="py-20 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-12">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">RECOMMENDED FROM VAULT</h2>
                        <div className="flex gap-2">
                            <button onClick={() => scroll("left")} className="h-12 w-12 rounded-xl border border-slate-200 flex items-center justify-center bg-white text-slate-900"><ChevronLeft size={20} /></button>
                            <button onClick={() => scroll("right")} className="h-12 w-12 rounded-xl border border-slate-200 flex items-center justify-center bg-white text-slate-900"><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    <div ref={scrollRef} className="flex gap-6 overflow-x-auto scrollbar-hide snap-x pb-8">
                        {relatedProducts.map((p) => (
                            <div key={p.id} className="min-w-[280px] md:min-w-[320px] snap-start">
                                <ProductCard product={p} />
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* MODAL */}
            {showMoqModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-xl font-black text-slate-900">{modalMode === "buy" ? "Express Checkout" : "Bulk Sourcing"}</h4>
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Min. Order: {minQty} {currentVariant.unit}</p>
                            </div>
                            <button onClick={() => setShowMoqModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"><X size={20} /></button>
                        </div>

                        <div className="bg-slate-50 rounded-3xl p-6 flex items-center justify-between mb-8">
                            <button disabled={quantity <= minQty} onClick={() => setQuantity(q => q - 1)} className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm disabled:opacity-30"><Minus size={20} /></button>
                            <div className="text-center">
                                <span className="text-3xl font-black text-slate-900">{quantity}</span>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Units</p>
                            </div>
                            <button onClick={() => setQuantity(q => q + 1)} className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={20} /></button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm font-bold px-2">
                                <span className="text-slate-400">Total:</span>
                                <span className="text-slate-900">₹{(wholesale * quantity).toLocaleString()}</span>
                            </div>
                            <button
                                onClick={confirmAction}
                                disabled={actionLoading}
                                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all disabled:bg-slate-200"
                            >
                                {actionLoading ? "Processing..." : modalMode === "buy" ? "Confirm & Checkout" : "Add to Bulk Cart"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}