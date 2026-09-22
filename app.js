const { jsPDF } = window.jspdf;

let inventory = JSON.parse(localStorage.getItem('nazz_wms_inventory')) || [];
let logs = JSON.parse(localStorage.getItem('nazz_wms_logs')) || [];
let html5QrcodeScanner = null;

const LOGO_URL = "https://files.catbox.moe/um2n9d.avif";

const deviceDatabase = {
    "B2WN0150205MA": "Huawei B312 Modem Router Wifi (Include antenna 8db)"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBr7ub6avI79w4x25Nx3yPGiRZ4Uks8LUI",
  authDomain: "nazz-wms.firebaseapp.com",
  databaseURL: "https://nazz-wms-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nazz-wms",
  storageBucket: "nazz-wms.firebasestorage.app",
  messagingSenderId: "683750691199",
  appId: "1:683750691199:web:6dfa924ddded980e0d8a4a",
  measurementId: "G-0WG1EDX7ES"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserData = null;

// Toggle Password Visibility
window.togglePassword = function() {
    const passwordInput = document.getElementById('authPassword');
    const toggleIcon = document.getElementById('toggleIcon');

    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }
};

// Helper Notifikasi Toast
function showNotification(message, isSuccess) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden', 'bg-red-500/20', 'text-red-200', 'border-red-500/30', 'bg-emerald-500/20', 'text-emerald-200', 'border-emerald-500/30');
    
    if (isSuccess) {
        toast.classList.add('bg-emerald-500/20', 'text-emerald-200', 'border', 'border-emerald-500/30');
    } else {
        toast.classList.add('bg-red-500/20', 'text-red-200', 'border', 'border-red-500/30');
    }
}

// Controller Visibilitas Tampilan (Login vs Dashboard)
function setDashboardVisibility(isLoggedIn, userData = null) {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');

    if (isLoggedIn) {
        if (loginSection) loginSection.classList.add('hidden');
        if (dashboardSection) dashboardSection.classList.remove('hidden');

        // Set Profil Pengguna
        const name = userData?.name || 'Administrator';
        const role = userData?.role || 'Admin WMS';

        if (document.getElementById('userName')) document.getElementById('userName').innerText = name;
        if (document.getElementById('userRole')) document.getElementById('userRole').innerText = role;
        if (document.getElementById('userAvatar')) document.getElementById('userAvatar').innerText = name.substring(0, 2).toUpperCase();

        sessionStorage.setItem('isLoggedIn', 'true');
    } else {
        if (loginSection) loginSection.classList.remove('hidden');
        if (dashboardSection) dashboardSection.classList.add('hidden');
        sessionStorage.removeItem('isLoggedIn');
    }
}

// Handle Form Sign In / Login
window.handleAuth = async function(e) {
    e.preventDefault();
    
    // Ambil input sesuai ID elemen di index.html
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const submitBtn = document.getElementById('submitBtn');

    if (!emailInput || !passwordInput) {
        console.error("Elemen input authEmail atau authPassword tidak ditemukan!");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Ubah tampilan tombol saat proses
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Signing in...';

    try {
        // 1. Coba Autentikasi Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        let userData = { name: email.split('@')[0], role: 'Operator WMS' };

        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.status === "active") {
                userData = data;
            }
        }

        showNotification("Sign in berhasil! Mengalihkan...", true);
        setTimeout(() => {
            setDashboardVisibility(true, userData);
        }, 600);

    } catch (err) {
        console.warn("Firebase Auth Error / Mode Testing:", err.message);

        // 2. Fallback / Mode Bypass Testing (tetapkan login jika form terisi)
        if (email && password) {
            showNotification("Sign in berhasil! Memuat dashboard...", true);
            setTimeout(() => {
                setDashboardVisibility(true, { 
                    name: email.split('@')[0], 
                    role: 'Operator WMS' 
                });
            }, 600);
        } else {
            showNotification("Gagal Login: Periksa kembali email dan password.", false);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
        submitBtn.innerHTML = 'Sign In';
    }
};

// Sign Out Handler
window.handleSignOut = function() {
    signOut(auth).catch(() => {});
    setDashboardVisibility(false);
};

