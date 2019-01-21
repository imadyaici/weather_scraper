const puppeteer = require('puppeteer')
const fs = require('fs')
// const $ = require('cheerio')
const format = require('./format.json');
const locations = require('./locations')
const conditions = require('./conditions')


const scrape = async (town) => {

    const day_url = 'https://www.weather.com/fr-DZ/temps/aujour/l/' + town + ':1:AG';
    const tenday_url = 'https://www.weather.com/fr-DZ/temps/10jours/l/' + town + ':1:AG';
    const hour_url = 'https://www.weather.com/fr-DZ/temps/parheure/l/' + town + ':1:AG';

    let townObject = {
        "current": {},
        "day": {},
        "tenday": [],
        "hours": []
    }

    const browser = await puppeteer.launch({
        headless: false,
        // devtools: true
    });
    const page = await browser.newPage();

    // page.on('console', consoleObj => console.log(consoleObj.text()));

    /***************************************
     * CURRENT WEATHER
    ***************************************/
    // await page.goto(day_url, {timeout: 0});
    // const currentJson = await page.evaluate((format, conditions) => {
    //     const current = {};
    //     for (var attr in format) {
    //         let value = document.querySelector(format[attr].selector)[format[attr].accessor];

    //         if (!value) {
    //             current[attr] = "--";
    //             continue;
    //         }

    //         if (typeof value !== "string") value = value[0];

    //         value = value.replace('°', '').trim();

    //         reg = new RegExp(format[attr].test);
    //         if (reg.test(value)) {
    //             if (attr === "icon" || attr === "icon_nuit") {
    //                 current[attr] = conditions[value.replace('svg-', '')];
    //             } else if (attr === "mise_a_jour") {
    //                 const d = new Date();
    //                 current[attr] = value.replace(' CET', '') + ' le ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    //             } else {
    //                 current[attr] = value;
    //             }
    //         } else {
    //             current[attr] = "Bad value format: expecting " + reg + " got " + value;
    //         }
    //     }

    //     return current;
    // }, format.current, conditions);

    // townObject.current = currentJson;


    /***************************************
     * DAY WEATHER
     ***************************************/
    await page.goto(tenday_url, {
        timeout: 0,
        waitUntil: ["domcontentloaded", "networkidle0"]
    });
    // await page.waitFor(10000)

    await page.waitFor('#twc-scrollabe > table > tbody > tr:nth-child(1)')
    console.log(await page.click('#twc-scrollabe > table > tbody > tr:nth-child(1)'));

    await page.waitFor('tr:nth-child(3) > td.sunrise > div > span:nth-child(2)');

    const dayJson = await page.evaluate((format, conditions) => {
        const day = {};
        for (var attr in format) {

            let value = ''
            const time = document.querySelector('tr:nth-child(1) > td:nth-child(2) > div > div > span').innerText.toLowerCase();

            if (time === 'ce soir' && format[attr].day_selector) {
                value = document.querySelector(format[format[attr].day_selector].selector)[format[attr].accessor]
            } else {
                value = document.querySelector(format[attr].selector)[format[attr].accessor];
            }

            // value = validate(value, attr, format[attr].test)
            // day[attr] = value

            if (!value) {
                day[attr] = "--";
                continue;
            }

            if (typeof value !== "string") value = value[0];

            value = value.replace('°', '').trim();

            reg = new RegExp(format[attr].test);
            if (reg.test(value)) {
                if (attr === "icon" || attr === "icon_nuit") {
                    day[attr] = conditions[value.replace('svg-', '')];
                } else if (attr === "mise_a_jour") {
                    const d = new Date();
                    day[attr] = value.replace(' CET', '') + ' le ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
                } else {
                    day[attr] = value;
                }
            } else {
                day[attr] = "Bad value format: expecting " + reg + " got " + value;
            }
        }

        return day;
    }, format.day, conditions);

    await page.click('#twc-scrollabe > table > tbody > tr:nth-child(1)')

    townObject.day = dayJson;


    /***************************************
     * 10 DAYS WEATHER
     ***************************************/
    let tenday = []
    for (let i = 1; i < 11; i++) {
        await page.click(`#twc-scrollabe > table > tbody > tr:nth-child(${i})`)
        await page.waitFor(`tr:nth-child(${i+2}) > td.sunrise > div > span:nth-child(2)`);

        const tendayJson = await page.evaluate((format, conditions, i) => {
            let tenday = {};

            for (var attr in format) {
                let value = ''
                const time = document.querySelector('tr:nth-child(1) > td:nth-child(2) > div > div > span').innerText.toLowerCase();

                if (i == 1 && time === 'ce soir' && format[attr].day_selector) {
                    value = document.querySelector(`tr:nth-child(${format[format[attr].day_selector].tr_nth + i})` + format[format[attr].day_selector].selector)[format[attr].accessor]
                } else {
                    value = document.querySelector(`tr:nth-child(${format[attr].tr_nth + i})` + format[attr].selector)[format[attr].accessor];
                }

                if (!value) {
                    tenday[attr] = '--'
                    continue;
                }

                if (typeof value !== "string") value = value[0];

                value = value.replace('°', '').trim();

                reg = new RegExp(format[attr].test);
                if (reg.test(value)) {
                    if (attr === "icon" || attr === "icon_nuit") {
                        tenday[attr] = conditions[value.replace('svg-', '')];
                    } else if (attr === "mise_a_jour") {
                        const d = new Date();
                        tenday[attr] = value.replace(' CET', '') + ' le ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
                    } else {
                        tenday[attr] = value;
                    }
                } else {
                    tenday[attr] = "Bad value format: expecting " + reg + " got " + value;
                }
            }

            return tenday;
        }, format.tenday, conditions, i);

        tenday.push(tendayJson)

        await page.click(`#twc-scrollabe > table > tbody > tr:nth-child(${i})`)
    }

    townObject.tenday = tenday;


    /***************************************
     * 6 HOURS WEATHER
     ***************************************/
    // await page.goto(hour_url, {timeout: 0});
    // const hoursJson = await page.evaluate((format, conditions) => {
    //     let hours = [];
    //     for (let i = 1; i <= 6; i++) {
    //         let hourObj = {};
    //         for (var attr in format) {
    //             let value = document.querySelector(`#twc-scrollabe > table > tbody > tr:nth-child(${i}) > ${format[attr].selector}`)[format[attr].accessor];

    //             if (!value) {
    //                 hourObj[attr] = "--";
    //                 continue;
    //             }

    //             if (typeof value !== "string") value = value[0];

    //             value = value.replace('°', '').trim();

    //             reg = new RegExp(format[attr].test);
    //             if (reg.test(value)) {
    //                 if (attr === "icon" || attr === "icon_nuit") {
    //                     hourObj[attr] = conditions[value.replace('svg-', '')];
    //                 } else if (attr === "mise_a_jour") {
    //                     const d = new Date();
    //                     hourObj[attr] = value.replace(' CET', '') + ' le ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    //                 } else {
    //                     hourObj[attr] = value;
    //                 }
    //             } else {
    //                 hourObj[attr] = "Bad value format: expecting " + reg + " got " + value;
    //             }
    //         }
    //         hours.push(hourObj);
    //     }
    //     return hours;
    // }, format.hours, conditions);

    // townObject.hours = hoursJson;

    await browser.close();

    return townObject;
};



const scrapAll = async () => {
    for (const town in locations) {
        let value = await scrape(locations[town])
        fs.writeFileSync('data/' + locations[town] + '.json', JSON.stringify(value));
    }
}

scrapAll();

