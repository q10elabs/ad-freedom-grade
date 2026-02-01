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
    document.getElementById('details-btn').addEventListener('click', toggleBreakdown);
}

function renderExampleLabel(grade) {
    const container = document.getElementById('example-label');
    container.innerHTML = createLabelHTML(grade);
}

function renderQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    if (config.formula === 'exposure_based') {
        renderExposureQuestions(container);
    } else {
        renderWeightedQuestions(container);
    }
}

function renderWeightedQuestions(container) {
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

function renderExposureQuestions(container) {
    config.mediaTypes.forEach((media) => {
        const mediaEl = document.createElement('div');
        mediaEl.className = 'media-item';
        mediaEl.innerHTML = `
            <div class="media-header">${media.name}</div>
            <div class="frequency-options">
                ${config.frequencyLevels.map(level => `
                    <label class="frequency-label">
                        <input type="radio" name="freq_${media.id}" value="${level.value}"
                               onchange="handleFrequencyChange('${media.id}', '${level.value}')">
                        <span>${level.label}</span>
                        <span class="hint">(${level.hint})</span>
                    </label>
                `).join('')}
            </div>
            <div class="mitigation-options hidden" id="mitigation_${media.id}">
                <div class="mitigation-header">How do you reduce ad exposure?</div>
                ${media.options.map(opt => {
                    const mitigation = config.mitigationOptions[opt];
                    const hint = media.hints && media.hints[opt] ? media.hints[opt] : '';
                    return `
                        <label class="checkbox-label">
                            <input type="checkbox" name="mit_${media.id}" value="${opt}"
                                   onchange="handleMitigationChange('${media.id}')">
                            <span class="mitigation-text">${mitigation.label}</span>
                            ${hint ? `<span class="mitigation-detail">${hint}</span>` : ''}
                        </label>
                    `;
                }).join('')}
                <div class="mitigation-hint">If no options selected, we assume you see the ads</div>
            </div>
        `;
        container.appendChild(mediaEl);
    });
}

function handleFrequencyChange(mediaId, frequency) {
    const mitigationDiv = document.getElementById(`mitigation_${mediaId}`);
    if (frequency === 'never') {
        mitigationDiv.classList.add('hidden');
        // Clear mitigation selections when frequency is never
        const checkboxes = mitigationDiv.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    } else {
        mitigationDiv.classList.remove('hidden');
    }
}

function handleMitigationChange(mediaId) {
    // This function can be used for future enhancements
    // Currently just triggers UI updates if needed
}

function createLabelHTML(grade, subScores = null) {
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

    let subScoresHTML = '';
    if (subScores && config.subScores) {
        subScoresHTML = `
            <div class="sub-scores">
                ${config.subScores.map(sub => `
                    <div class="sub-score-row">
                        <span class="sub-score-emoji">${sub.emoji}</span>
                        <div class="sub-score-bar">
                            <div class="sub-score-fill" style="width: ${subScores[sub.id] || 0}%"></div>
                        </div>
                        <span class="sub-score-value">${subScores[sub.id] || 0}%</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="eu-label">
            <div class="label-header">AD-FREE RATING</div>
            <div class="grade-bars">
                ${barsHTML}
            </div>
            ${subScoresHTML}
            <div class="icons-section">
                ${iconsHTML}
            </div>
        </div>
    `;
}

function calculateScore() {
    if (config.formula === 'exposure_based') {
        return calculateExposureScore();
    }
    if (!config.formula || config.formula === 'weighted_sum') {
        return calculateWeightedSum();
    }
    console.warn(`Unknown formula: ${config.formula}, defaulting to weighted_sum`);
    return calculateWeightedSum();
}

function getHoursForFrequency(frequencyValue) {
    const level = config.frequencyLevels.find(l => l.value === frequencyValue);
    return level ? level.hoursPerWeek : 0;
}

function getLowestExposureFactor(mitigations) {
    if (!mitigations || mitigations.length === 0) {
        return 1.0; // Full exposure if no mitigations
    }

    let lowestFactor = 1.0;
    for (const mit of mitigations) {
        const option = config.mitigationOptions[mit];
        if (option && option.exposureFactor < lowestFactor) {
            lowestFactor = option.exposureFactor;
        }
    }
    return lowestFactor;
}

function calculateExposureScore() {
    let totalExposure = 0;

    for (const media of config.mediaTypes) {
        const answer = userAnswers[media.id];
        const frequency = answer?.frequency;
        if (!frequency || frequency === 'never') continue;

        const hours = getHoursForFrequency(frequency);
        const mitigations = answer?.mitigations || [];
        const exposureFactor = getLowestExposureFactor(mitigations);

        totalExposure += hours * media.adDensity * exposureFactor;
    }

    return Math.round(totalExposure);
}

function calculateSubScores() {
    let totalHours = 0;
    let privacyHours = 0;
    let premiumHours = 0;

    for (const media of config.mediaTypes) {
        const answer = userAnswers[media.id];
        const frequency = answer?.frequency;
        if (!frequency || frequency === 'never') continue;

        const hours = getHoursForFrequency(frequency);
        totalHours += hours;

        const mitigations = answer?.mitigations || [];
        if (mitigations.includes('blocker')) privacyHours += hours;
        if (mitigations.includes('premium')) premiumHours += hours;
    }

    return {
        privacy: totalHours > 0 ? Math.round(privacyHours / totalHours * 100) : 0,
        premium: totalHours > 0 ? Math.round(premiumHours / totalHours * 100) : 0
    };
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

    if (config.formula === 'exposure_based') {
        // For exposure-based: lower score = better grade
        for (const grade of GRADE_ORDER) {
            const threshold = thresholds[grade];
            if (threshold && threshold.maxExposure !== null && score <= threshold.maxExposure) {
                return grade;
            }
        }
        return 'F';
    }

    // For weighted_sum: higher score = better grade
    for (const [grade, threshold] of Object.entries(thresholds)) {
        if (score >= threshold) {
            return grade;
        }
    }
    return 'F';
}

function handleSubmit() {
    const formSection = document.getElementById('form-section');

    if (config.formula === 'exposure_based') {
        handleExposureSubmit(formSection);
    } else {
        handleWeightedSubmit(formSection);
    }
}

function handleWeightedSubmit(formSection) {
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

function handleExposureSubmit(formSection) {
    userAnswers = {};
    let answeredCount = 0;

    for (const media of config.mediaTypes) {
        const freqRadio = formSection.querySelector(`input[name="freq_${media.id}"]:checked`);
        if (freqRadio) {
            answeredCount++;
            const frequency = freqRadio.value;
            const mitigations = [];

            if (frequency !== 'never') {
                const mitCheckboxes = formSection.querySelectorAll(`input[name="mit_${media.id}"]:checked`);
                mitCheckboxes.forEach(cb => mitigations.push(cb.value));
            }

            userAnswers[media.id] = {
                frequency: frequency,
                mitigations: mitigations
            };
        }
    }

    if (answeredCount < config.mediaTypes.length) {
        alert('Please select a frequency for all media types before submitting.');
        return;
    }

    const score = calculateScore();
    const grade = determineGrade(score);
    const subScores = calculateSubScores();

    showResult(grade, score, subScores);
}

function showResult(grade, score, subScores = null) {
    const formSection = document.getElementById('form-section');
    const resultSection = document.getElementById('result-section');
    const introSections = document.getElementById('intro-sections');

    introSections.style.display = 'none';
    resultSection.style.display = 'block';

    // Reset breakdown section
    document.getElementById('score-breakdown').classList.add('hidden');
    document.getElementById('details-btn').textContent = 'Show score breakdown';

    document.getElementById('result-label').innerHTML = createLabelHTML(grade, subScores);

    if (config.formula === 'exposure_based') {
        document.getElementById('result-message').innerHTML =
            `Your weekly ad exposure score is <strong>${score}</strong>.<br>` +
            `<span class="exposure-message">Lower scores mean less advertising in your life.</span>`;
    } else {
        document.getElementById('result-message').textContent = `You scored ${score} out of 100.`;
    }

    updateUrlHash(grade, subScores);
}

function updateUrlHash(grade, subScores = null) {
    const answersBase64 = btoa(JSON.stringify(userAnswers));
    const version = config.version || '1';
    let hash = `v=${version}&grade=${grade}&answers=${answersBase64}`;

    if (subScores) {
        hash += `&sub=${btoa(JSON.stringify(subScores))}`;
    }

    window.location.hash = hash;
}

function parseUrlHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const grade = params.get('grade');
    const answersBase64 = params.get('answers');
    const subScoresBase64 = params.get('sub');

    if (grade && answersBase64) {
        try {
            userAnswers = JSON.parse(atob(answersBase64));
            let subScores = null;

            if (subScoresBase64) {
                subScores = JSON.parse(atob(subScoresBase64));
            }

            const formSection = document.getElementById('form-section');
            const introSections = document.getElementById('intro-sections');

            if (config.formula === 'exposure_based') {
                // Restore exposure-based form state
                for (const media of config.mediaTypes) {
                    const answer = userAnswers[media.id];
                    if (answer && answer.frequency) {
                        const freqRadio = formSection.querySelector(
                            `input[name="freq_${media.id}"][value="${answer.frequency}"]`
                        );
                        if (freqRadio) {
                            freqRadio.checked = true;
                            handleFrequencyChange(media.id, answer.frequency);
                        }

                        if (answer.mitigations && answer.frequency !== 'never') {
                            for (const mit of answer.mitigations) {
                                const checkbox = formSection.querySelector(
                                    `input[name="mit_${media.id}"][value="${mit}"]`
                                );
                                if (checkbox) checkbox.checked = true;
                            }
                        }
                    }
                }

                const score = calculateScore();
                subScores = subScores || calculateSubScores();

                introSections.style.display = 'none';
                document.getElementById('result-section').style.display = 'block';
                document.getElementById('result-label').innerHTML = createLabelHTML(grade, subScores);
                document.getElementById('result-message').innerHTML =
                    `Your weekly ad exposure score is <strong>${score}</strong>.<br>` +
                    `<span class="exposure-message">Lower scores mean less advertising in your life.</span>`;
            } else {
                // Restore weighted-sum form state
                config.questions.forEach(question => {
                    const answer = userAnswers[question.id];
                    const radio = formSection.querySelector(`input[name="${question.id}"][value="${answer}"]`);
                    if (radio) {
                        radio.checked = true;
                    }
                });

                const score = calculateScore();

                introSections.style.display = 'none';
                document.getElementById('result-section').style.display = 'block';
                document.getElementById('result-label').innerHTML = createLabelHTML(grade);
                document.getElementById('result-message').textContent = `You scored ${score} out of 100.`;
            }
        } catch (error) {
            console.error('Error parsing URL hash:', error);
        }
    }
}

function toggleBreakdown() {
    const breakdown = document.getElementById('score-breakdown');
    const btn = document.getElementById('details-btn');

    if (breakdown.classList.contains('hidden')) {
        breakdown.classList.remove('hidden');
        breakdown.innerHTML = generateBreakdownHTML();
        btn.textContent = 'Hide score breakdown';
    } else {
        breakdown.classList.add('hidden');
        btn.textContent = 'Show score breakdown';
    }
}

function generateBreakdownHTML() {
    if (config.formula === 'exposure_based') {
        return generateExposureBreakdownHTML();
    } else {
        return generateWeightedBreakdownHTML();
    }
}

function generateExposureBreakdownHTML() {
    let rows = '';
    let totalExposure = 0;

    for (const media of config.mediaTypes) {
        const answer = userAnswers[media.id];
        const frequency = answer?.frequency;
        const freqLevel = config.frequencyLevels.find(l => l.value === frequency);
        const hours = freqLevel ? freqLevel.hoursPerWeek : 0;

        if (!frequency || frequency === 'never') {
            rows += `
                <tr class="zero-exposure">
                    <td>${media.name}</td>
                    <td>Never</td>
                    <td>-</td>
                    <td>-</td>
                    <td>0</td>
                </tr>
            `;
            continue;
        }

        const mitigations = answer?.mitigations || [];
        const exposureFactor = getLowestExposureFactor(mitigations);
        const exposure = hours * media.adDensity * exposureFactor;
        totalExposure += exposure;

        const mitigationLabels = mitigations.length > 0
            ? mitigations.map(m => config.mitigationOptions[m]?.label.split(' ')[1] || m).join(', ')
            : 'None';

        rows += `
            <tr>
                <td>${media.name}</td>
                <td>${freqLevel.label} (${hours}h)</td>
                <td>${media.adDensity}</td>
                <td>${mitigationLabels} (×${exposureFactor})</td>
                <td>${Math.round(exposure)}</td>
            </tr>
        `;
    }

    rows += `
        <tr class="total-row">
            <td colspan="4">Total Weekly Exposure</td>
            <td>${Math.round(totalExposure)}</td>
        </tr>
    `;

    return `
        <div class="breakdown-header">Score Breakdown</div>
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Media</th>
                    <th>Usage</th>
                    <th>Ad Density</th>
                    <th>Mitigation</th>
                    <th>Exposure</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        <div class="breakdown-formula">
            <strong>Formula:</strong> For each media type: <code>hours × adDensity × mitigationFactor</code><br>
            Mitigation factors: Skip (×0.7), Ad blocker (×0.1), Premium (×0.0), None (×1.0)
        </div>
    `;
}

function generateWeightedBreakdownHTML() {
    let rows = '';
    let totalWeight = 0;
    let weightedScore = 0;

    config.questions.forEach(question => {
        const answer = userAnswers[question.id];
        const option = question.options.find(opt => opt.value === answer);

        if (option) {
            const contribution = (option.score * question.weight / 100);
            weightedScore += contribution;
            totalWeight += question.weight;

            rows += `
                <tr>
                    <td>${question.text}</td>
                    <td>${option.label}</td>
                    <td>${option.score}</td>
                    <td>${question.weight}%</td>
                    <td>${Math.round(contribution)}</td>
                </tr>
            `;
        }
    });

    rows += `
        <tr class="total-row">
            <td colspan="4">Total Score</td>
            <td>${Math.round(weightedScore)}</td>
        </tr>
    `;

    return `
        <div class="breakdown-header">Score Breakdown</div>
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Points</th>
                    <th>Weight</th>
                    <th>Contribution</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        <div class="breakdown-formula">
            <strong>Formula:</strong> <code>Σ (points × weight%)</code> for each question
        </div>
    `;
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
    const version = config.version || '1';
    window.location.hash = `v=${version}`;
    userAnswers = {};

    const formSection = document.getElementById('form-section');

    // Clear all radio buttons
    const radios = formSection.querySelectorAll('input[type="radio"]');
    radios.forEach(r => r.checked = false);

    // Clear all checkboxes
    const checkboxes = formSection.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    // Hide all mitigation sections (for v2)
    const mitigationDivs = formSection.querySelectorAll('.mitigation-options');
    mitigationDivs.forEach(div => div.classList.add('hidden'));

    showIntro();
}

function showIntro() {
    const introSections = document.getElementById('intro-sections');
    const resultSection = document.getElementById('result-section');

    introSections.style.display = 'block';
    resultSection.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadConfig);
