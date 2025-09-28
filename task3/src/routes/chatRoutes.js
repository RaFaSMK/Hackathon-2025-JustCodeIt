const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { extractExamsFromFile } = require('../services/tesseractService');

const router = express.Router();

// --- Configuração do Multer para Upload de Arquivos ---

// Define a pasta onde os arquivos temporários serão salvos
const uploadDir = 'uploads';

// Garante que a pasta de uploads exista
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configura o multer para salvar os arquivos na pasta de destino
const upload = multer({ dest: uploadDir });

/**
 * Rota POST para '/upload'.
 * O middleware 'upload.single('documento')' intercepta um arquivo do campo 'documento'.
 */
router.post('/upload', upload.single('documento'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado. Por favor, anexe um documento.' });
    }

    console.log(`[ROUTER] Arquivo recebido: ${req.file.originalname}, mimetype: ${req.file.mimetype}`);

    try {
        // Passa o objeto 'req.file' completo para o serviço, que orquestrará
        // a conversão (se necessário) e a extração do texto.
        const processedData = await extractExamsFromFile(req.file);

        // Retorna o objeto JSON estruturado com o texto completo e a lista de exames.
        res.status(200).json(processedData);

    } catch (error) {
        console.error('[ROUTER] Erro ao processar o documento:', error);
        res.status(500).json({ 
            error: 'Ocorreu um erro interno ao processar o documento.',
            details: error.message 
        });
    }
});

module.exports = router;