import sqlite3, {RunResult} from 'sqlite3';
import {CsvOutput} from "../../model/csvOutput.model";
import {CsvProcess, CsvProcessStatus} from "../../model/csvProcesses.model";

const db = new sqlite3.Database(':memory:');

const BATCH_SIZE = 300;

interface NormalizedCsvOutput {
    uuid: string,
    vin: string,
    make: string,
    model: string,
    mileage: string,
    year: string,
    price: string,
    zipCode: string,
    createDate: string,
    updateDate: string,
}

const initDb = () => {
    db.run("CREATE TABLE IF NOT EXISTS CsvProcesses(" +
        "id INTEGER PRIMARY KEY," +
        "start_date TEXT NOT NULL," +
        "last_update_date TEXT NOT NULL," +
        "finished TINYINT NOT NULL," +
        "status TEXT NOT NULL," +
        "file_name TEXT NOT NULL," +
        "provider TEXT NOT NULL" +
        ")");
    db.run("CREATE TABLE IF NOT EXISTS ProcessedCarData(" +
        "id INTEGER PRIMARY KEY," +
        "uuid TEXT," +
        "vin TEXT," +
        "make TEXT," +
        "model TEXT," +
        "mileage TEXT," +
        "year INTEGER," +
        "price REAL," +
        "zip_code INTEGER," +
        "create_date TEXT," +
        "update_date TEXT" +
        ")");
}

const insertCarData = async (rawCarData: Array<CsvOutput>) => {
    if (rawCarData.length === 0) {
        throw new Error("Tried to insert an empty array");
    }
    const numberOfBatches = Math.ceil(rawCarData.length / BATCH_SIZE);
    const batchPromises: Array<Promise<Error|null>> = [];
    for (let i = 0; i < numberOfBatches; i++) {
        // This queries should be parametrized to avoid injections. I didn't for this particular case, due to time
        // limitations
        let baseStatement = "INSERT INTO ProcessedCarData" +
            "(uuid,vin,make,model,mileage,year,price,zip_code,create_date,update_date) VALUES";
        let allInserts = rawCarData
            .slice(i*BATCH_SIZE,(i+1)*BATCH_SIZE)
            .map(value => toNormalizedCsvOutput(value))
            .reduce<string>((acc, current) => {
               return acc+`('${current.uuid}','${current.vin}','${current.make}','${current.model}','${current.mileage}',` +
               `${current.year},${current.price},${current.zipCode},'${current.createDate}','${current.updateDate}'),`
            },'');
        allInserts = allInserts.slice(0, -1);
        const finalStatement = `${baseStatement}${allInserts}`
        batchPromises.push(new Promise((resolve,reject) => {
            db.run(finalStatement, function(this:RunResult, err: Error | null) {
                if (err) {
                    reject(err);
                }
                resolve(null);
            });
        }));
    }
    await Promise.all(batchPromises);
}

const toNormalizedCsvOutput = (value:CsvOutput) : NormalizedCsvOutput => {
    return {
        uuid: value.uuid || 'null',
        vin: value.vin || 'null',
        make: value.make || 'null',
        mileage: value.mileage?.toString() || 'null',
        createDate: value.createDate?.toISOString() || 'null',
        price: value.price?.toString() || 'null',
        model: value.model || 'null',
        year: value.year?.toString() || 'null',
        zipCode: value.zipCode?.toString() || 'null',
        updateDate: value.updateDate?.toISOString() || 'null'
    }
}

const newCsvProcess = (newProcess: CsvProcess): Promise<number> => {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO CsvProcesses(start_date,last_update_date,finished,status,file_name,provider) " +
            "VALUES(?,?,?,?,?,?)",
            newProcess.startDate.toISOString(),
            newProcess.lastUpdateDate.toISOString(),
            newProcess.finished,
            newProcess.status,
            newProcess.fileName,
            newProcess.provider,
            function (this:RunResult, err: Error | null) {
                if (err) {
                    reject(err);
                }
                resolve(this.lastID);
            });
    })
}

const updateCsvProcess = async (processId: number, newStatus: CsvProcessStatus, shouldFinish: boolean) => {
    return new Promise((resolve,reject) => {
        db.run("UPDATE CsvProcesses SET last_update_date = ?, finished = ?, status = ? WHERE id = ?",
            new Date().toISOString(),
            shouldFinish? 1 : 0,
            newStatus,
            processId,
            function(this:RunResult, err: Error|null){
                if(err) {
                    reject(err);
                }
                resolve(null);
            });
    });
}

export default {
    updateCsvProcess,
    newCsvProcess,
    initDb,
    insertCarData
}