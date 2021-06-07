import express from 'express';
import csvProcessorService from '../../services/csvProcessor'
import fileUpload from "express-fileupload";
import config from "../../config";

const processCsv = async (req: express.Request, res: express.Response) => {
  const providerName = req.params.providerName;
  if (!providerName) {
    return res.status(400).json({message: "Missing provider name"})
  }
  const providerConfig = config.getProviderConfigLayouts().getProviderConfig(providerName);
  if (!providerConfig) {
    return res.status(400).json({message: "No provider config available for " + providerName})
  }
  const files = req.files!;
  if (!files) {
    return res.status(400).json({message: "Must send a csv file"});
  }
  if (Object.keys(files).length > 1) {
    return res.status(400).json({message: "Must send a single file"});
  }
  let newProcessId: number;
  try {
    newProcessId = await csvProcessorService.startCsvProcessingWorkflow(<fileUpload.UploadedFile>files[Object.keys(files)[0]], providerConfig)
  } catch(e) {
      return res.status(500).send({message: "We found a problem trying to start a new CSV processing job"});
  }
  res.send({message: "We received your file and started processing. This could take a while", processId: newProcessId});
}

export default {
    processCsv
}
