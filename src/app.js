let allFiles = []; 
let pdfFiles = []; 
let selectedFiles = []; 
let currentPlaylist = []; 
let currentSongIndex = 0; 
let allSelectedState = false;

document.addEventListener('DOMContentLoaded', () => {
    // Écouteurs d'événements UI obligatoires pour l'extension
    document.getElementById('btn-select-folder').addEventListener('click', () => document.getElementById('folder-picker').click());
    document.getElementById('folder-picker').addEventListener('change', (e) => processFiles(Array.from(e.target.files)));
    document.getElementById('btn-toggle-all').addEventListener('click', toggleSelectAll);
    document.getElementById('search-filter').addEventListener('input', filterPDFList);
    document.getElementById('btn-clear-search').addEventListener('click', clearSearchFilter);
    document.getElementById('btn-to-step-2').addEventListener('click', goToStep2);
    document.getElementById('btn-add-songs').addEventListener('click', goToStep1);
    document.getElementById('btn-back-to-step1').addEventListener('click', goToStep1);
    document.getElementById('btn-launch-playlist').addEventListener('click', launchPlaylist);
    document.getElementById('btn-close-sidebar').addEventListener('click', () => toggleSidebar(false));
    document.getElementById('btn-open-sidebar').addEventListener('click', () => toggleSidebar(true));
    document.getElementById('viewer-trigger-btn').addEventListener('click', maximizeControls);
    document.getElementById('btn-minimize').addEventListener('click', minimizeControls);
    document.getElementById('btn-prev-song').addEventListener('click', prevSong);
    document.getElementById('btn-next-song').addEventListener('click', nextSong);
    document.getElementById('btn-exit-playlist').addEventListener('click', exitPlaylist);

    setupDragAndDrop();
    tryLoadStoredFiles();
    loadSavedPlaylists();
});

// Génère un affichage propre selon la structure du dossier (à plat ou avec sous-dossiers)
document.addEventListener('DOMContentLoaded', () => {
    // Écouteurs d'événements UI obligatoires pour l'extension
    document.getElementById('btn-select-folder').addEventListener('click', () => document.getElementById('folder-picker').click());
    document.getElementById('folder-picker').addEventListener('change', (e) => processFiles(Array.from(e.target.files)));
    document.getElementById('btn-toggle-all').addEventListener('click', toggleSelectAll);
    document.getElementById('search-filter').addEventListener('input', filterPDFList);
    document.getElementById('btn-clear-search').addEventListener('click', clearSearchFilter);
    document.getElementById('btn-to-step-2').addEventListener('click', goToStep2);
    document.getElementById('btn-add-songs').addEventListener('click', goToStep1);
    document.getElementById('btn-back-to-step1').addEventListener('click', goToStep1);
    document.getElementById('btn-launch-playlist').addEventListener('click', launchPlaylist);
    document.getElementById('btn-close-sidebar').addEventListener('click', () => toggleSidebar(false));
    document.getElementById('btn-open-sidebar').addEventListener('click', () => toggleSidebar(true));
    document.getElementById('viewer-trigger-btn').addEventListener('click', maximizeControls);
    document.getElementById('btn-minimize').addEventListener('click', minimizeControls);
    document.getElementById('btn-prev-song').addEventListener('click', prevSong);
    document.getElementById('btn-next-song').addEventListener('click', nextSong);
    document.getElementById('btn-exit-playlist').addEventListener('click', exitPlaylist);

    setupDragAndDrop();
    tryLoadStoredFiles();
    loadSavedPlaylists();
});

// Fonction utilitaire pour formater proprement le nom du morceau à l'affichage
function getCleanSongDisplay(file) {
    const pathParts = file.webkitRelativePath.split('/');
    const baseName = file.name.replace(/\.[Pp][Dd][Ff]$/, ''); // Enlève le .pdf sans casser la casse
    
    // Si pathParts.length > 2, il y a au moins un sous-dossier intermédiaire
    if (pathParts.length > 2) {
        const folderName = pathParts[pathParts.length - 2];
        return `<span class="text-emerald-400 font-medium">[${folderName}]</span> ${baseName}`;
    }
    
    // Fichier stocké directement à la racine du dossier sélectionné
    return baseName;
}

