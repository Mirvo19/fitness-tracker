// Exercise Search Functionality
document.addEventListener('DOMContentLoaded', () => {
    const exerciseSearch = document.getElementById('exercise-search');
    const searchResults = document.getElementById('search-results');
    const addedExercises = document.getElementById('added-exercises');
    let selectedExercises = [];

    if (exerciseSearch) {
        exerciseSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }
            
            const filtered = exerciseLibrary.exercises.filter(exercise => 
                exercise.name.toLowerCase().includes(query) ||
                exercise.category.toLowerCase().includes(query) ||
                exercise.targetMuscles.some(muscle => muscle.toLowerCase().includes(query))
            );
            
            renderSearchResults(filtered);
        });
    }

    function renderSearchResults(exercises) {
        searchResults.innerHTML = '';
        
        if (exercises.length === 0) {
            searchResults.innerHTML = '<div class="empty-state">No exercises found</div>';
            return;
        }
        
        exercises.forEach(exercise => {
            if (selectedExercises.some(e => e.id === exercise.id)) return;
            
            const item = document.createElement('div');
            item.className = 'workout-item';
            item.innerHTML = `
                <div class="workout-item-header">
                    <span class="workout-item-title">${exercise.name}</span>
                    <span class="badge">${exercise.category}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-medium">${exercise.targetMuscles.join(', ')}</span>
                    <button class="btn btn-primary btn-sm add-exercise" data-id="${exercise.id}">
                        <svg class="icon icon-sm" viewBox="0 0 24 24">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add
                    </button>
                </div>
            `;
            searchResults.appendChild(item);
        });

        // Add event listeners to the add buttons
        document.querySelectorAll('.add-exercise').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exerciseId = e.currentTarget.dataset.id;
                const exercise = exerciseLibrary.exercises.find(e => e.id === exerciseId);
                if (exercise && !selectedExercises.some(e => e.id === exerciseId)) {
                    selectedExercises.push(exercise);
                    renderSelectedExercises();
                    exerciseSearch.value = '';
                    searchResults.innerHTML = '';
                }
            });
        });
    }

    function renderSelectedExercises() {
        addedExercises.innerHTML = selectedExercises.map((exercise, index) => `
            <div class="workout-item" data-id="${exercise.id}">
                <div class="workout-item-header">
                    <span class="workout-item-title">${exercise.name}</span>
                    <span class="badge">${exercise.category}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-medium">${exercise.targetMuscles.join(', ')}</span>
                    <button class="btn btn-danger btn-sm remove-exercise" data-index="${index}">
                        <svg class="icon icon-sm" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Remove
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-exercise').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                selectedExercises.splice(index, 1);
                renderSelectedExercises();
            });
        });
    }
});
