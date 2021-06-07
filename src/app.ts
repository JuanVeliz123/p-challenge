import express from 'express';
import { PORT } from './config';
import appRoutes from './routes/app';
import fileUpload from 'express-fileupload';
import persistence from './services/persistence'
import config from './config'

const app = express();

persistence.initDb();
config.getProviderConfigLayouts();

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));

app.use('/', appRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

export default app;