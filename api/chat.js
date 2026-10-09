const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";
const MAX_HISTORY = 10;

function reply(res, text, history = []) {
  return res.status(200).json({
    version: "1.0",
    response: {
      text: String(text).slice(0, 700),
      end_session: false
    },
    session_state: { history }
  });
}

async function askDeepSeek(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 250,
      stream: false
    }),
    signal: AbortSignal.timeout(20000)
  });

  const raw = await response.text();

  if (!response.ok) {
    console.error("DeepSeek API error:", response.status, raw);
    throw new Error(`DeepSeek HTTP ${response.status}`);
  }

  const data = JSON.parse(raw);
  const answer = data.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("DeepSeek returned an empty response");
  }

  return answer.slice(0, 700);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        error: "Invalid request body"
      });
    }

    const session = body.session || {};
    const request = body.request || {};

    const previousState =
      body.state?.session ||
      body.session_state ||
      {};

    let history = Array.isArray(previousState.history)
      ? previousState.history
          .filter(item =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.text === "string"
          )
          .slice(-MAX_HISTORY)
      : [];

    if (session.new) {
      return reply(
        res,
        "Привет! Я готова помочь. Что вас интересует?",
        []
      );
    }

    const query = String(request.command || "").trim();

    if (!query) {
      return reply(
        res,
        "Я слушаю. Что вы хотите узнать?",
        history
      );
    }

    const messages = [
      {
        role: "system",
        content:
          "Ты — русскоязычный голосовой ассистент Яндекс Алисы. " +
          "Отвечай кратко, дружелюбно и естественно, обычно в 1–3 " +
          "предложениях. Не используй Markdown и эмодзи. " +
          "Учитывай контекст предыдущих сообщений. " +
          "Не выдумывай факты, если не знаешь ответа."
      },
      ...history.map(item => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.text
      })),
      {
        role: "user",
        content: query
      }
    ];

    const answer = await askDeepSeek(messages);

    history = [
      ...history,
      { role: "user", text: query },
      { role: "assistant", text: answer }
    ].slice(-MAX_HISTORY);

    return reply(res, answer, history);

  } catch (error) {
    console.error(
      "Webhook error:",
      error.stack || error.message
    );

    return reply(
      res,
      "Извините, сейчас не удалось получить ответ. Попробуйте ещё раз.",
      []
    );
  }
}
