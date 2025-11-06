const mongoose = require('mongoose');
const Product = require('../models/productModel');

// Configuration de connexion
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ecommerce');
    console.log('✅ Connecté à MongoDB');
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
    process.exit(1);
  }
};

const checkProductStock = async () => {
  try {
    // Rechercher tous les produits avec leurs stocks
    const products = await Product.find({}, 'title quantity sold')
      .sort({ quantity: 1 }); // Trier par quantité croissante

    console.log('\n📊 État des stocks des produits:');
    console.log('=====================================');
    
    let negativeCount = 0;
    let lowStockCount = 0;
    
    products.forEach((product, index) => {
      const status = product.quantity < 0 ? '❌ NÉGATIF' : 
                    product.quantity === 0 ? '⚠️  RUPTURE' :
                    product.quantity < 10 ? '🟡 FAIBLE' : '✅ OK';
      
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   Stock: ${product.quantity} | Vendus: ${product.sold} | ${status}`);
      
      if (product.quantity < 0) negativeCount++;
      if (product.quantity < 10 && product.quantity >= 0) lowStockCount++;
    });
    
    console.log('\n📈 Résumé:');
    console.log(`Total produits: ${products.length}`);
    console.log(`Stocks négatifs: ${negativeCount}`);
    console.log(`Stocks faibles (<10): ${lowStockCount}`);
    
    // Rechercher spécifiquement le HP Notebook mentionné dans l'erreur
    const hpNotebook = await Product.findOne({ title: /HP Notebook/i });
    if (hpNotebook) {
      console.log('\n🔍 HP Notebook trouvé:');
      console.log(`Titre: ${hpNotebook.title}`);
      console.log(`Stock: ${hpNotebook.quantity}`);
      console.log(`Vendus: ${hpNotebook.sold}`);
      console.log(`ID: ${hpNotebook._id}`);
    } else {
      console.log('\n❓ HP Notebook non trouvé dans la base');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des stocks:', error);
  }
};

const runCheck = async () => {
  await connectDB();
  await checkProductStock();
  process.exit(0);
};

// Exécuter seulement si appelé directement
if (require.main === module) {
  runCheck();
}

module.exports = { runCheck };