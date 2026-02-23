"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation"; // 1. Import this
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/Components/ProductCard";
import ProductFilter from "@/Components/ProductFilter";

function GalleryContent() {
    const searchParams = useSearchParams(); // 2. Hook to read URL params

    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 3. Initialize state using URL parameters
    const [filters, setFilters] = useState({
        category: searchParams.get("category") || null,
        subcategory: searchParams.get("subcategory") || null,
        innerCategory: searchParams.get("innerCategory") || null,
        sort: searchParams.get("sort") || "relevant"
    });

    // 4. Update filters if URL changes (e.g., user clicks a different link)
    useEffect(() => {
        const category = searchParams.get("category");
        const subcategory = searchParams.get("subcategory");
        const innerCategory = searchParams.get("innerCategory");

        // We update the filters state
        setFilters({
            category: category,
            subcategory: subcategory,
            innerCategory: innerCategory,
            sort: searchParams.get("sort") || "relevant"
        });
    }, [searchParams]);

    useEffect(() => {
        async function fetchSidebarData() {
            const { data } = await supabase
                .from("categories")
                .select(`
                    id, name,
                    subcategories (
                        id, title,
                        inner_categories (id, title)
                    )
                `);
            setCategories(data || []);
        }
        fetchSidebarData();
    }, []);

    // IMPORTANT: Update the query logic to be more specific
    useEffect(() => {
        async function fetchFilteredProducts() {
            setLoading(true);
            let query = supabase
                .from("products")
                .select("*, product_images(image_url), product_variants(*)");

            // Prioritize the deepest level of filtering
            if (filters.innerCategory) {
                query = query.eq("inner_category_id", filters.innerCategory);
            } else if (filters.subcategory) {
                query = query.eq("subcategory_id", filters.subcategory);
            } else if (filters.category) {
                query = query.eq("category_id", filters.category);
            }
            // Sorting Logic
            if (filters.sort === "low") query = query.order("wholesale_price", { foreignTable: "product_variants", ascending: true });
            else if (filters.sort === "high") query = query.order("wholesale_price", { foreignTable: "product_variants", ascending: false });
            else if (filters.sort === "newest") query = query.order("created_at", { ascending: false });

            const { data } = await query;
            setProducts(data || []);
            setLoading(false);
        }
        fetchFilteredProducts();
    }, [filters]);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="max-w-[1500px] mx-auto px-4 py-10">
                {/* PREMIUM WAREHOUSE HEADER */}
                <header className="relative pt-1 pb-1 px-4 overflow-hidden">
                    <div className="absolute -top-12 left-0 text-[180px] font-black text-slate-50 select-none -z-10 tracking-tighter leading-none opacity-60">
                        VAULT
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 max-w-[1440px] mx-auto">
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <span className="h-[1px] w-8 bg-red-600"></span>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">
                                    Global <span className="text-red-600">Sourcing</span> Portal
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-[-0.05em] flex items-center gap-x-4 flex-wrap">
                                Product
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-400 italic font-serif font-light">
                                    Library
                                </span>
                                <span className="h-2 w-2 rounded-full bg-slate-200 hidden md:block"></span>
                            </h1>
                        </div>

                        <div className="relative flex items-center gap-6 bg-white border border-slate-100 rounded-[2rem] p-4 pr-8 shadow-sm group hover:shadow-md transition-all duration-500">
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                        {products.length.toString().padStart(2, '0')}
                                    </span>
                                    <span className="text-red-600 text-sm font-bold uppercase tracking-widest">Units</span>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Batches</p>
                            </div>
                            <div className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white shadow-sm"></span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="max-w-[1500px] mx-auto px-4 flex flex-col lg:flex-row gap-12 py-10">
                    <aside className="w-full lg:w-[300px] shrink-0">
                        <div className="sticky top-24 bg-white border border-slate-100 rounded-[2.5rem] p-8">
                            <ProductFilter
                                categories={categories}
                                activeFilters={filters}
                                onFilterChange={(newFilters: any) => setFilters(newFilters)}
                            />
                        </div>
                    </aside>

                    <main className="flex-grow">
                        {loading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                                {[...Array(8)].map((_, i) => <div key={i} className="h-80 bg-slate-50 rounded-[2.5rem]" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {products.map((p) => (
                                    <ProductCard key={p.id} product={p} />
                                ))}
                            </div>
                        )}
                        {!loading && products.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                                <p className="text-slate-400 font-bold uppercase tracking-widest">No products found in this selection</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

// 5. Wrap in Suspense to prevent build errors with useSearchParams
export default function WholesaleGallery() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Gallery...</div>}>
            <GalleryContent />
        </Suspense>
    );
}