export interface CsvConfig {
    providerName: string,
    containsColumnNames: boolean,
    columns: Array<string>
}

export class CsvConfigLayouts {
    constructor(configs: Array<CsvConfig>) {
        this.configs = configs;
    }

    private configs: Array<CsvConfig>;

    public getConfigs(): Array<CsvConfig> {
        return this.configs;
    }

    public getProviderConfig(providerName: string): CsvConfig | null {
        return this.configs.find(config => config.providerName === providerName) || null;
    }
}
