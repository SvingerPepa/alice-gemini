export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({ error: "Method not allowed" });
}
const session = req.body?.session;
const history = req.body?.state?.session?.history  req.body?.state?.user?.history || [];
const message = req.body?.request?.original_utterance  "";
try {
const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  throw new Error("DEEPSEEK_API_KEY is missing");
}

const messages = [
  {
    role: "system",
    content: "Ты голосовой помощник Алисы. Отвечай на русском языке кратко и понятно. Учитывай контекст предыдущих сообщений."
  },
  ...history,
  {
    role: "user",
    content: message
  }
];

const result = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: "deepseek-flash",
    messages
  })
});

const data = await result.json();

if (!result.ok) {
  console.error("DeepSeek error:", result.status, data);
  throw new Error("DeepSeek API error: " + result.status);
}

const answer =
  data.choices?.[0]?.message?.content ||
  "Не удалось получить ответ.";

const updatedHistory = [
  ...history,
  { role: "user", content: message },
  { role: "assistant", content: answer }
].slice(-10);

return res.status(200).json({
  version: "1.0",
  session,
  response: {
    text: answer.slice(0, 1024),
    end_session: false
  },
  session_state: {
    history: updatedHistory
  }
});
} catch (error) {
console.error("Webhook error:", error);
return res.status(200).json({
  version: "1.0",
  session,
  response: {
    text: "Произошла ошибка при обращении к нейросети. Попробуйте ещё раз.",
    end_session: false
  },
  session_state: {
    history: history
  }
});
}
}
