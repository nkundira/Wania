import { query, queryOne, execute } from '../config/db.js';

export async function listCourses(req, res, next) {
  try {
    const { category, level, search, page = 1, limit = 50 } = req.query;
    let sql = 'SELECT c.*, (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as module_count, (SELECT COUNT(*) FROM modules m JOIN lessons l ON l.module_id = m.id WHERE m.course_id = c.id) as lesson_count FROM courses c WHERE c.is_published = 1';
    const params = [];
    if (category) { sql += ' AND c.category = ?'; params.push(category); }
    if (level) { sql += ' AND c.level = ?'; params.push(level); }
    if (search) { sql += ' AND (c.title LIKE ? OR c.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY c.sort_order, c.id';
    const courses = await query(sql, params);
    res.json({ courses });
  } catch (err) { next(err); }
}

export async function getCourse(req, res, next) {
  try {
    const { slug } = req.params;
    const course = await queryOne('SELECT * FROM courses WHERE slug = ? AND is_published = 1', [slug]);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const modules = await query('SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order', [course.id]);
    for (const m of modules) {
      m.lessons = await query('SELECT id, title, duration_minutes, is_public, sort_order FROM lessons WHERE module_id = ? ORDER BY sort_order', [m.id]);
      m.quiz = await queryOne('SELECT id, title, pass_score FROM quizzes WHERE module_id = ? LIMIT 1', [m.id]);
    }
    course.modules = modules;
    res.json({ course });
  } catch (err) { next(err); }
}

export async function getLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const lesson = await queryOne(
      `SELECT l.*, m.title as module_title, m.course_id, c.title as course_title, c.slug as course_slug, c.is_public as course_public
       FROM lessons l JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id
       WHERE l.id = ?`,
      [lessonId]
    );
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (!lesson.is_public && !req.userId) {
      return res.status(401).json({ error: 'Login required for this lesson' });
    }
    lesson.resources = await query('SELECT * FROM lesson_resources WHERE lesson_id = ?', [lessonId]);
    const siblings = await query(
      `SELECT l.id, l.title, l.sort_order FROM lessons l JOIN modules m ON l.module_id = m.id
       WHERE m.course_id = ? ORDER BY m.sort_order, l.sort_order`,
      [lesson.course_id]
    );
    const idx = siblings.findIndex(s => s.id === parseInt(lessonId));
    lesson.prevLesson = idx > 0 ? siblings[idx - 1] : null;
    lesson.nextLesson = idx < siblings.length - 1 ? siblings[idx + 1] : null;
    lesson.totalLessons = siblings.length;
    lesson.currentIndex = idx + 1;
    let progress = null;
    if (req.userId) {
      progress = await queryOne('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', [req.userId, lessonId]);
    }
    lesson.progress = progress;
    res.json({ lesson });
  } catch (err) { next(err); }
}

export async function completeLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const lesson = await queryOne('SELECT id FROM lessons WHERE id = ?', [lessonId]);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    await execute(
      `INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE completed = 1, completed_at = NOW()`,
      [req.user.id, lessonId]
    );
    res.json({ message: 'Lesson marked complete' });
  } catch (err) { next(err); }
}

export async function getCourseProgress(req, res, next) {
  try {
    const { courseId } = req.params;
    const totalLessons = await queryOne(
      `SELECT COUNT(*) as total FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?`,
      [courseId]
    );
    const completedLessons = await queryOne(
      `SELECT COUNT(*) as completed FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id JOIN modules m ON l.module_id = m.id
       WHERE m.course_id = ? AND lp.user_id = ? AND lp.completed = 1`,
      [courseId, req.user.id]
    );
    const enrolled = await queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [req.user.id, courseId]);
    const pct = totalLessons.total > 0 ? Math.round((completedLessons.completed / totalLessons.total) * 100) : 0;
    res.json({ totalLessons: totalLessons.total, completedLessons: completedLessons.completed, percentage: pct, enrolled: !!enrolled });
  } catch (err) { next(err); }
}

