# International Protection of Human Rights - Visual Learning Platform

An interactive educational website for FDV Ljubljana students studying international human rights law under Prof. Petra Roter.

## 🎯 Features

### Interactive Timeline
- Horizontal scrollable timeline from 1215 (Magna Carta) to present
- Color-coded by type: treaties, institutions, declarations, events
- Filter and zoom controls
- Click events for detailed information

### Systems Map (Spider Web Visualization)
- D3.js force-directed graph showing interconnections
- Nodes represent treaties, institutions, and mechanisms
- Different shapes by type (hexagon=organization, circle=treaty, square=body, triangle=court)
- Color-coded by system (UN blue, European purple, Americas green, African orange)
- Interactive drag, hover, and click functionality

### Treaties Explorer
- Grid view of all core human rights treaties
- Filter by regional system
- Detailed modal view with key articles and optional protocols

### Quiz System
- 150+ questions across all categories and difficulty levels
- Multiple choice and true/false formats
- Immediate feedback with explanations
- Progress tracking with localStorage

### Additional Features
- 🌙 Dark/light theme toggle
- 🔍 Global search (Ctrl/Cmd + K)
- ⌨️ Keyboard shortcuts (1-6 for navigation)
- 📊 Progress tracking with quiz history
- 📱 Responsive design

## 🛠️ Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, flexbox, grid
- **JavaScript ES6+** - Vanilla JS, no framework
- **D3.js v7** - Data visualizations
- **Lucide Icons** - Modern icon library

## 📁 Project Structure

```
MVCPweb/
├── index.html              # Main single-page application
├── css/
│   └── main.css           # All styles (1800+ lines)
├── js/
│   └── app.js             # Application logic (1700+ lines)
├── data/
│   ├── treaties.json      # Core human rights treaties
│   ├── institutions.json  # Institutions and bodies
│   ├── connections.json   # Relationship mappings
│   ├── timeline-events.json # Historical milestones
│   └── quiz-questions.json  # 150+ quiz questions
└── README.md
```

## 🚀 Getting Started

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/IPHRroter.git
cd IPHRroter
```

2. Start a local server:
```bash
python3 -m http.server 8080
# or
npx serve
```

3. Open http://localhost:8080 in your browser

### Deployment

The site is static and can be deployed to any hosting service:
- GitHub Pages
- Netlify
- Vercel
- Any static file server

## 📚 Content Coverage

### UN System
- UN Charter and principal organs
- Universal Declaration of Human Rights
- 9 Core Treaties (ICCPR, ICESCR, ICERD, CEDAW, CAT, CRC, ICRMW, CRPD, ICPPED)
- Treaty bodies and monitoring mechanisms
- Human Rights Council and UPR
- Special Procedures

### Regional Systems
- **European**: Council of Europe, ECHR, ECtHR, EU Charter
- **Inter-American**: OAS, American Convention, IACtHR, IACHR
- **African**: AU, Banjul Charter, African Court and Commission

### Key Concepts
- Generations of rights (Vasak framework)
- Hard law vs. soft law
- Jus cogens and erga omnes
- Margin of appreciation
- Positive obligations
- Progressive realization

## 🎓 Educational Context

This platform was created for the course "International Protection of Human Rights" at the Faculty of Social Sciences (FDV), University of Ljubljana.

## 📄 License

Educational use. Content based on publicly available international human rights documents and treaties.

## 🤝 Contributing

Contributions welcome! Please feel free to submit pull requests for:
- Additional quiz questions
- New timeline events
- Bug fixes
- UI improvements
- Accessibility enhancements

---

Made with ❤️ for FDV Ljubljana students
