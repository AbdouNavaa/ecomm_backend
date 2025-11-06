# Test Cart API avec Quantité

## Exemples d'Utilisation

### 1. Ajouter un produit avec quantité par défaut (1)
```json
POST /api/v1/cart
{
  "productId": "64a7b8c9d12345e67890abcd",
  "color": "red"
}
```

### 2. Ajouter un produit avec quantité spécifique
```json
POST /api/v1/cart
{
  "productId": "64a7b8c9d12345e67890abcd", 
  "color": "blue",
  "count": 5
}
```

### 3. Modifier la quantité d'un article
```json
PUT /api/v1/cart/{itemId}
{
  "count": 3
}
```

## Réponses d'Erreur Attendues

### Stock Insuffisant
```json
{
  "status": "fail",
  "message": "Insufficient stock for iPhone 13. Available: 10, Current in cart: 2, Requested to add: 15, Total would be: 17"
}
```

### Quantité Invalide
```json
{
  "status": "fail", 
  "message": "Invalid quantity: 0. Quantity must be greater than 0"
}
```

### Validation
```json
{
  "errors": [
    {
      "msg": "Count must be a positive integer between 1 and 999",
      "param": "count",
      "value": 1500
    }
  ]
}
```

## Réponse de Succès
```json
{
  "status": "success",
  "message": "5 items of iPhone 13 added successfully to your cart",
  "numOfCartItems": 1,
  "data": {
    "_id": "64a7b8c9d12345e67890abcd",
    "cartOwner": "64a7b8c9d12345e67890abce",
    "products": [
      {
        "product": "64a7b8c9d12345e67890abcd",
        "color": "blue", 
        "price": 999,
        "count": 5,
        "_id": "64a7b8c9d12345e67890abcf"
      }
    ],
    "totalCartPrice": 4995
  }
}
```