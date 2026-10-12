# Durées de conservation (PROPOSITION — à valider)
| Donnée | Durée proposée | Mise en œuvre |
|---|---|---|
| Avis et scans | durée du contrat + 12 mois | **À FAIRE** : tâche planifiée de purge (non implémentée) |
| Additions et paiements | 10 ans (obligations comptables, à confirmer) | conservation |
| Journal d'activité | 12 mois minimum | append-only ; purge non implémentée |
| Empreintes d'appareil | 12 mois | purge à implémenter |
| Compte restaurant résilié | suppression sous 30 jours sur demande | `erase_restaurant` (testé) |
Export à la demande : `export_restaurant_data` (testé).