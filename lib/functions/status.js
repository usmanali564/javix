const defaultStatusMessages = [
  "🎵 Music to your ears",
  "📚 Knowledge at your fingertips",
  "🎭 Entertainment on demand",
  "🎪 Fun never stops",
  "🎲 Games and more",
  "🎨 Creative and colorful",
  "🎯 Hit the target every time",
  "🎪 Circus of features",
  "🎭 Drama-free experience",
  "🎪 Show never ends",
  "🎯 Bullseye every time",
  "🎨 Paint your world",
  "🎭 Act of kindness",
  "🎪 Center of attention",
  "🎯 On point always",
  "🎨 Color your day",
  "🎭 Scene stealer",
  "🎪 Main attraction",
  "🎯 Perfect aim",
  "🎨 Artistic touch",
  "🎭 Star of the show",
  "🎪 Spotlight ready",
  "🎯 Target achieved",
  "🎨 Masterpiece maker",
  "🎭 Performance ready",
  "🎪 Showtime always",
  "🎯 Precision perfect",
  "🎨 Creative genius",
  "🎭 Center stage",
  "🎪 Always entertaining"
];

let statusMessages = [...defaultStatusMessages];
let currentIndex = 0;

const STATUS_MODES = {
  OFF: 'off',
  UPTIME_ONLY: 'uptime',
  CUSTOM_ONLY: 'custom',
  MIXED: 'mixed'
};

function formatUptime(uptime) {
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

function getStatusMode() {
  return global.statusMode || STATUS_MODES.MIXED;
}

function setStatusMode(mode) {
  if (Object.values(STATUS_MODES).includes(mode)) {
    global.statusMode = mode;
    return true;
  }
  return false;
}

function getCurrentStatus() {
  const mode = getStatusMode();
  switch (mode) {
    case STATUS_MODES.OFF:
      return null;
    case STATUS_MODES.UPTIME_ONLY: {
      const uptime = Date.now() - global.startTime;
      const uptimeFormatted = formatUptime(uptime);
      return `Javix • Personal Edition • Uptime: ${uptimeFormatted}`;
    }
    case STATUS_MODES.CUSTOM_ONLY:
      return statusMessages[currentIndex];
    case STATUS_MODES.MIXED:
    default: {
      // Alternate between uptime and custom messages every minute
      const showUptime = Math.floor(Date.now() / (60 * 1000)) % 2 === 0;
      if (showUptime) {
        const uptime = Date.now() - global.startTime;
        const uptimeFormatted = formatUptime(uptime);
        return `Javix • Personal Edition • Uptime: ${uptimeFormatted}`;
      }
      return statusMessages[currentIndex];
    }
  }
}

function addStatusMessage(message) {
  if (!statusMessages.includes(message)) {
    statusMessages.push(message);
    return true;
  }
  return false;
}

function removeStatusMessage(message) {
  const index = statusMessages.indexOf(message);
  if (index !== -1 && !defaultStatusMessages.includes(message)) {
    statusMessages.splice(index, 1);
    if (currentIndex >= statusMessages.length) {
      currentIndex = 0;
    }
    return true;
  }
  return false;
}

function getStatusMessages() {
  return [...statusMessages];
}

function resetStatusMessages() {
  statusMessages = [...defaultStatusMessages];
  currentIndex = 0;
}

function updateStatus(Javix) {
  try {
    const status = getCurrentStatus();
    if (status) {
      Javix.updateProfileStatus(status);
      const mode = getStatusMode();
      if (mode === STATUS_MODES.CUSTOM_ONLY || 
          (mode === STATUS_MODES.MIXED && Math.floor(Date.now() / (60 * 1000)) % 2 !== 0)) {
        currentIndex = (currentIndex + 1) % statusMessages.length;
      }
    }
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

function startStatusUpdater(Javix) {
  if (!global.startTime) {
    global.startTime = Date.now();
  }

  if (global.statusUpdater) {
    clearInterval(global.statusUpdater);
  }

  global.statusUpdater = setInterval(() => {
    updateStatus(Javix);
  }, 60 * 1000);

  updateStatus(Javix);
}

export {
  addStatusMessage,
  removeStatusMessage,
  getStatusMessages,
  resetStatusMessages,
  setStatusMode,
  getStatusMode,
  STATUS_MODES,
  getCurrentStatus,
  startStatusUpdater,
  formatUptime
};
  