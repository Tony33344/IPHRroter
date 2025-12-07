/**
 * Human Rights Education Platform - Main Application
 * Interactive visualizations for learning international human rights law
 */

// =====================================================
// APP STATE & DATA
// =====================================================

const App = {
    data: {
        treaties: [],
        institutions: [],
        connections: [],
        timelineEvents: [],
        quizQuestions: []
    },
    state: {
        currentSection: 'home',
        theme: 'light',
        language: 'en',
        quiz: {
            questions: [],
            currentIndex: 0,
            score: 0,
            answers: []
        },
        timeline: {
            zoom: 1,
            filter: 'all',
            viewMode: 'eras', // 'eras', 'zoom', 'stacked'
            selectedEra: null
        },
        web: {
            filter: 'all',
            selectedNode: null
        }
    },
    progress: {
        quizHistory: [],
        viewedTreaties: [],
        viewedInstitutions: [],
        timeSpent: 0,
        lastVisit: null
    }
};

// =====================================================
// PROGRESS TRACKING
// =====================================================

const Progress = {
    STORAGE_KEY: 'hrplatform_progress',
    
    load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                App.progress = { ...App.progress, ...JSON.parse(saved) };
            }
            App.progress.lastVisit = new Date().toISOString();
            this.save();
        } catch (e) {
            console.warn('Could not load progress:', e);
        }
    },
    
    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(App.progress));
        } catch (e) {
            console.warn('Could not save progress:', e);
        }
    },
    
    recordQuizAttempt(category, score, total) {
        App.progress.quizHistory.push({
            date: new Date().toISOString(),
            category,
            score,
            total,
            percentage: Math.round((score / total) * 100)
        });
        // Keep only last 50 attempts
        if (App.progress.quizHistory.length > 50) {
            App.progress.quizHistory = App.progress.quizHistory.slice(-50);
        }
        this.save();
    },
    
    recordView(type, id) {
        const key = type === 'treaty' ? 'viewedTreaties' : 'viewedInstitutions';
        if (!App.progress[key].includes(id)) {
            App.progress[key].push(id);
            this.save();
        }
    },
    
    getStats() {
        const history = App.progress.quizHistory;
        if (history.length === 0) {
            return { attempts: 0, avgScore: 0, bestScore: 0 };
        }
        const scores = history.map(h => h.percentage);
        return {
            attempts: history.length,
            avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            bestScore: Math.max(...scores),
            recentScores: scores.slice(-10)
        };
    },
    
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
        App.progress = {
            quizHistory: [],
            viewedTreaties: [],
            viewedInstitutions: [],
            timeSpent: 0,
            lastVisit: null
        };
    }
};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Load progress from localStorage
    Progress.load();
    
    // Load data
    await loadAllData();
    
    // Setup event listeners
    setupNavigation();
    setupThemeToggle();
    setupCards();
    setupModal();
    setupSearch();
    
    // Initialize visualizations
    initHeroDiagram();
    initTimeline();
    initSpiderWeb();
    initTreatiesGrid();
    initQuiz();
    initProgressDisplay();
    
    // Check URL hash for direct navigation
    const hash = window.location.hash.slice(1);
    if (hash) {
        navigateToSection(hash);
    }
    
    // Track time spent
    setInterval(() => {
        App.progress.timeSpent += 1;
        if (App.progress.timeSpent % 60 === 0) {
            Progress.save();
        }
    }, 1000);
});

// =====================================================
// DATA LOADING
// =====================================================

async function loadAllData() {
    try {
        const [treaties, institutions, connections, timeline, quiz] = await Promise.all([
            fetch('data/treaties.json').then(r => r.json()),
            fetch('data/institutions.json').then(r => r.json()),
            fetch('data/connections.json').then(r => r.json()),
            fetch('data/timeline-events.json').then(r => r.json()),
            fetch('data/quiz-questions.json').then(r => r.json())
        ]);
        
        App.data.treaties = treaties.treaties;
        App.data.institutions = institutions.institutions;
        App.data.connections = connections.connections;
        App.data.timelineEvents = timeline.events;
        App.data.timelineMetadata = timeline.metadata || null;
        App.data.quizQuestions = quiz.questions;
        
        console.log('Data loaded successfully:', {
            treaties: App.data.treaties.length,
            institutions: App.data.institutions.length,
            timelineEvents: App.data.timelineEvents.length,
            quizQuestions: App.data.quizQuestions.length
        });
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data. Please refresh the page.');
    }
}

// =====================================================
// NAVIGATION
// =====================================================

function setupNavigation() {
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateToSection(section);
        });
    });
    
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    mobileMenuBtn?.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
    
    // Close mobile menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
        });
    });
    
    // Hero and card buttons
    document.querySelectorAll('[data-section]').forEach(el => {
        if (!el.classList.contains('nav-link')) {
            el.addEventListener('click', () => {
                const section = el.dataset.section;
                const filter = el.dataset.filter;
                navigateToSection(section, filter);
            });
        }
    });
}

function navigateToSection(sectionId, filter = null) {
    // Update URL hash
    window.location.hash = sectionId;
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
    
    // Show section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
    
    // Apply filter if provided
    if (filter && sectionId === 'spider-web') {
        App.state.web.filter = filter;
        filterSpiderWeb(filter);
        document.querySelectorAll('#spider-web .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    App.state.currentSection = sectionId;
}

// =====================================================
// THEME TOGGLE
// =====================================================

function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Check for saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        App.state.theme = savedTheme;
    }
    
    themeToggle?.addEventListener('click', () => {
        const newTheme = App.state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        App.state.theme = newTheme;
    });
}

// =====================================================
// CARDS INTERACTION
// =====================================================

function setupCards() {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            const section = card.dataset.section;
            const filter = card.dataset.filter;
            navigateToSection(section, filter);
        });
    });
}

// =====================================================
// MODAL
// =====================================================

function setupModal() {
    const modal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('closeModal');
    const backdrop = modal?.querySelector('.modal-backdrop');
    
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(content) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = content;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
}

// =====================================================
// HERO MINI DIAGRAM
// =====================================================

function initHeroDiagram() {
    const container = document.getElementById('heroMiniDiagram');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create a simplified version of the main concepts
    const nodes = [
        { id: 'un', label: 'UN System', x: width/2, y: height/3, color: '#3B82F6', size: 40 },
        { id: 'udhr', label: 'UDHR', x: width/3, y: height/2, color: '#3B82F6', size: 30 },
        { id: 'treaties', label: 'Treaties', x: width*2/3, y: height/2, color: '#8B5CF6', size: 30 },
        { id: 'european', label: 'European', x: width/4, y: height*2/3, color: '#8B5CF6', size: 25 },
        { id: 'americas', label: 'Americas', x: width/2, y: height*3/4, color: '#10B981', size: 25 },
        { id: 'african', label: 'African', x: width*3/4, y: height*2/3, color: '#F59E0B', size: 25 }
    ];
    
    const links = [
        { source: 'un', target: 'udhr' },
        { source: 'un', target: 'treaties' },
        { source: 'udhr', target: 'european' },
        { source: 'udhr', target: 'americas' },
        { source: 'udhr', target: 'african' },
        { source: 'treaties', target: 'european' },
        { source: 'treaties', target: 'americas' },
        { source: 'treaties', target: 'african' }
    ];
    
    // Draw links
    svg.selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('x1', d => nodes.find(n => n.id === d.source).x)
        .attr('y1', d => nodes.find(n => n.id === d.source).y)
        .attr('x2', d => nodes.find(n => n.id === d.target).x)
        .attr('y2', d => nodes.find(n => n.id === d.target).y)
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 2);
    
    // Draw nodes
    const nodeGroups = svg.selectAll('g.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
    
    nodeGroups.append('circle')
        .attr('r', d => d.size)
        .attr('fill', d => d.color)
        .attr('opacity', 0.2);
    
    nodeGroups.append('circle')
        .attr('r', d => d.size * 0.6)
        .attr('fill', d => d.color);
    
    nodeGroups.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', d => d.size + 15)
        .attr('fill', '#6b7280')
        .attr('font-size', '12px')
        .text(d => d.label);
    
    // Animate nodes
    function pulse() {
        nodeGroups.selectAll('circle')
            .transition()
            .duration(2000)
            .attr('opacity', d => d.size ? 0.3 : 1)
            .transition()
            .duration(2000)
            .attr('opacity', d => d.size ? 0.2 : 1)
            .on('end', pulse);
    }
    pulse();
}