function processFiles(filesArray) {
    allFiles = filesArray;
    pdfFiles = allFiles.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    document.getElementById('file-count').innerText = `${pdfFiles.length} partition(s) PDF trouvée(s).`;
    document.getElementById('folder-picker-zone').className = "bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6 text-center text-sm";
    
    const serialized = pdfFiles.map(f => ({ name: f.name, path: f.webkitRelativePath }));
    chrome.storage.local.set({ 'cached_pdf_list': serialized });
    renderPDFList();
}

function tryLoadStoredFiles() {
    chrome.storage.local.get('cached_pdf_list', (data) => {
        if (data.cached_pdf_list) {
            pdfFiles = data.cached_pdf_list.map(item => {
                const blob = new Blob([""], { type: "application/pdf" });
                blob.name = item.name; blob.webkitRelativePath = item.path;
                return blob;
            });
            allFiles = [...pdfFiles];
            document.getElementById('file-count').innerText = `${pdfFiles.length} partition(s) prêtes en mémoire.`;
            renderPDFList();
        }
    });
}

function renderPDFList() {
    const container = document.getElementById('pdf-checkboxes'); 
    container.innerHTML = '';
    
    if(pdfFiles.length > 0) {
        document.getElementById('pdf-list-container').classList.remove('hidden');
        pdfFiles.sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));
        
        pdfFiles.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = "pdf-item-row flex items-center space-x-3 bg-gray-700 p-3 rounded hover:bg-gray-650 transition";
            div.setAttribute('data-search', file.webkitRelativePath.toLowerCase());
            
            div.innerHTML = `
                <input type="checkbox" id="pdf-${index}" value="${index}" class="w-5 h-5 text-emerald-600 rounded bg-gray-800 border-gray-600 focus:ring-emerald-500">
                <label for="pdf-${index}" class="flex-1 cursor-pointer truncate">
                    ${getCleanSongDisplay(file)}
                </label>
            `;
            div.querySelector('input').addEventListener('change', updateSelection);
            container.appendChild(div);
        });
        updateSelection(); 
        filterPDFList();
    }
}

function filterPDFList() {
    const query = document.getElementById('search-filter').value.toLowerCase().trim();
    const rows = document.querySelectorAll('.pdf-item-row');
    document.getElementById('btn-clear-search').classList.toggle('hidden', query.length === 0);
    rows.forEach(row => row.classList.toggle('hidden', !row.getAttribute('data-search').includes(query)));
}

function clearSearchFilter() {
    document.getElementById('search-filter').value = ''; 
    filterPDFList(); 
    document.getElementById('search-filter').focus();
}

function toggleSelectAll() {
    const visibleCheckboxes = document.querySelectorAll('.pdf-item-row:not(.hidden) input[type="checkbox"]');
    allSelectedState = !allSelectedState;
    visibleCheckboxes.forEach(cb => cb.checked = allSelectedState);
    document.getElementById('btn-toggle-all').innerText = allSelectedState ? "Tout désélectionner" : "Tout sélectionner";
    updateSelection();
}

function updateSelection() {
    const checkboxes = document.querySelectorAll('#pdf-checkboxes input[type="checkbox"]:checked');
    document.getElementById('btn-to-step-2').disabled = checkboxes.length === 0;
}

function goToStep1() {
    document.getElementById('step-2').classList.add('hidden'); 
    document.getElementById('step-1').classList.remove('hidden');
}

function goToStep2() {
    const checkboxes = document.querySelectorAll('#pdf-checkboxes input[type="checkbox"]:checked');
    const newSelection = Array.from(checkboxes).map(cb => pdfFiles[cb.value]);
    selectedFiles = selectedFiles.filter(f => newSelection.includes(f));
    newSelection.forEach(f => { if(!selectedFiles.includes(f)) selectedFiles.push(f); });
    document.getElementById('step-1').classList.add('hidden'); 
    document.getElementById('step-2').classList.remove('hidden');
    renderSortableList();
}

