// Global variables
let isEditMode = false;
let currentPropertyId = null;

// API Base URL
const API_BASE_URL = 'http://localhost:3001';

// Get property ID from URL for edit mode
function getPropertyIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// API call helper
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Show loading
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

// Hide loading
function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

// Show success message
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    const successText = document.getElementById('success-text');
    successText.textContent = message;
    successDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    errorText.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Format CEP input
function formatCEP(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 5) {
        value = value.substring(0, 5) + '-' + value.substring(5, 8);
    }
    input.value = value;
}

// Format phone input
function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 10) {
        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 6) {
        value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    input.value = value;
}

// Validate form
function validateForm() {
    const requiredFields = [
        { id: 'name', name: 'Nome do Imóvel' },
        { id: 'property-type', name: 'Tipo de Imóvel' },
        { id: 'status', name: 'Status' },
        { id: 'address', name: 'Endereço' },
        { id: 'city', name: 'Cidade' },
        { id: 'state', name: 'Estado' }
    ];
    
    const errors = [];
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (!element.value.trim()) {
            errors.push(field.name);
            element.classList.add('border-red-500');
        } else {
            element.classList.remove('border-red-500');
        }
    });
    
    // Validate email if provided
    const email = document.getElementById('tenant-email').value;
    if (email && !isValidEmail(email)) {
        errors.push('Email do inquilino deve ser válido');
        document.getElementById('tenant-email').classList.add('border-red-500');
    } else {
        document.getElementById('tenant-email').classList.remove('border-red-500');
    }
    
    // Validate lease dates
    const leaseStart = document.getElementById('lease-start').value;
    const leaseEnd = document.getElementById('lease-end').value;
    
    if (leaseStart && leaseEnd && new Date(leaseStart) >= new Date(leaseEnd)) {
        errors.push('Data de fim do contrato deve ser posterior à data de início');
        document.getElementById('lease-end').classList.add('border-red-500');
    } else {
        document.getElementById('lease-end').classList.remove('border-red-500');
    }
    
    if (errors.length > 0) {
        showError('Por favor, corrija os seguintes campos: ' + errors.join(', '));
        return false;
    }
    
    return true;
}

// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Get form data
function getFormData() {
    const form = document.getElementById('property-form');
    const formData = new FormData(form);
    const data = {};
    
    // Convert FormData to object
    for (let [key, value] = formData) {
        // Convert numeric fields
        if (['bedrooms', 'bathrooms', 'parkingSpaces', 'area', 'purchasePrice', 
             'currentValue', 'rentalValue', 'condoFee', 'iptu', 'deposit'].includes(key)) {
            data[key] = value ? parseFloat(value) : null;
        } else {
            data[key] = value || null;
        }
    }
    
    return data;
}

// Load property data for editing
async function loadPropertyData() {
    const propertyId = getPropertyIdFromUrl();
    
    if (!propertyId) {
        return; // New property mode
    }
    
    try {
        showLoading();
        
        const response = await apiCall(`/properties/${propertyId}`);
        const property = response.data || response;
        
        // Set edit mode
        isEditMode = true;
        currentPropertyId = propertyId;
        
        // Update page title
        document.getElementById('page-title').innerHTML = `
            <i class="fas fa-edit mr-2 text-blue-600"></i>
            Editar Imóvel
        `;
        
        // Populate form fields
        populateForm(property);
        
        hideLoading();
    } catch (error) {
        console.error('Error loading property:', error);
        showError('Erro ao carregar dados do imóvel!');
        hideLoading();
    }
}

// Populate form with property data
function populateForm(property) {
    Object.keys(property).forEach(key => {
        const element = document.getElementById(key) || 
                       document.getElementById(camelToKebab(key));
        
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = property[key];
            } else if (element.type === 'date') {
                element.value = property[key] ? property[key].split('T')[0] : '';
            } else {
                element.value = property[key] || '';
            }
        }
    });
}

