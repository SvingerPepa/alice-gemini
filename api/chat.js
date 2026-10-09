export default function handler(req, res) {
  return res.status(200).json({
    version: "1.0",
    response: {
      text: "Webhook работает. Сервер Vercel доступен.",
      end_session: false
    },
    session_state: {}
  });
}
