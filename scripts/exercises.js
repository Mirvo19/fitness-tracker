// Exercise Library Management
const exercises = [
    // Default exercises
    { id: 'e1', name: 'Push-ups', category: 'strength', targetMuscles: ['chest', 'triceps', 'shoulders'] },
    { id: 'e2', name: 'Squats', category: 'strength', targetMuscles: ['quadriceps', 'glutes', 'calves'] },
    { id: 'e3', name: 'Pull-ups', category: 'strength', targetMuscles: ['back', 'biceps', 'shoulders'] },
    { id: 'e4', name: 'Plank', category: 'core', targetMuscles: ['abs', 'shoulders', 'back'] },
    { id: 'e5', name: 'Lunges', category: 'strength', targetMuscles: ['quadriceps', 'glutes', 'hamstrings'] },
    // Add more default exercises here
];

class ExerciseLibrary {
    constructor() {
        this.exercises = [...exercises];
        this.loadCustomExercises();
        this.setupEventListeners();
        // Render the initial list of exercises
        this.renderExerciseList();
    }

    loadCustomExercises() {
        const customExercises = JSON.parse(localStorage.getItem('customExercises')) || [];
        this.exercises = [...exercises, ...customExercises];
    }

    saveCustomExercises() {
        const customExercises = this.exercises.filter(e => !exercises.find(defaultE => defaultE.id === e.id));
        localStorage.setItem('customExercises', JSON.stringify(customExercises));
    }

    setupEventListeners() {
        const addCustomBtn = document.getElementById('add-custom-exercise-btn');
        const librarySearch = document.getElementById('library-search');
        const exerciseList = document.getElementById('exercise-list');

        addCustomBtn?.addEventListener('click', () => this.showAddExerciseModal());
        librarySearch?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        exerciseList?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-exercise');
            if (deleteBtn) {
                const exerciseId = deleteBtn.closest('.exercise-item').dataset.id;
                this.deleteExercise(exerciseId);
            }
        });
    }

    handleSearch(query) {
        const normalizedQuery = query.toLowerCase();
        const filteredExercises = this.exercises.filter(exercise => 
            exercise.name.toLowerCase().includes(normalizedQuery) ||
            exercise.category.toLowerCase().includes(normalizedQuery) ||
            exercise.targetMuscles.some(muscle => muscle.toLowerCase().includes(normalizedQuery))
        );
        this.renderExerciseList(filteredExercises);
    }

    renderExerciseList(exercises = this.exercises) {
        const list = document.getElementById('exercise-list');
        if (!list) return;

        if (exercises.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💪</div>
                    <p class="empty-state-text">No exercises found. Try a different search or add a custom exercise.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = exercises.map(exercise => `
            <div class="exercise-item workout-item" data-id="${exercise.id}">
                <div class="workout-item-header">
                    <span class="workout-item-title">${exercise.name}</span>
                    <span class="badge">${exercise.category}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-medium">${exercise.targetMuscles.join(', ')}</span>
                    ${!exercises.find(e => e.id === exercise.id) ? `
                        <button class="btn btn-danger delete-exercise" aria-label="Delete ${exercise.name}">
                            <svg class="icon icon-sm" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    showAddExerciseModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close-btn" aria-label="Close modal">
                    <svg class="icon" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <h3 class="section-title">Add Custom Exercise</h3>
                <form id="add-exercise-form" class="form">
                    <div class="form-group">
                        <label for="exercise-name">Exercise Name</label>
                        <input type="text" id="exercise-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="exercise-category">Category</label>
                        <select id="exercise-category" class="form-control" required>
                            <option value="strength">Strength</option>
                            <option value="cardio">Cardio</option>
                            <option value="flexibility">Flexibility</option>
                            <option value="core">Core</option>
                            <option value="balance">Balance</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="exercise-muscles">Target Muscles (comma-separated)</label>
                        <input type="text" id="exercise-muscles" class="form-control" required>
                    </div>
                    <div class="form-buttons">
                        <button type="button" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Exercise</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        
        const form = modal.querySelector('form');
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.btn-secondary');

        const closeModal = () => {
            modal.remove();
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('exercise-name').value;
            const category = document.getElementById('exercise-category').value;
            const muscles = document.getElementById('exercise-muscles').value
                .split(',')
                .map(m => m.trim())
                .filter(Boolean);

            const newExercise = {
                id: 'custom_' + Date.now(),
                name,
                category,
                targetMuscles: muscles
            };

            this.exercises.push(newExercise);
            this.saveCustomExercises();
            this.renderExerciseList();
            
            showToast('Exercise added successfully');
            closeModal();
        });

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        requestAnimationFrame(() => {
            modal.style.display = 'block';
            document.getElementById('exercise-name').focus();
        });
    }

    deleteExercise(exerciseId) {
        const exercise = this.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal';
        confirmModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3 class="section-title">Delete Exercise?</h3>
                <p class="text-medium mb-4">Are you sure you want to delete "${exercise.name}"?</p>
                <div class="form-buttons">
                    <button class="btn btn-secondary">Cancel</button>
                    <button class="btn btn-danger">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmModal);

        const closeModal = () => confirmModal.remove();

        confirmModal.querySelector('.btn-secondary').addEventListener('click', closeModal);
        confirmModal.querySelector('.btn-danger').addEventListener('click', () => {
            this.exercises = this.exercises.filter(e => e.id !== exerciseId);
            this.saveCustomExercises();
            this.renderExerciseList();
            showToast('Exercise deleted');
            closeModal();
        });

        requestAnimationFrame(() => {
            confirmModal.style.display = 'block';
        });
    }
}

// Initialize the exercise library
const exerciseLibrary = new ExerciseLibrary();
