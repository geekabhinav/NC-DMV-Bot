/**
 * @name DMV
 * @desc Goes through NC DMV appointment website and checks for slots
 */
const CONFIG = require("./constants.json");
const _ = require("lodash");
const moment = require("moment");
const puppeteer = require("puppeteer-extra");

const { sendToGroup } = require("../index");

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const path = require("path");
puppeteer.use(StealthPlugin());
let browser = null, page = null, asm = null;

const getPollInterval = () => {
  const currHour = parseInt(moment().format("H"), 10);
  if (currHour >= 5 && currHour < 11) {
    sendToGroup("[INFO] Night time polling delayed 5x");
    return parseInt(process.env["DMV_INTERVAL"], 10) * 5;
  }
  return parseInt(process.env["DMV_INTERVAL"], 10);
};
const getTargetDate = () => process.env["DMV_TARGET"];
const getTargetStartDate = () => process.env["DMV_TARGET_START"];
const getCategory = () => parseInt(process.env["DMV_CATEGORY"], 10);
const isActive = () => process.env["DMV_BOT"] === "ACTIVE";

const ZIP_CODES = CONFIG.zipCodes.split(",");

const goBack = async (page) => {
  await page.click("#BackButton");
  await page.waitForSelector(".QflowObjectItem");
  return await page.waitForNetworkIdle();
};

const getDates = async (page, targetDate) => {
  return await page.evaluate(async () => {
    return await new Promise(resolve => {
      const dates = Array.from(document.querySelectorAll(".ui-datepicker-calendar td:not(.ui-datepicker-unselectable)"));
      resolve(dates.map(dateEl => {
        const month = parseInt(dateEl.attributes["data-month"].value, 10) + 1;
        const year = dateEl.attributes["data-year"].value;
        const date = dateEl.textContent;
        return `${year}-${month}-${date}`;
      }));
    });
  });
};

const getDMVName = async (page) => {
  return await page.evaluate(async () => {
    return await new Promise((resolve, reject) => {
      try {
        const name = document.querySelector(".DisplayDataInner > div:nth-child(3)").textContent.split("\n")[3].trim();
        resolve(name);
      } catch (error) {
        reject(null);
      }
    });
  });
};
const getCredentials = async (retryCount = 0) => {
  console.log("IS_ACTIVE", isActive());
  if (retryCount > 2 || !isActive()) {
    await Promise.reject("[ERROR] Too many retries. @ArmoredKuruma go fix");
  }
  try {
    if (!browser) {
      browser = await puppeteer.launch({ headless: true });
      page = await browser.newPage();
      // set user agent (override the default headless User Agent)
      await page.setUserAgent(CONFIG.user_agent);
      await page.setViewport({ width: 1400, height: 800 });
    }

    sendToGroup("[INFO] Starting process to check for DMV appointments in NC");
    await page.goto(CONFIG.sign_in_URL, { waitUntil: "networkidle0" });
    await page.waitForSelector("#cmdMakeAppt");
    await page.waitForTimeout(1000);
    await page.click("#cmdMakeAppt");
    await page.waitForNetworkIdle();
    await page.waitForSelector(".QflowObjectItem");
    const selectors = await page.$$(".QflowObjectItem");
    await selectors[getCategory()].click();
    await page.waitForNetworkIdle();
    await page.waitForSelector(".QflowObjectItem");
    await page.waitForTimeout(1000);
    let appointmentMap = [];
    let alertUser = false;
    const targetDate = moment(getTargetDate(), "YYYY-MM-DD");
    const targetStartDate = moment(getTargetStartDate(), "YYYY-MM-DD");
    for (let i = 0; i < ZIP_CODES.length; i++) {
      const DMVCentre = await page.$x(`//*[contains(@class, "form-control-child") and contains(text(), "${ZIP_CODES[i]}")]`);
      if (!DMVCentre[0]) {
        continue;
      }
      const classList = await DMVCentre[0].evaluate(el => [...el.parentNode.parentNode.classList]);
      if (classList.includes("disabled-unit")) {
        continue;
      }

      await DMVCentre[0].click();
      await page.waitForFunction(() => !!document.querySelector(".blockUI"));
      await page.waitForFunction(() => !document.querySelector(".blockUI"));
      await page.waitForTimeout(2000);
      let DMVName = await getDMVName(page);
      if (!DMVName) {
        DMVName = ZIP_CODES[i];
      }
      const dates = await getDates(page, targetDate);
      dates.forEach(d => {
        const dateMoment = moment(d, "YYYY-M-D");
        if (!alertUser && dateMoment.isSameOrAfter(targetStartDate) && dateMoment.isSameOrBefore(targetDate)) {
          alertUser = true;
        }
        appointmentMap.push({
          epoch: dateMoment.valueOf(),
          date: dateMoment,
          centre: DMVName,
        });
      });
      if (!alertUser) {
        await goBack(page);
      } else {
        break;
      }
    }

    appointmentMap = _.sortBy(appointmentMap, "epoch");
    sendToGroup(formatString(appointmentMap, alertUser, targetStartDate, targetDate));
    startPolling().catch(console.log);
  } catch (error) {
    clearSession().catch(console.log);
    setTimeout(() => {
      getCredentials(retryCount + 1);
    }, getPollInterval());
    console.debug(error);
    sendToGroup(`[ERROR] Retry #${retryCount} - ${error.message}`);
  }
};

const formatString = (appointments, alertUser, targetStartDate, targetDate) => {
  let output = "[SUCCESS] ";

  if (alertUser) {
    output += `${CONFIG.telegram_username}: FOUND DMV Appointment! Go book it.\n`;
  } else {
    output += `No appointment available in zip codes ${ZIP_CODES.join("/")} between: ${targetStartDate.format("DD-MMM-YYYY")} - ${targetDate.format("DD-MMM-YYYY")} 
`;
  }

  if (appointments.length === 0) {
    output += `\nNo appointments available at any centre`;
  } else {
    output += `\nLatest appointment:\nDate: ${appointments[0].date.format("(ddd) DD-MMM-YYYY")}\nCentre: ${appointments[0].centre}`;
  }

  return output;
};

const startPolling = async () => {
  await clearSession();
  if (!isActive()) {
    sendToGroup("[INFO] Bot not active. Send /start to restart appointment check.");
    return;
  }
  setTimeout(getCredentials, getPollInterval());
};

const clearSession = async () => {
  if (!page) {
    return;
  }
  await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
  await page.waitForTimeout(2000);
  await browser.close();
  browser = null;
  page = null;
};

module.exports.getCredentials = getCredentials;
module.exports.clearSession = clearSession;
