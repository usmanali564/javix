import mongoose from 'mongoose';

const mentionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    default: 'Unknown',
    trim: true
  },
  userNumber: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  message: {
    type: String,
    default: '',
    trim: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'sticker', 'document', 'audio', 'other'],
    default: 'text'
  },
  chatId: {
    type: String,
    required: true
  },
  chatName: {
    type: String,
    default: 'Unknown',
    trim: true
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  groupRole: {
    type: String,
    enum: ['admin', 'member', 'unknown'],
    default: 'unknown'
  }
});

const AFKSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userNumber: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    default: 'AFK',
    trim: true,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isAFK: {
    type: Boolean,
    default: true
  },
  mentionedBy: [mentionSchema],
  notifyOwner: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  settings: {
    notifyOnMention: {
      type: Boolean,
      default: true
    },
    notifyOnDM: {
      type: Boolean,
      default: true
    },
    notifyOnGroup: {
      type: Boolean,
      default: true
    },
    autoReply: {
      type: Boolean,
      default: true
    },
    customReply: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500
    },
    autoReturn: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: {
        type: Number,
        default: 60
      }
    },
    mentionLimit: {
      enabled: {
        type: Boolean,
        default: false
      },
      maxMentions: {
        type: Number,
        default: 10
      }
    }
  },
  stats: {
    totalMentions: {
      type: Number,
      default: 0
    },
    uniqueMentioners: {
      type: Number,
      default: 0
    },
    uniqueChats: {
      type: Number,
      default: 0
    },
    lastMention: {
      type: Date
    },
    firstMention: {
      type: Date
    },
    mentionHistory: [{
      timestamp: Date,
      userId: String,
      userName: String,
      chatId: String,
      messageType: String
    }]
  }
}, {
  timestamps: true
});

AFKSchema.index({ userId: 1 }, { unique: true });

AFKSchema.index({ isAFK: 1, timestamp: -1 });
AFKSchema.index({ userNumber: 1, isAFK: 1 });

AFKSchema.statics.getAFKStatus = async function(userId) {
  if (!userId) throw new Error('User ID is required');
  return this.findOne({ userId, isAFK: true });
};

AFKSchema.statics.setAFKStatus = async function(userId, userData, reason = 'AFK') {
  if (!userId) throw new Error('User ID is required');
  if (!userData?.userName) throw new Error('User name is required');
  
  const userNumber = userId.split('@')[0];
  
  return this.findOneAndUpdate(
    { userId },
    { 
      userNumber,
      userName: userData.userName.trim(),
      reason: reason.trim(),
      timestamp: new Date(),
      isAFK: true,
      mentionedBy: [],
      lastUpdated: new Date(),
      stats: {
        totalMentions: 0,
        uniqueMentioners: 0,
        uniqueChats: 0
      }
    },
    { upsert: true, new: true }
  );
};

AFKSchema.statics.removeAFKStatus = async function(userId) {
  if (!userId) throw new Error('User ID is required');
  
  return this.findOneAndUpdate(
    { userId },
    { 
      isAFK: false,
      lastUpdated: new Date()
    },
    { new: true }
  );
};

AFKSchema.statics.addMention = async function(userId, mentionData) {
  if (!userId) throw new Error('User ID is required');
  
  const mentionLimitReached = await this.checkMentionLimit(userId);
  if (mentionLimitReached) {
    throw new Error('Mention limit reached');
  }
  
  const shouldAutoReturn = await this.checkAutoReturn(userId);
  if (shouldAutoReturn) {
    throw new Error('Auto return triggered');
  }
  
  if (!mentionData || typeof mentionData !== 'object') {
    mentionData = {};
  }
  
  const userNumber = mentionData.userId?.split('@')[0] || 'unknown';
  
  const mention = {
    userId: mentionData.userId || 'unknown',
    userNumber,
    userName: mentionData.userName?.trim() || 'Unknown User',
    timestamp: new Date(),
    message: mentionData.message?.trim() || '',
    messageType: mentionData.messageType || 'text',
    chatId: mentionData.chatId || 'unknown',
    chatName: mentionData.chatName?.trim() || 'Unknown Chat',
    isGroup: mentionData.isGroup || false,
    groupRole: mentionData.groupRole || 'unknown'
  };
  
  const update = {
    $push: { mentionedBy: mention },
    $inc: { 'stats.totalMentions': 1 },
    lastUpdated: new Date()
  };
  
  const afkStatus = await this.findOne({ userId, isAFK: true });
  if (!afkStatus.stats.firstMention) {
    update.$set = { 'stats.firstMention': new Date() };
  }
  
  update.$set = { ...update.$set, 'stats.lastMention': new Date() };
  
  const uniqueMentioners = new Set([...afkStatus.mentionedBy.map(m => m.userId), mention.userId]).size;
  const uniqueChats = new Set([...afkStatus.mentionedBy.map(m => m.chatId), mention.chatId]).size;
  
  update.$set = {
    ...update.$set,
    'stats.uniqueMentioners': uniqueMentioners,
    'stats.uniqueChats': uniqueChats
  };
  
  return this.findOneAndUpdate(
    { userId, isAFK: true },
    update,
    { new: true }
  );
};

AFKSchema.statics.getAllAFKUsers = async function(limit = 10, skip = 0) {
  return this.find({ isAFK: true })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
};

AFKSchema.statics.isUserAFK = async function(userId) {
  if (!userId) throw new Error('User ID is required');
  const afkStatus = await this.findOne({ userId, isAFK: true });
  return !!afkStatus;
};

AFKSchema.statics.getMentionHistory = async function(userId, limit = 10) {
  const afkStatus = await this.findOne({ userId, isAFK: true });
  if (!afkStatus) return [];
  
  return afkStatus.stats.mentionHistory
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

AFKSchema.statics.getMentionStats = async function(userId) {
  const afkStatus = await this.findOne({ userId, isAFK: true });
  if (!afkStatus) return null;
  
  const stats = afkStatus.stats;
  const timeAway = Date.now() - afkStatus.timestamp;
  
  return {
    ...stats,
    timeAway,
    timeAwayFormatted: formatTimeDuration(timeAway),
    mentionLimit: afkStatus.settings.mentionLimit,
    autoReturn: afkStatus.settings.autoReturn
  };
};

AFKSchema.statics.cleanupOldRecords = async function(maxAge = 7 * 24 * 60 * 60 * 1000) {
  const cutoffDate = new Date(Date.now() - maxAge);
  return this.deleteMany({
    isAFK: false,
    lastUpdated: { $lt: cutoffDate }
  });
};

AFKSchema.statics.checkAutoReturn = async function(userId) {
  const afkStatus = await this.findOne({ userId, isAFK: true });
  if (!afkStatus || !afkStatus.settings.autoReturn.enabled) return false;
  
  const timeAway = Date.now() - afkStatus.timestamp;
  const autoReturnTime = afkStatus.settings.autoReturn.duration * 60 * 1000;
  
  if (timeAway >= autoReturnTime) {
    await this.removeAFKStatus(userId);
    return true;
  }
  return false;
};

AFKSchema.statics.checkMentionLimit = async function(userId) {
  const afkStatus = await this.findOne({ userId, isAFK: true });
  if (!afkStatus || !afkStatus.settings.mentionLimit.enabled) return false;
  
  return afkStatus.stats.totalMentions >= afkStatus.settings.mentionLimit.maxMentions;
};

const AFK = mongoose.model('AFK', AFKSchema);

export default AFK; 