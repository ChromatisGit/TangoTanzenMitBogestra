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

function nextTrains({
    timetable,
    weekday,
    station,
    hour,
    minute,
    direction,
    semesterBreak = false,
    holidayToday = false,
    holidayTomorrow = false,
    limit = 1
}) {

    let period;

    switch (weekday) {
        case 'Mo':
        case 'Di':
        case 'Mo':
        case 'Mi':
        case 'Do':
            period = 'MoDo';
            break;
        case 'Fr':
        case 'Sa':
        case 'So':
            period = weekday;
            break;
        default:
            throw new Error("Please only use Mo, Di, Mi, Do, Fr, Sa or So");
    }

    if(semesterBreak && (period === 'MoDo' || period === 'Fr'))
        period = `${period}-Ferien`

    res = []

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
        if (hour > 23) //TODO
            return null;
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
        weekday: 'Sa',
        hour: 18,
        minute: 15,
        limit: 3
    }))
}

main()