// =====================================================
// TIMELINE VISUALIZATION (3-VIEW SYSTEM)
// =====================================================

const TIMELINE_COLORS = {
    'treaty': '#3B82F6',
    'institution': '#8B5CF6',
    'declaration': '#10B981',
    'event': '#F59E0B',
    'charter': '#EF4444',
    'historical': '#6B7280'
};

const DEFAULT_ERAS = [
    { id: 'origins', name: 'Origins', start: 1215, end: 1944, color: '#6B7280', description: 'Historical foundations of human rights concepts' },
    { id: 'foundation', name: 'Foundation Era', start: 1945, end: 1966, color: '#3B82F6', description: 'Post-WWII establishment of international human rights framework' },
    { id: 'expansion', name: 'Expansion Era', start: 1966, end: 1990, color: '#10B981', description: 'Development of specialized treaties and regional systems' },
    { id: 'postcold', name: 'Post-Cold War', start: 1990, end: 2006, color: '#8B5CF6', description: 'Vienna Conference, new institutions, and global expansion' },
    { id: 'modern', name: 'Modern Era', start: 2006, end: 2030, color: '#F59E0B', description: 'Human Rights Council, new treaties, and contemporary challenges' }
];

function initTimeline() {
    const events = App.data.timelineEvents;
    if (!events || !events.length) return;
    
    // Get eras from metadata or use defaults
    const eras = App.data.timelineMetadata?.eras || DEFAULT_ERAS;
    
    // Update stats
    document.getElementById('timelineEventCount').textContent = events.length;
    document.getElementById('timelineEraCount').textContent = eras.length;
    
    // Setup view toggle
    setupTimelineViewToggle();
    
    // Initialize with eras view (default)
    renderErasView(events, eras);
    
    // Setup filters
    setupTimelineFilters();
}

function setupTimelineViewToggle() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            
            // Update active button
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update state
            App.state.timeline.viewMode = view;
            
            // Show/hide views
            const erasView = document.getElementById('timelineErasView');
            const zoomView = document.getElementById('timelineWrapper');
            const stackedView = document.getElementById('timelineStackedView');
            const eraQuickNav = document.getElementById('eraQuickNav');
            
            erasView.style.display = view === 'eras' ? 'grid' : 'none';
            zoomView.style.display = view === 'zoom' ? 'block' : 'none';
            stackedView.style.display = view === 'stacked' ? 'block' : 'none';
            eraQuickNav.style.display = view === 'zoom' ? 'flex' : 'none';
            
            // Render the selected view
            const events = App.data.timelineEvents;
            const eras = App.data.timelineMetadata?.eras || DEFAULT_ERAS;
            
            if (view === 'eras') {
                renderErasView(events, eras);
            } else if (view === 'zoom') {
                renderZoomTimeline(events, eras);
            } else if (view === 'stacked') {
                renderStackedView(events);
            }
            
            lucide.createIcons();
        });
    });
}

function setupTimelineFilters() {
    document.querySelectorAll('#timeline .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#timeline .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            App.state.timeline.filter = filter;
            
            // Re-render current view with filter
            const events = App.data.timelineEvents;
            const eras = App.data.timelineMetadata?.eras || DEFAULT_ERAS;
            const view = App.state.timeline.viewMode;
            
            if (view === 'eras') {
                renderErasView(events, eras);
            } else if (view === 'zoom') {
                filterZoomTimeline(filter);
            } else if (view === 'stacked') {
                renderStackedView(events);
            }
        });
    });
}

// =====================================================
// ERAS VIEW
// =====================================================

function renderErasView(events, eras) {
    const container = document.getElementById('timelineErasView');
    if (!container) return;
    
    const filter = App.state.timeline.filter;
    
    container.innerHTML = eras.map(era => {
        // Get events for this era
        let eraEvents = events.filter(e => e.year >= era.start && e.year < era.end);
        
        // Apply filter
        if (filter !== 'all') {
            eraEvents = eraEvents.filter(e => e.type === filter);
        }
        
        // Sort by year
        eraEvents.sort((a, b) => a.year - b.year);
        
        // Get highlight events for preview
        const highlightEvents = eraEvents.filter(e => e.highlight).slice(0, 3);
        const previewEvents = highlightEvents.length > 0 ? highlightEvents : eraEvents.slice(0, 3);
        
        const isExpanded = App.state.timeline.selectedEra === era.id;
        
        return `
            <div class="era-block ${isExpanded ? 'expanded' : ''}" 
                 data-era="${era.id}" 
                 style="--era-color: ${era.color}">
                <div class="era-count">${eraEvents.length}</div>
                <div class="era-header">
                    <div class="era-name">${era.name}</div>
                    <div class="era-years">${era.start} – ${era.end === 2030 ? 'Present' : era.end}</div>
                </div>
                <div class="era-description">${era.description || ''}</div>
                <div class="era-events-preview">
                    ${previewEvents.map(e => `<span class="era-event-tag">${e.title}</span>`).join('')}
                    ${eraEvents.length > 3 ? `<span class="era-event-tag">+${eraEvents.length - 3} more</span>` : ''}
                </div>
                <div class="era-expand-hint">
                    <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}"></i>
                    ${isExpanded ? 'Collapse' : 'Click to expand'}
                </div>
                ${isExpanded ? renderEraEventsList(eraEvents) : ''}
            </div>
        `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.era-block').forEach(block => {
        block.addEventListener('click', (e) => {
            // Don't toggle if clicking on an event card
            if (e.target.closest('.era-event-card')) return;
            
            const eraId = block.dataset.era;
            
            if (App.state.timeline.selectedEra === eraId) {
                App.state.timeline.selectedEra = null;
            } else {
                App.state.timeline.selectedEra = eraId;
            }
            
            renderErasView(events, eras);
            lucide.createIcons();
        });
    });
    
    // Add event card click handlers
    container.querySelectorAll('.era-event-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const eventId = card.dataset.eventId;
            const event = events.find(ev => ev.id === eventId);
            if (event) showTimelineDetail(event);
        });
    });
    
    lucide.createIcons();
}

