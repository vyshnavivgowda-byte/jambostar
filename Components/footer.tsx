import Link from "next/link";
import Image from "next/image";
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  ExternalLink,
  ShieldCheck,
  MapPin,
  Clock
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-[#0a0a0b] text-slate-400 pt-20 pb-8 overflow-hidden border-t border-white/5">
      {/* Subtle Background Glows for Depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-slate-500/5 blur-[150px] rounded-full" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">
          
          {/* Column 1: Brand Identity & Small Logo */}
          <div className="lg:col-span-5 space-y-8">
            <Link href="/" className="inline-block group">
              <Image 
                src="/logoremovebg.png" 
                alt="Jumbostar Logo" 
                width={100} // Reduced logo size for premium feel
                height={32} 
                className="object-contain brightness-110 opacity-90 group-hover:opacity-100 transition-all duration-500"
                priority
              />
            </Link>
            <p className="text-sm leading-relaxed text-slate-500 max-w-md font-medium">
              Jumbostar stands at the intersection of quality and reliability. We provide 
              seamless wholesale and retail infrastructure for daily essentials, 
              empowering businesses across the region since 2024.
            </p>
            
            {/* Trust Indicators (Replacing the Input Box) */}
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                <ShieldCheck size={16} className="text-red-600" />
                Verified Partner
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                <Clock size={16} className="text-red-600" />
                Quick Verification
              </div>
            </div>
          </div>

          {/* Column 2: Platform Links */}
          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-white text-[11px] font-black uppercase tracking-[0.3em]">Platform</h4>
            <ul className="space-y-4 text-[13px] font-bold uppercase tracking-wider">
              <li><Link href="/categories" className="hover:text-red-500 transition-colors">Categories</Link></li>
              <li><Link href="/products" className="hover:text-red-500 transition-colors">Product Gallery</Link></li>
              <li><Link href="/offers" className="hover:text-red-500 transition-colors">Bulk Deals</Link></li>
            </ul>
          </div>

          {/* Column 3: Legal & Support */}
          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-white text-[11px] font-black uppercase tracking-[0.3em]">Service</h4>
            <ul className="space-y-4 text-[13px] font-bold uppercase tracking-wider">
              <li><Link href="/privacy" className="hover:text-red-500 transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-red-500 transition-colors">Terms of Trade</Link></li>
              <li><Link href="/contact" className="hover:text-red-500 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Column 4: Social Presence */}
          <div className="lg:col-span-3 space-y-6">
            <h4 className="text-white text-[11px] font-black uppercase tracking-[0.3em]">Connect</h4>
            <div className="flex gap-4 mb-6">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <Link 
                  key={i} 
                  href="#" 
                  className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-600 hover:border-red-600 hover:-translate-y-1 transition-all duration-300 text-white"
                >
                  <Icon size={18} />
                </Link>
              ))}
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-500">
              <MapPin size={14} className="mt-0.5 text-red-600" />
              <span className="leading-relaxed font-medium">Headquarters: Industrial Hub, <br /> Karnataka, India</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Credits */}
        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] tracking-[0.2em] text-slate-600 uppercase font-black">
            © 2024 Jumbostar Wholesale. All rights reserved.
          </div>

          {/* Developer Credit - Rakvih */}
          <div className="group">
            <a 
              href="https://rakvih.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-[10px] tracking-[0.1em] text-slate-500 hover:text-white transition-colors"
            >
              <span className="font-medium uppercase">Engineering by</span>
              <span className="font-black text-slate-300 group-hover:text-red-600 transition-colors uppercase text-xs">Rakvih</span>
              <div className="p-1.5 bg-white/5 rounded-lg group-hover:bg-red-600 transition-colors">
                <ExternalLink size={10} className="text-white" />
              </div>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}