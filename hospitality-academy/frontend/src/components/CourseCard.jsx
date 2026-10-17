import { Link } from 'react-router-dom';
import { Clock, BookOpen, BarChart3, ArrowRight } from 'lucide-react';

const categoryLabels = {
  barista: 'Barista & Coffee',
  hotel: 'Hotel Management',
  fbe: 'F&B Service',
  bartending: 'Bartending & Mocktails',
  housekeeping: 'Housekeeping',
  events: 'Event Planning',
};

const categoryImages = {
  barista: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
  fbe: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop',
  bartending: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&h=400&fit=crop',
  housekeeping: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop',
  events: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&h=400&fit=crop',
};

export default function CourseCard({ course }) {
  const image = course.cover_image || categoryImages[course.category] || categoryImages.barista;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-coffee-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = categoryImages.barista; }}
        />
        <div className="absolute top-3 left-3">
          <span className="bg-white/95 backdrop-blur text-coffee-800 text-xs font-semibold px-3 py-1 rounded-full">
            {categoryLabels[course.category] || course.category}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="bg-gold/95 text-coffee-950 text-xs font-semibold px-3 py-1 rounded-full capitalize">
            {course.level}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-coffee-900 mb-2 line-clamp-1">{course.title}</h3>
        <p className="text-sm text-charcoal/60 line-clamp-2 mb-4">{course.description}</p>
        <div className="flex items-center gap-4 text-xs text-charcoal/50 mb-4">
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {course.module_count} modules</span>
          <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {course.lesson_count} lessons</span>
          {course.duration_hours && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration_hours}h</span>
          )}
        </div>
        <Link
          to={`/courses/${course.slug}`}
          className="inline-flex items-center gap-2 bg-coffee-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-coffee-800 transition w-full justify-center"
        >
          Start Learning <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
