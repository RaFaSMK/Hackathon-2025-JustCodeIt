const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { extractExamsFromFile } = require('../services/tesseractService');

const prisma = new PrismaClient();
const router = express.Router();

// --- Configuração do Multer ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

// --- Rota de Upload ---
router.post('/upload', upload.single('documento'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado. Por favor, anexe um documento.' });
    }

    console.log(`[ROUTER] Arquivo recebido: ${req.file.originalname}, mimetype: ${req.file.mimetype}`);

    try {
        // 1. Processa o arquivo (OCR)
        const processedData = await extractExamsFromFile(req.file);

        // 2. Gera protocolo único
        const protocolo = `UNIAGENDE-${dayjs().format("YYYYMMDD")}-${uuidv4().slice(0, 8)}`;

        // 3. Salva no banco
        // Ajuste os campos conforme sua tabela Prisma (exemplo com "consulta")
        const consulta = await prisma.consulta.create({
            data: {
                cidade: processedData.cidade || "N/A",
                especialidade: processedData.especialidade || "N/A",
                medico: processedData.medico || "N/A",
                dataHora: new Date(),
                protocolo,
                // se quiser salvar o texto/JSON inteiro:
                resultadoOCR: JSON.stringify(processedData)
            }
        });

        // 4. Retorna protocolo + resultado OCR
        res.status(200).json({
            protocolo,
            dadosExtraidos: processedData,
            consultaSalva: consulta
        });

    } catch (error) {
        console.error('[ROUTER] Erro ao processar o documento:', error);
        res.status(500).json({ 
            error: 'Ocorreu um erro interno ao processar o documento.',
            details: error.message 
        });
    }
});

module.exports = router;
