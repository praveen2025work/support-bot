import { Router } from 'express';
import path from 'path';
import { promises as fs } from 'fs';

const router = Router();

router.get('/docs/openapi.yaml', async (req, res) => {
  const filePath = path.join(__dirname, '../../docs/openapi.yaml');
  const content = await fs.readFile(filePath, 'utf-8');
  res.type('text/yaml').send(content);
});

// Serve Swagger UI via CDN redirect
router.get('/docs', (req, res) => {
  const specUrl = `${req.protocol}://${req.get('host')}/api/docs/openapi.yaml`;
  res.redirect(`https://petstore.swagger.io/?url=${encodeURIComponent(specUrl)}`);
});

export default router;
