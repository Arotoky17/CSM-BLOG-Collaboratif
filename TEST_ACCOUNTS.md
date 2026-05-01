# 🧪 Comptes de Test - CMS Blog

## Comptes Disponibles

### 1. 👑 Admin
```
Email:    arotoky@gmail.com
Password: admin123
Role:     admin
```
✅ **Peut faire TOUT**: Lire, créer, approuver, modérer, gérer utilisateurs

---

### 2. ✏️ Editor
```
Email:    editor@demo.com
Password: editor123
Role:     editor
```
✅ **Peut**: Créer des articles (draft), approuver/rejeter les pending, voir la modération

---

### 3. ✍️ Author
```
Email:    author@demo.com
Password: author123
Role:     author
```
✅ **Peut**: Créer des articles (pending - en attente d'approbation), éditer les siens, voir les published

---

### 4. 📖 Client
```
Email:    client@demo.com
Password: client123
Role:     client
```
✅ **Peut**: Lire les articles published, commenter

---

## 🧬 Créer un Nouveau Compte

Allez à `/register` et choisissez votre rôle:

1. **📖 Reader** = Client (lecteur)
2. **✍️ Author** = Auteur (crée des articles)
3. **✏️ Editor** = Éditeur (approuve les articles)

> ⚠️ Le rôle Admin ne peut être créé que manuellement en base de données

---

## 📊 Scénarios de Test

### Scénario 1: Créer et approuver un article

1. **Login** comme `author@demo.com`
2. Cliquez "✍️ Nouvel article"
3. Remplissez le formulaire
4. **Soumettre** → Article crée en `pending`
5. **Logout**
6. **Login** comme `editor@demo.com`
7. Cliquez "🔍 Modération"
8. **Approuver** l'article → Status devient `published`
9. **Logout**
10. **Login** comme `client@demo.com`
11. Accueil → Vous voyez l'article publié!

### Scénario 2: Rejeter un article

Même procédure, mais à l'étape 8, cliquez **Rejeter**

### Scénario 3: Éditer ses propres articles

1. **Login** comme auteur
2. Allez au dashboard
3. Cliquez sur vos articles `pending` ou `draft`
4. Modifiez et sauvegardez
5. L'éditeur verra l'article mis à jour

### Scénario 4: Voir comme client

1. **Login** comme `client@demo.com`
2. La page d'accueil affiche **SEULEMENT** les articles `published`
3. Les articles `draft`, `pending`, `rejected` ne sont pas visibles

---

## 🔍 Debug: Vérifier les Articles en localStorage

```javascript
// Ouvrez la console du navigateur et tapez:
console.log(JSON.parse(localStorage.getItem('mock_articles')));

// Vous verrez tous les articles avec leurs statuts:
[
  { _id: '...', title: 'Article 1', status: 'published', ... },
  { _id: '...', title: 'Article 2', status: 'pending', ... },
  { _id: '...', title: 'Article 3', status: 'draft', ... }
]
```

---

## 🔄 Reset des Données

Si vous voulez réinitialiser toutes les données (articles, utilisateurs, commentaires):

```javascript
// Console du navigateur:
localStorage.removeItem('mock_seeded');
location.reload();
```

Cela va réinitialiser avec les données par défaut.

---

## 📱 Navigation par Rôle

| Page | Admin | Editor | Author | Client |
|------|:-----:|:------:|:------:|:------:|
| Accueil | ✅ | ✅ | ✅ | ✅ |
| Articles détail | ✅* | ✅* | ✅* | ✅** |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Nouvel article | ✅ | ✅ | ✅ | ❌ |
| Modération | ✅ | ✅ | ❌ | ❌ |

*Admin/Editor/Author voient aussi les `pending`
**Client voit seulement les `published`

