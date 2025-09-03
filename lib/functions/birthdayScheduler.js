import Birthday from '../../models/birthday.model.js';
import config from '#config';

let birthdayScheduler = null;
let retryScheduler = null;

async function sendBirthdayWish(Javix, birthday) {
  try {
    const today = new Date();
    const sessionId = Javix.user.id.split(':')[0];
    
    const todayWish = birthday.wishes.find(wish => {
      const wishDate = new Date(wish.timestamp);
      return wishDate.getDate() === today.getDate() && 
             wishDate.getMonth() === today.getMonth() && 
             wishDate.getFullYear() === today.getFullYear() &&
             wish.status === 'sent';
    });

    if (todayWish) {
      console.log(`Birthday wish already sent to ${birthday.name} today`);
      return { success: true, message: 'Already wished today' };
    }

    let birthdayMessage = '';
    switch (birthday.theme) {
      case 'minimal':
        birthdayMessage = `🎂 Happy Birthday, ${birthday.name}!`;
        break;
      case 'fun':
        birthdayMessage = `🎉🎂🎈 HAPPY BIRTHDAY ${birthday.name.toUpperCase()}! 🎈🎂🎉\n\nMay your day be filled with joy, laughter, and lots of cake! 🍰✨`;
        break;
      case 'formal':
        birthdayMessage = `Dear ${birthday.name},\n\nWishing you a very happy birthday. May this year bring you health, happiness, and success.\n\nBest regards,\n${config.botName}`;
        break;
      default:
        birthdayMessage = birthday.customMessage.replace('{name}', birthday.name);
        break;
    }

    let wishSent = false;
    let sentTo = [];
    let errors = [];

    if (birthday.wishInGroups) {
      if (birthday.wishInAllGroups) {
        const groups = await Javix.groupFetchAllParticipating();
        const targetGroups = [];

        for (const [groupId, group] of Object.entries(groups)) {
          try {
            const participants = group.participants || [];
            const isUserInGroup = participants.some(p => p.id === birthday.userId);
            
            if (isUserInGroup && !birthday.excludedGroups.includes(groupId)) {
              targetGroups.push({ groupId, groupName: group.subject || 'Unknown Group' });
            }
          } catch (error) {
            console.error(`Error checking group ${groupId}:`, error);
          }
        }

        for (const { groupId, groupName } of targetGroups) {
          try {
            await Javix.sendMessage(groupId, {
              text: birthdayMessage
            });
            console.log(`Birthday wish sent to ${birthday.name} in group ${groupName}`);
            wishSent = true;
            sentTo.push({
              type: 'group',
              targetId: groupId,
              targetName: groupName,
              status: 'sent',
              attempts: 1,
              lastAttempt: new Date(),
              sentAt: new Date()
            });
          } catch (error) {
            console.error(`Failed to send birthday wish to group ${groupId}:`, error);
            errors.push(`Group ${groupName}: ${error.message}`);
            sentTo.push({
              type: 'group',
              targetId: groupId,
              targetName: groupName,
              status: 'failed',
              attempts: 1,
              lastAttempt: new Date(),
              errorMessage: error.message
            });
          }
        }
      } else {
        for (const group of birthday.groups) {
          try {
            const groupMetadata = await Javix.groupMetadata(group.groupId);
            const participants = groupMetadata.participants || [];
            const isUserInGroup = participants.some(p => p.id === birthday.userId);
            
            if (isUserInGroup) {
              await Javix.sendMessage(group.groupId, {
                text: birthdayMessage
              });
              console.log(`Birthday wish sent to ${birthday.name} in group ${group.groupName} (${group.groupId})`);
              wishSent = true;
              sentTo.push({
                type: 'group',
                targetId: group.groupId,
                targetName: group.groupName,
                status: 'sent',
                attempts: 1,
                lastAttempt: new Date(),
                sentAt: new Date()
              });
            } else {
              console.log(`User ${birthday.name} is no longer in group ${group.groupName}`);
              sentTo.push({
                type: 'group',
                targetId: group.groupId,
                targetName: group.groupName,
                status: 'failed',
                attempts: 1,
                lastAttempt: new Date(),
                errorMessage: 'User no longer in group'
              });
            }
          } catch (error) {
            console.error(`Failed to send birthday wish to group ${group.groupId}:`, error);
            errors.push(`Group ${group.groupName}: ${error.message}`);
            sentTo.push({
              type: 'group',
              targetId: group.groupId,
              targetName: group.groupName,
              status: 'failed',
              attempts: 1,
              lastAttempt: new Date(),
              errorMessage: error.message
            });
          }
        }
      }
    }

    if (birthday.wishInPrivate) {
      try {
        await Javix.sendMessage(birthday.userId, {
          text: `🎂 Happy Birthday, ${birthday.name}!\n\n${birthdayMessage}\n\nFrom: ${config.botName}`
        });
        console.log(`Direct birthday wish sent to ${birthday.name}`);
        wishSent = true;
        sentTo.push({
          type: 'private',
          targetId: birthday.userId,
          targetName: birthday.name,
          status: 'sent',
          attempts: 1,
          lastAttempt: new Date(),
          sentAt: new Date()
        });
      } catch (error) {
        console.error(`Failed to send direct birthday wish to ${birthday.name}:`, error);
        errors.push(`Private: ${error.message}`);
        sentTo.push({
          type: 'private',
          targetId: birthday.userId,
          targetName: birthday.name,
          status: 'failed',
          attempts: 1,
          lastAttempt: new Date(),
          errorMessage: error.message
        });
      }
    }

    const wishData = {
      year: today.getFullYear(),
      message: birthdayMessage,
      timestamp: today,
      wishedBy: 'bot',
      status: wishSent ? 'sent' : 'failed',
      attempts: 1,
      lastAttempt: new Date(),
      errorMessage: errors.length > 0 ? errors.join('; ') : null,
      sentTo: sentTo
    };

    birthday.wishes.push(wishData);
    birthday.totalWishes++;
    
    const success = wishSent && errors.length === 0;
    await birthday.updateWishAttempt(success, errors.length > 0 ? errors.join('; ') : null);
    
    return { 
      success: success, 
      message: wishSent ? 'Birthday wish sent successfully' : 'Failed to send birthday wish',
      errors: errors
    };

  } catch (error) {
    console.error(`Error sending birthday wish to ${birthday.name}:`, error);
    return { success: false, message: error.message, errors: [error.message] };
  }
}

