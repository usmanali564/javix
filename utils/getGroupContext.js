export async function getGroupContext({ Javix, from, senderId }) {
  try {
    const groupMetadata = await Javix.groupMetadata(from);
    const participants = groupMetadata.participants || [];

    const adminSet = new Set(
      participants.filter(p => p.admin).map(p => p.id.toLowerCase())
    );

    const owner = groupMetadata.owner?.toLowerCase() || null;

    if (owner) adminSet.add(owner);

    return {
      isSenderAdmin: adminSet.has(senderId.toLowerCase()),
      isBotAdmin: adminSet.has(Javix.user.id.toLowerCase()),
      groupOwner: owner,
      groupAdminSet: adminSet,
      groupMetadata,
      groupParticipants: participants,
    };
  } catch (e) {
    console.warn("⚠️ Failed to get group context:", e.message);
    return {
      isSenderAdmin: false,
      isBotAdmin: false,
      groupOwner: null,
      groupAdminSet: new Set(),
      groupMetadata: null,
      groupParticipants: [],
    };
  }
}