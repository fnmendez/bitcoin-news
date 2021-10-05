const token = process.env.TELEGRAM_TOKEN;

const mainChatId = "-1001407421921";
// const mainChatId = "-535034198"; // debug
const hqChatId = "-535034198";

type SendMessage = { text: string; silent: boolean };

export const sendMessage = async ({ text, silent }: SendMessage): Promise<boolean> => {
  const success = _sendMessage({ text, silent, chatId: mainChatId });
  return success;
};

export const sendLog = async ({ text, silent }: SendMessage): Promise<boolean> => {
  const success = _sendMessage({ text, silent, chatId: hqChatId });
  return success;
};

const _sendMessage = async ({ text, silent, chatId }: SendMessage & { chatId: string }): Promise<boolean> => {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        disable_notification: silent,
        disable_web_page_preview: true,
        parse_mode: "HTML",
      }),
      headers: { ["content-type"]: "application/json" },
    });
    const success = res.status >= 200 && res.status < 300;
    if (!success) {
      await sendLog({ text: `Failed to send message\n<pre>${text}</pre>`, silent: false });
    }
    return success;
  } catch (err: any) {
    await sendLog({ text: `Failed to send message: ${err.name}\n<pre>${err.stack}</pre>`, silent: false });
    return false;
  }
};
