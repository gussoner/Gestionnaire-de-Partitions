let allFiles = []; 
let pdfFiles = []; 
let selectedFiles = []; 
let currentPlaylist = []; 
let currentSongIndex = 0; 
let allSelectedState = false;

document.addEventListener('DOMContentLoaded', () => {
    // Initialisation des traductions de la page
    initTranslations();

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

/**
 * Traduit automatiquement le HTML et ses placeholders à partir du dictionnaire i18n
 */
function initTranslations() {
    if (typeof chrome !== 'undefined' && chrome.i18n) {
        // 1. Traduction des nœuds de texte
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const message = chrome.i18n.getMessage(key);
            if (message) {
                // On cherche s'il y a un nœud de texte pur à modifier
                const textNode = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (textNode) {
                    textNode.textContent = message;
                } else {
                    element.textContent = message;
                }
            }
        });

        // 2. Traduction des placeholders d'inputs
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const message = chrome.i18n.getMessage(key);
            if (message) element.placeholder = message;
        });
    }
}

/**
 * Récupère un message traduit ou renvoie une valeur par défaut en cas d'absence de l'API (mode local file://)
 */
function getTranslation(key, defaultValue, substitutions = null) {
    if (typeof chrome !== 'undefined' && chrome.i18n) {
        return chrome.i18n.getMessage(key, substitutions) || defaultValue;
    }
    return defaultValue;
}

function processFiles(filesArray) {
    allFiles = filesArray;
    pdfFiles = allFiles.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    
    const countText = getTranslation('file_count_found', `${pdfFiles.length} partition(s) PDF trouvée(s).`, String(pdfFiles.length));
    document.getElementById('file-count').innerText = countText;
    document.getElementById('folder-picker-zone').className = "bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6 text-center text-sm";
    
    const serialized = pdfFiles.map(f => ({ name: f.name, path: f.webkitRelativePath }));
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 'cached_pdf_list': serialized });
    }
    renderPDFList();
}

