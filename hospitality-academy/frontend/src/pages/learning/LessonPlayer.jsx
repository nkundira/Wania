import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ArrowLeft, ArrowRight, CheckCircle2, Award, Download, FileText, Clock, BookOpen } from 'lucide-react';

function MarkdownContent({ text }) {
  if (!text) return <p className="text-charcoal/50 italic">No content available for this lesson yet.</p>;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let inTable = false;
  let tableRows = [];

  const flushList = () => { if (listItems.length) { elements.push(<ul key={elements.length} className="list-disc pl-6 space-y-1.5 mb-4">{listItems.map((item, i) => <li key={i} className="text-charcoal/75 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(item) }} />)}</ul>); listItems = []; } };
  const flushTable = () => {
    if (tableRows.length) {
      const header = tableRows[0]; const body = tableRows.slice(2);
      elements.push(
        <div key={elements.length} className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-coffee-100">{header.map((h, i) => <th key={i} className="border border-coffee-200 px-3 py-2 text-left font-semibold text-coffee-900" dangerouslySetInnerHTML={{ __html: renderInline(h.trim()) }} />)}</tr></thead>
            <tbody>{body.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="border border-coffee-200 px-3 py-2 text-charcoal/75" dangerouslySetInnerHTML={{ __html: renderInline(cell.trim()) }} />)}</tr>)}</tbody>
          </table>
        </div>
      );
      tableRows = []; inTable = false;
    }
  };

  function renderInline(t) {
    return t
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-coffee-900 font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-coffee-100 px-1.5 py-0.5 rounded text-sm text-coffee-800">$1</em>');
  }

  for (const line of lines) {
    if (line.startsWith('|')) { flushList(); inTable = true; tableRows.push(line.split('|').slice(1, -1)); continue; }
    if (inTable && !line.startsWith('|')) { flushTable(); }
    if (line.startsWith('### ')) { flushList(); elements.push(<h4 key={elements.length} className="text-lg font-bold text-coffee-900 mt-6 mb-3">{line.slice(4)}</h4>); continue; }
    if (line.startsWith('## ')) { flushList(); elements.push(<h3 key={elements.length} className="text-xl font-bold text-coffee-900 mt-8 mb-4 pb-2 border-b border-coffee-200">{line.slice(3)}</h3>); continue; }
    if (line.startsWith('# ')) { flushList(); elements.push(<h2 key={elements.length} className="text-2xl font-bold text-coffee-900 mb-4">{line.slice(2)}</h2>); continue; }
    if (line.startsWith('- ')) { listItems.push(line.slice(2)); continue; }
    if (/^\d+\. /.test(line)) { listItems.push(line.replace(/^\d+\. /, '')); continue; }
    if (line.trim() === '') { flushList(); continue; }
    flushList();
    elements.push(<p key={elements.length} className="text-charcoal/75 leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />);
  }
  flushList(); flushTable();
  return <div>{elements}</div>;
}

function QuizSection({ moduleId, user }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuiz(null);
    setResult(null);
    setAnswers({});
    setError('');
    let active = true;
    api.get(`/quizzes/module/${moduleId}`).then(({ data }) => {
      if (active && data.quiz) setQuiz(data.quiz);
    }).catch(() => {});
    return () => { active = false; };
  }, [moduleId]);

  if (!quiz) return null;
  if (result) {
    return (
      <div className={`rounded-2xl p-6 mt-6 border ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Award className={`w-8 h-8 ${result.passed ? 'text-green-600' : 'text-red-600'}`} />
          <div>
            <h3 className="font-bold text-lg text-coffee-900">Quiz Results</h3>
            <p className="text-sm text-charcoal/60">{quiz.title}</p>
          </div>
        </div>
        <p className="text-3xl font-bold mb-2" style={{ color: result.passed ? '#16a34a' : '#dc2626' }}>{result.score}%</p>
        <p className="text-sm text-charcoal/60 mb-4">{result.correct} of {result.total} correct • Pass mark: {result.passScore}%</p>
        <p className={`text-sm font-medium ${result.passed ? 'text-green-700' : 'text-red-700'}`}>{result.passed ? 'Congratulations! You passed!' : 'Not quite. Review the material and try again.'}</p>
        <button onClick={() => { setResult(null); setAnswers({}); }} className="mt-4 text-sm text-coffee-700 underline">Retake quiz</button>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-gold/5 border border-gold/30 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-gold-dark" />
        <h3 className="font-bold text-coffee-900">{quiz.title}</h3>
      </div>
      {!user && <p className="text-sm text-charcoal/60 mb-4">Sign in to take this quiz and save your score.</p>}
      <div className="space-y-5">
        {quiz.questions.map((q, qi) => (
          <div key={q.id}>
            <p className="font-medium text-coffee-900 mb-2 text-sm">{qi + 1}. {q.question}</p>
            <div className="space-y-1.5">
              {q.options.map(opt => (
                <label key={opt.id} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm cursor-pointer transition ${answers[q.id] === opt.id ? 'border-coffee-500 bg-coffee-50' : 'border-coffee-200 hover:border-coffee-300 bg-white'}`}>
                  <input type="radio" name={`q${q.id}`} checked={answers[q.id] === opt.id} onChange={() => setAnswers({ ...answers, [q.id]: opt.id })} className="accent-coffee-700" disabled={!user} />
                  <span className="text-charcoal/75">{opt.option_text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      {user && (
        <button
          onClick={async () => {
            setSubmitting(true); setError('');
            try {
              const { data } = await api.post(`/quizzes/${quiz.id}/submit`, { answers });
              setResult(data);
            } catch (e) { setError(e.response?.data?.error || 'Failed to submit'); }
            setSubmitting(false);
          }}
          disabled={submitting || Object.keys(answers).length < quiz.questions.length}
          className="mt-5 bg-coffee-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-coffee-800 transition disabled:opacity-50 text-sm"
        >
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      )}
    </div>
  );
}

export default function LessonPlayer() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState('lesson');

  useEffect(() => {
    setLoading(true);
    setCompleted(false);
    setActiveTab('lesson');
    api.get(`/lessons/${lessonId}`).then(r => {
      setLesson(r.data?.lesson || null);
      setCompleted(!!r.data?.lesson?.progress?.completed);
    }).catch(e => {
      if (e.response?.status === 401) {
        navigate('/login', { state: { from: `/lessons/${lessonId}` } });
      } else setLesson(null);
    }).finally(() => setLoading(false));
  }, [lessonId]);

  const markComplete = async () => {
    if (!user) { navigate('/login', { state: { from: `/lessons/${lessonId}` } }); return; }
    try { await api.post(`/lessons/${lessonId}/complete`); setCompleted(true); } catch {}
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>;
  if (!lesson) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><h1 className="text-2xl font-bold">Lesson not found</h1></div>;

  const isLocked = !lesson.is_public && !user;

  return (
    <div className="min-h-screen bg-coffee-50">
      {/* Header */}
      <div className="bg-white border-b border-coffee-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/courses/${lesson.course_slug}`} className="p-1.5 hover:bg-coffee-100 rounded-lg transition"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <p className="text-xs text-charcoal/50">{lesson.course_title}</p>
              <h1 className="text-sm md:text-base font-semibold text-coffee-900 line-clamp-1">{lesson.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:flex text-xs text-charcoal/50 items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> {lesson.currentIndex}/{lesson.totalLessons}
            </span>
            <button
              onClick={markComplete}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${completed ? 'bg-green-100 text-green-700' : 'bg-coffee-700 text-white hover:bg-coffee-800'}`}
            >
              <CheckCircle2 className="w-4 h-4" /> {completed ? 'Completed' : 'Mark Complete'}
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-coffee-100">
          <div className="h-full bg-gold transition-all duration-500" style={{ width: `${lesson.totalLessons > 0 ? (lesson.currentIndex / lesson.totalLessons) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {isLocked ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-coffee-100">
            <div className="w-16 h-16 rounded-full bg-coffee-100 flex items-center justify-center mx-auto mb-4"><BookOpen className="w-8 h-8 text-coffee-700" /></div>
            <h2 className="text-xl font-bold text-coffee-900 mb-2">Sign in to access this lesson</h2>
            <p className="text-charcoal/60 mb-6">This lesson requires an account. Public lessons are available without signing in.</p>
            <Link to="/login" state={{ from: `/lessons/${lessonId}` }} className="bg-coffee-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-coffee-800 inline-block">Sign In</Link>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-coffee-100 w-fit">
              <button onClick={() => setActiveTab('lesson')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'lesson' ? 'bg-coffee-700 text-white' : 'text-charcoal/60 hover:text-coffee-700'}`}>Lesson</button>
              {lesson.resources?.length > 0 && (
                <button onClick={() => setActiveTab('resources')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'resources' ? 'bg-coffee-700 text-white' : 'text-charcoal/60 hover:text-coffee-700'}`}>Resources</button>
              )}
            </div>

            {activeTab === 'lesson' && (
              <div className="bg-white rounded-2xl border border-coffee-100 p-6 md:p-8">
                {/* Video */}
                {lesson.video_url && (
                  <div className="mb-6 rounded-xl overflow-hidden">
                    {lesson.video_type === 'embed' ? (
                      <iframe src={lesson.video_url} className="w-full aspect-video rounded-xl" allowFullScreen title={lesson.title} />
                    ) : (
                      <video src={lesson.video_url} controls className="w-full rounded-xl" />
                    )}
                  </div>
                )}
                {!lesson.video_url && (
                  <div className="mb-6 bg-coffee-50 rounded-xl p-4 border border-coffee-100 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-coffee-500 flex-shrink-0" />
                    <p className="text-sm text-charcoal/60">Written lesson with study notes. A video for this lesson has not been added yet.</p>
                  </div>
                )}

                {lesson.duration_minutes && (
                  <p className="text-xs text-charcoal/40 mb-4 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Estimated {lesson.duration_minutes} minutes</p>
                )}

                <MarkdownContent text={lesson.content} />

                {/* Module quiz */}
                {lesson.module_id && <QuizSection moduleId={lesson.module_id} user={user} />}
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="bg-white rounded-2xl border border-coffee-100 p-6">
                <h3 className="font-bold text-coffee-900 mb-4">Lesson Resources</h3>
                {lesson.resources?.length > 0 ? (
                  <div className="space-y-2">
                    {lesson.resources.map(r => (
                      <a key={r.id} href={r.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-coffee-100 hover:border-coffee-300 transition">
                        <Download className="w-4 h-4 text-coffee-500" />
                        <span className="text-sm text-charcoal/80">{r.title}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-charcoal/50 text-sm">No downloadable resources for this lesson.</p>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6">
              {lesson.prevLesson ? (
                <button onClick={() => navigate(`/lessons/${lesson.prevLesson.id}`)} className="flex items-center gap-2 text-coffee-700 font-medium hover:text-coffee-900 text-sm">
                  <ArrowLeft className="w-4 h-4" /> Previous Lesson
                </button>
              ) : <div />}
              {lesson.nextLesson && (
                <button onClick={() => navigate(`/lessons/${lesson.nextLesson.id}`)} className="flex items-center gap-2 bg-coffee-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-coffee-800 text-sm">
                  Next Lesson <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
