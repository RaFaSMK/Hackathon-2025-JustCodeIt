const express = require('express');
const router = express.Router();
const { askHuggingFace } = require('../services/huggingFaceService');

// POST /api/chat
router.post('/', async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Pergunta inválida' });
  }

  try {
    const response = await askHuggingFace(question);
    res.json({ response });
  } catch (error) {
    console.error("Erro ao processar pergunta:", error);
    res.status(500).json({ error: 'Erro ao se comunicar com a IA' });
  }
});

module.exports = router;
