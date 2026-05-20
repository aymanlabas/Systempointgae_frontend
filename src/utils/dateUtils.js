/**
 * Utilitaires de date pour FacialPoint
 */

export const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** Retourne la date du jour au format YYYY-MM-DD */
export const getTodayString = () => new Date().toLocaleDateString('fr-CA');

/** Formate une date ISO ou Timestamp en string lisible */
export const formatDate = (dateInput) => {
    if (!dateInput) return '—';
    const d = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Formate une heure au format HH:mm */
export const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    return timeStr.substring(0, 5);
};

/** Retourne les N derniers jours au format YYYY-MM-DD */
export const getLastNDays = (n = 7) => {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('fr-CA'));
    }
    return days;
};

/** Label court d'un jour YYYY-MM-DD (ex: "Lun 12") */
export const shortDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${DAYS_FR[d.getDay()].substring(0, 3)} ${d.getDate()}`;
};

/** Calcule la durée entre check-in et check-out en heures (float) */
export const calcHoursWorked = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return 0;
    const [h1, m1] = timeIn.split(':').map(Number);
    const [h2, m2] = timeOut.split(':').map(Number);
    const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.max(0, parseFloat((minutes / 60).toFixed(2)));
};

/** Vérifie si une heure est après l'heure limite (format "HH:mm:ss" ou "HH:mm") */
export const isLate = (timeStr, limitStr = '09:00') => {
    if (!timeStr) return false;
    return timeStr.substring(0, 5) > limitStr.substring(0, 5);
};

/** Retourne un label de statut projet */
export const getProjectStatusLabel = (status) => {
    const map = {
        en_cours: { label: 'En cours', color: 'blue' },
        termine: { label: 'Terminé', color: 'green' },
        suspendu: { label: 'Suspendu', color: 'warning' },
    };
    return map[status] || { label: status, color: 'muted' };
};

/** Retourne un label de statut congé */
export const getLeaveStatusLabel = (status) => {
    const map = {
        en_attente: { label: 'En attente', color: 'warning' },
        accepte: { label: 'Accepté', color: 'success' },
        refuse: { label: 'Refusé', color: 'danger' },
    };
    return map[status] || { label: status, color: 'muted' };
};

/** Calcule le nombre de jours ouvrables entre deux dates */
export const workDaysBetween = (startStr, endStr) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
};
