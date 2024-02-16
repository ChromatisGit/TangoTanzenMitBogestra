const fs = require('fs');

async function readFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}

function getPeriod(weekday) {
    switch (weekday) {
        case 'Mo':
        case 'Di':
        case 'Mo':
        case 'Mi':
        case 'Do':
            return 'MoDo';
        case 'Fr':
        case 'Sa':
        case 'So':
            return weekday;
        default:
            throw new Error("Please only use Mo, Di, Mi, Do, Fr, Sa or So");
    }
}

function nextTrains({
    timetable,
    weekday,
    station,
    hour,
    minute,
    direction,
    semesterBreak = false,
    holiday = false,
    limit = 1
}) {

    let period = getPeriod(weekday);

    if(semesterBreak && (period === 'MoDo' || period === 'Fr'))
        period = `${period}-Ferien`

    res = []

    if (holiday)
        period = 'Feiertag'

    hour = parseInt(hour)
    minute = parseInt(minute)

    while (res.length < limit) {
        const row = timetable[direction][station][period][hour];
        if (Array.isArray(row) && row.length > 0) {
            row.some(time => {
                if (time >= minute) {
                    res.push(`${hour}:${time}`);
                    return res.length === limit;
                }
            });
        }
    
        hour += 1;
        minute = 0;
        if (hour > 23) {
            hour = 0
            const daysOfWeek = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
            const index = daysOfWeek.indexOf(weekday);
            weekday = daysOfWeek[(index + 1) % 7]
            period = getPeriod(weekday);
        }
            
    }

    return res
}

function getStationNames(timetable) {
    return Object.keys(Object.values(timetable)[0])
}

async function main() {
    const timetable = await readFile('result.json');
    console.log(nextTrains({
        timetable,
        station: 'Herne Schloß Strünkede',
        direction: 'Richtung Bochum Hustadt (TQ)',
        weekday: 'Mo',
        hour: 15,
        minute: 30,
        limit: 3
    }))
}

main()