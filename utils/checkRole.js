const getUserRole = async ({ isOwner, isSelf, isGroup, isAdmin }) => {
  if (isOwner === true) return "👑 Owner";
  if (isSelf === true) return "🤖 Bot";
  if (isGroup === true && isAdmin === true) return "🛡️ Group Admin";
  if (isGroup === true) return "👥 Group Member";
  return "👤 User";
};

export default getUserRole;