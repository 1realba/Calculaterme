import serverless from 'serverless-http';
import { createApp } from '../../server/createApp.ts';

const app = createApp();

export const handler = serverless(app);
