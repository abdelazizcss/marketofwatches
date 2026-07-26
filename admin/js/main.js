export function initAdmin() {
    console.log('Admin dashboard initialized');
}

export function formatCurrency(amount) {
    return `${Number(amount).toFixed(2)} DA`;
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
