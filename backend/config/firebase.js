const admin = require('firebase-admin');

// Note: Pour une utilisation réelle, téléchargez votre fichier serviceAccountKey.json 
// depuis la console Firebase (Paramètres du projet > Comptes de service)
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : null;

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    // Fallback pour le développement local si pas de clé JSON (utilise les variables d'auth Google si dispo)
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'projet-hr'
    });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
