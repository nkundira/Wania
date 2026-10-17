import { Router } from 'express';
import { listCourses, getCourse, getLesson, completeLesson, getCourseProgress, enroll, getQuiz, getQuizByModule, submitQuiz, getMyLearning, getQuizResults } from '../controllers/courseController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/courses', listCourses);
router.get('/courses/:slug', getCourse);
router.get('/lessons/:lessonId', optionalAuth, getLesson);
router.post('/lessons/:lessonId/complete', requireAuth, completeLesson);
router.get('/courses/:courseId/progress', requireAuth, getCourseProgress);
router.post('/courses/:courseId/enroll', requireAuth, enroll);
router.get('/quizzes/module/:moduleId', getQuizByModule);
router.get('/quizzes/:quizId', getQuiz);
router.post('/quizzes/:quizId/submit', requireAuth, [
  body('answers').isObject().withMessage('Answers object required'),
  validate
], submitQuiz);
router.get('/my-learning', requireAuth, getMyLearning);
router.get('/quiz-results', requireAuth, getQuizResults);

export default router;
