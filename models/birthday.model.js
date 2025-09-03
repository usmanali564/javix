import mongoose from "mongoose";

const wishSchema = new mongoose.Schema({
  year: Number,
  message: String,
  timestamp: { type: Date, default: Date.now },
  wishedBy: String,
  status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date, default: Date.now },
  errorMessage: String,
  sentTo: [
    {
      type: { type: String, enum: ["group", "private"] },
      targetId: String,
      targetName: String,
      status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
      attempts: { type: Number, default: 0 },
      lastAttempt: { type: Date, default: Date.now },
      errorMessage: String,
      sentAt: Date,
    },
  ],
});

const reminderSchema = new mongoose.Schema({
  year: Number,
  type: { type: String, enum: ["birthday_reminder", "wish_reminder"], required: true },
  daysUntil: Number,
  status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date, default: Date.now },
  errorMessage: String,
  sentAt: Date,
  sentTo: [
    {
      type: { type: String, enum: ["owner", "group", "private"] },
      targetId: String,
      targetName: String,
      status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
      attempts: { type: Number, default: 0 },
      lastAttempt: { type: Date, default: Date.now },
      errorMessage: String,
      sentAt: Date,
    },
  ],
});

const groupInfoSchema = new mongoose.Schema({
  groupId: String,
  groupName: String,
  groupDescription: String,
  groupSize: Number,
  setAt: { type: Date, default: Date.now },
});

const birthdaySchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    number: { type: String, required: true },
    date: { type: Date, required: true },
    age: { type: Number, required: true },
    notifications: { type: Boolean, default: true },
    customMessage: { type: String, default: "Happy Birthday, {name}! 🎉" },
    privacy: { type: String, enum: ["public", "friends", "private"], default: "public" },
    theme: { type: String, enum: ["default", "minimal", "fun", "formal"], default: "default" },
    reminderDays: { type: [Number], default: [1, 7, 30] },
    wishes: [wishSchema],
    reminders: [reminderSchema],
    totalWishes: { type: Number, default: 0 },
    totalReminders: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },

    chatType: { type: String, enum: ["group", "private"], required: true },
    setInGroup: { type: Boolean, default: false },
    groups: [groupInfoSchema],
    setInPrivate: { type: Boolean, default: false },
    privateChatInfo: {
      setAt: { type: Date, default: Date.now },
      userNumber: String,
    },

    wishInGroups: { type: Boolean, default: true },
    wishInPrivate: { type: Boolean, default: true },
    wishInAllGroups: { type: Boolean, default: false },
    preferredGroups: [String],
    excludedGroups: [String],

    todayWishStatus: {
      status: { type: String, enum: ["pending", "sent", "failed", "completed"], default: "pending" },
      attempts: { type: Number, default: 0 },
      lastAttempt: { type: Date, default: Date.now },
      nextRetry: { type: Date, default: Date.now },
      maxAttempts: { type: Number, default: 5 },
      retryInterval: { type: Number, default: 30 * 60 * 1000 },
      completedAt: Date,
      errorMessage: String,
    },

    todayReminderStatus: {
      status: { type: String, enum: ["pending", "sent", "failed", "completed"], default: "pending" },
      attempts: { type: Number, default: 0 },
      lastAttempt: { type: Date, default: Date.now },
      nextRetry: { type: Date, default: Date.now },
      maxAttempts: { type: Number, default: 3 },
      retryInterval: { type: Number, default: 60 * 60 * 1000 },
      completedAt: Date,
      errorMessage: String,
    },
  },
  {
    timestamps: true,
  }
);

birthdaySchema.index({ sessionId: 1, userId: 1 }, { unique: true });
birthdaySchema.index({
  sessionId: 1,
  "todayWishStatus.status": 1,
  "todayWishStatus.nextRetry": 1,
});
birthdaySchema.index({
  sessionId: 1,
  "todayReminderStatus.status": 1,
  "todayReminderStatus.nextRetry": 1,
});

birthdaySchema.virtual("nextBirthday").get(function () {
  const today = new Date();
  const nextBirthday = new Date(this.date);
  nextBirthday.setFullYear(today.getFullYear());
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  return nextBirthday;
});

birthdaySchema.statics.getUpcomingBirthdays = async function (sessionId, days = 30) {
  if (!sessionId) throw new Error("Session ID is required");
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  return this.find({
    sessionId,
    $expr: {
      $and: [{ $gte: [{ $month: "$date" }, today.getMonth() + 1] }, { $lte: [{ $month: "$date" }, futureDate.getMonth() + 1] }, { $gte: [{ $dayOfMonth: "$date" }, today.getDate()] }, { $lte: [{ $dayOfMonth: "$date" }, futureDate.getDate()] }],
    },
  });
};

birthdaySchema.statics.getTodaysBirthdays = async function (sessionId) {
  if (!sessionId) throw new Error("Session ID is required");
  const today = new Date();
  return this.find({
    sessionId,
    $expr: {
      $and: [{ $eq: [{ $month: "$date" }, today.getMonth() + 1] }, { $eq: [{ $dayOfMonth: "$date" }, today.getDate()] }],
    },
  });
};

birthdaySchema.statics.getPendingWishes = async function (sessionId) {
  if (!sessionId) throw new Error("Session ID is required");
  const now = new Date();
  return this.find({
    sessionId,
    "todayWishStatus.status": { $in: ["pending", "failed"] },
    "todayWishStatus.nextRetry": { $lte: now },
    "todayWishStatus.attempts": { $lt: "$todayWishStatus.maxAttempts" },
  });
};