function renderEraEventsList(eraEvents) {
    return `
        <div class="era-events-list">
            ${eraEvents.map(event => `
                <div class="era-event-card" 
                     data-event-id="${event.id}"
                     style="--event-type-color: ${TIMELINE_COLORS[event.type] || '#6B7280'}">
                    <div class="era-event-year">${event.year}</div>
                    <div class="era-event-title">${event.title}</div>
                    <div class="era-event-type">${event.type}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// =====================================================
// ZOOM TIMELINE VIEW
// =====================================================

function renderZoomTimeline(events, eras) {
    const container = document.getElementById('timelineWrapper');
    if (!container) return;
    
    // Sort events by year
    const sortedEvents = [...events].sort((a, b) => a.year - b.year);
    
    // Setup dimensions
    const margin = { top: 100, right: 100, bottom: 100, left: 100 };
    const eventSpacing = 120;
    const width = Math.max(3000, sortedEvents.length * eventSpacing);
    const height = 600 - margin.top - margin.bottom;
    
    // Clear existing
    container.innerHTML = '';
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Time scale
    const timeExtent = d3.extent(sortedEvents, d => d.year);
    const xScale = d3.scaleLinear()
        .domain([timeExtent[0] - 20, timeExtent[1] + 20])
        .range([0, width]);
    
    // Draw era backgrounds
    eras.forEach(era => {
        const x1 = Math.max(0, xScale(era.start));
        const x2 = Math.min(width, xScale(era.end));
        if (x2 > x1) {
            svg.append('rect')
                .attr('x', x1)
                .attr('y', 0)
                .attr('width', x2 - x1)
                .attr('height', height)
                .attr('fill', era.color)
                .attr('opacity', 0.1);
            
            svg.append('text')
                .attr('x', (x1 + x2) / 2)
                .attr('y', 20)
                .attr('text-anchor', 'middle')
                .attr('font-size', '14px')
                .attr('font-weight', '600')
                .attr('fill', era.color)
                .text(era.name);
        }
    });
    
    // Draw timeline axis
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d => d)
        .tickValues(d3.range(Math.ceil(timeExtent[0] / 50) * 50, timeExtent[1] + 50, 50));
    
    svg.append('g')
        .attr('class', 'timeline-axis')
        .attr('transform', `translate(0, ${height/2})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', '14px')
        .attr('font-weight', '500');
    
    // Draw main line
    svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', height/2)
        .attr('y2', height/2)
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 4);
    
    // Calculate positions to avoid overlap
    const positions = calculateEventPositions(sortedEvents, xScale, height);
    
    // Draw events
    const eventGroups = svg.selectAll('g.timeline-event')
        .data(sortedEvents)
        .enter()
        .append('g')
        .attr('class', d => `timeline-event ${d.type} ${d.highlight ? 'highlight' : ''}`)
        .attr('transform', (d, i) => `translate(${positions[i].x}, ${positions[i].y})`)
        .style('cursor', 'pointer');
    
    // Draw connecting lines to axis
    eventGroups.append('line')
        .attr('class', 'connector')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', (d, i) => height/2 - positions[i].y)
        .attr('stroke', d => TIMELINE_COLORS[d.type] || '#6B7280')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.4);
    
    // Draw circles
    eventGroups.append('circle')
        .attr('class', 'event-circle')
        .attr('r', d => d.highlight ? 18 : 14)
        .attr('fill', d => TIMELINE_COLORS[d.type] || '#6B7280')
        .attr('stroke', 'white')
        .attr('stroke-width', 3)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
    
    // Draw year inside circle
    eventGroups.append('text')
        .attr('class', 'event-year-inside')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('fill', 'white')
        .text(d => d.year);
    
    // Draw labels with background
    const labelGroups = eventGroups.append('g')
        .attr('class', 'label-group')
        .attr('transform', (d, i) => `translate(0, ${positions[i].y < height/2 ? -25 : 25})`);
    
    labelGroups.append('rect')
        .attr('class', 'label-bg')
        .attr('x', -60)
        .attr('y', -12)
        .attr('width', 120)
        .attr('height', 24)
        .attr('rx', 4)
        .attr('fill', 'white')
        .attr('stroke', d => TIMELINE_COLORS[d.type] || '#6B7280')
        .attr('stroke-width', 1)
        .attr('opacity', 0.95);
    
    labelGroups.append('text')
        .attr('class', 'event-label')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#1f2937')
        .text(d => truncateText(d.title, 18));
    
    // Add interactions
    eventGroups
        .on('mouseenter', function(event, d) {
            d3.select(this).select('.event-circle')
                .transition().duration(150)
                .attr('r', d.highlight ? 22 : 18);
            showTimelineTooltip(event, d, TIMELINE_COLORS[d.type]);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', function(event, d) {
            d3.select(this).select('.event-circle')
                .transition().duration(150)
                .attr('r', d.highlight ? 18 : 14);
            hideTimelineTooltip();
        })
        .on('click', function(event, d) {
            event.stopPropagation();
            showTimelineDetail(d);
        });
    
    // Setup zoom controls
    setupTimelineZoom(container, svg);
    
    // Setup era quick nav
    setupEraQuickNav(container, xScale);
    
    // Scroll to 1945 initially
    setTimeout(() => {
        const scrollTo = xScale(1940) - container.clientWidth / 3;
        container.scrollLeft = Math.max(0, scrollTo);
    }, 100);
    
    // Apply current filter
    filterZoomTimeline(App.state.timeline.filter);
}

function setupEraQuickNav(container, xScale) {
    document.querySelectorAll('.era-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const start = parseInt(btn.dataset.start);
            const scrollTo = xScale(start) - 100;
            container.scrollTo({ left: Math.max(0, scrollTo), behavior: 'smooth' });
            
            document.querySelectorAll('.era-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function filterZoomTimeline(filter) {
    d3.selectAll('.timeline-event')
        .transition()
        .duration(300)
        .style('opacity', d => {
            if (filter === 'all') return 1;
            return d.type === filter ? 1 : 0.15;
        });
}

// =====================================================
// STACKED TRACKS VIEW
// =====================================================

function renderStackedView(events) {
    const container = document.getElementById('timelineStackedView');
    if (!container) return;
    
    const filter = App.state.timeline.filter;
    
    // Group events by type
    const tracks = [
        { type: 'treaty', label: 'Treaties', color: TIMELINE_COLORS.treaty },
        { type: 'institution', label: 'Institutions', color: TIMELINE_COLORS.institution },
        { type: 'declaration', label: 'Declarations', color: TIMELINE_COLORS.declaration },
        { type: 'event', label: 'Events', color: TIMELINE_COLORS.event },
        { type: 'charter', label: 'Charters', color: TIMELINE_COLORS.charter },
        { type: 'historical', label: 'Historical', color: TIMELINE_COLORS.historical }
    ];
    
    // Calculate time scale
    const timeExtent = d3.extent(events, d => d.year);
    const width = 2000;
    const xScale = d3.scaleLinear()
        .domain([timeExtent[0] - 20, timeExtent[1] + 20])
        .range([50, width - 50]);
    
    container.innerHTML = `
        <div class="stacked-tracks-container" style="overflow-x: auto;">
            ${tracks.map(track => {
                const trackEvents = events.filter(e => e.type === track.type);
                if (trackEvents.length === 0) return '';
                
                const isFiltered = filter !== 'all' && filter !== track.type;
                
                return `
                    <div class="stacked-track" style="--track-color: ${track.color}; opacity: ${isFiltered ? 0.3 : 1}">
                        <div class="stacked-track-label">${track.label} (${trackEvents.length})</div>
                        <div class="stacked-track-line" style="min-width: ${width}px;">
                            <div class="stacked-track-axis"></div>
                            ${trackEvents.map(event => `
                                <div class="stacked-event ${event.highlight ? 'highlight' : ''}" 
                                     data-event-id="${event.id}"
                                     style="left: ${xScale(event.year)}px;"
                                     title="${event.year}: ${event.title}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
            
            <!-- Time axis -->
            <div class="stacked-axis" style="min-width: ${width}px; padding: 10px 0; display: flex; justify-content: space-between;">
                ${d3.range(Math.ceil(timeExtent[0] / 50) * 50, timeExtent[1] + 50, 50).map(year => `
                    <span style="font-size: 12px; color: var(--text-muted); position: absolute; left: ${xScale(year)}px;">${year}</span>
                `).join('')}
            </div>
        </div>
    `;
    
    // Add click handlers
    container.querySelectorAll('.stacked-event').forEach(el => {
        el.addEventListener('click', () => {
            const eventId = el.dataset.eventId;
            const event = events.find(e => e.id === eventId);
            if (event) showTimelineDetail(event);
        });
    });
}

// =====================================================
// TIMELINE HELPER FUNCTIONS
// =====================================================

function calculateEventPositions(events, xScale, height) {
    const positions = [];
    const usedPositions = [];
    const minDistance = 100;
    
    events.forEach((event, i) => {
        const x = xScale(event.year);
        let y;
        let level = 0;
        
        // Find a y position that doesn't overlap
        const baseOffset = 100;
        const levelHeight = 60;
        
        // Alternate above/below axis
        const above = i % 2 === 0;
        
        // Check for overlaps and adjust level
        for (let l = 0; l < 3; l++) {
            y = above ? height/2 - baseOffset - (l * levelHeight) : height/2 + baseOffset + (l * levelHeight);
            
            const hasOverlap = usedPositions.some(pos => {
                return Math.abs(pos.x - x) < minDistance && Math.abs(pos.y - y) < 40;
            });
            
            if (!hasOverlap) break;
            level++;
        }
        
        positions.push({ x, y });
        usedPositions.push({ x, y });
    });
    
    return positions;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 2) + '...';
}

let timelineTooltip = null;

function showTimelineTooltip(event, data, color) {
    if (!timelineTooltip) {
        timelineTooltip = document.createElement('div');
        timelineTooltip.className = 'timeline-tooltip';
        document.body.appendChild(timelineTooltip);
    }
    
    timelineTooltip.innerHTML = `
        <div class="tt-header" style="border-left: 4px solid ${color}">
            <span class="tt-year">${data.year}</span>
            <span class="tt-type">${data.type}</span>
        </div>
        <div class="tt-title">${data.title}</div>
        <div class="tt-desc">${data.description || ''}</div>
        <div class="tt-action">Click for details →</div>
    `;
    
    timelineTooltip.style.display = 'block';
    updateTooltipPosition(event);
}

function updateTooltipPosition(event) {
    if (!timelineTooltip) return;
    
    const x = event.pageX + 15;
    const y = event.pageY - 10;
    
    // Keep tooltip in viewport
    const rect = timelineTooltip.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 20;
    const maxY = window.innerHeight - rect.height - 20;
    
    timelineTooltip.style.left = Math.min(x, maxX) + 'px';
    timelineTooltip.style.top = Math.min(y, maxY) + 'px';
}

function hideTimelineTooltip() {
    if (timelineTooltip) {
        timelineTooltip.style.display = 'none';
    }
}

function filterTimeline(filter) {
    App.state.timeline.filter = filter;
    
    d3.selectAll('.timeline-event')
        .transition()
        .duration(300)
        .style('opacity', d => {
            if (filter === 'all') return 1;
            return d.type === filter ? 1 : 0.15;
        });
}

function setupTimelineZoom(container, svg) {
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const zoomReset = document.getElementById('zoomReset');
    const zoomLevel = document.querySelector('.zoom-level');
    
    zoomIn?.addEventListener('click', () => {
        App.state.timeline.zoom = Math.min(App.state.timeline.zoom * 1.2, 3);
        updateTimelineZoom();
    });
    
    zoomOut?.addEventListener('click', () => {
        App.state.timeline.zoom = Math.max(App.state.timeline.zoom / 1.2, 0.5);
        updateTimelineZoom();
    });
    
    zoomReset?.addEventListener('click', () => {
        App.state.timeline.zoom = 1;
        updateTimelineZoom();
    });
    
    function updateTimelineZoom() {
        const zoom = App.state.timeline.zoom;
        const svgEl = container.querySelector('svg');
        if (svgEl) {
            svgEl.style.transform = `scale(${zoom})`;
            svgEl.style.transformOrigin = 'left center';
        }
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(zoom * 100) + '%';
        }
    }
}

function showTimelineDetail(event) {
    const colorScale = {
        'treaty': '#3B82F6',
        'institution': '#8B5CF6',
        'declaration': '#10B981',
        'event': '#F59E0B',
        'charter': '#EF4444',
        'historical': '#6B7280'
    };
    
    const color = colorScale[event.type] || '#6B7280';
    
    const content = `
        <div class="timeline-detail-modal">
            <div class="tdm-header" style="background: linear-gradient(135deg, ${color}, ${color}dd)">
                <div class="tdm-year">${event.year}</div>
                <div class="tdm-type">${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</div>
            </div>
            <div class="tdm-body">
                <h2 class="tdm-title">${event.title}</h2>
                <p class="tdm-description">${event.description || 'No description available.'}</p>
                
                ${event.significance ? `
                    <div class="tdm-section">
                        <h4><i data-lucide="star"></i> Historical Significance</h4>
                        <p>${event.significance}</p>
                    </div>
                ` : ''}
                
                ${event.system ? `
                    <div class="tdm-badge">
                        <span class="badge badge-${event.system}">${event.system.replace('-', ' ').toUpperCase()}</span>
                    </div>
                ` : ''}
                
                <div class="tdm-actions">
                    ${event.relatedId ? `
                        <button class="btn btn-primary" onclick="navigateToRelated('${event.relatedId}')">
                            <i data-lucide="external-link"></i>
                            View Full Details
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
        <style>
            .timeline-detail-modal { max-width: 500px; }
            .tdm-header { padding: 24px; color: white; border-radius: 12px 12px 0 0; }
            .tdm-year { font-size: 3rem; font-weight: 800; line-height: 1; }
            .tdm-type { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin-top: 8px; }
            .tdm-body { padding: 24px; }
            .tdm-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 16px; color: var(--text-primary); }
            .tdm-description { color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px; }
            .tdm-section { background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px; }
            .tdm-section h4 { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
            .tdm-section h4 svg { width: 16px; height: 16px; }
            .tdm-section p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; }
            .tdm-badge { margin-bottom: 20px; }
            .tdm-badge .badge { padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
            .badge-un { background: #dbeafe; color: #1e40af; }
            .badge-european { background: #ede9fe; color: #5b21b6; }
            .badge-inter-american { background: #d1fae5; color: #065f46; }
            .badge-african { background: #ffedd5; color: #9a3412; }
            .tdm-actions { display: flex; gap: 12px; margin-top: 20px; }
            .tdm-actions .btn { flex: 1; }
        </style>
    `;
    openModal(content);
    lucide.createIcons();
}

// =====================================================
// SPIDER WEB VISUALIZATION
// =====================================================

function initSpiderWeb() {
    const container = document.getElementById('webContainer');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 600;
    
    // Clear existing
    container.innerHTML = '';
    
    // Prepare nodes from treaties and institutions
    const nodes = [];
    const nodeMap = new Map();
    
    // Add institutions as nodes
    App.data.institutions.forEach(inst => {
        const node = {
            id: inst.id,
            label: inst.shortName || inst.name,
            fullName: inst.name,
            type: inst.type,
            system: inst.system,
            color: inst.color || getSystemColor(inst.system),
            data: inst
        };
        nodes.push(node);
        nodeMap.set(inst.id, node);
    });
    
    // Add treaties as nodes
    App.data.treaties.forEach(treaty => {
        if (!nodeMap.has(treaty.id)) {
            const node = {
                id: treaty.id,
                label: treaty.shortName || treaty.id.toUpperCase(),
                fullName: treaty.fullName,
                type: 'treaty',
                system: treaty.system,
                color: treaty.color || getSystemColor(treaty.system),
                data: treaty
            };
            nodes.push(node);
            nodeMap.set(treaty.id, node);
        }
    });
    
    // Prepare links
    const links = App.data.connections
        .filter(conn => nodeMap.has(conn.source) && nodeMap.has(conn.target))
        .map(conn => ({
            source: conn.source,
            target: conn.target,
            type: conn.type,
            strength: conn.strength || 0.5
        }));
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Add zoom behavior
    const g = svg.append('g');
    
    const zoom = d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(d => d.strength * 0.3))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(50));
    
    // Draw links
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke-width', d => Math.max(1, d.strength * 3));
    
    // Draw nodes
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));
    
    // Draw shapes based on type
    node.each(function(d) {
        const el = d3.select(this);
        const size = getNodeSize(d.type);
        
        switch(d.type) {
            case 'organization':
                // Hexagon
                el.append('polygon')
                    .attr('points', hexagonPoints(size))
                    .attr('fill', d.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
                break;
            case 'court':
                // Triangle
                el.append('polygon')
                    .attr('points', trianglePoints(size))
                    .attr('fill', d.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
                break;
            case 'treaty-body':
            case 'commission':
            case 'agency':
            case 'subsidiary-body':
            case 'principal-organ':
                // Square
                el.append('rect')
                    .attr('x', -size/2)
                    .attr('y', -size/2)
                    .attr('width', size)
                    .attr('height', size)
                    .attr('rx', 4)
                    .attr('fill', d.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
                break;
            case 'mechanism':
                // Diamond
                el.append('rect')
                    .attr('x', -size/2)
                    .attr('y', -size/2)
                    .attr('width', size)
                    .attr('height', size)
                    .attr('transform', 'rotate(45)')
                    .attr('fill', d.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
                break;
            default:
                // Circle for treaties and others
                el.append('circle')
                    .attr('r', size/2)
                    .attr('fill', d.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
        }
    });
    
    // Add labels
    node.append('text')
        .attr('dy', d => getNodeSize(d.type)/2 + 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#374151')
        .text(d => d.label);
    
    // Node interactions
    node.on('mouseenter', function(event, d) {
        highlightConnections(d, nodes, links, node, link);
    })
    .on('mouseleave', function() {
        resetHighlight(node, link);
    })
    .on('click', function(event, d) {
        showNodeDetail(d);
    });
    
    // Update positions
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });
    
    // Store references for filtering
    App.webData = { nodes, links, node, link, simulation };
    
    // Setup filters
    document.querySelectorAll('#spider-web .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#spider-web .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterSpiderWeb(btn.dataset.filter);
        });
    });
    
    // Setup search
    const searchInput = document.getElementById('webSearch');
    searchInput?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        searchSpiderWeb(query);
    });
    
    // Setup reset button
    document.getElementById('resetWeb')?.addEventListener('click', () => {
        resetSpiderWeb();
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });
    
    // Drag functions
    function dragStarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragEnded(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

function getSystemColor(system) {
    const colors = {
        'un': '#3B82F6',
        'european': '#8B5CF6',
        'inter-american': '#10B981',
        'african': '#F59E0B',
        'ihl': '#EF4444'
    };
    return colors[system] || '#6B7280';
}

function getNodeSize(type) {
    const sizes = {
        'organization': 40,
        'principal-organ': 30,
        'court': 30,
        'treaty-body': 25,
        'commission': 25,
        'mechanism': 22,
        'agency': 22,
        'treaty': 28,
        'charter': 30,
        'declaration': 26
    };
    return sizes[type] || 25;
}

function hexagonPoints(size) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 30) * Math.PI / 180;
        points.push(`${size/2 * Math.cos(angle)},${size/2 * Math.sin(angle)}`);
    }
    return points.join(' ');
}

