# North Carolina DMV "Permit" Appointment

### What it does

...

### Prerequisites

* NodeJS > 14.x
* Yarn
* A Telegram account and a bot - https://core.telegram.org/bots#creating-a-new-bot
* Create a private group in TG and add the bot to that group. Find the group ID - https://stackoverflow.com/a/32572159/549530 
* Telegram username - set a username for your TG account in settings
  
**NOTE**: *All Telegram features are only used for notification purposes. You can replace this with some other sort of push notification like email via SMTP server, IFTTT, text via Twilio, etc.*

*To do this, however, you would need some JavaScript coding skills and checkout `./index.js`, start with `handleMessage()`*

### How to use

1. Clone the file `src/constants.sample.json` and name it `src/constants.json`
2. Fill out the following values in the `constants.json` file with stuff you gathered from the steps above
   1. `target_date` - YYYY-MM-DD The date which will act as a threshold. ONLY slots before this date will be monitored. 
   2. `telegram_bot_token` - Captured from above via `@botfather`
   3. `telegram_group_id` - Captured from above
   4. `telegram_user_id` - Captured from above
   5. `polling_interval` - (optional) in millis
3. Run the following commands:
    ```
   yarn i
   node ./index.js
   ```
4. Open the group you created in Telegram in your TG app 
5. Send `/start` as a message to the group
6. Bot will start the monitoring

### Available Telegram commands

1. `/start` - Start checking for slots
2. `/stop`- Stop checking for slots. It doesn't make sense to keep the bot running 24x7 at the risk of getting flagged
3. `/target` - Change target date. E.g. `/target 2022-10-19` will make the bot look only for slots before Oct 19, 2022
4. `/interval` - Change the polling interval. E.g `/interval 120000` will make bot poll every 2 minutes

### Limitations