function renderSortableList() {
    const list = document.getElementById('sortable-list'); 
    list.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = "draggable bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between cursor-move select-none";
        item.draggable = true; 
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="flex items-center gap-3 truncate mr-4">
                <span class="text-gray-500">☰</span>
                <span class="text-emerald-400 font-bold">${index + 1}.</span>
                <span class="truncate">${getCleanSongDisplay(file)}</span>
            </div>
            <button class="btn-remove-song text-gray-400 hover:text-red-400 transition p-1 text-sm flex-shrink-0" title="Retirer">🗑️</button>
        `;
        
        item.querySelector('.btn-remove-song').addEventListener('click', () => {
            selectedFiles.splice(index, 1);
            const globalIdx = pdfFiles.indexOf(file);
            if(globalIdx !== -1) { const cb = document.getElementById(`pdf-${globalIdx}`); if(cb) cb.checked = false; }
            updateSelection(); 
            renderSortableList();
        });
        list.appendChild(item);
    });
}

function setupDragAndDrop() {
    const list = document.getElementById('sortable-list');
    list.addEventListener('dragstart', (e) => { if(e.target.classList.contains('draggable')) e.target.classList.add('dragging'); });
    list.addEventListener('dragend', (e) => {
        if(e.target.classList.contains('draggable')) {
            e.target.classList.remove('dragging');
            selectedFiles = Array.from(list.querySelectorAll('.draggable')).map(item => selectedFiles[item.dataset.index]);
            renderSortableList();
        }
    });
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = [...list.querySelectorAll('.draggable:not(.dragging)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect(); const offset = e.clientY - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child }; else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) list.appendChild(dragging); else list.insertBefore(dragging, afterElement);
    });
}

function launchPlaylist() {
    if(selectedFiles.length === 0) return;
    currentPlaylist = [...selectedFiles];
    const name = document.getElementById('playlist-name').value.trim();
    if(name) {
        chrome.storage.local.get('band_playlists', (data) => {
            let playlists = data.band_playlists || {};
            playlists[name] = currentPlaylist.map(f => f.webkitRelativePath);
            chrome.storage.local.set({ 'band_playlists': playlists }, loadSavedPlaylists);
        });
    }
    document.getElementById('step-1').classList.add('hidden'); 
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-3').classList.remove('hidden');
    maximizeControls(); 
    buildSidebarIndex(); 
    jumpToSong(0);
}

function buildSidebarIndex() {
    const container = document.getElementById('sidebar-tracks-list'); 
    container.innerHTML = '';
    
    currentPlaylist.forEach((file, index) => {
        const btn = document.createElement('button');
        btn.id = `sidebar-track-${index}`;
        btn.className = "w-full text-left p-2.5 rounded text-sm flex items-center gap-3 font-medium bg-gray-800 hover:bg-gray-700 transition";
        
        // Extraction épurée du titre pour la liste de l'index de la sidebar
        const baseName = file.name.replace(/\.[Pp][Dd][Ff]$/, '');
        const pathParts = file.webkitRelativePath.split('/');
        const shortName = pathParts.length > 2 ? pathParts[pathParts.length - 2] : baseName;
        
        btn.innerHTML = `<span class="text-gray-500 text-xs">${index + 1}</span> <span class="truncate">${shortName}</span>`;
        btn.addEventListener('click', () => { jumpToSong(index); toggleSidebar(false); });
        container.appendChild(btn);
    });
}

function jumpToSong(index) {
    currentSongIndex = index;
    currentPlaylist.forEach((_, i) => {
        const el = document.getElementById(`sidebar-track-${i}`);
        if(el) {
            el.className = i === index 
                ? "w-full text-left p-2.5 rounded text-sm flex items-center gap-3 font-bold bg-emerald-600 text-white shadow" 
                : "w-full text-left p-2.5 rounded text-sm flex items-center gap-3 font-medium bg-gray-800 hover:bg-gray-700 text-gray-300";
        }
    });
    loadPDF();
}

function loadPDF() {
    const file = currentPlaylist[currentSongIndex];
    let url = file.size === 0 ? file.webkitRelativePath : URL.createObjectURL(file);
    document.getElementById('pdf-viewer').src = `${url}#toolbar=1&navpanes=0&pagemode=none`;
    
    // Affichage propre du titre en cours dans la barre d'outils
    const baseName = file.name.replace(/\.[Pp][Dd][Ff]$/, '');
    const pathParts = file.webkitRelativePath.split('/');
    document.getElementById('current-song-title').innerText = pathParts.length > 2 ? pathParts[pathParts.length - 2] : baseName;
}

