class SlideshowApp {
    constructor() {
        this.photos = [];
        this.currentIndex = 0;
        this.previewToken = null;
        this.duration = 5000; // milliseconds
        this.pollInterval = 30000; // milliseconds
        this.shuffle = false;
        this.pollTimer = null;
        this.slideTimer = null;
        this.isLoading = false;
        this.photoHashes = new Set(); // Track photo hashes for detecting new photos
        
        // DOM elements
        this.currentImg = document.getElementById('current-img');
        this.nextImg = document.getElementById('next-img');
        this.currentContainer = document.getElementById('current-image');
        this.nextContainer = document.getElementById('next-image');
        this.loading = document.getElementById('loading');
        this.settingsPanel = document.getElementById('settings-panel');
        this.durationInput = document.getElementById('duration');
        this.pollIntervalInput = document.getElementById('poll-interval');
        this.shuffleInput = document.getElementById('shuffle');
        this.photoCountSpan = document.getElementById('photo-count');
        this.currentIndexSpan = document.getElementById('current-index');
        
        this.init();
    }

    async init() {
        // Load settings from localStorage
        this.loadSettings();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial load
        await this.loadPhotos();
        
        // Start slideshow
        this.startSlideshow();
        
        // Start polling for updates
        this.startPolling();
    }

    loadSettings() {
        const savedDuration = localStorage.getItem('slideshow-duration');
        const savedPollInterval = localStorage.getItem('slideshow-poll-interval');
        const savedShuffle = localStorage.getItem('slideshow-shuffle');
        
        if (savedDuration) {
            this.duration = parseInt(savedDuration) * 1000;
            this.durationInput.value = savedDuration;
        }
        
        if (savedPollInterval) {
            this.pollInterval = parseInt(savedPollInterval) * 1000;
            this.pollIntervalInput.value = savedPollInterval;
        }
        
        if (savedShuffle !== null) {
            this.shuffle = savedShuffle === 'true';
            this.shuffleInput.checked = this.shuffle;
        }
    }

    saveSettings() {
        localStorage.setItem('slideshow-duration', this.durationInput.value);
        localStorage.setItem('slideshow-poll-interval', this.pollIntervalInput.value);
        localStorage.setItem('slideshow-shuffle', this.shuffleInput.checked);
        
        this.duration = parseInt(this.durationInput.value) * 1000;
        this.pollInterval = parseInt(this.pollIntervalInput.value) * 1000;
        this.shuffle = this.shuffleInput.checked;
        
        // Restart polling with new interval
        this.stopPolling();
        this.startPolling();
    }

