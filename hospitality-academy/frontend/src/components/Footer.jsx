import { Link } from 'react-router-dom';
import { Coffee, Mail, Phone, MapPin } from 'lucide-react';

const Facebook = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" /></svg>
);
const Instagram = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
);
const Twitter = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z" /></svg>
);

export default function Footer() {
  return (
    <footer className="bg-coffee-950 text-coffee-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Coffee className="w-7 h-7 text-gold" />
              <span className="font-bold text-lg text-white" style={{ fontFamily: 'Georgia, serif' }}>Hospitality Academy</span>
            </div>
            <p className="text-sm text-coffee-300 leading-relaxed">
              Learn hospitality. Build your future. Professional courses in barista training, hotel management, F&B service, and more.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" aria-label="Facebook" className="text-coffee-400 hover:text-gold transition"><Facebook className="w-5 h-5" /></a>
              <a href="#" aria-label="Instagram" className="text-coffee-400 hover:text-gold transition"><Instagram className="w-5 h-5" /></a>
              <a href="#" aria-label="Twitter" className="text-coffee-400 hover:text-gold transition"><Twitter className="w-5 h-5" /></a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-gold transition">Home</Link></li>
              <li><Link to="/courses" className="hover:text-gold transition">Courses</Link></li>
              <li><Link to="/about" className="hover:text-gold transition">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-gold transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses?category=barista" className="hover:text-gold transition">Barista & Coffee</Link></li>
              <li><Link to="/courses?category=hotel" className="hover:text-gold transition">Hotel Management</Link></li>
              <li><Link to="/courses?category=fbe" className="hover:text-gold transition">F&B Service</Link></li>
              <li><Link to="/courses?category=bartending" className="hover:text-gold transition">Bartending & Mocktails</Link></li>
              <li><Link to="/courses?category=housekeeping" className="hover:text-gold transition">Housekeeping</Link></li>
              <li><Link to="/courses?category=events" className="hover:text-gold transition">Event Planning</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 text-gold" /> info@hospitalityacademy.com</li>
              <li className="flex items-start gap-2"><Phone className="w-4 h-4 mt-0.5 text-gold" /> +1 (555) 123-4567</li>
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-gold" /> 123 Hospitality Ave, Suite 100<br />New York, NY 10001</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-coffee-800 mt-10 pt-6 text-center text-xs text-coffee-400">
          <p>&copy; {new Date().getFullYear()} Hospitality Academy. All rights reserved. Educational content for demonstration purposes.</p>
        </div>
      </div>
    </footer>
  );
}