async function sendBirthdayReminders(Javix) {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const birthdays = await Birthday.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$birthDate' }, tomorrow.getMonth() + 1] },
          { $eq: [{ $dayOfMonth: '$birthDate' }, tomorrow.getDate()] }
        ]
      },
      isActive: true,
      reminderEnabled: true
    });

    if (birthdays.length === 0) {
      console.log('No birthday reminders to send');
      return;
    }

    console.log(`Sending ${birthdays.length} birthday reminders`);

    for (const birthday of birthdays) {
      try {
        const reminderMessage = `🎂 *Birthday Reminder*\n\nTomorrow is ${birthday.name}'s birthday!\n\n*Birthday Details:*\n• Name: ${birthday.name}\n• Date: ${birthday.birthDate.toLocaleDateString()}\n• Theme: ${birthday.theme}\n\n*Wish Settings:*\n• Private: ${birthday.wishInPrivate ? 'Yes' : 'No'}\n• Groups: ${birthday.wishInGroups ? 'Yes' : 'No'}\n• All Groups: ${birthday.wishInAllGroups ? 'Yes' : 'No'}\n\nThe bot will automatically send birthday wishes tomorrow.`;

        await Javix.sendMessage(config.ownerNumber, {
          text: reminderMessage
        });

        console.log(`Birthday reminder sent for ${birthday.name}`);
      } catch (error) {
        console.error(`Failed to send birthday reminder for ${birthday.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending birthday reminders:', error);
  }
}

async function prepareBirthdayWishes(Javix) {
  try {
    const today = new Date();
    const birthdays = await Birthday.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$birthDate' }, today.getMonth() + 1] },
          { $eq: [{ $dayOfMonth: '$birthDate' }, today.getDate()] }
        ]
      },
      isActive: true
    });

    if (birthdays.length === 0) {
      console.log('No birthdays today');
      return [];
    }

    console.log(`Found ${birthdays.length} birthdays today`);
    return birthdays;
  } catch (error) {
    console.error('Error preparing birthday wishes:', error);
    return [];
  }
}

async function sendPreparedBirthdayWishes(Javix) {
  try {
    const birthdays = await prepareBirthdayWishes(Javix);
    
    for (const birthday of birthdays) {
      await sendBirthdayWish(Javix, birthday);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Error sending prepared birthday wishes:', error);
  }
}

async function retryFailedWishes(Javix) {
  try {
    const today = new Date();
    const birthdays = await Birthday.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$birthDate' }, today.getMonth() + 1] },
          { $eq: [{ $dayOfMonth: '$birthDate' }, today.getDate()] }
        ]
      },
      isActive: true,
      'wishes.status': 'failed'
    });

    for (const birthday of birthdays) {
      const failedWishes = birthday.wishes.filter(wish => 
        wish.status === 'failed' && 
        new Date(wish.timestamp).getDate() === today.getDate()
      );

      for (const wish of failedWishes) {
        if (wish.attempts < 3) {
          await sendBirthdayWish(Javix, birthday);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  } catch (error) {
    console.error('Error retrying failed wishes:', error);
  }
}

async function retryFailedReminders(Javix) {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const birthdays = await Birthday.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$birthDate' }, today.getMonth() + 1] },
          { $eq: [{ $dayOfMonth: '$birthDate' }, today.getDate()] }
        ]
      },
      isActive: true,
      reminderEnabled: true
    });

    for (const birthday of birthdays) {
      const todayWish = birthday.wishes.find(wish => {
        const wishDate = new Date(wish.timestamp);
        return wishDate.getDate() === today.getDate() && 
               wishDate.getMonth() === today.getMonth() && 
               wishDate.getFullYear() === today.getFullYear();
      });

      if (!todayWish || todayWish.status === 'failed') {
        await sendBirthdayWish(Javix, birthday);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error('Error retrying failed reminders:', error);
  }
}

async function checkBirthdays(Javix) {
  try {
    console.log('Checking birthdays...');
    
    await sendBirthdayReminders(Javix);
    await sendPreparedBirthdayWishes(Javix);
    
    console.log('Birthday check completed');
  } catch (error) {
    console.error('Error in birthday check:', error);
  }
}

export function startBirthdayScheduler(Javix) {
  if (birthdayScheduler) {
    console.log('Birthday scheduler is already running');
    return;
  }

  // console.log('Starting birthday scheduler...');

  birthdayScheduler = setInterval(async () => {
    await checkBirthdays(Javix);
  }, 60 * 60 * 1000);

  retryScheduler = setInterval(async () => {
    await retryFailedWishes(Javix);
    await retryFailedReminders(Javix);
  }, 2 * 60 * 60 * 1000);

  console.log('Birthday scheduler started successfully');
}

export function stopBirthdayScheduler() {
  if (birthdayScheduler) {
    clearInterval(birthdayScheduler);
    birthdayScheduler = null;
    console.log('Birthday scheduler stopped');
  }

  if (retryScheduler) {
    clearInterval(retryScheduler);
    retryScheduler = null;
    console.log('Retry scheduler stopped');
  }
}

export async function manualBirthdayCheck(Javix) {
  console.log('Manual birthday check triggered');
  await checkBirthdays(Javix);
}

export async function manualRetryFailed(Javix) {
  console.log('Manual retry of failed wishes triggered');
  await retryFailedWishes(Javix);
  await retryFailedReminders(Javix);
} 