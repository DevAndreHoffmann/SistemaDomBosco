// Financial reporting module
import { db, saveDb } from './database.js';
import { getCurrentUser } from './auth.js';
import { showNotification } from './ui.js';
import { serviceNames } from './schedule.js'; // Import serviceNames for detailed reports

export function renderFinancialReport(selectedPeriod = 'current-month') {
    const currentUser = getCurrentUser();
    if (currentUser.role !== 'coordinator') return;
    
    let startDate = null;
    let endDate = new Date(); // Default end date to today
    
    // Calculate start and end dates based on selectedPeriod
    switch (selectedPeriod) {
        case 'current-month':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0); // Last day of current month
            break;
        case 'last-3-months':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 2, 1); // Start 3 months ago (current month + 2 previous)
            endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
            break;
        case 'last-6-months':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1); // Start 6 months ago
            endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
            break;
        case 'current-year':
            startDate = new Date(endDate.getFullYear(), 0, 1); // January 1st of current year
            endDate = new Date(endDate.getFullYear(), 11, 31); // December 31st of current year
            break;
        case 'all':
        default:
            // No specific date range, all periods
            startDate = null;
            endDate = null; // No upper bound if all periods selected
            break;
    }

    let totalRevenueInPeriod = 0;
    let totalAppointmentsInPeriod = 0;
    let totalStockPurchases = 0; // Entrada de estoque
    let totalStockEntriesCount = 0; // Count of stock entry movements
    let totalMaterialsCost = 0; // Saída de estoque
    let totalStockExitsCount = 0; // Count of stock exit movements
    let totalDailyNotesRevenueCount = 0;
    let totalDailyNotesExpensesCount = 0;
    let totalDailyNotesObservationCount = 0;

    let totalSchedulesInPeriod = 0;
    
    // Calculate appointments and revenue
    db.clients.forEach(client => {
        if (client.appointments) {
            client.appointments.forEach(appointment => {
                const appointmentDate = new Date(appointment.date);
                if ((!startDate || appointmentDate >= startDate) && (!endDate || appointmentDate <= endDate)) {
                    totalAppointmentsInPeriod++;
                    totalRevenueInPeriod += appointment.value || 0;
                }
            });
        }
    });

    // Calculate stock movements with better categorization
    db.stockMovements.forEach(movement => {
        const movementDate = new Date(movement.date);
        if ((!startDate || movementDate >= startDate) && (!endDate || movementDate <= endDate)) {
            const movementValue = (movement.quantity || 0) * (movement.itemUnitValue || 0);
            if (movement.type === 'entrada') {
                totalStockPurchases += movementValue; // Money spent purchasing materials
                totalStockEntriesCount++;
            } else if (movement.type === 'saida') {
                totalMaterialsCost += movementValue; // Cost of materials used in services
                totalStockExitsCount++;
            }
        }
    });

    // Calculate daily notes financial impact and counts
    let additionalRevenueFromNotes = 0;
    let additionalExpensesFromNotes = 0;
    db.dailyNotes.forEach(note => {
        const noteDate = new Date(note.date);
        if ((!startDate || noteDate >= startDate) && (!endDate || noteDate <= endDate)) {
            if (note.type === 'receita' && note.value) {
                additionalRevenueFromNotes += note.value;
                totalDailyNotesRevenueCount++;
            } else if (note.type === 'despesa' && note.value) {
                additionalExpensesFromNotes += note.value;
                totalDailyNotesExpensesCount++;
            } else if (note.type === 'observacao') {
                totalDailyNotesObservationCount++;
            }
        }
    });

    // Sum all revenues and expenses
    const totalRevenue = totalRevenueInPeriod + additionalRevenueFromNotes;
    const totalExpenses = totalStockPurchases + totalMaterialsCost + additionalExpensesFromNotes;
    const netResult = totalRevenue - totalExpenses;
    
    // Calculate schedules for the period
    db.schedules.forEach(schedule => {
        const scheduleDate = new Date(schedule.date);
        if ((!startDate || scheduleDate >= startDate) && (!endDate || scheduleDate <= endDate)) {
            totalSchedulesInPeriod++;
        }
    });

    // Update summary cards with clearer terminology
    document.getElementById('monthly-revenue').textContent = `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`;
    document.getElementById('monthly-appointments').textContent = totalAppointmentsInPeriod;
    document.getElementById('stock-entries-value').textContent = `R$ ${totalStockPurchases.toFixed(2).replace('.', ',')}`;
    document.getElementById('stock-exits-value').textContent = `R$ ${totalMaterialsCost.toFixed(2).replace('.', ',')}`;
    document.getElementById('net-result').textContent = `R$ ${netResult.toFixed(2).replace('.', ',')}`;
    document.getElementById('active-clients').textContent = db.clients.length;
    document.getElementById('total-schedules').textContent = totalSchedulesInPeriod;
    
    // Update period display
    const periodNames = {
        'all': 'Todos os períodos',
        'current-month': 'Mês atual',
        'last-3-months': 'Últimos 3 meses',
        'last-6-months': 'Últimos 6 meses',
        'current-year': 'Ano atual'
    };
    
    const periodDisplayElement = document.getElementById('financial-period-display');
    if (periodDisplayElement) {
        periodDisplayElement.textContent = periodNames[selectedPeriod] || 'Todos os períodos';
    }

    // Color the net result based on positive/negative
    const netResultElement = document.getElementById('net-result');
    if (netResultElement) { // Ensure element exists before manipulating style
        if (netResult >= 0) {
            netResultElement.style.color = '#10b981'; // Green for positive
        } else {
            netResultElement.style.color = '#ef4444'; // Red for negative
        }
    }
    
    // Render financial details (this part could be made more sophisticated, showing breakdown per day/client)
    // For now, it shows total per client.
    renderFinancialDetails(startDate, endDate);
}

