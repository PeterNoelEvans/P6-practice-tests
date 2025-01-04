# P6 Exam System Documentation

## System Overview
A web-based examination system for P6 students with regular and advanced sections.

## Score Handling

### Important Note About Scoring
There are two different methods of score submission currently in use:

1. Grammar Section:
   - Sends scores as percentages (0-100)
   - Example: 15/15 correct = score: 100
   - Dashboard displays this percentage directly

2. All Other Sections (Reading, Vocabulary, Micekings):
   - Send raw scores (number of correct answers)
   - Example: 24/25 correct = score: 24
   - Dashboard converts these to percentages using: (score / totalQuestions) * 100

### Multiple-Answer Questions

Some questions allow multiple correct answers. These require special handling:

1. HTML Structure:
```html
<div class="question">
    <p>Question text (Select all that apply)</p>
    <div class="text-choices">
        <label class="text-choice">
            <input type="checkbox" name="q3" value="a">
            <span>Option A</span>
        </label>
        <!-- more options... -->
    </div>
</div>
```

2. Answer Definition:
```javascript
const correctAnswers = {
    q3: {
        answers: ['a', 'b'],  // Array of correct answers
        multipleCorrect: true,  // Flag for multiple-answer question
        explanation: 'Both answers are correct because...'
    }
};
```

3. Score Calculation:
```javascript
Object.keys(correctAnswers).forEach(question => {
    if (correctAnswers[question].multipleCorrect) {
        const selected = Array.from(document.querySelectorAll(`input[name="${question}"]:checked`))
            .map(input => input.value);
        const correctSet = new Set(correctAnswers[question].answers);
        const selectedSet = new Set(selected);
        
        // All correct answers must be selected, no extra selections
        if (correctSet.size === selectedSet.size && 
            [...correctSet].every(value => selectedSet.has(value))) {
            score++;
        }
    } else {
        // Single answer handling
        const selected = document.querySelector(`input[name="${question}"]:checked`);
        if (selected && selected.value === correctAnswers[question].answer) {
            score++;
        }
    }
});
```

### Important Notes for Multiple-Answer Questions:
- Use checkboxes (`type="checkbox"`) instead of radio buttons
- Remove the `required` attribute for multiple-answer questions
- Consider adding "(Select all that apply)" to the question text
- Score is awarded only for selecting ALL correct answers and NO incorrect ones
- The `multipleCorrect` flag must be set in `correctAnswers` object

### Implementation Details

#### Grammar Section
```javascript
const percentage = Math.round((score / Object.keys(correctAnswers).length) * 100);
fetch('/api/results', {
    body: JSON.stringify({
        sectionTitle: 'grammar',
        score: percentage,  // Sends percentage
        ...
    })
});
```

#### Other Sections
```javascript
fetch('/api/results', {
    body: JSON.stringify({
        sectionTitle: 'reading/vocabulary/micekings',
        score: score,  // Sends raw score
        totalQuestions: Object.keys(correctAnswers).length,
        ...
    })
});
```

#### Dashboard Display
```javascript
${section.id === 'grammar' 
    ? Math.round(sectionProgress.score)  // Display grammar percentage as-is
    : Math.round((sectionProgress.score / section.questions) * 100)  // Calculate percentage for others
}
```

### Future Development
To maintain consistency, any new sections should follow the "Other Sections" pattern:
- Send raw scores
- Let the dashboard handle percentage calculation
- Do not convert to percentage before submission

## Database Structure

### Collections

1. **Students**
   - _id: ObjectId
   - name: String
   - email: String
   - password: String (hashed)
   - sessions: Array of tokens

2. **Results**
   - student: ObjectId (ref: Students)
   - sections: Array of {
     - sectionTitle: String
     - score: Number
     - stage: Number
     - completed: Boolean
   }
   - overallProgress: Number

## Section Structure

### Regular Sections
1. Grammar
2. Reading
3. Vocabulary
4. Micekings

### Advanced Sections
1. Advanced Reading
   - Score format: percentage
   - Database key: `advancedreading`

2. Advanced Vocabulary
   - Score format: percentage
   - Database key: `advancedvocabulary`

3. Advanced Grammar
   - Score format: percentage
   - Database key: `advancedgrammar`

4. Advanced Writing
   - Score format: percentage
   - Database key: `advancedwriting`

## API Endpoints

### Authentication
- POST `/api/login` - Student login
- POST `/api/register` - New student registration
- POST `/api/logout` - Student logout

### Progress
- GET `/api/student/progress` - Get student's progress
- POST `/api/results` - Submit section results

### Sections
- POST `/api/section/start` - Start a new section
- POST `/api/reset-section` - Reset a specific section

## Frontend Structure

### Main Pages
1. `/login.html` - Login page
2. `/dashboard.html` - Main dashboard
3. `/advanced-dashboard.html` - Advanced sections dashboard

### Section Pages
Located in `/sections/`:
- `/regular/[section].html`
- `/advanced/[section].html`

## Score Indicators

