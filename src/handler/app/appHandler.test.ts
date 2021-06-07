import appHandler from './index';
import express from 'express';
import {mocked} from "ts-jest/utils";
import config from '../../config'
import csvProcessorService from '../../services/csvProcessor';
import {CsvConfig, CsvConfigLayouts} from "../../model/csvConfig.model";
import fileUpload from "express-fileupload";

const mockResponse: any = {
    json: jest.fn(),
    status: jest.fn(),
    send: jest.fn()
};

jest.mock('../../config', () => ({
   getProviderConfigLayouts: jest.fn()
}));

jest.mock('../../services/csvProcessor', () => ({
    startCsvProcessingWorkflow: jest.fn()
}));

describe("processCsv tests",() => {
    it("should return 400 when no providerName was passed", async () => {
        const request = {
            body: {},
            params: {
                "otherParam": "test"
            }
        } as unknown as express.Request;
        mockResponse.status.mockImplementation(() => mockResponse);

        await appHandler.processCsv(request,mockResponse)

        expect(mockResponse.status).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({message: "Missing provider name"});
    });

    it("should return 400 if no config is available for the provider", async () => {
        const request = {
            body: {},
            params: {
                "providerName": "test"
            }
        } as unknown as express.Request;
        mockResponse.status.mockImplementation(() => mockResponse);
        mocked(config.getProviderConfigLayouts).mockImplementation(() => {
            return new CsvConfigLayouts([<CsvConfig>{
                providerName: "test_other",
                containsColumnNames: true,
                columns: ["uuid"]
            }])
        });
        await appHandler.processCsv(request,mockResponse)

        expect(mockResponse.status).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({message: "No provider config available for test"});
    });

    it("should return 400 if no files were sent", async () => {
        const request = {
            body: {},
            files: null,
            params: {
                "providerName": "test"
            }
        } as unknown as express.Request;
        mockResponse.status.mockImplementation(() => mockResponse);
        mocked(config.getProviderConfigLayouts).mockImplementation(() => {
            return new CsvConfigLayouts([<CsvConfig>{
                providerName: "test",
                containsColumnNames: true,
                columns: ["uuid"]
            }])
        });
        await appHandler.processCsv(request,mockResponse)

        expect(mockResponse.status).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({message: "Must send a csv file"});
    });

    it("should return 400 if more than one file was sent", async () => {
        const files = <fileUpload.FileArray>{
            test_1:<fileUpload.UploadedFile>{name: "test_1"},
            test_2:<fileUpload.UploadedFile>{name: "test_2"}
        };
        const request = {
            body: {},
            files: files,
            params: {
                "providerName": "test"
            }
        } as unknown as express.Request;
        mockResponse.status.mockImplementation(() => mockResponse);
        mocked(config.getProviderConfigLayouts).mockImplementation(() => {
            return new CsvConfigLayouts([<CsvConfig>{
                providerName: "test",
                containsColumnNames: true,
                columns: ["uuid"]
            }])
        });
        await appHandler.processCsv(request,mockResponse)

        expect(mockResponse.status).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({message: "Must send a single file"});
    });

    it("should return 500 when processor service throws", async () => {
        const files = <fileUpload.FileArray>{
            test_1:<fileUpload.UploadedFile>{name: "test_1"},
        };
        const request = {
            body: {},
            files: files,
            params: {
                "providerName": "test"
            }
        } as unknown as express.Request;
        mockResponse.status.mockImplementation(() => mockResponse);
        mocked(config.getProviderConfigLayouts).mockImplementation(() => {
            return new CsvConfigLayouts([<CsvConfig>{
                providerName: "test",
                containsColumnNames: true,
                columns: ["uuid"]
            }])
        });
        mocked(csvProcessorService.startCsvProcessingWorkflow).mockImplementation(() => {
           throw new Error("error processing");
        });

        await appHandler.processCsv(request,mockResponse)

        expect(mockResponse.status).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith({message: "We found a problem trying to start a new CSV processing job"});
    });

    it("should return 200 and processId when success on csv workflow", async () => {
        const files = <fileUpload.FileArray>{
            test_1:<fileUpload.UploadedFile>{name: "test_1"},
        };
        const request = {
            body: {},
            files: files,
            params: {
                "providerName": "test"
            }
        } as unknown as express.Request;
        mockResponse.status.mockImplementation(() => mockResponse);
        mocked(config.getProviderConfigLayouts).mockImplementation(() => {
            return new CsvConfigLayouts([<CsvConfig>{
                providerName: "test",
                containsColumnNames: true,
                columns: ["uuid"]
            }])
        });
        mocked(csvProcessorService.startCsvProcessingWorkflow).mockImplementation(() => {
            return new Promise(resolve => {resolve(10)});
        });

        await appHandler.processCsv(request,mockResponse)

        expect(mockResponse.send).toHaveBeenCalledWith({message: "We received your file and started processing. This could take a while", processId: 10});
    });
});
