// ===========================
// Inner Reactions Quiz Logic
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reactionsForm');
    const submitBtn = document.getElementById('submitBtn');
    const resultSection = document.getElementById('resultSection');
    const scoreValue = document.getElementById('scoreValue');
    const scorePercentage = document.getElementById('scorePercentage');
    const interpretation = document.getElementById('interpretation');
    const retakeBtn = document.getElementById('retakeBtn');

    const TOTAL_QUESTIONS = 7;
    const MAX_SCORE = 14;

    // Score interpretation ranges
    const interpretations = {
        low: {
            range: '0–3',
            title: 'Low Tendency',
            text: 'Your responses suggest a low tendency toward these kinds of thoughts. Dark or revenge-oriented fantasies don\'t seem to be a significant part of your inner world.'
        },
        moderate: {
            range: '4–7',
            title: 'Moderate',
            text: 'Some darker or revenge-oriented ideas appear in your imagination. This is fairly common — many people occasionally have thoughts like these, especially when wronged.'
        },
        higher: {
            range: '8–11',
            title: 'Higher Tendency',
            text: 'Your fantasies or hypotheticals lean toward control, payback, or less concern for others\' pain. This doesn\'t mean anything is wrong with you — thoughts are just thoughts.'
        },
        veryHigh: {
            range: '12–14',
            title: 'Very High',
            text: 'Your responses indicate a strong pull toward power, revenge, or satisfaction from harm in imagination. Remember: imagination ≠ action. If these thoughts ever feel distressing, consider talking to someone.'
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
            const selected = document.querySelector(`input[name="r${i}"]:checked`);
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

        const percentage = Math.round((score / MAX_SCORE) * 100);

        // Determine interpretation
        let level;
        if (score <= 3) {
            level = 'low';
        } else if (score <= 7) {
            level = 'moderate';
        } else if (score <= 11) {
            level = 'higher';
        } else {
            level = 'veryHigh';
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

        // Get optional data
        const optionalThoughts = document.getElementById('optionalThoughts')?.value.trim() || '';
        const contactEmail = document.getElementById('contactEmail')?.value.trim() || '';
        const contactPhone = document.getElementById('contactPhone')?.value.trim() || '';

        // Send results to backend (for Telegram notification)
        try {
            submitBtn.classList.add('loading');
            await sendResultToBackend({
                quizType: 'inner-reactions',
                score,
                maxScore: MAX_SCORE,
                percentage,
                level,
                answers,
                optionalThoughts,
                contactEmail,
                contactPhone
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
    const response = await fetch('/api/submit-reactions', {
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
