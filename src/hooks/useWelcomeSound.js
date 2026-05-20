import { useRef, useCallback } from 'react';

/**
 * useWelcomeSound
 * ---------------
 * Plays a welcome audio message when a face is successfully recognized.
 *
 * Strategy:
 *   - Solution 1 (primary)  → Static MP3 file  (/audio/welcome.mp3)
 *   - Solution 2 (fallback) → Browser SpeechSynthesis API (TTS)
 *
 * Cooldown: Each recognised person has their own per-name cooldown so that
 * the same greeting is not repeated within `cooldownMs` milliseconds.
 */

const DEFAULT_COOLDOWN_MS = 10_000; // 10 seconds per person

export default function useWelcomeSound({
    /** 'mp3' | 'tts'  — choose which solution to use */
    mode = 'tts',

    /** Path to the static audio file (used when mode === 'mp3') */
    audioSrc = '/audio/welcome.mp3',

    /** Delay in ms before the sound plays */
    delayMs = 500,

    /** Minimum ms between two greetings for the *same* person */
    cooldownMs = DEFAULT_COOLDOWN_MS,

    /** BCP 47 language tag for TTS (used when mode === 'tts') */
    ttsLang = 'fr-FR',

    /** TTS speech rate (0.1 – 10) */
    ttsRate = 0.95,

    /** TTS pitch (0 – 2) */
    ttsPitch = 1.1,
} = {}) {
    /**
     * Map<personName, lastPlayedTimestamp>
     * Keeps individual cooldowns per recognised person.
     */
    const lastPlayedRef = useRef(new Map());

    // ─── Solution 1: Static MP3 ─────────────────────────────────────────────
    const playMp3 = useCallback((name) => {
        // Browser autoplay: create the Audio object, then try to play.
        // If blocked by autoplay policy we catch the error silently.
        const audio = new Audio(audioSrc);
        audio.volume = 1.0;
        const promise = audio.play();
        if (promise !== undefined) {
            promise.catch((err) => {
                console.warn(
                    '[useWelcomeSound] MP3 autoplay blocked by browser. ' +
                    'User interaction is required first. Falling back to TTS.',
                    err
                );
                // Fallback to TTS when MP3 autoplay is blocked
                speakTTS(name);
            });
        }
    }, [audioSrc]);

    // ─── Solution 2: Browser Text-to-Speech ─────────────────────────────────
    const speakTTS = useCallback((name) => {
        if (!('speechSynthesis' in window)) {
            console.warn('[useWelcomeSound] SpeechSynthesis not supported in this browser.');
            return;
        }

        window.speechSynthesis.cancel(); // cancel any in-progress utterance

        const text = name
            ? `Bonjour ${name}, bienvenue !`
            : `Bonjour, bienvenue !`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = ttsLang;
        utterance.rate = ttsRate;
        utterance.pitch = ttsPitch;
        utterance.volume = 1.0;

        // Some browsers need a small delay before speaking after cancel()
        setTimeout(() => window.speechSynthesis.speak(utterance), 100);
    }, [ttsLang, ttsRate, ttsPitch]);

    // ─── Public API ──────────────────────────────────────────────────────────
    /**
     * playWelcome(name?)
     *
     * Call this as soon as a face is successfully recognised.
     * @param {string} [name] - The recognised employee's name (optional).
     */
    const playWelcome = useCallback((name = '') => {
        const key = name.trim().toLowerCase() || '__unknown__';
        const now = Date.now();
        const lastPlayed = lastPlayedRef.current.get(key) ?? 0;

        // Cooldown guard: skip if this person was greeted recently
        if (now - lastPlayed < cooldownMs) {
            console.info(
                `[useWelcomeSound] Cooldown active for "${name}". ` +
                `${Math.ceil((cooldownMs - (now - lastPlayed)) / 1000)}s remaining.`
            );
            return;
        }

        // Record the play timestamp for this person
        lastPlayedRef.current.set(key, now);

        // Optional delay before playing
        setTimeout(() => {
            if (mode === 'mp3') {
                playMp3(name);
            } else {
                speakTTS(name);
            }
        }, delayMs);
    }, [mode, delayMs, cooldownMs, playMp3, speakTTS]);

    return { playWelcome };
}
