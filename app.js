/**
 * Elan Boutique Management System - Robust Edition
 * Optimized for performance and stability
 */

// --- State Management ---
let sales = JSON.parse(localStorage.getItem('elan-boutique-sales')) || [];
let stock = JSON.parse(localStorage.getItem('elan-boutique-stock')) || [];
let categories = JSON.parse(localStorage.getItem('elan-boutique-categories')) || ["Camisetas", "Calças", "Vestidos", "Casacos", "Acessórios"];
let withdrawals = JSON.parse(localStorage.getItem('elan-boutique-withdrawals')) || [];

// Chart instances
let prodChartInstance = null;
let catChartInstance = null;

// --- Helper Functions ---
const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const safeGet = (id) => document.getElementById(id);

// --- Core Rendering Functions ---

function updateDashboard() {
    console.log("Updating dashboard...");
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.price * sale.qty), 0);
    const totalItems = sales.reduce((sum, sale) => sum + parseInt(sale.qty), 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0);
    const netCash = totalRevenue - totalWithdrawals;
    const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

    const els = {
        totalRevenue: safeGet('totalRevenue'),
        totalItems: safeGet('totalItems'),
        avgTicket: safeGet('avgTicket'),
        netCash: safeGet('netCash')
    };

    if (els.totalRevenue) els.totalRevenue.textContent = formatCurrency(totalRevenue);
    if (els.totalItems) els.totalItems.textContent = totalItems;
    if (els.avgTicket) els.avgTicket.textContent = formatCurrency(avgTicket);
    if (els.netCash) els.netCash.textContent = formatCurrency(netCash);

    renderTable();
    renderStock();
    renderReports();
    renderWithdrawals();
}

function renderTable(filter = 'all') {
    const tableBody = safeGet('salesBody');
    const fullSalesBody = safeGet('fullSalesBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (fullSalesBody) fullSalesBody.innerHTML = '';

    // Unified Ledger for Dashboard: Sales + Withdrawals
    const allTransactions = [
        ...sales.map((s, i) => ({ ...s, type: 'sale', originalIndex: i })),
        ...withdrawals.map((w, i) => ({ ...w, type: 'withdrawal', originalIndex: i, name: w.reason, price: w.amount, qty: 1, category: 'Retirada' }))
    ];

    // Local filter for sales
    const filtered = filter === 'all' 
        ? allTransactions 
        : allTransactions.filter(t => t.category === filter || t.type === 'withdrawal');

    filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

    filtered.forEach((trans) => {
        const row = document.createElement('tr');
        const isSale = trans.type === 'sale';
        const badgeClass = isSale ? `badge-${trans.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/g, "c")}` : 'badge-retirada';
        
        row.innerHTML = `
            <td>${new Date(trans.date).toLocaleDateString('pt-BR')}</td>
            <td style="font-weight: 500;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="${isSale ? 'arrow-up-right' : 'arrow-down-left'}" style="color: ${isSale ? 'var(--success)' : 'var(--danger)'}; width: 16px;"></i>
                    ${trans.name}
                </div>
            </td>
            <td><span class="badge ${badgeClass}">${isSale ? trans.category : 'Retirada'}</span></td>
            <td>${isSale ? trans.qty : '-'}</td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${isSale ? (trans.payment || 'N/A') : 'Saída de Caixa'}</td>
            <td style="font-weight: 700; color: ${isSale ? 'inherit' : 'var(--danger)'}">
                ${isSale ? '' : '- '}${formatCurrency(trans.price * trans.qty)}
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon delete-btn" onclick="${isSale ? `deleteSale(${trans.originalIndex})` : `deleteWithdrawal(${trans.originalIndex})`}">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);

        // Populate full history (only sales)
        if (fullSalesBody && isSale) {
            const fullRow = document.createElement('tr');
            fullRow.innerHTML = `
                <td>${new Date(trans.date).toLocaleDateString('pt-BR')}</td>
                <td>${trans.name}</td>
                <td><span class="badge ${badgeClass}">${trans.category}</span></td>
                <td>${trans.qty}</td>
                <td>${formatCurrency(trans.price * trans.qty)}</td>
                <td>${trans.payment || 'N/A'}</td>
                <td><span style="color: var(--success)">Concluída</span></td>
            `;
            fullSalesBody.appendChild(fullRow);
        }
    });

    if (window.lucide) lucide.createIcons();
}

function renderStock() {
    const stockBody = safeGet('stockBody');
    if (!stockBody) return;
    stockBody.innerHTML = '';

    let totalStockItems = 0;
    stock.forEach((item, index) => {
        totalStockItems += parseInt(item.qty);
        const row = document.createElement('tr');
        const badgeClass = `badge-${item.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/g, "c")}`;
        
        row.innerHTML = `
            <td style="font-weight: 500;">${item.name}</td>
            <td style="color: var(--text-muted);">${item.brand || '-'}</td>
            <td><span class="badge ${badgeClass}">${item.category}</span></td>
            <td>${item.qty} un</td>
            <td><span style="color: ${item.qty < 5 ? 'var(--danger)' : 'var(--success)'}">${item.qty < 5 ? 'Crítico' : 'Normal'}</span></td>
            <td style="font-weight: 600;">${formatCurrency(item.sellPrice)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon delete-btn" onclick="deleteStock(${index})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        stockBody.appendChild(row);
    });

    const totalEl = safeGet('stockTotalItems');
    if (totalEl) totalEl.textContent = totalStockItems;

    if (window.lucide) lucide.createIcons();
}

function renderWithdrawals() {
    const list = safeGet('withdrawalBody');
    if (!list) return;
    list.innerHTML = '';

    withdrawals.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach((w, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(w.date).toLocaleDateString('pt-BR')}</td>
            <td style="font-weight: 500;">${w.reason}</td>
            <td style="color: var(--danger); font-weight: 700;">- ${formatCurrency(w.amount)}</td>
            <td>
                <button class="btn-icon delete-btn" onclick="deleteWithdrawal(${index})">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
    });
    if (window.lucide) lucide.createIcons();
}

