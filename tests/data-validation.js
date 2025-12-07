/**
 * Data Validation Tests for Human Rights Education Platform
 * Run with: node tests/data-validation.js
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('='.repeat(60));
console.log('Human Rights Education Platform - Data Validation Tests');
console.log('='.repeat(60));
console.log('');

// Timeline Events Tests
console.log('Timeline Events:');
const timeline = JSON.parse(fs.readFileSync(path.join(dataDir, 'timeline-events.json'), 'utf8'));

test('Timeline has metadata', () => {
  assert(timeline.metadata, 'Missing metadata');
  assert(timeline.metadata.eras, 'Missing eras in metadata');
  assert(timeline.metadata.eras.length === 5, `Expected 5 eras, got ${timeline.metadata.eras.length}`);
});

test('Timeline has 100+ events', () => {
  assert(timeline.events.length >= 100, `Expected 100+ events, got ${timeline.events.length}`);
});

test('All events have required fields', () => {
  timeline.events.forEach((event, i) => {
    assert(event.id, `Event ${i} missing id`);
    assert(event.year, `Event ${i} missing year`);
    assert(event.title, `Event ${i} missing title`);
    assert(event.type, `Event ${i} missing type`);
  });
});

test('Events have valid types', () => {
  const validTypes = ['treaty', 'institution', 'declaration', 'event', 'charter', 'historical'];
  timeline.events.forEach((event, i) => {
    assert(validTypes.includes(event.type), `Event ${i} has invalid type: ${event.type}`);
  });
});

test('Events span from pre-1945 to post-2006', () => {
  const years = timeline.events.map(e => e.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  assert(minYear < 1945, `Earliest event is ${minYear}, expected pre-1945`);
  assert(maxYear > 2006, `Latest event is ${maxYear}, expected post-2006`);
});

console.log('');

// Quiz Questions Tests
console.log('Quiz Questions:');
const quiz = JSON.parse(fs.readFileSync(path.join(dataDir, 'quiz-questions.json'), 'utf8'));

test('Quiz has metadata', () => {
  assert(quiz.metadata, 'Missing metadata');
  assert(quiz.metadata.categories, 'Missing categories');
  assert(quiz.metadata.difficultyLevels, 'Missing difficulty levels');
});

test('Quiz has 200+ questions', () => {
  assert(quiz.questions.length >= 200, `Expected 200+ questions, got ${quiz.questions.length}`);
});

test('All questions have required fields', () => {
  quiz.questions.forEach((q, i) => {
    assert(q.id, `Question ${i} missing id`);
    assert(q.type, `Question ${i} missing type`);
    assert(q.category, `Question ${i} missing category`);
    assert(q.difficulty, `Question ${i} missing difficulty`);
    assert(q.question, `Question ${i} missing question text`);
    assert(q.correct !== undefined, `Question ${i} missing correct answer`);
  });
});

test('Multiple choice questions have options', () => {
  const mcQuestions = quiz.questions.filter(q => q.type === 'multiple');
  mcQuestions.forEach((q, i) => {
    assert(q.options && q.options.length >= 2, `MC question ${q.id} missing options`);
  });
});

test('True/false questions have boolean correct answer', () => {
  const tfQuestions = quiz.questions.filter(q => q.type === 'truefalse');
  tfQuestions.forEach(q => {
    assert(typeof q.correct === 'boolean', `TF question ${q.id} correct should be boolean`);
  });
});

test('Has bilingual questions (Slovenian)', () => {
  const bilingualCount = quiz.questions.filter(q => q.questionSL).length;
  assert(bilingualCount >= 20, `Expected 20+ bilingual questions, got ${bilingualCount}`);
});

test('Has questions with exam tips', () => {
  const withTips = quiz.questions.filter(q => q.examTip).length;
  assert(withTips >= 10, `Expected 10+ questions with exam tips, got ${withTips}`);
});

test('Covers all major course topics', () => {
  const categories = [...new Set(quiz.questions.map(q => q.category))];
  const requiredCategories = ['foundations', 'un-system', 'european-coe', 'african', 'inter-american', 'rights', 'theory'];
  requiredCategories.forEach(cat => {
    assert(categories.includes(cat), `Missing category: ${cat}`);
  });
});

console.log('');

// Treaties Tests
console.log('Treaties:');
const treaties = JSON.parse(fs.readFileSync(path.join(dataDir, 'treaties.json'), 'utf8'));

test('Treaties file has treaties array', () => {
  assert(treaties.treaties && Array.isArray(treaties.treaties), 'Missing treaties array');
});

test('All treaties have required fields', () => {
  treaties.treaties.forEach((t, i) => {
    assert(t.id, `Treaty ${i} missing id`);
    assert(t.fullName, `Treaty ${i} missing fullName`);
    assert(t.system, `Treaty ${i} missing system`);
  });
});

console.log('');

// Institutions Tests
console.log('Institutions:');
const institutions = JSON.parse(fs.readFileSync(path.join(dataDir, 'institutions.json'), 'utf8'));

test('Institutions file has institutions array', () => {
  assert(institutions.institutions && Array.isArray(institutions.institutions), 'Missing institutions array');
});

test('All institutions have required fields', () => {
  institutions.institutions.forEach((inst, i) => {
    assert(inst.id, `Institution ${i} missing id`);
    assert(inst.name, `Institution ${i} missing name`);
    assert(inst.system, `Institution ${i} missing system`);
  });
});

console.log('');

// Connections Tests
console.log('Connections:');
const connections = JSON.parse(fs.readFileSync(path.join(dataDir, 'connections.json'), 'utf8'));

test('Connections file has connections array', () => {
  assert(connections.connections && Array.isArray(connections.connections), 'Missing connections array');
});

test('All connections have source and target', () => {
  connections.connections.forEach((c, i) => {
    assert(c.source, `Connection ${i} missing source`);
    assert(c.target, `Connection ${i} missing target`);
  });
});

console.log('');
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
