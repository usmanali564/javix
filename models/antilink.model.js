import mongoose from "mongoose";

const antilinkSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },
    groupId: {
      type: String,
      required: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      enum: ["delete", "kick", "warn"],
      default: "delete",
    },
    linkPatterns: {
      type: [String],
      default: ["https://", "http://", "www.", ".com", ".net", ".org", ".io", "youtube.com", "youtu.be", "instagram.com", "fb.com", "facebook.com", "twitter.com", "x.com", "tiktok.com", "whatsapp.com", "chat.whatsapp.com", "telegram.me", "t.me", "discord.gg"],
    },
    whitelist: {
      type: [String],
      default: [],
    },
    exceptions: {
      admins: { type: Boolean, default: true },
      moderators: { type: Boolean, default: true },
      groupLinks: { type: Boolean, default: true },
    },
    lastAction: {
      type: Date,
      default: Date.now,
    },
    stats: {
      linksDeleted: { type: Number, default: 0 },
      usersKicked: { type: Number, default: 0 },
      warningsSent: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

antilinkSchema.index({ sessionId: 1, groupId: 1 }, { unique: true });

antilinkSchema.statics.getGroupSettings = async function (userId, groupId) {
  try {
    const sessionId = userId.split(":")[0];
    let settings = await this.findOne({ sessionId, groupId });

    if (!settings) {
      settings = new this({
        sessionId,
        groupId,
        enabled: false,
        mode: "delete",
        linkPatterns: ["https://", "http://", "www.", ".com", ".net", ".org", ".io", "youtube.com", "youtu.be", "instagram.com", "fb.com", "facebook.com", "twitter.com", "x.com", "tiktok.com", "whatsapp.com", "chat.whatsapp.com", "telegram.me", "t.me", "discord.gg"],
        whitelist: [],
        exceptions: {
          admins: true,
          moderators: true,
          groupLinks: true,
        },
        lastAction: new Date(),
        stats: {
          linksDeleted: 0,
          usersKicked: 0,
          warningsSent: 0,
        },
      });

      try {
        await settings.save();
      } catch (saveError) {
        if (saveError.code === 11000) {
          return await this.findOne({ sessionId, groupId });
        }
        throw saveError;
      }
    }

    return settings;
  } catch (error) {
    console.error("Error in getGroupSettings:", error);
    return {
      enabled: false,
      mode: "delete",
      linkPatterns: [],
      whitelist: [],
      exceptions: { admins: true, moderators: true, groupLinks: true },
      stats: { linksDeleted: 0, usersKicked: 0, warningsSent: 0 },
    };
  }
};

antilinkSchema.statics.updateSettings = async function (userId, groupId, update) {
  try {
    const sessionId = userId.split(":")[0];

    let setUpdate = {};
    let incUpdate = {};

    for (const [key, value] of Object.entries(update)) {
      if (key === "$inc") {
        incUpdate = { ...incUpdate, ...value };
      } else {
        setUpdate[key] = value;
      }
    }

    const finalUpdate = {};
    if (Object.keys(setUpdate).length > 0) {
      finalUpdate.$set = setUpdate;
    }
    if (Object.keys(incUpdate).length > 0) {
      finalUpdate.$inc = incUpdate;
    }

    const result = await this.findOneAndUpdate({ sessionId, groupId }, finalUpdate, { new: true, upsert: true, runValidators: true });

    if (!result) {
      const newSettings = new this({
        sessionId,
        groupId,
        ...update,
        linkPatterns: update.linkPatterns || ["https://", "http://", "www.", ".com", ".net", ".org", ".io", "youtube.com", "youtu.be", "instagram.com", "fb.com", "facebook.com", "twitter.com", "x.com", "tiktok.com", "whatsapp.com", "chat.whatsapp.com", "telegram.me", "t.me", "discord.gg"],
        whitelist: update.whitelist || [],
        exceptions: update.exceptions || {
          admins: true,
          moderators: true,
          groupLinks: true,
        },
        stats: update.stats || {
          linksDeleted: 0,
          usersKicked: 0,
          warningsSent: 0,
        },
      });

      return await newSettings.save();
    }

    return result;
  } catch (error) {
    console.error("Error in updateSettings:", error);

    if (error.code === 11000) {
      return await this.findOne({ sessionId: userId.split(":")[0], groupId });
    }

    try {
      const basicSettings = new this({
        sessionId: userId.split(":")[0],
        groupId,
        enabled: false,
        mode: "delete",
        linkPatterns: ["https://", "http://", "www.", ".com", ".net", ".org", ".io", "youtube.com", "youtu.be", "instagram.com", "fb.com", "facebook.com", "twitter.com", "x.com", "tiktok.com", "whatsapp.com", "chat.whatsapp.com", "telegram.me", "t.me", "discord.gg"],
        whitelist: [],
        exceptions: { admins: true, moderators: true, groupLinks: true },
        stats: { linksDeleted: 0, usersKicked: 0, warningsSent: 0 },
      });

      return await basicSettings.save();
    } catch (fallbackError) {
      console.error("Fallback error in updateSettings:", fallbackError);
      return {
        enabled: false,
        mode: "delete",
        linkPatterns: [],
        whitelist: [],
        exceptions: { admins: true, moderators: true, groupLinks: true },
        stats: { linksDeleted: 0, usersKicked: 0, warningsSent: 0 },
      };
    }
  }
};

antilinkSchema.statics.isLinkAllowed = async function (userId, groupId, url, userRole) {
  try {
    const sessionId = userId.split(":")[0];

    const settings = await this.findOne({ sessionId, groupId });

    if (!settings || !settings.enabled) return true;

    if (settings.exceptions?.admins && (userRole === "admin" || userRole === "moderator")) {
      return true;
    }

    if (settings.whitelist && settings.whitelist.some((pattern) => url.includes(pattern))) {
      return true;
    }

    if (settings.linkPatterns && settings.linkPatterns.some((pattern) => url.includes(pattern))) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in isLinkAllowed:", error);
    return true;
  }
};

antilinkSchema.statics.updateOne = async function (query, update) {
  try {
    return await this.findOneAndUpdate(query, update, { new: true });
  } catch (error) {
    console.error("Error in updateOne:", error);
    return null;
  }
};

const AntiLink = mongoose.model("AntiLink", antilinkSchema);

export default AntiLink;
