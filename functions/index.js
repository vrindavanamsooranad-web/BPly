const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Natively initializes using Google's internal service accounts automatically. 
// Requires zero manual private keys to manage.
admin.initializeApp();
const db = admin.firestore();

exports.sendScheduledReminders = onSchedule("* * * * *", async (event) => {
    // Execute precisely every single minute of the day natively on the backend server time
    const now = new Date();
    
    // Parse pure mechanical server time matching the exact `<input type="time">` syntax: "HH:mm"
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMin = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;

    console.log(`Cron Ping -> Execution Engine Time: ${currentTimeStr}`);

    try {
        // Query exclusively users storing an active FCM Token
        const usersRef = db.collection("users");
        const snapshot = await usersRef.where("fcmToken", "!=", null).get();

        if (snapshot.empty) {
            console.log("No active notification subcriptions found in database.");
            return;
        }

        const messagingPromises = [];

        snapshot.forEach((doc) => {
            const userData = doc.data();
            const token = userData.fcmToken;
            const reminders = userData.reminders;

            if (!reminders || !token) return;

            // Morning Matrix Filter
            if (reminders.morning?.enabled && reminders.morning?.time === currentTimeStr) {
                console.log(`Dispatched Morning Payload -> User ID: ${doc.id}`);
                const payload = {
                    notification: {
                        title: "Morning BP Check",
                        body: "Time for your morning BP check! Log it before breakfast."
                    },
                    token: token
                };
                messagingPromises.push(admin.messaging().send(payload));
            }

            // Evening Matrix Filter
            if (reminders.evening?.enabled && reminders.evening?.time === currentTimeStr) {
                console.log(`Dispatched Evening Payload -> User ID: ${doc.id}`);
                const payload = {
                    notification: {
                        title: "Evening BP Check",
                        body: "Time for your evening BP check! Log it before bed."
                    },
                    token: token
                };
                messagingPromises.push(admin.messaging().send(payload));
            }
        });

        // Resolve payload distribution in parallel optimally
        if (messagingPromises.length > 0) {
            const results = await Promise.allSettled(messagingPromises);
            console.log(`Attempted execution of ${results.length} individual Firebase Cloud Messages.`);
            results.forEach((res, index) => {
                if (res.status === 'rejected') {
                    console.error(`Payload Transmission Failed [Index ${index}]:`, res.reason);
                }
            });
        }

    } catch (error) {
        console.error("Critical Runtime Error scraping user collection:", error);
    }
});
