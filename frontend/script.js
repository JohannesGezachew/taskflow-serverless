/**
 * TaskFlow - Serverless Todo Application
 * Frontend JavaScript for managing todos with AWS serverless backend
 * Replace API_BASE_URL with your actual API Gateway URL after deployment
 */
const API_BASE_URL = 'https://your-api-id.execute-api.region.amazonaws.com/prod';


class TaskFlowApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.isDarkMode = true;
        this.userId = this.getUserId();
        this.init();
    }

    getUserId() {
        // Get or create a unique user ID for this browser
        let userId = localStorage.getItem('taskflow-user-id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
            localStorage.setItem('taskflow-user-id', userId);
        }
        return userId;
    }

    init() {
        try {
            this.initializeIcons();
            this.bindEvents();
            this.setupTheme();
            this.updateUserIndicator();
            this.loadTodos(); // Load todos last so other functions work even if API fails
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    updateUserIndicator() {
        const indicator = document.getElementById('userIndicator');
        const shortId = this.userId.split('_')[1]?.substring(0, 6) || 'guest';
        indicator.textContent = `User: ${shortId}`;
    }

    initializeIcons() {
        // Initialize Lucide icons
        try {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.warn('Failed to initialize icons:', error);
        }
    }

    bindEvents() {
        // Add task button
        document.getElementById('addTodo').addEventListener('click', () => this.addTodo());

        // Enter key in title field
        document.getElementById('todoTitle').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Filter tabs
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // User session management
        document.getElementById('userIndicatorContainer').addEventListener('click', () => {
            this.showUserModal();
        });

        // Modal event listeners
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideUserModal();
        });

        document.getElementById('copyUserId').addEventListener('click', () => {
            this.copyUserId();
        });

        document.getElementById('restoreUser').addEventListener('click', () => {
            this.restoreUser();
        });

        document.getElementById('resetUser').addEventListener('click', () => {
            this.resetUser();
        });

        // Close modal on backdrop click
        document.getElementById('userModal').addEventListener('click', (e) => {
            if (e.target.id === 'userModal') {
                this.hideUserModal();
            }
        });
    }

    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle?.querySelector('i');

        if (this.isDarkMode) {
            document.documentElement.classList.add('dark');
            if (icon) icon.setAttribute('data-lucide', 'sun');
        } else {
            document.documentElement.classList.remove('dark');
            if (icon) icon.setAttribute('data-lucide', 'moon');
        }

        this.initializeIcons();
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.setupTheme();
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active tab
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        this.renderTodos();
    }

    async loadTodos() {
        try {
            const response = await fetch(`${API_BASE_URL}/todos?userId=${this.userId}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`Failed to load todos: ${response.status}`);
            }

            const allTodos = await response.json();

            // Filter todos for this user only
            this.todos = allTodos.filter(todo => todo.userId === this.userId);
            this.renderTodos();
            this.updateStats();
        } catch (error) {
            this.showError('Failed to load todos. Please check your API configuration.');
            console.error('Error loading todos:', error);
            // Show empty state even if loading fails
            this.renderTodos();
        }
    }

    async addTodo() {
        const title = document.getElementById('todoTitle').value.trim();
        const description = document.getElementById('todoDescription').value.trim();

        if (!title) {
            this.showNotification('Please enter a task title', 'error');
            return;
        }

        const addButton = document.getElementById('addTodo');
        const originalText = addButton.innerHTML;
        addButton.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i>Adding...';
        addButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                    userId: this.userId
                })
            });

            if (!response.ok) throw new Error('Failed to create todo');

            const newTodo = await response.json();
            this.todos.unshift(newTodo);
            this.renderTodos();
            this.updateStats();

            // Clear form
            document.getElementById('todoTitle').value = '';
            document.getElementById('todoDescription').value = '';

            this.showNotification('Task added successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to create task', 'error');
            console.error('Error creating todo:', error);
        } finally {
            addButton.innerHTML = originalText;
            addButton.disabled = false;
            this.initializeIcons();
        }
    }

    async toggleComplete(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;

        try {

            const response = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: todoId,
                    completed: !todo.completed
                })
            });



            if (!response.ok) throw new Error('Failed to update todo');

            const updatedTodo = await response.json();
            const index = this.todos.findIndex(t => t.id === todoId);
            this.todos[index] = updatedTodo;
            this.renderTodos();
            this.updateStats();

            this.showNotification(
                updatedTodo.completed ? 'Task completed!' : 'Task marked as pending',
                'success'
            );
        } catch (error) {
            this.showNotification('Failed to update task', 'error');
            console.error('Error updating todo:', error);
        }
    }

    async deleteTodo(todoId) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {

            const response = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
                method: 'DELETE'
            });



            if (!response.ok) throw new Error('Failed to delete todo');

            this.todos = this.todos.filter(t => t.id !== todoId);
            this.renderTodos();
            this.updateStats();

            this.showNotification('Task deleted successfully', 'success');
        } catch (error) {
            this.showNotification('Failed to delete task', 'error');
            console.error('Error deleting todo:', error);
        }
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            case 'pending':
                return this.todos.filter(todo => !todo.completed);
            default:
                return this.todos;
        }
    }

    renderTodos() {
        const container = document.getElementById('todoItems');
        const emptyState = document.getElementById('emptyState');
        const filteredTodos = this.getFilteredTodos();

        if (filteredTodos.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = filteredTodos.map(todo => `
            <div class="task-item ${todo.completed ? 'completed' : ''}">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(todo.title)}</h3>
                    <div class="task-actions">
                        <button class="btn btn-secondary btn-sm" onclick="app.toggleComplete('${todo.id}')">
                            <i data-lucide="${todo.completed ? 'rotate-ccw' : 'check'}" class="w-3 h-3 mr-1"></i>
                            ${todo.completed ? 'Undo' : 'Done'}
                        </button>
                        <button class="btn btn-destructive btn-sm" onclick="app.deleteTodo('${todo.id}')">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
                ${todo.description ? `<p class="task-description">${this.escapeHtml(todo.description)}</p>` : ''}
                <div class="task-meta">
                    <div class="flex items-center space-x-4 text-xs">
                        <span class="flex items-center space-x-1">
                            <i data-lucide="calendar" class="w-3 h-3"></i>
                            <span>Created ${this.formatDate(todo.created_at)}</span>
                        </span>
                        ${todo.updated_at !== todo.created_at ? `
                            <span class="flex items-center space-x-1">
                                <i data-lucide="edit-3" class="w-3 h-3"></i>
                                <span>Updated ${this.formatDate(todo.updated_at)}</span>
                            </span>
                        ` : ''}
                    </div>
                    <div class="flex items-center space-x-1">
                        <div class="w-2 h-2 rounded-full ${todo.completed ? 'bg-green-500' : 'bg-orange-500'}"></div>
                        <span class="text-xs">${todo.completed ? 'Completed' : 'Pending'}</span>
                    </div>
                </div>
            </div>
        `).join('');

        this.initializeIcons();
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(todo => todo.completed).length;
        const pending = total - completed;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'today';
        if (diffDays === 2) return 'yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;

        return date.toLocaleDateString();
    }

    showError(message) {
        const container = document.getElementById('todoItems');
        container.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-circle" class="w-8 h-8 text-destructive"></i>
                    </div>
                    <h3 class="text-lg font-semibold mb-2">Connection Error</h3>
                    <p class="text-muted-foreground">${message}</p>
                </div>
            </div>
        `;
        this.initializeIcons();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;

        const bgColor = type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' : 'bg-blue-500';

        notification.classList.add(bgColor, 'text-white');
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" class="w-4 h-4"></i>
                <span class="text-sm font-medium">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);
        this.initializeIcons();

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showUserModal() {
        document.getElementById('currentUserId').value = this.userId;
        document.getElementById('userModal').classList.remove('hidden');
        this.initializeIcons();
    }

    hideUserModal() {
        document.getElementById('userModal').classList.add('hidden');
        document.getElementById('restoreUserId').value = '';
    }

    async copyUserId() {
        try {
            await navigator.clipboard.writeText(this.userId);
            this.showNotification('User ID copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.userId;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showNotification('User ID copied to clipboard!', 'success');
            } catch (copyErr) {
                this.showNotification('Could not copy to clipboard', 'error');
            }
            document.body.removeChild(textArea);
        }
    }

    async restoreUser() {
        const newUserId = document.getElementById('restoreUserId').value.trim();

        if (!newUserId) {
            this.showNotification('Please enter a user ID', 'error');
            return;
        }

        if (!newUserId.startsWith('user_')) {
            this.showNotification('Invalid user ID format', 'error');
            return;
        }

        // Save the new user ID
        localStorage.setItem('taskflow-user-id', newUserId);
        this.userId = newUserId;

        // Update UI and reload tasks
        this.updateUserIndicator();
        this.hideUserModal();
        this.showNotification('User session restored!', 'success');

        // Reload tasks for the new user
        await this.loadTodos();
    }

    resetUser() {
        if (confirm('Start fresh with a new user ID? Your current tasks will be hidden (but not deleted).')) {
            localStorage.removeItem('taskflow-user-id');
            location.reload();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
window.app = new TaskFlowApp();