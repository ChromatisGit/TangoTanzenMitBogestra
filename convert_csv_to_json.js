const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const folderPath = 'csv2';

async function extractTimetables(files) {
    let res = []

    for (const file of files) {
        if (file.endsWith('.csv')) {
            const filePath = path.join(folderPath, file);
            const splitIndices = [];
            const data = [];
            let index = 0;

            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => {
                        if (row['0'] === 'Haltestellen') {
                            splitIndices.push(index - 2);
                        }
                        data.push(Object.values(row));
                        index++;
                    })
                    .on('end', () => {
                        splitIndices.push(index);
                        let prevIndex = undefined;
                        splitIndices.forEach(index => {
                            if (prevIndex !== undefined)
                                res.push(data.slice(prevIndex,index));
                            prevIndex = index;
                        });
                        resolve();
                    })
                    .on('error', reject);
            });
        }
    }

    res = res.map(table => table = removeUnnessesaryRows(table))

    const splitTimetables = splitOneTableInTwo(res.filter( (timetable) => amountOfTables(timetable) > 1 ))

    return res.filter( timetable => amountOfTables(timetable) === 1 ).concat(splitTimetables)
}

function amountOfTables(timetable) {
    const row = timetable[0]
    return row.filter( entry => entry !== "").length
}

function splitOneTableInTwo(timetables) {
    const res = []

    timetables.forEach( table => {
        let emptyColumnIndex = -1

        for (let i = 0; i < table[0].length; i++) {
            if (table.every(row => row[i] === "")) {
                emptyColumnIndex = i
                break
            }
        }
    
        const firstTable = table.map(row => row.slice(0, emptyColumnIndex));
        let secondTable = table.map(row => row.slice(emptyColumnIndex));
    
        secondTable = secondTable.map((row, i) => {
            row.unshift(firstTable[i][0]);
            return row;
        });
    
        res.push(firstTable);
        res.push(secondTable);
    })

    return res
}

function removeUnnessesaryRows(table) {
    table.splice(1,2)

    for (let i = table.length-1; i >= 0; i--) {
        if (table[i][0].startsWith("-"))
            return table.slice(0,i+1)
    }

    return table
}

function processTimetable(acc, timetable) {
    const hasExceptionalTrains = timetable[1][0] === "";
    const specialRules = hasExceptionalTrains? timetable[1] : undefined;
    let weekday = shortenWeekdayName(timetable[0].filter( entry => entry !== "")[0]);

    timetable.splice(0, 1 + hasExceptionalTrains)

    timetable = removeArrivalStation(timetable)

    let stations = timetable.reduce((acc, row) => {
        acc.push(row.splice(0, 1)[0]);
        return acc;
    }, []);

    stations = unifyStationNaming(stations)

    const direction = `Richtung ${stations[stations.length - 1]}`

    timetable = changeToRegularTimeFormat(timetable)

    let trackHour = 0
    let changeOfDay = false

    timetable.forEach((row, y) => {
        row.forEach((time, x) => {
            if (time === "")
                return

            const rule = hasExceptionalTrains? specialRules[x] : undefined;

            const [hour, minute] = time.split('.')

            if (trackHour > hour)
                changeOfDay = true
            trackHour = hour

            addToJSON({
                acc,
                station: stations[y],
                direction,
                weekday,
                hour,
                minute,
                changeOfDay,
                rule
            })

            
        })
    })

    return acc
}

function shortenWeekdayName(weekday) {
    switch (weekday) {
        case 'montags bis donnerstags':
            return 'MoDo'
        case 'freitags':
            return 'Fr'
        case 'samstags':
            return 'Sa'
        case 'sonn- und feiertags':
            return 'So'
        default:
            throw new Error(`Cannot shorten weekday ${weekday}`);
    }
}

function changeToRegularTimeFormat(table) {
    for (let i = 0; i < table[0].length; i++) {
        let hour = undefined;

        table.forEach(row => {
            if (row[i] === "" || row[i] === undefined)
                return

            if (row[i].includes('.')) {
                hour = row[i].split('.')[0];
                return
            }

            row[i] = `${hour}.${row[i]}`;
        })
    }

    return table
}

function removeArrivalStation(table) {
    return table
    .filter(row => !row[0].endsWith('\n an'))
    .map(row => {
        if (row[0].endsWith('\n ab'))
            row[0] = row[0].slice(0, -5)

        return row
        })
}

function unifyStationNaming(stations) {
    let city = undefined;

    stations.forEach((station, i) => {
        if (station.startsWith('-')) {
            station = station.slice(2)

            if(!station.startsWith(city))
                station = `${city} ${station}`

            stations[i] = station
            return
        }

        city = station.split(' ')[0];
    })

    return stations
}

function addToJSON({
    acc,
    station,
    direction,
    weekday,
    hour,
    minute,
    changeOfDay,
    rule
}) {
    pushToNestedDict(acc, [direction,station,weekday,hour], minute)
}

function pushToNestedDict(dict, keys, value) {
    let current = dict;

    keys.forEach((key, i) => {
        if (!current[key]) {
            if (i === keys.length - 1) {
                current[key] = [];
            } else {
                current[key] = {};
            }
        }

        current = current[key];
    });

    current.push(value)
}

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    extractTimetables(files).then(
        timetables => {
            const acc = {}
            timetables.forEach(timetable =>
                processTimetable(acc,timetable)
            )
            fs.writeFileSync('result.json', JSON.stringify(acc, null, 2));
        }
        
    )
});