import { Router } from 'express';
import { slackRouter } from './slack';
import { teamsRouter } from './teams';

const router = Router();

router.use('/slack', slackRouter);
router.use('/teams', teamsRouter);

export { router as integrationsRouter };
