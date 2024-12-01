// Theme handling
document.getElementById('themeToggle').addEventListener('change', function(e) {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
});

// Drag and drop handling
const dropZone = document.getElementById('dropZone');
const qrisInput = document.getElementById('qrisInput');

dropZone.addEventListener('click', () => qrisInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-primary');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-primary');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-primary');
    
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

qrisInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

// Copy and Download functionality
document.getElementById('copyBtn').addEventListener('click', async () => {
    const result = document.getElementById('result')?.textContent;
    if (result) {
        await navigator.clipboard.writeText(result);
        showToast();
    }
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    const parsedData = window.lastParsedData;
    if (parsedData) {
        const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qris-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});

function showToast() {
    const toast = document.getElementById('successToast');
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    // Show loading
    document.getElementById('loadingIndicator').classList.remove('hidden');
    
    try {
        const imageUrl = await readFileAsDataURL(file);
        const img = await loadImage(imageUrl);
        
        // Show preview
        document.getElementById('preview').src = imageUrl;
        document.getElementById('previewSection').classList.remove('hidden');
        
        // Process QR code
        const code = await processQRCode(img);
        
        if (code) {
            const parsedData = parseQRISPayload(code.data);
            window.lastParsedData = parsedData; // Save for download
            displayResults(parsedData);
            document.getElementById('resultSection').classList.remove('hidden');
        } else {
            throw new Error('Could not read QRIS code');
        }
    } catch (error) {
        // Show error in stats
        document.getElementById('scanStatus').innerHTML = `
            <i class="fas fa-times-circle text-error"></i> Error: ${error.message}
        `;
    } finally {
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function processQRCode(img) {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(imageData.data, imageData.width, imageData.height);
}

function displayResults(parsedData) {
    const tbody = document.getElementById('resultTable');
    tbody.innerHTML = '';
    
    for (let [id, data] of Object.entries(parsedData)) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-mono text-xs md:text-base">${id}</td>
            <td class="text-xs md:text-base">${data.meaning}</td>
            <td class="font-mono text-xs md:text-base break-all">${data.value}</td>
        `;
        tbody.appendChild(row);
    }
}

// QRIS Parsing logic (sama seperti sebelumnya)
function parseQRISPayload(payload) {
    let result = {};
    let position = 0;

    while (position < payload.length) {
        const id = payload.substr(position, 2);
        const length = parseInt(payload.substr(position + 2, 2));
        const value = payload.substr(position + 4, length);
        
        result[id] = {
            value: value,
            meaning: getQRISElementMeaning(id)
        };
        
        position += 4 + length;
    }
    
    return result;
}

function getQRISElementMeaning(id) {
    const qrisElements = {
        "00": "Format Indicator",
        "01": "Point of Initiation Method",
        "26": "Merchant Account Information",
        "27": "Merchant Account Information",
        "28": "Merchant Account Information",
        "29": "Merchant Account Information",
        "30": "Merchant Account Information",
        "31": "Merchant Account Information",
        "51": "Payment Network Specific",
        "52": "Merchant Category Code",
        "53": "Transaction Currency",
        "54": "Transaction Amount",
        "55": "Tip Indicator",
        "56": "Fixed Fee",
        "57": "Percentage Fee",
        "58": "Country Code",
        "59": "Merchant Name",
        "60": "Merchant City",
        "61": "Postal Code",
        "62": "Additional Data Field",
        "63": "CRC (Checksum)",
    };
    
    return qrisElements[id] || "Unknown Element";
}

// Tambahkan di bagian atas file
function adjustForMobile() {
    const isMobile = window.innerWidth < 768;
    
    // Adjust table display for mobile
    const table = document.querySelector('.table');
    if (table) {
        if (isMobile) {
            table.classList.add('table-compact');
        } else {
            table.classList.remove('table-compact');
        }
    }
}

// Add resize listener
window.addEventListener('resize', adjustForMobile);
window.addEventListener('load', adjustForMobile);

// Fungsi untuk menangani copy raw data
document.getElementById('copyBtn').addEventListener('click', async function() {
    try {
        // Gunakan data QR yang tersimpan dari hasil scan terakhir
        const code = window.lastParsedData;
        if (!code) {
            throw new Error('No QR data available');
        }
        
        // Convert object to string dan format dengan JSON stringify
        const rawData = JSON.stringify(code, null, 2);
        
        // Copy ke clipboard
        await navigator.clipboard.writeText(rawData);
        
        // Tampilkan toast notification
        showToast();
    } catch (err) {
        console.error('Failed to copy:', err);
    }
});

// Mencegah redefine ethereum property
if (!window.ethereum) {
    Object.defineProperty(window, 'ethereum', {
        value: null,
        writable: true,
        configurable: true
    });
}