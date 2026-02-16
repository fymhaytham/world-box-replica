/**
 * NotificationManager — handles in-game pop-down notifications.
 */
export class NotificationManager {
    constructor(containerId = 'notification-area') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`Notification container #${containerId} not found.`);
        }
    }

    /**
     * Show a new notification.
     * @param {string} message - The text to display.
     * @param {string} type - 'info', 'success', 'warning', 'danger', or custom class.
     * @param {number} duration - Time in ms before disappearing (default 5000).
     */
    show(message, type = 'info', duration = 5000) {
        if (!this.container) return;

        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;

        // Add icon based on types?
        let icon = '📢';
        if (type === 'research') icon = '🧪';
        if (type === 'war') icon = '⚔️';
        if (type === 'peace') icon = '🕊️';
        if (type === 'conquest') icon = '👑';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            // Wait for transition to finish before removing from DOM
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    }
}
