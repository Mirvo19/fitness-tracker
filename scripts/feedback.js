document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS ---
    const WEBHOOK_URL = 'https://discord.com/api/webhooks/1417722327478567014/LYe7iFIglSPvvvOkzcg7AFe3ab0MMbE1S5zJOwZnwQ4vH6JhFe6xwK0OrZLEIqlDCpaS';
    const AUTOSAVE_INTERVAL = 8000; // 8 seconds
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const SUBMIT_COOLDOWN = 5000; // 5 seconds
    const STORAGE_KEY = 'feedback_draft';
    const DRAFT_SAVE_TIME_KEY = 'feedback_draft_time';

    // --- FORM ELEMENTS ---
    const form = document.getElementById('feedback-form');
    if (!form) return; // Exit if form not on page

    const suggestion = document.getElementById('feedback-suggestion');
    const charCounter = document.getElementById('char-counter');
    const fileUpload = document.getElementById('file-upload');
    const filePreview = document.getElementById('file-preview');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = uploadProgress.querySelector('.progress-bar-fill');
    const submitBtn = document.getElementById('submit-feedback');
    const saveDraftBtn = document.getElementById('save-draft');
    const cancelBtn = document.getElementById('cancel-feedback');
    const draftStatus = document.getElementById('draft-status');
    const checkmark = submitBtn.querySelector('.success-checkmark');

    let lastSaveTime = null;
    let autosaveTimer = null;
    let selectedFile = null;

    // --- INITIALIZATION ---
    function init() {
        loadDraft();
        setupEventListeners();
        startAutosave();
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        suggestion.addEventListener('input', updateCharCounter);
        fileUpload.addEventListener('change', handleFileSelect);
        form.addEventListener('submit', handleSubmit);
        saveDraftBtn.addEventListener('click', saveDraft);
        cancelBtn.addEventListener('click', handleCancel);

        form.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('invalid', (e) => {
                e.preventDefault();
                const label = form.querySelector(`label[for="${input.id}"]`)?.textContent || input.name;
                window.showToast(`Please fill out the required field: ${label.replace('*', '').trim()}`, 'error');
                input.classList.add('invalid');
            });
            input.addEventListener('input', () => input.classList.remove('invalid'));
        });

        window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // --- CORE FUNCTIONS ---

    function updateCharCounter() {
        const length = suggestion.value.length;
        charCounter.textContent = `${length} / 3000`;
        if (length > 0 && length < 10) {
            suggestion.classList.add('invalid');
        } else {
            suggestion.classList.remove('invalid');
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            window.showToast('File too large (max 5MB)', 'error');
            fileUpload.value = '';
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            window.showToast('Invalid file type. Use PNG, JPEG, or WebP.', 'error');
            fileUpload.value = '';
            return;
        }

        selectedFile = file;
        displayFilePreview(file);
        window.showToast('Screenshot added', 'success');
        simulateUploadProgress();
    }

    function simulateUploadProgress() {
        uploadProgress.style.display = 'block';
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    progressBar.style.width = '0%';
                }, 500);
            }
        }, 50);
    }

    function displayFilePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            filePreview.innerHTML = `
                <div class="preview-container">
                    <img src="${e.target.result}" alt="Preview" class="preview-image">
                    <button type="button" class="btn btn-secondary remove-file-btn">
                        <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        Remove
                    </button>
                </div>
            `;
            filePreview.style.display = 'block';
            filePreview.querySelector('.remove-file-btn').addEventListener('click', removeFile);
        };
        reader.readAsDataURL(file);
    }

    function removeFile() {
        fileUpload.value = '';
        selectedFile = null;
        filePreview.innerHTML = '';
        filePreview.style.display = 'none';
        window.showToast('Screenshot removed', 'info');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        console.log('Form submission started');

        if (!form.checkValidity()) {
            console.log('Form validation failed');
            form.reportValidity();
            return;
        }

        submitBtn.disabled = true;
        const originalButtonText = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <svg class="icon icon-sm animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Sending...
        `;

        try {
            const formData = new FormData(form);
            const name = formData.get('feedback-name') || 'Anonymous';
            const email = formData.get('feedback-email') || 'Not provided';
            const category = formData.get('category') || 'General';
            const priority = formData.get('priority') || 'Medium';
            const suggestion = formData.get('feedback-suggestion') || 'No suggestion provided';
            const consent = formData.get('consent-checkbox') ? 'Yes' : 'No';

            // Create the embed object
            const embed = {
                title: `New Feedback: ${category}`,
                description: suggestion,
                color: 0x58B2DC, // Blue color
                fields: [
                    { name: 'Category', value: category, inline: true },
                    { name: 'Priority', value: priority, inline: true },
                    { name: 'Name', value: name, inline: false },
                    { name: 'Email', value: email, inline: false },
                    { name: 'Consent to Share Data', value: consent, inline: true },
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Feedback submitted via Fitness Tracker App'
                }
            };

            let response;
            
            // If there's a file, we need to use FormData
            if (selectedFile) {
                console.log('Preparing form data with file attachment');
                const formData = new FormData();
                const payload = {
                    content: `New Feedback Submission: **${category}**`,
                    embeds: [embed]
                };
                console.log('Payload:', payload);
                
                formData.append('payload_json', JSON.stringify(payload));
                formData.append('file', selectedFile, selectedFile.name);

                console.log('Sending request with file...');
                response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    body: formData
                });
            } else {
                // If no file, we can send as JSON
                const payload = {
                    content: `New Feedback Submission: **${category}**`,
                    embeds: [embed]
                };
                console.log('Sending JSON payload:', payload);
                
                response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });
            }

            console.log('Response status:', response.status);
            const responseData = await response.text();
            console.log('Response data:', responseData);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${responseData}`);
            }

            // Success
            submitBtn.innerHTML = 'Sent!';
            checkmark.style.display = 'inline';
            window.showToast('Thanks! Your feedback has been sent. 🎉', 'success');
            clearFormAndDraft();

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalButtonText;
                checkmark.style.display = 'none';
            }, SUBMIT_COOLDOWN);

        } catch (error) {
            console.error('Submission error:', error);
            const errorMessage = error.message || 'Unknown error occurred';
            console.error('Detailed error:', errorMessage);
            window.showToast(`Failed to send feedback: ${errorMessage}`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText;
            submitBtn.classList.add('shake');
            setTimeout(() => submitBtn.classList.remove('shake'), 500);
        }
    }

    // --- DRAFT MANAGEMENT ---
    function saveDraft() {
        try {
            const formData = getFormDataObject();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
            localStorage.setItem(DRAFT_SAVE_TIME_KEY, new Date().toISOString());
            lastSaveTime = new Date();
            updateDraftStatus();
            window.showToast('Draft saved', 'success');
        } catch (error) {
            console.error('Draft save error:', error);
            window.showToast('Could not save draft', 'error');
        }
    }

    function loadDraft() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            const savedTime = localStorage.getItem(DRAFT_SAVE_TIME_KEY);
            if (savedData) {
                const data = JSON.parse(savedData);
                Object.entries(data).forEach(([key, value]) => {
                    const element = form.elements[key];
                    if (element) {
                        if (element.type === 'radio') {
                            const radio = form.querySelector(`input[name="${key}"][value="${value}"]`);
                            if (radio) radio.checked = true;
                        } else if (element.type === 'checkbox') {
                            element.checked = value;
                        } else {
                            element.value = value;
                        }
                    }
                });
                lastSaveTime = savedTime ? new Date(savedTime) : null;
                updateDraftStatus();
                updateCharCounter();
                window.showToast('Draft restored', 'info');
            }
        } catch (error) {
            console.error('Draft load error:', error);
            window.showToast('Could not load draft', 'error');
        }
    }

    function startAutosave() {
        autosaveTimer = setInterval(() => {
            if (hasUnsavedChanges()) {
                saveDraft();
            }
        }, AUTOSAVE_INTERVAL);
    }

    function updateDraftStatus() {
        if (!lastSaveTime) {
            draftStatus.textContent = '';
            return;
        }
        const timeAgo = getTimeAgo(lastSaveTime);
        draftStatus.innerHTML = `
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Last saved ${timeAgo}
        `;
    }

    // --- HELPER FUNCTIONS ---
    function getFormDataObject() {
        const data = {};
        const formData = new FormData(form);
        for (const [key, value] of formData.entries()) {
            if (key !== 'bot-field') {
                const element = form.elements[key];
                if (element.type === 'checkbox') {
                    data[key] = element.checked;
                } else {
                    data[key] = value;
                }
            }
        }
        return data;
    }

    function hasUnsavedChanges() {
        const currentData = JSON.stringify(getFormDataObject());
        const savedData = localStorage.getItem(STORAGE_KEY) || '{}';
        // Only consider it "unsaved" if there's actual content
        return suggestion.value.length > 0 && currentData !== savedData;
    }

    function handleBeforeUnload(e) {
        if (hasUnsavedChanges()) {
            e.preventDefault();
            return (e.returnValue = 'You have unsaved changes. Are you sure you want to leave?');
        }
    }

    function handleCancel() {
        if (hasUnsavedChanges() && confirm('Discard unsaved changes?')) {
            clearFormAndDraft();
            window.showToast('Changes discarded', 'info');
        } else if (!hasUnsavedChanges()) {
            // If no changes, just navigate away
        }
    }

    function clearFormAndDraft() {
        form.reset();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DRAFT_SAVE_TIME_KEY);
        lastSaveTime = null;
        updateDraftStatus();
        if (selectedFile) removeFile();
        updateCharCounter();
        form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 10) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    // --- RUN ---
    init();
});