function renderReports() {
    if (typeof Chart === 'undefined') return;

    const prodCtx = safeGet('productsChart');
    const catCtx = safeGet('categoriesChart');
    if (!prodCtx || !catCtx) return;

    // Financial Summary
    const totalRev = sales.reduce((sum, s) => sum + (s.price * s.qty), 0);
    const totalWith = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0);
    const profit = totalRev - totalWith;

    if (safeGet('reportRevenue')) safeGet('reportRevenue').textContent = formatCurrency(totalRev);
    if (safeGet('reportWithdrawals')) safeGet('reportWithdrawals').textContent = formatCurrency(totalWith);
    if (safeGet('reportProfit')) safeGet('reportProfit').textContent = formatCurrency(profit);

    // --- DRE Table Logic ---
    if (safeGet('dreGrossRevenue')) safeGet('dreGrossRevenue').textContent = formatCurrency(totalRev);
    if (safeGet('dreSalesItems')) safeGet('dreSalesItems').textContent = formatCurrency(totalRev);
    if (safeGet('dreTotalWithdrawals')) safeGet('dreTotalWithdrawals').textContent = `- ${formatCurrency(totalWith)}`;
    if (safeGet('dreNetProfit')) safeGet('dreNetProfit').textContent = formatCurrency(profit);

    const dreDetails = safeGet('dreWithdrawalDetails');
    if (dreDetails) {
        const withByReason = {};
        withdrawals.forEach(w => withByReason[w.reason] = (withByReason[w.reason] || 0) + parseFloat(w.amount));
        const tableBody = dreDetails.parentElement;
        tableBody.querySelectorAll('.dre-dynamic').forEach(r => r.remove());
        Object.entries(withByReason).forEach(([reason, amount]) => {
            const tr = document.createElement('tr');
            tr.className = 'dre-dynamic';
            tr.innerHTML = `<td style="padding-left: 30px; color: var(--text-muted); font-size: 0.85rem;">${reason}</td><td style="text-align: right; color: var(--text-muted); font-size: 0.85rem;">- ${formatCurrency(amount)}</td>`;
            tableBody.insertBefore(tr, safeGet('dreNetProfit').parentElement);
        });
    }

    // Calculate Data for Charts
    const prodTotals = {};
    const catTotals = {};
    sales.forEach(s => {
        prodTotals[s.name] = (prodTotals[s.name] || 0) + s.qty;
        catTotals[s.category] = (catTotals[s.category] || 0) + (s.price * s.qty);
    });

    const topProds = Object.entries(prodTotals).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const topCats = Object.entries(catTotals).sort((a,b) => b[1] - a[1]);

    if (prodChartInstance) prodChartInstance.destroy();
    if (catChartInstance) catChartInstance.destroy();

    // Chart 1: Bar
    prodChartInstance = new Chart(prodCtx, {
        type: 'bar',
        data: {
            labels: topProds.map(p => p[0]),
            datasets: [{
                label: 'Unidades',
                data: topProds.map(p => p[1]),
                backgroundColor: '#D4AF37',
                borderRadius: 8
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Chart 2: Doughnut
    catChartInstance = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: topCats.map(c => c[0]),
            datasets: [{
                data: topCats.map(c => c[1]),
                backgroundColor: ['#D4AF37', '#E5B8B7', '#1C1C1C', '#F1DFA9', '#636E72'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });
}

function renderCategories() {
    const selects = document.querySelectorAll('.category-select');
    const filterSelect = safeGet('categoryFilter');
    const categoryList = safeGet('categoryList');
    
    let optionsHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    const extendedOptionsHTML = optionsHTML + `<option value="__ADD_NEW__" style="font-weight: bold; color: var(--primary);">+ Adicionar...</option>`;
    
    selects.forEach(select => {
        select.innerHTML = extendedOptionsHTML;
        if (!select.dataset.listener) {
            select.addEventListener('change', (e) => {
                if (e.target.value === '__ADD_NEW__') {
                    const modal = safeGet('categoryModal');
                    if (modal) modal.classList.add('active');
                    e.target.selectedIndex = 0;
                }
            });
            select.dataset.listener = "true";
        }
    });

    if (filterSelect) filterSelect.innerHTML = `<option value="all">Todas Categorias</option>` + optionsHTML;

    if (categoryList) {
        categoryList.innerHTML = '';
        categories.forEach((cat, index) => {
            const li = document.createElement('li');
            li.className = 'report-list-item';
            li.innerHTML = `<span>${cat}</span><button class="btn-icon delete-btn" onclick="deleteCategory(${index})"><i data-lucide="minus-circle"></i></button>`;
            categoryList.appendChild(li);
        });
        if (window.lucide) lucide.createIcons();
    }
}

// --- Persistence ---
function saveAndRefresh() {
    localStorage.setItem('elan-boutique-sales', JSON.stringify(sales));
    localStorage.setItem('elan-boutique-stock', JSON.stringify(stock));
    localStorage.setItem('elan-boutique-categories', JSON.stringify(categories));
    localStorage.setItem('elan-boutique-withdrawals', JSON.stringify(withdrawals));
    updateDashboard();
    renderCategories();
}

// --- Global Actions (window. scope for HTML compatibility) ---
window.deleteSale = (index) => confirm('Excluir venda?') && (sales.splice(index, 1), saveAndRefresh());
window.deleteStock = (index) => confirm('Remover do estoque?') && (stock.splice(index, 1), saveAndRefresh());
window.deleteWithdrawal = (index) => confirm('Remover retirada?') && (withdrawals.splice(index, 1), saveAndRefresh());
window.deleteCategory = (index) => confirm('Excluir categoria?') && (categories.splice(index, 1), saveAndRefresh());

// --- Initialization & Listeners ---

function init() {
    console.log("Initializing Elan Management...");

    // Set Current Date
    const dateEl = safeGet('currentDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('pt-BR', options);
        dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            localStorage.setItem('elan-last-tab', sectionId); // Memoriza a aba
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            contentSections.forEach(s => s.classList.remove('active'));
            const section = safeGet(`section-${sectionId}`);
            if (section) section.classList.add('active');

            const titles = {
                dashboard: ["Bem-vindo à Elan Boutique", "Controle suas vendas com sofisticação."],
                vendas: ["Gestão de Vendas", "Histórico completo e detalhado de transações."],
                estoque: ["Controle de Estoque", "Gerencie seu inventário."],
                relatorios: ["Relatórios", "Análise de performance."],
                retiradas: ["Retiradas", "Controle de sangria."]
            };

            const t = titles[sectionId] || titles.dashboard;
            if (safeGet('pageTitle')) safeGet('pageTitle').textContent = t[0];
            if (safeGet('pageDescription')) safeGet('pageDescription').textContent = t[1];

            // Buttons visibility
            const btnSale = safeGet('addSaleBtn');
            const btnStock = safeGet('addStockBtn');
            const btnWithdraw = safeGet('addWithdrawalBtn');

            if (btnSale) btnSale.style.display = (sectionId === 'dashboard' || sectionId === 'vendas') ? 'inline-flex' : 'none';
            if (btnStock) btnStock.style.display = (sectionId === 'estoque') ? 'inline-flex' : 'none';
            if (btnWithdraw) btnWithdraw.style.display = (sectionId === 'dashboard' || sectionId === 'retiradas') ? 'inline-flex' : 'none';
        });
    });

    // Modals
    const modals = {
        sale: safeGet('saleModal'),
        stock: safeGet('stockModal'),
        category: safeGet('categoryModal'),
        withdraw: safeGet('withdrawalModal')
    };

    safeGet('addSaleBtn')?.addEventListener('click', () => {
        modals.sale?.classList.add('active');
        if (safeGet('saleDate')) safeGet('saleDate').value = new Date().toISOString().split('T')[0];
    });

    safeGet('addStockBtn')?.addEventListener('click', () => modals.stock?.classList.add('active'));
    safeGet('addWithdrawalBtn')?.addEventListener('click', () => {
        modals.withdraw?.classList.add('active');
        if (safeGet('withdrawalDate')) safeGet('withdrawalDate').value = new Date().toISOString().split('T')[0];
    });

    safeGet('manageCategoriesBtn')?.addEventListener('click', () => modals.category?.classList.add('active'));

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => Object.values(modals).forEach(m => m?.classList.remove('active')));
    });

    // Forms
    safeGet('submitSaleBtn')?.addEventListener('click', () => {
        const data = {
            name: safeGet('productName')?.value,
            category: safeGet('productCategory')?.value,
            date: safeGet('saleDate')?.value,
            price: parseFloat(safeGet('productPrice')?.value),
            qty: parseInt(safeGet('productQty')?.value),
            payment: safeGet('productPayment')?.value
        };

        if (!data.name || !data.date || isNaN(data.price)) return alert('Preencha os campos corretamente.');

        if (data.payment === "Dinheiro") {
            const received = parseFloat(safeGet('amountReceived')?.value) || 0;
            const total = data.price * data.qty;
            if (received > total) data.payment += ` (Troco: ${formatCurrency(received - total)})`;
        }

        sales.push(data);
        saveAndRefresh();
        modals.sale?.classList.remove('active');
    });

    safeGet('submitStockBtn')?.addEventListener('click', () => {
        const item = {
            name: safeGet('stockName')?.value,
            category: safeGet('stockCategory')?.value,
            brand: safeGet('stockBrand')?.value,
            qty: parseInt(safeGet('stockQty')?.value),
            sellPrice: parseFloat(safeGet('stockTarget')?.value)
        };
        if (!item.name || isNaN(item.qty)) return alert("Dados inválidos.");
        stock.push(item);
        saveAndRefresh();
        modals.stock?.classList.remove('active');
    });

    safeGet('submitWithdrawalBtn')?.addEventListener('click', () => {
        const w = {
            reason: safeGet('withdrawalReason')?.value,
            date: safeGet('withdrawalDate')?.value,
            amount: parseFloat(safeGet('withdrawalAmount')?.value)
        };
        if (!w.reason || isNaN(w.amount)) return alert("Dados inválidos.");
        withdrawals.push(w);
        saveAndRefresh();
        modals.withdraw?.classList.remove('active');
    });

    safeGet('submitCategoryBtn')?.addEventListener('click', () => {
        const n = safeGet('newCategoryName')?.value.trim();
        if (n && !categories.includes(n)) {
            categories.push(n);
            saveAndRefresh();
            safeGet('newCategoryName').value = '';
        }
    });

    // Dinheiro / Troco Logic
    safeGet('productPayment')?.addEventListener('change', (e) => {
        const sec = safeGet('changeSection');
        if (sec) sec.style.display = e.target.value === 'Dinheiro' ? 'block' : 'none';
    });

    safeGet('amountReceived')?.addEventListener('input', () => {
        const p = parseFloat(safeGet('productPrice')?.value) || 0;
        const q = parseInt(safeGet('productQty')?.value) || 0;
        const r = parseFloat(safeGet('amountReceived')?.value) || 0;
        const disp = safeGet('changeValueDisplay');
        if (disp) disp.textContent = (r > (p*q)) ? formatCurrency(r - (p*q)) : 'R$ 0,00';
    });

    // Search
    safeGet('globalSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#salesBody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    safeGet('categoryFilter')?.addEventListener('change', (e) => renderTable(e.target.value));

    // Initial Render
    updateDashboard();
    renderCategories();

    // Restaurar a última aba aberta
    const lastTab = localStorage.getItem('elan-last-tab');
    if (lastTab) {
        const target = document.querySelector(`.nav-item[data-section="${lastTab}"]`);
        if (target) target.click();
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
