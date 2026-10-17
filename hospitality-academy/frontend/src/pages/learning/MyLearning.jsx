import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { BookOpen, Award, PlayCircle, CheckCircle2 } from 'lucide-react';

export default function MyLearning() {
  const [enrollments, setEnrollments] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('courses');

  useEffect(() => {
    Promise.all([
      api.get('/my-learning'),
      api.get('/quiz-results')
    ]).then(([a, b]) => {
      setEnrollments(a.data.enrollments);
      setQuizResults(b.data.attempts);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-coffee-900 mb-6">My Learning</h1>

      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-coffee-100 w-fit">
        <button onClick={() => setTab('courses')} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${tab === 'courses' ? 'bg-coffee-700 text-white' : 'text-charcoal/60'}`}>Enrolled Courses</button>
        <button onClick={() => setTab('quizzes')} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${tab === 'quizzes' ? 'bg-coffee-700 text-white' : 'text-charcoal/60'}`}>Quiz Results</button>
      </div>

      {tab === 'courses' && (
        enrollments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-coffee-100 p-12 text-center">
            <BookOpen className="w-12 h-12 text-coffee-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-coffee-900 mb-2">No enrolled courses yet</h3>
            <p className="text-charcoal/50 mb-6">Browse our catalog and enroll in a course to start tracking your progress.</p>
            <Link to="/courses" className="bg-coffee-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-coffee-800 inline-block">Browse Courses</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map(e => (
              <Link key={e.id} to={`/courses/${e.slug}`} className="bg-white rounded-2xl border border-coffee-100 p-5 flex items-center gap-5 hover:shadow-md transition block">
                <div className="w-16 h-16 rounded-xl bg-coffee-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-7 h-7 text-coffee-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-coffee-900 truncate">{e.title}</h3>
                  <p className="text-xs text-charcoal/50 capitalize mb-2">{e.level} · {e.totalLessons} lessons</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-coffee-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${e.percentage}%` }} />
                    </div>
                    <span className="text-sm font-bold text-coffee-700">{e.percentage}%</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-charcoal/40">{e.completedLessons}/{e.totalLessons}</p>
                  <p className="text-xs font-medium text-gold-dark flex items-center gap-1 justify-end">
                    {e.percentage === 100 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                    {e.percentage === 100 ? 'Complete' : 'Resume'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {tab === 'quizzes' && (
        quizResults.length === 0 ? (
          <div className="bg-white rounded-2xl border border-coffee-100 p-12 text-center">
            <Award className="w-12 h-12 text-coffee-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-coffee-900 mb-2">No quiz attempts yet</h3>
            <p className="text-charcoal/50">Take quizzes in your courses to see your results here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-coffee-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-coffee-900">Quiz</th>
                  <th className="text-left px-4 py-3 font-semibold text-coffee-900">Course</th>
                  <th className="text-center px-4 py-3 font-semibold text-coffee-900">Score</th>
                  <th className="text-center px-4 py-3 font-semibold text-coffee-900">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-coffee-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {quizResults.map(a => (
                  <tr key={a.id} className="border-t border-coffee-50">
                    <td className="px-4 py-3 text-charcoal/80">{a.quiz_title}</td>
                    <td className="px-4 py-3 text-charcoal/60">{a.course_title}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: a.passed ? '#16a34a' : '#dc2626' }}>{a.score}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.passed ? 'Passed' : 'Failed'}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-charcoal/40 text-xs">{new Date(a.created_at + 'Z').toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