// Convert camelCase to kebab-case
function camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// Save property
async function saveProperty() {
    if (!validateForm()) {
        return;
    }
    
    try {
        showLoading();
        
        const data = getFormData();
        
        let response;
        if (isEditMode) {
            response = await apiCall(`/properties/${currentPropertyId}`, 'PUT', data);
            showSuccess('Imóvel atualizado com sucesso!');
        } else {
            response = await apiCall('/properties', 'POST', data);
            showSuccess('Imóvel cadastrado com sucesso!');
            
            // Reset form after successful creation
            setTimeout(() => {
                resetForm();
            }, 2000);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error saving property:', error);
        showError('Erro ao salvar imóvel. Tente novamente.');
        hideLoading();
    }
}

// Reset form
function resetForm() {
    if (confirm('Tem certeza que deseja limpar todos os campos?')) {
        document.getElementById('property-form').reset();
        
        // Remove error styling
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('border-red-500');
        });
        
        // Hide messages
        document.getElementById('success-message').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
        
        // Focus on first field
        document.getElementById('name').focus();
    }
}

// Auto-fill address from CEP
async function fillAddressFromCEP(cep) {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
        return;
    }
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
            document.getElementById('address').value = `${data.logradouro}, ${data.bairro}`;
            document.getElementById('neighborhood').value = data.bairro;
            document.getElementById('city').value = data.localidade;
            document.getElementById('state').value = data.uf;
        }
    } catch (error) {
        console.error('Error fetching address:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // CEP formatting and auto-fill
    const cepInput = document.getElementById('cep');
    cepInput.addEventListener('input', (e) => {
        formatCEP(e.target);
    });
    
    cepInput.addEventListener('blur', (e) => {
        if (e.target.value.length === 9) {
            fillAddressFromCEP(e.target.value);
        }
    });
    
    // Phone formatting
    const phoneInput = document.getElementById('tenant-phone');
    phoneInput.addEventListener('input', (e) => {
        formatPhone(e.target);
    });
    
    // Form submission
    document.getElementById('property-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProperty();
    });
    
    // Load property data if in edit mode
    loadPropertyData();
    
    // Focus on first field
    document.getElementById('name').focus();
});

// Mock save function for demonstration
function mockSaveProperty() {
    if (!validateForm()) {
        return;
    }
    
    showLoading();
    
    // Simulate API call
    setTimeout(() => {
        hideLoading();
        
        if (isEditMode) {
            showSuccess('Imóvel atualizado com sucesso!');
        } else {
            showSuccess('Imóvel cadastrado com sucesso!');
            
            // Reset form after successful creation
            setTimeout(() => {
                resetForm();
            }, 2000);
        }
    }, 1500);
}

// Use mock function if API is not available
window.addEventListener('load', () => {
    // Override saveProperty with mock if needed
    const originalSaveProperty = window.saveProperty;
    window.saveProperty = async function() {
        try {
            await originalSaveProperty();
        } catch (error) {
            console.log('API not available, using mock save');
            mockSaveProperty();
        }
    };
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveProperty();
    }
    
    // Ctrl+R to reset (with confirmation)
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        resetForm();
    }
    
    // Escape to close
    if (e.key === 'Escape') {
        if (confirm('Deseja fechar esta janela?')) {
            window.close();
        }
    }
});

// Auto-save draft (optional feature)
let autoSaveTimer;
function autoSaveDraft() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        const data = getFormData();
        localStorage.setItem('property-form-draft', JSON.stringify(data));
        console.log('Draft saved automatically');
    }, 30000); // Save every 30 seconds
}

// Load draft on page load
function loadDraft() {
    const draft = localStorage.getItem('property-form-draft');
    if (draft && !isEditMode) {
        const data = JSON.parse(draft);
        if (confirm('Foi encontrado um rascunho salvo. Deseja carregá-lo?')) {
            populateForm(data);
        }
    }
}

// Clear draft after successful save
function clearDraft() {
    localStorage.removeItem('property-form-draft');
}

// Initialize auto-save
document.addEventListener('DOMContentLoaded', () => {
    loadDraft();
    
    // Start auto-save on form changes
    const form = document.getElementById('property-form');
    form.addEventListener('input', autoSaveDraft);
    form.addEventListener('change', autoSaveDraft);
});