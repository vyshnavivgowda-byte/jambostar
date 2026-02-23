import Link from "next/link";
import Image from "next/image";
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Mail, 
  Phone, 
  Send,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-[#0a0a0b] text-slate-400 pt-20 pb-6 overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-red-600/5 blur-[100px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Column 1: Brand Identity */}
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="inline-block">
              <Image 
                src="/logoremovebg.png" // Using your specific path
                alt="Jumbostar Logo" 
                width={140} 
                height={45} 
                className="object-contain"
                priority
              />
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              Premium wholesale and retail solutions. Delivering excellence in every package since 2024. Your trusted partner for quality daily essentials.
            </p>
            <div className="flex gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <Link 
                  key={i} 
                  href="#" 
                  className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-600 hover:border-red-600 hover:-translate-y-1 transition-all duration-300 text-white"
                >
                  <Icon size={16} />
                </Link>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em]">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/categories" className="hover:text-red-500 transition-colors">Categories</Link></li>
              <li><Link href="/products" className="hover:text-red-500 transition-colors">All Products</Link></li>
              <li><Link href="/offers" className="hover:text-red-500 transition-colors">Bulk Orders</Link></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em]">Service</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/terms" className="hover:text-red-500 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/shipping" className="hover:text-red-500 transition-colors">Shipping Info</Link></li>
              <li><Link href="/contact" className="hover:text-red-500 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 4: Newsletter/Contact */}
          <div className="lg:col-span-4 space-y-6">
            <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em]">Join Our Network</h4>
            <div className="relative group">
              <input 
                type="email" 
                placeholder="Business email..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-red-600 transition-all text-sm text-white"
              />
              <button className="absolute right-1.5 top-1.5 bottom-1.5 bg-red-600 hover:bg-red-700 text-white px-4 rounded-lg transition-all">
                <Send size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <ShieldCheck size={14} className="text-green-500" />
              Verified Wholesale Provider
            </div>
          </div>
        </div>

        {/* Final Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[11px] tracking-wider text-slate-500 uppercase font-medium">
            © 2024 Jumbostar Retail. All rights reserved.
          </div>

          {/* Developer Credit - Rakvih */}
          <div className="group">
            <a 
              href="https://rakvih.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] tracking-wide text-slate-500 hover:text-white transition-colors"
            >
              <span>Designed & Developed by</span>
              <span className="font-bold text-slate-300 group-hover:text-red-500 transition-colors uppercase">Rakvih</span>
              <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}