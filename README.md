# ReVisor

A Google Apps Script web application that helps teachers understand student writing processes through intelligent revision history analysis and playback.

## What It Does

ReVisor transforms Google Docs revision history into actionable insights about student learning. Rather than simply detecting plagiarism, it reveals the *process* of writing - showing teachers when students are genuinely developing ideas versus taking shortcuts.

### Key Features

- **Intelligent Dashboard**: Batch analyze entire folders of student submissions with color-coded concern indicators (🟢 🟡 🟠 🔴)
- **Revision Playback**: Watch documents evolve over time with adjustable speed controls and visual diffs
- **Pattern Detection**: Automatically flags concerning patterns like large paste events, voice shifts, and suspicious timing
- **AI Analysis**: Gemini-powered style and voice consistency analysis with contextual interpretation
- **Collaboration Visualization**: Color-coded author identification for group projects
- **Educational Framing**: Generates "questions to ask the student" rather than accusatory reports

## Why This Exists

Writing is thinking made visible. This tool helps teachers:
- Understand *how* students developed their work, not just what they submitted
- Identify students who need writing process support
- Have informed, evidence-based conversations about academic integrity
- Celebrate genuine intellectual growth and revision

## Installation & Setup

### For Teachers (Users)

1. Click this link: [ReVisor Web App](#) _(insert your deployment URL)_
2. Authorize access to your Google Drive (read-only)
3. Select a folder containing student Google Docs
4. Start analyzing!

No installation required. Works with any Google Workspace account.

### For Developers (Self-Hosting)

**Prerequisites:**
- Node.js installed
- Google Cloud Project with Drive API and Gemini API enabled
- Google Workspace account

**Setup:**
```bash
# Install CLASP
npm install -g @google/clasp

# Clone this repository
git clone [your-repo-url]
cd learning-evidence-analyzer

# Login to Google
clasp login

# Create new Apps Script project
clasp create --type standalone --title "ReVisor"

# Push code to Apps Script
clasp push

# Deploy as web app
clasp deploy --description "Initial deployment"
```

**Configuration:**

1. Open the script in Apps Script editor: `clasp open`
2. Go to Project Settings → Add OAuth Scopes:
```
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/script.external_request
```
3. Enable Advanced Services: Drive API
4. Deploy as web app:
   - Execute as: Me
   - Who has access: Anyone
5. Copy the web app URL

## How It Works

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│  Web App Frontend (HTML/CSS/JS)                         │
│  - Folder/Doc Selection UI                              │
│  - Dashboard with Batch Analysis                        │
│  - Revision Playback Interface                          │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│  Google Apps Script Backend                             │
│  ├─ DriveService.gs: Revision History Retrieval         │
│  ├─ AnalysisEngine.gs: Pattern Detection                │
│  ├─ GeminiService.gs: AI Style/Voice Analysis           │
│  └─ Code.gs: Orchestration & Web App Serving            │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │                           │
┌───────▼──────┐            ┌──────▼────────┐
│  Drive API   │            │  Gemini API   │
│  (Revisions) │            │  (Analysis)   │
└──────────────┘            └───────────────┘
```

### Analysis Metrics

**Automatically Detected Patterns:**
- Large paste events (500+ words in single revision)
- Style/voice inconsistency across revisions
- Suspicious timing patterns (bulk work at unusual hours)
- Structural reorganization without drafting
- Citation patterns (appearing before/after body text)

**Gemini AI Enhancement:**
- Voice consistency scoring across document sections
- Vocabulary sophistication matching to student's typical writing
- Contextual interpretation of flagged patterns
- Suggestion generation for teacher-student conversations

### Color Coding System

- 🟢 **Green**: Normal revision patterns, evidence of iterative work
- 🟡 **Yellow**: Minor patterns worth noting, possible to explain
- 🟠 **Orange**: Multiple concerning patterns, warrants conversation
- 🔴 **Red**: Significant concerns, strong evidence of shortcuts

## Privacy & Ethics

### Design Principles
- **Transparency over surveillance**: Students should know their process is visible
- **Evidence for conversation, not accusation**: Generates questions, not verdicts
- **Teacher judgment remains central**: AI flags patterns, humans interpret context
- **Read-only access**: Never modifies student documents

### Data Handling
- No revision history data is stored permanently
- Analysis happens in real-time per teacher request
- OAuth tokens are user-controlled and revocable
- No student data leaves Google's infrastructure

### Recommended Use
- Discuss with students upfront that writing process matters
- Use findings to support struggling writers, not just catch cheaters
- Consider neurodivergent work patterns (hyperfocus, non-linear drafting)
- Investigate concerning patterns through conversation, not assumption

## Contributing

This project is designed for maximum portability and community contribution. It's not "owned" by any individual - it's a tool for educators, by educators.

**Ways to contribute:**
- Test with real student work and report edge cases
- Improve the Gemini prompt engineering for better analysis
- Enhance the playback UI/UX
- Add new pattern detection algorithms
- Translate interface to other languages
- Document case studies and effective use patterns

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Roadmap

- [ ] Batch export to PDF with analysis summaries
- [ ] Student-facing "process portfolio" view
- [ ] Integration with Canvas/Schoology LMS
- [ ] Multi-language support
- [ ] Comparison mode (student's doc vs. known-good exemplar)
- [ ] Convert to official Google Workspace Add-on (if demand warrants)

## License

MIT License - see [LICENSE](LICENSE) for details.

Built with ❤️ for teachers who believe learning is a process, not just a product.

## Credits

Created by Sean Beaverson ([ @seanbeaverson](#)) as part of the ai4mn initiative to help educators navigate AI integration thoughtfully.

Special thanks to the teachers who tested early versions and helped shape the ethical framework.

## Support

- **Bug reports**: Open an issue on GitHub
- **Feature requests**: Start a discussion
- **Questions**: Email sean @treoir.education _(or your preferred contact)_
- **Community**: Join the ai4mn Slack workspace

---

*"The evidence of learning lives in revision history. Let's make it visible."*