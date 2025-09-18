document.addEventListener('DOMContentLoaded', () => {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('nav a');
    const addWorkoutFab = document.getElementById('add-workout-fab');
    const addWorkoutBtn = document.getElementById('add-workout-btn');
    const exportBtn = document.getElementById('export-csv-btn');
    
    // Add click handler for export button
    if (exportBtn) {
        exportBtn.addEventListener('click', exportWorkoutsToCSV);
    }
    const modal = document.getElementById('add-workout-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const themeToggle = document.getElementById('theme-toggle');

    // Theme Management
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme') || (prefersDark.matches ? 'dark' : 'light');
    
    function setTheme(theme) {
        const root = document.documentElement;
        const isDark = theme === 'dark';
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update theme toggle button
        const darkIcon = document.querySelector('.theme-dark-icon');
        const lightIcon = document.querySelector('.theme-light-icon');
        if (darkIcon && lightIcon) {
            darkIcon.style.display = isDark ? 'none' : 'block';
            lightIcon.style.display = isDark ? 'block' : 'none';
        }
        
        // Animate background color change
        document.body.style.transition = 'background-color 0.3s ease';
        requestAnimationFrame(() => {
            document.body.style.backgroundColor = isDark ? 'var(--app-bg)' : 'var(--app-bg)';
        });
    }

    // Set initial theme
    setTheme(currentTheme);

    // Theme toggle handler
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        showToast(`Switched to ${newTheme} theme`);
    });

    // Listen for system theme changes
    prefersDark.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });

    // Toast System - Expose globally
    window.showToast = function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        
        const icon = document.createElement('span');
        icon.innerHTML = type === 'success' 
            ? '<svg class="icon icon-sm text-success" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg class="icon icon-sm text-danger" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        
        const text = document.createElement('span');
        text.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-icon';
        closeBtn.innerHTML = '<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.addEventListener('click', () => toast.remove());

        toast.appendChild(icon);
        toast.appendChild(text);
        toast.appendChild(closeBtn);

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    function route() {
        const hash = window.location.hash || '#dashboard';
        pages.forEach(page => {
            if (`#${page.id}` === hash) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });
    }

    function openAddModal(workout = null) {
        modal.style.display = 'block';
        // TODO: Prefill form if workout object is passed
    }

    function closeAddModal() {
        modal.style.display = 'none';
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // e.preventDefault(); // Not needed if using hash routing
            setTimeout(route, 0);
        });
    });

    addWorkoutFab.addEventListener('click', () => openAddModal());
    addWorkoutBtn.addEventListener('click', () => openAddModal());
    closeModalBtn.addEventListener('click', closeAddModal);
    cancelBtn.addEventListener('click', closeAddModal);

    // Initial Load - Redirect to dashboard if no hash is present
    if (!window.location.hash) {
        window.location.hash = 'dashboard';
    }
    route();
    window.addEventListener('hashchange', route);
    // Set default route to dashboard if no hash is present
    if (!window.location.hash || window.location.hash === '#') {
        window.location.hash = '#dashboard';
    }
    
    // Initial route
    route();
    
    // Add event listener for the first workout button in the dashboard
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'first-workout-btn') {
            openAddModal();
        }
        // Add click handler for export button
        if (e.target && e.target.id === 'export-csv-btn') {
            exportWorkoutsToCSV();
        }
    });

    // Export functionality
    function exportWorkoutsToCSV() {
        try {
            // Get workouts from localStorage
            const workouts = JSON.parse(localStorage.getItem('workouts') || '[]');
            
            if (workouts.length === 0) {
                alert('No workout data to export.');
                return;
            }

            // Create CSV header
            const headers = ['Date', 'Exercise', 'Duration (min)', 'Intensity', 'Notes'];
            
            // Create CSV rows
            const csvRows = [
                headers.join(','),
                ...workouts.map(workout => 
                    [
                        `"${workout.date || ''}"`,
                        `"${workout.exercise || ''}"`,
                        `"${workout.duration || ''}"`,
                        `"${workout.intensity || ''}"`,
                        `"${(workout.notes || '').replace(/"/g, '""')}"`
                    ].join(',')
                )
            ];

            // Create CSV string
            const csvString = csvRows.join('\n');
            
            // Create download link
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            
            link.setAttribute('href', url);
            link.setAttribute('download', `workouts_${dateStr}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success message
            showToast('Workouts exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting workouts:', error);
            showToast('Failed to export workouts', 'error');
        }
    }

    // Onboarding logic
    const setGoalBtn = document.getElementById('set-goal-btn');
    setGoalBtn.addEventListener('click', () => {
        const goalInput = document.getElementById('goal-input');
        const goalMetric = document.getElementById('goal-metric');
        const goal = {
            target: goalInput.value,
            metric: goalMetric.value,
            period: 'weekly'
        };
        localStorage.setItem('goal', JSON.stringify(goal));
        window.location.hash = '#dashboard';
        route();
        // TODO: Update dashboard with the new goal
    });

    // --- Data Management ---
    let workouts = JSON.parse(localStorage.getItem('workouts')) || [];
    let exercises = JSON.parse(localStorage.getItem('exercises')) || [];
    let goal = JSON.parse(localStorage.getItem('goal')) || { target: 150, metric: 'minutes', period: 'weekly' };

    function saveWorkouts() {
        localStorage.setItem('workouts', JSON.stringify(workouts));
    }

    function saveExercises() {
        localStorage.setItem('exercises', JSON.stringify(exercises));
    }

    function saveGoal() {
        localStorage.setItem('goal', JSON.stringify(goal));
    }

    // --- Core Functions ---

    function renderDashboard() {
        calculateWeeklyProgress();
        renderWorkoutList();
        renderMiniChart();
    }

    function renderWorkoutList() {
        const workoutList = document.getElementById('workout-list');
        const recentWorkouts = workouts.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

        // Clear with fade-out animation
        const existingItems = workoutList.children;
        Array.from(existingItems).forEach((item, index) => {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateY(10px)';
            setTimeout(() => item.remove(), 300);
        });

        if (recentWorkouts.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-icon">🏃‍♂️</div>
                <p class="empty-state-text">No workouts yet — add your first win!</p>
                <button class="btn btn-primary" id="first-workout-btn">
                    <svg class="icon icon-sm" viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Log Workout
                </button>
            `;
            
            // Fade in empty state
            emptyState.style.opacity = '0';
            workoutList.appendChild(emptyState);
            requestAnimationFrame(() => {
                emptyState.style.transition = 'opacity 0.3s ease';
                emptyState.style.opacity = '1';
            });
            
            document.getElementById('first-workout-btn')?.addEventListener('click', () => openAddModal());
            return;
        }

        recentWorkouts.forEach((workout, index) => {
            const item = document.createElement('div');
            item.className = 'workout-item';
            item.dataset.id = workout.id;
            
            const date = new Date(workout.date);
            const formattedDate = new Intl.DateTimeFormat('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            }).format(date);
            
            // Calculate the total duration if there are exercises
            const totalDuration = workout.exercises?.reduce((total, ex) => total + (parseInt(ex.duration) || 0), 0) || workout.duration;
            const intensity = workout.intensity || 'normal';

            item.innerHTML = `
                <div class="workout-item-header">
                    <span class="workout-item-title">
                        <svg class="icon icon-sm mr-2" viewBox="0 0 24 24">
                            ${getWorkoutTypeIcon(workout.type)}
                        </svg>
                        ${workout.type.charAt(0).toUpperCase() + workout.type.slice(1)}
                    </span>
                    <div class="workout-meta">
                        <span class="workout-item-date">${formattedDate}</span>
                        ${workout.intensity ? `
                            <span class="badge badge-${intensity}">
                                ${intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="workout-details">
                    <div class="workout-stats">
                        <div class="stat-item">
                            <svg class="icon icon-sm" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${totalDuration} min</span>
                        </div>
                        ${workout.calories ? `
                            <div class="stat-item">
                                <svg class="icon icon-sm" viewBox="0 0 24 24">
                                    <path d="M15.45 15.45c.9.9.9 2.36 0 3.27-.9.9-2.36.9-3.27 0-.9-.9-2.36-.9-3.27 0-.9.9-2.36.9-3.27 0-.9-.9-.9-2.36 0-3.27m6-6c.9.9.9 2.36 0 3.27-.9.9-2.36.9-3.27 0-.9-.9-2.36-.9-3.27 0-.9.9-2.36.9-3.27 0-.9-.9-.9-2.36 0-3.27m6-6c.9.9.9 2.36 0 3.27-.9.9-2.36.9-3.27 0-.9-.9-2.36-.9-3.27 0-.9.9-2.36.9-3.27 0-.9-.9-.9-2.36 0-3.27"></path>
                                </svg>
                                <span>${workout.calories} cal</span>
                            </div>
                        ` : ''}
                    </div>
                    ${workout.notes ? `
                        <p class="workout-notes">${workout.notes}</p>
                    ` : ''}
                    <div class="workout-actions">
                        <button class="btn btn-icon" aria-label="Edit workout">
                            <svg class="icon icon-sm" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-icon" aria-label="Delete workout">
                            <svg class="icon icon-sm" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                const clickedWorkout = workouts.find(w => w.id === workout.id);
                openAddModal(clickedWorkout);
            });

            // Add to list with animation
            // Set animation delay based on index
            item.style.setProperty('--index', index);
            workoutList.appendChild(item);
            
            // Add click handlers for action buttons
            const editBtn = item.querySelector('button[aria-label="Edit workout"]');
            const deleteBtn = item.querySelector('button[aria-label="Delete workout"]');
            
            editBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const clickedWorkout = workouts.find(w => w.id === workout.id);
                openAddModal(clickedWorkout);
            });
            
            deleteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteWorkout(workout.id);
            });
            
            // Add hover effect for entire item
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateX(4px) translateY(-2px)';
                item.style.boxShadow = 'var(--z2-shadow)';
                item.style.borderColor = 'var(--primary)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.transform = '';
                item.style.boxShadow = '';
                item.style.borderColor = '';
            });
        });
    }

    function getWorkoutTypeIcon(type) {
        const icons = {
            run: '<path d="M13 4a1 1 0 1 0-2 0m2 0a1 1 0 1 1-2 0M12 4v7m0 0l-3-3M12 11l3-3M6 20l2-2M18 20l-2-2"/><path d="M12 11v4M9 7l-3 3M15 7l3 3"/>',
            walk: '<path d="M13 4a1 1 0 1 0-2 0m2 0a1 1 0 1 1-2 0M12 4v7m0 0l-2-2M12 11l2-2M8 20l1-2M16 20l-1-2"/><path d="M12 11v4M10 7l-2 2M14 7l2 2"/>',
            weights: '<path d="M6.7 6.7L4 4m0 16l2.7-2.7m13.3 2.7l-2.7-2.7M20 4l-2.7 2.7M12 9v6m-4.5-2h9"/><rect x="7" y="9" width="2" height="6" rx="1"/><rect x="15" y="9" width="2" height="6" rx="1"/>',
            yoga: '<path d="M12 2L8 6l4 4 4-4z"/><path d="M4 12l4 4 4-4M12 12l4 4 4-4M12 17v5"/>',
            hiit: '<path d="M13 4a1 1 0 1 0-2 0m2 0a1 1 0 1 1-2 0"/><path d="M12 4v4l3 3-3 3v4M4 12h16"/>',
            other: '<circle cx="12" cy="12" r="10"/><path d="M12 16v.01M12 8v4"/>'
        };
        return icons[type] || icons.other;
    }

    function calculateWeeklyProgress() {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const weeklyWorkouts = workouts.filter(w => {
            const workoutDate = new Date(w.date);
            return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
        });

        let current = 0;
        if (goal.metric === 'minutes') {
            current = weeklyWorkouts.reduce((total, w) => total + (parseInt(w.duration, 10) || 0), 0);
        } else {
            current = weeklyWorkouts.length;
        }

        const percent = Math.min((current / goal.target) * 100, 100);

        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.getElementById('progress-text');

        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${current} of ${goal.target} ${goal.metric}`;
    }

    function renderMiniChart() {
        const chart = document.getElementById('mini-chart');
        const now = new Date();
        const days = [];
        const data = [];
        
        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            days.push(date);
            
            // Get workouts for this day
            const dayWorkouts = workouts.filter(w => {
                const workoutDate = new Date(w.date);
                return workoutDate.toDateString() === date.toDateString();
            });
            
            // Sum up duration or count sessions based on goal metric
            const value = goal.metric === 'minutes'
                ? dayWorkouts.reduce((sum, w) => sum + (parseInt(w.duration, 10) || 0), 0)
                : dayWorkouts.length;
            
            data.push(value);
        }
        
        // Find max value for scaling
        const maxValue = Math.max(...data, goal.target);
        
        // Generate SVG chart
        const chartHeight = 120;
        const chartWidth = chart.clientWidth;
        const barWidth = Math.floor((chartWidth - 48) / 7); // Leave space for labels
        const barGap = 4;
        const barColor = getComputedStyle(document.body).getPropertyValue('--primary').trim();
        const labelColor = getComputedStyle(document.body).getPropertyValue('--text-medium').trim();
        
        const svg = `
            <svg width="${chartWidth}" height="${chartHeight}" class="mini-chart">
                ${data.map((value, i) => {
                    const height = value ? (value / maxValue) * (chartHeight - 30) : 2; // Min height 2px
                    const x = i * (barWidth + barGap);
                    const y = chartHeight - height - 20; // Leave space for labels
                    
                    return `
                        <g class="bar-group">
                            <rect
                                x="${x}"
                                y="${y}"
                                width="${barWidth}"
                                height="${height}"
                                rx="2"
                                fill="${barColor}"
                                opacity="${value ? '1' : '0.2'}"
                            >
                                <title>${value} ${goal.metric}</title>
                            </rect>
                            <text
                                x="${x + barWidth/2}"
                                y="${chartHeight - 6}"
                                text-anchor="middle"
                                fill="${labelColor}"
                                style="font-size: 12px;"
                            >${days[i].toLocaleDateString('en-US', {weekday: 'short'})}</text>
                        </g>
                    `;
                }).join('')}
                
                <!-- Goal line -->
                ${goal.target ? `
                    <line
                        x1="0"
                        y1="${chartHeight - ((goal.target / maxValue) * (chartHeight - 30)) - 20}"
                        x2="${chartWidth}"
                        y2="${chartHeight - ((goal.target / maxValue) * (chartHeight - 30)) - 20}"
                        stroke="${labelColor}"
                        stroke-width="1"
                        stroke-dasharray="4 2"
                    />
                ` : ''}
            </svg>
        `;
        
        chart.innerHTML = svg;
        
        // Add hover effects
        const bars = chart.querySelectorAll('.bar-group');
        bars.forEach(bar => {
            bar.addEventListener('mouseover', () => {
                bar.querySelector('rect').style.opacity = '0.8';
            });
            bar.addEventListener('mouseout', () => {
                bar.querySelector('rect').style.opacity = '1';
            });
        });
    }

    async function saveWorkout(e) {
        e.preventDefault();
        const form = document.getElementById('workout-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Validate form
        const date = document.getElementById('workout-date').value;
        const duration = document.getElementById('workout-duration').value;
        const type = document.getElementById('workout-type').value;
        const notes = document.getElementById('workout-notes').value;
        const workoutId = document.getElementById('workout-id').value;

        if (!date || !duration) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="icon icon-sm animate-spin" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
        `;

        try {
            if (workoutId) {
                // Editing existing workout
                const index = workouts.findIndex(w => w.id == workoutId);
                workouts[index] = { ...workouts[index], date, duration, type, notes };
            } else {
                // Adding new workout
                const newWorkout = {
                    id: Date.now(),
                    date,
                    duration,
                    type,
                    notes,
                    exercises: [] // Exercise details to be added
                };
                workouts.push(newWorkout);
            }

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 600));

            saveWorkouts();
            renderDashboard();
            closeAddModal();
            form.reset();

            // Show success message
            showToast(workoutId ? 'Workout updated successfully' : 'Workout added successfully');

        } catch (error) {
            showToast('Failed to save workout', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
    
    function deleteWorkout() {
        const workoutId = document.getElementById('workout-id').value;
        const deleteBtn = document.getElementById('delete-btn');

        // Create and show confirmation modal
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal';
        confirmModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3 class="section-title">Delete Workout?</h3>
                <p class="text-medium mb-4">This action cannot be undone.</p>
                <div class="form-buttons">
                    <button class="btn btn-secondary" id="cancel-delete">Cancel</button>
                    <button class="btn btn-danger" id="confirm-delete">
                        <svg class="icon icon-sm" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        // Add event listeners
        const cancelDelete = confirmModal.querySelector('#cancel-delete');
        const confirmDelete = confirmModal.querySelector('#confirm-delete');

        cancelDelete.addEventListener('click', () => {
            confirmModal.remove();
        });

        confirmDelete.addEventListener('click', async () => {
            // Show loading state
            confirmDelete.disabled = true;
            confirmDelete.innerHTML = `
                <svg class="icon icon-sm animate-spin" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
            `;

            try {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 600));

                workouts = workouts.filter(w => w.id != workoutId);
                saveWorkouts();
                renderDashboard();
                closeAddModal();
                confirmModal.remove();

                // Show success message with undo option
                showToast('Workout deleted. <button class="btn btn-link">Undo</button>', 'error');
            } catch (error) {
                showToast('Failed to delete workout', 'error');
            }
        });

        // Show the modal with animation
        requestAnimationFrame(() => {
            confirmModal.style.display = 'block';
            confirmModal.querySelector('.modal-content').style.animation = 'slide-up var(--duration-medium) var(--ease-snappy)';
        });
    }

    // --- Event Listeners ---
    const workoutForm = document.getElementById('workout-form');
    workoutForm.addEventListener('submit', saveWorkout);

    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn.addEventListener('click', deleteWorkout);

    function openAddModal(workout = null) {
        const modalTitle = document.getElementById('modal-title');
        const workoutIdInput = document.getElementById('workout-id');
        const deleteBtn = document.getElementById('delete-btn');
        const form = document.getElementById('workout-form');
        form.reset();

        if (workout) {
            modalTitle.textContent = 'Edit Workout';
            workoutIdInput.value = workout.id;
            document.getElementById('workout-date').value = workout.date;
            document.getElementById('workout-duration').value = workout.duration;
            document.getElementById('workout-type').value = workout.type;
            document.getElementById('workout-notes').value = workout.notes;
            deleteBtn.style.display = 'block';
        } else {
            modalTitle.textContent = 'Add Workout';
            workoutIdInput.value = '';
            document.getElementById('workout-date').valueAsDate = new Date();
            deleteBtn.style.display = 'none';
        }
        modal.style.display = 'block';
    }

    // Override the simple openAddModal from before
    addWorkoutFab.addEventListener('click', () => openAddModal());

    // Keyboard Navigation
    function handleModalKeyboard(e) {
        if (e.key === 'Escape') {
            closeAddModal();
        }
    }

    function trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    // Enhanced Modal Open/Close
    function openAddModal(workout = null) {
        const modalTitle = document.getElementById('modal-title');
        const workoutIdInput = document.getElementById('workout-id');
        const deleteBtn = document.getElementById('delete-btn');
        const form = document.getElementById('workout-form');
        form.reset();

        if (workout) {
            modalTitle.textContent = 'Edit Workout';
            workoutIdInput.value = workout.id;
            document.getElementById('workout-date').value = workout.date;
            document.getElementById('workout-duration').value = workout.duration;
            document.getElementById('workout-type').value = workout.type;
            document.getElementById('workout-notes').value = workout.notes;
            deleteBtn.style.display = 'block';
        } else {
            modalTitle.textContent = 'Add Workout';
            workoutIdInput.value = '';
            document.getElementById('workout-date').valueAsDate = new Date();
            deleteBtn.style.display = 'none';
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus management
        const firstInput = modal.querySelector('input:not([type="hidden"])');
        setTimeout(() => firstInput.focus(), 100);
        
        // Trap focus within modal
        trapFocus(modal);
        
        // Add keyboard listener
        document.addEventListener('keydown', handleModalKeyboard);
    }

    function closeAddModal() {
        const form = document.getElementById('workout-form');
        form.reset();
        modal.style.display = 'none';
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleModalKeyboard);
        addWorkoutFab.focus(); // Return focus to trigger element
    }

    // Handle reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    function updateMotionPreference() {
        document.documentElement.style.setProperty(
            '--duration-medium',
            prefersReducedMotion.matches ? '0s' : '250ms'
        );
        document.documentElement.style.setProperty(
            '--duration-slow',
            prefersReducedMotion.matches ? '0s' : '700ms'
        );
    }
    
    updateMotionPreference();
    prefersReducedMotion.addEventListener('change', updateMotionPreference);

    // Initial Load
    // Load workouts from localStorage
    const savedWorkouts = localStorage.getItem('workouts');
    if (savedWorkouts) {
        workouts = JSON.parse(savedWorkouts);
    }
    
    if (localStorage.getItem('goal')) {
        renderDashboard();
    } else {
        // If no goal is set, still render any existing workouts
        renderWorkoutList();
    }

    // Touch event handling for workout list
    const workoutList = document.getElementById('workout-list');
    let touchStartX = 0;
    let touchEndX = 0;
    
    if (workoutList) {
        workoutList.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        
        workoutList.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe(e);
        }, false);
        
        function handleSwipe(e) {
            const SWIPE_THRESHOLD = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > SWIPE_THRESHOLD && diff > 0) {
                // Left swipe
                const touch = e.changedTouches[0];
                const activeItem = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.workout-item');
                if (activeItem && activeItem.dataset.id) {
                    deleteWorkout(activeItem.dataset.id);
                }
            }
        }
    }
}); // Close the DOMContentLoaded event listener
