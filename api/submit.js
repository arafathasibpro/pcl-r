// API endpoint for main quiz submission
const FACTOR_1_ITEMS = [1, 2, 4, 5, 6, 7, 8, 16];
const FACTOR_2_ITEMS = [3, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20];

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

function parseUserAgent(ua) {
    if (!ua) return 'Unknown';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    const device = isMobile ? '📱 ' : '💻 ';
    if (ua.includes('Firefox')) return device + 'Firefox';
    if (ua.includes('Edg')) return device + 'Edge';
    if (ua.includes('Chrome')) return device + 'Chrome';
    if (ua.includes('Safari')) return device + 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return device + 'Opera';
    return device + 'Other';
}

async function sendToTelegram(message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.log('Telegram credentials not configured');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error('Telegram error:', error);
        return false;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { score, percentage, level, answers, contactEmail, contactPhone, timestamp, userAgent, referrer } = req.body;

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || 'Unknown';

        // Calculate factor scores
        let f1 = 0, f2 = 0;
        if (answers) {
            FACTOR_1_ITEMS.forEach(i => { f1 += answers[i] || 0; });
            FACTOR_2_ITEMS.forEach(i => { f2 += answers[i] || 0; });
        }

        const levelInfo = {
            veryLow: { emoji: '🟢', text: 'Very Low (0-12)' },
            low: { emoji: '🟡', text: 'Some Traits (13-19)' },
            moderate: { emoji: '🟠', text: 'Moderate (20-29)' },
            high: { emoji: '🔴', text: 'High (30+)' }
        };

        const info = levelInfo[level] || { emoji: '⚪', text: level };
        const browser = parseUserAgent(userAgent);

        // Format answers
        let answersF1 = '', answersF2 = '';
        if (answers) {
            FACTOR_1_ITEMS.forEach(i => {
                const val = answers[i] ?? '?';
                const emoji = val === 2 ? '🔴' : val === 1 ? '🟡' : '⚪';
                answersF1 += `${emoji} Q${i}: ${val} (${QUESTION_NAMES[i]})\n`;
            });
            FACTOR_2_ITEMS.forEach(i => {
                const val = answers[i] ?? '?';
                const emoji = val === 2 ? '🔴' : val === 1 ? '🟡' : '⚪';
                answersF2 += `${emoji} Q${i}: ${val} (${QUESTION_NAMES[i]})\n`;
            });
        }

        const message = `
🧠 *PCL-R Quiz Submission*
━━━━━━━━━━━━━━━━━━━━━━━

${info.emoji} *Result:* ${info.text}
📊 *Total Score:* ${score} / 40 (${percentage}%)

📈 *Factor Breakdown:*
├ F1 (Interpersonal/Affective): *${f1}*/16
└ F2 (Lifestyle/Antisocial): *${f2}*/24

━━━━━━━━━━━━━━━━━━━━━━━
*FACTOR 1 ANSWERS*
━━━━━━━━━━━━━━━━━━━━━━━
${answersF1}
━━━━━━━━━━━━━━━━━━━━━━━
*FACTOR 2 ANSWERS*
━━━━━━━━━━━━━━━━━━━━━━━
${answersF2}
━━━━━━━━━━━━━━━━━━━━━━━
*VISITOR INFO*
━━━━━━━━━━━━━━━━━━━━━━━
🌐 IP: \`${ip}\`
🖥️ Browser: ${browser}
🔗 Referrer: ${referrer || 'Direct'}
⏰ Time: ${new Date(timestamp).toLocaleString('en-US', {
            timeZone: 'Asia/Dhaka',
            dateStyle: 'medium',
            timeStyle: 'short'
        })}${contactEmail || contactPhone ? `

━━━━━━━━━━━━━━━━━━━━━━━
📬 *CONTACT INFO*
━━━━━━━━━━━━━━━━━━━━━━━
${contactEmail ? `📧 Email: ${contactEmail}` : ''}${contactEmail && contactPhone ? '\n' : ''}${contactPhone ? `📱 Phone: ${contactPhone}` : ''}` : ''}

⚠️ _Not a clinical diagnosis_
        `.trim();

        const sent = await sendToTelegram(message);

        res.status(200).json({ success: sent, message: sent ? 'Result recorded' : 'Telegram failed' });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
