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

// Configuração do Multer
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });

// IMPORTANTE: Adicione logs de debug
router.post('/upload', upload.single('documento'), async (req, res) => {
    console.log('=== DEBUG UPLOAD ===');
    console.log('Método:', req.method);
    console.log('URL:', req.url);
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    console.log('==================');
    
    // Sempre retorne JSON válido
    try {
        if (!req.file) {
            console.log('❌ Nenhum arquivo encontrado');
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        console.log('✅ Arquivo recebido:', req.file.originalname);
        
        const { exams, statusProtocolo } = await extractExamsFromFile(req.file);
        const protocolo = `UNIAGENDE-${dayjs().format('YYYYMMDD')}-${uuidv4().slice(0,8)}`;

        // Salva Consulta
        const consulta = await prisma.consulta.create({
            data: {
                cidade: "N/A",
                especialidade: "N/A",
                medico: "N/A",
                dataHora: new Date(),
                protocolo
            }
        });

        // Salva ValidacaoProtocolo
        await prisma.validacaoProtocolo.create({
            data: { protocolo, status: statusProtocolo }
        });

        const response = { 
            protocolo, 
            dadosExtraidos: exams, 
            statusProtocolo, 
            consultaSalva: consulta 
        };
        
        console.log('✅ Resposta enviada:', response);
        return res.status(200).json(response);
        
    } catch (error) {
        console.error('[ROUTER] Erro:', error);
        return res.status(500).json({ 
            error: error.message || 'Erro interno do servidor' 
        });
    }
});

// Adicione uma rota de teste
router.get('/test', (req, res) => {
    res.json({ message: 'Rota de chat funcionando!' });
});

module.exports = router;