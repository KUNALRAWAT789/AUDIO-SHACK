import express from 'express';
import { identifyAudio } from './identifyController.js';

const router = express.Router();
router.post('/identify',identifyAudio);

export default router;