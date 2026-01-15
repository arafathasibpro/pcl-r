// API endpoint for reactions quiz submission
const REACTION_NAMES = {
    1: 'Revenge Fantasies',
    2: 'Media Violence',
    3: 'Untraceable Punishment',
    4: 'Power/Control',
    5: 'Accidental Harm',
    6: 'Schadenfreude',
    7: 'Exploiting Weaknesses'
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

    if (!botToken || !chatId) return false;

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
        const { score, maxScore, percentage, level, answers, optionalThoughts, contactEmail, contactPhone, timestamp, userAgent, referrer } = req.body;

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || 'Unknown';

        const levelInfo = {
            low: { emoji: '🟢', text: 'Low (0-3)', desc: 'Low tendency' },
            moderate: { emoji: '🟡', text: 'Moderate (4-7)', desc: 'Some darker ideas appear' },
            higher: { emoji: '🟠', text: 'Higher (8-11)', desc: 'Leans toward control/payback' },
            veryHigh: { emoji: '🔴', text: 'Very High (12-14)', desc: 'Strong pull toward power/revenge' }
        };

        const info = levelInfo[level] || { emoji: '⚪', text: level, desc: '' };
        const browser = parseUserAgent(userAgent);

        let answersText = '';
        if (answers) {
            for (let i = 1; i <= 7; i++) {
                const val = answers[i] ?? '?';
                const emoji = val === 2 ? '🔴' : val === 1 ? '🟡' : '⚪';
                answersText += `${emoji} Q${i}: ${val} (${REACTION_NAMES[i]})\n`;
            }
        }

        const message = `
🧠 *Inner Reactions Quiz*
━━━━━━━━━━━━━━━━━━━━━━━

${info.emoji} *Result:* ${info.text}
📊 *Score:* ${score} / ${maxScore} (${percentage}%)
💡 *Interpretation:* ${info.desc}

━━━━━━━━━━━━━━━━━━━━━━━
*ANSWERS*
━━━━━━━━━━━━━━━━━━━━━━━
${answersText}${optionalThoughts ? `
━━━━━━━━━━━━━━━━━━━━━━━
*OPTIONAL THOUGHTS*
━━━━━━━━━━━━━━━━━━━━━━━
${optionalThoughts}
` : ''}
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

⚠️ _Not a diagnosis - for self-reflection only_
        `.trim();

        const sent = await sendToTelegram(message);

        res.status(200).json({ success: sent, message: sent ? 'Result recorded' : 'Telegram failed' });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
