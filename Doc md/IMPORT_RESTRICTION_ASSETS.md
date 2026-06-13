# Import — état fonctionnel & restriction des assets (Computer / Monitor / Phone)

## 1. L'import est-il fonctionnel ?

**Oui, au niveau code.** Le pipeline d'import est complet et cohérent
(`newapp_Glpi/src/services/import.js`, appelé par `ImportView.vue` via `importAll`) :

1. Ouverture de session GLPI (API v1 legacy).
2. Validation des colonnes des 3 CSV (`EXPECTED_COLUMNS`).
3. Import des **éléments** (assets) — lots de 5.
4. Import des **tickets** + liaison aux éléments (`Item_Ticket`) — lots de 5.
5. Import des **coûts** (`TicketCost`) — lots de 10.
6. Upload des **images** (Documents) + liaison (`Document_Item`).
7. **Rollback all-or-nothing** en cas d'échec.

> Réserve : non vérifié « en live » ici, car `glpi.local` n'est pas joignable
> depuis l'environnement de test. Le code est correct, mais le test bout-en-bout
> doit se faire sur ta machine (GLPI accessible).

---

## 2. Restreindre l'import à Computer / Monitor / Phone

### Fichier OBLIGATOIRE à modifier (le seul indispensable)

**`newapp_Glpi/src/services/import.js`** — fonction `importElements`.

C'est ici que le type d'asset est choisi. Deux points :

1. **`ITEM_TYPE_CONFIG`** (≈ lignes 281-288) : ne garder que les 3 types voulus.
```js
const ITEM_TYPE_CONFIG = {
  Computer: { endpoint: 'Computer', modelField: 'computermodels_id', modelType: 'ComputerModel' },
  Monitor:  { endpoint: 'Monitor',  modelField: 'monitormodels_id',  modelType: 'MonitorModel' },
  Phone:    { endpoint: 'Phone',    modelField: 'phonemodels_id',    modelType: 'PhoneModel' }
  // Printer / Peripheral / NetworkEquipment supprimés
}
```

2. **Comportement par défaut** (≈ ligne 311) : actuellement, un type inconnu est
   importé **par défaut en Computer**. Pour « ne prendre en compte que ces 3
   assets », il faut **ignorer** les lignes d'un autre type au lieu de les forcer
   en Computer :
```js
// AVANT : const config = ITEM_TYPE_CONFIG[itemType] || ITEM_TYPE_CONFIG.Computer
const config = ITEM_TYPE_CONFIG[itemType]
if (!config) return null   // type non autorisé -> ligne ignorée
```

> Avec ces 2 changements, seuls Computer, Monitor et Phone sont créés ; les autres
> types présents dans le CSV sont simplement ignorés.

---

### Fichiers OPTIONNELS (cohérence dans toute l'app)

Non nécessaires pour l'import lui-même, mais à modifier si tu veux que **toute
l'application** ne manipule que ces 3 assets :

- **`newapp_Glpi/src/stores/glpi.js`**
  - `DROPDOWN_TYPES` : retirer `PrinterModel`, `PeripheralModel`,
    `NetworkEquipmentModel` (purgés au reset).
  - `purgeAllData` : retirer les purges `Printer`/`Peripheral`/`NetworkEquipment`.
  - `fetchStats` (dashboard) : ne lister que Computer/Monitor/Phone.
  - `importToGlpi` : autre chemin d'import (actuellement **non utilisé** par les
    vues ; ne gère déjà que Computer/Monitor). À aligner seulement s'il est réactivé.

- **`newapp_Glpi/src/services/glpiApi.js`**
  - Les helpers `getPrinters/getPhones/getPeripherals/getNetworkEquipments` et
    leurs `delete*` ne sont utilisés que par `fetchStats` et la purge. À nettoyer
    seulement si tu touches les points ci-dessus. (Garder `getPhones`/`deletePhone`.)

- **`newapp_Glpi/src/services/csv.js`**
  - `parseCsvFiles` détecte juste le type de fichier via les colonnes ; **aucun
    changement requis** pour filtrer les assets (laissé ici pour info).

---

## 3. Récapitulatif

| Fichier | Obligatoire ? | Quoi modifier |
|---|---|---|
| `src/services/import.js` | ✅ Oui | `ITEM_TYPE_CONFIG` (3 types) + ignorer les types non autorisés (`if (!config) return null`) |
| `src/stores/glpi.js` | ⬜ Optionnel | `DROPDOWN_TYPES`, `purgeAllData`, `fetchStats`, (`importToGlpi`) |
| `src/services/glpiApi.js` | ⬜ Optionnel | helpers get/delete des types retirés |
| `src/services/csv.js` | ⬜ Non | rien (détection de fichier uniquement) |

**En une phrase :** pour ne prendre en compte que Computer/Monitor/Phone à
l'import, **un seul fichier suffit : `src/services/import.js`**. Les autres
fichiers ne servent qu'à propager la restriction au reste de l'app (dashboard,
reset).
