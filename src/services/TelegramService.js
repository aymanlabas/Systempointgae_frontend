class TelegramService {
    constructor() {
        // ==========================================
        // ⚠️ À REMPLACER PAR TES PROPRES VALEURS ⚠️
        // ==========================================
        this.botToken = '8730867601:AAFSTbRggpgkWfo5MabojM3PdAzkYrcrx20';
        this.chatId = '1367086686';
    }

    /**
     * Envoie un message de pointage sur Telegram.
     * Si `location` est fourni ({ lat, lng, accuracy }), ajoute un lien Google Maps
     * dans le texte ET un pin de localisation natif Telegram.
     *
     * @param {string}      employeeName
     * @param {string}      department
     * @param {string}      type       - 'check-in' | 'check-out'
     * @param {string}      time       - heure formatée
     * @param {object|null} location   - { lat, lng, accuracy } ou null
     */
    async sendNotification(employeeName, department, type, time, location = null) {
        if (this.botToken === 'VOTRE_BOT_TOKEN_ICI' || this.chatId === 'VOTRE_CHAT_ID_ICI') {
            console.warn("⚠️ Telegram non configuré. Ajoute ton Bot Token et Chat ID dans TelegramService.js");
            return;
        }

        const action = type === 'check-in' ? '🟢 Pointage Entrée' : '🔴 Pointage Sortie';
        const deptStr = department ? department : 'Non spécifié';

        // Build location line
        let locationLine = '📍 *Localisation:* Non disponible';
        if (location && location.lat && location.lng) {
            const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
            locationLine = `📍 *Localisation:* [Voir sur Google Maps](${mapsUrl}) _(±${Math.round(location.accuracy || 0)}m)_`;
        }

        const message = `
🛎️ *Notification de Pointage*
👤 *Employé:* ${employeeName}
🏢 *Département:* ${deptStr}
⏱️ *Action:* ${action}
🕒 *Heure:* ${time}
${locationLine}
`;

        const baseUrl = `https://api.telegram.org/bot${this.botToken}`;

        try {
            // 1️⃣ Send the text message
            const textRes = await fetch(`${baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: false,
                })
            });

            if (!textRes.ok) {
                console.error("Erreur API Telegram (message):", await textRes.text());
            } else {
                console.log("✅ Notification Telegram envoyée avec succès.");
            }

            // 2️⃣ If GPS available, also send a native Telegram location pin
            if (location && location.lat && location.lng) {
                const locRes = await fetch(`${baseUrl}/sendLocation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chatId,
                        latitude: location.lat,
                        longitude: location.lng,
                        horizontal_accuracy: Math.min(Math.round(location.accuracy || 0), 1500),
                    })
                });

                if (!locRes.ok) {
                    console.error("Erreur API Telegram (location):", await locRes.text());
                } else {
                    console.log("✅ Pin de localisation Telegram envoyé.");
                }
            }

        } catch (error) {
            console.error("Erreur de connexion Telegram:", error);
        }
    }
}

export default new TelegramService();
