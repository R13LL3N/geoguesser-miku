// Handle file upload to Netlify
async function uploadImage(file, metadata) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Upload failed');
        }

        return await response.json();
    } catch (error) {
        throw new Error('Error uploading image: ' + error.message);
    }
}

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
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file');
                return;
            }

            fileName.textContent = file.name;
            preview.src = URL.createObjectURL(file);
            preview.classList.remove('hidden');
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

        try {
            const metadata = {
                country,
                isOwnWork,
                artistCredit: isOwnWork ? 'Self' : artistCredit,
                submitterName: localStorage.getItem('username')
            };

            await uploadImage(file, metadata);
            alert('Image uploaded successfully!');
            form.reset();
            preview.classList.add('hidden');
            fileName.textContent = '';
        } catch (error) {
            alert(error.message);
        }
    });

    // Toggle artist credit field based on ownership checkbox
    document.getElementById('is-own-work').addEventListener('change', (e) => {
        const artistCreditField = document.getElementById('artist-credit-field');
        artistCreditField.style.display = e.target.checked ? 'none' : 'block';
    });
}