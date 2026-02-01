let config = null;
let userAnswers = {};

const GRADE_COLORS = {
    'A': '#00a651',
    'B': '#50b948',
    'C': '#b6cb18',
    'D': '#fcb31a',
    'E': '#f58220',
    'F': '#ee3124'
};

const GRADE_LABELS = {
    'A': 'Excellent',
    'B': 'Very Good',
    'C': 'Good',
    'D': 'Fair',
    'E': 'Poor',
    'F': 'Very Poor'
};

const GRADE_WIDTHS = {
    'A': '20%',
    'B': '30%',
    'C': '40%',
    'D': '50%',
    'E': '60%',
    'F': '70%'
};

const TRIANGLE_SIZE = 10;

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];

async function loadConfig() {
    try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const version = params.get('v') || '1';
        
        const response = await fetch(`configs/v${version}.json`);
        if (!response.ok) {
            throw new Error(`Configuration version ${version} not found`);
        }
        
        config = await response.json();
        
        // Ensure version is set in config
        if (!config.version) config.version = version;
        
        initializeApp();
    } catch (error) {
        console.error('Error loading config:', error);
        showError('Failed to load assessment configuration. Please check the URL or refresh the page.');
    }
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').textContent = message;
    document.getElementById('error').style.display = 'block';
}

function initializeApp() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    document.getElementById('page-title').textContent = config.title;
    document.getElementById('assessment-description').textContent = config.description;

    renderExampleLabel('A');
    renderQuestions();

    parseUrlHash();

    document.getElementById('submit-btn').addEventListener('click', handleSubmit);
    document.getElementById('share-btn').addEventListener('click', shareResult);
    document.getElementById('reset-btn').addEventListener('click', resetAssessment);
}

function renderExampleLabel(grade) {
    const container = document.getElementById('example-label');
    container.innerHTML = createLabelHTML(grade);
}

function renderQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    config.questions.forEach((question, index) => {
        const questionEl = document.createElement('div');
        questionEl.className = 'question-item';
        questionEl.innerHTML = `
            <div class="question-text">${index + 1}. ${question.text}</div>
            <div class="question-weight">Weight: ${question.weight}%</div>
            <div class="options-container">
                ${question.options.map((option, optIndex) => `
                    <label class="option-label">
                        <input type="radio" name="${question.id}" value="${option.value}">
                        <span>${option.label}</span>
                    </label>
                `).join('')}
            </div>
        `;
        container.appendChild(questionEl);
    });
}

function createLabelHTML(grade, answers = null) {
    const color = GRADE_COLORS[grade];
    const icons = config.icons;

    const barsHTML = GRADE_ORDER.map((g, index) => {
        const barColor = GRADE_COLORS[g];
        const rectWidth = GRADE_WIDTHS[g];
        const isScoreRow = g === grade;

        return `
            <div class="grade-bar" style="z-index: ${isScoreRow ? 10 : 1};">
                <div class="grade-fill-rect" style="width: ${rectWidth}; background: ${barColor};">
                    <div class="grade-letter">${g}</div>
                </div>
                <div class="grade-fill-triangle" style="border-left: ${TRIANGLE_SIZE}px solid ${barColor}; border-right: none;"></div>
                ${isScoreRow ? `
                    <div class="score-indicator">
                        <div class="score-triangle"></div>
                        <span class="score-letter">${grade}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    const iconsHTML = icons.map(icon => `
        <div class="icon-item">
            <span class="icon-emoji">${icon.emoji}</span>
            <span>${icon.label}</span>
        </div>
    `).join('');

    return `
        <div class="eu-label">
            <div class="label-header">AD-FREE RATING</div>
            <div class="grade-bars">
                ${barsHTML}
            </div>
            <div class="icons-section">
                ${iconsHTML}
            </div>
        </div>
    `;
}

function calculateScore() {
    if (!config.formula || config.formula === 'weighted_sum') {
        return calculateWeightedSum();
    }
    console.warn(`Unknown formula: ${config.formula}, defaulting to weighted_sum`);
    return calculateWeightedSum();
}

function calculateWeightedSum() {
    let totalWeight = 0;
    let weightedScore = 0;

    config.questions.forEach(question => {
        const answer = userAnswers[question.id];
        if (answer !== undefined) {
            const option = question.options.find(opt => opt.value === answer);
            if (option) {
                weightedScore += (option.score * question.weight / 100);
                totalWeight += question.weight;
            }
        }
    });

    return totalWeight > 0 ? Math.round(weightedScore) : 0;
}

function determineGrade(score) {
    const thresholds = config.gradeThresholds;
    for (const [grade, threshold] of Object.entries(thresholds)) {
        if (score >= threshold) {
            return grade;
        }
    }
    return 'F';
}

function handleSubmit() {
    const formSection = document.getElementById('form-section');
    const questions = formSection.querySelectorAll('input[type="radio"]');

    userAnswers = {};
    let answeredCount = 0;

    questions.forEach(question => {
        if (question.checked) {
            userAnswers[question.name] = question.value;
            answeredCount++;
        }
    });

    if (answeredCount < config.questions.length) {
        alert('Please answer all questions before submitting.');
        return;
    }

    const score = calculateScore();
    const grade = determineGrade(score);

    showResult(grade, score);
}

function showResult(grade, score) {
    const formSection = document.getElementById('form-section');
    const resultSection = document.getElementById('result-section');
    const introSections = document.getElementById('intro-sections');

    introSections.style.display = 'none';
    resultSection.style.display = 'block';

    document.getElementById('result-label').innerHTML = createLabelHTML(grade);
    document.getElementById('result-message').textContent = `You scored ${score} out of 100.`;

    updateUrlHash(grade);
}

function updateUrlHash(grade) {
    const answersBase64 = btoa(JSON.stringify(userAnswers));
    const version = config.version || '1';
    window.location.hash = `v=${version}&grade=${grade}&answers=${answersBase64}`;
}

function parseUrlHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const grade = params.get('grade');
    const answersBase64 = params.get('answers');

    if (grade && answersBase64) {
        try {
            userAnswers = JSON.parse(atob(answersBase64));

            const formSection = document.getElementById('form-section');
            const introSections = document.getElementById('intro-sections');

            config.questions.forEach(question => {
                const answer = userAnswers[question.id];
                const radio = formSection.querySelector(`input[name="${question.id}"][value="${answer}"]`);
                if (radio) {
                    radio.checked = true;
                }
            });

            const score = calculateScore();
            const calculatedGrade = determineGrade(score);

            introSections.style.display = 'none';
            document.getElementById('result-section').style.display = 'block';
            document.getElementById('result-label').innerHTML = createLabelHTML(grade);
            document.getElementById('result-message').textContent = `You scored ${score} out of 100.`;
        } catch (error) {
            console.error('Error parsing URL hash:', error);
        }
    }
}

function shareResult() {
    const url = window.location.href;

    navigator.clipboard.writeText(url).then(() => {
        const feedback = document.getElementById('copy-feedback');
        feedback.style.display = 'block';

        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy URL. Please copy manually from your browser address bar.');
    });
}

function resetAssessment() {
    window.location.hash = '';
    userAnswers = {};

    const formSection = document.getElementById('form-section');
    const questions = formSection.querySelectorAll('input[type="radio"]');
    questions.forEach(q => q.checked = false);

    showIntro();
}

function showIntro() {
    const introSections = document.getElementById('intro-sections');
    const resultSection = document.getElementById('result-section');

    introSections.style.display = 'block';
    resultSection.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadConfig);
