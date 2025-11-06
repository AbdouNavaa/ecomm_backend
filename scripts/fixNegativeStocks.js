const mongoose = require('mongoose');
const { fixNegativeStocks } = require('../utils/fixStocks');

// Configuration de connexion (utilisez vos propres paramètres)
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ecommerce');
    console.log('✅ Connecté à MongoDB');
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
    process.exit(1);
  }
};

const runFix = async () => {
  await connectDB();
  await fixNegativeStocks();
  process.exit(0);
};

// Exécuter seulement si appelé directement
if (require.main === module) {
  runFix();
}

module.exports = { runFix };