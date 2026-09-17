# Helper

![Frank](https://habboxwiki.com/wiki/images/c/cf/Frank_08.gif?20140716155403)

Helper is een Chrome-extensie voor leet.city. Je gebruikt hem naast de gewone hotelclient om je kamer te bekijken, meubels vast te leggen en een kamer na te bouwen.

## Installeren

1. Download de repository als ZIP en pak hem uit.
2. Open `chrome://extensions` en zet **Ontwikkelaarsmodus** aan.
3. Klik op **Uitgepakte extensie laden** en kies de map waar `manifest.json` in staat.
4. Open leet.city of herlaad je bestaande hoteltab. Klik daarna op het Helper-icoon.

## Meegeleverde bestanden

- [catalogus.json](catalogus.json) is een cache met cataloguspagina's per meubeltype. Importeer hem via **Bouwen → Catalogus en diagnose → Cataloguscache importeren** als je niet zelf eerst de hele catalogus wilt doorzoeken. Helper vraagt de relevante pagina's nog wel opnieuw op voor de actuele prijs en beschikbaarheid.
- [kaart.json](kaart.json) is een looproute voor **Leet Loterij Banzai**, niet een kaart voor alle kamers. Importeer hem via **Overzicht → Route importeren** en gebruik hem in die kamer.

## Wat kun je ermee?

- **Overzicht:** bekijk je kamer en positie, importeer een route om rond te lopen en zet de visuele streamermodus aan.
- **Kamer:** bekijk meubels met de Furniture Inspector en download een snapshot van de meubels of het vloerplan.
- **Bouwen:** laad een snapshot en plaats meubels uit je inventaris. Ontbrekende meubels kun je in de catalogus laten zoeken en, na jouw bevestiging, kopen. De wachttijd tussen bouwacties is instelbaar.
- **Meer:** schrijf websocketverkeer mee, kopieer je ticket, houd de verbinding bij een herlaadbeurt tegen of herhaal een catalogusaankoop.

## Een kamer nabouwen

1. Ga naar de kamer die je wilt bewaren en klik bij **Kamer** op **Snapshot downloaden**.
2. Ga naar je eigen doelkamer en laad het snapshotbestand bij **Bouwen**.
3. Kies **Bouw met inventaris** als je de meubels al hebt. Anders kun je eerst **Zoek ontbrekende in catalogus** gebruiken en daarna **Koop ontbrekend + bouw**.

Zorg dat de doelkamer dezelfde vloerindeling heeft. Je kunt het vloerplan apart exporteren en in je eigen kamer toepassen. Daarvoor moet je de Floor Plan Editor in de doelkamer eerst een keer ongewijzigd opslaan.

## Goed om te weten

- Aankopen kosten je echte hotelvaluta. Helper laat de berekende kosten zien en vraagt om bevestiging voordat hij koopt.
- Niet ieder meubel is te koop. Bijvoorbeeld limiteds en bijzondere aanbiedingen worden overgeslagen.
- Streamermodus verandert alleen wat jij in de client ziet, niet je echte saldo of uiterlijk op de server.
- Een ticket geeft toegang tot je sessie. Deel het niet met anderen.
- Het toepassen van een vloerplan vervangt de vloerindeling van je doelkamer. Maak zelf eerst een export als je de oude indeling wilt bewaren.
