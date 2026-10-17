import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import CourseCard from '../../components/CourseCard';
import { Search, Filter } from 'lucide-react';

const categories = [
  { key: '', label: 'All Categories' },
  { key: 'barista', label: 'Barista & Coffee' },
  { key: 'hotel', label: 'Hotel Management' },
  { key: 'fbe', label: 'F&B Service' },
  { key: 'bartending', label: 'Bartending & Mocktails' },
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'events', label: 'Event Planning' },
];

const levels = [
  { key: '', label: 'All Levels' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

export default function CourseCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const category = searchParams.get('category') || '';
  const level = searchParams.get('level') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (level) params.set('level', level);
    if (search) params.set('search', search);
    api.get(`/courses?${params}`).then(r => setCourses(r.data.courses)).finally(() => setLoading(false));
  }, [category, level, search]);

  const updateParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    setSearchParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <p className="text-gold-dark font-semibold text-sm uppercase tracking-wider mb-2">Course Catalog</p>
        <h1 className="text-3xl md:text-4xl font-bold text-coffee-900">Explore All Courses</h1>
        <p className="text-charcoal/60 mt-3 max-w-2xl mx-auto">Browse professional hospitality courses. No account needed to view public lessons.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-coffee-100 p-4 md:p-5 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal/40" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm"
            />
          </div>
          <select value={category} onChange={(e) => updateParam('category', e.target.value)} className="px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 outline-none text-sm bg-white min-w-48">
            {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <select value={level} onChange={(e) => updateParam('level', e.target.value)} className="px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 outline-none text-sm bg-white min-w-40">
            {levels.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <Filter className="w-12 h-12 text-coffee-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-coffee-900 mb-2">No courses found</h3>
          <p className="text-charcoal/50">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(c => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  );
}
