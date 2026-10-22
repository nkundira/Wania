import bcrypt from 'bcryptjs';
import { query, execute } from './db.js';
import { seedCourses } from './seedCourses.js';

async function seedUsers() {
  console.log('Seeding users...');
  const hash = await bcrypt.hash('password123', 12);
  const demoUsers = [
    { username: 'Halilou_barista', email: 'hylou.noir12@gmail.com', name: 'Nkundirumurore Halilou', bio: 'Certified barista trainer with 8 years of specialty coffee experience.', interests: 'Coffee, Latte Art, Sensory Evaluation' },
    { username: 'james_hotel', email: 'james@example.com', name: 'James Okoro', bio: 'Front office manager passionate about guest experience.', interests: 'Hotel Management, Customer Service' },
    { username: 'maria_fbe', email: 'maria@example.com', name: 'Maria Santos', bio: 'Restaurant service specialist and F&B instructor.', interests: 'Fine Dining, Wine Service, Menu Design' },
    { username: 'alex_bartender', email: 'alex@example.com', name: 'Alex Chen', bio: 'Mocktail mixologist and juice bar consultant.', interests: 'Mocktails, Fresh Juices, Beverage Design' },
    { username: 'priya_housekeeping', email: 'priya@example.com', name: 'Priya Sharma', bio: 'Housekeeping operations manager with luxury hotel background.', interests: 'Housekeeping, Laundry, Hotel Operations' },
    { username: 'david_events', email: 'david@example.com', name: 'David Kim', bio: 'Event planner specializing in weddings and corporate conferences.', interests: 'Event Planning, Wedding Design, Hospitality Business' },
  ];
  const userIds = {};
  for (const u of demoUsers) {
    const existing = await query('SELECT id FROM users WHERE username = ?', [u.username]);
    if (existing.length > 0) { userIds[u.username] = existing[0].id; continue; }
    const r = await execute(
      'INSERT INTO users (username, email, password_hash, display_name, bio, interests, role) VALUES (?, ?, ?, ?, ?, ?, "student")',
      [u.username, u.email, hash, u.name, u.bio, u.interests]
    );
    userIds[u.username] = r.insertId;
  }
  return userIds;
}

async function seedCommunity(userIds) {
  console.log('Seeding community content...');
  const users = Object.values(userIds);
  const samplePosts = [
    { user: 'Halilou_barista', content: 'Just pulled the most beautiful ristretto of my life! The crema was like golden velvet. Nothing beats freshly ground single-origin Ethiopian. ☕', sample: 1 },
    { user: 'james_hotel', content: 'Hotel tip: The first 30 seconds of check-in set the tone for the entire stay. Always greet with a genuine smile and use the guest\'s name.', sample: 1 },
    { user: 'maria_fbe', content: 'Pro tip for servers: Always present the dish to the guest before placing it. Say the name. It elevates the experience from casual to memorable.', sample: 1 },
    { user: 'alex_bartender', content: 'New mocktail recipe I\'m working on: Cucumber Elderflower Cooler. Muddled cucumber + elderflower syrup + lime + soda. Refreshing and beautiful! 🥒', sample: 1 },
    { user: 'priya_housekeeping', content: 'The secret to a perfectly made bed: Hospital corners at 45 degrees, tight tuck, and smooth from the center outward. Practice makes perfect!', sample: 1 },
    { user: 'david_events', content: 'Planning a wedding? Start the venue search 12-18 months in advance. The best venues book up fast, especially for peak season!', sample: 1 },
  ];
  for (const p of samplePosts) {
    const existing = await query('SELECT id FROM posts WHERE content = ? LIMIT 1', [p.content]);
    if (existing.length > 0) continue;
    await execute('INSERT INTO posts (user_id, content, is_sample) VALUES (?, ?, 1)', [userIds[p.user], p.content]);
  }
}

async function main() {
  console.log('Seeding Hospitality Academy database...');
  const existingCourses = await query('SELECT COUNT(*) as c FROM courses');
  if (existingCourses[0].c > 0) {
    console.log('Courses already seeded, skipping.');
  } else {
    await seedCourses();
  }
  const userIds = await seedUsers();
  await seedCommunity(userIds);
  console.log('Seed complete! Demo login:hylou.noir@gmail.com / password123');
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