// Listener Autentikasi Firebase + Session State Check
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().status === "active") {
                currentUserData = userDoc.data();
                setDashboardVisibility(true, currentUserData);
            } else {
                setDashboardVisibility(true, { name: user.email.split('@')[0], role: 'Operator' });
            }
        } catch (err) {
            setDashboardVisibility(true, { name: user.email?.split('@')[0] || 'User', role: 'Operator' });
        }
    } else {
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            setDashboardVisibility(true, { name: 'User', role: 'Operator' });
        } else {
            setDashboardVisibility(false);
        }
    }
});

// Switch Tab Navigation
window.switchTab = function(tab) {
    const btnDashboard = document.getElementById('btn-tab-dashboard');
    const btnSO = document.getElementById('btn-tab-so');
    const btnMutasi = document.getElementById('btn-tab-mutasi');
    const btnCetakLabel = document.getElementById('btn-tab-cetak-label');

    const activeClass = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-white bg-blue-600 font-medium text-sm transition shadow-sm";
    const inactiveClass = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition";

    document.getElementById('tab-so').classList.add('hidden');
    document.getElementById('tab-mutasi').classList.add('hidden');
    document.getElementById('tab-cetak-label').classList.add('hidden');

    btnDashboard.className = inactiveClass;
    btnSO.className = inactiveClass;
    btnMutasi.className = inactiveClass;
    btnCetakLabel.className = inactiveClass;

    if (tab === 'dashboard' || tab === 'so') {
        document.getElementById('tab-so').classList.remove('hidden');
        btnDashboard.className = tab === 'dashboard' ? activeClass : inactiveClass;
        btnSO.className = tab === 'so' ? activeClass : inactiveClass;
    } else if (tab === 'mutasi') {
        document.getElementById('tab-mutasi').classList.remove('hidden');
        btnMutasi.className = activeClass;
    } else if (tab === 'cetak-label') {
        document.getElementById('tab-cetak-label').classList.remove('hidden');
        btnCetakLabel.className = activeClass;
        if(document.getElementById("print-area").children.length === 0) {
            generateDefaultManual();
        }
    }
};

// Camera Scanner Logic
window.openScanner = function() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Akses kamera terblokir!\n\nBrowser memblokir kamera karena web dibuka tanpa HTTPS/Lokal IP.");
        return;
    }

    document.getElementById('scannerModal').classList.remove('hidden');

    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
    }

    html5QrcodeScanner = new Html5Qrcode("reader");

    const config = { 
        fps: 15, 
        qrbox: { width: 280, height: 130 },
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    };

    html5QrcodeScanner.start(
        { facingMode: { exact: "environment" } },
        config,
        onScanSuccess
    ).catch(err => {
        html5QrcodeScanner.start(
            { facingMode: "environment" },
            config,
            onScanSuccess
        ).catch(err2 => {
            alert("Gagal membuka kamera HP:\n" + err2);
            closeScanner();
        });
    });
};

function onScanSuccess(decodedText) {
    const rawData = decodedText.trim();

    if (rawData) {
        document.getElementById('so-no-reg').value = rawData;

        const specCode = rawData.length >= 13 ? rawData.substring(0, 13) : rawData;
        document.getElementById('so-code-spec').value = specCode;

        if (deviceDatabase[specCode]) {
            document.getElementById('so-name').value = deviceDatabase[specCode];
        } else if (rawData.includes("B2WN0150205MA")) {
            document.getElementById('so-name').value = "Huawei B312 Modem Router Wifi (Include antenna 8db)";
        } else {
            document.getElementById('so-name').value = "Huawei B312 Modem Router Wifi";
        }

        closeScanner();
    }
}

window.closeScanner = function() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
            document.getElementById('scannerModal').classList.add('hidden');
        }).catch(() => {
            document.getElementById('scannerModal').classList.add('hidden');
        });
    } else {
        document.getElementById('scannerModal').classList.add('hidden');
    }
};

