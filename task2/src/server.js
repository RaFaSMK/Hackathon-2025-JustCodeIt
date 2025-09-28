const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const chatRoutes = require('./routes/chatRoutes');
const contextRoutes = require('./routes/contextRoutes');

const app = express();

// CONFIGURAÇÃO CORS CORRETA - DEVE VIR ANTES DE TUDO
// app.js
// app.js
app.use(cors({
    origin: [
        'http://127.0.0.1',      // ESSA LINHA É A MAIS IMPORTANTE
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'file://',
        'file:///run/user/1000/doc/cd0c52a5/home.html'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
// Middleware para parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static('frontend_t2'));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend_t2', 'home.html'));
});

// Middleware de log
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin);
    next();
});

// Rotas da API
app.use('/api/chat', chatRoutes);
app.use('/api/context', contextRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});