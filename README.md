# Inchiesta su Gesù — fascicolo didattico interattivo

Realizzato dal prof. **Riefolo Giovanni**, docente IRC al **IIS Ferrari Fermi di Verona**.

Landing page autonoma per la scuola secondaria di secondo grado: un’indagine storico-critica interattiva su fonti, archeologia, scienza, processo e dibattito.

## Contenuti

- **Metodo**: fonte, fatto, indizio, interpretazione; banco di classificazione.
- **Tavole**: 8 immagini con didascalie, crediti, limite storico e lightbox accessibile.
- **Fonti**: 10 schede filtrabili (Paolo, Vangeli, Flavio Giuseppe, Tacito, Plinio, Talmud, apocrifi, archeologia) e linea del tempo.
- **Atlante**: mappa schematica con 7 luoghi e schede critiche.
- **Scienza e reperti**: Sindone, stella di Betlemme, tomba di Talpiot, crocifissione; 8 affermazioni da classificare.
- **Processo**: tre domande, verdetto sulle convergenze e avvertenza contro l’uso antisemita delle fonti.
- **Dibattito a bivi**: tre dilemmi con punto forte e punto debole di ogni posizione.
- **Laboratorio del ritratto**: scelta di 3–5 tratti, livello di fiducia, autovalutazione, esportazione `.txt` e stampa.
- **Autovalutazione**: 8 domande con feedback e risultato non punitivo.
- **Glossario** e **sezione docente** con obiettivi, tempi, rubrica, adattamenti e bibliografia.

## Pubblicazione

- Sito: <https://riefolog-cyber.github.io/inchiesta-su-gesu/>
- Repository: <https://github.com/riefolog-cyber/inchiesta-su-gesu>

Il sito è pubblicato con GitHub Pages dal branch `main`, nella cartella principale.

## Come aprirla

Non richiede build né dipendenze. Apri `index.html` in un browser oppure servi la cartella:

```bash
npx http-server . -p 4173
```

I progressi sono salvati solo in `localStorage`; non ci sono cookie, tracker o risorse esterne. Il pulsante “Azzera il fascicolo” cancella i dati locali.

## Accessibilità

- HTML semantico, skip link, focus visibile, contrasto alto.
- Interazioni con tastiera: tab, filtri, timeline, pin della mappa, gruppi di scelte.
- `aria-pressed`, `aria-expanded`, `aria-live`, ruoli tab corretti.
- Rispetto di `prefers-reduced-motion`.
- Stile di stampa dedicato al solo ritratto argomentato.

## File

- [index.html](index.html) — struttura e contenuti.
- [styles.css](styles.css) — tema fascicolo, responsive, stampa.
- [app.js](app.js) — interazioni, stato locale, esportazione, lightbox.
- [assets/plates](assets/plates) — tavole WebP e varianti responsive.
- [CREDITS.md](CREDITS.md) — crediti delle immagini e limiti d’uso.

Le tavole sono incluse a scopo didattico; i diritti restano dei rispettivi autori. La pubblicazione online non implica una licenza di riuso: per riusi editoriali o commerciali vanno sostituite con immagini di pubblico dominio/CC o autorizzate.

## Nota didattica

Il percorso distingue esplicitamente il piano della ricostruzione storica dal piano della confessione di fede. Non chiede agli studenti di dichiarare il proprio credo e non presenta la ricerca critica come una confutazione della fede. La sezione sul processo richiama il rischio storico dell’antigiudaismo e invita a non attribuire responsabilità collettive.