function tryLoadStoredFiles() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn("L'extension est exécutée en dehors de son contexte (file://).");
        return;
    }

    chrome.storage.local.get('cached_pdf_list', (data) => {
        if (data.cached_pdf_list) {
            pdfFiles = data.cached_pdf_list.map(item => {
                const blob = new Blob([""], { type: "application/pdf" });
                blob.name = item.name; blob.webkitRelativePath = item.path;
                return blob;
            });
            allFiles = [...pdfFiles];
            
            const memoryText = getTranslation('file_count_memory', `${pdfFiles.length} partition(s) prêtes en mémoire.`, String(pdfFiles.length));
            document.getElementById('file-count').innerText = memoryText;
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
            
            const checkbox = document.createElement('input');
            checkbox.type = "checkbox";
            checkbox.id = `pdf-${index}`;
            checkbox.value = index;
            checkbox.className = "w-5 h-5 text-emerald-600 rounded bg-gray-800 border-gray-600 focus:ring-emerald-500";
            checkbox.addEventListener('change', updateSelection);

            const label = document.createElement('label');
            label.htmlFor = `pdf-${index}`;
            label.className = "flex-1 cursor-pointer truncate";
            
            const pathParts = file.webkitRelativePath.split('/');
            const baseName = file.name.replace(/\.[Pp][Dd][Ff]$/, '');
            if (pathParts.length > 2) {
                const folderSpan = document.createElement('span');
                folderSpan.className = "text-emerald-400 font-medium";
                folderSpan.textContent = `[${pathParts[pathParts.length - 2]}] `;
                label.appendChild(folderSpan);
                label.appendChild(document.createTextNode(baseName));
            } else {
                label.textContent = baseName;
            }

            div.appendChild(checkbox);
            div.appendChild(label);
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
    
    const toggleText = allSelectedState ? getTranslation('btn_deselect_all', "Tout désélectionner") : getTranslation('btn_select_all', "Tout sélectionner");
    document.getElementById('btn-toggle-all').innerText = toggleText;
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
        
        const leftDiv = document.createElement('div');
        leftDiv.className = "flex items-center gap-3 truncate mr-4";
        
        const iconSpan = document.createElement('span');
        iconSpan.className = "text-gray-500";
        iconSpan.textContent = "☰";
        
        const numSpan = document.createElement('span');
        numSpan.className = "text-emerald-400 font-bold";
        numSpan.textContent = `${index + 1}.`;
        
        const textSpan = document.createElement('span');
        textSpan.className = "truncate";
        
        const pathParts = file.webkitRelativePath.split('/');
        const baseName = file.name.replace(/\.[Pp][Dd][Ff]$/, '');
        if (pathParts.length > 2) {
            const folderSpan = document.createElement('span');
            folderSpan.className = "text-emerald-400 font-medium";
            folderSpan.textContent = `[${pathParts[pathParts.length - 2]}] `;
            textSpan.appendChild(folderSpan);
            textSpan.appendChild(document.createTextNode(baseName));
        } else {
            textSpan.textContent = baseName;
        }
        
        leftDiv.appendChild(iconSpan);
        leftDiv.appendChild(numSpan);
        leftDiv.appendChild(textSpan);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = "btn-remove-song text-gray-400 hover:text-red-400 transition p-1 text-sm flex-shrink-0";
        deleteBtn.textContent = "🗑️";
        deleteBtn.title = getTranslation('title_remove', "Retirer");
        
        deleteBtn.addEventListener('click', () => {
            selectedFiles.splice(index, 1);
            const globalIdx = pdfFiles.indexOf(file);
            if(globalIdx !== -1) { const cb = document.getElementById(`pdf-${globalIdx}`); if(cb) cb.checked = false; }
            updateSelection(); 
            renderSortableList();
        });
        
        item.appendChild(leftDiv);
        item.appendChild(deleteBtn);
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
    if(name && typeof chrome !== 'undefined' && chrome.storage) {
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
        
        const baseName = file.name.replace(/\.[Pp][Dd][Ff]$/, '');
        const pathParts = file.webkitRelativePath.split('/');
        const shortName = pathParts.length > 2 ? pathParts[pathParts.length - 2] : baseName;
        
        const numSpan = document.createElement('span');
        numSpan.className = "text-gray-500 text-xs";
        numSpan.textContent = index + 1;
        
        const titleSpan = document.createElement('span');
        titleSpan.className = "truncate";
        titleSpan.textContent = shortName;
        
        btn.appendChild(numSpan);
        btn.appendChild(titleSpan);
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
    
    const baseName = file.name.replace(/\.[Pp][Dd][Ff]$/, '');
    const pathParts = file.webkitRelativePath.split('/');
    document.getElementById('current-song-title').innerText = pathParts.length > 2 ? pathParts[pathParts.length - 2] : baseName;
}

function nextSong() { if (currentSongIndex < currentPlaylist.length - 1) jumpToSong(currentSongIndex + 1); }
function prevSong() { if (currentSongIndex > 0) jumpToSong(currentSongIndex - 1); }
function toggleSidebar(open) { document.getElementById('sidebar-index').classList.toggle('-translate-x-full', !open); }
function minimizeControls() { document.getElementById('viewer-controls').classList.add('hidden'); document.getElementById('viewer-trigger-btn').classList.remove('hidden'); }
function maximizeControls() { document.getElementById('viewer-trigger-btn').classList.add('hidden'); document.getElementById('viewer-controls').classList.remove('hidden'); }
function exitPlaylist() { toggleSidebar(false); document.getElementById('step-3').classList.add('hidden'); document.getElementById('step-1').classList.remove('hidden'); document.getElementById('pdf-viewer').src = ""; }

function loadSavedPlaylists() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    chrome.storage.local.get('band_playlists', (data) => {
        const playlists = data.band_playlists || {};
        const container = document.getElementById('playlists-list');
        container.innerHTML = '';
        const keys = Object.keys(playlists);
        document.getElementById('saved-playlists-section').classList.toggle('hidden', keys.length === 0);
        
        keys.forEach(name => {
            const group = document.createElement('div');
            group.className = "inline-flex items-center bg-gray-700 hover:bg-gray-650 rounded overflow-hidden transition shadow-sm";
            
            const playBtn = document.createElement('button');
            playBtn.className = "btn-play text-sm py-2 px-4 font-medium text-white flex items-center gap-2 hover:text-emerald-400 transition-colors";
            playBtn.textContent = `🎵 ${name}`;
            
            const editBtn = document.createElement('button');
            editBtn.className = "btn-edit bg-gray-800 hover:bg-amber-600 text-gray-400 hover:text-white h-full px-3 text-xs transition border-l border-gray-600/30";
            editBtn.textContent = "✏️";
            editBtn.title = getTranslation('title_modify', "Modifier");
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = "btn-delete bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white h-full px-3 text-xs transition border-l border-gray-600/30";
            deleteBtn.textContent = "✕";
            deleteBtn.title = getTranslation('title_delete', "Supprimer");

            playBtn.addEventListener('click', () => {
                currentPlaylist = [];
                playlists[name].forEach(path => { const match = allFiles.find(f => f.webkitRelativePath === path); if(match) currentPlaylist.push(match); });
                if(currentPlaylist.length > 0) {
                    document.getElementById('step-1').classList.add('hidden'); document.getElementById('step-2').classList.add('hidden');
                    document.getElementById('step-3').classList.remove('hidden'); maximizeControls(); buildSidebarIndex(); jumpToSong(0);
                } else { 
                    const alertMsg = getTranslation('alert_select_folder', "Sélectionnez d'abord le dossier de votre groupe pour lier les fichiers.");
                    alert(alertMsg); 
                }
            });
            
            editBtn.addEventListener('click', () => {
                document.querySelectorAll('#pdf-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
                selectedFiles = [];
                playlists[name].forEach(path => {
                    const idx = pdfFiles.findIndex(f => f.webkitRelativePath === path);
                    if (idx !== -1) { selectedFiles.push(pdfFiles[idx]); const cb = document.getElementById(`pdf-${idx}`); if(cb) cb.checked = true; }
                });
                updateSelection(); document.getElementById('playlist-name').value = name;
                document.getElementById('step-1').classList.add('hidden'); document.getElementById('step-2').classList.remove('hidden'); renderSortableList();
            });
            
            deleteBtn.addEventListener('click', () => {
                const confirmMsg = getTranslation('confirm_delete_playlist', `Supprimer la playlist "${name}" ?`, name);
                if(confirm(confirmMsg)) { delete playlists[name]; chrome.storage.local.set({ 'band_playlists': playlists }, loadSavedPlaylists); }
            });
            
            group.appendChild(playBtn);
            group.appendChild(editBtn);
            group.appendChild(deleteBtn);
            container.appendChild(group);
        });
    });
}