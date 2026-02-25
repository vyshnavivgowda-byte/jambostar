"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, SlidersHorizontal, RotateCcw, X, Filter } from "lucide-react";

export default function ProductFilter({
    categories = [],
    activeFilters,
    onFilterChange
}: any) {
    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const [expandedSub, setExpandedSub] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false); // Controls mobile drawer visibility

    // Auto-expand logic (Kept from your original)
    useEffect(() => {
        if (activeFilters.innerCategory && categories.length > 0) {
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
            if (activeFilters.category) setExpandedCat(activeFilters.category);
            if (activeFilters.subcategory) setExpandedSub(activeFilters.subcategory);
        }
    }, [activeFilters.innerCategory, activeFilters.category, activeFilters.subcategory, categories]);

    const sortOptions = [
        { id: "relevant", label: "Most Relevant" },
        { id: "low", label: "Wholesale: Low to High" }, // Updated label
        { id: "high", label: "Wholesale: High to Low" }, // Updated label
    ];

    const handleReset = () => {
        onFilterChange({ sort: "relevant", category: null, subcategory: null, innerCategory: null });
        setExpandedCat(null);
        setExpandedSub(null);
    };

    // Shared Filter Content (Used for both Desktop & Mobile)
    const FilterContent = () => (
        <div className="flex flex-col gap-10 select-none pb-20 lg:pb-0">
            {/* 1. HEADER & RESET */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">Refine Selection</h4>
                </div>
                <button onClick={handleReset} className="text-red-600 hover:rotate-[-90deg] transition-all duration-300 flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest lg:hidden">Reset</span>
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
                            className={`relative text-left px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activeFilters?.sort === opt.id
                                ? "bg-slate-900 text-white shadow-lg"
                                : "text-slate-400 bg-slate-50 lg:bg-transparent hover:bg-slate-100 hover:text-slate-900"
                                }`}
                        >
                            {opt.label}
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
                                    setExpandedCat(expandedCat === cat.id ? null : cat.id);
                                    onFilterChange({ ...activeFilters, category: cat.id, subcategory: null, innerCategory: null });
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-3xl border transition-all duration-500 ${activeFilters?.category === cat.id
                                    ? "border-red-600 bg-white text-slate-900 shadow-md"
                                    : "border-slate-100 lg:border-transparent text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                <span className="text-[12px] font-black uppercase tracking-tighter">{cat.name}</span>
                                <ChevronDown size={16} className={`transition-transform duration-500 ${expandedCat === cat.id ? 'rotate-180 text-red-600' : 'text-slate-300'}`} />
                            </button>

                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedCat === cat.id ? 'max-h-[1000px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="flex flex-col gap-1 ml-4 border-l-2 border-slate-100 pl-4">
                                    {cat.subcategories?.map((sub: any) => (
                                        <div key={sub.id} className="py-1">
                                            <button
                                                onClick={() => {
                                                    setExpandedSub(expandedSub === sub.id ? null : sub.id);
                                                    onFilterChange({ ...activeFilters, subcategory: sub.id, innerCategory: null });
                                                }}
                                                className={`w-full flex items-center justify-between text-[11px] font-bold py-3 transition-all ${activeFilters?.subcategory === sub.id ? "text-red-600" : "text-slate-400"
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${activeFilters?.subcategory === sub.id ? 'bg-red-600' : 'bg-slate-200'}`} />
                                                    {sub.title}
                                                </span>
                                                {sub.inner_categories?.length > 0 && <ChevronRight size={12} className={expandedSub === sub.id ? 'rotate-90' : ''} />}
                                            </button>

                                            <div className={`overflow-hidden transition-all duration-300 ${expandedSub === sub.id ? 'max-h-[500px] my-2' : 'max-h-0'}`}>
                                                <div className="flex flex-wrap gap-2 ml-3">
                                                    {sub.inner_categories?.map((inner: any) => (
                                                        <button
                                                            key={inner.id}
                                                            onClick={() => onFilterChange({ ...activeFilters, innerCategory: inner.id })}
                                                            className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeFilters?.innerCategory === inner.id
                                                                ? "bg-slate-900 text-white"
                                                                : "bg-slate-100 text-slate-400"
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
        </div>
    );

    return (
        <>
            {/* MOBILE FLOATING ACTION BUTTON - UPDATED POSITION */}
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[70] lg:hidden">
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 active:scale-95 transition-transform border border-white/10"
                >
                    <Filter size={18} className="text-red-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Filter Items</span>
                </button>
            </div>
            {/* MOBILE DRAWER OVERLAY */}
            <div className={`fixed inset-0 pt-[88px] bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div
                    className={`bg-white rounded-t-[3rem] p-8 h-[calc(100vh-88px)] overflow-y-auto transition-transform duration-500 transform ${isOpen ? 'translate-y-0' : 'translate-y-full'
                        }`}
                >
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full" onClick={() => setIsOpen(false)} />
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-8 right-8 p-2 bg-slate-50 rounded-full text-slate-400"
                    >
                        <X size={20} />
                    </button>

                    <FilterContent />

                    <div className="sticky bottom-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-red-200"
                        >
                            Apply Selection
                        </button>
                    </div>
                </div>
            </div>

            {/* DESKTOP SIDEBAR RENDER */}
            <div className="hidden lg:block w-full">
                <FilterContent />
            </div>
        </>
    );
}