// Helper function for financial report client details
function renderFinancialDetails(startDate, endDate) {
    const financialList = document.getElementById('financial-list');
    financialList.innerHTML = '';
    
    if (db.clients.length === 0) {
        financialList.innerHTML = '<p>Nenhum cliente cadastrado.</p>';
        return;
    }

    let clientsWithActivityInPeriod = false;

    db.clients.forEach(client => {
        let clientAppointmentsValue = 0;
        let clientAppointmentsCount = 0;
        
        // Filter appointments for the selected month/year
        (client.appointments || []).forEach(app => {
            const appDate = new Date(app.date);
            if ((!startDate || appDate >= startDate) && (!endDate || appDate <= endDate)) {
                clientAppointmentsValue += (app.value || 0);
                clientAppointmentsCount++;
            }
        });

        if (clientAppointmentsCount > 0) { // Only show clients with activity in the selected month
            clientsWithActivityInPeriod = true;
            const card = document.createElement('div');
            card.className = 'financial-card';
            card.innerHTML = `
                <div class="card-header">
                    <h4>${client.name} (ID: ${client.id})</h4>
                </div>
                <div class="financial-metrics">
                    <div class="metric-item">
                        <i class="fa-solid fa-money-bill-wave"></i>
                        <span>Gasto no Período</span>
                        <strong>R$ ${clientAppointmentsValue.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div class="metric-item">
                        <i class="fa-solid fa-calendar-check"></i>
                        <span>Atendimentos no Período</span>
                        <strong>${clientAppointmentsCount}</strong>
                    </div>
                </div>
            `;
            financialList.appendChild(card);
        }
    });

    if (!clientsWithActivityInPeriod) {
        financialList.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhum detalhe financeiro de clientes para o período selecionado.</p>';
    }
}