function nextSong() { if (currentSongIndex < currentPlaylist.length - 1) jumpToSong(currentSongIndex + 1); }
// Réalignement de prevSong() déplacé par sécurité
function prevSong() { if (currentSongIndex > 0) jumpToSong(currentSongIndex - 1); }
function toggleSidebar(open) { document.getElementById('sidebar-index').classList.toggle('-translate-x-full', !open); }
function minimizeControls() { document.getElementById('viewer-controls').classList.add('hidden'); document.getElementById('viewer-trigger-btn').classList.remove('hidden'); }
function maximizeControls() { document.getElementById('viewer-trigger-btn').classList.add('hidden'); document.getElementById('viewer-controls').classList.remove('hidden'); }
function exitPlaylist() { toggleSidebar(false); document.getElementById('step-3').classList.add('hidden'); document.getElementById('step-1').classList.remove('hidden'); document.getElementById('pdf-viewer').src = ""; }

function loadSavedPlaylists() {
    chrome.storage.local.get('band_playlists', (data) => {
        const playlists = data.band_playlists || {};
        const container = document.getElementById('playlists-list');
        container.innerHTML = '';
        const keys = Object.keys(playlists);
        document.getElementById('saved-playlists-section').classList.toggle('hidden', keys.length === 0);
        
        keys.forEach(name => {
            const group = document.createElement('div');
            group.className = "inline-flex items-center bg-gray-700 hover:bg-gray-650 rounded overflow-hidden transition shadow-sm";
            group.innerHTML = `
                <button class="btn-play text-sm py-2 px-4 font-medium text-white flex items-center gap-2 hover:text-emerald-400 transition-colors">🎵 ${name}</button>
                <button class="btn-edit bg-gray-800 hover:bg-amber-600 text-gray-400 hover:text-white h-full px-3 text-xs transition border-l border-gray-600/30" title="Modifier">✏️</button>
                <button class="btn-delete bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white h-full px-3 text-xs transition border-l border-gray-600/30" title="Supprimer">✕</button>
            `;
            group.querySelector('.btn-play').addEventListener('click', () => {
                currentPlaylist = [];
                playlists[name].forEach(path => { const match = allFiles.find(f => f.webkitRelativePath === path); if(match) currentPlaylist.push(match); });
                if(currentPlaylist.length > 0) {
                    document.getElementById('step-1').classList.add('hidden'); document.getElementById('step-2').classList.add('hidden');
                    document.getElementById('step-3').classList.remove('hidden'); maximizeControls(); buildSidebarIndex(); jumpToSong(0);
                } else { alert("Sélectionnez d'abord le dossier de votre groupe pour lier les fichiers."); }
            });
            group.querySelector('.btn-edit').addEventListener('click', () => {
                document.querySelectorAll('#pdf-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
                selectedFiles = [];
                playlists[name].forEach(path => {
                    const idx = pdfFiles.findIndex(f => f.webkitRelativePath === path);
                    if (idx !== -1) { selectedFiles.push(pdfFiles[idx]); const cb = document.getElementById(`pdf-${idx}`); if(cb) cb.checked = true; }
                });
                updateSelection(); document.getElementById('playlist-name').value = name;
                document.getElementById('step-1').classList.add('hidden'); document.getElementById('step-2').classList.remove('hidden'); renderSortableList();
            });
            group.querySelector('.btn-delete').addEventListener('click', () => {
                if(confirm(`Supprimer la playlist "${name}" ?`)) { delete playlists[name]; chrome.storage.local.set({ 'band_playlists': playlists }, loadSavedPlaylists); }
            });
            container.appendChild(group);
        });
    });
}