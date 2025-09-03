export const messages = {
  // Group-related messages
  groupOnly: "*This command only works in groups!*",
  adminOnly: "*Only admins can use this command!*",
  botAdminRequired: "*Make me admin first to perform this action!*",

  // User-related messages
  userNotFound: "*User not found in this group!*",
  cannotKickOwner: "*Cannot kick group owner!*",
  cannotKickAdmin: "*Cannot kick other admins!*",
  cannotDemoteOwner: "*Cannot demote group owner!*",
  userNotAdmin: "*User is not an admin!*",

  // Success messages
  kickSuccess: (targetName) => `✅ *User removed successfully!*\n👤 ${targetName}`,
  demoteSuccess: (targetName) => `📉 *Admin privileges removed!*\n👤 ${targetName}\n😢 Back to regular member`,

  // Error messages
  kickError: "*Failed to remove user!* Make sure I have admin rights.",
  demoteError: "*Failed to demote user!* Check permissions.",

  // Usage messages
  kickUsage: "*Usage:* !kick @user or reply to their message\n*Example:* !kick @919876543210",
  demoteUsage: "*Usage:* !demote @user or reply to their message",
};
