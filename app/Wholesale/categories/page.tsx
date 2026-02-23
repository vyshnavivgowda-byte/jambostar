"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, LayoutGrid, Tag, ArrowRight } from "lucide-react";

interface InnerCategory {
  id: string;
  title: string;
  image_url: string | null;
}

interface Subcategory {
  id: string;
  title: string;
  image_url: string | null;
  inner_categories?: InnerCategory[];
}

interface Category {
  id: string;
  name: string;
  image_url: string | null;
  subcategories?: Subcategory[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select(`
          id, name, image_url,
          subcategories (
            id, title, image_url,
            inner_categories (id, title, image_url)
          )
        `)
        .order("name", { ascending: true });

      if (error) {
        setError("Failed to load inventory categories.");
      } else {
        setCategories(data || []);
      }
      setLoading(false);
    }
    fetchCategories();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* BIG HERO IMAGE SECTION */}
      <section className="relative w-full h-[60vh] min-h-[400px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop" // Replace with your primary brand image
          alt="Wholesale Inventory"
          fill
          className="object-cover"
          priority
        />
        {/* Light Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent" />
        
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full mb-6">
                Official Catalog 2026
              </span>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                Global <span className="text-red-600">Sourcing</span> <br /> 
                Simplified.
              </h1>
              <p className="mt-6 text-slate-700 text-lg font-medium leading-relaxed">
                Browse our complete multi-tier inventory. From raw materials to finished products, find everything your business needs in one organized hierarchy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT ARCHITECTURE */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="space-y-32">
          {categories.map((category) => (
            <div key={category.id} className="scroll-mt-20">
              {/* CATEGORY HEADER */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-2 border-slate-50 pb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <LayoutGrid className="text-red-600" size={24} />
                    <span className="text-red-600 font-bold uppercase tracking-widest text-xs">Primary Category</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 uppercase">
                    {category.name}
                  </h2>
                </div>
                <Link 
                  href={`/Wholesale/productgallery?category=${category.id}`}
                  className="group flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all hover:bg-[#e64615] hover:shadow-lg hover:shadow-orange-200"
                >
                  View All {category.name}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* SUBCATEGORIES GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {category.subcategories?.map((sub) => (
                  <div key={sub.id} className="group flex flex-col bg-[#FDFDFD] rounded-[2.5rem] border border-slate-100 p-2 transition-all duration-500 hover:border-orange-200 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50">
                    
                    {/* SUB-IMAGE (Optional/Small) */}
                    <div className="relative h-48 w-full rounded-[2rem] overflow-hidden bg-slate-100">
                      {sub.image_url ? (
                        <Image src={sub.image_url} alt={sub.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">No Image</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{sub.title}</h3>
                        <Link 
                          href={`/Wholesale/productgallery?category=${category.id}&subcategory=${sub.id}`}
                          className="text-red-600 p-2 rounded-full border border-orange-100 hover:bg-red-600 hover:text-white transition-all"
                        >
                          <ChevronRight size={20} />
                        </Link>
                      </div>

                      {/* INNER CATEGORY LIST */}
                      <div className="space-y-2">
                        {sub.inner_categories?.slice(0, 5).map((inner) => (
                          <Link
                            key={inner.id}
                            href={`/Wholesale/productgallery?category=${category.id}&subcategory=${sub.id}&innerCategory=${inner.id}`}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-orange-50 group/item transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Tag size={14} className="text-slate-300 group-hover/item:text-red-600" />
                              <span className="text-sm font-semibold text-slate-600 group-hover/item:text-slate-900">{inner.title}</span>
                            </div>
                            <ChevronRight size={14} className="text-transparent group-hover/item:text-red-600 group-hover/item:opacity-100 transition-all" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-[50vh] bg-slate-50 w-full animate-pulse" />
      <div className="max-w-7xl mx-auto p-12 space-y-20">
        <div className="h-12 w-1/3 bg-slate-50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-10">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-80 bg-slate-50 rounded-[2.5rem] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}