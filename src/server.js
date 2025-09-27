const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path'); // ESSENCIAL: para lidar com caminhos de arquivos

const chatRoutes = require('./routes/chatRoutes');
const contextRoutes = require('./routes/contextRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Linha que permite que o servidor acesse os arquivos da pasta 'frontend_t1'
app.use(express.static('frontend_t1')); 

// ---- ESTA É A ROTA QUE DEFINE A PÁGINA PRINCIPAL ----
// Quando alguém acessar a raiz do site (ex: http://localhost:3000/), 
// o servidor enviará o arquivo 'home.html' como resposta.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend_t1', 'home.html'));
});
// ----------------------------------------------------

// Endpoint principal do assistente institucional
app.use('/api/chat', chatRoutes);

// Endpoint para gerenciar o contexto
app.use('/api/context', contextRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});