export function renderDailyNotes(selectedPeriod = 'current-month') {
    const dailyNotesList = document.getElementById('daily-notes-list');
    if (!dailyNotesList) return;
    
    dailyNotesList.innerHTML = '';
    
    let startDate = null;
    let endDate = new Date(); // Default end date to today

    // Calculate start and end dates based on selectedPeriod
    switch (selectedPeriod) {
        case 'current-month':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0); // Last day of current month
            break;
        case 'last-3-months':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 2, 1);
            endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
            break;
        case 'last-6-months':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
            endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
            break;
        case 'current-year':
            startDate = new Date(endDate.getFullYear(), 0, 1);
            endDate = new Date(endDate.getFullYear(), 11, 31);
            break;
        case 'all':
        default:
            startDate = null;
            endDate = null;
            break;
    }
    
    let filteredNotes = db.dailyNotes.filter(note => {
        const noteDate = new Date(note.date);
        return (!startDate || noteDate >= startDate) && (!endDate || noteDate <= endDate);
    });
    
    if (filteredNotes.length === 0) {
        dailyNotesList.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhuma nota para o período selecionado.</p>';
        return;
    }
    
    // Sort notes by date (newest first)
    const sortedNotes = [...filteredNotes].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedNotes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = `daily-note-card ${note.type}`;
        
        const typeIcon = {
            'receita': '💰',
            'despesa': '💸',
            'observacao': '📝'
        };
        
        const typeLabel = {
            'receita': 'Receita',
            'despesa': 'Despesa',
            'observacao': 'Observação'
        };
        
        noteCard.innerHTML = `
            <div class="note-header">
                <div class="note-title">
                    <span class="note-icon">${typeIcon[note.type]}</span>
                    <h4>${note.title}</h4>
                </div>
                <div class="note-meta">
                    <span class="note-date">${new Date(note.date).toLocaleDateString('pt-BR')}</span>
                    <span class="note-type-badge ${note.type}">${typeLabel[note.type]}</span>
                    ${note.value !== null ? `<span class="note-value">R$ ${note.value.toFixed(2).replace('.', ',')}</span>` : ''}
                </div>
            </div>
            <div class="note-content">
                ${note.content}
            </div>
            ${note.fileName && note.fileData ? `
                <div class="note-attachment">
                    <a href="${note.fileData}" download="${note.fileName}" class="btn-download">
                        <i class="fa-solid fa-download"></i> ${note.fileName}
                    </a>
                </div>
            ` : ''}
            <div class="note-footer">
                <small>Por ${note.createdBy} em ${new Date(note.createdAt).toLocaleDateString('pt-BR')} às ${new Date(note.createdAt).toLocaleTimeString('pt-BR')}</small>
                <button class="btn-delete-note" onclick="deleteDailyNote(${note.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        
        dailyNotesList.appendChild(noteCard);
    });
}

export function addDailyNote() {
    const date = document.getElementById('daily-note-date').value;
    const title = document.getElementById('daily-note-title').value.trim();
    const type = document.getElementById('daily-note-type').value;
    const valueInput = document.getElementById('daily-note-value').value;
    const value = valueInput ? parseFloat(valueInput) : null; // Handle optional value
    const content = document.getElementById('daily-note-content').value.trim();
    const fileInput = document.getElementById('daily-note-file');
    
    if (!date || !title || !type || !content) {
        showNotification('Por favor, preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    if (value !== null && isNaN(value)) {
        showNotification('O valor deve ser um número válido.', 'warning');
        return;
    }
    
    if (!db.dailyNotes) {
        db.dailyNotes = [];
    }
    
    const newNote = {
        id: db.nextDailyNoteId,
        date: date,
        title: title,
        type: type,
        value: value,
        content: content,
        createdAt: new Date().toISOString(),
        createdBy: getCurrentUser().name
    };

    if (fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('O arquivo deve ter no máximo 5MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            newNote.fileName = file.name;
            newNote.fileData = e.target.result;
            
            db.dailyNotes.push(newNote);
            saveDb();
            
            document.getElementById('form-add-daily-note').reset();
            document.getElementById('modal-add-daily-note').style.display = 'none';
            
            const selectedPeriod = document.getElementById('financial-period-selector').value;
            renderDailyNotes(selectedPeriod);
            renderFinancialReport(selectedPeriod);
            
            showNotification('Nota diária adicionada com sucesso!', 'success');
        };

        reader.onerror = function() {
            showNotification('Erro ao processar o arquivo. Tente novamente.', 'error');
        };

        reader.readAsDataURL(file);
    } else {
        db.dailyNotes.push(newNote);
        saveDb();
        
        document.getElementById('form-add-daily-note').reset();
        document.getElementById('modal-add-daily-note').style.display = 'none';
        
        const selectedPeriod = document.getElementById('financial-period-selector').value;
        renderDailyNotes(selectedPeriod);
        renderFinancialReport(selectedPeriod);
        
        showNotification('Nota diária adicionada com sucesso!', 'success');
    }
}

export function deleteDailyNote(noteId) {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
    
    db.dailyNotes = db.dailyNotes.filter(note => note.id !== noteId);
    saveDb();
    
    const selectedPeriod = document.getElementById('financial-period-selector').value;
    renderDailyNotes(selectedPeriod);
    renderFinancialReport(selectedPeriod);
    
    showNotification('Nota excluída com sucesso!', 'success');
}

export function generateDetailedFinancialReport(selectedPeriod) {
    const reportContent = document.getElementById('monthly-report-content');
    if (!reportContent) return;
    
    let startDate = null;
    let endDate = new Date();
    let reportTitle = '';

    const today = new Date();
    const currentYear = today.getFullYear();
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    switch (selectedPeriod) {
        case 'current-month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            reportTitle = `Relatório Financeiro Mensal - ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
            break;
        case 'last-3-months':
            startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            reportTitle = `Relatório Financeiro - Últimos 3 Meses`;
            break;
        case 'last-6-months':
            startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            reportTitle = `Relatório Financeiro - Últimos 6 Meses`;
            break;
        case 'current-year':
            startDate = new Date(currentYear, 0, 1);
            endDate = new Date(currentYear, 11, 31);
            reportTitle = `Relatório Financeiro Anual - ${currentYear}`;
            break;
        case 'all':
        default:
            startDate = null;
            endDate = null;
            reportTitle = `Relatório Financeiro Geral`;
            break;
    }
    
    // Calculate financial data for the period
    let monthlyRevenueFromAppointments = 0;
    let monthlyAppointmentsCount = 0;
    let totalStockPurchases = 0; // Entrada de estoque
    let totalStockEntriesCount = 0;
    let totalMaterialsCost = 0; // Saída de estoque
    let totalStockExitsCount = 0;
    
    const periodAppointments = [];
    const periodStockMovements = [];

    // Collect appointments and revenue
    db.clients.forEach(client => {
        if (client.appointments) {
            client.appointments.forEach(appointment => {
                const appointmentDate = new Date(appointment.date);
                if ((!startDate || appointmentDate >= startDate) && (!endDate || appointmentDate <= endDate)) {
                    monthlyAppointmentsCount++;
                    monthlyRevenueFromAppointments += appointment.value || 0;
                    periodAppointments.push({ ...appointment, clientName: client.name });
                }
            });
        }
    });
    periodAppointments.sort((a,b) => new Date(a.date) - new Date(b.date)); // Sort by date for display
    
    // Collect stock movements
    db.stockMovements.forEach(movement => {
        const movementDate = new Date(movement.date);
        if ((!startDate || movementDate >= startDate) && (!endDate || movementDate <= endDate)) {
            const movementValue = (movement.quantity || 0) * (movement.itemUnitValue || 0);
            if (movement.type === 'entrada') {
                totalStockPurchases += movementValue;
                totalStockEntriesCount++;
            } else if (movement.type === 'saida') {
                totalMaterialsCost += movementValue;
                totalStockExitsCount++;
            }
            periodStockMovements.push(movement);
        }
    });
    periodStockMovements.sort((a,b) => new Date(a.date) - new Date(b.date)); // Sort by date for display
    
    // Get daily notes for the month
    const relevantNotes = db.dailyNotes ? db.dailyNotes.filter(note => {
        const noteDate = new Date(note.date);
        return (!startDate || noteDate >= startDate) && (!endDate || noteDate <= endDate);
    }).sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
    
    // Calculate additional revenue/expenses from daily notes and their counts
    let additionalRevenueFromNotes = 0;
    let additionalExpensesFromNotes = 0;
    let totalDailyNotesRevenueCount = 0;
    let totalDailyNotesExpensesCount = 0;
    let totalDailyNotesObservationCount = 0;

    relevantNotes.forEach(note => {
        if (note.value !== null) {
            if (note.type === 'receita') {
                additionalRevenueFromNotes += note.value;
                totalDailyNotesRevenueCount++;
            } else if (note.type === 'despesa') {
                additionalExpensesFromNotes += note.value;
                totalDailyNotesExpensesCount++;
            }
        } else if (note.type === 'observacao') {
            totalDailyNotesObservationCount++;
        }
    });
    
    const totalRevenue = monthlyRevenueFromAppointments + additionalRevenueFromNotes;
    const totalExpenses = totalStockPurchases + totalMaterialsCost + additionalExpensesFromNotes;
    const netResult = totalRevenue - totalExpenses;
    
    reportContent.innerHTML = `
        <div class="report-summary">
            <h3>${reportTitle}</h3>
            <div class="report-summary-grid">
                <div class="report-summary-item revenue">
                    <h4>💰 Receitas Totais</h4>
                    <div class="summary-value">R$ ${totalRevenue.toFixed(2).replace('.', ',')}</div>
                    <div class="summary-breakdown">
                        <p>Atendimentos: R$ ${monthlyRevenueFromAppointments.toFixed(2).replace('.', ',')} (${monthlyAppointmentsCount} atend.)</p>
                        <p>Outras receitas (Notas Diárias): R$ ${additionalRevenueFromNotes.toFixed(2).replace('.', ',')} (${totalDailyNotesRevenueCount} notas)</p>
                    </div>
                </div>
                <div class="report-summary-item expenses">
                    <h4>💸 Despesas Totais</h4>
                    <div class="summary-value">R$ ${totalExpenses.toFixed(2).replace('.', ',')}</div>
                    <div class="summary-breakdown">
                        <p>Compra de materiais (Entrada Estoque): R$ ${totalStockPurchases.toFixed(2).replace('.', ',')} (${totalStockEntriesCount} mov.)</p>
                        <p>Materiais utilizados (Saída Estoque): R$ ${totalMaterialsCost.toFixed(2).replace('.', ',')} (${totalStockExitsCount} mov.)</p>
                        <p>Outras despesas (Notas Diárias): R$ ${additionalExpensesFromNotes.toFixed(2).replace('.', ',')} (${totalDailyNotesExpensesCount} notas)</p>
                    </div>
                </div>
                <div class="report-summary-item result ${netResult >= 0 ? 'positive' : 'negative'}">
                    <h4>📊 Resultado Líquido</h4>
                    <div class="summary-value">R$ ${netResult.toFixed(2).replace('.', ',')}</div>
                    <div class="summary-breakdown">
                        <p>${netResult >= 0 ? 'Lucro' : 'Prejuízo'} no período</p>
                        <p>Total de atendimentos: ${monthlyAppointmentsCount}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-section report-appointments-section">
            <h3>🗓️ Atendimentos Detalhados</h3>
            ${periodAppointments.length > 0 ? `
                <div class="report-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Cliente</th>
                                <th>Serviço</th>
                                <th>Valor (R$)</th>
                                <th>Profissional</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${periodAppointments.map(app => `
                                <tr>
                                    <td>${new Date(app.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                    <td>${app.clientName}</td>
                                    <td>${serviceNames[app.serviceType] || app.serviceType}</td>
                                    <td>R$ ${app.value ? app.value.toFixed(2).replace('.', ',') : '0,00'}</td>
                                    <td>${app.attendedBy || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `<p>Nenhum atendimento registrado para este período.</p>`}
        </div>

        <div class="report-section report-stock-movements-section">
            <h3>📦 Movimentações de Estoque Detalhadas</h3>
            ${periodStockMovements.length > 0 ? `
                <div class="report-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Item</th>
                                <th>Tipo</th>
                                <th>Quantidade</th>
                                <th>Valor Unit. (R$)</th>
                                <th>Valor Total (R$)</th>
                                <th>Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${periodStockMovements.map(mov => `
                                <tr>
                                    <td>${new Date(mov.date).toLocaleDateString('pt-BR')}</td>
                                    <td>${mov.itemName || 'Item Excluído'}</td>
                                    <td><span class="movement-type-badge ${mov.type}">${mov.type === 'entrada' ? 'Entrada' : mov.type === 'saida' ? 'Saída' : 'Exclusão'}</span></td>
                                    <td>${mov.quantity}</td>
                                    <td>R$ ${mov.itemUnitValue ? mov.itemUnitValue.toFixed(2).replace('.', ',') : '0,00'}</td>
                                    <td>R$ ${(mov.quantity * (mov.itemUnitValue || 0)).toFixed(2).replace('.', ',')}</td>
                                    <td>${mov.reason}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `<p>Nenhuma movimentação de estoque registrada para este período.</p>`}
        </div>

        ${relevantNotes.length > 0 ? `
            <div class="report-notes-section">
                <h3>📝 Notas do Período</h3>
                <div class="report-notes-list">
                    ${relevantNotes.map(note => {
                        const typeIcon = { 'receita': '💰', 'despesa': '💸', 'observacao': '📝' };
                        const typeLabel = { 'receita': 'Receita', 'despesa': 'Despesa', 'observacao': 'Observação' };
                        return `
                            <div class="report-note-item ${note.type}">
                                <div class="note-date-title">
                                    <span class="note-date">${new Date(note.date).toLocaleDateString('pt-BR')}</span>
                                    <span class="note-icon">${typeIcon[note.type]}</span>
                                    <span class="note-title">${note.title}</span>
                                </div>
                                ${note.value !== null ? `<div class="note-value">R$ ${note.value.toFixed(2).replace('.', ',')}</div>` : ''}
                                <div class="note-content">${note.content}</div>
                                ${note.fileName && note.fileData ? `<div class="note-attachment-link"><a href="${note.fileData}" download="${note.fileName}"><i class="fa-solid fa-download"></i> ${note.fileName}</a></div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="report-footer">
            <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} por ${getCurrentUser().name}</p>
        </div>
    `;
}

// Make functions globally available
window.deleteDailyNote = deleteDailyNote;