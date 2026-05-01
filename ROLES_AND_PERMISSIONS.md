# 👥 Rôles et Permissions - CMS Blog Collaboratif

## Vue d'ensemble
Ce CMS blog collaboratif est conçu pour gérer les articles avec un workflow d'approbation. Voici les 4 rôles disponibles:

---

## 🔐 Rôles et Permissions

### 1️⃣ **👑 ADMIN** (Administrateur)
**Description**: Gère l'entière plateforme

**Permissions**:
- ✅ Lire tous les articles (published, pending, draft, rejected)
- ✅ Créer des articles (statut: draft)
- ✅ Éditer ses propres articles
- ✅ Approuver/Rejeter tous les articles en attente
- ✅ Voir le tableau de bord de modération
- ✅ Gérer les utilisateurs et leurs rôles
- ✅ Voir tous les commentaires
- ✅ Gérer les catégories


---

### 2️⃣ **✏️ EDITOR** (Éditeur)
**Description**: Révise et approuve les articles des auteurs

**Permissions**:
- ✅ Lire les articles **published** et **pending**
- ✅ Créer des articles (statut: draft)
- ✅ Éditer ses propres articles
- ✅ **Approuver ou Rejeter** les articles pending
- ✅ Voir le tableau de bord de modération
- ✅ Voir les commentaires en attente d'approbation
- ❌ Gérer les utilisateurs
- ❌ Modifier les rôles

*
---

### 3️⃣ **✍️ AUTHOR** (Auteur)
**Description**: Crée et publie des articles (avec approbation)

**Permissions**:
- ✅ Lire les articles **published**
- ✅ Lire ses propres articles (tout statut)
- ✅ Créer des articles (statut: **pending** - en attente d'approbation)
- ✅ Éditer ses propres articles (avant approbation)
- ✅ Répondre aux commentaires
- 

---

### 4️⃣ **📖 CLIENT** (Lecteur)
**Description**: Lit les articles et commente

**Permissions**:
- ✅ Lire les articles **published** uniquement
- ✅ Chercher et filtrer les articles
- ✅ Voir les commentaires approuvés
- ✅ Commenter les articles
- 
---

## 📊 Workflow d'Approbation

```
┌─────────────────────────────────────────────────────────────────┐
│                   WORKFLOW DES ARTICLES                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  Author crée │  (Statut: PENDING)
│   article    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Éditeur voit         │  Visibles dans:
│ article en attente   │  - Page "Modération"
└──────┬───────────────┘  - Liste des pending
       │
       │  ✅ APPROUVER    │  ❌ REJETER
       │                  │
       ▼                  ▼
   ┌────────────┐    ┌──────────┐
   │ PUBLISHED  │    │ REJECTED │
   │ (visible   │    │ (hidden) │
   │ aux        │    │          │
   │ clients)   │    └──────────┘
   └────────────┘
   
   Visible pour:           Visible pour:
   - Tous les clients      - L'auteur
   - Les auteurs           - L'éditeur
   - Les éditeurs          - L'admin
   - L'admin
```

---

## 🔄 Statuts des Articles

| Statut | Description | Visibilité | 
|--------|-------------|-----------|
| **draft** | Brouillon (non publié) | Auteur + Éditeur/Admin uniquement |
| **pending** | En attente d'approbation | Auteur + Éditeur/Admin uniquement |
| **published** | Publié et visible | Tous les visiteurs |
| **rejected** | Rejeté par l'éditeur | Auteur + Éditeur/Admin uniquement |

---

## 📋 Tableau de Comparaison

| Action | Admin | Editor | Author | Client |
|--------|:-----:|:------:|:------:|:------:|
| Lire articles published | ✅ | ✅ | ✅ | ✅ |
| Voir articles pending | ✅ | ✅ | 🟡* | ❌ |
| Créer article | ✅ | ✅ | ✅ | ❌ |
| Approuver articles | ✅ | ✅ | ❌ | ❌ |
| Rejeter articles | ✅ | ✅ | ❌ | ❌ |
| Modérer commentaires | ✅ | ✅ | ❌ | ❌ |
| Gérer utilisateurs | ✅ | ❌ | ❌ | ❌ |
| Gérer catégories | ✅ | ❌ | ❌ | ❌ |

*🟡 = Uniquement ses propres articles

---

## 🎯 Use Cases

### Use Case 1: Un auteur crée et publie un article

1. **Auteur** se connecte et clique "✍️ Nouvel article"
2. **Auteur** remplit: titre, contenu, catégorie, image
3. Article est créé avec statut **PENDING**
4. **Éditeur** reçoit une notification (futur)
5. **Éditeur** accède à "🔍 Modération"
6. **Éditeur** approuve → statut devient **PUBLISHED**
7. **Clients** voient l'article publié sur la page d'accueil

### Use Case 2: Un client commente un article

1. **Client** lit un article publié
2. **Client** ajoute un commentaire
3. Commentaire a le statut **pending**
4. **Éditeur** modère et approuve
5. Commentaire devient visible pour tous

---

## 🚀 Inscription

Lors de l'inscription, l'utilisateur choisit son rôle:

```
📖 Reader - Read articles only
✍️ Author - Write & publish articles (avec modération)
✏️ Editor - Review & approve articles
```

> ⚠️ Le rôle **Admin** ne peut être attribué que via la base de données

---

## 🔒 Sécurité

- Les rôles sont vérifiés **côté frontend** (développement)
- En production, les rôles doivent être vérifiés **côté backend** avec JWT
- Les permissions doivent être imposées via des **Guards** NestJS
- Les endpoints sensibles nécessitent des **Role Guards**

---

## 📝 Notes

- Les articles `draft` sont des brouillons privés (sauf pour éditeur/admin)
- Les articles `pending` attendent l'approbation d'un éditeur
- Les articles `rejected` restent privés avec raison du rejet
- Un auteur peut voir et éditer ses propres articles `pending`
- La modération crée un workflow transparent et collaboratif

