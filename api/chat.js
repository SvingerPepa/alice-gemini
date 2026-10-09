const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const session = body?.session || {};
    const request = body?.request || {};
    const state = body?.state?.session || body?.session_state || {};

    let history = Array.isArray(state.history)
      ? state.history.filter(m =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.text === "string"
        ).slice(-10)
      : [];

    const respond = (text, savedHistory = history) =>
      res.status(200).json({
        version: "1.0",
        response: {
          text: String(text).slice(0, 700),
          end_session: false
        },
        session_state: { history: savedHistory }
      });

    if (session.new) {
      return respond("Привет! Что вас интересует?", []);
    }

    const query = String(request.command || "").trim();

    if (!query) {
      return respond("Я слушаю. Что вы хотите узнать?");
    }

    const key = process.env.DEEPSEEK_API_KEY;

    if (!key) {
      console.error("Missing DEEPSEEK_API_KEY");
      return respond("Ассистент пока не настроен. Попробуйте позже.");
    }

    const messages = [
      {
        role: "system",
        content:
          "Ты русскоязычный голосовой ассистент Алисы. " +
          "Отвечай кратко, естественно, на русском языке. " +
          "Обычно 1–3 предложения. Не используй Markdown. " +
          "Учитывай историю разговора и не выдумывай факты."
      },
      ...history.map(m => ({
        role: m.role,
        content: m.text
      })),
      { role: "user", content: query }
    ];

    const apiResponse = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: 250,
        stream: false
      }),
      signal: AbortSignal.timeout(20000)
    });

    const raw = await apiResponse.text();

    if (!apiResponse.ok) {
      console.error("DeepSeek error:", apiResponse.status, raw);
      return respond("Не удалось получить ответ от ИИ. Попробуйте позже.");
    }

    const data = JSON.parse(raw);
    const answer = data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      console.error("Empty DeepSeek answer:", raw);
      return respond("Не удалось сформировать ответ. Попробуйте ещё раз.");
    }

    history = [
      ...history,
      { role: "user", text: query },
      { role: "assistant", text: answer }
    ].slice(-10);

    return respond(answer, history);

  } catch (error) {
    console.error("Webhook error:", error.stack || error.message);

    return res.status(200).json({
      version: "1.0",
      response: {
        text: "Произошла ошибка. Попробуйте ещё раз.",
        end_session: false
      },
      session_state: { history: [] }
    });
  }
}