function trianglePoints(size) {
    return `0,${-size/2} ${size/2},${size/2} ${-size/2},${size/2}`;
}

function highlightConnections(d, nodes, links, nodeSelection, linkSelection) {
    const connectedIds = new Set([d.id]);
    
    links.forEach(link => {
        if (link.source.id === d.id) connectedIds.add(link.target.id);
        if (link.target.id === d.id) connectedIds.add(link.source.id);
    });
    
    nodeSelection.classed('dimmed', n => !connectedIds.has(n.id));
    nodeSelection.classed('highlighted', n => n.id === d.id);
    
    linkSelection.classed('highlighted', l => 
        l.source.id === d.id || l.target.id === d.id
    );
}

function resetHighlight(nodeSelection, linkSelection) {
    nodeSelection.classed('dimmed', false).classed('highlighted', false);
    linkSelection.classed('highlighted', false);
}

function filterSpiderWeb(filter) {
    if (!App.webData) return;
    
    const { node, link } = App.webData;
    
    node.transition().duration(300)
        .style('opacity', d => {
            if (filter === 'all') return 1;
            return d.system === filter ? 1 : 0.1;
        });
    
    link.transition().duration(300)
        .style('opacity', l => {
            if (filter === 'all') return 0.6;
            return (l.source.system === filter || l.target.system === filter) ? 0.6 : 0.05;
        });
}

