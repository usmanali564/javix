import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    number: { type: String, required: true },
    role: { type: String, enum: ["moderator", "admin"], required: true },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
    permissions: {
      ban: { type: Boolean, default: true },
      kick: { type: Boolean, default: true },
      mute: { type: Boolean, default: true },
      warn: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      pin: { type: Boolean, default: true },
      groupSettings: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
    lastActive: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Compound unique indexes for session-aware uniqueness
roleSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
roleSchema.index({ sessionId: 1, number: 1 }, { unique: true });
roleSchema.index({ sessionId: 1, role: 1 });

// Static method to get all moderators for a session
roleSchema.statics.getAllModerators = async function (sessionId) {
  return this.find({ sessionId, role: "moderator", isActive: true });
};

// Static method to get all admins for a session
roleSchema.statics.getAllAdmins = async function (sessionId) {
  return this.find({ sessionId, role: "admin", isActive: true });
};

// Static method to check if user is moderator in a session
roleSchema.statics.isModerator = async function (sessionId, userId) {
  const user = await this.findOne({ sessionId, userId, isActive: true });
  return user && user.role === "moderator";
};

// Static method to check if user is admin in a session
roleSchema.statics.isAdmin = async function (sessionId, userId) {
  const user = await this.findOne({ sessionId, userId, isActive: true });
  return user && user.role === "admin";
};

// Static method to add new moderator for a session
roleSchema.statics.addModerator = async function (sessionId, userId, number, addedBy) {
  const existingUser = await this.findOne({ sessionId, userId });
  if (existingUser) {
    throw new Error("User already has a role in this session");
  }

  return this.create({
    sessionId,
    userId,
    number,
    role: "moderator",
    addedBy,
  });
};

// Static method to add new admin for a session
roleSchema.statics.addAdmin = async function (sessionId, userId, number, addedBy) {
  const existingUser = await this.findOne({ sessionId, userId });
  if (existingUser) {
    throw new Error("User already has a role in this session");
  }

  return this.create({
    sessionId,
    userId,
    number,
    role: "admin",
    addedBy,
  });
};

// Static method to remove role from a session
roleSchema.statics.removeRole = async function (sessionId, userId) {
  return this.findOneAndDelete({ sessionId, userId });
};

// Static method to update permissions for a session
roleSchema.statics.updatePermissions = async function (sessionId, userId, permissions) {
  return this.findOneAndUpdate({ sessionId, userId }, { $set: { permissions } }, { new: true });
};

// Static method to deactivate role in a session
roleSchema.statics.deactivateRole = async function (sessionId, userId) {
  return this.findOneAndUpdate({ sessionId, userId }, { $set: { isActive: false } }, { new: true });
};

// Static method to reactivate role in a session
roleSchema.statics.reactivateRole = async function (sessionId, userId) {
  return this.findOneAndUpdate({ sessionId, userId }, { $set: { isActive: true, lastActive: new Date() } }, { new: true });
};

// Static method to update last active in a session
roleSchema.statics.updateLastActive = async function (sessionId, userId) {
  return this.findOneAndUpdate({ sessionId, userId }, { $set: { lastActive: new Date() } }, { new: true });
};

// Static method to get user's permissions in a session
roleSchema.statics.getUserPermissions = async function (sessionId, userId) {
  const user = await this.findOne({ sessionId, userId, isActive: true });
  return user ? user.permissions : null;
};

// Static method to check specific permission in a session
roleSchema.statics.hasPermission = async function (sessionId, userId, permission) {
  const user = await this.findOne({ sessionId, userId, isActive: true });
  return user ? user.permissions[permission] : false;
};

// Static method to get role info in a session
roleSchema.statics.getRoleInfo = async function (sessionId, userId) {
  return this.findOne({ sessionId, userId, isActive: true });
};

// Static method to get all roles with pagination for a session
roleSchema.statics.getAllRoles = async function (sessionId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const roles = await this.find({ sessionId, isActive: true }).sort({ addedAt: -1 }).skip(skip).limit(limit);
  const total = await this.countDocuments({ sessionId, isActive: true });

  return {
    roles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// Static method to search roles in a session
roleSchema.statics.searchRoles = async function (sessionId, query) {
  return this.find({
    sessionId,
    $or: [{ userId: { $regex: query, $options: "i" } }, { number: { $regex: query, $options: "i" } }],
    isActive: true,
  });
};

const Role = mongoose.model("Role", roleSchema);

export default Role;
