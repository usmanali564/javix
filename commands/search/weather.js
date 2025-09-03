import config from "#config";

const weatherCommand = {
  name: "weather",
  aliases: ["wthr", "forecast", "climate"],
  description: "Get current weather info for a city 🌦️",
  usage: "!weather <city>",
  cooldown: 3000,

  run: async (context) => {
    try {
      const { Javix, jid, messages, args, reply } = context;

      if (!args.length) {
        return await reply(`*Please provide a city name!*\n\nExample: ${config.prefix}weather Lahore`);
      }

      const city = args.join(" ");
      const apiKey = '8bc2f9d5ae85d87a5daa6cbdfb60092f';

      if (!apiKey) {
        console.error("Weather API key not configured");
        return await reply("*Weather API key not configured!*\nPlease contact the bot owner.");
      }

      const processingMsg = await Javix.sendMessage(
        jid,
        {
          text: "⏳ *Fetching weather data...*\nPlease wait while I get the information.",
        },
        { quoted: messages }
      );

      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();

        if (processingMsg?.key) {
          await Javix.sendMessage(jid, {
            delete: processingMsg.key,
          });
        }

        if (data.cod !== 200) {
          return await reply(`*City not found!*\nPlease check the city name and try again.\n\nError: ${data.message || "Unknown error"}`);
        }

        const weather = data.weather[0];
        const main = data.main;
        const wind = data.wind;
        const sys = data.sys;

        const weatherMessage =
          `🌤️ *Weather in ${data.name}, ${sys.country}*\n\n` +
          `🌡️ *Temperature:* ${Math.round(main.temp)}°C\n` +
          `🌡️ *Feels like:* ${Math.round(main.feels_like)}°C\n` +
          `🌡️ *Min/Max:* ${Math.round(main.temp_min)}°C / ${Math.round(main.temp_max)}°C\n\n` +
          `🌪️ *Weather:* ${weather.main} (${weather.description})\n` +
          `💨 *Wind:* ${Math.round(wind.speed)} m/s\n` +
          `💧 *Humidity:* ${main.humidity}%\n` +
          `🌫️ *Pressure:* ${main.pressure} hPa\n\n` +
          `⏰ *Last updated:* ${new Date().toLocaleString()}`;

        await reply(weatherMessage);
      } catch (error) {
        if (processingMsg?.key) {
          try {
            await Javix.sendMessage(jid, {
              delete: processingMsg.key,
            });
          } catch (deleteError) {
            console.error("Error deleting processing message:", deleteError);
          }
        }

        console.error("Weather API error:", error);
        await reply("*Failed to fetch weather information!*\nThe weather service might be temporarily unavailable.");
      }
    } catch (error) {
      console.error("Weather command error:", error);
      await context.reply("*An error occurred while processing the command!*");
    }
  },
};

export default weatherCommand;
