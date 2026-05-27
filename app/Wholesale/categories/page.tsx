"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, LayoutGrid, Tag, ArrowRight, Layers, Box, Compass } from "lucide-react";

interface InnerCategory {
  id: string;
  title: string;
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
  const [activeCategory, setActiveCategory] = useState<string>("");

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select(`
          id, name, image_url,
          subcategories (
            id, title, image_url,
            inner_categories (id, title)
          )
        `)
        .order("name", { ascending: true });

      if (!error && data) {
        setCategories(data);
        if (data.length > 0) setActiveCategory(data[0].id);
      }
      setLoading(false);
    }
    fetchCategories();
  }, []);

  const scrollToSection = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Account for sticky headers
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 1. HERO SECTION - Adjusted heights and font sizes for mobile */}
      <section className="relative w-full h-[60vh] md:h-[50vh] flex items-center overflow-hidden bg-slate-900">
        <Image
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
          alt="Wholesale Inventory"
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F8FAFC]" />

        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-600/10 border border-red-600/20 text-red-600 mb-4 animate-fade-in">
              <Compass size={12} className="animate-spin-slow" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Bulk Buying • Category Based
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-6">
              Wholesale <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                Categories.
              </span>
            </h1>

            <p className="text-slate-600 text-base md:text-xl font-medium max-w-2xl">
              Browse products by category and purchase in bulk with competitive pricing.
            </p>
          </div>
        </div>
      </section>

      {/* 2. MOBILE CATEGORY NAV (Sticky Horizontal Scroll) */}
      <div className="sticky top-0 z-30 lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex whitespace-nowrap px-6 py-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToSection(cat.id)}
              className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${activeCategory === cat.id ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* 3. DESKTOP SIDEBAR */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Jump to Section</h3>
              <nav className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => scrollToSection(cat.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeCategory === cat.id
                        ? "bg-white text-red-600 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                      }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* 4. MAIN CONTENT */}
          <main className="flex-1 space-y-16 md:space-y-24">
            {categories
              .filter((category) => category.subcategories && category.subcategories.length > 0)
              .map((category) => (
                <section key={category.id} id={category.id} className="scroll-mt-20 md:scroll-mt-32">

                  {/* CATEGORY HEADER */}
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-6 bg-red-600 rounded-full" />
                        <span className="text-red-600 font-black text-[10px] uppercase tracking-widest">Explore</span>
                      </div>
                      <h2 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tight ">
                        {category.name}<span className="text-red-600">.</span>
                      </h2>
                    </div>

                    <Link
                      href={`/Wholesale/productgallery?category=${category.id}`}
                      className="group inline-flex items-center gap-3 text-slate-900 font-bold text-xs uppercase tracking-tighter"
                    >
                      All Products
                      <div className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-red-600 group-hover:border-red-600 group-hover:text-white transition-all">
                        <ArrowRight size={14} />
                      </div>
                    </Link>
                  </div>

                  {/* SUBCATEGORIES GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {category.subcategories?.map((sub) => (
                      <div
                        key={sub.id}
                        className="group flex flex-col bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 overflow-hidden transition-all hover:shadow-xl"
                      >
                        <div className="relative h-48 md:h-56 w-full overflow-hidden">
                          <Image
                            src={sub.image_url || "https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=1000&auto=format&fit=crop"}
                            alt={sub.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                          <div className="absolute bottom-4 left-5">
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">{sub.title}</h3>
                          </div>
                        </div>

                        <div className="p-4 md:p-6 space-y-1">
                          {sub.inner_categories?.slice(0, 4).map((inner) => (
                            <Link
                              key={inner.id}
                              href={`/Wholesale/productgallery?category=${category.id}&subcategory=${sub.id}&innerCategory=${inner.id}`}
                              className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                            >
                              <span className="text-sm font-bold text-slate-600">{inner.title}</span>
                              <ChevronRight size={14} className="text-slate-300" />
                            </Link>
                          ))}
                          <Link
                            href={`/Wholesale/productgallery?category=${category.id}&subcategory=${sub.id}`}
                            className="flex items-center gap-2 p-3 text-[10px] font-black text-red-600 uppercase tracking-widest pt-4"
                          >
                            View All <Layers size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </main>
        </div>
      </div>
    </div>
  );
}

// Optimized Loading Skeleton for Mobile
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-[40vh] bg-slate-100 animate-pulse" />
      <div className="px-6 py-8 space-y-12">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-80 bg-slate-50 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}