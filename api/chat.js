module.exports = async function handler(req, res) { const body = req.body || {}; const version = body.version || "1.0"; const session = body.session || {};
try { const message = body.request?.original_utterance || body.request?.command || "Привет";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  return res.status(200).json({
    version,
    session,
    response: {
      text: "Не настроен ключ Gemini в Vercel.",
      end_session: false
    }
  });
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
        {
          parts: [{ text: message }]
        }
      ]
    })
  }
);

const data = await result.json();

if (!result.ok) {
  const errorMessage =
    data.error?.message || JSON.stringify(data);

  return res.status(200).json({
    version,
    session,
    response: {
      text: ("Ошибка Gemini: " + errorMessage).slice(0, 1000),
      end_session: false
    }
  });
}

const answer =
  data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("") || "Gemini не вернул ответ.";

return res.status(200).json({
  version,
  session,
  response: {
    text: answer.slice(0, 1000),
    end_session: false
  }
});
} catch (error) { return res.status(200).json({ version, session, response: { text: "Ошибка при обработке запроса.", end_session: false } }); } };
