/**
 * AURORA Task Tracker - Premium Edition
 * A fully-featured, offline-first daily task tracker with glassmorphism design
 * and comprehensive date handling for 365-day, 52-week, 12-month tracking.
 */

// Performance optimization: Use requestAnimationFrame for animations
const raf = window.requestAnimationFrame || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame || 
            function(callback) { setTimeout(callback, 1000/60); };

class AuroraTaskTracker {
    constructor() {
        // Initialize core properties
        this.currentDate = new Date();
        this.currentWeekStart = this.getWeekStartDate(this.currentDate);
        this.tasks = this.loadTasks();
        this.currentNoteData = null;
        this.activities = this.loadActivities();
        this.weekCache = new Map(); // Cache for week data
        
        // Performance optimization
        this.debounceTimeout = null;
        
        // Initialize the application
        this.init();
    }

    // Initialize the application
    init() {
        try {
            this.cacheDOMElements();
            this.setupEventListeners();
            this.renderWeekView();
            this.renderYearNavigation();
            this.updateStatistics();
            this.updateRecentActivity();
            this.updateWeekDisplay();
            this.updateWeekProgress();
            
            // Add initial animations
            this.animateOnLoad();
            
            // Set up periodic saves (every 30 seconds)
            setInterval(() => this.autoSave(), 30000);
            
            console.log('AURORA Task Tracker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AURORA Task Tracker:', error);
            this.showError('Failed to initialize the application. Please refresh the page.');
        }
    }

    // Cache DOM elements for better performance
    cacheDOMElements() {
        this.elements = {
            // Week view elements
            weekGrid1: document.getElementById('weekGrid1'),
            weekGrid2: document.getElementById('weekGrid2'),
            weekNumber: document.getElementById('weekNumber'),
            weekRange: document.getElementById('weekRange'),
            weekRangeDisplay: document.getElementById('weekRangeDisplay'),
            weekProgressPercent: document.getElementById('weekProgressPercent'),
            weekProgressFill: document.getElementById('weekProgressFill'),
            col1Completed: document.getElementById('col1Completed'),
            col1Pending: document.getElementById('col1Pending'),
            col2Completed: document.getElementById('col2Completed'),
            col2Pending: document.getElementById('col2Pending'),
            
            // Navigation buttons
            prevWeekBtn: document.getElementById('prevWeekBtn'),
            nextWeekBtn: document.getElementById('nextWeekBtn'),
            todayBtnMain: document.getElementById('todayBtnMain'),
            prevWeek: document.getElementById('prevWeek'),
            nextWeek: document.getElementById('nextWeek'),
            todayBtn: document.getElementById('todayBtn'),
            
            // Statistics elements
            yearNavigation: document.getElementById('yearNavigation'),
            activityList: document.getElementById('activityList'),
            noteModal: document.getElementById('noteModal'),
            noteTextarea: document.getElementById('noteTextarea'),
            closeModal: document.getElementById('closeModal'),
            cancelNote: document.getElementById('cancelNote'),
            saveNote: document.getElementById('saveNote'),
            quickTaskInput: document.getElementById('quickTaskInput'),
            quickAddBtn: document.getElementById('quickAddBtn'),
            completedCount: document.getElementById('completedCount'),
            missedCount: document.getElementById('missedCount'),
            pendingCount: document.getElementById('pendingCount'),
            totalCount: document.getElementById('totalCount')
        };
    }

