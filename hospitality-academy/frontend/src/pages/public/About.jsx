import { Link } from 'react-router-dom';
import { Coffee, Users, Award, Heart, Target } from 'lucide-react';

export default function About() {
  return (
    <div>
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #2e2116, #54402c)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About Hospitality Academy</h1>
          <p className="text-coffee-200 text-lg leading-relaxed max-w-2xl mx-auto">
            We are dedicated to providing professional hospitality education accessible to everyone, everywhere. Our mission is to build the next generation of hospitality professionals.
          </p>
        </div>
      </section>

      <section className="py-16 max-w-5xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
          <div>
            <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=400&fit=crop" alt="Hospitality team" className="rounded-2xl shadow-lg w-full" onError={(e) => e.target.style.display = 'none'} />
          </div>
          <div>
            <p className="text-gold-dark font-semibold text-sm uppercase tracking-wider mb-2">Our Story</p>
            <h2 className="text-3xl font-bold text-coffee-900 mb-4">Built for Hospitality Professionals</h2>
            <p className="text-charcoal/70 leading-relaxed mb-4">
              Hospitality Academy was founded with a simple belief: everyone deserves access to quality hospitality education, regardless of where they are in the world.
            </p>
            <p className="text-charcoal/70 leading-relaxed mb-4">
              Our courses cover the full spectrum of hospitality skills — from the art of pulling the perfect espresso shot to managing a hotel front office, from crafting beautiful mocktails to planning world-class events.
            </p>
            <p className="text-charcoal/70 leading-relaxed">
              Every lesson is written by experienced industry professionals and designed for both beginners and those looking to refine their existing skills.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: Target, title: 'Our Mission', desc: 'To make professional hospitality education accessible, practical, and engaging for learners worldwide.' },
            { icon: Eye, title: 'Our Vision', desc: 'A world where every hospitality professional has the skills and confidence to deliver exceptional guest experiences.' },
            { icon: Heart, title: 'Our Values', desc: 'Quality, accessibility, practical learning, community, and a genuine passion for the hospitality industry.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white p-6 rounded-2xl border border-coffee-100 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-coffee-700 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-coffee-900 mb-2">{title}</h3>
              <p className="text-sm text-charcoal/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-coffee-50">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-coffee-900 mb-8">What Makes Us Different</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Coffee, title: 'Industry Expertise', desc: 'All content written by experienced hospitality professionals.' },
              { icon: Users, title: 'Community Driven', desc: 'Learn alongside fellow students in our social platform.' },
              { icon: Award, title: 'Certified Learning', desc: 'Earn certificates that verify your completion and achievement.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-2xl border border-coffee-100 shadow-sm">
                <Icon className="w-8 h-8 text-gold-dark mx-auto mb-3" />
                <h3 className="font-bold text-coffee-900 mb-2">{title}</h3>
                <p className="text-sm text-charcoal/60">{desc}</p>
              </div>
            ))}
          </div>
          <Link to="/courses" className="inline-block mt-10 bg-coffee-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-coffee-800 transition">Explore Our Courses</Link>
        </div>
      </section>
    </div>
  );
}

function Eye(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
}
