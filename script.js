// ===========================
// Quiz Logic & Submission
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('quizForm');
    const submitBtn = document.getElementById('submitBtn');
    const resultSection = document.getElementById('resultSection');
    const scoreValue = document.getElementById('scoreValue');
    const scorePercentage = document.getElementById('scorePercentage');
    const interpretation = document.getElementById('interpretation');
    const retakeBtn = document.getElementById('retakeBtn');

    const TOTAL_QUESTIONS = 20;
    const MAX_SCORE = 40;

    // Factor definitions (PCL-R inspired)
    // Factor 1: Interpersonal/Affective ("primary psychopathy")
    const FACTOR_1_ITEMS = [1, 2, 4, 5, 6, 7, 8, 16];
    // Factor 2: Lifestyle/Antisocial ("secondary psychopathy")  
    const FACTOR_2_ITEMS = [3, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20];

    // Score interpretation ranges (updated)
    const interpretations = {
        veryLow: {
            range: '0–12',
            title: 'Very Low Traits',
            text: 'Your responses fall in the typical range for most people. These traits don\'t appear to be significant patterns in your behavior.'
        },
        low: {
            range: '13–19',
            title: 'Some Traits Present',
            text: 'Some of these traits may show up occasionally. This is still common in the general population and within normal range.'
        },
        moderate: {
            range: '20–29',
            title: 'Moderate Elevation',
            text: 'These patterns appear noticeable in your behavior. Worth some self-reflection — these patterns may occasionally cause issues in relationships or work.'
        },
        high: {
            range: '30+',
            title: 'High Elevation',
            text: 'Your responses indicate strong alignment with these traits. In research, this range is associated with psychopathic patterns — but this is NOT a clinical diagnosis. Consider speaking with a professional if these patterns cause problems.'
        }
    };

    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear previous error states
        document.querySelectorAll('.quiz-item.error').forEach(item => {
            item.classList.remove('error');
        });

        // Validate all questions are answered
        const unanswered = [];
        const answers = {};

        for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            if (!selected) {
                unanswered.push(i);
            } else {
                answers[i] = parseInt(selected.value);
            }
        }

        if (unanswered.length > 0) {
            // Highlight unanswered questions
            unanswered.forEach(q => {
                const item = document.querySelector(`.quiz-item[data-question="${q}"]`);
                item.classList.add('error');
            });

            // Scroll to first unanswered question
            const firstUnanswered = document.querySelector(`.quiz-item[data-question="${unanswered[0]}"]`);
            firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });

            return;
        }

        // Calculate total score
        let score = 0;
        for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
            score += answers[i];
        }

        // Calculate Factor scores
        let factor1 = 0;
        let factor2 = 0;

        FACTOR_1_ITEMS.forEach(item => {
            factor1 += answers[item];
        });

        FACTOR_2_ITEMS.forEach(item => {
            factor2 += answers[item];
        });

        const percentage = Math.round((score / MAX_SCORE) * 100);

        // Determine interpretation (new ranges)
        let level;
        if (score <= 12) {
            level = 'veryLow';
        } else if (score <= 19) {
            level = 'low';
        } else if (score <= 29) {
            level = 'moderate';
        } else {
            level = 'high';
        }

        const interp = interpretations[level];

        // Update UI
        scoreValue.textContent = score;
        scorePercentage.textContent = `${percentage}%`;

        interpretation.className = `interpretation ${level}`;
        interpretation.innerHTML = `
            <h3>${interp.title} (${interp.range})</h3>
            <p>${interp.text}</p>
        `;

        // Show result section
        resultSection.classList.remove('hidden');

        // Smooth scroll to results
        setTimeout(() => {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        // Send results to backend (for Telegram notification)
        try {
            submitBtn.classList.add('loading');
            await sendResultToBackend({
                score,
                percentage,
                level,
                factor1,
                factor2,
                answers
            });
        } catch (error) {
            console.log('Backend notification skipped:', error.message);
        } finally {
            submitBtn.classList.remove('loading');
        }
    });

    // Retake quiz
    retakeBtn.addEventListener('click', () => {
        // Reset form
        form.reset();

        // Hide results
        resultSection.classList.add('hidden');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Remove error state when option is selected
    document.querySelectorAll('.option-card input').forEach(input => {
        input.addEventListener('change', () => {
            const quizItem = input.closest('.quiz-item');
            quizItem.classList.remove('error');
        });
    });
});

// ===========================
// Backend Communication
// ===========================

async function sendResultToBackend(results) {
    const data = {
        ...results,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct'
    };

    // Try to send to backend
    const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Backend not available');
    }

    return response.json();
}