    // Set up all event listeners
    setupEventListeners() {
        // Navigation buttons
        this.elements.prevWeek.addEventListener('click', () => this.navigateWeek(-1));
        this.elements.nextWeek.addEventListener('click', () => this.navigateWeek(1));
        this.elements.todayBtn.addEventListener('click', () => this.goToToday());
        
        // New week view navigation
        this.elements.prevWeekBtn.addEventListener('click', () => this.navigateWeek(-1));
        this.elements.nextWeekBtn.addEventListener('click', () => this.navigateWeek(1));
        this.elements.todayBtnMain.addEventListener('click', () => this.goToToday());

        // Note modal
        this.elements.closeModal.addEventListener('click', () => this.closeNoteModal());
        this.elements.cancelNote.addEventListener('click', () => this.closeNoteModal());
        this.elements.saveNote.addEventListener('click', () => this.saveNote());

        // Quick add task with debouncing
        this.elements.quickAddBtn.addEventListener('click', () => this.debounce(() => this.addQuickTask(), 300));
        this.elements.quickTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.debounce(() => this.addQuickTask(), 300);
        });

        // Close modal on outside click and Escape key
        this.elements.noteModal.addEventListener('click', (e) => {
            if (e.target === this.elements.noteModal) this.closeNoteModal();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.noteModal.style.display === 'flex') {
                this.closeNoteModal();
            }
        });

        // Keyboard shortcuts for navigation
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Arrow keys for week navigation
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.navigateWeek(-1);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.navigateWeek(1);
                } else if (e.key === 't' || e.key === 'T') {
                    e.preventDefault();
                    this.goToToday();
                }
            }
        });

        // Handle offline/online status
        window.addEventListener('online', () => this.showMessage('Back online', 'success'));
        window.addEventListener('offline', () => this.showMessage('Working offline', 'warning'));
    }

    // Date handling methods
    getWeekStartDate(date) {
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    getWeekDates(startDate) {
        // Check cache first
        const cacheKey = this.formatDateKey(startDate);
        if (this.weekCache.has(cacheKey)) {
            return this.weekCache.get(cacheKey);
        }

        const dates = [];
        const current = new Date(startDate);
        
        for (let i = 0; i < 7; i++) {
            const dateCopy = new Date(current);
            dates.push(dateCopy);
            current.setDate(current.getDate() + 1);
        }
        
        // Cache the result
        this.weekCache.set(cacheKey, dates);
        return dates;
    }

    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateDisplay(date) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    formatWeekRange(startDate, endDate) {
        const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${start} - ${end}`;
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    isDateInCurrentWeek(date) {
        const weekStart = new Date(this.currentWeekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return date >= weekStart && date <= weekEnd;
    }

    // Data persistence methods
    loadTasks() {
        try {
            const tasksJSON = localStorage.getItem('auroraTasks');
            return tasksJSON ? JSON.parse(tasksJSON) : {};
        } catch (error) {
            console.error('Error loading tasks:', error);
            return {};
        }
    }

    loadActivities() {
        try {
            const activitiesJSON = localStorage.getItem('auroraActivities');
            return activitiesJSON ? JSON.parse(activitiesJSON) : [];
        } catch (error) {
            console.error('Error loading activities:', error);
            return [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('auroraTasks', JSON.stringify(this.tasks));
            this.updateStatistics();
            this.updateWeekProgress();
        } catch (error) {
            console.error('Error saving tasks:', error);
            this.showError('Failed to save tasks. Storage might be full.');
        }
    }

    saveActivities() {
        try {
            // Keep only last 100 activities for performance
            if (this.activities.length > 100) {
                this.activities = this.activities.slice(0, 100);
            }
            localStorage.setItem('auroraActivities', JSON.stringify(this.activities));
        } catch (error) {
            console.error('Error saving activities:', error);
        }
    }

    autoSave() {
        this.saveTasks();
        this.saveActivities();
    }

    // Task management methods
    getTasksForDate(date) {
        const dateKey = this.formatDateKey(date);
        return this.tasks[dateKey] || [];
    }

    addTask(date, taskText) {
        if (!taskText.trim()) return null;
        
        const dateKey = this.formatDateKey(date);
        
        if (!this.tasks[dateKey]) {
            this.tasks[dateKey] = [];
        }
        
        const newTask = {
            id: Date.now() + Math.random(),
            text: taskText.trim(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            completedAt: null,
            missedNote: null,
            updatedAt: null
        };
        
        this.tasks[dateKey].push(newTask);
        this.saveTasks();
        
        // Add activity
        this.addActivity('added', newTask.text, date);
        
        return newTask;
    }

    updateTaskStatus(date, taskId, status, note = null) {
        const dateKey = this.formatDateKey(date);
        const tasks = this.tasks[dateKey];
        
        if (!tasks) return false;
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return false;
        
        const task = tasks[taskIndex];
        const previousStatus = task.status;
        task.status = status;
        task.updatedAt = new Date().toISOString();
        
        if (status === 'completed') {
            task.completedAt = new Date().toISOString();
            task.missedNote = null;
            this.addActivity('completed', task.text, date);
        } else if (status === 'missed') {
            task.missedAt = new Date().toISOString();
            if (note) {
                task.missedNote = note;
            }
            this.addActivity('missed', task.text, date);
        } else if (status === 'pending') {
            task.completedAt = null;
            task.missedAt = null;
            task.missedNote = null;
        }
        
        this.saveTasks();
        return true;
    }

    addActivity(type, taskText, date) {
        const activity = {
            id: Date.now(),
            type: type,
            task: taskText,
            date: new Date().toISOString(),
            taskDate: this.formatDateKey(date),
            timestamp: Date.now()
        };
        
        this.activities.unshift(activity);
        this.saveActivities();
        this.updateRecentActivity();
    }

    // UI rendering methods
    renderWeekView() {
        raf(() => {
            const weekDates = this.getWeekDates(this.currentWeekStart);
            this.elements.weekGrid1.innerHTML = '';
            this.elements.weekGrid2.innerHTML = '';
            
            // Calculate column statistics
            let col1Completed = 0;
            let col1Pending = 0;
            let col2Completed = 0;
            let col2Pending = 0;
            
            weekDates.forEach((date, index) => {
                const dayCard = this.createDayCard(date, index);
                
                if (index < 4) {
                    // First 4 days go to column 1
                    this.elements.weekGrid1.appendChild(dayCard);
                    // Update column 1 statistics
                    const tasks = this.getTasksForDate(date);
                    col1Completed += tasks.filter(t => t.status === 'completed').length;
                    col1Pending += tasks.filter(t => t.status === 'pending').length;
                } else {
                    // Last 3 days go to column 2
                    this.elements.weekGrid2.appendChild(dayCard);
                    // Update column 2 statistics
                    const tasks = this.getTasksForDate(date);
                    col2Completed += tasks.filter(t => t.status === 'completed').length;
                    col2Pending += tasks.filter(t => t.status === 'pending').length;
                }
            });
            
            // Update column statistics
            this.elements.col1Completed.textContent = col1Completed;
            this.elements.col1Pending.textContent = col1Pending;
            this.elements.col2Completed.textContent = col2Completed;
            this.elements.col2Pending.textContent = col2Pending;
            
            // Clear cache if it gets too large
            if (this.weekCache.size > 20) {
                this.weekCache.clear();
            }
        });
    }

    createDayCard(date, index) {
        const isToday = this.isSameDay(date, new Date());
        const tasks = this.getTasksForDate(date);
        
        const dayCard = document.createElement('article');
        dayCard.className = `day-card ${isToday ? 'today' : ''} fade-in`;
        dayCard.setAttribute('aria-label', `Tasks for ${this.formatDateDisplay(date)}`);
        dayCard.style.animationDelay = `${index * 0.1}s`;
        dayCard.style.willChange = 'transform, opacity';
        
        // Calculate statistics
        const completedCount = tasks.filter(t => t.status === 'completed').length;
        const missedCount = tasks.filter(t => t.status === 'missed').length;
        const pendingCount = tasks.filter(t => t.status === 'pending').length;
        
        // Day header
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        dayCard.innerHTML = `
            <header class="day-header">
                <div class="day-info">
                    <div class="day-name">${dayName}</div>
                    <div class="day-date">${dateStr}</div>
                </div>
                <div class="day-stats" aria-label="Task statistics">
                    ${completedCount > 0 ? `<div class="day-stat-badge completed" aria-label="${completedCount} completed tasks">${completedCount}</div>` : ''}
                    ${missedCount > 0 ? `<div class="day-stat-badge missed" aria-label="${missedCount} missed tasks">${missedCount}</div>` : ''}
                    ${pendingCount > 0 ? `<div class="day-stat-badge pending" aria-label="${pendingCount} pending tasks">${pendingCount}</div>` : ''}
                </div>
            </header>
            
            <div class="task-list" id="taskList-${this.formatDateKey(date)}" role="list" aria-label="Tasks for ${dayName}">
                ${tasks.length > 0 ? 
                    tasks.map(task => this.createTaskItemHTML(task, date)).join('') : 
                    '<div class="empty-day" aria-label="No tasks"><div class="empty-icon">📝</div><div class="empty-text">No tasks scheduled</div><button class="add-first-task" data-date="${this.formatDateKey(date)}">Add first task</button></div>'
                }
            </div>
            
            <div class="add-task-form">
                <input type="text" 
                       class="add-task-input" 
                       placeholder="Add a task for ${dayName}..."
                       data-date="${this.formatDateKey(date)}"
                       aria-label="New task for ${dayName}">
                <button class="add-task-btn" data-date="${this.formatDateKey(date)}" aria-label="Add task">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add
                </button>
            </div>
        `;
        
        // Add event listeners
        this.setupDayCardEvents(dayCard, date);
        
        return dayCard;
    }

// In the createTaskItemHTML method, update the delete button HTML:
createTaskItemHTML(task, date) {
    const statusClass = task.status;
    const hasNote = task.missedNote ? 'has-note' : '';
    const noteIcon = task.missedNote ? 
        '<span class="note-icon" style="margin-left: 8px; font-size: 12px; color: #8b5cf6;" title="Has note">📝</span>' : '';
    const ariaLabel = `${task.text} - ${task.status}. ${task.missedNote ? 'Has note' : ''}`;
    
    return `
        <div class="task-item ${statusClass} ${hasNote}" 
             data-task-id="${task.id}"
             role="listitem"
             aria-label="${ariaLabel}">
            <div class="task-checkbox" data-action="toggle" aria-label="Toggle task completion"></div>
            <div class="task-content">
                <div class="task-text">${task.text}${noteIcon}</div>
                <div class="task-meta">
                    ${task.status === 'missed' && task.missedNote ? 
                        '<span class="meta-icon" aria-hidden="true">💬</span> Has note' : 
                        task.status === 'completed' && task.completedAt ? 
                        '<span class="meta-icon" aria-hidden="true">✅</span> Completed' : 
                        '<span class="meta-icon" aria-hidden="true">⏱️</span> Pending'
                    }
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn" data-action="edit" aria-label="Edit task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="task-action-btn delete-btn" data-action="delete" aria-label="Delete task" style="color: #ef4444;">
                    <span style="font-weight: bold; font-size: 16px;">×</span>
                </button>
            </div>
        </div>
    `;
}

    setupDayCardEvents(dayCard, date) {
        const dateKey = this.formatDateKey(date);
        const taskInput = dayCard.querySelector(`.add-task-input[data-date="${dateKey}"]`);
        const addButton = dayCard.querySelector(`.add-task-btn[data-date="${dateKey}"]`);
        const addFirstTaskBtn = dayCard.querySelector('.add-first-task');
        
        // Add task handler
        const addTaskHandler = () => {
            const taskText = taskInput.value.trim();
            if (taskText) {
                this.addTask(date, taskText);
                taskInput.value = '';
                this.renderWeekView();
                this.showMessage('Task added successfully', 'success');
            }
        };
        
        addButton.addEventListener('click', addTaskHandler);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTaskHandler();
        });
        
        // Add first task button
        if (addFirstTaskBtn) {
            addFirstTaskBtn.addEventListener('click', () => {
                taskInput.focus();
            });
        }
        
        // Task checkboxes and actions
        dayCard.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            const taskItem = target.closest('.task-item');
            
            if (!taskItem) return;
            
            const taskId = parseFloat(taskItem.dataset.taskId);
            
            switch(action) {
                case 'toggle':
                    const currentStatus = taskItem.classList.contains('completed') ? 'pending' : 'completed';
                    this.updateTaskStatus(date, taskId, currentStatus);
                    this.renderWeekView();
                    this.showMessage(`Task marked as ${currentStatus}`, 'success');
                    break;
                    
                case 'edit':
                    // For now, just toggle completion
                    const editStatus = taskItem.classList.contains('completed') ? 'pending' : 'completed';
                    this.updateTaskStatus(date, taskId, editStatus);
                    this.renderWeekView();
                    this.showMessage(`Task marked as ${editStatus}`, 'success');
                    break;
                    
                case 'delete':
                    if (confirm('Are you sure you want to delete this task?')) {
                        this.deleteTask(date, taskId);
                        this.renderWeekView();
                        this.showMessage('Task deleted', 'info');
                    }
                    break;
            }
        });
        
        // MARK TASK AS MISSED - THIS IS WHERE THE NOTE MODAL OPENS
        // We'll add a special handler for marking tasks as missed
        dayCard.addEventListener('contextmenu', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            
            e.preventDefault();
            
            const taskId = parseFloat(taskItem.dataset.taskId);
            
            // Only allow marking as missed for pending tasks
            if (!taskItem.classList.contains('pending')) return;
            
            // Open note modal for marking as missed
            this.openNoteModalForMissedTask(date, taskId, taskItem);
            return false;
        });
        
        // Also allow clicking on missed status badge to add note
        dayCard.addEventListener('click', (e) => {
            const target = e.target.closest('.day-stat-badge.missed');
            if (target) {
                // Find first pending task to mark as missed
                const pendingTask = dayCard.querySelector('.task-item.pending');
                if (pendingTask) {
                    const taskId = parseFloat(pendingTask.dataset.taskId);
                    this.openNoteModalForMissedTask(date, taskId, pendingTask);
                }
            }
        });
    }

    openNoteModalForMissedTask(date, taskId, taskItem) {
        this.currentNoteData = { date, taskId };
        this.elements.noteModal.setAttribute('aria-hidden', 'false');
        this.elements.noteModal.style.display = 'flex';
        this.elements.noteTextarea.value = '';
        this.elements.noteTextarea.placeholder = "Why wasn't this task completed? Provide details...";
        
        // Set focus to textarea
        setTimeout(() => {
            this.elements.noteTextarea.focus();
        }, 100);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        
        // Store reference to task item for highlighting
        this.currentTaskItem = taskItem;
    }

    deleteTask(date, taskId) {
        const dateKey = this.formatDateKey(date);
        const tasks = this.tasks[dateKey];
        
        if (!tasks) return false;
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return false;
        
        const deletedTask = tasks[taskIndex];
        tasks.splice(taskIndex, 1);
        
        // If no tasks left for this date, remove the date entry
        if (tasks.length === 0) {
            delete this.tasks[dateKey];
        }
        
        this.saveTasks();
        
        // Add activity
        this.addActivity('deleted', deletedTask.text, date);
        
        return true;
    }

    renderYearNavigation() {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const currentMonth = new Date().getMonth();
        this.elements.yearNavigation.innerHTML = '';
        
        months.forEach((month, index) => {
            const monthBtn = document.createElement('button');
            monthBtn.className = `month-btn ${index === currentMonth ? 'active' : ''}`;
            monthBtn.textContent = month.substring(0, 3);
            monthBtn.dataset.month = index;
            monthBtn.setAttribute('aria-label', `Go to ${month}`);
            monthBtn.setAttribute('type', 'button');
            
            monthBtn.addEventListener('click', () => {
                this.navigateToMonth(index);
                document.querySelectorAll('.month-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                monthBtn.classList.add('active');
            });
            
            this.elements.yearNavigation.appendChild(monthBtn);
        });
    }

    updateWeekDisplay() {
        const weekNumber = this.getWeekNumber(this.currentWeekStart);
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const year = this.currentWeekStart.getFullYear();
        this.elements.weekNumber.textContent = `Week ${weekNumber}, ${year}`;
        this.elements.weekRange.textContent = 
            `${this.formatDateDisplay(this.currentWeekStart)} - ${this.formatDateDisplay(weekEnd)}`;
        this.elements.weekRangeDisplay.textContent = 
            this.formatWeekRange(this.currentWeekStart, weekEnd);
    }

    updateWeekProgress() {
        raf(() => {
            let totalTasks = 0;
            let completedTasks = 0;
            
            // Get all tasks for the current week
            const weekDates = this.getWeekDates(this.currentWeekStart);
            weekDates.forEach(date => {
                const tasks = this.getTasksForDate(date);
                totalTasks += tasks.length;
                completedTasks += tasks.filter(t => t.status === 'completed').length;
            });
            
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            // Update progress bar
            this.elements.weekProgressPercent.textContent = `${progress}%`;
            this.elements.weekProgressFill.style.width = `${progress}%`;
            
            // Animate progress bar
            this.elements.weekProgressFill.style.transition = 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });
    }

    updateStatistics() {
        raf(() => {
            let completed = 0;
            let missed = 0;
            let pending = 0;
            let total = 0;
            
            // Count all tasks
            Object.values(this.tasks).forEach(dateTasks => {
                dateTasks.forEach(task => {
                    total++;
                    if (task.status === 'completed') completed++;
                    else if (task.status === 'missed') missed++;
                    else pending++;
                });
            });
            
            // Animate counters
            this.animateCounter(this.elements.completedCount, completed);
            this.animateCounter(this.elements.missedCount, missed);
            this.animateCounter(this.elements.pendingCount, pending);
            this.animateCounter(this.elements.totalCount, total);
        });
    }

    updateRecentActivity() {
        raf(() => {
            this.elements.activityList.innerHTML = '';
            
            if (this.activities.length === 0) {
                this.elements.activityList.innerHTML = `
                    <div class="empty-state" aria-label="No recent activity">
                        <div class="empty-icon">📊</div>
                        <p>No activity yet</p>
                    </div>
                `;
                return;
            }
            
            // Show last 5 activities
            this.activities.slice(0, 5).forEach(activity => {
                const activityItem = this.createActivityItem(activity);
                this.elements.activityList.appendChild(activityItem);
            });
        });
    }

    createActivityItem(activity) {
        const item = document.createElement('article');
        item.className = `activity-item ${activity.type}`;
        item.setAttribute('aria-label', `${activity.type} task: ${activity.task}`);
        
        const icon = activity.type === 'completed' ? '✅' : 
                    activity.type === 'missed' ? '❌' : 
                    activity.type === 'deleted' ? '🗑️' : '➕';
        
        const actionText = activity.type === 'completed' ? 'Completed' :
                         activity.type === 'missed' ? 'Missed' :
                         activity.type === 'deleted' ? 'Deleted' : 'Added';
        
        const time = new Date(activity.date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        item.innerHTML = `
            <div class="activity-icon" aria-hidden="true">
                ${icon}
            </div>
            <div class="activity-content">
                <div class="activity-text">
                    <strong>${actionText}</strong>: ${activity.task}
                </div>
                <div class="activity-time">${time}</div>
            </div>
        `;
        
        return item;
    }

    // Modal methods
    openNoteModal(taskData) {
        this.currentNoteData = taskData;
        this.elements.noteModal.setAttribute('aria-hidden', 'false');
        this.elements.noteModal.style.display = 'flex';
        this.elements.noteTextarea.value = '';
        
        // Set focus to textarea
        setTimeout(() => {
            this.elements.noteTextarea.focus();
        }, 100);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    closeNoteModal() {
        this.elements.noteModal.setAttribute('aria-hidden', 'true');
        this.elements.noteModal.style.display = 'none';
        this.currentNoteData = null;
        this.currentTaskItem = null;
        
        // Restore body scrolling
        document.body.style.overflow = '';
    }

    saveNote() {
        const note = this.elements.noteTextarea.value.trim();
        
        if (!note) {
            this.showMessage('Please provide a reason for missing this task.', 'warning');
            return;
        }
        
        if (this.currentNoteData) {
            const { date, taskId } = this.currentNoteData;
            const success = this.updateTaskStatus(date, taskId, 'missed', note);
            
            if (success) {
                this.renderWeekView();
                this.closeNoteModal();
                this.showMessage('Task marked as missed with note', 'info');
            }
        }
    }

    viewNote(taskId, date) {
        const tasks = this.getTasksForDate(date);
        const task = tasks.find(t => t.id === taskId);
        
        if (task && task.missedNote) {
            this.openNoteModal({ date, taskId });
            this.elements.noteTextarea.value = task.missedNote;
            this.elements.noteTextarea.readOnly = true;
            this.elements.saveNote.style.display = 'none';
            
            // Change modal title for viewing
            document.getElementById('modalTitle').textContent = 'Note for Missed Task';
            document.getElementById('modalDescription').textContent = 'This note was added when the task was marked as missed:';
            
            setTimeout(() => {
                this.elements.noteTextarea.readOnly = false;
                this.elements.saveNote.style.display = '';
                this.closeNoteModal();
                
                // Reset modal title
                document.getElementById('modalTitle').textContent = 'Reason for Missing Task';
                document.getElementById('modalDescription').textContent = 'Please provide a detailed explanation for why this task was not completed. This helps with accountability and future planning.';
            }, 3000);
        }
    }

    // Navigation methods
    navigateWeek(direction) {
        const newDate = new Date(this.currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));
        this.currentWeekStart = newDate;
        this.renderWeekView();
        this.updateWeekDisplay();
        this.updateWeekProgress();
        
        // Clear cache for old week
        const oldCacheKey = this.formatDateKey(new Date(this.currentWeekStart));
        this.weekCache.delete(oldCacheKey);
        
        this.showMessage(`Navigated to ${direction > 0 ? 'next' : 'previous'} week`, 'info');
    }

    goToToday() {
        this.currentDate = new Date();
        this.currentWeekStart = this.getWeekStartDate(this.currentDate);
        this.renderWeekView();
        this.updateWeekDisplay();
        this.updateWeekProgress();
        this.showMessage('Navigated to today', 'success');
    }

    navigateToMonth(monthIndex) {
        const currentYear = new Date().getFullYear();
        const targetDate = new Date(currentYear, monthIndex, 15);
        this.currentWeekStart = this.getWeekStartDate(targetDate);
        this.renderWeekView();
        this.updateWeekDisplay();
        this.updateWeekProgress();
        this.showMessage(`Navigated to ${new Date(currentYear, monthIndex).toLocaleString('default', { month: 'long' })}`, 'info');
    }

    addQuickTask() {
        const taskText = this.elements.quickTaskInput.value.trim();
        if (!taskText) return;
        
        const today = new Date();
        this.addTask(today, taskText);
        this.elements.quickTaskInput.value = '';
        
        if (this.isDateInCurrentWeek(today)) {
            this.renderWeekView();
        }
        
        this.showMessage('Task added successfully', 'success');
    }

    // Utility methods
    animateCounter(element, target) {
        const current = parseInt(element.textContent) || 0;
        if (current === target) return;
        
        const duration = 500;
        const stepTime = Math.abs(Math.floor(duration / Math.abs(target - current)));
        const increment = target > current ? 1 : -1;
        
        let currentValue = current;
        const timer = setInterval(() => {
            currentValue += increment;
            element.textContent = currentValue;
            
            if (currentValue === target) {
                clearInterval(timer);
            }
        }, Math.min(stepTime, 50));
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(func, wait);
    }

    animateOnLoad() {
        document.querySelectorAll('.fade-in').forEach((el, index) => {
            el.style.animationDelay = `${index * 0.1}s`;
        });
    }

    showMessage(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        // Create toast message
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showError(message) {
        this.showMessage(message, 'error');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize tracker
    try {
        const tracker = new AuroraTaskTracker();
        window.auroraTracker = tracker; // Expose for debugging
        
        // Update page title with current time
        setInterval(() => {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.title = `AURORA | ${timeString} - Daily Task Tracker`;
        }, 60000);
        
    } catch (error) {
        console.error('Critical error initializing AURORA:', error);
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; color: white; background: var(--dark-gradient); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <h1 style="font-size: 2.5rem; margin-bottom: 1rem; background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">⚠️ Application Error</h1>
                <p style="font-size: 1.1rem; margin-bottom: 2rem; opacity: 0.8;">Failed to initialize AURORA Task Tracker.</p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: var(--primary-gradient); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s;">
                    Reload Application
                </button>
            </div>
        `;
    }
});