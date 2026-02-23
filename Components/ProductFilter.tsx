"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, SlidersHorizontal, RotateCcw } from "lucide-react";

export default function ProductFilter({
    categories = [],
    activeFilters,
    onFilterChange
}: any) {
    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const [expandedSub, setExpandedSub] = useState<string | null>(null);

    // FIX: Auto-expand logic for Inner Categories
    useEffect(() => {
        if (activeFilters.innerCategory && categories.length > 0) {
            // Find which category and subcategory this inner item belongs to
            categories.forEach((cat: any) => {
                cat.subcategories?.forEach((sub: any) => {
                    const match = sub.inner_categories?.find(
                        (inner: any) => inner.id === activeFilters.innerCategory
                    );
                    if (match) {
                        setExpandedCat(cat.id);
                        setExpandedSub(sub.id);
                    }
                });
            });
        } else {
            // Fallback for just Category or Subcategory
            if (activeFilters.category) setExpandedCat(activeFilters.category);
            if (activeFilters.subcategory) setExpandedSub(activeFilters.subcategory);
        }
    }, [activeFilters.innerCategory, activeFilters.category, activeFilters.subcategory, categories]);

    // ... handleReset and Render logic
    const sortOptions = [
        { id: "relevant", label: "Most Relevant" },
        { id: "low", label: "Price: Low to High" },
        { id: "high", label: "Price: High to Low" },
        { id: "newest", label: "Newest Arrivals" },
    ];

    const handleReset = () => {
        onFilterChange({ sort: "relevant", category: null, subcategory: null, innerCategory: null });
        setExpandedCat(null);
        setExpandedSub(null);
    };

    return (
        <div className="flex flex-col gap-12 select-none">
            {/* 1. HEADER & RESET */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">Refine Selection</h4>
                </div>
                <button onClick={handleReset} className="text-red-600 hover:rotate-[-90deg] transition-all duration-300">
                    <RotateCcw size={14} />
                </button>
            </div>

            {/* 2. SORTING ENGINE */}
            <section className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 block mb-2">Sorting Order</label>
                <div className="grid grid-cols-1 gap-2">
                    {sortOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => onFilterChange({ ...activeFilters, sort: opt.id })}
                            className={`relative text-left px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                                activeFilters?.sort === opt.id
                                ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                                : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            <span className="relative z-10">{opt.label}</span>
                            {activeFilters?.sort === opt.id && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 h-1.5 w-1.5 bg-red-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </section>

            {/* 3. HIERARCHICAL NAV */}
            <section className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 block mb-2">Inventory Categories</label>
                <div className="flex flex-col gap-3">
                    {categories?.map((cat: any) => (
                        <div key={cat.id} className="group/cat">
                            <button
                                onClick={() => {
                                    const isClosing = expandedCat === cat.id;
                                    setExpandedCat(isClosing ? null : cat.id);
                                    onFilterChange({ ...activeFilters, category: cat.id, subcategory: null, innerCategory: null });
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-3xl border transition-all duration-500 ${
                                    activeFilters?.category === cat.id
                                    ? "border-red-600 bg-white text-slate-900 shadow-md"
                                    : "border-transparent text-slate-500 hover:bg-slate-50"
                                }`}
                            >
                                <span className="text-[12px] font-black uppercase tracking-tighter">{cat.name}</span>
                                <div className={`transition-transform duration-500 ${expandedCat === cat.id ? 'rotate-180 text-red-600' : 'text-slate-300'}`}>
                                    <ChevronDown size={16} strokeWidth={3} />
                                </div>
                            </button>

                            {/* Subcategories */}
                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedCat === cat.id ? 'max-h-[800px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="flex flex-col gap-1 ml-4 border-l-2 border-slate-100 pl-4">
                                    {cat.subcategories?.map((sub: any) => (
                                        <div key={sub.id} className="py-1">
                                            <button
                                                onClick={() => {
                                                    setExpandedSub(expandedSub === sub.id ? null : sub.id);
                                                    onFilterChange({ ...activeFilters, subcategory: sub.id, innerCategory: null });
                                                }}
                                                className={`w-full flex items-center justify-between text-[11px] font-bold py-2 transition-all ${
                                                    activeFilters?.subcategory === sub.id ? "text-red-600" : "text-slate-400 hover:text-slate-900"
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`h-1.5 w-1.5 rounded-full transition-all ${activeFilters?.subcategory === sub.id ? 'bg-red-600 scale-125' : 'bg-slate-200'}`} />
                                                    {sub.title}
                                                </span>
                                                {sub.inner_categories?.length > 0 && <ChevronRight size={12} className={`transition-transform ${expandedSub === sub.id ? 'rotate-90' : ''}`} />}
                                            </button>

                                            {/* Inner Categories */}
                                            <div className={`overflow-hidden transition-all duration-300 ${expandedSub === sub.id ? 'max-h-[300px] my-2' : 'max-h-0'}`}>
                                                <div className="flex flex-wrap gap-2 ml-3">
                                                    {sub.inner_categories?.map((inner: any) => (
                                                        <button
                                                            key={inner.id}
                                                            onClick={() => onFilterChange({ ...activeFilters, innerCategory: inner.id })}
                                                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                                                activeFilters?.innerCategory === inner.id
                                                                ? "bg-slate-900 text-white"
                                                                : "bg-slate-50 text-slate-400 hover:bg-slate-200"
                                                            }`}
                                                        >
                                                            {inner.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. FOOTER BADGE */}
            <div className="mt-1 bg-red-600/5 rounded-3xl p-6 border border-red-600/10 text-center">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-2">Expert Curation</p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Browsing Jumbostar Wholesale archive.</p>
            </div>
        </div>
    );
}