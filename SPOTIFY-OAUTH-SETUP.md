# 🎵 Configuration OAuth Spotify

## Étape 1 : Créer une application Spotify

1. Va sur https://developer.spotify.com/dashboard
2. Clique sur "Create app"
3. Remplis les infos :
   - **App name** : USB Key Song Update
   - **Redirect URI** : `http://localhost:8888/callback`
4. Coche "Web API"
5. Sauvegarde et note ton **Client ID** et **Client Secret**

## Étape 2 : Obtenir ton Refresh Token

### Méthode simple avec curl :

1. **Ouvre ce lien dans ton navigateur** (remplace `CLIENT_ID` par ton Client ID) :

```
https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost:8888/callback&scope=user-library-read
```

2. Accepte les permissions

3. Tu seras redirigé vers `http://localhost:8888/callback?code=XXXXXXX`
   - Copie le code après `code=`

4. **Dans le terminal**, exécute cette commande (remplace `CODE`, `CLIENT_ID` et `CLIENT_SECRET`) :

```bash
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=CODE" \
  -d "redirect_uri=http://localhost:8888/callback" \
  -d "client_id=CLIENT_ID" \
  -d "client_secret=CLIENT_SECRET"
```

5. Tu obtiendras une réponse JSON avec :
   - `access_token` (temporaire)
   - `refresh_token` ⭐ **C'EST CELUI-CI QU'ON VEUT !**

6. **Ajoute le refresh token dans ta configuration** via l'interface Settings ou directement dans `data/config.json` :

```json
{
  "spotify": {
    "clientId": "ton_client_id",
    "clientSecret": "ton_client_secret",
    "refreshToken": "ton_refresh_token_ici"
  }
}
```

## Étape 3 : Tester

Une fois configuré, lance :

```bash
npm start
```

Et clique sur "Download New Tracks" dans l'interface !

---

**Note** : Le refresh token ne expire jamais (sauf si tu révoque l'app). Tu n'auras à faire cette procédure qu'une seule fois ! 🎉
