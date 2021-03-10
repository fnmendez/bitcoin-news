import axios from "axios";

const token = process.env.TELEGRAM_TOKEN;
const chatIds = ["-1001407421921"];

const client = axios.create({
  baseURL: `https://api.telegram.org/bot${token}`,
  headers: {
    ["content-type"]: "application/json",
  },
});

export const sendMessage = async (text: string, preview = false) => {
  let sentMessages = 0;
  for (const chatId of chatIds) {
    const message = await client.post("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: !preview,
    });
    if (message) sentMessages += 1;
  }
  return chatIds.length === sentMessages;
};
