import mongoose from "mongoose";
import Role from "./role.model.js";
import config from "#config";

const botmodeSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["public", "private", "restricted"],
      default: "public",
    },
    groupOnly: {
      type: Boolean,
      default: false,
    },
    sessionInfo: {
      type: Object,
      default: {
        lastModeChange: null,
        lastGroupOnlyChange: null,
        updatedAt: null,
      },
    },
  },
  { timestamps: true }
);

// Create index with a unique name to avoid conflicts
botmodeSchema.index({ sessionId: 1 }, { unique: true, name: "botmode_sessionId_idx" });

botmodeSchema.statics.getOrCreateMode = async function (sessionId) {
  let botmode = await this.findOne({ sessionId });

  if (!botmode) {
    botmode = new this({
      sessionId,
      mode: "public", // Default to public mode
      sessionInfo: {
        lastModeChange: null,
        lastGroupOnlyChange: null,
        updatedAt: null,
      },
    });
    await botmode.save();
  }

  return botmode;
};

botmodeSchema.statics.updateMode = async function (sessionId, newMode) {
  const mode = (await this.findOne({ sessionId })) || (await this.create({ sessionId }));

  // Store previous mode for history
  const previousMode = mode.mode;

  // Update mode and session info
  mode.mode = newMode;
  mode.sessionInfo = {
    lastModeChange: new Date(),
    lastGroupOnlyChange: mode.sessionInfo.lastGroupOnlyChange,
    updatedAt: new Date(),
  };

  await mode.save();
  return mode;
};

botmodeSchema.statics.fixInvalidModes = async function (sessionId) {
  const mode = await this.findOne({ sessionId });
  if (mode && !["public", "private", "restricted"].includes(mode.mode)) {
    mode.mode = "public"; // Default to public mode if invalid
    mode.sessionInfo = {
      ...mode.sessionInfo,
      lastModeChange: new Date(),
      updatedAt: new Date(),
    };
    await mode.save();
  }
  return mode;
};

botmodeSchema.statics.getCurrentMode = async function (sessionId) {
  const mode = (await this.findOne({ sessionId })) || (await this.create({ sessionId }));
  if (!["public", "private", "restricted"].includes(mode.mode)) {
    await this.fixInvalidModes(sessionId);
    return this.findOne({ sessionId });
  }
  return mode;
};

botmodeSchema.statics.toggleGroupOnly = async function (sessionId) {
  const mode = (await this.findOne({ sessionId })) || (await this.create({ sessionId }));
  mode.groupOnly = !mode.groupOnly;
  mode.sessionInfo = {
    ...mode.sessionInfo,
    lastGroupOnlyChange: new Date(),
    updatedAt: new Date(),
  };
  await mode.save();
  return mode;
};

botmodeSchema.methods.canInteract = async function (senderNumber, isGroup = false, isSelf = false) {
  const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber];
  const isOwner = ownerNumbers.includes(senderNumber);

  if (isSelf || isOwner) {
    return true;
  }

  const isAdmin = await Role.isAdmin(this.sessionId, senderNumber);

  const isModerator = await Role.isModerator(this.sessionId, senderNumber);

  switch (this.mode) {
    case "public":
      // In public mode, everyone can access
      return true;

    case "private":
      // In private mode, only owners can access
      return isOwner;

    case "restricted":
      // In restricted mode, only owners and moderators can access
      return isOwner || isModerator;

    default:
      return false;
  }
};

botmodeSchema.methods.getAccessLevel = async function (senderNumber) {
  if (await Role.isAdmin(this.sessionId, senderNumber)) return "admin";
  if (await Role.isModerator(this.sessionId, senderNumber)) return "moderator";
  return "user";
};

const BotMode = mongoose.model("BotMode", botmodeSchema);

export default BotMode;
