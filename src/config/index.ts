import * as dotenv from 'dotenv';
import {CsvConfig, CsvConfigLayouts} from "../model/csvConfig.model";
import path from 'path';
import fs from 'fs';

dotenv.config({ path: `.env` });

let currentConfigs: CsvConfigLayouts;

const getProviderConfigLayouts = (): CsvConfigLayouts => {
  if (currentConfigs) {
    return currentConfigs;
  }
  loadConfigs();
  return currentConfigs;
}

const loadConfigs = () => {
  const providerConfigsPath = path.join(__dirname, 'providers');
  const files = fs.readdirSync(providerConfigsPath);
  const configs: Array<CsvConfig> = [];
  files.forEach(file => {
    if (file.endsWith(".json")) {
      const currentConf: CsvConfig = JSON.parse(fs.readFileSync(path.join(providerConfigsPath, file)).toString());
      configs.push(currentConf);
    }
  });
  currentConfigs = new CsvConfigLayouts(configs);
  console.log("Current configs: ", currentConfigs);
}

export const {
  PORT,
} = process.env;

export default {
  getProviderConfigLayouts
}