### Colors
- High (≥80%): Green (#28a745)
- Medium (60-79%): Yellow (#ffc107)
- Low (<60%): Red (#dc3545)
- Not Attempted: Gray (#6c757d)

### Progress Calculation
- Total sections: 7 (4 regular + 3 advanced)
- Progress = (completed sections / total sections) * 100

## Local Development

### Environment Variables
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/p6exam
JWT_SECRET=your_jwt_secret_key_here
SSL_KEY_PATH=ssl/private.key
SSL_CERT_PATH=ssl/certificate.pem
```

### Starting the System
1. Start MongoDB
2. Run `npm install`
3. Run `npm start`

## Common Issues & Solutions

1. **MongoDB Connection**
   - Check if MongoDB is running
   - Verify connection string
   - Check port availability

2. **Score Not Updating**
   - Verify section keys match database format
   - Check API response format
   - Verify JWT token validity

3. **Section Access**
   - Ensure proper authentication
   - Check section prerequisites
   - Verify URL format 

## Question Structure

### Advanced Vocabulary Section
- 11 questions total
- Question types:
  1. Image choices (Q1-2)
  2. Single image with text choices (Q3-7)
  3. Paired questions sharing images (Q8-9, Q10-11)
- Score calculation: (correct answers / total questions) * 100

### Advanced Reading Section
- Multiple passages with comprehension questions
- Question types:
  1. Text-based MCQ
  2. Inference questions
  3. Vocabulary in context

## Data Flow Examples

### Submitting Quiz Results
```javascript
// Example API call
fetch('/api/results', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        sectionTitle: 'advancedvocabulary',
        score: percentage,
        timeSpent,
        totalQuestions: 11,
        answers: results
    })
});
```

### Score Display Logic
```javascript
function updateScoreIndicator(score) {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
}
```

## File Structure
```
project/
├── public/
│   ├── sections/
│   │   ├── advanced/
│   │   │   ├── vocabulary.html
│   │   │   ├── reading.html
│   │   │   └── ...
│   │   └── regular/
│   ├── dashboard.html
│   └── advanced-dashboard.html
├── models/
│   ├── Student.js
│   ├── Result.js
│   └── Quiz.js
├── middleware/
│   └── auth.js
└── server.js
```

## Security Considerations

### Authentication
- JWT-based authentication
- Token expiration: 24 hours
- Secure routes with auth middleware

### Data Validation
- Server-side validation of all inputs
- Sanitize HTML content
- Prevent duplicate submissions

## Development Tips

### Debugging Common Issues
1. Check browser console for errors
2. Verify MongoDB connection status
3. Validate JWT token in localStorage
4. Check section key formatting

### Testing Checklist
- [ ] User authentication flow
- [ ] Section completion tracking
- [ ] Score calculation accuracy
- [ ] Progress updates
- [ ] Error handling 

## Recent Updates and Solutions

### Authentication and Token Handling
- Use `credentials: 'include'` in fetch requests
- Implement token refresh mechanism
- Handle 401 errors gracefully with user feedback
- Store tokens securely in localStorage

### Question Design Best Practices
- Distribute correct answers evenly across options (a-f)
- Include clear explanations for each answer
- Group questions by topic/concept
- Use consistent formatting for options

```javascript
const correctAnswers = {
    q1: { answer: 'c', explanation: '...' },
    q2: { answer: 'e', explanation: '...' },
    q3: { answer: 'a', explanation: '...' },
    // Distribute answers across a-f
};
```

### Error Prevention & Recovery
- Check element existence before access
- Handle network failures gracefully
- Provide clear user feedback
- Implement auto-save where possible

### Section Organization
- Group related questions together
- Use consistent HTML structure
- Maintain clear visual hierarchy

```html
<div class="question-group">
    <h3>Topic Title</h3>
    <div class="question">
        <p>Question text</p>
        <div class="text-choices">
            <!-- choices -->
        </div>
    </div>
</div>
```

### Performance Optimization
- Load questions in groups
- Optimize DOM operations
- Use efficient selectors
- Implement lazy loading where appropriate

### User Experience Guidelines
- Show clear progress indicators
- Provide immediate feedback
- Enable keyboard navigation
- Maintain consistent styling

```javascript
// Example token refresh implementation
async function refreshToken(authToken) {
    try {
        const refreshResponse = await fetch('/api/refresh-token', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + authToken
            },
            credentials: 'include'
        });
        if (refreshResponse.ok) {
            const newToken = await refreshResponse.json();
            localStorage.setItem('authToken', newToken.token);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}
```

### Section Naming Conventions
- Use base section names in API calls (e.g., 'grammar' not 'advancedgrammar')
- Server handles 'advanced' prefix based on route
- Maintain consistency across all sections

```javascript
// Example form submission pattern
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
        // submission logic
    } catch (error) {
        console.error('Error:', error);
        alert('Submission failed. Please try again.');
    } finally {
        submitButton.disabled = false;
    }
});
```

### Timer Implementation
- Use global scope for timer variables
- Clear timer on form submission
- Handle page reload/navigation

```javascript
let startTime;
let timerInterval;

function updateTimer() {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    document.getElementById('timer').textContent = 
        `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Clear timer when needed
function cleanup() {
    clearInterval(timerInterval);
}
```

### Results Display
- Show detailed feedback for each question
- Include explanations for correct answers
- Use consistent styling across sections
- Implement smooth scrolling to results

## Original Content Continues Below... 