import express from 'express';
import appHandler from '../../handler/app';

const router = express.Router();

router.get("/ping", (_req: express.Request, res: express.Response) => {
  res.send('pong');
});

router.post("/process-csv/:providerName", async (req: express.Request, res: express.Response) => {
    await appHandler.processCsv(req, res);
});

export default router;