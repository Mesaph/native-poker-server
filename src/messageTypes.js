/**
 * Datei enthält Message-Types, die als type innerhalb der Message-Objekte verwendet werden.
 */


// Es wird eine neue Sitzung angelegt.
export const CREATE_SESSION = 'CREATE_SESSION';
// Bestätigung nach dem anlegen einer neuen Session
export const SESSION_CREATED = 'SESSION_CREATED';
// Client fragt nach den verfügbaren Sessions
export const REQUEST_AVAILABLE_SESSIONS = 'REQUEST_AVAILABLE_SESSIONS';
// Server teilt update der Session-Liste den Clients mit
export const UPDATE_AVAILABLE_SESSIONS = 'UPDATE_AVAILABLE_SESSIONS';
// Client verbindet sich mit einer Session
export const CONNECT_TO_SESSION = 'CONNECT_TO_SESSION';
// Session-Informationen wurden geupdatet (neuer Teilnehmer)
export const UPDATE_SESSION = 'UPDATE_SESSION';
// Schätzung startet
export const START = 'START';
// Stimme von CLient wurde abgegeben.
export const VOTE = 'VOTE';
// Alle Teilnhemer haben geschätzt 
export const VOTE_FINSHED = 'VOTE_FINSHED';
// Update der aktuellen Umfragedaten (Anzahl abgegebener Stimmen)
export const UPDATE_VOTE_PROGRESS = 'UPDATE_VOTE_PROGRESS';

