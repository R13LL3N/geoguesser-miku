// Handles image upload and cloud storage operations
class CloudStorage {
    constructor() {
        this.uploadEndpoint = '/api/upload-image';
    }

    // Upload a file with metadata
    async uploadImage(file, metadata) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Authentication required');
        }

        // Validate the file before uploading
        this.validateFile(file);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('metadata', JSON.stringify(metadata));

        try {
            const response = await fetch(this.uploadEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    // Validate file before upload
    validateFile(file) {
        // Check file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Only image files are allowed');
        }

        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            throw new Error('File size must be less than 5MB');
        }

        return true;
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export a singleton instance
window.cloudStorage = new CloudStorage();

// Handle image submission form
if (document.getElementById('submit-form')) {
    const form = document.getElementById('submit-form');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const preview = document.getElementById('image-preview');
    const fileName = document.getElementById('file-name');
    const loginWarning = document.getElementById('login-warning');

    // Show/hide form based on login status
    const token = localStorage.getItem('authToken');
    if (token) {
        form.classList.remove('hidden');
        loginWarning.style.display = 'none';
    }

    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });

    // Handle file selection
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                window.cloudStorage.validateFile(file);
                fileName.textContent = `${file.name} (${window.cloudStorage.formatFileSize(file.size)})`;
                preview.src = URL.createObjectURL(file);
                preview.classList.remove('hidden');
            } catch (error) {
                alert(error.message);
            }
        }
    }

    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) {
            alert('Please select an image to upload');
            return;
        }

        const country = document.getElementById('miku-country').value;
        if (!country) {
            alert('Please specify the country');
            return;
        }

        const isOwnWork = document.getElementById('is-own-work').checked;
        const artistCredit = document.getElementById('artist-credit').value;

        if (!isOwnWork && !artistCredit) {
            alert('Please provide artist credit for work that is not your own');
            return;
        }

        // Show loading indicator
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Uploading...';

        try {
            const metadata = {
                country,
                isOwnWork,
                artistCredit: isOwnWork ? 'Self' : artistCredit,
                submitterName: localStorage.getItem('username')
            };

            await window.cloudStorage.uploadImage(file, metadata);
            alert('Image uploaded successfully!');
            form.reset();
            preview.classList.add('hidden');
            fileName.textContent = '';
        } catch (error) {
            alert(`Upload failed: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });

    // Toggle artist credit field based on ownership checkbox
    document.getElementById('is-own-work').addEventListener('change', (e) => {
        const artistCreditField = document.getElementById('artist-credit-field');
        artistCreditField.style.display = e.target.checked ? 'none' : 'block';
    });
}