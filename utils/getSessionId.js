import Session from "../models/Session.model.js";

export async function getActiveSessionId() {
  const session = await Session.findOne();
  if (session && session.sessionId) return session.sessionId;
  throw new Error("No active session found in Session collection!");
}
