// js/utils.js
console.log("🔧 Utils.js is loading...");

// Toast notification
window.showToast = function(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn("Toast element not found");
        return;
    }
    const colors = {
        success: '#2c5f2d',
        error: '#b91c1c',
        warning: '#d97706',
        info: '#2563eb'
    };
    toast.textContent = message;
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
};

console.log("✅ Utils.js loaded successfully");