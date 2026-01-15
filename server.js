const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Trust proxy for accurate IP detection (if behind nginx/reverse proxy)
app.set('trust proxy', true);

// Factor definitions (PCL-R inspired)
const FACTOR_1_ITEMS = [1, 2, 4, 5, 6, 7, 8, 16]; // Interpersonal/Affective
const FACTOR_2_ITEMS = [3, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20]; // Lifestyle/Antisocial

// Question short names for display
const QUESTION_NAMES = {
    1: 'Glibness/Charm',
    2: 'Grandiose self',
    3: 'Stimulation need',
    4: 'Pathological lying',
    5: 'Conning/Manipulative',
    6: 'Lack remorse',
    7: 'Shallow affect',
    8: 'Callous/No empathy',
    9: 'Parasitic lifestyle',
    10: 'Poor behavior ctrl',
    11: 'Promiscuous',
    12: 'Early problems',
    13: 'No long-term goals',
    14: 'Impulsivity',
    15: 'Irresponsibility',
    16: 'Fail accept resp',
    17: 'Short relationships',
    18: 'Juvenile delinq',
    19: 'Criminal versatility',
    20: 'Revocation/Repeat'
};

// API endpoint for quiz submission
app.post('/api/submit', async (req, res) => {
    try {
        const { score, percentage, level, factor1, factor2, answers, timestamp, userAgent, referrer, contactEmail, contactPhone } = req.body;

        // Get visitor IP address
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || req.socket.remoteAddress
            || 'Unknown';

        // Calculate factor scores from answers
        let f1 = 0, f2 = 0;
        if (answers) {
            FACTOR_1_ITEMS.forEach(i => {
                f1 += answers[i] || 0;
            });
            FACTOR_2_ITEMS.forEach(i => {
                f2 += answers[i] || 0;
            });
        }

        // Format the message for Telegram
        const message = formatTelegramMessage({
            ip,
            score,
            percentage,
            level,
            factor1: f1,
            factor2: f2,
            answers,
            timestamp,
            userAgent,
            referrer,
            contactEmail: contactEmail || '',
            contactPhone: contactPhone || ''
        });

        // Send to Telegram
        const sent = await sendToTelegram(message);

        if (sent) {
            res.json({ success: true, message: 'Result recorded' });
        } else {
            res.json({ success: false, message: 'Telegram notification failed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Format message for Telegram with Factor scores and individual answers
function formatTelegramMessage(data) {
    // Level emoji and text
    const levelInfo = {
        veryLow: { emoji: '🟢', text: 'Very Low (0-12)', desc: 'Typical range' },
        low: { emoji: '🟡', text: 'Some Traits (13-19)', desc: 'Common in general population' },
        moderate: { emoji: '🟠', text: 'Moderate (20-29)', desc: 'Worth self-reflection' },
        high: { emoji: '🔴', text: 'High (30+)', desc: 'Strongly elevated' }
    };

    const info = levelInfo[data.level] || { emoji: '⚪', text: data.level, desc: '' };

    // Parse user agent for cleaner display
    const browser = parseUserAgent(data.userAgent);

    // Calculate max possible for each factor
    const factor1Max = FACTOR_1_ITEMS.length * 2; // 8 items × 2 = 16
    const factor2Max = FACTOR_2_ITEMS.length * 2; // 12 items × 2 = 24

    // Format individual answers
    let answersF1 = '';
    let answersF2 = '';

    if (data.answers) {
        // Factor 1 answers
        FACTOR_1_ITEMS.forEach(i => {
            const val = data.answers[i] ?? '?';
            const emoji = val === 2 ? '🔴' : val === 1 ? '🟡' : '⚪';
            answersF1 += `${emoji} Q${i}: ${val} (${QUESTION_NAMES[i]})\n`;
        });

        // Factor 2 answers
        FACTOR_2_ITEMS.forEach(i => {
            const val = data.answers[i] ?? '?';
            const emoji = val === 2 ? '🔴' : val === 1 ? '🟡' : '⚪';
            answersF2 += `${emoji} Q${i}: ${val} (${QUESTION_NAMES[i]})\n`;
        });
    }

    const message = `
🧠 *PCL-R Quiz Submission*
━━━━━━━━━━━━━━━━━━━━━━━

${info.emoji} *Result:* ${info.text}
📊 *Total Score:* ${data.score} / 40 (${data.percentage}%)

📈 *Factor Breakdown:*
├ F1 (Interpersonal/Affective): *${data.factor1}*/${factor1Max}
└ F2 (Lifestyle/Antisocial): *${data.factor2}*/${factor2Max}

━━━━━━━━━━━━━━━━━━━━━━━
*FACTOR 1 ANSWERS* (Primary)
━━━━━━━━━━━━━━━━━━━━━━━
${answersF1}
━━━━━━━━━━━━━━━━━━━━━━━
*FACTOR 2 ANSWERS* (Secondary)
━━━━━━━━━━━━━━━━━━━━━━━
${answersF2}
━━━━━━━━━━━━━━━━━━━━━━━
*VISITOR INFO*
━━━━━━━━━━━━━━━━━━━━━━━
🌐 IP: \`${data.ip}\`
🖥️ Browser: ${browser}
🔗 Referrer: ${data.referrer || 'Direct'}
⏰ Time: ${new Date(data.timestamp).toLocaleString('en-US', {
        timeZone: 'Asia/Dhaka',
        dateStyle: 'medium',
        timeStyle: 'short'
    })}${data.contactEmail || data.contactPhone ? `

━━━━━━━━━━━━━━━━━━━━━━━
📬 *CONTACT INFO* (Optional)
━━━━━━━━━━━━━━━━━━━━━━━
${data.contactEmail ? `📧 Email: ${data.contactEmail}` : ''}${data.contactEmail && data.contactPhone ? '\n' : ''}${data.contactPhone ? `📱 Phone: ${data.contactPhone}` : ''}` : ''}

⚠️ _Not a clinical diagnosis_
    `.trim();

    return message;
}

// Simple user agent parser
function parseUserAgent(ua) {
    if (!ua) return 'Unknown';

    // Detect mobile
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    const device = isMobile ? '📱 ' : '💻 ';

    if (ua.includes('Firefox')) return device + 'Firefox';
    if (ua.includes('Edg')) return device + 'Edge';
    if (ua.includes('Chrome')) return device + 'Chrome';
    if (ua.includes('Safari')) return device + 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return device + 'Opera';

    return device + 'Other';
}

// Send message to Telegram
async function sendToTelegram(message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.log('⚠️  Telegram credentials not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();

        if (data.ok) {
            console.log('✅ Telegram notification sent successfully');
            return true;
        } else {
            console.error('❌ Telegram API error:', data.description);
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to send Telegram message:', error.message);
        return false;
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        console.log('✅ Telegram notifications enabled');
    } else {
        console.log('⚠️  Telegram not configured - see .env.example');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
