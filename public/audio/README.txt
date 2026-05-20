SOLUTION 1 — Static MP3 File
==============================

Place your welcome audio file here and name it:

    welcome.mp3

Then in Punch.jsx, change the hook configuration to:

    const { playWelcome } = useWelcomeSound({
        mode: 'mp3',
        audioSrc: '/audio/welcome.mp3',
        delayMs: 500,
        cooldownMs: 10_000,
    });

You can generate a free MP3 using:
- https://ttsmp3.com   → Type "Bonjour, bienvenue !" → Select French voice → Download
- https://freetts.com

SOLUTION 2 — Browser Text-to-Speech (current default)
=======================================================
No file needed. The browser synthesizes speech dynamically.
This is already active with mode: 'tts' in Punch.jsx.
