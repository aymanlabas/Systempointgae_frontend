class TelegramService {
    constructor() {
        // ==========================================
        // ⚠️ À REMPLACER PAR TES PROPRES VALEURS ⚠️
        // ==========================================
        this.botToken = '8730867601:AAFSTbRggpgkWfo5MabojM3PdAzkYrcrx20';
        this.chatId = '1367086686';
    }

    async sendNotification(employeeName, department, type, time) {
        if (this.botToken === 'VOTRE_BOT_TOKEN_ICI' || this.chatId === 'VOTRE_CHAT_ID_ICI') {
            console.warn("⚠️ Telegram non configuré. Ajoute ton Bot Token et Chat ID dans TelegramService.js");
            return;
        }

        const action = type === 'check-in' ? '🟢 Pointage Entrée' : '🔴 Pointage Sortie';
        const deptStr = department ? department : 'Non spécifié';

        const message = `
🛎️ *Notification de Pointage*
👤 *Employé:* ${employeeName}
🏢 *Département:* ${deptStr}
⏱️ *Action:* ${action}
🕒 *Heure:* ${time}
`;

        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            if (!response.ok) {
                console.error("Erreur API Telegram:", await response.text());
            } else {
                console.log("✅ Notification Telegram envoyée avec succès.");
            }
        } catch (error) {
            console.error("Erreur de connexion Telegram:", error);
        }
    }
}

export default new TelegramService();
