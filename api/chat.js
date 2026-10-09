module.exports = async function handler(req, res) { const body = req.body  {}; const version = body.version  "1.0"; const session = body.session || {};
if (req.method !== "POST") { return res.status(200).json({ version, session, response: { text: "Отправь мне вопрос.", end_session: false } }); }
try { const message = body.request?.original_utterance  body.request?.command  "Поздоровайся и кратко расскажи, что умеешь.";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing API key");
}

const result = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: message }] }
      ]
    })
  }
);

const data = await result.json();

const answer = result.ok
  ? data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("") || "Не удалось получить ответ."
  : "Ошибка обращения к Gemini. Попробуй ещё раз.";

return res.status(200).json({
  version,
  session,
  response: {
    text: answer.slice(0, 1000),
    end_session: false
  }
});
} catch (error) { return res.status(200).json({ version, session, response: { text: "Не удалось обработать запрос. Попробуй ещё раз.", end_session: false } }); } };
