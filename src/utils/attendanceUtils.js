import { getLastNDays, shortDayLabel, isLate, calcHoursWorked } from './dateUtils';

/**
 * Calcule les stats de présence du jour
 */
export const calcTodayStats = (attendances, users, todayStr, limitTime = '09:00') => {
    const employees = users.filter(u => u.role !== 'admin');
    const totalEmployees = employees.length;

    const checkInsToday = attendances.filter(
        log => log.date === todayStr && log.type === 'check-in'
    );
    const checkOutsToday = attendances.filter(
        log => log.date === todayStr && log.type === 'check-out'
    );

    const presentUserIds = new Set(checkInsToday.map(log => log.userId));
    const presentCount = presentUserIds.size;

    let lateCount = 0;
    checkInsToday.forEach(log => {
        if (isLate(log.time, limitTime)) lateCount++;
    });

    const absentCount = Math.max(0, totalEmployees - presentCount);

    // Heures travaillées aujourd'hui (pour ceux qui ont check-out)
    let totalHoursToday = 0;
    checkOutsToday.forEach(checkOut => {
        const matchingIn = checkInsToday.find(ci => ci.userId === checkOut.userId);
        if (matchingIn) {
            totalHoursToday += calcHoursWorked(matchingIn.time, checkOut.time);
        }
    });

    return { totalEmployees, presentCount, lateCount, absentCount, totalHoursToday };
};

/**
 * Génère les données de présence pour les 7 derniers jours (pour recharts)
 */
export const buildWeeklyAttendanceData = (attendances, users, days = null) => {
    const last7 = days || getLastNDays(7);
    const employees = users.filter(u => u.role !== 'admin');
    const total = employees.length;

    return last7.map(dateStr => {
        const checkInsDay = attendances.filter(
            log => log.date === dateStr && log.type === 'check-in'
        );
        const presentIds = new Set(checkInsDay.map(l => l.userId));
        const presents = presentIds.size;
        const absents = Math.max(0, total - presents);
        const lates = checkInsDay.filter(l => isLate(l.time, '09:00')).length;

        return {
            date: dateStr,
            label: shortDayLabel(dateStr),
            presents,
            absents,
            retards: lates,
        };
    });
};

/**
 * Calcule les heures travaillées par employé sur une période
 */
export const buildHoursPerEmployee = (attendances, users, dateRange = null) => {
    const employees = users.filter(u => u.role !== 'admin');
    const result = [];

    employees.forEach(emp => {
        const empIns = attendances.filter(
            l => l.userId === emp.uid && l.type === 'check-in' &&
                (!dateRange || (l.date >= dateRange.start && l.date <= dateRange.end))
        );
        const empOuts = attendances.filter(
            l => l.userId === emp.uid && l.type === 'check-out' &&
                (!dateRange || (l.date >= dateRange.start && l.date <= dateRange.end))
        );

        let totalHours = 0;
        empOuts.forEach(out => {
            const matchIn = empIns.find(ci => ci.date === out.date);
            if (matchIn) totalHours += calcHoursWorked(matchIn.time, out.time);
        });

        result.push({
            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
            heures: parseFloat(totalHours.toFixed(1)),
        });
    });

    return result.sort((a, b) => b.heures - a.heures).slice(0, 10);
};

/**
 * Taux de ponctualité global (%)
 */
export const calcPunctualityRate = (attendances, limitTime = '09:00') => {
    const checkIns = attendances.filter(l => l.type === 'check-in');
    if (!checkIns.length) return 100;
    const onTime = checkIns.filter(l => !isLate(l.time, limitTime)).length;
    return Math.round((onTime / checkIns.length) * 100);
};

/**
 * Retourne les employés absents aujourd'hui
 */
export const getAbsentEmployees = (attendances, users, todayStr) => {
    const employees = users.filter(u => u.role !== 'admin');
    const checkInsToday = new Set(
        attendances.filter(l => l.date === todayStr && l.type === 'check-in').map(l => l.userId)
    );
    return employees.filter(e => !checkInsToday.has(e.uid));
};
