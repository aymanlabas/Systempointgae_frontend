import React from 'react';
import './StatCard.css';

/**
 * Composant carte statistique réutilisable
 * @param {string} title - Titre de la stat
 * @param {string|number} value - Valeur à afficher
 * @param {ReactNode} icon - Icône lucide-react
 * @param {string} color - Couleur: 'blue' | 'green' | 'warning' | 'danger' | 'purple'
 * @param {string} subtitle - Texte secondaire optionnel
 * @param {number} trend - Variation % (positif = hausse, négatif = baisse)
 * @param {boolean} loading - État de chargement
 */
export default function StatCard({ title, value, icon, color = 'blue', subtitle, trend, loading = false }) {
    return (
        <div className={`stat-card-v2 glass-panel stat-color-${color}`}>
            <div className="stat-card-top">
                <div className={`stat-icon-box color-${color}`}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <span className={`stat-trend ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div className="stat-card-body">
                <div className="stat-value-v2">
                    {loading ? <span className="stat-skeleton" /> : value ?? '—'}
                </div>
                <div className="stat-title-v2">{title}</div>
                {subtitle && <div className="stat-subtitle">{subtitle}</div>}
            </div>
        </div>
    );
}
