const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const folderPath = 'csv';

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

function processTimetable(timetable) {
    const weekday = timetable[0].filter( entry => entry !== "")[0];
    const hasExceptionalTrains = timetable[1][0] === "";
    const specialRules = hasExceptionalTrains? timetable[1] : [];

    timetable.splice(0, 1 + hasExceptionalTrains)

    timetable = removeArrivalStation(timetable)

    const stations_raw = timetable.reduce((acc, row) => {
        acc.push(row.splice(0, 1)[0]);
        return acc;
    }, []);

    const stations = unifyStationNaming(stations_raw)

    timetable = changeToRegularTimeFormat(timetable)

    return timetable
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

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    extractTimetables(files).then(
        timetables => {
            timetables.forEach(timetable =>
                processTimetable(timetable)
                    // JSON.stringify())
            )
        }
    )
});