function searchSpiderWeb(query) {
    if (!App.webData) return;
    
    const { node, link } = App.webData;
    
    if (!query) {
        node.style('opacity', 1);
        link.style('opacity', 0.6);
        return;
    }
    
    const matchingIds = new Set();
    App.webData.nodes.forEach(n => {
        if (n.label.toLowerCase().includes(query) || 
            n.fullName?.toLowerCase().includes(query)) {
            matchingIds.add(n.id);
        }
    });
    
    node.transition().duration(200)
        .style('opacity', d => matchingIds.has(d.id) ? 1 : 0.1);
}

function resetSpiderWeb() {
    if (!App.webData) return;
    
    const { node, link } = App.webData;
    
    node.style('opacity', 1);
    link.style('opacity', 0.6);
    
    document.getElementById('webSearch').value = '';
    
    document.querySelectorAll('#spider-web .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });
}

function showNodeDetail(d) {
    const panel = document.getElementById('webInfoPanel');
    const title = document.getElementById('infoPanelTitle');
    const content = document.getElementById('infoPanelContent');
    
    title.textContent = d.fullName || d.label;
    
    let html = '';
    
    if (d.data) {
        const data = d.data;
        
        html += `<div class="info-meta">`;
        html += `<span class="info-badge" style="background: ${d.color}20; color: ${d.color}">${d.system.toUpperCase()}</span>`;
        html += `<span class="info-type">${d.type.replace('-', ' ')}</span>`;
        html += `</div>`;
        
        if (data.description) {
            html += `<p class="info-desc">${data.description}</p>`;
        }
        
        if (data.established) {
            html += `<div class="info-item"><strong>Established:</strong> ${data.established}</div>`;
        }
        
        if (data.adopted) {
            html += `<div class="info-item"><strong>Adopted:</strong> ${data.adopted}</div>`;
        }
        
        if (data.location) {
            html += `<div class="info-item"><strong>Location:</strong> ${data.location}</div>`;
        }
        
        if (data.composition) {
            html += `<div class="info-item"><strong>Composition:</strong> ${data.composition}</div>`;
        }
        
        if (data.statesParties) {
            html += `<div class="info-item"><strong>States Parties:</strong> ${data.statesParties}</div>`;
        }
        
        if (data.significance) {
            html += `<div class="info-significance"><strong>Significance:</strong> ${data.significance}</div>`;
        }
        
        if (data.keyArticles && data.keyArticles.length > 0) {
            html += `<div class="info-articles"><strong>Key Articles:</strong><ul>`;
            data.keyArticles.slice(0, 5).forEach(art => {
                html += `<li>Art. ${art.number}: ${art.title}</li>`;
            });
            html += `</ul></div>`;
        }
    }
    
    content.innerHTML = html || '<p>No additional information available.</p>';
    
    // Add some styling
    const style = document.createElement('style');
    style.textContent = `
        .info-meta { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
        .info-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .info-type { padding: 4px 8px; background: #f3f4f6; border-radius: 4px; font-size: 11px; text-transform: capitalize; }
        .info-desc { color: #4b5563; margin-bottom: 16px; }
        .info-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .info-item strong { color: #6b7280; }
        .info-significance { margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 14px; }
        .info-articles { margin-top: 16px; }
        .info-articles ul { margin-top: 8px; padding-left: 20px; }
        .info-articles li { padding: 4px 0; font-size: 13px; }
    `;
    if (!document.getElementById('info-panel-styles')) {
        style.id = 'info-panel-styles';
        document.head.appendChild(style);
    }
}

// =====================================================
// TREATIES GRID
// =====================================================

function initTreatiesGrid() {
    const grid = document.getElementById('treatiesGrid');
    if (!grid) return;
    
    renderTreaties('all');
    
    // Setup filters
    document.querySelectorAll('#treaties .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#treaties .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTreaties(btn.dataset.filter);
        });
    });
}

