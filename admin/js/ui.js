export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

export function showModal(options = {}) {
    return new Promise((resolve, reject) => {
        const {
            title = 'تأكيد',
            message = 'هل أنت متأكد؟',
            confirmText = 'نعم',
            cancelText = 'إلغاء',
            type = 'danger',
            onConfirm = null,
            onCancel = null
        } = options;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" aria-label="إغلاق">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="modal-message">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">${cancelText}</button>
                    <button class="btn btn-${type} modal-confirm">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        const close = () => {
            modal.classList.add('modal-hide');
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 300);
        };

        modal.querySelector('.modal-close').addEventListener('click', () => {
            close();
            if (onCancel) onCancel();
            resolve(false);
        });

        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            close();
            if (onCancel) onCancel();
            resolve(false);
        });

        modal.querySelector('.modal-confirm').addEventListener('click', () => {
            close();
            if (onConfirm) onConfirm();
            resolve(true);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                close();
                if (onCancel) onCancel();
                resolve(false);
            }
        });

        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', handler);
                if (onCancel) onCancel();
                resolve(false);
            }
        });
    });
}

export function showLoading(containerId = 'loading-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>جاري التحميل...</p>
        </div>
    `;
    container.style.display = 'flex';
}

export function hideLoading(containerId = 'loading-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'none';
}

export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

export function formatPrice(price) {
    return `${Number(price).toFixed(2)} ر.س`;
}

export function getDiscountedPrice(price, discount) {
    return Math.round(price * (1 - discount / 100));
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
