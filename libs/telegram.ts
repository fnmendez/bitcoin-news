import axios from "axios";

const token = "1500529848:AAEhZp_IpYbrjGzOnbPBf1scLOZxdH_VB1g";
const chatIds = ["-487210527"];

const client = axios.create({
  baseURL: `https://api.telegram.org/bot${token}`,
  headers: {
    ["content-type"]: "application/json",
  },
});

export const sendMessage = async (text: string) => {
  let sentMessages = 0;
  for (const chatId of chatIds) {
    const message = await client.post("sendMessage", {
      chat_id: chatId,
      text,
    });
    if (message) sentMessages += 1;
  }
  return chatIds.length === sentMessages;
};
