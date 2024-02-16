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

    return res
}

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    extractTimetables(files).then(
        timetables => {
            timetables.forEach(timetable =>
                console.log(JSON.stringify(timetable))
            )
        }
    )
});