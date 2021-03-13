const token = process.env.TELEGRAM_TOKEN;
const DEV = process.env.VERCEL_ENV !== "production";

const mainChatId = DEV ? "-535034198" : "-1001407421921";
const hqChatId = "-535034198";

export const sendMessage = async ({ text, silent }: { text: string; silent: boolean }): Promise<boolean> => {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      body: JSON.stringify({
        chat_id: mainChatId,
        text: text,
        disable_notification: silent,
        disable_web_page_preview: true,
        parse_mode: "HTML",
      }),
      headers: { ["content-type"]: "application/json" },
    });
    const success = res.status >= 200 && res.status < 300;
    if (success) {
      await sendLog({ text: "Failed to send message", silent: false });
    }
    return success;
  } catch (err) {
    await sendLog({ text: `Failed to send message: ${err.name}\n\`\`\`${err.stack}\`\`\``, silent: false });
    return false;
  }
};

export const sendLog = async ({ text, silent }: { text: string; silent: boolean }): Promise<boolean> => {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    body: JSON.stringify({
      chat_id: hqChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      disable_notification: silent,
    }),
    headers: { ["content-type"]: "application/json" },
  });
  const success = res.status >= 200 && res.status < 300;
  return Boolean(success);
};
