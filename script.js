// Port of a Code.org App Lab project to standard browser JS.
// This file is loaded by both `index.html` and `playlist-screen.html`.

// ---- small helpers (App Lab replacements) ----
function $(id) {
  return document.getElementById(id);
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function appendItem(list, item) {
  list.push(item);
}

function removeItem(list, index) {
  list.splice(index, 1);
}

function readText(id) {
  var el = $(id);
  return el ? el.value : "";
}

function readNumber(id) {
  var value = Number(readText(id));
  return Number.isFinite(value) ? value : 0;
}

function writeText(id, text) {
  var el = $(id);
  if (!el) return;
  if ("value" in el) el.value = String(text);
  else el.textContent = String(text);
}

function onClick(id, handler) {
  var el = $(id);
  if (!el) return;
  el.addEventListener("click", handler);
}

// ---- data model ----
function Song(name, artists, genre) {
  this.name = name;
  this.artists = artists;
  this.genre = genre;
}

var songs = [];

async function loadSongsFromCsv() {
  if (songs.length) return songs;
  var response = await fetch("./data.csv");
  if (!response.ok) throw new Error("Failed to load data.csv");
  var csvText = await response.text();
  songs = parseSongsCsv(csvText);
  return songs;
}

function parseSongsCsv(csvText) {
  var rows = parseCsv(csvText);
  if (!rows.length) return [];

  var header = rows[0];
  var nameIndex = header.indexOf("name");
  var artistsIndex = header.indexOf("artists");
  var genreIndex = header.indexOf("genre");
  if (nameIndex === -1 || artistsIndex === -1 || genreIndex === -1) return [];

  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row || row.length === 0) continue;
    appendItem(result, new Song(row[nameIndex] || "", row[artistsIndex] || "", row[genreIndex] || ""));
  }
  return result;
}

function parseCsv(csvText) {
  // Simple RFC4180-ish CSV parser (handles quoted fields + escaped quotes).
  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;

  for (var i = 0; i < csvText.length; i++) {
    var ch = csvText[i];

    if (inQuotes) {
      if (ch === '"') {
        var next = csvText[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (ch === "\r") {
      continue;
    }

    field += ch;
  }

  row.push(field);
  rows.push(row);
  return rows;
}

// ---- playlist logic (same as App Lab) ----
function makePlaylist(numberOfSongs, genre, artists) {
  var filteredSongs = filterSongs(songs, genre, artists);
  var playlist = [];

  for (var i = 0; i < numberOfSongs; i++) {
    if (filteredSongs.length === 0) return playlist;

    var randomIndex = randomNumber(0, filteredSongs.length - 1);
    appendItem(playlist, filteredSongs[randomIndex]);
    removeItem(filteredSongs, randomIndex);
  }

  return playlist;
}





// function to create a playlist of x # of songs from a certain genre/artist
function makePlaylist(numberOfSongs, genre, artists) {
    var filteredSongs = filterSongs(songs, genre, artists);
    var playlist = [];

    for (var i = 0; i < numberOfSongs; i++) {
      
      if (filteredSongs.length == 0) {
        return playlist;
      }
      
      var randomIndex = randomNumber(0, filteredSongs.length - 1);
      
      appendItem(playlist, filteredSongs[randomIndex]);
      removeItem(filteredSongs, randomIndex);
    }
    
    return playlist;
}

// function to filter the list of songs based on a specific genre and/or artist
function filterSongs(songs, genre, artists) {
    var filteredSongs = [];

    for (var i = 0; i < songs.length; i++) {
      var song = songs[i];
      
      if (checkSong(song, genre, artists)) {
        appendItem(filteredSongs, song);
      }
    }
    
    return filteredSongs;
}

// checks if a song matches the right artist and genre
function checkSong(song, genre, artists) {
    return checkGenre(song, genre) && checkArtists(song, artists);
}

// checks if a song matches a genre
function checkGenre(song, genre) {
    if (genre == null) {
        return true;
    }
    else if (song.genre == genre) {
        return true;
    }
    
    return false;
}


// ---- page wiring ----
var playlist = [];
var numberOfSongs = 3;
var currentOutputIndex = 0;
var genre = null;

function outputSong() {
  if (!playlist.length) {
    writeText("songOutput", "No songs matched your settings. Try a different genre or fewer songs.");
    return;
  }

  var song = playlist[currentOutputIndex];
  writeText(
    "songOutput",
    "Song #" +
      (currentOutputIndex + 1) +
      ".\n\nName: " +
      song.name +
      "\n\nArtist(s): " +
      song.artists +
      "\n\nGenre: " +
      song.genre
  );
}

function loadStateFromSession() {
  try {
    var raw = sessionStorage.getItem("playlist_state");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function saveStateToSession() {
  sessionStorage.setItem(
    "playlist_state",
    JSON.stringify({
      playlist,
      numberOfSongs,
      genre,
      currentOutputIndex,
    })
  );
}

function normalizeGenre(rawGenre) {
  if (!rawGenre || rawGenre === "none") return null;
  return rawGenre;
}

async function initIndexPage() {
  await loadSongsFromCsv();

  writeText("songNumberDropdown", numberOfSongs);

  onClick("generatePlaylistButton", function () {
    genre = normalizeGenre(readText("genreDropdown"));
    numberOfSongs = readNumber("songNumberDropdown");

    playlist = makePlaylist(numberOfSongs, genre, null);
    currentOutputIndex = 0;
    saveStateToSession();
    window.location.href = "./playlist-screen.html";
  });
}

async function initPlaylistPage() {
  await loadSongsFromCsv();

  var state = loadStateFromSession();
  if (state) {
    playlist = Array.isArray(state.playlist) ? state.playlist : [];
    numberOfSongs = Number(state.numberOfSongs) || 3;
    genre = state.genre ?? null;
    currentOutputIndex = Number(state.currentOutputIndex) || 0;
  }

  // If someone loaded the playlist page directly, generate a default playlist.
  if (!playlist.length) {
    playlist = makePlaylist(numberOfSongs, genre, null);
    currentOutputIndex = 0;
    saveStateToSession();
  }

  outputSong();

  onClick("nextSongButton", function () {
    currentOutputIndex++;
    if (currentOutputIndex >= playlist.length) currentOutputIndex = 0;
    saveStateToSession();
    outputSong();
  });

  onClick("previousSongButton", function () {
    currentOutputIndex--;
    if (currentOutputIndex < 0) currentOutputIndex = playlist.length - 1;
    saveStateToSession();
    outputSong();
  });

  onClick("regeneratePlaylistButton", function () {
    playlist = makePlaylist(numberOfSongs, genre, null);
    currentOutputIndex = 0;
    saveStateToSession();
    outputSong();
  });

  onClick("homeButton", function () {
    window.location.href = "./index.html";
  });
}

document.addEventListener("DOMContentLoaded", function () {
  if ($("generatePlaylistButton")) {
    initIndexPage().catch(function (err) {
      console.error(err);
      alert("Failed to load song data. See console for details.");
    });
  } else if ($("songOutput")) {
    initPlaylistPage().catch(function (err) {
      console.error(err);
      alert("Failed to load song data. See console for details.");
    });
  }
});

// checks if a song matches an artist
function checkArtists(song, artists) {
    if (artists == null) {
        return true;
    }
    else if (song.artists == artists) {
        return true;
    }
    
    return false;
}

/* Citations

dataset from https://www.kaggle.com/datasets/ambaliyagati/spotify-dataset-for-playing-around-with-sql

App built with code.org app lap
Used code.org random icon
*/
