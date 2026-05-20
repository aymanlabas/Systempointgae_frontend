const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

// --- CONGÉS ---

router.get('/leaves', authenticate, async (req, res) => {
    try {
        const snap = await db.collection('leaves').orderBy('createdAt', 'desc').get();
        res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/leaves/:id/review', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const update = {
            status,
            reviewedBy: req.user.uid,
            reviewedAt: new Date().toISOString()
        };
        await db.collection('leaves').doc(id).update(update);
        res.json({ id, ...update });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- DÉPARTEMENTS & ÉQUIPES ---

router.get('/departments', authenticate, async (req, res) => {
    const snap = await db.collection('departments').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

router.get('/teams', authenticate, async (req, res) => {
    const snap = await db.collection('teams').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

module.exports = router;
