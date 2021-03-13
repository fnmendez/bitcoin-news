import axios from "axios";

const token = process.env.TELEGRAM_TOKEN;
const mainChatId = "-1001407421921";
const hqChatId = "-535034198";

const client = axios.create({
  baseURL: `https://api.telegram.org/bot${token}`,
  headers: { ["content-type"]: "application/json" },
});

export const sendMessage = async (text: string, preview = false, silent = false) => {
  try {
    const message = await client.post("sendMessage", {
      chat_id: mainChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: !preview,
      disable_notification: silent,
    });
    const success = Boolean(message);
    if (!success) {
      await sendLog("Failed to send message", false);
    }
    return success;
  } catch (err) {
    await sendLog(`Failed to send message: ${err.name}\n\`\`\`${err.stack}\`\`\``, false);
    return false;
  }
};

export const sendLog = async (text: string, silent: boolean) => {
  const message = await client.post("sendMessage", {
    chat_id: hqChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    disable_notification: silent,
  });
  return Boolean(message);
};
