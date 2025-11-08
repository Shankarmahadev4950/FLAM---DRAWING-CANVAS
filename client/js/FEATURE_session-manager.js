class DrawingSessionPersistence {
    constructor(canvasElementId) {
        this.canvasElementId = canvasElementId;
        this.savedSessionsList = [];
        this.loadSavedSessionsFromStorage();
    }

    saveCurrentDrawingSession(customSessionName = null) {
        const sessionDisplayName = customSessionName || `Drawing_${new Date().toLocaleTimeString()}`;
        const canvasElement = document.getElementById(this.canvasElementId);
        const canvasImageDataUrl = canvasElement.toDataURL('image/png');
        
        const sessionObject = {
            sessionUniqueId: Date.now(),
            displayName: sessionDisplayName,
            createdTimestamp: new Date().toISOString(),
            canvasImageData: canvasImageDataUrl
        };
        
        this.savedSessionsList.push(sessionObject);
        this.persistSessionsToStorage();
        console.log('Session saved:', sessionDisplayName);
        
        return sessionObject;
    }

    loadDrawingSession(sessionIdToLoad) {
        const sessionObject = this.savedSessionsList.find(session => session.sessionUniqueId === sessionIdToLoad);
        
        if (!sessionObject) {
            console.error('Session not found');
            return false;
        }
        
        const loadedImage = new Image();
        loadedImage.onload = () => {
            const canvasElement = document.getElementById(this.canvasElementId);
            const canvasContext = canvasElement.getContext('2d');
            canvasContext.drawImage(loadedImage, 0, 0);
            console.log('Session loaded:', sessionObject.displayName);
        };
        
        loadedImage.src = sessionObject.canvasImageData;
        return true;
    }

    deleteDrawingSession(sessionIdToDelete) {
        this.savedSessionsList = this.savedSessionsList.filter(session => session.sessionUniqueId !== sessionIdToDelete);
        this.persistSessionsToStorage();
    }

    getAllSavedSessions() {
        return this.savedSessionsList;
    }

    persistSessionsToStorage() {
        try {
            localStorage.setItem('drawsync_sessions', JSON.stringify(this.savedSessionsList));
        } catch (storageError) {
            console.error('Storage error:', storageError);
        }
    }

    loadSavedSessionsFromStorage() {
        try {
            const storedSessions = localStorage.getItem('drawsync_sessions');
            this.savedSessionsList = storedSessions ? JSON.parse(storedSessions) : [];
        } catch (loadError) {
            console.error('Load storage error:', loadError);
            this.savedSessionsList = [];
        }
    }

    exportDrawingAsPNG(downloadFilenameString = 'drawing.png') {
        const canvasElement = document.getElementById(this.canvasElementId);
        const downloadLink = document.createElement('a');
        downloadLink.href = canvasElement.toDataURL('image/png');
        downloadLink.download = downloadFilenameString;
        downloadLink.click();
    }
}
