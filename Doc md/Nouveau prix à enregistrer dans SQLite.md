Nouveau prix à enregistrer dans SQLite

Lorsque le ticket passe à l'état « Terminé », afficher une boîte de dialogue permettant de saisir un nouveau coût.

Nouvelle page de gestion des coûts :
- Afficher la liste des éléments (Items). Moniteur, Computer, Phone
- Afficher le coût actuel déjà enregistré. => données GLPI 
- Afficher le nouveau coût saisi. => SQLite 
- Calculer et afficher le coût total par actif (asset). Somme 

Répartition des coûts :
- Si un ticket comporte un coût global, celui-ci doit être réparti entre les éléments(Item) selon données  :
  - Moniteur (Monitor)
  - Ordinateur (Computer)
  - Téléphone (Phone)

Colonnes à afficher :
-Item Type: Monitor, Computer, Phone
- Coût GLPI
- Coût SuperCost de SQLite
-Total

