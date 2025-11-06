const Product = require('../models/productModel');

// Script pour corriger les stocks négatifs
const fixNegativeStocks = async () => {
  try {
    console.log('🔍 Recherche des produits avec stock négatif...');
    
    // Trouver tous les produits avec quantity < 0
    const productsWithNegativeStock = await Product.find({ quantity: { $lt: 0 } });
    
    console.log(`📊 Trouvé ${productsWithNegativeStock.length} produits avec stock négatif`);
    
    if (productsWithNegativeStock.length === 0) {
      console.log('✅ Aucun produit avec stock négatif trouvé');
      return;
    }
    
    // Afficher les produits problématiques
    productsWithNegativeStock.forEach(product => {
      console.log(`❌ ${product.title}: ${product.quantity} (ID: ${product._id})`);
    });
    
    // Option 1: Remettre tous les stocks négatifs à 0
    const result = await Product.updateMany(
      { quantity: { $lt: 0 } },
      { $set: { quantity: 0 } }
    );
    
    console.log(`✅ ${result.modifiedCount} produits mis à jour (stock mis à 0)`);
    
    // Vérification finale
    const remainingNegative = await Product.countDocuments({ quantity: { $lt: 0 } });
    console.log(`📈 Produits avec stock négatif restants: ${remainingNegative}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction des stocks:', error);
  }
};

// Script pour ajouter une contrainte de validation aux produits existants
const addStockValidation = async () => {
  try {
    console.log('🔧 Ajout de validation pour empêcher les stocks négatifs...');
    
    // Cette fonction peut être utilisée pour ajouter une validation au niveau MongoDB
    // mais il est plus sûr de le faire au niveau application
    
    console.log('✅ Recommandation: Utilisez la validation au niveau application');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

module.exports = {
  fixNegativeStocks,
  addStockValidation
};