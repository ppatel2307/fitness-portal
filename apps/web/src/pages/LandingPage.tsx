import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Apple, MessageCircle, BarChart3, CalendarCheck, ShieldCheck,
  ChevronRight, Menu, X, Volume2, VolumeX, Check, Flame,
} from 'lucide-react';

// Cinematic showdown background (baby-you vs masked-you), self-hosted and
// compressed — the original lived on a temporary AI-generation CDN at 9 MB.
const SHOWDOWN_IMG = '/hero-showdown.jpg';

export function LandingPage() {
  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [entered, setEntered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const enterPortal = () => {
    setEntered(true);
    const a = audioRef.current;
    if (a) {
      a.volume = 0.6;
      a.play().then(() => setSoundOn(true)).catch(() => setSoundOn(false));
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = ['home', 'about', 'features', 'pricing'];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) { setActiveSection(id); break; }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const toggleSound = () => {
    const a = audioRef.current;
    if (!a) return;
    if (soundOn) { a.pause(); setSoundOn(false); }
    else { a.volume = 0.6; a.play().then(() => setSoundOn(true)).catch(() => setSoundOn(false)); }
  };

  const navLinks = [
    { label: 'Home', id: 'home' },
    { label: 'Features', id: 'features' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'About', id: 'about' },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <audio ref={audioRef} loop preload="auto" src="/audio/veggi-theme.mp3" />

      {/* ENTER GATE — auto-plays the soundtrack on entry */}
      {!entered && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center px-6 gap-7"
          style={{ background: 'radial-gradient(circle at 50% 40%, #0c1410 0%, #000 75%)' }}>
          <div className="font-display font-black uppercase tracking-[0.18em] text-4xl sm:text-6xl leading-none">
            <span className="text-accent neon-text">VEGGI</span> <span className="text-white">CHIKN</span>
          </div>
          <p className="text-text-secondary max-w-md text-sm sm:text-base tracking-wide">
            Step into the dark room. The showdown begins the moment you enter — sound on.
          </p>
          <button
            onClick={enterPortal}
            className="mt-2 px-12 py-4 border border-accent text-accent font-bold uppercase tracking-[0.22em] rounded-full hover:bg-accent hover:text-accent-fg transition shadow-glow-sm hover:shadow-glow"
          >
            Enter
          </button>
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-ring" />
          <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">tap to start with audio</p>
        </div>
      )}

      {/* NAVBAR */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/90 backdrop-blur border-b border-border' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo('home')} className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center shadow-glow-sm">
              <Dumbbell className="w-5 h-5 text-accent-fg" />
            </div>
            <span className="text-lg font-extrabold tracking-wide">
              <span className="text-accent">VEGGI</span> <span className="text-white">CHIKN</span>
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider transition ${
                  activeSection === item.id ? 'text-accent' : 'text-text-secondary hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-white transition">
              Sign In
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-accent-fg text-sm font-bold rounded-full transition shadow-glow-sm hover:shadow-glow"
            >
              Enter Portal
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen(m => !m)} className="md:hidden p-2 text-text-secondary hover:text-white">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur border-b border-border px-4 pb-4 space-y-1">
            {navLinks.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="block w-full text-left px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:text-white rounded-lg hover:bg-surface transition"
              >
                {item.label}
              </button>
            ))}
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm font-bold text-accent-fg bg-accent rounded-full text-center transition">
              Enter Portal
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="home" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 text-center">
        {/* full-bleed showdown background */}
        <div className="absolute inset-0 overflow-hidden bg-[#050706]">
          <img
            src={SHOWDOWN_IMG}
            alt="Showdown: the past you vs the future you"
            width={1920}
            height={1071}
            className="absolute top-1/2 left-1/2 w-full h-full object-cover animate-hero-drift"
            style={{ transform: 'translate(-50%,-50%)' }}
          />
        </div>
        {/* overlays for legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 45%, rgba(5,7,6,.78), rgba(5,7,6,.35) 60%, transparent 100%), linear-gradient(180deg, rgba(6,8,10,.85) 0%, rgba(6,8,10,.25) 30%, rgba(6,8,10,.5) 70%, rgba(6,8,10,.97) 100%)' }}
        />
        <div
          className="absolute inset-0 bg-grid opacity-30 pointer-events-none"
          style={{ maskImage: 'radial-gradient(circle at 50% 40%, #000 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at 50% 40%, #000 20%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-4xl mx-auto pt-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/30 rounded-full text-accent text-xs font-bold uppercase tracking-[0.2em] mb-8">
            <Flame className="w-3.5 h-3.5" />
            The Transformation Begins
          </div>

          <h1 className="font-display font-black uppercase leading-[0.9] tracking-tight">
            <span className="block text-accent text-glow-strong text-6xl sm:text-7xl md:text-8xl">VEGGI</span>
            <span className="block text-white text-shadow-soft text-6xl sm:text-7xl md:text-8xl">CHIKN</span>
            <span className="block text-text-secondary text-shadow-soft text-xl sm:text-2xl tracking-[0.3em] mt-3 font-extrabold">FITNESS</span>
          </h1>

          <p className="mt-7 text-lg sm:text-2xl text-white/90 max-w-2xl mx-auto leading-snug text-shadow-soft">
            Become <span className="text-accent font-semibold">unrecognizable</span>. I think, you do.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-accent-fg font-bold uppercase tracking-wider rounded-full text-base transition shadow-glow hover:scale-[1.02]"
            >
              Start Your Transformation
              <ChevronRight className="w-5 h-5" />
            </Link>
            <button
              onClick={() => scrollTo('about')}
              className="flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-accent/60 hover:text-accent text-white font-semibold uppercase tracking-wider rounded-full text-base transition"
            >
              My Story
            </button>
          </div>
        </div>

        {/* metrics strip */}
        <div className="relative z-10 mt-16 w-full max-w-3xl mx-auto grid grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {[
            { num: '1', lbl: 'Version Left Behind' },
            { num: '∞', lbl: 'Reps To Unrecognizable' },
            { num: '0', lbl: 'Excuses Accepted' },
          ].map(m => (
            <div key={m.lbl} className="bg-background-secondary py-6 px-3">
              <div className="text-3xl sm:text-4xl font-black text-accent">{m.num}</div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-text-muted mt-1.5">{m.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 bg-background-secondary border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-xs font-bold uppercase tracking-[0.3em] mb-3">What You Get</p>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white">Everything to reach your goals</h2>
            <p className="text-text-secondary text-lg max-w-xl mx-auto mt-4">Your coach, your plan, your AI assistant — all in one place.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Dumbbell, title: 'Custom Workouts', desc: 'Weekly schedules built around your goals, time, and equipment — with guided workout mode and video tutorials for every exercise.' },
              { icon: Apple, title: 'AI Meal Plans', desc: 'Gemini builds a personalized meal plan from your profile. Tweak any meal in plain English through the AI coach.' },
              { icon: MessageCircle, title: 'Ask The Coach', desc: 'A chat assistant trained on the coach’s own knowledge base answers any fitness question, any time.' },
              { icon: CalendarCheck, title: 'Accountability', desc: 'A calendar of green (done) and red (missed). On the accountability tier, every skipped day costs you $10.' },
              { icon: BarChart3, title: 'Progress Tracking', desc: 'Log your weight, watch the trend, and see motivating metrics — workouts crushed and pounds dropped.' },
              { icon: ShieldCheck, title: 'Secure & Private', desc: 'Your stats, goals, and health info are protected with role-based access and encrypted authentication.' },
            ].map(f => (
              <div key={f.title} className="group bg-surface border border-border rounded-2xl p-6 hover:border-accent/50 transition">
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center mb-5 group-hover:shadow-glow-sm transition">
                  <f.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING / TIERS */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-accent text-xs font-bold uppercase tracking-[0.3em] mb-3">Choose Your Tier</p>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white">Pick your level of pressure</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-surface border border-border rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white">Free</h3>
              <p className="text-text-secondary text-sm mt-1">For the self-motivated.</p>
              <div className="mt-5 text-4xl font-black text-white">$0<span className="text-base font-semibold text-text-muted">/mo</span></div>
              <ul className="mt-6 space-y-3">
                {['Personalized workout plan', 'AI meal plan + coach chat', 'Progress & weight tracking', 'Workout history calendar'].map(i => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-accent shrink-0" /> {i}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="mt-8 block text-center px-6 py-3 border border-accent/60 text-accent font-bold uppercase tracking-wider rounded-full hover:bg-accent/10 transition">
                Start Free
              </Link>
            </div>

            {/* Accountability */}
            <div className="relative bg-surface border-2 border-accent rounded-2xl p-8 shadow-glow">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-fg text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Most Results</span>
              <h3 className="text-xl font-bold text-white">Accountability</h3>
              <p className="text-text-secondary text-sm mt-1">Skin in the game.</p>
              <div className="mt-5 text-4xl font-black text-white">$10<span className="text-base font-semibold text-text-muted"> / missed day</span></div>
              <ul className="mt-6 space-y-3">
                {['Everything in Free', 'Daily workout logging enforced', 'Miss a day → charged $10 automatically', 'Maximum follow-through, zero excuses'].map(i => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-accent shrink-0" /> {i}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="mt-8 block text-center px-6 py-3 bg-accent text-accent-fg font-bold uppercase tracking-wider rounded-full hover:bg-accent-hover transition">
                Hold Me Accountable
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="relative min-h-[680px] flex items-center border-y border-border overflow-hidden">
        {/* Full-bleed background image */}
        <img
          src="/about-bg.jpg"
          alt="Veggi Chikn — the story behind the brand"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark overlay for text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, rgba(5,8,6,.90) 0%, rgba(5,8,6,.70) 45%, rgba(5,8,6,.40) 100%)',
          }}
        />

        <div className="relative z-10 w-full py-24 px-4">
          <div className="max-w-2xl mx-auto md:mx-0 md:ml-16 lg:ml-28">
            <p className="text-accent text-xs font-bold uppercase tracking-[0.3em] mb-3">About Me</p>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white leading-none">
              From then<br />to unrecognizable
            </h2>
            <div className="mt-8 space-y-4 text-white/80 leading-relaxed text-lg">
              <p>
                Don't waste thousands on a personal trainer. My free plan gets you faster, better results — no fluff, no middlemen, no excuses.
              </p>
              <p>
                I've been vegetarian my whole life and figured out what actually works. The system everyone charges you to learn? I give it away for free.
              </p>
              <p>
                Join the community. It's free — unless you get lazy. Then you pay me. That's not a threat, that's the plan.
              </p>
            </div>
            <div className="mt-10">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-accent-fg font-bold uppercase tracking-wider rounded-full transition shadow-glow hover:scale-[1.02]"
              >
                Join the Community <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-4 text-center">
        <p className="text-text-muted text-xs tracking-wider">© {new Date().getFullYear()} Veggi Chikn Fitness — Become Unrecognizable.</p>
      </footer>

      {/* SOUND TOGGLE */}
      <button
        onClick={toggleSound}
        title={soundOn ? 'Mute soundtrack' : 'Play soundtrack'}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full border border-border bg-background-secondary/90 backdrop-blur text-accent flex items-center justify-center hover:border-accent hover:shadow-glow-sm transition"
      >
        {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>
    </div>
  );
}

export default LandingPage;
