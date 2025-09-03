import mongoose from "mongoose";

const userBanSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userNumber: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: "Unknown User",
    },
    bannedBy: {
      type: String,
      required: true,
    },
    bannedByNumber: {
      type: String,
      required: true,
    },
    bannedByName: {
      type: String,
      default: "Unknown Admin",
    },
    reason: {
      type: String,
      default: "No reason provided",
    },
    banType: {
      type: String,
      enum: ["temporary", "permanent"],
      default: "permanent",
    },
    duration: {
      type: Number,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    banLevel: {
      type: String,
      enum: ["warning", "mute", "kick", "ban"],
      default: "ban",
    },
    chatId: {
      type: String,
      default: null,
    },
    chatName: {
      type: String,
      default: null,
    },
    evidence: {
      type: String,
      default: null,
    },
    appealStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    appealReason: {
      type: String,
      default: null,
    },
    appealDate: {
      type: Date,
      default: null,
    },
    appealReviewedBy: {
      type: String,
      default: null,
    },
    appealReviewedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userBanSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
userBanSchema.index({ sessionId: 1, userNumber: 1 });
userBanSchema.index({ sessionId: 1, isActive: 1 });
userBanSchema.index({ sessionId: 1, banType: 1 });
userBanSchema.index({ sessionId: 1, expiresAt: 1 });
userBanSchema.index({ sessionId: 1, bannedBy: 1 });

userBanSchema.statics.banUser = async function (sessionId, userData, banData) {
  const { userId, userNumber, userName, bannedBy, bannedByNumber, bannedByName, reason, banType, duration, banLevel, chatId, chatName, evidence, notes } = banData;

  let expiresAt = null;
  if (banType === "temporary" && duration) {
    expiresAt = new Date(Date.now() + duration * 60 * 1000);
  }

  const existingBan = await this.findOne({ sessionId, userId, isActive: true });
  if (existingBan) {
    throw new Error("User is already banned");
  }

  return this.create({
    sessionId,
    userId,
    userNumber,
    userName,
    bannedBy,
    bannedByNumber,
    bannedByName,
    reason,
    banType,
    duration,
    expiresAt,
    banLevel,
    chatId,
    chatName,
    evidence,
    notes,
  });
};

userBanSchema.statics.unbanUser = async function (sessionId, userId, unbannedBy, unbannedByName) {
  const ban = await this.findOne({ sessionId, userId, isActive: true });
  if (!ban) {
    throw new Error("User is not banned");
  }

  ban.isActive = false;
  ban.unbannedBy = unbannedBy;
  ban.unbannedByName = unbannedByName;
  ban.unbannedAt = new Date();
  await ban.save();

  return ban;
};

userBanSchema.statics.isUserBanned = async function (sessionId, userId) {
  const ban = await this.findOne({ sessionId, userId, isActive: true });

  if (!ban) {
    return false;
  }

  if (ban.banType === "temporary" && ban.expiresAt && new Date() > ban.expiresAt) {
    ban.isActive = false;
    await ban.save();
    return false;
  }

  return ban;
};

userBanSchema.statics.getActiveBans = async function (sessionId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  await this.updateMany(
    {
      sessionId,
      isActive: true,
      banType: "temporary",
      expiresAt: { $lt: new Date() },
    },
    { isActive: false }
  );

  const bans = await this.find({ sessionId, isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(limit);

  const total = await this.countDocuments({ sessionId, isActive: true });

  return {
    bans,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

userBanSchema.statics.getUserBanHistory = async function (sessionId, userId) {
  return this.find({ sessionId, userId }).sort({ createdAt: -1 });
};

userBanSchema.statics.getBanStats = async function (sessionId) {
  const stats = await this.aggregate([
    { $match: { sessionId } },
    {
      $group: {
        _id: null,
        totalBans: { $sum: 1 },
        activeBans: { $sum: { $cond: ["$isActive", 1, 0] } },
        permanentBans: { $sum: { $cond: [{ $eq: ["$banType", "permanent"] }, 1, 0] } },
        temporaryBans: { $sum: { $cond: [{ $eq: ["$banType", "temporary"] }, 1, 0] } },
        bansByLevel: {
          $push: {
            level: "$banLevel",
            isActive: "$isActive",
          },
        },
      },
    },
  ]);

  if (stats.length === 0) {
    return {
      totalBans: 0,
      activeBans: 0,
      permanentBans: 0,
      temporaryBans: 0,
      bansByLevel: {},
    };
  }

  const result = stats[0];
  const levelStats = {};
  result.bansByLevel.forEach((ban) => {
    if (!levelStats[ban.level]) {
      levelStats[ban.level] = { total: 0, active: 0 };
    }
    levelStats[ban.level].total++;
    if (ban.isActive) {
      levelStats[ban.level].active++;
    }
  });

  return {
    totalBans: result.totalBans,
    activeBans: result.activeBans,
    permanentBans: result.permanentBans,
    temporaryBans: result.temporaryBans,
    bansByLevel: levelStats,
  };
};

userBanSchema.statics.searchBans = async function (sessionId, query) {
  return this.find({
    sessionId,
    $or: [{ userId: { $regex: query, $options: "i" } }, { userNumber: { $regex: query, $options: "i" } }, { userName: { $regex: query, $options: "i" } }, { reason: { $regex: query, $options: "i" } }],
  }).sort({ createdAt: -1 });
};

userBanSchema.statics.updateBan = async function (sessionId, userId, updates) {
  return this.findOneAndUpdate({ sessionId, userId, isActive: true }, { $set: updates }, { new: true });
};

userBanSchema.statics.appealBan = async function (sessionId, userId, appealReason) {
  const ban = await this.findOne({ sessionId, userId, isActive: true });
  if (!ban) {
    throw new Error("No active ban found for this user");
  }

  ban.appealStatus = "pending";
  ban.appealReason = appealReason;
  ban.appealDate = new Date();
  await ban.save();

  return ban;
};

userBanSchema.statics.reviewAppeal = async function (sessionId, userId, status, reviewedBy) {
  const ban = await this.findOne({ sessionId, userId, isActive: true });
  if (!ban) {
    throw new Error("No active ban found for this user");
  }

  ban.appealStatus = status;
  ban.appealReviewedBy = reviewedBy;
  ban.appealReviewedAt = new Date();

  if (status === "approved") {
    ban.isActive = false;
  }

  await ban.save();
  return ban;
};

userBanSchema.statics.cleanupExpiredBans = async function (sessionId) {
  const result = await this.updateMany(
    {
      sessionId,
      isActive: true,
      banType: "temporary",
      expiresAt: { $lt: new Date() },
    },
    { isActive: false }
  );

  return result.modifiedCount;
};

const UserBan = mongoose.model("UserBan", userBanSchema);

export default UserBan;