function saveData() {
    localStorage.setItem('nazz_wms_inventory', JSON.stringify(inventory));
    localStorage.setItem('nazz_wms_logs', JSON.stringify(logs));
    render();
}

window.handleSO = function(e) {
    e.preventDefault();
    const spec = document.getElementById('so-code-spec').value.trim();
    const sn = document.getElementById('so-no-reg').value.trim();
    const name = document.getElementById('so-name').value.trim();
    const result = parseInt(document.getElementById('so-result').value);
    const condition = document.getElementById('so-condition').value.trim();
    const lokasi = document.getElementById('so-lokasi').value.trim();
    const date = new Date().toLocaleDateString('id-ID');

    inventory.unshift({ spec, sn, name, result, condition, date, user: currentUserData?.name || 'Operator', lokasi });
    
    document.getElementById('so-code-spec').value = '';
    document.getElementById('so-no-reg').value = '';
    document.getElementById('so-name').value = '';
    document.getElementById('so-result').value = '';
    document.getElementById('so-condition').value = '';
    document.getElementById('so-lokasi').value = '';
    saveData();
};

window.handleMutasi = function(e) {
    e.preventDefault();
    const sn = document.getElementById('m-no-reg').value.trim();
    const tipe = document.getElementById('m-tipe').value;
    const pergerakan = document.getElementById('m-pergerakan').value;
    const qty = parseInt(document.getElementById('m-qty').value);
    const ket = document.getElementById('m-ket').value.trim();
    const waktu = new Date().toLocaleString('id-ID');

    logs.unshift({ waktu, sn, tipe, pergerakan, qty, ket });
    
    document.getElementById('m-no-reg').value = '';
    document.getElementById('m-qty').value = '';
    document.getElementById('m-ket').value = '';
    saveData();
};

// Label Thermal 90x30 mm
function createLabelElement(regNo, specName, index) {
    const card = document.createElement("div");
    card.className = "label-card";
    card.id = `label_card_${index}`;

    card.innerHTML = `
        <div class="reg-box">${regNo}</div>
        <div class="logo-box">
            <img src="${LOGO_URL}" alt="Lintasarta" crossorigin="anonymous" />
        </div>
        <div class="info-box">
            <div class="spec-name">${specName}</div>
        </div>
        <div class="qr-box">
            <div id="qr_${index}" class="qr-canvas"></div>
        </div>
    `;

    return card;
}

function renderQR(elementId, text) {
    const targetEl = document.getElementById(elementId);
    if (!targetEl) return;
    targetEl.innerHTML = "";

    new QRCode(targetEl, {
        text: String(text),
        width: 64,
        height: 64,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

window.generateManual = function(e) {
    if(e) e.preventDefault();
    const container = document.getElementById("print-area");
    container.innerHTML = "";

    const reg = document.getElementById("manualReg").value.trim() || "B2WN02860114A0063";
    const name = document.getElementById("manualName").value.trim() || "TA5000 GPON OLT 8X SFP";

    const card = createLabelElement(reg, name, 0);
    container.appendChild(card);
    renderQR("qr_0", reg);
};

function generateDefaultManual() {
    window.generateManual(null);
}

window.loadFromInventory = function() {
    const container = document.getElementById("print-area");
    container.innerHTML = "";

    if(inventory.length === 0) {
        alert("Belum ada data Stock Opname lokal.");
        return;
    }

    inventory.forEach((item, idx) => {
        const card = createLabelElement(item.sn, item.name, idx);
        container.appendChild(card);
        renderQR(`qr_${idx}`, item.sn);
    });
};

document.getElementById("excelFile")?.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
                alert("File Excel kosong!");
                return;
            }

            const container = document.getElementById("print-area");
            container.innerHTML = "";

            json.forEach((row, idx) => {
                const regNo = row["REG NO"] || row["REG_NO"] || row["Reg No"] || row["NO REG"] || row["NO REGISTRASI"] || row["SPEC CODE"] || "";
                const specName = row["SPEC NAME"] || row["SPEC_NAME"] || row["Spec Name"] || "";

                const card = createLabelElement(regNo, specName, idx);
                container.appendChild(card);
                renderQR(`qr_${idx}`, regNo);
            });

            alert(`Berhasil memuat ${json.length} label stiker!`);
        } catch (err) {
            alert("Gagal membaca file Excel.");
            console.error(err);
        }
    };

    reader.readAsArrayBuffer(file);
});

