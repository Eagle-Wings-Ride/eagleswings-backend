// utils/notifications.js
const admin = require('../firebaseAdmin');
const User = require('../models/User'); // your mongoose model

// Single token
async function sendToToken(token, title, body, data = {}) {
  const message = {
    token,
    notification: { title, body },
    data: { ...data },
    android: { priority: 'high', notification: { sound: 'default' } },
    apns: { payload: { aps: { sound: 'default' } } }
  };
  return admin.messaging().send(message);
}

// Multiple tokens (up to 500)
async function sendToTokens(tokens = [], title, body, data = {}) {
  if (!tokens.length) return { successCount: 0, failureCount: 0 };
  const message = {
    tokens,
    notification: { title, body },
    data: { ...data },
  };

  const res = await admin.messaging().sendMulticast(message);
  // Remove invalid tokens
  for (let i = 0; i < res.responses.length; i++) {
    if (!res.responses[i].success) {
      const err = res.responses[i].error;
      if (err && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(err.code)) {
        // Remove token from that user's document only
        await User.updateOne({ fcmTokens: tokens[i] }, { $pull: { fcmTokens: tokens[i] } });
        console.log(`Removed invalid token: ${tokens[i]}`);
      }
    }
  }

  return { successCount: res.successCount, failureCount: res.failureCount, responses: res.responses };
}

// Topic
async function sendToTopic(topic, title, body, data = {}) {
  const message = { topic, notification: { title, body }, data };
  return admin.messaging().send(message);
}

module.exports = { sendToToken, sendToTokens, sendToTopic };
