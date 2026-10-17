import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import CourseCard from '../../components/CourseCard';
import { ArrowRight, Star, Users, BookOpen, Award, Coffee, Hotel, Utensils, Wine, Sparkles, Calendar, CheckCircle, PlayCircle, MessageSquare, Video, GraduationCap, ChevronRight } from 'lucide-react';

const categoryIcons = { barista: Coffee, hotel: Hotel, fbe: Utensils, bartending: Wine, housekeeping: Sparkles, events: Calendar };
const categoryNames = { barista: 'Barista & Coffee', hotel: 'Hotel Management', fbe: 'F&B Service', bartending: 'Bartending & Mocktails', housekeeping: 'Housekeeping', events: 'Event Planning' };

export default function Home() {
  const [courses, setCourses] = useState([]);
  useEffect(() => { api.get('/courses?limit=6').then(r => setCourses(r.data.courses)).catch(() => {}); }, []);

  const testimonials = [
    { name: 'Amara Johnson', role: 'Barista, Blue Bottle Cafe', text: 'The barista course gave me the confidence to work in specialty coffee. The extraction modules were incredibly detailed.', sample: true },
    { name: 'Raj Patel', role: 'Front Office Supervisor', text: 'The hotel management course covered everything I needed for my first front desk job. Highly recommended for beginners.', sample: true },
    { name: 'Sofia Martinez', role: 'Restaurant Server', text: 'I learned proper table setting and service styles that my manager immediately noticed. Great practical content.', sample: true },
  ];

  const benefits = [
    { icon: BookOpen, title: 'Expert-Led Courses', desc: 'Learn from hospitality professionals with real industry experience.' },
    { icon: PlayCircle, title: 'Video & Written Lessons', desc: 'Study with a mix of detailed written tutorials and video content.' },
    { icon: CheckCircle, title: 'Progress Tracking', desc: 'Save your progress and resume exactly where you stopped.' },
    { icon: Award, title: 'Certificates', desc: 'Earn certificates when you complete course requirements.' },
    { icon: Users, title: 'Community', desc: 'Connect with fellow learners in our social community.' },
    { icon: MessageSquare, title: 'Real-Time Chat', desc: 'Message other students and collaborate on your learning.' },
    { icon: Video, title: 'Study Calls', desc: 'Make audio and video calls to study with classmates.' },
    { icon: GraduationCap, title: 'Assessments', desc: 'Prove your knowledge with quizzes and final assessments.' },
  ];

  const steps = [
    { step: '01', title: 'Create Your Account', desc: 'Sign up for free and explore the complete course catalog.' },
    { step: '02', title: 'Choose Your Course', desc: 'Browse six professional hospitality categories.' },
    { step: '03', title: 'Learn at Your Pace', desc: 'Complete lessons, take quizzes, and track your progress.' },
    { step: '04', title: 'Earn Your Certificate', desc: 'Pass assessments and receive your completion certificate.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2e2116 0%, #54402c 50%, #664c34 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&h=1080&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/30 rounded-full px-4 py-1.5 mb-6">
                <Star className="w-4 h-4 text-gold" />
                <span className="text-gold-light text-sm font-medium">Professional Hospitality Education</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                Learn Hospitality.<br />
                <span className="text-gold">Build Your Future.</span>
              </h1>
              <p className="text-coffee-200 text-lg mb-8 leading-relaxed max-w-xl">
                Master barista skills, hotel management, food & beverage service, and more with our professional online courses designed by industry experts.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/courses" className="bg-gold text-coffee-950 px-8 py-4 rounded-xl font-bold hover:bg-gold-light transition-all shadow-lg inline-flex items-center gap-2">
                  Explore Courses <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/register" className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition">
                  Join Free
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="relative">
                <img src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=700&fit=crop" alt="Professional barista training" className="rounded-3xl shadow-2xl" onError={(e) => { e.target.style.display = 'none'; }} />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-5 w-56">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-coffee-100 flex items-center justify-center"><Award className="w-6 h-6 text-coffee-700" /></div>
                    <div>
                      <p className="font-bold text-coffee-900 text-lg">6 Courses</p>
                      <p className="text-xs text-charcoal/50">88+ lessons available</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Stats bar */}
        <div className="relative bg-white/10 backdrop-blur border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['6', 'Professional Courses'], ['88+', 'Detailed Lessons'], ['5', 'Interactive Quizzes'], ['Free', 'Public Lessons']].map(([v, l]) => (
              <div key={l} className="text-center">
                <p className="text-2xl font-bold text-gold">{v}</p>
                <p className="text-xs text-coffee-300">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold-dark font-semibold text-sm uppercase tracking-wider mb-2">Featured Courses</p>
            <h2 className="text-3xl md:text-4xl font-bold text-coffee-900">Start Learning Today</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 6).map(c => <CourseCard key={c.id} course={c} />)}
          </div>
          <div className="text-center mt-10">
            <Link to="/courses" className="inline-flex items-center gap-2 text-coffee-700 font-semibold hover:text-coffee-900">
              View All Courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-coffee-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold-dark font-semibold text-sm uppercase tracking-wider mb-2">Categories</p>
            <h2 className="text-3xl md:text-4xl font-bold text-coffee-900">Explore Course Categories</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(categoryNames).map(([key, name]) => {
              const Icon = categoryIcons[key];
              return (
                <Link key={key} to={`/courses?category=${key}`} className="bg-white rounded-2xl p-6 border border-coffee-100 hover:border-gold hover:shadow-lg transition-all group">
                  <div className="w-14 h-14 rounded-xl bg-coffee-100 group-hover:bg-gold/20 flex items-center justify-center mb-4 transition">
                    <Icon className="w-7 h-7 text-coffee-700 group-hover:text-gold-dark transition" />
                  </div>
                  <h3 className="text-lg font-bold text-coffee-900 mb-1">{name}</h3>
                  <p className="text-sm text-charcoal/50 flex items-center gap-1">Browse courses <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" /></p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold-dark font-semibold text-sm uppercase tracking-wider mb-2">Why Choose Us</p>
            <h2 className="text-3xl md:text-4xl font-bold text-coffee-900">Benefits of Studying With Us</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl border border-coffee-100 hover:shadow-md transition">
                <div className="w-11 h-11 rounded-lg bg-coffee-700 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-coffee-900 mb-2">{title}</h3>
                <p className="text-sm text-charcoal/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #2e2116, #54402c)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-gold font-semibold text-sm uppercase tracking-wider mb-2">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Your Learning Journey</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-gold font-bold text-xl">{step}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-coffee-300 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-coffee-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold-dark font-semibold text-sm uppercase tracking-wider mb-2">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-bold text-coffee-900">What Our Students Say</h2>
            <p className="text-charcoal/50 text-sm mt-2">Sample content for demonstration</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-coffee-100 shadow-sm">
                <div className="flex gap-1 mb-4">{Array(5).fill(0).map((_, j) => <Star key={j} className="w-4 h-4 fill-gold text-gold" />)}</div>
                <p className="text-charcoal/70 text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-coffee-200 flex items-center justify-center text-coffee-800 font-bold text-sm">{t.name.split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <p className="font-semibold text-sm text-coffee-900">{t.name}</p>
                    <p className="text-xs text-charcoal/50">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gold">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-coffee-950 mb-4">Ready to Start Your Hospitality Career?</h2>
          <p className="text-coffee-900/70 text-lg mb-8">Join thousands of learners mastering professional hospitality skills.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register" className="bg-coffee-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-coffee-950 transition shadow-lg">Create Free Account</Link>
            <Link to="/courses" className="border-2 border-coffee-900 text-coffee-900 px-8 py-4 rounded-xl font-semibold hover:bg-coffee-900 hover:text-white transition">Browse Courses</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