birthdaySchema.statics.getPendingReminders = async function (sessionId) {
  if (!sessionId) throw new Error("Session ID is required");
  const now = new Date();
  return this.find({
    sessionId,
    "todayReminderStatus.status": { $in: ["pending", "failed"] },
    "todayReminderStatus.nextRetry": { $lte: now },
    "todayReminderStatus.attempts": { $lt: "$todayReminderStatus.maxAttempts" },
  });
};

birthdaySchema.methods.addWish = async function (wishData) {
  this.wishes.push(wishData);
  this.totalWishes++;
  await this.save();
};

birthdaySchema.methods.addReminder = async function (reminderData) {
  this.reminders.push(reminderData);
  this.totalReminders++;
  await this.save();
};

birthdaySchema.methods.updateStreak = async function () {
  const today = new Date();
  const lastBirthday = new Date(this.date);
  lastBirthday.setFullYear(today.getFullYear() - 1);
  if (today.getMonth() === this.date.getMonth() && today.getDate() === this.date.getDate()) {
    this.streak++;
    await this.save();
  }
};

birthdaySchema.methods.addGroup = async function (groupInfo) {
  const existingGroup = this.groups.find((g) => g.groupId === groupInfo.groupId);
  if (!existingGroup) {
    this.groups.push(groupInfo);
    this.setInGroup = true;
    await this.save();
  }
};

birthdaySchema.methods.removeGroup = async function (groupId) {
  this.groups = this.groups.filter((g) => g.groupId !== groupId);
  if (this.groups.length === 0) {
    this.setInGroup = false;
  }
  await this.save();
};

birthdaySchema.methods.setPrivateChatInfo = async function (userNumber) {
  this.privateChatInfo = {
    setAt: new Date(),
    userNumber: userNumber,
  };
  this.setInPrivate = true;
  await this.save();
};

birthdaySchema.methods.resetTodayWishStatus = async function () {
  this.todayWishStatus = {
    status: "pending",
    attempts: 0,
    lastAttempt: new Date(),
    nextRetry: new Date(),
    maxAttempts: 5,
    retryInterval: 30 * 60 * 1000,
    completedAt: null,
    errorMessage: null,
  };
  await this.save();
};

birthdaySchema.methods.resetTodayReminderStatus = async function () {
  this.todayReminderStatus = {
    status: "pending",
    attempts: 0,
    lastAttempt: new Date(),
    nextRetry: new Date(),
    maxAttempts: 3,
    retryInterval: 60 * 60 * 1000,
    completedAt: null,
    errorMessage: null,
  };
  await this.save();
};

birthdaySchema.methods.updateWishAttempt = async function (success, errorMessage = null) {
  this.todayWishStatus.attempts++;
  this.todayWishStatus.lastAttempt = new Date();

  if (success) {
    this.todayWishStatus.status = "completed";
    this.todayWishStatus.completedAt = new Date();
    this.todayWishStatus.errorMessage = null;
  } else {
    this.todayWishStatus.status = "failed";
    this.todayWishStatus.errorMessage = errorMessage;

    if (this.todayWishStatus.attempts < this.todayWishStatus.maxAttempts) {
      const nextRetry = new Date();
      nextRetry.setTime(nextRetry.getTime() + this.todayWishStatus.retryInterval);
      this.todayWishStatus.nextRetry = nextRetry;
    } else {
      this.todayWishStatus.status = "failed";
    }
  }

  await this.save();
};

birthdaySchema.methods.updateReminderAttempt = async function (success, errorMessage = null) {
  this.todayReminderStatus.attempts++;
  this.todayReminderStatus.lastAttempt = new Date();

  if (success) {
    this.todayReminderStatus.status = "completed";
    this.todayReminderStatus.completedAt = new Date();
    this.todayReminderStatus.errorMessage = null;
  } else {
    this.todayReminderStatus.status = "failed";
    this.todayReminderStatus.errorMessage = errorMessage;

    if (this.todayReminderStatus.attempts < this.todayReminderStatus.maxAttempts) {
      const nextRetry = new Date();
      nextRetry.setTime(nextRetry.getTime() + this.todayReminderStatus.retryInterval);
      this.todayReminderStatus.nextRetry = nextRetry;
    } else {
      this.todayReminderStatus.status = "failed";
    }
  }

  await this.save();
};

birthdaySchema.pre("save", function (next) {
  const today = new Date();
  const birthDate = this.date;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 0 || age > 120) {
    next(new Error("Invalid age: Must be between 0 and 120 years"));
  }
  this.age = age;
  next();
});

birthdaySchema.pre("save", function (next) {
  const today = new Date();
  if (this.date > today) {
    next(new Error("Birth date cannot be in the future"));
  }
  next();
});

birthdaySchema.pre("save", function (next) {
  const numberRegex = /^\+?[1-9]\d{1,14}$/;
  if (!numberRegex.test(this.number)) {
    next(new Error("Invalid phone number format"));
  }
  next();
});

birthdaySchema.pre("save", function (next) {
  if (!this.sessionId) {
    next(new Error("sessionId is required for Birthday documents. Always set sessionId explicitly."));
  } else {
    next();
  }
});

const Birthday = mongoose.model("Birthday", birthdaySchema);

export default Birthday;
