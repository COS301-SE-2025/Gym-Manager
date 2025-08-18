// services/api/src/notificationColtroller.ts
export async function sendPushNotification(pushToken: string, title: string, body: string) {
  if (!pushToken) return;

  const message = {
    to: pushToken,
    sound: "default",
    title,
    body,
    data: { type: "class_update" }, // you can customize this
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}
