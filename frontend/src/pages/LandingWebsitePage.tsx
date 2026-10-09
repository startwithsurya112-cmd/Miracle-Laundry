import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSettings } from '../services/api';
import { Setting } from '../types';
import {
  WashingMachine,
  Sparkles,
  Truck,
  Clock,
  ShieldCheck,
  PhoneCall,
  MapPin,
  Mail,
  CheckCircle2,
  ArrowRight,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  Shirt,
  Scissors,
  Layers,
  Award,
  Flame,
  Droplets,
  Sun,
  Crown,
  ExternalLink,
  ThumbsUp,
  Briefcase,
} from 'lucide-react';

export const LandingWebsitePage: React.FC = () => {
  const navigate = useNavigate();
  const [setting, setSetting] = useState<Setting | undefined>(undefined);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  useEffect(() => {
    fetchSettings().then((res) => {
      if (res.success) setSetting(res.setting);
    });
  }, []);

  const shopName = setting?.shopName || 'Miracle Laundry';
  const logoUrl = setting?.logoUrl && !setting.logoUrl.includes('unsplash.com') ? setting.logoUrl : '/logo.jpg';
  const phone = setting?.phone || '+91 98765 43210';
  const cleanPhone = phone.replace(/\D/g, '');
  const email = setting?.email || 'contact@miraclelaundry.com';
  const address = '2/516 B Thiruvalluvar Nagar, Near ambal hospital, Malumichampatti, Coimbatore 641050';
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  // The 11 Exact Services
  const servicesList = [
    {
      id: 'wash-fold',
      title: 'Wash and Fold',
      category: 'Daily Laundry',
      icon: WashingMachine,
      badge: 'Popular',
      color: 'from-brand-600 to-cyan-600',
      shortDesc: 'Sanitized load wash with anti-bacterial softeners and neat precision folding.',
      features: ['Separated Customer Loads', 'Organic Detergents', 'Anti-Bacterial Rinse', 'Neat Folded Packaging'],
    },
    {
      id: 'ironing',
      title: 'Ironing',
      category: 'Steam Press',
      icon: Flame,
      badge: 'Crisp Press',
      color: 'from-amber-600 to-orange-600',
      shortDesc: 'High-pressure temperature-controlled steam pressing for wrinkle-free garments.',
      features: ['Zero Burn Risk', 'Crisp Crease Alignment', 'Suit & Formal Care', 'On-Hanger Packaging'],
    },
    {
      id: 'laundry',
      title: 'Laundry',
      category: 'Regular Care',
      icon: Droplets,
      badge: 'Daily Wash',
      color: 'from-cyan-600 to-blue-600',
      shortDesc: 'Individualized machine washing for everyday wear, t-shirts, and casual garments.',
      features: ['Hygienic Washing', 'Fabric Softening', 'Fresh Scent', 'Color Protection'],
    },
    {
      id: 'premium-laundry',
      title: 'Premium Laundry',
      category: 'Luxury Care',
      icon: Crown,
      badge: 'Luxury Wash',
      color: 'from-purple-600 to-indigo-600',
      shortDesc: 'Delicate luxury fabric care with organic detergent conditioners and hand-finish.',
      features: ['Gentle Low-Temp Cycle', 'Silk & Lace Safe', 'Extra Softening', 'Garment Bag Delivery'],
    },
    {
      id: 'dry-cleaning',
      title: 'Dry Cleaning',
      category: 'Organic Care',
      icon: Sparkles,
      badge: 'Expert Care',
      color: 'from-violet-600 to-fuchsia-600',
      shortDesc: 'Chemical-free organic dry cleaning for suits, blazers, silk, and heavy ethnic wear.',
      features: ['Non-Toxic Solvents', 'Stain Removal Treatment', 'Color Protection', 'Garment Bag Delivery'],
    },
    {
      id: 'starch-ironing',
      title: 'Starch + Ironing',
      category: 'Stiffening',
      icon: Sun,
      badge: 'Stiff Finish',
      color: 'from-amber-500 to-yellow-600',
      shortDesc: 'Traditional starching with steam pressing for formal shirts, dhotis & uniforms.',
      features: ['Natural Rice Starch', 'Custom Stiffness', 'Formal Crisp Finish', 'Wrinkle Protection'],
    },
    {
      id: 'wash-starch-ironing',
      title: 'Wash + Starch + Ironing',
      category: 'Complete Care',
      icon: Layers,
      badge: 'Complete Starch',
      color: 'from-emerald-600 to-teal-600',
      shortDesc: 'Full wash, natural starch treatment, and steam ironing for a crisp formal posture.',
      features: ['Full Sanitized Wash', 'Natural Starch Bath', 'Steam Ironing', 'Hanger Packaging'],
    },
    {
      id: 'saree-polishing',
      title: 'Saree Polishing',
      category: 'Ethnic Care',
      icon: Shirt,
      badge: 'Saree Care',
      color: 'from-pink-600 to-rose-600',
      shortDesc: 'Specialized silk saree roll polishing, luster restoration, and crease-free finish.',
      features: ['Luster Restoration', 'Silk Thread Protection', 'Roll Pressing', 'Boutique Finish'],
    },
    {
      id: 'saree-prepleating',
      title: 'Saree Pre-pleating',
      category: 'Instant Wear',
      icon: Scissors,
      badge: 'Easy Wear',
      color: 'from-teal-600 to-cyan-600',
      shortDesc: 'Precision pre-pleating and box folding for easy, instant 2-minute saree draping.',
      features: ['Precision Pleat Pins', 'Box Folding', 'Ready-to-Wear', 'Crease Retention'],
    },
    {
      id: 'shoes-cleaning',
      title: 'Shoes Cleaning',
      category: 'Footwear Spa',
      icon: ShieldCheck,
      badge: 'Footwear Care',
      color: 'from-blue-600 to-cyan-600',
      shortDesc: 'Deep hand-scrubbing, sole whitening, suede/leather polish & deodorizing.',
      features: ['Sneaker & Leather Scrub', 'Sole Whitening', 'Deodorization', 'Shape Retention'],
    },
    {
      id: 'bag-cleaning',
      title: 'Bag Cleaning',
      category: 'Accessory Care',
      icon: Briefcase,
      badge: 'Accessory Care',
      color: 'from-indigo-600 to-violet-600',
      shortDesc: 'Deep interior & exterior cleaning, stain removal & conditioning for bags & luggage.',
      features: ['Interior & Zip Cleaning', 'Leather Conditioning', 'Stain Removal', 'Odor Elimination'],
    },
  ];

  // Customer Reviews
  const reviews = [
    {
      name: 'Priya Sundaram',
      location: 'Malumichampatti, Coimbatore',
      rating: 5,
      comment: 'Miracle Laundry handled my silk saree polishing and wedding suit dry cleaning perfectly! No chemical smell and crisp packaging.',
      tag: 'Verified Customer',
    },
    {
      name: 'Karthik Raja',
      location: 'Thiruvalluvar Nagar, Coimbatore',
      rating: 5,
      comment: 'My white sneakers were completely restored like brand new. The shoe cleaning service here is unbelievable!',
      tag: 'Shoes Cleaning Review',
    },
    {
      name: 'Anita Raman',
      location: 'Coimbatore',
      rating: 5,
      comment: 'Very polite store staff, fast turnaround for my office formal shirts with Starch + Ironing. Highly recommended!',
      tag: 'Starch + Ironing',
    },
  ];

  const faqs = [
    {
      q: 'How do I book a service with Miracle Laundry?',
      a: 'Simply call us directly on ' + phone + '! You can tap any "Call Store" button on this website to talk to our store team immediately.',
    },
    {
      q: 'What are your store working hours?',
      a: 'We are open Monday to Friday from 08:00 AM to 09:00 PM for all laundry drop-offs, pickups, and customer service.',
    },
    {
      q: 'Do you provide doorstep pickup and delivery in Coimbatore?',
      a: 'Yes! We offer doorstep pickup and delivery. Call our store number to arrange your convenient time slot.',
    },
    {
      q: 'Are your detergents safe for baby clothes and sensitive skin?',
      a: 'Absolutely. We use 100% hypo-allergenic, eco-friendly German detergents that are tough on stains but gentle on skin.',
    },
    {
      q: 'What is the turnaround time for laundry and dry cleaning?',
      a: 'Standard wash & fold takes 24 to 48 hours. Dry cleaning takes 48 hours. Express turnaround is available for urgent needs.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src={logoUrl} alt={shopName} className="h-9 sm:h-10 w-auto object-contain rounded-xl border border-slate-800 shadow-md" />
            <div>
              <span className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                {shopName} <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              </span>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 -mt-0.5 tracking-wider uppercase">Smart & Eco Laundry</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-extrabold text-slate-300">
            <a href="#services" className="hover:text-brand-400 transition-colors">Our Services</a>
            <a href="#why-us" className="hover:text-brand-400 transition-colors">Why Us</a>
            <a href="#reviews" className="hover:text-brand-400 transition-colors">Reviews</a>
            <a href="#faq" className="hover:text-brand-400 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-brand-400 transition-colors">Contact</a>
          </nav>

          {/* Call CTA */}
          <div className="flex items-center gap-2.5">
            <a
              href={`tel:${cleanPhone}`}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-cyan-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-brand-600/30 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce" />
              <span>Call Store</span>
            </a>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION WITH BACKGROUND IMAGE */}
      {/* ========================================================================= */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden">
        {/* Full-width background image with dark overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero_laundry.jpg"
            alt="Miracle Laundry Store"
            className="w-full h-full object-cover object-center scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/80 backdrop-blur-xs" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10 space-y-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-950/90 border border-brand-800/80 text-brand-300 text-[11px] sm:text-xs font-extrabold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-spin" />
            <span>Premium Eco-Friendly Garment Care in Coimbatore</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12] max-w-3xl">
            Professional Garment Care by <span className="bg-gradient-to-r from-brand-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">{shopName}</span>
          </h1>

          <p className="text-xs sm:text-base text-slate-200 leading-relaxed max-w-2xl font-medium">
            Experience world-class garment washing, dry cleaning, steam pressing, saree pre-pleating, shoe cleaning, and bag care. Specialized solutions for every fabric type.
          </p>

          {/* Working Hours Badge (Desktop Only) */}
          <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs font-bold shadow-lg">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Store Hours: <strong className="text-white">Monday - Friday (08:00 AM - 09:00 PM)</strong></span>
          </div>

          {/* Call Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-start gap-3">
            <a
              href={`tel:${cleanPhone}`}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-cyan-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-brand-600/30 active:scale-95 transition-all flex items-center justify-center gap-2.5"
            >
              <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Call Store to Book: {phone}</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Query</span>
            </a>
          </div>

          {/* Highlights Bar */}
          <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-800/80 max-w-xl text-center sm:text-left">
            <div>
              <p className="text-lg sm:text-2xl font-black text-white">11</p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expert Services</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-black text-brand-400">100%</p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fabric Safety</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-black text-amber-400 flex items-center justify-center sm:justify-start gap-1">
                4.9 <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. OUR SERVICES SECTION */}
      {/* ========================================================================= */}
      <section id="services" className="py-14 sm:py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
          {/* Header */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800/70 text-cyan-300 text-xs font-bold">
              <WashingMachine className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Service Catalog</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Our Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Explore our complete range of specialized garment and fabric care treatments.
            </p>
          </div>

          {/* ===================================================================== */}
          {/* MOBILE VIEW: Compact, Ultra-Clean & Fast (1-column cards) */}
          {/* ===================================================================== */}
          <div className="grid grid-cols-1 gap-3.5 sm:hidden">
            {servicesList.map((serv, idx) => {
              const IconComponent = serv.icon;
              return (
                <div
                  key={serv.id}
                  className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-lg flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${serv.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-brand-400 uppercase">#{idx + 1}</span>
                        <h3 className="text-sm font-black text-white truncate">{serv.title}</h3>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate">{serv.shortDesc}</p>
                    </div>
                  </div>

                  <a
                    href={`tel:${cleanPhone}`}
                    className="p-2.5 rounded-xl bg-brand-600 text-white shrink-0 active:scale-90 transition-transform shadow-md"
                    title={`Call Store for ${serv.title}`}
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>

          {/* ===================================================================== */}
          {/* DESKTOP / TABLET VIEW: High-Contrast Detailed Cards */}
          {/* ===================================================================== */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {servicesList.map((serv) => {
              const IconComponent = serv.icon;
              return (
                <div
                  key={serv.id}
                  className="bg-slate-900/95 border border-slate-800/90 hover:border-brand-500/60 shadow-xl rounded-3xl p-6 transition-all group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${serv.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-slate-950 text-brand-300 font-extrabold text-[10px] border border-slate-800">
                        {serv.badge}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-400">{serv.category}</p>
                      <h3 className="text-lg font-black text-white group-hover:text-brand-300 transition-colors">{serv.title}</h3>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">{serv.shortDesc}</p>

                    <div className="pt-2 space-y-1.5 border-t border-slate-800/80">
                      {serv.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <a
                      href={`tel:${cleanPhone}`}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-cyan-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Call Store to Book</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. WHY CHOOSE MIRACLE LAUNDRY */}
      {/* ========================================================================= */}
      <section id="why-us" className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-800/70 text-amber-300 text-xs font-bold">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Why Choose Us</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Why {shopName} is the Best Choice
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: '100% Eco-Friendly Detergents',
                desc: 'Non-toxic, hypoallergenic German detergents safe for baby clothes and sensitive skin.',
                icon: ShieldCheck,
              },
              {
                title: 'Separate Customer Washing',
                desc: 'Your clothes are washed in individual sanitized machines with zero mixing.',
                icon: WashingMachine,
              },
              {
                title: 'Organic Dry Cleaning',
                desc: 'Gentle dry cleaning preserving delicate embroidery, silk, sarees & suit fabrics.',
                icon: Sparkles,
              },
              {
                title: 'High-Pressure Steam Pressing',
                desc: 'Wrinkle-free steam pressing that keeps formal wear sharp without fabric burn risks.',
                icon: Flame,
              },
              {
                title: 'Footwear & Sneaker Restoration',
                desc: 'Deep hand-scrub footwear laundry restoring upper leather, suede, and sole brightness.',
                icon: Crown,
              },
              {
                title: 'Punctual Store Service & Support',
                desc: 'Friendly staff and prompt response for all your clothing and alteration queries.',
                icon: Clock,
              },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div key={idx} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CUSTOMER REVIEWS & RATINGS */}
      {/* ========================================================================= */}
      <section id="reviews" className="py-14 sm:py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-950 border border-brand-800/70 text-brand-300 text-xs font-bold">
              <ThumbsUp className="w-3.5 h-3.5 text-brand-400" />
              <span>Customer Satisfaction</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((rev, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(rev.rating)].map((_, rIdx) => (
                        <Star key={rIdx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-emerald-400 font-extrabold text-[10px] border border-slate-800">
                      {rev.tag}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">"{rev.comment}"</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <p className="text-xs font-black text-white">{rev.name}</p>
                  <p className="text-[11px] text-slate-400">{rev.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FAQ ACCORDION SECTION */}
      {/* ========================================================================= */}
      <section id="faq" className="py-14 sm:py-18">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-slate-300">Common questions about {shopName} services.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden cursor-pointer transition-all"
                >
                  <div className="p-4 sm:p-5 flex justify-between items-center text-xs sm:text-sm font-extrabold text-white">
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-brand-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CALL STORE BANNER & FOOTER */}
      {/* ========================================================================= */}
      <section id="contact" className="py-14 bg-gradient-to-r from-brand-950 via-slate-950 to-slate-950 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-3xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center text-brand-400 mx-auto">
            <PhoneCall className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">Have Garments to Clean?</h2>
          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto">
            Call <span className="font-extrabold text-white">{shopName}</span> directly to arrange service or ask any garment care questions!
          </p>
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-cyan-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-black text-sm sm:text-base shadow-xl shadow-brand-600/30 active:scale-95 transition-all"
          >
            <PhoneCall className="w-5 h-5" />
            <span>Call Store Now: {phone}</span>
          </a>
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-slate-800/90 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid md:grid-cols-3 gap-8 text-xs sm:text-sm">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img src={logoUrl} alt={shopName} className="h-9 w-auto rounded-lg border border-slate-800" />
              <span className="text-base sm:text-lg font-black text-white">{shopName}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Smart & Eco Garment Cleaning, Dry Cleaning, Steam Pressing & Footwear Restoration.
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white uppercase text-[11px] tracking-wider">Store Contact</h4>
            
            <p className="flex items-center gap-2 text-slate-200">
              <PhoneCall className="w-4 h-4 text-brand-400 shrink-0" />
              <span className="font-bold">{phone}</span>
            </p>

            {/* Highlighted Email Pill */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-950 to-slate-900 border border-brand-800/80 shadow-lg">
              <p className="text-[10px] font-extrabold uppercase text-brand-300 mb-1">Official Store Email</p>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-white font-black text-xs sm:text-sm hover:text-brand-300 transition-colors break-all"
              >
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{email}</span>
              </a>
            </div>

            {/* Address with Google Maps button */}
            <div className="space-y-2 pt-1">
              <p className="flex items-start gap-2 text-slate-200 leading-relaxed">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <span>{address}</span>
              </p>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-cyan-300 hover:text-white transition-all"
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Get Directions on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Working Hours (Monday - Friday Only) */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white uppercase text-[11px] tracking-wider">Working Hours</h4>
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div>
                <p className="text-white font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" /> Monday - Friday
                </p>
                <p className="text-emerald-400 font-black text-base">08:00 AM - 09:00 PM</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <p className="text-slate-400 font-semibold text-xs">Saturday - Sunday</p>
                <p className="text-amber-400 font-bold text-xs">Closed / By Appointment</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 mt-8 border-t border-slate-900 flex justify-between items-center text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} {shopName}. All rights reserved.</p>
          <p>Powered by Miracle Laundry Operating System</p>
        </div>
      </footer>

      {/* FLOATING MOBILE CALL BUTTON (STICKY BOTTOM-RIGHT) */}
      <div className="fixed bottom-5 right-5 z-40 sm:hidden">
        <a
          href={`tel:${cleanPhone}`}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-brand-600 text-white shadow-2xl flex items-center justify-center border-2 border-slate-900 active:scale-90 transition-transform shadow-emerald-950/50"
        >
          <PhoneCall className="w-6 h-6 animate-pulse" />
        </a>
      </div>
    </div>
  );
};