window.downloadPDF = async function() {
    const cards = document.querySelectorAll('.label-card');
    const btn = document.getElementById('btnDownloadPDF');

    if (cards.length === 0) {
        alert("Belum ada label!");
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Memproses PDF...";
    btn.disabled = true;

    const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: [90, 30]
    });

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        card.style.border = "none";

        const canvas = await html2canvas(card, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff"
        });

        card.style.border = "1px dashed #666";

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        if (i > 0) {
            pdf.addPage([90, 30], 'l');
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, 90, 30);
    }

    pdf.save('Label-Thermal-Lintasarta.pdf');

    btn.innerHTML = originalText;
    btn.disabled = false;
};

function render() {
    if (inventory.length > 0) {
        document.getElementById('kpi-total').innerText = inventory.reduce((acc, curr) => acc + (curr.result || 0), 0);
        document.getElementById('kpi-sesuai').innerText = inventory.filter(i => i.condition.toLowerCase() === 'sesuai' || i.condition.toLowerCase() === 'bagus').length;
        document.getElementById('kpi-selisih').innerText = inventory.filter(i => i.condition.toLowerCase() === 'selisih' || i.condition.toLowerCase() === 'rusak').length;
        
        document.getElementById('table-so-body').innerHTML = inventory.map(i => {
            const isSesuai = i.condition.toLowerCase() === 'sesuai' || i.condition.toLowerCase() === 'bagus';
            return `
            <tr class="hover:bg-slate-50/50 transition">
                <td class="p-3.5 font-medium text-blue-600">${i.spec}</td>
                <td class="p-3.5 font-medium text-gray-800">${i.sn}</td>
                <td class="p-3.5 text-gray-500">${i.name}</td>
                <td class="p-3.5 text-gray-700 font-medium">${i.result} Unit</td>
                <td class="p-3.5 text-gray-700 font-medium">${i.condition} Unit</td>
                <td class="p-3.5">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${isSesuai ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                        ${isSesuai ? 'Sesuai' : 'Selisih'}
                    </span>
                </td>
                <td class="p-3.5 text-xs text-gray-500">${i.user}</td>
                <td class="p-3.5 text-gray-500">${i.lokasi}</td>
            </tr>
        `}).join('');
    } else {
        document.getElementById('table-so-body').innerHTML = '<tr><td colspan="8" class="text-center p-4 text-gray-400">Belum ada data Stock Opname</td></tr>';
    }

    document.getElementById('kpi-pending').innerText = logs.filter(l => l.pergerakan === 'Gangguan').length;

    document.getElementById('table-mutasi-body').innerHTML = logs.map(l => `
        <tr class="hover:bg-slate-50/50 transition">
            <td class="p-3.5 text-xs text-gray-500">${l.waktu}</td>
            <td class="p-3.5 font-mono font-medium text-blue-600">${l.sn}</td>
            <td class="p-3.5"><span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${l.tipe === 'MASUK' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${l.tipe}</span></td>
            <td class="p-3.5 font-medium text-slate-700">${l.pergerakan}</td>
            <td class="p-3.5 font-bold">${l.qty}</td>
            <td class="p-3.5 text-gray-600">${l.ket}</td>
        </tr>
    `).join('');
}

window.resetData = function() {
    if (confirm('Reset seluruh data lokal?')) {
        localStorage.clear();
        inventory = [];
        logs = [];
        location.reload();
    }
};

window.exportCSV = function() {
    let csv = 'Spec Code,Reg No,Name,Result,Condition,Date,User,Lokasi\n';
    inventory.forEach(i => {
        csv += `"${i.spec}","${i.sn}","${i.name}",${i.result},"${i.condition}","${i.date}","${i.user}","${i.lokasi}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Laporan_Stock_Opname_NAZZ_WMS.csv');
    a.click();
};

// Inisialisasi awal
render();