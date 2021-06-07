
export interface CsvProcess {
    id: number;
    startDate: Date;
    lastUpdateDate: Date;
    finished: boolean;
    status: CsvProcessStatus;
    fileName: string;
    provider: string;
}

export enum CsvProcessStatus {
    Cancelled = "cancelled",
    Started = "started",
    Succeeded = "succeeded",
    Failed = "failed"
}