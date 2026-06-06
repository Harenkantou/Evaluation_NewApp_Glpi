# NewApp — Modèle de données (déduit des 3 CSV)

## Vue d'ensemble des relations

```
ElementType (Computer, Monitor, ...)
     │ 1
     │
     │ N
  Element ──────N────┐
 (Feuille 1)         │
                     │ (table de liaison ticket_element, via colonne "Items")
                     │
   Ticket ──────N────┘
 (Feuille 2)
     │ 1
     │
     │ N
  TicketCost
 (Feuille 3)
```

## Entités

### ElementType  (dérivée de Feuille 1, colonne `Item_Type`)
But : permettre le "détail par type" du dashboard.
| champ | type | source |
|---|---|---|
| id | Long (PK) | auto |
| name | String (unique) | `Item_Type` (Computer, Monitor) |

### Element  (Feuille 1)
| champ | type | source CSV |
|---|---|---|
| id | Long (PK) | auto |
| name | String (unique) | `Name` (sert de clé fonctionnelle pour les liaisons) |
| status | String | `Status` |
| location | String | `Location` |
| manufacturer | String | `Manufacturer` |
| type | ElementType (FK) | `Item_Type` |
| model | String | `Model` |
| inventoryNumber | String | `Inventory_Number` |
| user | String (nullable) | `User` |
| imagePath | String (nullable) | (rempli depuis le ZIP, match par name/model) |

### Ticket  (Feuille 2)
| champ | type | source CSV |
|---|---|---|
| id | Long (PK) | auto |
| refTicket | Integer (unique) | `Ref_Ticket` (clé pour lier les coûts) |
| date | LocalDate | `Date` (format dd/MM/yyyy) |
| heure | LocalTime | `Heure` (HH:mm) |
| type | String | `Type` (Incident, ...) -> "détail par type" du dashboard |
| titre | String | `Titre` |
| description | String (TEXT) | `Description` |
| status | String | `Status` (New, ...) |
| priority | String | `Priority` (Medium, ...) |
| elements | Set<Element> (N-N) | `Items` (tableau JSON de Name) |

### TicketCost  (Feuille 3) — plusieurs lignes par ticket
| champ | type | source CSV |
|---|---|---|
| id | Long (PK) | auto |
| ticket | Ticket (FK) | `Num_Ticket` (= Ref_Ticket) |
| durationSecond | Integer | `Duration_second` |
| timeCost | BigDecimal | `Time_Cost` (décimale FR: "8,7" -> 8.7) |
| fixedCost | BigDecimal | `Fixed_Cost` |

### ticket_element  (table de liaison N-N, générée par JPA)
| ticket_id | element_id |

## Pièges de parsing à gérer dans ImportService
1. **Encodage** : accents (Comptabilité, Bibliothèque) -> lire en **UTF-8**.
2. **Décimales françaises** : `Time_Cost = "8,7"` -> remplacer `,` par `.` avant parse.
3. **Colonne Items** : JSON échappé `"[""PC-ADM-001""]"` -> déséchapper puis parser en JSON.
4. **Lignes vides** en fin de fichier (Feuille 1 se termine par une ligne vide).
5. **Champs nullable** : `User` peut être vide (PC-FORM-001).
6. **Ordre d'import** : Éléments d'abord, puis Tickets (qui référencent les éléments par name), puis Coûts (qui référencent les tickets par Ref_Ticket).

## Impact sur le Dashboard (1.d)
- Nombre d'éléments total = `count(Element)` = 10
- Détail par type = `group by ElementType` -> Computer: 9, Monitor: 1
- Nombre de tickets total = `count(Ticket)` = 2
- Détail par type = `group by Ticket.type` -> Incident: 2
