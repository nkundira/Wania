import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 800);
  };

  return (
    <div>
      <section className="py-16" style={{ background: 'linear-gradient(135deg, #2e2116, #54402c)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-coffee-200 text-lg">Have a question? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="py-16 max-w-5xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {[
            { icon: Mail, label: 'Email', value: 'info@hospitalityacademy.com' },
            { icon: Phone, label: 'Phone', value: '+1 (555) 123-4567' },
            { icon: MapPin, label: 'Address', value: '123 Hospitality Ave, New York, NY 10001' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white p-6 rounded-2xl border border-coffee-100 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-coffee-100 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-6 h-6 text-coffee-700" />
              </div>
              <p className="font-semibold text-coffee-900 text-sm">{label}</p>
              <p className="text-charcoal/60 text-sm mt-1">{value}</p>
            </div>
          ))}
        </div>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center max-w-xl mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-coffee-900 mb-2">Message Sent!</h3>
            <p className="text-charcoal/60">Thank you for reaching out. We'll get back to you within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-coffee-100 p-6 md:p-8 max-w-xl mx-auto shadow-sm space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-coffee-900 mb-1.5">Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-coffee-900 mb-1.5">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-900 mb-1.5">Subject</label>
              <input required type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" placeholder="How can we help?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-900 mb-1.5">Message</label>
              <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm resize-none" placeholder="Your message..." />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-coffee-700 text-white py-3.5 rounded-xl font-semibold hover:bg-coffee-800 transition flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Sending...' : <>Send Message <Send className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
