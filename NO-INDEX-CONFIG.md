# 🔒 Configuration No-Index & Sous-dossier

## 📍 Structure du Déploiement

```
theoherve.fr/
├── (votre portfolio)           ← Indexé par Google
└── usb-key-song-update/        ← NON indexé (no-index)
    ├── /                       ← Dashboard
    ├── /connect                ← OAuth
    ├── /settings               ← Configuration
    └── /api/*                  ← API endpoints
```

## 🚫 Configuration No-Index

L'application est configurée pour **ne pas apparaître dans les moteurs de recherche**.

### Méthodes Utilisées

#### 1. Meta Tags HTML
Toutes les pages contiennent :
```html
<meta name="robots" content="noindex, nofollow">
```

#### 2. Headers HTTP
Toutes les réponses incluent :
```
X-Robots-Tag: noindex, nofollow
```

#### 3. robots.txt
```
User-agent: *
Disallow: /
```

#### 4. .htaccess (Apache)
```apache
Header set X-Robots-Tag "noindex, nofollow"
```

## 🔧 URLs de Production

| Page | URL |
|------|-----|
| Dashboard | `https://theoherve.fr/usb-key-song-update/` |
| Connect | `https://theoherve.fr/usb-key-song-update/connect` |
| Settings | `https://theoherve.fr/usb-key-song-update/settings` |
| API | `https://theoherve.fr/usb-key-song-update/api/*` |

## ⚙️ Configuration Spotify

Dans Spotify Developer Dashboard, utilisez :

```
Redirect URI: https://theoherve.fr/usb-key-song-update/api/spotify/callback
```

## 📦 Fichiers Concernés

- `src/index.ts` - Meta tags ajoutés
- `.htaccess` - Configuration Apache
- `.env.production.example` - URL de callback mise à jour
- `public/robots.txt` - Exclusion totale

## ✅ Vérification

Pour vérifier que le no-index fonctionne :

### 1. Inspecter le HTML
```bash
curl -I https://theoherve.fr/usb-key-song-update/
```

Vous devriez voir :
```
X-Robots-Tag: noindex, nofollow
```

### 2. Vérifier le robots.txt
```bash
curl https://theoherve.fr/usb-key-song-update/robots.txt
```

Résultat attendu :
```
User-agent: *
Disallow: /
```

### 3. Google Search Console
Si vous avez Google Search Console, vérifiez que l'URL n'apparaît pas dans l'index.

## 🔐 Pourquoi No-Index ?

- ✅ **Outil personnel** - Pas destiné au public
- ✅ **Confidentialité** - Ne pas exposer votre workflow DJ
- ✅ **SEO Portfolio** - Ne dilue pas le référencement de votre portfolio
- ✅ **Sécurité** - Moins de visibilité = moins de risques

## 🌐 Cohabitation avec le Portfolio

```
Portfolio (theoherve.fr)
  ↓ Indexé par Google
  ↓ SEO optimisé
  ↓ Public

USB Key App (theoherve.fr/usb-key-song-update/)
  ↓ Non indexé
  ↓ Privé
  ↓ Outil personnel
```

## 🛡️ Sécurité Supplémentaire (Optionnel)

### Ajouter une Authentification HTTP Basic

Si vous voulez protéger l'accès par mot de passe :

```apache
# Dans .htaccess
AuthType Basic
AuthName "Restricted Area"
AuthUserFile /path/to/.htpasswd
Require valid-user
```

Créer le fichier .htpasswd :
```bash
htpasswd -c .htpasswd votre_username
```

### Restreindre par IP

```apache
# Autoriser seulement votre IP
Order Deny,Allow
Deny from all
Allow from 192.168.1.100
```

## 📝 Notes Importantes

- ✅ Le no-index est **actif par défaut**
- ✅ Aucune configuration supplémentaire n'est requise
- ✅ Cela n'empêche pas l'accès direct par URL
- ✅ Les utilisateurs avec le lien peuvent toujours y accéder
- ⚠️  Pour une vraie protection, ajoutez une authentification HTTP

---

**Votre portfolio reste propre et votre outil reste privé ! 🎯**
