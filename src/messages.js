import {
  db,
  state,
  e,
  btn,
  area,
  formEnd,
  result,
  showDialog,
} from "./core.js";
export async function conversation(key) {
  const [needId, userId] = key.split("/");
  if (!state.user) throw Error("Please sign in to read this conversation.");
  const [rows, n] = await Promise.all([
    result(
      db
        .from("ia_messages")
        .select("*")
        .eq("need_id", needId)
        .eq("user_id", userId)
        .order("created_at"),
    ),
    result(db.from("ia_needs").select("title").eq("id", needId).maybeSingle()),
  ]);
  showDialog(
    "Conversation",
    `<p>${e(n?.title || "Support need")}</p><div class="messages">${rows.length ? rows.map((m) => `<article class="message ${m.sender_id === state.user.id ? "mine" : ""}"><small>${m.sender_id === state.user.id ? "You" : m.sender_id === userId ? "Talent" : "Organisation"} · ${e(new Date(m.created_at).toLocaleString())}</small><p class="prose">${e(m.body)}</p></article>`).join("") : '<p class="muted">Agree on scope, timing and the next step. Only the professional and organisation members can read this conversation.</p>'}</div><form data-form="message" data-id="${needId}/${userId}" class="form-grid">${area("body", "Message", "", true)}${formEnd("Send message")}</form>`,
  );
}
export const conversationButton = (need, user) =>
  btn("Conversation", "conversation", `${need}/${user}`, "secondary");
