const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de contexto
const contextPath = path.join(__dirname, '..', 'contexto.txt');

// Rota GET para obter o contexto atual
router.get('/', (req, res) => {
  try {
    const contextContent = fs.readFileSync(contextPath, 'utf-8');
    res.json({ context: contextContent });
  } catch (error) {
    console.error("Erro ao ler o arquivo de contexto:", error);
    res.status(500).json({ error: 'Erro ao ler o contexto.' });
  }
});

// Rota POST para atualizar o contexto
router.post('/', (req, res) => {
  const { context } = req.body;

  if (typeof context !== 'string') {
    return res.status(400).json({ error: 'Conteúdo do contexto inválido.' });
  }

  try {
    fs.writeFileSync(contextPath, context, 'utf-8');
    res.json({ message: 'Contexto atualizado com sucesso!' });
  } catch (error) {
    console.error("Erro ao salvar o arquivo de contexto:", error);
    res.status(500).json({ error: 'Erro ao salvar o contexto.' });
  }
});

module.exports = router;