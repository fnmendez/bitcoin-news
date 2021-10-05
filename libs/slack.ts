const webhookURL = process.env.SLACK_WEBHOOK!;

export const sendMessage = async (text: string): Promise<boolean> => {
  try {
    const res = await fetch(webhookURL, {
      method: "POST",
      body: JSON.stringify({ text, unfurl_links: false, unfurl_media: false }),
      headers: { ["content-type"]: "application/json" },
    });
    const success = res.status >= 200 && res.status < 300;
    if (!success) {
      console.log(`Failed to send message\n<pre>${text}</pre>`);
    }
    return success;
  } catch (err: any) {
    console.log(`Failed to send message: ${err.name}\n<pre>${err.stack}</pre>`);
    return false;
  }
};
