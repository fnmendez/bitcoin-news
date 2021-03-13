import axios from "axios";

const token = process.env.TELEGRAM_TOKEN;
const mainChatId = "-1001407421921";
const hqChatId = "-535034198";

const client = axios.create({
  baseURL: `https://api.telegram.org/bot${token}`,
  headers: { ["content-type"]: "application/json" },
});

export const sendMessage = async ({ text, silent }: { text: string; silent: boolean }): Promise<boolean> => {
  try {
    const message = await client.post("sendMessage", {
      chat_id: mainChatId,
      text,
      disable_notification: silent,
      disable_web_page_preview: true,
      parse_mode: "HTML",
    });
    const success = Boolean(message);
    if (!success) {
      await sendLog({ text: "Failed to send message", silent: false });
    }
    return success;
  } catch (err) {
    await sendLog({ text: `Failed to send message: ${err.name}\n\`\`\`${err.stack}\`\`\``, silent: false });
    return false;
  }
};

export const sendLog = async ({ text, silent }: { text: string; silent: boolean }): Promise<boolean> => {
  const message = await client.post("sendMessage", {
    chat_id: hqChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    disable_notification: silent,
  });
  return Boolean(message);
};
