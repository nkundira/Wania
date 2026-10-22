import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { BookOpen, Clock, Award, ChevronDown, ChevronRight, PlayCircle, ArrowRight } from 'lucide-react';

const categoryImages = {
  barista: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=400&fit=crop',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop',
  fbe: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop',
  bartending: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800&h=400&fit=crop',
  housekeeping: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=400&fit=crop',
  events: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=400&fit=crop',
};

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [openModule, setOpenModule] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(`/courses/${slug}`).then(r => setCourse(r.data?.course || null)).catch(() => setCourse(null)).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (user && course) {
      api.get(`/courses/${course.id}/progress`).then(r => setProgress(r.data)).catch(() => {});
    }
  }, [user, course?.id]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>;
  if (!course) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><h1 className="text-2xl font-bold text-coffee-900">Course not found</h1></div>;

  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);
  const handleEnroll = async () => {
    if (!user) { navigate('/login', { state: { from: `/courses/${slug}` } }); return; }
    await api.post(`/courses/${course.id}/enroll`);
    setProgress(p => ({ ...p, enrolled: true }));
  };

  const startLearning = () => {
    const firstLesson = course.modules[0]?.lessons[0];
    if (firstLesson) navigate(`/lessons/${firstLesson.id}`);
    else navigate('/login');
  };

  return (
    <div>
      {/* Hero */}
      <div className="relative" style={{ background: 'linear-gradient(135deg, #2e2116, #54402c)' }}>
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `url(${categoryImages[course.category] || categoryImages.barista})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2">
              <div className="flex gap-2 mb-4">
                <span className="bg-gold/90 text-coffee-950 text-xs font-bold px-3 py-1 rounded-full capitalize">{course.level}</span>
                <span className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">{course.category}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{course.title}</h1>
              <p className="text-coffee-200 text-lg leading-relaxed mb-6 max-w-2xl">{course.description}</p>
              <div className="flex flex-wrap gap-6 text-sm text-coffee-300">
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {course.modules.length} modules</span>
                <span className="flex items-center gap-1.5"><PlayCircle className="w-4 h-4" /> {totalLessons} lessons</span>
                {course.duration_hours && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {course.duration_hours} hours</span>}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              {progress?.percentage > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-charcoal/60">Your progress</span>
                    <span className="font-bold text-coffee-700">{progress.percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-coffee-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
                  </div>
                </div>
              )}
              <button onClick={startLearning} className="w-full bg-coffee-700 text-white py-3.5 rounded-xl font-semibold hover:bg-coffee-800 transition flex items-center justify-center gap-2 mb-3">
                {progress?.percentage > 0 ? 'Resume Learning' : 'Start Learning'} <ArrowRight className="w-4 h-4" />
              </button>
              {user && !progress?.enrolled && (
                <button onClick={handleEnroll} className="w-full border-2 border-coffee-300 text-coffee-700 py-3 rounded-xl font-semibold hover:border-coffee-500 transition text-sm">Enroll to Save Progress</button>
              )}
              {!user && (
                <p className="text-xs text-charcoal/50 text-center mt-3">Sign up to save your progress and earn certificates.</p>
              )}
              {course.instructor_name && (
                <div className="mt-5 pt-5 border-t border-coffee-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-coffee-200 flex items-center justify-center text-coffee-800 font-bold text-sm">{course.instructor_name.split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <p className="text-sm font-semibold text-coffee-900">{course.instructor_name}</p>
                    <p className="text-xs text-charcoal/50">Instructor</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-coffee-900 mb-6">Course Content</h2>
        <div className="space-y-3">
          {course.modules.map((mod, mi) => (
            <div key={mod.id} className="bg-white rounded-2xl border border-coffee-100 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-coffee-50 transition text-left"
                onClick={() => setOpenModule(openModule === mi ? -1 : mi)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-coffee-700 text-white flex items-center justify-center text-sm font-bold">{mi + 1}</span>
                  <div>
                    <h3 className="font-semibold text-coffee-900">{mod.title}</h3>
                    <p className="text-xs text-charcoal/50">{mod.lessons.length} lessons{mod.quiz ? ` • Quiz available` : ''}</p>
                  </div>
                </div>
                {openModule === mi ? <ChevronDown className="w-5 h-5 text-charcoal/40" /> : <ChevronRight className="w-5 h-5 text-charcoal/40" />}
              </button>
              {openModule === mi && (
                <div className="border-t border-coffee-100">
                  {mod.lessons.map((lesson, li) => (
                    <Link
                      key={lesson.id}
                      to={`/lessons/${lesson.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-coffee-50 transition border-b border-coffee-50 last:border-0"
                    >
                      <PlayCircle className="w-4.5 h-4.5 text-coffee-500 flex-shrink-0" />
                      <span className="flex-1 text-sm text-charcoal/80">{li + 1}. {lesson.title}</span>
                      {lesson.duration_minutes && <span className="text-xs text-charcoal/40">{lesson.duration_minutes}m</span>}
                    </Link>
                  ))}
                  {mod.quiz && (
                    <Link
                      to={`/lessons/${mod.lessons[0]?.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 bg-gold/10 hover:bg-gold/20 transition"
                    >
                      <Award className="w-4.5 h-4.5 text-gold-dark" />
                      <span className="flex-1 text-sm font-medium text-gold-dark">{mod.quiz.title}</span>
                      <span className="text-xs text-gold-dark">Pass: {mod.quiz.pass_score}%</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
