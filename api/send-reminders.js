import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Match Vercel escaping
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization failed.', error);
  }
}

export default async function handler(req, res) {
  try {
    const db = admin.firestore();
    const messaging = admin.messaging();

    // Vercel Cron hits hourly. We'll grab everyone with an active switch.
    // In a fully synchronous prod environment, we would strictly map the hour against morningReminderTime.
    const usersSnap = await db.collection('users').get();
    
    let sentCount = 0;
    
    // We iterate natively rather than relying on complex sub-second firebase triggers.
    // If the top of the hour hits, check if the system timezone locally validates.
    const now = new Date();
    // Assuming IST target timezone formatting manually or just catching the exact hour mapping.
    const serverHour = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit' });

    for (const doc of usersSnap.docs) {
       const user = doc.data();
       if (!user.fcmToken) continue;

       // Parse user strings "08:00" -> "08"
       const morningHourTarget = user.morningReminderTime ? user.morningReminderTime.split(':')[0] : null;
       const eveningHourTarget = user.eveningReminderTime ? user.eveningReminderTime.split(':')[0] : null;

       if (user.morningReminderEnabled && morningHourTarget === serverHour) {
         await messaging.send({
            token: user.fcmToken,
            notification: {
              title: "Morning BP Check",
              body: "Time for your morning BP check! Log it before breakfast.",
            }
         }).catch(e => console.error("Morning Dispatch Failed:", e));
         sentCount++;
       }

       if (user.eveningReminderEnabled && eveningHourTarget === serverHour) {
         await messaging.send({
            token: user.fcmToken,
            notification: {
              title: "Evening BP Check",
              body: "Time for your evening BP check! Log it before bed.",
            }
         }).catch(e => console.error("Evening Dispatch Failed:", e));
         sentCount++;
       }
    }

    res.status(200).json({ success: true, dispatched: sentCount, processedHour: serverHour });
  } catch (error) {
    console.error("Cron function failed globally:", error);
    res.status(500).json({ success: false, error: 'Internal server fault.' });
  }
}
