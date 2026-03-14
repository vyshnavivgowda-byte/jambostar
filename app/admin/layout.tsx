"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Layers,
  ListTree, CreditCard, 
  PackagePlus,
  Edit,
  Truck,
  Users,
  ShoppingCart,
  ImageIcon,
  LogOut,
  Bell,
  ChevronRight,
  UserCircle,
  Landmark   // ✅ ADD THIS
} from "lucide-react";
export default function AdminHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const adminEmail = "Jsadmin@gmail.com";

  useEffect(() => {
    setMounted(true);
    const isAdmin = localStorage.getItem("adminAuth");
    if (!isAdmin) {
      router.push("/adminlogin");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    router.push("/adminlogin");
  };

  const menuItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Main Categories", path: "/admin/categories", icon: Boxes },
    { name: "Sub Categories", path: "/admin/subcategories", icon: ListTree  },
    // --- NEW TAB ADDED BELOW ---
    //{ name: "SubCategories", path: "/admin/innercategories", icon: ListTree },
    // ---------------------------
    { name: "Add Product", path: "/admin/add-product", icon: PackagePlus },
    { name: "Update Price & Stock", path: "/admin/update-stock", icon: Edit },
    { name: "Wholesale Management", path: "/admin/wholesale", icon: Users },
    { name: "Bank Details", path: "/admin/bank-details", icon: Landmark },
    { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
    { name: "Payment Approvals", path: "/admin/payment-approvals", icon: CreditCard },
    // --- DELIVERY ALLOTMENT TAB ADDED HERE ---
    { name: "Delivery Allotment", path: "/admin/delivery", icon: Truck },
    // -----------------------------------------
    { name: "Banner Management", path: "/admin/banner", icon: ImageIcon },
  ];

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFEFF]">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col fixed h-full z-50 transition-all duration-300">
        
        {/* Logo Section */}
        <div className="p-8">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/admin/dashboard')}>
            <div className="w-12 h-12 bg-red-600 text-white flex items-center justify-center rounded-2xl font-black text-2xl shadow-lg shadow-red-200 group-hover:rotate-6 transition-transform">
              J
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tighter">
                JUMBO<span className="text-red-600">STAR</span>
              </h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 mt-2">Main Controls</p>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center justify-between group px-4 py-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-red-600 text-white shadow-xl shadow-red-100"
                    : "text-gray-500 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${
                    isActive ? "bg-white/20 shadow-inner" : "bg-gray-50 group-hover:bg-white"
                  }`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-sm font-bold tracking-tight ${isActive ? "font-black" : ""}`}>
                    {item.name}
                  </span>
                </div>
                {isActive && <ChevronRight size={14} className="opacity-70 animate-pulse" />}
              </button>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-6 mt-auto border-t border-gray-50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all group"
          >
            <div className="p-2 bg-gray-50 group-hover:bg-white rounded-xl transition-colors">
              <LogOut size={18} />
            </div>
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col ml-72">

        {/* STICKY TOP HEADER */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-10 py-5 flex justify-between items-center">
          <div>
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
              Administration
            </h2>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {pathname === "/admin/dashboard" ? "Dashboard Overview" : pathname.split("/").pop()?.replace("-", " ").toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-6">
           
            
            <div className="h-8 w-[1px] bg-gray-100"></div>

            <div className="flex items-center gap-4 bg-gray-50 pl-2 pr-4 py-1.5 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
                <UserCircle size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Logged in as</span>
                <span className="text-xs font-bold text-gray-800 tracking-tight">{adminEmail}</span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-1">
          <div className="max-w-15xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Hide Scrollbar CSS */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}