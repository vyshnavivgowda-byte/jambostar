"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Package,
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutGrid,
  Home,
  ShoppingBag
} from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const checkUser = () => {
      const savedUser = localStorage.getItem("wholesale_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        setUser(null);
      }
    };

    checkUser();
    window.addEventListener("wholesale_login", checkUser);
    return () => window.removeEventListener("wholesale_login", checkUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("wholesale_user");
    setUser(null);
    setIsProfileOpen(false);
    // Use window.location.href to redirect to home on logout
    window.location.href = "/Wholesale/home";
  };
  // Inside Header component
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const fetchCounts = async () => {
    const savedUser = localStorage.getItem("wholesale_user");
    if (!savedUser) {
      setCartCount(0);
      setWishlistCount(0);
      return;
    }
    const userId = JSON.parse(savedUser).id;

    // Fetch Cart Count
    const { count: cCount } = await supabase
      .from("cart")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId);

    // Fetch Wishlist Count
    const { count: wCount } = await supabase
      .from("wishlist")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId);

    setCartCount(cCount || 0);
    setWishlistCount(wCount || 0);
  };

  useEffect(() => {
    fetchCounts();

    // Listen for login and manual updates
    window.addEventListener("wholesale_login", fetchCounts);
    window.addEventListener("cartUpdated", fetchCounts); // Custom event

    return () => {
      window.removeEventListener("wholesale_login", fetchCounts);
      window.removeEventListener("cartUpdated", fetchCounts);
    };
  }, [user]);
  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16 md:h-20 gap-4">

            {/* Logo - Reduced Size */}
            <Link href="/" className="flex-shrink-0 transition-opacity hover:opacity-80">
              <Image src="/logoremovebg.png" alt="Logo" width={50} height={60} className="object-contain" priority />
            </Link>
            {/* Search Bar - Desktop */}
            <div className="hidden xl:flex flex-1 max-w-xs relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-slate-50 pl-10 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-red-500/10 focus:bg-white border border-slate-200 focus:border-red-500/30 transition-all font-medium text-xs text-slate-900"
              />
            </div>
            {/* Main Navigation - ALWAYS VISIBLE */}
            <nav className="hidden lg:flex items-center gap-8">
              <NavLink href="/Wholesale/home" icon={<Home size={18} />} label="Home" />
              <NavLink href="/Wholesale/categories" icon={<LayoutGrid size={18} />} label="Categories" />
              <NavLink href="/Wholesale/productgallery" icon={<ShoppingBag size={18} />} label="Products" />
            </nav>



            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-4">

              {!user ? (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all shadow-md shadow-red-100"
                >
                  Login
                </button>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Wishlist Link */}
                  <Link href="/Wholesale/wishlist" className="p-2 text-slate-600 hover:text-red-600 transition-colors relative">
                    <Heart size={20} />
                    {wishlistCount > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>

                  {/* Cart Link */}
                  <Link href="/Wholesale/cart" className="p-2 text-slate-600 hover:text-red-600 transition-colors relative">
                    <ShoppingCart size={20} />
                    {cartCount > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>

                  {/* Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-1 p-1 pr-2 bg-slate-50 rounded-full border border-slate-200 hover:border-red-200 transition-all"
                    >
                      <div className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center text-white shadow-inner">
                        <User size={16} />
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-4 py-3 border-b border-slate-50 mb-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Account</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
                        </div>

                        <MenuLink href="/Wholesale/profile" icon={<User size={16} />} label="My Profile" />
                        <MenuLink href="/Wholesale/orders" icon={<Package size={16} />} label="Orders" />

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all mt-1"
                        >
                          <LogOut size={16} /> Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 p-4 space-y-2 animate-in slide-in-from-top duration-300">
            <MobileNavLink href="/" label="Home" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink href="/categories" label="Categories" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink href="/products" label="Products" onClick={() => setIsMenuOpen(false)} />
          </div>
        )}
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

// --- Helper Components ---

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-red-600 transition-colors group">
      <span className="text-slate-400 group-hover:text-red-500 transition-colors">{icon}</span>
      {label}
    </Link>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-red-600 rounded-xl transition-all">
      {icon} {label}
    </Link>
  );
}

function MobileNavLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-3 text-base font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
    >
      {label}
    </Link>
  );
}