export async function enroll(req, res, next) {
  try {
    const { courseId } = req.params;
    const course = await queryOne('SELECT id FROM courses WHERE id = ? AND is_published = 1', [courseId]);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await execute(
      'INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)',
      [req.user.id, courseId]
    );
    res.json({ message: 'Enrolled' });
  } catch (err) { next(err); }
}

export async function getQuiz(req, res, next) {
  try {
    const { quizId } = req.params;
    const quiz = await queryOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    const questions = await query('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order', [quizId]);
    for (const q of questions) {
      q.options = await query('SELECT id, option_text, sort_order FROM quiz_options WHERE question_id = ? ORDER BY sort_order', [q.id]);
    }
    quiz.questions = questions;
    res.json({ quiz });
  } catch (err) { next(err); }
}

export async function getQuizByModule(req, res, next) {
  try {
    const { moduleId } = req.params;
    const quiz = await queryOne('SELECT * FROM quizzes WHERE module_id = ? LIMIT 1', [moduleId]);
    if (!quiz) return res.json({ quiz: null });
    const questions = await query('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order', [quiz.id]);
    for (const q of questions) {
      q.options = await query('SELECT id, option_text, sort_order FROM quiz_options WHERE question_id = ? ORDER BY sort_order', [q.id]);
    }
    quiz.questions = questions;
    res.json({ quiz });
  } catch (err) { next(err); }
}

export async function submitQuiz(req, res, next) {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Answers required' });
    const quiz = await queryOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    const questions = await query('SELECT id FROM quiz_questions WHERE quiz_id = ?', [quizId]);
    let correct = 0;
    const results = [];
    for (const q of questions) {
      const correctOpt = await queryOne('SELECT id FROM quiz_options WHERE question_id = ? AND is_correct = 1', [q.id]);
      const selected = answers[q.id];
      const isCorrect = correctOpt && parseInt(selected) === correctOpt.id;
      if (isCorrect) correct++;
      results.push({ questionId: q.id, correct: isCorrect });
    }
    const total = questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = score >= quiz.pass_score ? 1 : 0;
    await execute(
      'INSERT INTO quiz_attempts (user_id, quiz_id, score, total_questions, correct_answers, passed, answers) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, quizId, score, total, correct, passed, JSON.stringify(results)]
    );
    const explanationQs = await query(
      `SELECT qq.id, qq.explanation, qo.id as correct_option_id, qo.option_text as correct_text
       FROM quiz_questions qq JOIN quiz_options qo ON qo.question_id = qq.id AND qo.is_correct = 1
       WHERE qq.quiz_id = ?`,
      [quizId]
    );
    res.json({ score, total, correct, passed: !!passed, passScore: quiz.pass_score, explanations: explanationQs });
  } catch (err) { next(err); }
}

export async function getMyLearning(req, res, next) {
  try {
    const enrollments = await query(
      `SELECT e.*, c.title, c.slug, c.cover_image, c.category, c.level,
       (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as total_modules
       FROM enrollments e JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = ? ORDER BY e.enrolled_at DESC`,
      [req.user.id]
    );
    for (const e of enrollments) {
      const total = await queryOne(
        `SELECT COUNT(*) as t FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?`, [e.course_id]
      );
      const done = await queryOne(
        `SELECT COUNT(*) as d FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id WHERE m.course_id = ? AND lp.user_id = ? AND lp.completed = 1`,
        [e.course_id, req.user.id]
      );
      e.totalLessons = total.t;
      e.completedLessons = done.d;
      e.percentage = total.t > 0 ? Math.round((done.d / total.t) * 100) : 0;
    }
    res.json({ enrollments });
  } catch (err) { next(err); }
}

export async function getQuizResults(req, res, next) {
  try {
    const attempts = await query(
      `SELECT qa.*, q.title as quiz_title, m.title as module_title, c.title as course_title
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       JOIN modules m ON q.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE qa.user_id = ? ORDER BY qa.created_at DESC`,
      [req.user.id]
    );
    res.json({ attempts });
  } catch (err) { next(err); }
}
