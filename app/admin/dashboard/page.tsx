import React from 'react';
import Link from 'next/link';
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Boxes, Layers, ListTree, PackagePlus, 
  Edit, Users, ShoppingCart, ImageIcon, Package, ChevronRight,
  TrendingUp, ArrowUpRight
} from 'lucide-react';

// --- Data Fetching ---
async function getDashboardStats() {
  try {
    const [products, mainCats, subCats, innerCats, wholesaleUsers, orders] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('subcategories').select('*', { count: 'exact', head: true }),
      supabase.from('inner_categories').select('*', { count: 'exact', head: true }),
      supabase.from('wholesale_users').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalProducts: products.count || 0,
      totalCategories: (mainCats.count || 0) + (subCats.count || 0) + (innerCats.count || 0),
      totalWholesale: wholesaleUsers.count || 0,
      totalOrders: orders.count || 0,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { totalProducts: 0, totalCategories: 0, totalWholesale: 0, totalOrders: 0 };
  }
}

// --- Components ---
const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">{title}</p>
        <h3 className="text-4xl font-black text-slate-900 tracking-tight">{value.toLocaleString()}</h3>
      </div>
      <div className={`${colorClass} p-3 rounded-2xl text-white shadow-lg transform group-hover:rotate-12 transition-transform`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
    </div>
    <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
      <TrendingUp size={14} className="mr-1" /> Live Syncing
    </div>
  </div>
);

const QuickLink = ({ item }: any) => (
  <Link 
    href={item.path}
    className="group relative flex items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-white transition-all duration-200"
  >
    <div className={`p-3 rounded-xl bg-white shadow-sm ${item.color} group-hover:scale-110 transition-transform`}>
      <item.icon size={22} strokeWidth={2.5} />
    </div>
    <div className="flex-1">
      <span className="block font-extrabold text-slate-800 text-sm leading-tight">{item.name}</span>
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Manage Section</span>
    </div>
    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
      <ArrowUpRight size={18} className="text-indigo-500" />
    </div>
  </Link>
);

// --- Main Page ---
export default async function AdminDashboard() {
  const data = await getDashboardStats();

  const menuItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard, color: "text-blue-500" },
    { name: "Main Categories", path: "/admin/categories", icon: Boxes, color: "text-purple-500" },
    { name: "Sub Categories", path: "/admin/subcategories", icon: Layers, color: "text-orange-500" },
    { name: "Add Product", path: "/admin/add-product", icon: PackagePlus, color: "text-emerald-500" },
    { name: "Stock Control", path: "/admin/update-stock", icon: Edit, color: "text-amber-500" },
    { name: "Wholesale", path: "/admin/wholesale", icon: Users, color: "text-cyan-500" },
    { name: "Orders", path: "/admin/orders", icon: ShoppingCart, color: "text-red-500" },
    { name: "Banners", path: "/admin/banner", icon: ImageIcon, color: "text-indigo-500" },
  ];

  const stats = [
    { title: "Products", value: data.totalProducts, icon: Package, colorClass: "bg-gradient-to-br from-blue-500 to-blue-700" },
    { title: "Categories", value: data.totalCategories, icon: ListTree, colorClass: "bg-gradient-to-br from-purple-500 to-purple-700" },
    { title: "Wholesalers", value: data.totalWholesale, icon: Users, colorClass: "bg-gradient-to-br from-emerald-500 to-emerald-700" },
    { title: "Sales", value: data.totalOrders, icon: ShoppingCart, colorClass: "bg-gradient-to-br from-orange-500 to-orange-700" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-indigo-100">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-blue-100/50 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 max-w-9xl mx-auto p-6 md:p-12">
        {/* Header Section */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50  text-xs font-bold mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
              </span>
              SYSTEM ONLINE
            </div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900">
              Dashboard<span className="text-black">.</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2">Jumbostar Management & Logistics</p>
          </div>
          
         
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </section>

        {/* Quick Links Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Navigation</h2>
            <div className="h-px flex-1 bg-slate-200 mx-6 hidden md:block" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item, index) => (
              <QuickLink key={index} item={item} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}