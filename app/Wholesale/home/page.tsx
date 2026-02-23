"use client"; // Top of file if using Next.js App Router

import React from 'react';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation, EffectFade, FreeMode } from "swiper/modules";
import {
  ArrowUpRight,
  ArrowRight, ShoppingBag, Star, ImageOff, Heart,
  Sparkles, ShieldCheck, Truck, Zap, Plus
} from "lucide-react";

// Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-fade";
import 'swiper/css/free-mode';
export default function HomePage() {
  const [generalBanners, setGeneralBanners] = useState<any[]>([]);
  const [discountBanners, setDiscountBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Add subcategories to your state
  const [subcategories, setSubcategories] = useState<any[]>([]);

  // 2. Update the fetchHomeData inside useEffect
  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Added "subcategories" to the Promise.all
        const [genRes, discRes, catRes, prodRes, subRes] = await Promise.all([
          supabase.from("general_banners").select("*").order("id", { ascending: false }),
          supabase.from("discount_banners").select("*").limit(3),
          supabase.from("categories").select("*").order("name"),
          supabase.from("products").select(`
          *, 
          categories(name), 
          product_images(image_url),
          product_variants(*)
        `).order("created_at", { ascending: false }).limit(8),
          supabase.from("subcategories").select("*") // Fetch all subcategories
        ]);

        if (genRes.data) setGeneralBanners(genRes.data);
        if (discRes.data) setDiscountBanners(discRes.data);
        if (catRes.data) setCategories(catRes.data);
        if (prodRes.data) setRecentProducts(prodRes.data);
        if (subRes.data) setSubcategories(subRes.data); // Set subcategories
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);



  const [currentSlide, setCurrentSlide] = useState(0);
  const mainBanners = discountBanners.slice(0, 3);
  const sideBanners = discountBanners.slice(3, 5);

  // Auto-scroll logic
  useEffect(() => {
    if (mainBanners.length < 2) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mainBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [mainBanners.length]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="relative flex items-center justify-center">
        <div className="h-20 w-20 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin"></div>
        <Image src="/logo.png" alt="Loading" width={40} height={40} className="absolute" />
      </div>
    </div>
  );

  return (
    <main className="bg-white">

      {/* SECTION 1: PREMIUM HERO SLIDER */}
      {/* SECTION 1: PREMIUM HERO SLIDER */}
      <section className="relative h-[450px] md:h-[550px] overflow-hidden bg-slate-900">
        <Swiper
          effect={"fade"}
          speed={1000}
          autoplay={{ delay: 7000, disableOnInteraction: false }}
          pagination={{
            clickable: true,
            renderBullet: (index, className) => {
              return `<span class="${className} !bg-white !w-12 !h-1 !rounded-none"></span>`;
            }
          }}
          navigation={true}
          modules={[Autoplay, Pagination, Navigation, EffectFade]}
          className="h-full w-full custom-hero-swiper group"
        >
          {generalBanners.map((banner) => (
            <SwiperSlide key={banner.id}>
              <div className="relative h-full w-full flex items-center">

                {/* Background with Zoom & Gradient Overlay */}
                <div className="absolute inset-0">
                  <Image
                    src={banner.image_url}
                    alt={banner.title}
                    fill
                    priority
                    className="object-cover transition-transform duration-[10s] scale-100 group-hover:scale-110"
                  />
                  {/* Multi-layered overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/40 to-transparent" />
                  <div className="absolute inset-0 bg-slate-900/10 backdrop-contrast-125" />
                </div>

                {/* Content Wrapper */}
                <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full">
                  <div className="max-w-2xl">

                    {/* Animated Badge */}
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                        Limited Release
                      </span>
                    </div>

                    {/* Headline with High Contrast */}
                    <h1 className="text-4xl md:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                      {banner.title}

                    </h1>

                    {/* Refined Description */}
                    <p className="max-w-md text-slate-200 text-base md:text-lg mb-10 leading-relaxed drop-shadow-md animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                      {banner.short_description}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
                      <Link
                        href="/products"
                        className="group/btn bg-white hover:bg-red-600 text-slate-900 hover:text-white px-10 py-4 rounded-full font-bold text-sm flex items-center gap-3 transition-all duration-300 shadow-[0_15px_30px_-10px_rgba(255,255,255,0.2)]"
                      >
                        Explore Now
                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                      </Link>

                      <Link
                        href="/collections"
                        className="bg-transparent border border-white/30 hover:bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-full font-bold text-sm transition-all"
                      >
                        View Catalog
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* SECTION 2: BROWSE CATEGORIES (Modern Editorial Tiles) */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 -mt-16 md:-mt-20 relative z-20">
        <div className="bg-white/90 backdrop-blur-3xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/60">

          {/* Grid System: Scrollable on Mobile, Grid on Desktop */}
          <div className="flex overflow-x-auto pb-4 md:pb-0 md:grid md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 no-scrollbar">
            {categories
              .sort((a, b) => a.name.localeCompare(b.name))
              .slice(0, 6)
              .map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="group relative flex-shrink-0 w-[140px] md:w-auto overflow-hidden rounded-3xl bg-slate-50 transition-all duration-500 hover:bg-white hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-1"
                >
                  {/* Background Highlight on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="p-4 flex flex-col items-center">
                    {/* Image Container: Rectangular with "Floating" Shadow */}
                    <div className="relative h-24 w-full md:h-28 rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-md transition-all duration-500">
                      <Image
                        src={cat.image_url || "/placeholder.png"}
                        alt={cat.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {/* Subtle Inner Glow Overlay */}
                      <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl" />
                    </div>

                    {/* Typography: Clean, Wide Spaced */}
                    <div className="text-center space-y-1">
                      <h3 className="text-[10px] md:text-[11px] font-bold text-slate-900 uppercase tracking-[0.15em] transition-colors group-hover:text-red-600">
                        {cat.name}
                      </h3>
                      <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                        Browse
                      </p>
                    </div>
                  </div>

                  {/* Bottom Accent Bar */}
                  <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-red-600 transition-all duration-500 group-hover:w-full" />
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: TRENDING ARRIVALS - EDITORIAL REDESIGN */}
      <section className="max-w-[1400px] mx-auto px-6 py-24 bg-white overflow-hidden">

        {/* Header: High-End Luxury Layout */}
        <div className="relative mb-5">
          <div className="flex flex-col gap-2">
            {/* Decorative Floating Label */}
            <div className="flex items-center gap-4 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-red-600 bg-red-50 px-3 py-1 rounded-sm">
                Issue No. 01
              </span>
              <div className="h-[1px] flex-grow bg-slate-100"></div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="relative">
                {/* Background Ghost Text for Texture */}
                <span className="absolute -top-10 -left-4 text-8xl font-black text-slate-50 select-none -z-10 tracking-tighter">
                  TOP
                </span>

                <h2 className="text-6xl md:text-8xl font-black text-slate-900 tracking-[-0.06em] leading-[0.8] mb-2">
                  Trending
                  <span className="relative inline-block mt-2">
                    <span className="text-slate-900"> Now</span>
                    <span className="absolute -bottom-2 left-0 w-full h-3 bg-red-600/10 -rotate-1"></span>
                  </span>
                </h2>

                <p className="mt-6 text-slate-400 font-medium uppercase text-[10px] tracking-[0.3em] max-w-xs leading-relaxed">
                  Curated selection of this week's <br /> most sought-after essentials.
                </p>
              </div>

              {/* Action Link: Minimalist & Bold */}
              <Link
                href="/products"
                className="group relative inline-flex items-center gap-8 pr-4"
              >
                <div className="flex flex-col items-end">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-red-600 transition-colors">
                    Collection
                  </span>
                  <span className="text-slate-900 text-lg font-black uppercase tracking-tighter group-hover:pr-2 transition-all">
                    Explore Library
                  </span>
                </div>

                <div className="relative h-14 w-14 rounded-full border border-slate-900 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:bg-slate-900 group-hover:text-white group-hover:rotate-45">
                  <ArrowUpRight size={24} strokeWidth={2.5} />
                  {/* Hover Circle Fill Effect */}
                  <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-10"></div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* SWIPER PRODUCT ROW (Horizontal Scroll) */}
        <div className="relative group/swiper">
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={40}
            slidesPerView={1.2}
            navigation={{
              nextEl: ".next-trending",
              prevEl: ".prev-trending",
            }}
            breakpoints={{
              640: { slidesPerView: 2.2 },
              1024: { slidesPerView: 3.2 },
              1280: { slidesPerView: 4 },
            }}
            autoplay={{ delay: 5000, disableOnInteraction: true }}
            className="!overflow-visible"
          >
            {recentProducts.map((product) => (
              <SwiperSlide key={product.id}>
                {/* Product Cards here */}
                <ProductCard product={product} />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Elegant Navigation Controls */}
          <div className="flex gap-4 mt-12 justify-center md:justify-start">
            <button className="prev-trending h-12 w-12 border border-slate-200 rounded-full flex items-center justify-center bg-slate-900 hover:text-white transition-all disabled:opacity-20">
              <ArrowRight className="rotate-180" size={20} />
            </button>
            <button className="next-trending h-12 w-12 border border-slate-200 rounded-full flex items-center justify-center bg-slate-900 hover:text-white transition-all disabled:opacity-20">
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4: SUBCATEGORY EXPLORER */}
      <section className="bg-[#f8fafc] py-24 overflow-hidden">
        <div className="max-w-9xl mx-auto px-6">

          {categories.map((category) => {
            const relatedSubs = subcategories.filter(sub => sub.category_id === category.id);
            if (relatedSubs.length === 0) return null;

            return (
              <div key={category.id} className="mb-20 last:mb-0">
                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                  <div className="space-y-1">
                    <span className="text-red-600 font-bold text-sm uppercase tracking-[0.2em]">
                      Explore Collection
                    </span>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                      {category.name}
                    </h3>
                  </div>
                  <Link
                    href={`/Wholesale/productgallery?category=${category.id}`}
                    className="text-slate-500 hover:text-red-600 font-semibold text-sm transition-colors flex items-center gap-2 group"
                  >
                    View All Products
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>

                {/* --- SLIDER SECTION --- */}
                <Swiper
                  modules={[Autoplay, FreeMode, Pagination]}
                  spaceBetween={24}
                  slidesPerView={1.4}
                  freeMode={true}
                  grabCursor={true}
                  autoplay={{ delay: 4000, disableOnInteraction: false }}
                  breakpoints={{
                    640: { slidesPerView: 2.5 },
                    1024: { slidesPerView: 4.2 },
                    1280: { slidesPerView: 5.2 },
                  }}
                  className="!overflow-visible"
                >
                  {relatedSubs.map((sub) => (
                    <SwiperSlide key={sub.id} className="pb-4">
                      <Link
                        href={`/Wholesale/productgallery?category=${category.id}&subcategory=${sub.id}`}
                        className="group relative block"
                      >
                        {/* Image Container */}
                        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-hover:-translate-y-2">
                          <Image
                            src={sub.image_url || "/placeholder.png"}
                            alt={sub.title}
                            fill
                            className="object-cover transition-transform duration-1000 group-hover:scale-110"
                          />

                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                          {/* Text Overlay (Internal) */}
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <p className="text-white/70 text-[10px] uppercase tracking-widest mb-1 font-bold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                              View Category
                            </p>
                            <h4 className="text-white text-lg font-bold leading-tight">
                              {sub.title}
                            </h4>
                          </div>
                        </div>

                        {/* External Label (Optional - minimalist backup) */}
                        <div className="mt-4 flex items-center justify-between px-2">
                          <div className="h-1 w-0 bg-red-600 transition-all duration-500 group-hover:w-8" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {category.name.split(' ')[0]}
                          </span>
                        </div>
                      </Link>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 5: Discount*/}
      <section className="max-w-[1400px] mx-auto px-2">
        {/* HEADER AREA: SEASONAL / DISCOUNT SECTION */}
        <div className="relative mb-12 px-4">
          {/* Decorative Background Element */}
          <div className="absolute -top-6 left-0 text-[120px] font-black text-slate-50 select-none -z-10 tracking-tighter leading-none opacity-50">
            OFFERS
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              {/* Animated Top Label */}
              <div className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full mb-3 shadow-lg shadow-red-200">
                <Sparkles size={12} className="animate-pulse" />
                <span className="font-black text-[9px] uppercase tracking-[0.2em]">
                  Exclusive Deals
                </span>
              </div>

              <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-[-0.05em] leading-[0.9]">
                Seasonal
                <span className="text-red-600  font-serif font-light">Highlights</span>
              </h2>

              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-4 flex items-center gap-3">
                <span className="h-[1px] w-8 bg-slate-200"></span>
                on Bulk Orders
              </p>
            </div>

            {/* View All Button: Editorial Style */}
            <Link
              href="/products"
              className="group flex items-center gap-4 bg-slate-900 text-white pl-6 pr-2 py-2 rounded-full hover:bg-red-600 transition-all duration-500 w-fit self-start md:self-end"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">
                View All Collections
              </span>
              <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
                <ArrowUpRight size={20} />
              </div>
            </Link>
          </div>
        </div>
        {/* BENTO GRID CONTAINER - Modified for full width row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[400px] md:h-[500px]">

          {/* MAIN AUTO-SCROLLING HERO (Now taking full 12 columns) */}
          <div className="md:col-span-12 relative rounded-[3rem] overflow-hidden bg-white shadow-sm group">
            <div
              className="flex h-full transition-transform duration-[1000ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {mainBanners.map((banner, index) => (
                <div key={index} className="relative min-w-full h-full overflow-hidden">
                  <Image
                    src={banner.image_url}
                    alt={banner.title || ""}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-[6s] ease-linear"
                  />

                </div>
              ))}
            </div>

            {/* Navigation Dots - Centered for a full-row look */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 items-center">
              {mainBanners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`transition-all duration-500 rounded-full border border-white/50 ${currentSlide === i ? "w-12 h-2 bg-white" : "w-2 h-2 bg-white/30"
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: TRUST FEATURES - EDITORIAL REDESIGN */}
      <section className="max-w-10xl mx-auto px-6 py-24">
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-slate-100 pb-12">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[1px] w-10 bg-red-600"></div>
                <span className="text-red-600 font-black text-[10px] uppercase tracking-[0.4em]">
                  Service Philosophy
                </span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-[-0.04em] leading-none">
                Built on <span className="text-slate-300  font-light">Trust</span>,
                Driven by <span className="text-slate-300 font-light">Quality</span>.
              </h2>
            </div>
            <p className="text-slate-400 text-sm  font-medium max-w-[280px] leading-relaxed">
              We eliminate the complexity of bulk sourcing by maintaining absolute control over the entire supply chain.
            </p>
          </div>

          {/* Features Grid with Custom Borders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 group/container">
            <FeatureItem
              number="01"
              icon={<ShieldCheck size={28} />}
              title="Quality Assured"
              desc="Multi-stage Sortex cleaning ensures zero impurities."
              className="lg:border-r border-slate-100"
            />
            <FeatureItem
              number="02"
              icon={<Truck size={28} />}
              title="Express Dispatch"
              desc="Priority 24-hour processing for every order."
              className="lg:border-r border-slate-100"
            />
            <FeatureItem
              number="03"
              icon={<Zap size={28} />}
              title="Direct Source"
              desc="Farm-to-warehouse logic. No middlemen markups."
              className="lg:border-r border-slate-100"
            />
            <FeatureItem
              number="04"
              icon={<ShoppingBag size={28} />}
              title="Wholesale Edge"
              desc="Industry-leading rates for bulk procurement."
              className=""
            />
          </div>
        </div>
      </section>



      <style jsx global>{`
        .animate-subtle-zoom { animation: subtle-zoom 20s infinite alternate linear; }
        @keyframes subtle-zoom { from { transform: scale(1); } to { transform: scale(1.15); } }
        .custom-hero-swiper .swiper-pagination-bullet { background: white !important; opacity: 0.5; width: 12px; height: 12px; }
        .custom-hero-swiper .swiper-pagination-bullet-active { opacity: 1; width: 30px; border-radius: 6px; background: #e11d48 !important; }
        .custom-hero-swiper .swiper-button-next, .custom-hero-swiper .swiper-button-prev { color: white !important; scale: 0.7; }
      `}</style>
    </main>
  );
}

function FeatureItem({ icon, title, desc, number, className }: any) {
  return (
    <div className={`
      relative overflow-hidden transition-all duration-700 
      bg-white border border-slate-100 rounded-[2.5rem] 
      hover:shadow-[0_40px_80px_-15px_rgba(220,38,38,0.1)] 
      hover:-translate-y-2 group ${className}
    `}>
      
      {/* 1. Large Subtle Watermark Number */}
      <span className="absolute -bottom-4 -right-2 text-[120px] font-black text-slate-50 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 select-none">
        {number}
      </span>

      {/* 2. Top-Right "Accent" Number */}
      <div className="absolute top-8 right-10 flex flex-col items-center">
        <span className="text-[10px] font-black tracking-widest  text-red-600 transition-colors">
          NO.
        </span>
        <span className="text-xl font-black text-red-600 transition-colors -mt-1">
          {number}
        </span>
      </div>

      <div className="relative z-10 p-10 md:p-14 flex flex-col h-full">
        {/* 3. Icon Container with specialized glow */}
        <div className="relative mb-12 inline-flex">
           <div className="absolute inset-0 bg-red-100 rounded-2xl blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
           <div className="relative p-4 bg-slate-50 rounded-2xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 group-hover:rotate-[10deg] shadow-sm">
             {React.cloneElement(icon, { size: 28, strokeWidth: 1.5 })}
           </div>
        </div>

        {/* 4. Text Content */}
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-3">
            {title}
            <div className="h-[1px] w-0 bg-red-600 transition-all duration-500 group-hover:w-8" />
          </h4>
          <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[260px]">
            {desc}
          </p>
        </div>

        {/* 5. Bottom Interactive Element */}
        <div className="mt-auto pt-8 flex items-center gap-2">
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-red-600 transition-colors">
             Learn More
           </span>
           <div className="h-[2px] w-4 bg-slate-200 group-hover:w-10 group-hover:bg-red-600 transition-all duration-500" />
        </div>
      </div>

      {/* 6. Corner Gradient (Only visible on hover) */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}