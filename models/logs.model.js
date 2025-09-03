import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  level: {
    type: String,
    enum: ["INFO", "WARN", "ERROR", "DEBUG"],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  pid: {
    type: Number,
    default: process.pid,
  },
});

LogSchema.index({ sessionId: 1, timestamp: -1 });
LogSchema.pre("save", function (next) {
  if (!this.sessionId) {
    next(new Error("sessionId is required for Log documents. Always set sessionId explicitly."));
  } else {
    next();
  }
});

export default mongoose.model("Log", LogSchema);