function renderTreaties(filter) {
    const grid = document.getElementById('treatiesGrid');
    const treaties = App.data.treaties.filter(t => 
        filter === 'all' || t.system === filter
    );
    
    grid.innerHTML = treaties.map(treaty => `
        <div class="treaty-card" data-id="${treaty.id}">
            <div class="treaty-card-header">
                <h3>${treaty.shortName}</h3>
                <p>${treaty.fullName}</p>
            </div>
            <div class="treaty-card-body">
                <div class="treaty-meta">
                    <div class="treaty-meta-item">
                        <span>Adopted:</span>
                        <span>${treaty.adopted || 'N/A'}</span>
                    </div>
                    <div class="treaty-meta-item">
                        <span>States:</span>
                        <span>${treaty.statesParties || 'N/A'}</span>
                    </div>
                </div>
                <span class="treaty-system-badge ${treaty.system}">${treaty.system.replace('-', ' ')}</span>
                ${treaty.significance ? `<p style="margin-top: 12px; font-size: 14px; color: #6b7280;">${treaty.significance.slice(0, 120)}${treaty.significance.length > 120 ? '...' : ''}</p>` : ''}
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    grid.querySelectorAll('.treaty-card').forEach(card => {
        card.addEventListener('click', () => {
            const treaty = App.data.treaties.find(t => t.id === card.dataset.id);
            if (treaty) showTreatyDetail(treaty);
        });
    });
}

function showTreatyDetail(treaty) {
    let articlesHtml = '';
    if (treaty.keyArticles && treaty.keyArticles.length > 0) {
        articlesHtml = `
            <h4>Key Articles</h4>
            <ul class="articles-list">
                ${treaty.keyArticles.map(art => `
                    <li><strong>Article ${art.number}:</strong> ${art.title}${art.text ? ` - "${art.text}"` : ''}</li>
                `).join('')}
            </ul>
        `;
    }
    
    let protocolsHtml = '';
    if (treaty.optionalProtocols && treaty.optionalProtocols.length > 0) {
        protocolsHtml = `
            <h4>Optional Protocols</h4>
            <ul>
                ${treaty.optionalProtocols.map(p => `
                    <li><strong>${p.name}</strong> (${p.year}) - ${p.function}</li>
                `).join('')}
            </ul>
        `;
    }
    
    const content = `
        <div class="treaty-detail">
            <span class="treaty-system-badge ${treaty.system}" style="margin-bottom: 16px; display: inline-block;">
                ${treaty.system.replace('-', ' ').toUpperCase()}
            </span>
            <h2>${treaty.fullName}</h2>
            <p class="treaty-short">${treaty.shortName}</p>
            
            <div class="treaty-detail-meta">
                ${treaty.adopted ? `<div><strong>Adopted:</strong> ${treaty.adopted}</div>` : ''}
                ${treaty.enteredForce ? `<div><strong>Entered into Force:</strong> ${treaty.enteredForce}</div>` : ''}
                ${treaty.statesParties ? `<div><strong>States Parties:</strong> ${treaty.statesParties}</div>` : ''}
                ${treaty.monitoringBody ? `<div><strong>Monitoring Body:</strong> ${treaty.monitoringBody.toUpperCase()}</div>` : ''}
            </div>
            
            ${treaty.significance ? `<div class="treaty-significance"><strong>Significance:</strong> ${treaty.significance}</div>` : ''}
            
            ${articlesHtml}
            ${protocolsHtml}
        </div>
        <style>
            .treaty-detail h2 { margin-bottom: 4px; }
            .treaty-short { color: #6b7280; margin-bottom: 24px; }
            .treaty-detail-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 24px; }
            .treaty-detail-meta div { font-size: 14px; }
            .treaty-detail-meta strong { color: #6b7280; }
            .treaty-significance { padding: 16px; background: #eff6ff; border-radius: 8px; margin-bottom: 24px; }
            .treaty-detail h4 { margin: 24px 0 12px; font-size: 16px; }
            .articles-list { padding-left: 20px; }
            .articles-list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        </style>
    `;
    
    openModal(content);
}

// =====================================================
// QUIZ SYSTEM
// =====================================================

function initQuiz() {
    const startBtn = document.getElementById('startQuiz');
    const nextBtn = document.getElementById('nextQuestion');
    const skipBtn = document.getElementById('skipQuestion');
    const retakeBtn = document.getElementById('retakeQuiz');
    const reviewBtn = document.getElementById('reviewAnswers');
    
    startBtn?.addEventListener('click', startQuiz);
    nextBtn?.addEventListener('click', nextQuestion);
    skipBtn?.addEventListener('click', skipQuestion);
    retakeBtn?.addEventListener('click', resetQuiz);
    reviewBtn?.addEventListener('click', reviewAnswers);
}

function startQuiz() {
    const category = document.getElementById('quizCategory').value;
    const difficulty = document.getElementById('quizDifficulty').value;
    const count = document.getElementById('quizCount').value;
    
    // Filter questions
    let questions = App.data.quizQuestions.filter(q => {
        if (category !== 'all' && q.category !== category) return false;
        if (difficulty !== 'all' && q.difficulty !== difficulty) return false;
        return true;
    });
    
    // Shuffle
    questions = shuffleArray(questions);
    
    // Limit
    if (count !== 'all') {
        questions = questions.slice(0, parseInt(count));
    }
    
    if (questions.length === 0) {
        showToast('No questions match your criteria. Try different filters.');
        return;
    }
    
    // Setup quiz state
    App.state.quiz = {
        questions,
        currentIndex: 0,
        score: 0,
        answers: []
    };
    
    // Show quiz container
    document.getElementById('quizSetup').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('quizResults').style.display = 'none';
    
    // Show first question
    showQuestion(0);
}

function showQuestion(index) {
    const quiz = App.state.quiz;
    const question = quiz.questions[index];
    
    // Update progress
    const progress = ((index) / quiz.questions.length) * 100;
    document.getElementById('quizProgressBar').style.width = `${progress}%`;
    document.getElementById('quizProgressText').textContent = `Question ${index + 1} of ${quiz.questions.length}`;
    
    // Show question
    const questionEl = document.getElementById('quizQuestion');
    questionEl.innerHTML = `
        <span class="question-meta">${question.category.replace('-', ' ')} • ${question.difficulty}</span>
        <h3>${question.question}</h3>
    `;
    
    // Show options
    const optionsEl = document.getElementById('quizOptions');
    
    if (question.type === 'true-false') {
        optionsEl.innerHTML = `
            <button class="quiz-option" data-answer="true">True</button>
            <button class="quiz-option" data-answer="false">False</button>
        `;
    } else {
        optionsEl.innerHTML = question.options.map((opt, i) => `
            <button class="quiz-option" data-answer="${i}">${opt}</button>
        `).join('');
    }
    
    // Add click handlers
    optionsEl.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => selectAnswer(btn));
    });
    
    // Reset feedback
    document.getElementById('quizFeedback').style.display = 'none';
    document.getElementById('nextQuestion').disabled = true;
    
    // Add question meta style
    if (!document.getElementById('quiz-styles')) {
        const style = document.createElement('style');
        style.id = 'quiz-styles';
        style.textContent = `
            .question-meta { display: block; font-size: 12px; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; }
        `;
        document.head.appendChild(style);
    }
}

function selectAnswer(btn) {
    const quiz = App.state.quiz;
    const question = quiz.questions[quiz.currentIndex];
    
    // Disable all options
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.classList.add('disabled');
        opt.disabled = true;
    });
    
    // Check answer
    let isCorrect;
    const answer = btn.dataset.answer;
    
    if (question.type === 'true-false') {
        isCorrect = (answer === 'true') === question.correct;
    } else {
        isCorrect = parseInt(answer) === question.correct;
    }
    
    // Mark answer
    btn.classList.add(isCorrect ? 'correct' : 'incorrect');
    
    // Mark correct answer if wrong
    if (!isCorrect) {
        const correctAnswer = question.type === 'true-false' 
            ? question.correct.toString() 
            : question.correct.toString();
        document.querySelector(`.quiz-option[data-answer="${correctAnswer}"]`)?.classList.add('correct');
    }
    
    // Update score
    if (isCorrect) {
        quiz.score++;
    }
    
    // Store answer
    quiz.answers.push({
        question: question,
        userAnswer: answer,
        isCorrect
    });
    
    // Show feedback
    showFeedback(isCorrect, question.explanation);
    
    // Enable next button
    document.getElementById('nextQuestion').disabled = false;
}

function showFeedback(isCorrect, explanation) {
    const feedbackEl = document.getElementById('quizFeedback');
    feedbackEl.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackEl.innerHTML = `
        <div class="feedback-icon">
            ${isCorrect ? '<svg width="24" height="24" fill="white"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>' : '<svg width="24" height="24" fill="white"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg>'}
        </div>
        <p class="feedback-text">${isCorrect ? 'Correct!' : 'Incorrect'}</p>
        <p class="feedback-explanation">${explanation}</p>
    `;
    feedbackEl.style.display = 'block';
}

function nextQuestion() {
    const quiz = App.state.quiz;
    quiz.currentIndex++;
    
    if (quiz.currentIndex >= quiz.questions.length) {
        showResults();
    } else {
        showQuestion(quiz.currentIndex);
    }
}

function skipQuestion() {
    const quiz = App.state.quiz;
    
    quiz.answers.push({
        question: quiz.questions[quiz.currentIndex],
        userAnswer: null,
        isCorrect: false,
        skipped: true
    });
    
    quiz.currentIndex++;
    
    if (quiz.currentIndex >= quiz.questions.length) {
        showResults();
    } else {
        showQuestion(quiz.currentIndex);
    }
}

function showResults() {
    const quiz = App.state.quiz;
    
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('quizResults').style.display = 'block';
    
    // Update score
    document.getElementById('finalScore').textContent = quiz.score;
    document.getElementById('totalQuestions').textContent = quiz.questions.length;
    
    // Record attempt in progress
    const category = document.getElementById('quizCategory')?.value || 'all';
    Progress.recordQuizAttempt(category, quiz.score, quiz.questions.length);
    
    // Message based on score
    const percentage = (quiz.score / quiz.questions.length) * 100;
    let message;
    if (percentage >= 90) {
        message = 'Excellent! You have a strong understanding of international human rights law!';
    } else if (percentage >= 70) {
        message = 'Good job! You have a solid grasp of the material.';
    } else if (percentage >= 50) {
        message = 'Not bad! Consider reviewing the areas where you struggled.';
    } else {
        message = 'Keep studying! Review the course materials and try again.';
    }
    document.getElementById('resultsMessage').textContent = message;
    
    // Update progress display
    updateProgressStats();
}

function reviewAnswers() {
    const quiz = App.state.quiz;
    
    let content = '<div class="review-container">';
    
    quiz.answers.forEach((answer, i) => {
        const q = answer.question;
        content += `
            <div class="review-item ${answer.isCorrect ? 'correct' : 'incorrect'}">
                <div class="review-number">${i + 1}</div>
                <div class="review-content">
                    <p class="review-question">${q.question}</p>
                    <p class="review-answer">
                        ${answer.skipped ? '<em>Skipped</em>' : `Your answer: ${getAnswerText(q, answer.userAnswer)}`}
                    </p>
                    ${!answer.isCorrect ? `<p class="review-correct">Correct: ${getAnswerText(q, q.correct)}</p>` : ''}
                    <p class="review-explanation">${q.explanation}</p>
                </div>
            </div>
        `;
    });
    
    content += '</div>';
    content += `
        <style>
            .review-container { max-height: 60vh; overflow-y: auto; }
            .review-item { display: flex; gap: 16px; padding: 16px; border-radius: 8px; margin-bottom: 12px; }
            .review-item.correct { background: rgba(16, 185, 129, 0.1); }
            .review-item.incorrect { background: rgba(239, 68, 68, 0.1); }
            .review-number { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
            .review-item.correct .review-number { background: #10B981; color: white; }
            .review-item.incorrect .review-number { background: #EF4444; color: white; }
            .review-question { font-weight: 500; margin-bottom: 8px; }
            .review-answer { font-size: 14px; color: #6b7280; }
            .review-correct { font-size: 14px; color: #10B981; font-weight: 500; }
            .review-explanation { font-size: 13px; color: #9ca3af; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1); }
        </style>
    `;
    
    openModal(content);
}

function getAnswerText(question, answer) {
    if (question.type === 'true-false') {
        return answer === true || answer === 'true' ? 'True' : 'False';
    }
    return question.options[parseInt(answer)] || 'N/A';
}

function resetQuiz() {
    App.state.quiz = {
        questions: [],
        currentIndex: 0,
        score: 0,
        answers: []
    };
    
    document.getElementById('quizSetup').style.display = 'block';
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('quizResults').style.display = 'none';
}

// =====================================================
// UTILITIES
// =====================================================

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

let tooltipEl = null;

function showTooltip(event, data) {
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'tooltip';
        tooltipEl.style.cssText = `
            position: fixed;
            padding: 8px 12px;
            background: #1f2937;
            color: white;
            border-radius: 6px;
            font-size: 13px;
            pointer-events: none;
            z-index: 1000;
            max-width: 250px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(tooltipEl);
    }
    
    tooltipEl.innerHTML = `
        <strong>${data.title}</strong>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">${data.year}</div>
    `;
    
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = event.pageX + 10 + 'px';
    tooltipEl.style.top = event.pageY + 10 + 'px';
}

function hideTooltip() {
    if (tooltipEl) {
        tooltipEl.style.display = 'none';
    }
}

// Global functions for modal buttons
window.navigateToRelated = function(id) {
    closeModal();
    // Find the related item and show its detail
    const treaty = App.data.treaties.find(t => t.id === id);
    if (treaty) {
        setTimeout(() => showTreatyDetail(treaty), 300);
    }
};

// =====================================================
// GLOBAL SEARCH
// =====================================================

function setupSearch() {
    const searchInput = document.getElementById('globalSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput) return;
    
    let debounceTimer;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            return;
        }
        
        debounceTimer = setTimeout(() => {
            const results = performSearch(query);
            displaySearchResults(results, searchResults);
        }, 200);
    });
    
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length >= 2) {
            searchResults.classList.add('active');
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

function performSearch(query) {
    const results = [];
    
    // Search treaties
    App.data.treaties.forEach(treaty => {
        const searchText = `${treaty.fullName} ${treaty.shortName} ${treaty.id}`.toLowerCase();
        if (searchText.includes(query)) {
            results.push({
                type: 'treaty',
                id: treaty.id,
                title: treaty.shortName,
                subtitle: treaty.fullName,
                data: treaty
            });
        }
    });
    
    // Search institutions
    App.data.institutions.forEach(inst => {
        const searchText = `${inst.name} ${inst.shortName || ''} ${inst.id}`.toLowerCase();
        if (searchText.includes(query)) {
            results.push({
                type: 'institution',
                id: inst.id,
                title: inst.shortName || inst.name,
                subtitle: inst.name,
                data: inst
            });
        }
    });
    
    // Search timeline events
    App.data.timelineEvents.forEach(event => {
        const searchText = `${event.title} ${event.description || ''}`.toLowerCase();
        if (searchText.includes(query)) {
            results.push({
                type: 'event',
                id: event.id,
                title: event.title,
                subtitle: `${event.year} - ${event.type}`,
                data: event
            });
        }
    });
    
    return results.slice(0, 10); // Limit to 10 results
}

function displaySearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = '<div class="search-no-results">No results found</div>';
        container.classList.add('active');
        return;
    }
    
    const icons = {
        treaty: 'scroll-text',
        institution: 'building-2',
        event: 'calendar'
    };
    
    container.innerHTML = results.map(r => `
        <div class="search-result-item" data-type="${r.type}" data-id="${r.id}">
            <i data-lucide="${icons[r.type]}"></i>
            <div class="search-result-text">
                <div class="search-result-title">${r.title}</div>
                <div class="search-result-subtitle">${r.subtitle}</div>
            </div>
            <span class="search-result-type">${r.type}</span>
        </div>
    `).join('');
    
    container.classList.add('active');
    lucide.createIcons();
    
    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            const id = item.dataset.id;
            handleSearchResultClick(type, id);
            container.classList.remove('active');
            document.getElementById('globalSearch').value = '';
        });
    });
}

function handleSearchResultClick(type, id) {
    if (type === 'treaty') {
        const treaty = App.data.treaties.find(t => t.id === id);
        if (treaty) showTreatyDetail(treaty);
    } else if (type === 'institution') {
        navigateToSection('spider-web');
        setTimeout(() => {
            if (App.webData) {
                const node = App.webData.nodes.find(n => n.id === id);
                if (node) showNodeDetail(node);
            }
        }, 500);
    } else if (type === 'event') {
        navigateToSection('timeline');
        const event = App.data.timelineEvents.find(e => e.id === id);
        if (event) setTimeout(() => showTimelineDetail(event), 500);
    }
}

// =====================================================
// PROGRESS DISPLAY
// =====================================================

function initProgressDisplay() {
    updateProgressStats();
}

function updateProgressStats() {
    const stats = Progress.getStats();
    
    // Update quiz stats if elements exist
    const attemptsEl = document.getElementById('quizAttempts');
    const avgScoreEl = document.getElementById('avgScore');
    const bestScoreEl = document.getElementById('bestScore');
    
    if (attemptsEl) attemptsEl.textContent = stats.attempts;
    if (avgScoreEl) avgScoreEl.textContent = stats.avgScore + '%';
    if (bestScoreEl) bestScoreEl.textContent = stats.bestScore + '%';
    
    // Update home page stats
    const homeStatsEl = document.getElementById('homeStats');
    if (homeStatsEl && stats.attempts > 0) {
        homeStatsEl.innerHTML = `
            <div class="progress-summary">
                <h4>Your Progress</h4>
                <div class="progress-stats-grid">
                    <div class="progress-stat">
                        <span class="stat-value">${stats.attempts}</span>
                        <span class="stat-label">Quiz Attempts</span>
                    </div>
                    <div class="progress-stat">
                        <span class="stat-value">${stats.avgScore}%</span>
                        <span class="stat-label">Average Score</span>
                    </div>
                    <div class="progress-stat">
                        <span class="stat-value">${stats.bestScore}%</span>
                        <span class="stat-label">Best Score</span>
                    </div>
                    <div class="progress-stat">
                        <span class="stat-value">${App.progress.viewedTreaties.length}</span>
                        <span class="stat-label">Treaties Viewed</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// =====================================================
// KEYBOARD SHORTCUTS
// =====================================================

document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K for search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
    }
    
    // Number keys for navigation (when not in input)
    if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        const sections = ['home', 'timeline', 'spider-web', 'treaties', 'quiz', 'about'];
        const num = parseInt(e.key);
        if (num >= 1 && num <= sections.length) {
            navigateToSection(sections[num - 1]);
        }
    }
});

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

window.App = App;
window.Progress = Progress;
