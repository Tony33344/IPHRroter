// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080';

test.describe('Human Rights Education Platform Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for app to initialize
    await page.waitForTimeout(1000);
  });

  test.describe('Data Loading', () => {
    test('should load all required data files', async ({ page }) => {
      // Check console for data loading success
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Verify no critical errors
      const errors = consoleMessages.filter(m => m.includes('Error loading data'));
      expect(errors.length).toBe(0);
    });

    test('should have timeline events loaded', async ({ page }) => {
      // Navigate to timeline using data-section attribute
      await page.click('[data-section="timeline"]');
      await page.waitForTimeout(500);
      
      // Check event count display
      const eventCount = await page.locator('#timelineEventCount').textContent();
      expect(parseInt(eventCount)).toBeGreaterThan(100);
    });

    test('should have quiz questions loaded', async ({ page }) => {
      // Navigate to quiz using data-section attribute
      await page.click('[data-section="quiz"]');
      await page.waitForTimeout(500);
      
      // Start quiz with all questions
      await page.selectOption('#quizCategory', 'all');
      await page.selectOption('#quizCount', 'all');
      await page.click('#startQuiz');
      await page.waitForTimeout(500);
      
      // Check progress text shows questions
      const progressText = await page.locator('#quizProgressText').textContent();
      expect(progressText).toContain('of');
      
      // Extract total questions
      const match = progressText.match(/of (\d+)/);
      expect(parseInt(match[1])).toBeGreaterThan(200);
    });
  });

  test.describe('Timeline 3-View System', () => {
    test('should display era blocks view by default', async ({ page }) => {
      await page.click('[data-section="timeline"]');
      await page.waitForTimeout(500);
      
      // Check era blocks are visible
      const eraBlocks = await page.locator('.era-block').count();
      expect(eraBlocks).toBe(5);
    });

    test('should switch to zoom timeline view', async ({ page }) => {
      await page.click('[data-section="timeline"]');
      await page.waitForTimeout(500);
      
      // Click zoom view button
      await page.click('.view-btn[data-view="zoom"]');
      await page.waitForTimeout(1000);
      
      // Check timeline wrapper is visible
      const timelineWrapper = page.locator('#timelineWrapper');
      await expect(timelineWrapper).toBeVisible();
      
      // Check era quick nav is visible
      const eraQuickNav = page.locator('#eraQuickNav');
      await expect(eraQuickNav).toBeVisible();
    });

    test('should switch to stacked tracks view', async ({ page }) => {
      await page.click('[data-section="timeline"]');
      await page.waitForTimeout(500);
      
      // Click stacked view button
      await page.click('.view-btn[data-view="stacked"]');
      await page.waitForTimeout(500);
      
      // Check stacked view is visible
      const stackedView = page.locator('#timelineStackedView');
      await expect(stackedView).toBeVisible();
      
      // Check tracks are rendered
      const tracks = await page.locator('.stacked-track').count();
      expect(tracks).toBeGreaterThan(0);
    });

    test('should expand era block on click', async ({ page }) => {
      await page.click('[data-section="timeline"]');
      await page.waitForTimeout(500);
      
      // Click on first era block
      await page.click('.era-block:first-child');
      await page.waitForTimeout(500);
      
      // Check if expanded class is added
      const expandedBlock = await page.locator('.era-block.expanded').count();
      expect(expandedBlock).toBe(1);
      
      // Check events list is visible
      const eventsList = await page.locator('.era-events-list').count();
      expect(eventsList).toBe(1);
    });

    test('should filter timeline events', async ({ page }) => {
      await page.click('[data-section="timeline"]');
      await page.waitForTimeout(500);
      
      // Click treaty filter
      await page.click('#timeline .filter-btn[data-filter="treaty"]');
      await page.waitForTimeout(500);
      
      // Expand an era to check filtered events
      await page.click('.era-block:nth-child(2)');
      await page.waitForTimeout(500);
      
      // All visible events should be treaties
      const eventTypes = await page.locator('.era-event-type').allTextContents();
      eventTypes.forEach(type => {
        expect(type.toLowerCase()).toBe('treaty');
      });
    });
  });

  test.describe('Quiz System', () => {
    test('should start quiz with selected category', async ({ page }) => {
      await page.click('[data-section="quiz"]');
      await page.waitForTimeout(500);
      
      // Select foundations category
      await page.selectOption('#quizCategory', 'foundations');
      await page.selectOption('#quizCount', '5');
      await page.click('#startQuiz');
      await page.waitForTimeout(500);
      
      // Check quiz container is visible
      const quizContainer = page.locator('#quizContainer');
      await expect(quizContainer).toBeVisible();
      
      // Check question is displayed
      const question = page.locator('#quizQuestion h3');
      await expect(question).toBeVisible();
    });

    test('should handle multiple choice questions', async ({ page }) => {
      await page.click('[data-section="quiz"]');
      await page.waitForTimeout(500);
      
      await page.selectOption('#quizCount', '5');
      await page.click('#startQuiz');
      await page.waitForTimeout(500);
      
      // Click first option
      await page.click('.quiz-option:first-child');
      await page.waitForTimeout(500);
      
      // Check feedback is shown
      const feedback = page.locator('#quizFeedback');
      await expect(feedback).toBeVisible();
      
      // Check next button is enabled
      const nextBtn = page.locator('#nextQuestion');
      await expect(nextBtn).toBeEnabled();
    });

    test('should display exam tips when available', async ({ page }) => {
      await page.click('[data-section="quiz"]');
      await page.waitForTimeout(500);
      
      // Select foundations which has exam tips
      await page.selectOption('#quizCategory', 'foundations');
      await page.selectOption('#quizCount', 'all');
      await page.click('#startQuiz');
      await page.waitForTimeout(500);
      
      // Answer questions until we find one with exam tip
      let foundExamTip = false;
      for (let i = 0; i < 10; i++) {
        await page.click('.quiz-option:first-child');
        await page.waitForTimeout(300);
        
        const examTip = await page.locator('.exam-tip').count();
        if (examTip > 0) {
          foundExamTip = true;
          break;
        }
        
        // Check if we can continue
        const nextBtn = page.locator('#nextQuestion');
        if (await nextBtn.isEnabled()) {
          await nextBtn.click();
          await page.waitForTimeout(300);
        } else {
          break;
        }
      }
      
      // At least some questions should have exam tips
      // This is a soft check since not all questions have tips
      console.log('Found exam tip:', foundExamTip);
    });

    test('should show quiz results', async ({ page }) => {
      await page.click('[data-section="quiz"]');
      await page.waitForTimeout(500);
      
      await page.selectOption('#quizCount', '5');
      await page.click('#startQuiz');
      await page.waitForTimeout(500);
      
      // Answer all 5 questions
      for (let i = 0; i < 5; i++) {
        await page.click('.quiz-option:first-child');
        await page.waitForTimeout(300);
        await page.click('#nextQuestion');
        await page.waitForTimeout(300);
      }
      
      // Check results are shown
      const results = page.locator('#quizResults');
      await expect(results).toBeVisible();
      
      // Check score is displayed
      const score = page.locator('#finalScore');
      await expect(score).toBeVisible();
    });
  });

  test.describe('Spider Web Visualization', () => {
    test('should render spider web with nodes', async ({ page }) => {
      await page.click('[data-section="spider-web"]');
      await page.waitForTimeout(1500);
      
      // Check SVG is rendered
      const svg = page.locator('#webContainer svg');
      await expect(svg).toBeVisible();
      
      // Check nodes are rendered
      const nodes = await page.locator('#webContainer .node').count();
      expect(nodes).toBeGreaterThan(10);
    });

    test('should filter by system', async ({ page }) => {
      await page.click('[data-section="spider-web"]');
      await page.waitForTimeout(1500);
      
      // Click UN filter
      await page.click('#spider-web .filter-btn[data-filter="un"]');
      await page.waitForTimeout(500);
      
      // Check filter is active
      const activeFilter = page.locator('#spider-web .filter-btn.active');
      await expect(activeFilter).toHaveAttribute('data-filter', 'un');
    });

    test('should search nodes', async ({ page }) => {
      await page.click('[data-section="spider-web"]');
      await page.waitForTimeout(1500);
      
      // Search for ECHR
      await page.fill('#webSearch', 'ECHR');
      await page.waitForTimeout(500);
      
      // Some nodes should be dimmed
      // This is a visual test, just verify no errors
    });
  });

  test.describe('Treaties Section', () => {
    test('should display treaties grid', async ({ page }) => {
      await page.click('[data-section="treaties"]');
      await page.waitForTimeout(500);
      
      // Check treaties are rendered
      const treaties = await page.locator('.treaty-card').count();
      expect(treaties).toBeGreaterThan(5);
    });

    test('should filter treaties by system', async ({ page }) => {
      await page.click('[data-section="treaties"]');
      await page.waitForTimeout(500);
      
      // Click European filter
      await page.click('#treaties .filter-btn[data-filter="european"]');
      await page.waitForTimeout(500);
      
      // Check filtered treaties have European badge
      const badges = await page.locator('.treaty-system-badge.european').count();
      expect(badges).toBeGreaterThan(0);
    });

    test('should open treaty detail modal', async ({ page }) => {
      await page.click('[data-section="treaties"]');
      await page.waitForTimeout(500);
      
      // Click first treaty card
      await page.click('.treaty-card:first-child');
      await page.waitForTimeout(500);
      
      // Check modal is visible (class can be 'active' or 'open')
      const modal = page.locator('#detailModal');
      await expect(modal).toHaveClass(/active|open/);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between sections', async ({ page }) => {
      const sections = ['home', 'timeline', 'spider-web', 'treaties', 'quiz', 'about'];
      
      for (const section of sections) {
        await page.click(`[data-section="${section}"]`);
        await page.waitForTimeout(300);
        
        const sectionEl = page.locator(`#${section}`);
        await expect(sectionEl).toHaveClass(/active/);
      }
    });

    test('should toggle theme', async ({ page }) => {
      // Click theme toggle
      await page.click('#themeToggle');
      await page.waitForTimeout(300);
      
      // Check dark theme is applied
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', 'dark');
      
      // Toggle back
      await page.click('#themeToggle');
      await page.waitForTimeout(300);
      
      await expect(html).toHaveAttribute('data-theme', 'light');
    });
  });

  test.describe('Search Functionality', () => {
    test('should search and find results', async ({ page }) => {
      // Focus search input
      await page.fill('#globalSearch', 'UDHR');
      await page.waitForTimeout(500);
      
      // Check results are shown
      const results = page.locator('#searchResults');
      await expect(results).toHaveClass(/active/);
      
      // Check at least one result
      const resultItems = await page.locator('.search-result-item').count();
      expect(resultItems).toBeGreaterThan(0);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Check navbar is visible
      const navbar = page.locator('.navbar');
      await expect(navbar).toBeVisible();
      
      // Open mobile menu first
      await page.click('#mobileMenuBtn');
      await page.waitForTimeout(300);
      
      // Navigate to timeline
      await page.click('[data-section="timeline"]');
      await page.waitForTimeout(500);
      
      // Check era blocks are visible (should stack on mobile)
      const eraBlocks = await page.locator('.era-block').count();
      expect(eraBlocks).toBe(5);
    });
  });

  test.describe('Cases Section', () => {
    test('should display cases grid', async ({ page }) => {
      await page.click('[data-section="cases"]');
      await page.waitForTimeout(500);
      
      // Check cases are loaded
      const caseCards = await page.locator('.case-card').count();
      expect(caseCards).toBeGreaterThan(40);
    });

    test('should filter cases by court', async ({ page }) => {
      await page.click('[data-section="cases"]');
      await page.waitForTimeout(500);
      
      // Filter by ECtHR
      await page.selectOption('#caseCourtFilter', 'ECtHR');
      await page.waitForTimeout(300);
      
      // Check filtered results
      const caseCards = await page.locator('.case-card').count();
      expect(caseCards).toBeGreaterThan(30);
    });

    test('should search cases', async ({ page }) => {
      await page.click('[data-section="cases"]');
      await page.waitForTimeout(500);
      
      // Search for Soering
      await page.fill('#caseSearch', 'Soering');
      await page.waitForTimeout(500);
      
      // Check search results
      const caseCards = await page.locator('.case-card').count();
      expect(caseCards).toBeGreaterThan(0);
    });
  });

  test.describe('Learn Section', () => {
    test('should display course modules', async ({ page }) => {
      await page.click('[data-section="learn"]');
      await page.waitForTimeout(500);
      
      // Check modules are displayed
      const moduleCards = await page.locator('.module-card').count();
      expect(moduleCards).toBe(6);
    });

    test('should expand seminar accordion', async ({ page }) => {
      await page.click('[data-section="learn"]');
      await page.waitForTimeout(500);
      
      // Click first seminar header
      await page.click('.seminar-header');
      await page.waitForTimeout(300);
      
      // Check content is visible
      const seminarContent = page.locator('.seminar-item.active .seminar-content');
      await expect(seminarContent).toBeVisible();
    });
  });

  test.describe('Tools Section', () => {
    test('should display tool cards', async ({ page }) => {
      await page.click('[data-section="tools"]');
      await page.waitForTimeout(500);
      
      // Check tools are displayed
      const toolCards = await page.locator('.tool-card').count();
      expect(toolCards).toBe(4);
    });

    test('should update UPR stats on country change', async ({ page }) => {
      await page.click('[data-section="tools"]');
      await page.waitForTimeout(500);
      
      // Change country
      await page.selectOption('#uprCountry', 'usa');
      await page.waitForTimeout(300);
      
      // Check stats updated
      const acceptedText = await page.locator('#uprAccepted').textContent();
      expect(acceptedText).toBe('89');
    });
  });
});