    setupEventListeners() {
        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.settingsPanel.classList.remove('hidden');
        });
        
        // Close settings
        document.getElementById('close-settings').addEventListener('click', () => {
            this.saveSettings();
            this.settingsPanel.classList.add('hidden');
        });
        
        // Fullscreen button
        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Refresh photos button
        document.getElementById('refresh-photos').addEventListener('click', async () => {
            await this.loadPhotos(true);
        });
        
        // Settings inputs
        this.durationInput.addEventListener('change', () => {
            this.saveSettings();
            this.restartSlideshow();
        });
        
        this.pollIntervalInput.addEventListener('change', () => {
            this.saveSettings();
        });
        
        this.shuffleInput.addEventListener('change', () => {
            this.saveSettings();
            if (this.shuffle) {
                this.shufflePhotos();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.settingsPanel.classList.contains('hidden')) {
                this.settingsPanel.classList.add('hidden');
            } else if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            } else if (e.key === 's' || e.key === 'S') {
                this.settingsPanel.classList.toggle('hidden');
            }
        });
        
        // Touch gestures for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (this.settingsPanel.classList.contains('hidden')) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const diffX = touchStartX - touchEndX;
                const diffY = touchStartY - touchEndY;
                
                // Swipe right to open settings
                if (diffX < -50 && Math.abs(diffY) < 50) {
                    this.settingsPanel.classList.remove('hidden');
                }
            }
        });
    }

    async loadPhotos(forceRefresh = false) {
        if (this.isLoading && !forceRefresh) return;
        
        this.isLoading = true;
        this.loading.classList.remove('hidden');
        
        try {
            const response = await fetch('api/photos/all?order=random');
            if (!response.ok) {
                throw new Error(`Failed to load photos: ${response.status}`);
            }
            
            const data = await response.json();
            this.previewToken = data.previewToken;
            
            // Filter to only image files
            const imagePhotos = data.photos.filter(photo => {
                return photo.Type === 'image' && photo.Hash;
            });
            
            // Detect new photos
            const newPhotos = imagePhotos.filter(photo => !this.photoHashes.has(photo.Hash));
            
            if (newPhotos.length > 0 || forceRefresh) {
                // Update photo hashes
                imagePhotos.forEach(photo => this.photoHashes.add(photo.Hash));
                
                // Update photos array
                this.photos = imagePhotos;
                
                // Shuffle if enabled
                if (this.shuffle) {
                    this.shufflePhotos();
                }
                
                // Reset index if needed
                if (this.currentIndex >= this.photos.length) {
                    this.currentIndex = 0;
                }
                
                this.updateStatusBar();
                
                // If we have photos, show the first one
                if (this.photos.length > 0) {
                    await this.showPhoto(this.currentIndex);
                }
            }
        } catch (error) {
            console.error('Error loading photos:', error);
            this.loading.textContent = `Error: ${error.message}`;
        } finally {
            this.isLoading = false;
            this.loading.classList.add('hidden');
        }
    }

    shufflePhotos() {
        // Fisher-Yates shuffle
        for (let i = this.photos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.photos[i], this.photos[j]] = [this.photos[j], this.photos[i]];
        }
    }

    getImageUrl(hash) {
        if (!hash || !this.previewToken) return '';
        // Use fit_1920 for full-screen quality (can be changed to fit_2560 or fit_3840 for higher quality)
        return `api/v1/t/${hash}/${this.previewToken}/fit_1920`;
    }

    async showPhoto(index) {
        if (this.photos.length === 0) return;
        
        const photo = this.photos[index];
        const imageUrl = this.getImageUrl(photo.Hash);
        
        if (!imageUrl) return;
        
        // Preload next image
        const nextIndex = (index + 1) % this.photos.length;
        const nextPhoto = this.photos[nextIndex];
        const nextImageUrl = this.getImageUrl(nextPhoto.Hash);
        
        if (nextImageUrl) {
            this.nextImg.src = nextImageUrl;
        }
        
        // Show current image with fade
        return new Promise((resolve) => {
            this.currentImg.onload = () => {
                this.currentContainer.classList.remove('hidden');
                this.currentContainer.classList.add('fade-in');
                this.updateStatusBar();
                resolve();
            };
            
            this.currentImg.onerror = () => {
                console.error('Failed to load image:', imageUrl);
                resolve();
            };
            
            this.currentImg.src = imageUrl;
        });
    }

    nextPhoto() {
        if (this.photos.length === 0) return;
        
        this.currentIndex = (this.currentIndex + 1) % this.photos.length;
        this.showPhoto(this.currentIndex);
    }

    startSlideshow() {
        this.stopSlideshow();
        
        if (this.photos.length === 0) return;
        
        this.slideTimer = setInterval(() => {
            this.nextPhoto();
        }, this.duration);
    }

    stopSlideshow() {
        if (this.slideTimer) {
            clearInterval(this.slideTimer);
            this.slideTimer = null;
        }
    }

    restartSlideshow() {
        this.stopSlideshow();
        this.startSlideshow();
    }

    startPolling() {
        this.stopPolling();
        
        this.pollTimer = setInterval(() => {
            this.loadPhotos();
        }, this.pollInterval);
    }

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    updateStatusBar() {
        this.photoCountSpan.textContent = `${this.photos.length} photos`;
        this.currentIndexSpan.textContent = `${this.currentIndex + 1} / ${this.photos.length}`;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SlideshowApp();
    });
} else {
    new SlideshowApp();
}
