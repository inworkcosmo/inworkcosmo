const admin = require('firebase-admin');

module.exports = async (req, res) => {
  // CORS setup
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    /^https:\/\/.*\.workcosmo\.in$/,
    /^http:\/\/localhost(:\d+)?$/
  ];
  
  const isAllowed = allowedOrigins.some(regex => regex.test(origin));
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialize Firebase Admin (Ensure serviceAccount is in env)
  try {
    if (!admin.apps.length) {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not defined");
      }
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (initError) {
    console.error("Firebase Admin Initialization Error:", initError);
    return res.status(500).json({ error: "Internal Server Configuration Error", details: initError.message });
  }

  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: 'Missing idToken' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Fetch user document from Firestore to inject claims
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    let claims = {};
    if (userDoc.exists) {
      const userData = userDoc.data();
      claims = {
        role: userData.role || 'Employee',
        companyId: userData.companyId || ''
      };
    }
    
    const customToken = await admin.auth().createCustomToken(uid, claims);
    return res.status(200).json({ customToken });
  } catch (error) {
    console.error('SSO Token Exchange Error:', error);
    return res.status(401).json({ error: 'Invalid ID token' });
  }
};
