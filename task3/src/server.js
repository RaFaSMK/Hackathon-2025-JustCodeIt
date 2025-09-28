const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const chatRoutes = require('./routes/chatRoutes');
const contextRoutes = require('./routes/contextRoutes');
const medicalConsultationRoutes = require('./routes/medicalConsultationRoutes'); 

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static('frontend_t1'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend_t1', 'home.html'));
});

app.use('/api/chat', chatRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/medicalConsultation', medicalConsultationRoutes); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
