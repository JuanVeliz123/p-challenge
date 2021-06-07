import fileUpload from "express-fileupload";
import parse from "csv-parse/lib/sync";
import {CsvConfig} from "../../model/csvConfig.model";
import persistence from '../persistence';
import {CsvProcess, CsvProcessStatus} from "../../model/csvProcesses.model";
import {CsvOutput} from "../../model/csvOutput.model";

interface ParsedCsvEntry {
    [key: string]: string;
}

const startCsvProcessingWorkflow = async (file: fileUpload.UploadedFile, providerConfig: CsvConfig): Promise<number> => {
    const now = new Date();
    const newCsvProcess: CsvProcess = {
        provider: providerConfig.providerName,
        status: CsvProcessStatus.Started,
        finished: false,
        startDate: now,
        fileName: file.name,
        lastUpdateDate: now,
        id: 0
    }
    let newProcessId: number;
    try {
        // Ideally we would like to actually upload this file to S3 or any other cloud storage, and queue it for
        // processing by some sort of managed cluster of instances. For this case, we'll just save the process in our db
        // and update it's state later.
        newProcessId = await persistence.newCsvProcess(newCsvProcess);
    } catch(e) {
        console.error("There was a problem creating a new CsvProcess. Error: " + e);
        throw e;
    }

    beginCsvParsing(file.data, providerConfig, newProcessId);

    return newProcessId;
}

// It would be good if we either create a Worker thread-pool and execute this processes within it's workers, or
// we just scale our apps with more instances of this one, on demand. Or both :)
const beginCsvParsing = async (fileData: Buffer, config: CsvConfig, processId: number) => {
    const records: Array<ParsedCsvEntry> = parse(fileData, {columns: config.containsColumnNames});
    if (records.length === 0) {
        await persistence.updateCsvProcess(processId, CsvProcessStatus.Failed, true);
        return;
    }
    let containsAllColumns = true;
    config.columns.forEach(columnName => {
        if (!Object.keys(records[0]).includes(columnName)) {
            containsAllColumns = false
        }
    })
    if (!containsAllColumns) {
        await persistence.updateCsvProcess(processId, CsvProcessStatus.Failed, true);
        return;
    }
    const parsedRecords: Array<CsvOutput> = records.map((record: ParsedCsvEntry) => {
        return <CsvOutput>{
            vin: record.vin || null,
            updateDate: record.updateDate || null,
            zipCode: record.zipCode || null,
            model: record.model || null,
            createDate: record.createDate || null,
            mileage: record.mileage || null,
            make: record.make || null,
            uuid: record.uuid || null,
            price: record.price || null,
            year: record.year || null
        }
    });
    persistence.insertCarData(parsedRecords)
        .then(() => {
            persistence.updateCsvProcess(processId, CsvProcessStatus.Succeeded, true);
        })
        .catch((e) => {
            persistence.updateCsvProcess(processId, CsvProcessStatus.Failed, true);
            throw e;
        });
}

export default {
    startCsvProcessingWorkflow
}