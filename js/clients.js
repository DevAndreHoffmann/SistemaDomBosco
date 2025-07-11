// Client management module
import { db, saveDb } from './database.js';
import { getCurrentUser } from './auth.js';
import { showNotification } from './ui.js';
import { formatDuration } from './utils.js'; // Import the new utility function

export function renderClientList(filter = '', activityFilter = 'all', internFilter = 'all') {
    const clientListContainer = document.getElementById('client-list-container');
    clientListContainer.innerHTML = '';
    const lowerCaseFilter = filter.toLowerCase();

    let filteredClients = db.clients.filter(client => 
        client.name.toLowerCase().includes(lowerCaseFilter) ||
        (client.cpf && client.cpf.includes(filter)) ||
        client.id.toString().includes(filter)
    );

    // Apply activity filter
    if (activityFilter === 'active') {
        filteredClients = filteredClients.filter(client => 
            client.appointments && client.appointments.length > 0
        );
    } else if (activityFilter === 'inactive') {
        filteredClients = filteredClients.filter(client => 
            !client.appointments || client.appointments.length === 0
        );
    }

    // Apply intern filter based on `assignedInternId`
    if (internFilter === 'linked') {
        filteredClients = filteredClients.filter(client => 
            client.assignedInternId !== null && client.assignedInternId !== undefined
        );
    } else if (internFilter === 'unlinked') {
        filteredClients = filteredClients.filter(client => 
            client.assignedInternId === null || client.assignedInternId === undefined
        );
    }

    if (filteredClients.length === 0) {
        let message = 'Nenhum cliente corresponde à busca.';
        if (filter === '' && activityFilter === 'all' && internFilter === 'all') {
             message = 'Nenhum cliente cadastrado ainda.';
        } else if (filter === '' && activityFilter === 'active') {
            message = 'Nenhum cliente ativo encontrado.';
        } else if (filter === '' && activityFilter === 'inactive') {
            message = 'Nenhum cliente inativo encontrado.';
        } else if (filter === '' && internFilter === 'linked') {
            message = 'Nenhum cliente vinculado a estagiários encontrado.';
        } else if (filter === '' && internFilter === 'unlinked') {
            message = 'Nenhum cliente não vinculado encontrado.';
        }
        clientListContainer.innerHTML = `<p>${message}</p>`;
        return;
    }

    filteredClients.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.dataset.clientId = client.id;
        
        const clientType = client.type === 'adult' ? 'Adulto' : 'Menor';
        const contactInfo = client.type === 'adult' ? 
            (client.email || 'Sem email') : 
            `Escola: ${client.escola || 'Não informada'}`;
        const idInfo = client.type === 'adult' ? 
            (client.cpf || 'Sem CPF') : 
            `${client.anoEscolar || 'Ano não informado'}`;

        let internInfo = '';
        if (client.assignedInternId && client.assignedInternName) {
            internInfo = `<p><strong>Estagiário:</strong> ${client.assignedInternName}</p>`;
        } else {
            internInfo = `<p><strong>Estagiário:</strong> <span style="color: var(--danger-color); font-weight: 600;">Não vinculado</span></p>`;
        }
            
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h3>${client.name} <span style="font-size: 0.8em; color: var(--secondary-color);">(${clientType})</span></h3>
                <span style="background: var(--primary-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">ID: ${client.id}</span>
            </div>
            <p>${contactInfo}</p>
            <p>${idInfo}</p>
            ${internInfo}
        `;
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) return;
            showClientDetails(client.id);
        });

        clientListContainer.appendChild(card);
    });
}

export function showClientDetails(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;

    window.currentClientId = clientId;
    
    document.getElementById('modal-nome-cliente').innerHTML = `
        ${client.name} 
        <span style="background: var(--primary-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; margin-left: 10px;">ID: ${client.id}</span>
    `;
    
    if (client.type === 'adult') {
        document.getElementById('modal-email-cliente').textContent = client.email || 'N/A';
        document.getElementById('modal-telefone-cliente').textContent = client.phone || 'N/A';
        document.getElementById('modal-cpf-cliente').textContent = client.cpf || 'N/A';
        document.getElementById('modal-responsavel-cliente').textContent = client.contatoEmergencia || 'N/A';
    } else {
        document.getElementById('modal-email-cliente').textContent = 'N/A (Menor de idade)';
        document.getElementById('modal-telefone-cliente').textContent = `Pais: ${client.telefonePai || 'N/A'} / ${client.telefoneMae || 'N/A'}`;
        document.getElementById('modal-cpf-cliente').textContent = 'N/A (Menor de idade)';
        document.getElementById('modal-responsavel-cliente').textContent = `${client.nomePai || ''} / ${client.nomeMae || ''}`;
    }
    
    document.getElementById('modal-data-nascimento').textContent = client.birthDate ? new Date(client.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';
    document.getElementById('modal-cep-cliente').textContent = client.cep || 'N/A';
    document.getElementById('modal-logradouro-cliente').textContent = client.address || 'N/A';
    document.getElementById('modal-numero-cliente').textContent = client.number || 'S/N';
    document.getElementById('modal-bairro-cliente').textContent = client.neighborhood || '';
    document.getElementById('modal-cidade-estado-cliente').textContent = `${client.city || ''} / ${client.state || ''}`;
    document.getElementById('modal-observacoes-cliente').textContent = client.observations || 'Nenhuma observação.';
    
    // NEW: Display clinical information if available
    const clinicalInfoSection = document.querySelector('.modal-obs');
    if (client.diagnosticoPrincipal || client.historicoMedico || client.queixaNeuropsicologica || client.expectativasTratamento) {
        let clinicalInfo = '';
        if (client.diagnosticoPrincipal) clinicalInfo += `<strong>Diagnóstico Principal:</strong> ${client.diagnosticoPrincipal}\n\n`;
        if (client.historicoMedico) clinicalInfo += `<strong>Histórico Médico:</strong> ${client.historicoMedico}\n\n`;
        if (client.queixaNeuropsicologica) clinicalInfo += `<strong>Queixa Neuropsicológica:</strong> ${client.queixaNeuropsicologica}\n\n`;
        if (client.expectativasTratamento) clinicalInfo += `<strong>Expectativas do Tratamento:</strong> ${client.expectativasTratamento}`;
        
        if (clinicalInfo) {
            const existingObs = client.observations || 'Nenhuma observação.';
            document.getElementById('modal-observacoes-cliente').innerHTML = `
                ${existingObs}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                    <h4 style="color: var(--primary-color); margin-bottom: 10px;">Informações Clínicas</h4>
                    <div style="white-space: pre-line; line-height: 1.6;">${clinicalInfo}</div>
                </div>
            `;
        }
    }
    
    // NEW: Display assigned intern information
    const assignedInternNameElement = document.getElementById('modal-assigned-intern-name');
    const assignedInternContactElement = document.getElementById('modal-assigned-intern-contact');
    if (client.assignedInternId && client.assignedInternName) {
        assignedInternNameElement.textContent = client.assignedInternName;
        const intern = db.users.find(u => u.id === client.assignedInternId);
        if (intern) {
            assignedInternContactElement.textContent = `${intern.email || ''} ${intern.phone ? `(${intern.phone})` : ''}`;
        } else {
            assignedInternContactElement.textContent = 'Informações de contato não disponíveis.';
        }
    } else {
        assignedInternNameElement.textContent = 'Nenhum estagiário vinculado.';
        assignedInternContactElement.textContent = '';
    }

    renderAppointmentHistory(client.appointments);
    renderClientNotes(client.notes || []);
    renderClientDocuments(client.documents || []);

    document.getElementById('modal-detalhes-cliente').style.display = 'flex';

    // Disable/enable "Vincular Estagiário" button based on user role
    const assignButton = document.getElementById('btn-assign-intern-to-client');
    const currentUser = getCurrentUser();
    if (assignButton) {
        if (currentUser.role === 'coordinator' || currentUser.role === 'staff') { // Assuming staff can also assign (user's previous instruction)
            assignButton.style.display = 'inline-flex';
        } else {
            assignButton.style.display = 'none';
        }
    }
    
    // Also consider the "Excluir Cliente" button
    const deleteClientButton = document.getElementById('btn-delete-client');
    if (deleteClientButton) {
        if (currentUser.role === 'coordinator') {
            deleteClientButton.style.display = 'inline-flex';
        } else {
            deleteClientButton.style.display = 'none';
        }
    }

    // Show/hide "Editar Dados" button based on user role
    const editClientButton = document.getElementById('btn-edit-client');
    if (editClientButton) {
        if (currentUser.role === 'coordinator' || currentUser.role === 'staff') {
            editClientButton.style.display = 'inline-flex';
        } else {
            editClientButton.style.display = 'none';
        }
    }
}

function renderAppointmentHistory(appointments) {
    const historicoContainer = document.getElementById('historico-atendimentos');
    historicoContainer.innerHTML = '';

    if (!appointments || appointments.length === 0) {
        // The empty state is now handled by CSS, so we don't need to add content here
        return;
    }
    
    const sortedAppointments = [...appointments].sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedAppointments.forEach(app => {
        const anamnesis = db.anamnesisTypes.find(a => a.id === app.anamnesisTypeId);
        const card = document.createElement('div');
        card.className = 'atendimento-card';
        
        let attachmentsHtml = '';
        if (app.attachments && app.attachments.length > 0) {
            attachmentsHtml = `
                <div class="appointment-attachments">
                    <strong><i class="fa-solid fa-paperclip"></i> Anexos:</strong>
                    <div class="attachment-list">
                        ${app.attachments.map(attachment => `
                            <a href="${attachment.fileData}" download="${attachment.fileName}" class="attachment-link">
                                <i class="fa-solid fa-download"></i> ${attachment.fileName}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        const appointmentDate = new Date(app.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        const isRecent = (new Date() - new Date(app.date)) / (1000 * 60 * 60 * 24) <= 7; // Within 7 days
        
        card.innerHTML = `
            <div class="appointment-header">
                <strong><i class="fa-solid fa-calendar"></i> Data:</strong> ${appointmentDate}
                ${isRecent ? '<span class="recent-badge">RECENTE</span>' : ''}
            </div>
            <div class="appointment-details">
                <p><strong><i class="fa-solid fa-clipboard-list"></i> Anamnese:</strong> ${anamnesis ? anamnesis.name : 'Não especificada'}</p>
                <p><strong><i class="fa-solid fa-user-md"></i> Atendido por:</strong> ${app.attendedBy || 'Não informado'}</p>
                ${app.notes ? `<p><strong><i class="fa-solid fa-sticky-note"></i> Notas:</strong> ${app.notes}</p>` : ''}
                ${app.value ? `<p><strong><i class="fa-solid fa-dollar-sign"></i> Valor:</strong> R$ ${app.value.toFixed(2).replace('.', ',')}</p>` : ''}
                ${app.durationHours ? `<p><strong><i class="fa-solid fa-clock"></i> Duração:</strong> ${formatDuration(app.durationHours)}</p>` : ''}
            </div>
            ${attachmentsHtml}
        `;
        historicoContainer.appendChild(card);
    });
}

function renderClientNotes(notes) {
    const notesContainer = document.getElementById('client-notes-list');
    notesContainer.innerHTML = '';

    if (!notes || notes.length === 0) {
        notesContainer.innerHTML = '<p>Nenhuma nota registrada.</p>';
        return;
    }

    const sortedNotes = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedNotes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.innerHTML = `
            <h4>${note.title}</h4>
            <div class="note-meta">
                ${new Date(note.date).toLocaleDateString('pt-BR')} - ${note.author || getCurrentUser().name}
            </div>
            <div class="note-content">${note.content}</div>
        `;
        notesContainer.appendChild(noteCard);
    });
}

function renderClientDocuments(documents) {
    const documentsContainer = document.getElementById('client-documents-list');
    documentsContainer.innerHTML = '';

    if (!documents || documents.length === 0) {
        documentsContainer.innerHTML = '<p>Nenhum documento anexado.</p>';
        return;
    }

    const sortedDocuments = [...documents].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    sortedDocuments.forEach(doc => {
        const documentCard = document.createElement('div');
        documentCard.className = 'document-card';
        
        const typeLabels = {
            'pagamento': 'Pagamento',
            'laudo': 'Laudo Médico',
            'receita': 'Receita',
            'exame': 'Exame',
            'relatorio': 'Relatório',
            'outros': 'Outros'
        };

        documentCard.innerHTML = `
            <div class="document-info">
                <h4>${doc.title}</h4>
                <div class="document-meta">
                    <span class="document-type">${typeLabels[doc.type] || doc.type}</span>
                    ${new Date(doc.uploadDate).toLocaleDateString('pt-BR')} - ${doc.uploadedBy || getCurrentUser().name}
                </div>
                ${doc.description ? `<div class="document-description">${doc.description}</div>` : ''}
            </div>
            <div class="document-actions">
                <a href="${doc.fileData}" download="${doc.fileName}" class="btn-download">
                    <i class="fa-solid fa-download"></i> Baixar
                </a>
                <button class="btn-delete-doc" onclick="deleteClientDocument(${doc.id})">
                    <i class="fa-solid fa-trash"></i> Excluir
                </button>
            </div>
        `;
        documentsContainer.appendChild(documentCard);
    });
}

export async function addClientNote() {
    const client = db.clients.find(c => c.id === window.currentClientId);
    if (!client) return;

    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title || !content) {
        showNotification('Por favor, preencha todos os campos da nota.', 'warning');
        return;
    }

    const newNote = {
        client_id: client.id,
        title: title,
        content: content,
        date: new Date().toISOString(),
        author: getCurrentUser().name
    };

    // Usar Supabase para salvar
    const { clientNotes } = await import('./database.js');
    const savedNote = await clientNotes.create(newNote);
    
    if (savedNote) {
        document.getElementById('modal-add-note').style.display = 'none';
        showClientDetails(window.currentClientId);
        showNotification('Nota adicionada com sucesso!', 'success');
    } else {
        showNotification('Erro ao adicionar nota. Tente novamente.', 'error');
    }
}

export async function addClientDocument() {
    const client = db.clients.find(c => c.id === window.currentClientId);
    if (!client) return;

    const title = document.getElementById('document-title').value.trim();
    const type = document.getElementById('document-type').value;
    const description = document.getElementById('document-description').value.trim();
    const fileInput = document.getElementById('document-file');

    if (!title || !type || !fileInput.files[0]) {
        showNotification('Por favor, preencha todos os campos obrigatórios e selecione um arquivo.', 'warning');
        return;
    }

    const file = fileInput.files[0];
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('O arquivo deve ter no máximo 5MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const newDocument = {
            client_id: client.id,
            title: title,
            type: type,
            description: description,
            file_name: file.name,
            file_data: e.target.result,
            upload_date: new Date().toISOString(),
            uploaded_by: getCurrentUser().name
        };

        // Usar Supabase para salvar
        const { clientDocuments } = await import('./database.js');
        const savedDocument = await clientDocuments.create(newDocument);
        
        if (savedDocument) {
            document.getElementById('modal-add-document').style.display = 'none';
            document.getElementById('form-add-document').reset();
            showClientDetails(window.currentClientId);
            showNotification('Documento anexado com sucesso!', 'success');
        } else {
            showNotification('Erro ao anexar documento. Tente novamente.', 'error');
        }
    };

    reader.onerror = function() {
        showNotification('Erro ao processar o arquivo. Tente novamente.', 'error');
    };

    reader.readAsDataURL(file);
}

export async function deleteClientDocument(documentId) {
    const { clientDocuments } = await import('./database.js');
    const deleted = await clientDocuments.delete(documentId);
    
    if (deleted) {
        showClientDetails(window.currentClientId);
        showNotification('Documento excluído com sucesso!', 'success');
    } else {
        showNotification('Erro ao excluir documento. Tente novamente.', 'error');
    }
}

export function renderMeusPacientes(filter = '') {
    const currentUser = getCurrentUser();
    if (currentUser.role !== 'intern') return; // Ensure only interns can access this function
    
    const meusPacientesList = document.getElementById('meus-pacientes-list');
    if (!meusPacientesList) return;
    
    meusPacientesList.innerHTML = '';
    
    const lowerCaseFilter = filter.toLowerCase();

    // Filter clients that are *currently assigned* to the current intern
    const filteredClients = db.clients.filter(client => {
        const isAssignedToMe = client.assignedInternId === currentUser.id;
        const matchesFilter = lowerCaseFilter === '' || 
                            client.name.toLowerCase().includes(lowerCaseFilter) ||
                            (client.cpf && client.cpf.includes(filter)) ||
                            client.id.toString().includes(filter);
        return isAssignedToMe && matchesFilter;
    });
    
    if (filteredClients.length === 0) {
        meusPacientesList.innerHTML = '<p>Nenhum paciente vinculado a você foi encontrado.</p>';
        return;
    }
    
    filteredClients.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.dataset.clientId = client.id;

        // Count *all* scheduled appointments for this client with this intern
        const internSchedulesCount = db.schedules.filter(s => 
            s.clientId === client.id && s.assignedToUserId === currentUser.id
        ).length;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h3>${client.name}</h3>
                <span style="background: var(--primary-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">ID: ${client.id}</span>
            </div>
            <p>${client.email || 'Sem email'}</p>
            <p>${client.cpf || 'Sem CPF'}</p>
            <p><strong>Agendamentos Atribuídos:</strong> ${internSchedulesCount}</p>
        `;
        card.addEventListener('click', () => showClientDetails(client.id));
        meusPacientesList.appendChild(card);
    });
}

export function renderClientReport(selectedPeriod = 'all') {
    const currentUser = getCurrentUser();
    if (currentUser.role !== 'coordinator' && currentUser.role !== 'staff') return;
    
    let startDate = null;
    let endDate = new Date();
    
    // Calculate date range based on selected period
    switch (selectedPeriod) {
        case 'current-month':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            break;
        case 'last-3-months':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);
            break;
        case 'last-6-months':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, 1);
            break;
        case 'current-year':
            startDate = new Date(endDate.getFullYear(), 0, 1);
            break;
        case 'all':
        default:
            startDate = null;
            break;
    }
    
    // Calculate statistics
    const totalClients = db.clients.length;
    const adultClients = db.clients.filter(client => client.type === 'adult').length;
    const minorClients = db.clients.filter(client => client.type === 'minor').length;
    
    let clientsWithAppointments = 0;
    let clientsWithoutRecentAppointments = 0;
    
    db.clients.forEach(client => {
        const hasAppointments = client.appointments && client.appointments.length > 0;
        
        if (hasAppointments) {
            if (startDate) {
                const hasRecentAppointments = client.appointments.some(app => {
                    const appointmentDate = new Date(app.date);
                    return appointmentDate >= startDate && appointmentDate <= endDate;
                });
                
                if (hasRecentAppointments) {
                    clientsWithAppointments++;
                } else {
                    clientsWithoutRecentAppointments++;
                }
            } else {
                clientsWithAppointments++;
            }
        } else {
            clientsWithoutRecentAppointments++;
        }
    });
    
    // Calculate clients with future schedules
    const today = new Date().toISOString().split('T')[0];
    const clientsWithSchedulesSet = new Set();
    db.schedules.forEach(schedule => {
        if (schedule.date >= today && schedule.status !== 'cancelado') {
            clientsWithSchedulesSet.add(schedule.clientId);
        }
    });
    const clientsWithSchedules = clientsWithSchedulesSet.size;
    
    // Update summary cards
    document.getElementById('total-clients-count').textContent = totalClients;
    document.getElementById('adult-clients-count').textContent = adultClients;
    document.getElementById('minor-clients-count').textContent = minorClients;
    document.getElementById('clients-with-appointments').textContent = clientsWithAppointments;
    document.getElementById('clients-without-recent-appointments').textContent = clientsWithoutRecentAppointments;
    document.getElementById('clients-with-schedules').textContent = clientsWithSchedules;
    
    // Update period display
    const periodNames = {
        'all': 'Todos os períodos',
        'current-month': 'Mês atual',
        'last-3-months': 'Últimos 3 meses',
        'last-6-months': 'Últimos 6 meses',
        'current-year': 'Ano atual'
    };
    
    const periodDisplayElement = document.getElementById('client-report-period-display');
    if (periodDisplayElement) {
        periodDisplayElement.textContent = periodNames[selectedPeriod] || 'Todos os períodos';
    }
    
    // Render intern statistics
    renderInternStatistics();
    
    // Render client details
    renderClientReportDetails(startDate, endDate);
}

function renderInternStatistics() {
    // Check if intern statistics section already exists, if not create it
    let internStatsSection = document.getElementById('intern-statistics-section');
    if (!internStatsSection) {
        internStatsSection = document.createElement('div');
        internStatsSection.id = 'intern-statistics-section';
        internStatsSection.className = 'intern-statistics-section';
        
        // Insert after client summary grid but before client details
        const clientDetailsSection = document.querySelector('.client-details-section');
        clientDetailsSection.parentNode.insertBefore(internStatsSection, clientDetailsSection);
    }
    
    // Get all interns
    const interns = db.users.filter(user => user.role === 'intern');
    
    if (interns.length === 0) {
        internStatsSection.innerHTML = '';
        return;
    }
    
    // Calculate statistics for each intern
    const internStats = interns.map(intern => {
        // Get unique clients *currently assigned* to this intern
        const assignedClients = db.clients.filter(client => 
            client.assignedInternId === intern.id
        );
        
        // Count appointments attended by this intern AND sum total hours attended
        let appointmentsCount = 0;
        let totalHoursAttended = 0; // NEW: Initialize total hours
        db.clients.forEach(client => {
            if (client.appointments) {
                client.appointments.forEach(app => {
                    // Check if this specific appointment was attended by this intern
                    // Note: app.internId refers to who confirmed it, not necessarily who client is assigned to.
                    // This counts *all* relevant appointments.
                    if (app.internId === intern.id) { 
                        appointmentsCount++;
                        totalHoursAttended += (app.durationHours || 0);
                    }
                });
            }
        });
        
        // Count active schedules (future dates, not cancelled) where this intern is assigned to the schedule
        const today = new Date().toISOString().split('T')[0];
        const activeSchedules = db.schedules.filter(schedule => 
            schedule.assignedToUserId === intern.id &&
            schedule.date >= today &&
            schedule.status !== 'cancelado'
        ).length;
        
        return {
            intern,
            assignedClients, // These are clients CURRENTLY assigned via client.assignedInternId
            clientsCount: assignedClients.length,
            appointmentsCount, // These are historical appointments where this intern was involved
            totalHoursAttended, 
            activeSchedules // These are future schedules assigned to this intern
        };
    });
    
    internStatsSection.innerHTML = `
        <h3>Estatísticas dos Estagiários</h3>
        <div class="intern-stats-grid">
            ${internStats.map(stat => `
                <div class="intern-stat-card">
                    <div class="intern-header">
                        <h4>${stat.intern.name}</h4>
                        <div class="intern-badges">
                            <span class="badge clients-badge">${stat.clientsCount} pacientes</span>
                            <span class="badge schedules-badge">${stat.activeSchedules} agendados</span>
                        </div>
                    </div>
                    <div class="intern-metrics">
                        <div class="metric">
                            <i class="fa-solid fa-users"></i>
                            <span>Pacientes Atribuídos</span>
                            <strong>${stat.clientsCount}</strong>
                        </div>
                        <div class="metric">
                            <i class="fa-solid fa-calendar-check"></i>
                            <span>Atendimentos Realizados</span>
                            <strong>${stat.appointmentsCount}</strong>
                        </div>
                        <div class="metric">
                            <i class="fa-solid fa-hourglass-half"></i>
                            <span>Horas de atendimento</span>
                            <strong>${formatDuration(stat.totalHoursAttended)}</strong>
                        </div>
                        <div class="metric">
                            <i class="fa-solid fa-clock"></i>
                            <span>Agendamentos Ativos</span>
                            <strong>${stat.activeSchedules}</strong>
                        </div>
                    </div>
                    ${stat.assignedClients.length > 0 ? `
                        <div class="intern-clients">
                            <h5>Pacientes Atribuídos:</h5>
                            <div class="client-list">
                                ${stat.assignedClients.map(client => `
                                    <div class="client-item" onclick="showClientDetails(${client.id})">
                                        <span class="client-name">${client.name}</span>
                                        <span class="client-id">ID: ${client.id}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : `
                        <div class="intern-clients">
                            <p class="no-clients">Nenhum paciente atribuído</p>
                        </div>
                    `}
                </div>
            `).join('')}
        </div>
    `;
}

function renderClientReportDetails(startDate, endDate) {
    const clientReportList = document.getElementById('client-report-list');
    clientReportList.innerHTML = '';
    
    if (db.clients.length === 0) {
        clientReportList.innerHTML = '<p>Nenhum cliente cadastrado.</p>';
        return;
    }
    
    db.clients.forEach(client => {
        let totalAppointments = 0;
        let totalValue = 0;
        let periodAppointments = 0;
        let periodValue = 0;
        
        if (client.appointments) {
            client.appointments.forEach(appointment => {
                const appointmentDate = new Date(appointment.date);
                totalAppointments++;
                totalValue += appointment.value || 0;
                
                if (!startDate || (appointmentDate >= startDate && appointmentDate <= endDate)) {
                    periodAppointments++;
                    periodValue += appointment.value || 0;
                }
            });
        }
        
        // Count future schedules for this client
        const today = new Date().toISOString().split('T')[0];
        const futureSchedules = db.schedules.filter(schedule => 
            schedule.clientId === client.id && 
            schedule.date >= today && 
            schedule.status !== 'cancelado'
        ).length;
        
        // Get assigned intern information from client.assignedInternName
        let assignedInternNameDisplay = client.assignedInternName || 'Não Vinculado';
        
        // Get last appointment date
        let lastAppointmentDate = 'Nunca';
        if (client.appointments && client.appointments.length > 0) {
            const sortedAppointments = [...client.appointments].sort((a, b) => new Date(b.date) - new Date(a.date));
            lastAppointmentDate = new Date(sortedAppointments[0].date).toLocaleDateString('pt-BR');
        }
        
        const card = document.createElement('div');
        card.className = 'client-report-card';
        card.innerHTML = `
            <div class="card-header">
                <h4>
                    ${client.name}
                    <span class="client-type-badge ${client.type === 'minor' ? 'minor' : ''}">${client.type === 'adult' ? 'Adulto' : 'Menor'}</span>
                </h4>
                <div class="assigned-interns">
                    <i class="fa-solid fa-user-graduate"></i>
                    <span>Estagiário: ${assignedInternNameDisplay}</span>
                </div>
            </div>
            <div class="client-report-metrics">
                <div class="metric-item">
                    <i class="fa-solid fa-calendar-check"></i>
                    <span>Atendimentos (Período)</span>
                    <strong>${periodAppointments}</strong>
                </div>
                <div class="metric-item">
                    <i class="fa-solid fa-calendar-alt"></i>
                    <span>Atendimentos (Total)</span>
                    <strong>${totalAppointments}</strong>
                </div>
                <div class="metric-item">
                    <i class="fa-solid fa-money-bill-wave"></i>
                    <span>Valor (Período)</span>
                    <strong>R$ ${periodValue.toFixed(2).replace('.', ',')}</strong>
                </div>
                <div class="metric-item">
                    <i class="fa-solid fa-dollar-sign"></i>
                    <span>Valor (Total)</span>
                    <strong>R$ ${totalValue.toFixed(2).replace('.', ',')}</strong>
                </div>
                <div class="metric-item">
                    <i class="fa-solid fa-clock"></i>
                    <span>Último Atendimento</span>
                    <strong>${lastAppointmentDate}</strong>
                </div>
                <div class="metric-item">
                    <i class="fa-solid fa-calendar-plus"></i>
                    <span>Agendamentos Futuros</span>
                    <strong>${futureSchedules}</strong>
                </div>
            </div>
        `;
        
        // Add click handler to show client details
        card.addEventListener('click', () => showClientDetails(client.id));
        card.style.cursor = 'pointer';
        
        clientReportList.appendChild(card);
    });
}

// NEW FUNCTIONALITY: Assign/Unassign intern to client
export function showAssignInternModal(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;

    window.currentClientToAssignIntern = clientId; // Store current client ID
    
    const clientInfoElement = document.getElementById('assign-intern-client-info');
    if (clientInfoElement) {
        clientInfoElement.textContent = `Paciente: ${client.name} (ID: ${client.id})`;
    }

    const selectIntern = document.getElementById('select-intern-to-assign');
    selectIntern.innerHTML = '<option value="">Selecione um estagiário</option>';
    
    const interns = db.users.filter(user => user.role === 'intern');
    interns.forEach(intern => {
        const option = document.createElement('option');
        option.value = intern.id;
        option.textContent = intern.name;
        selectIntern.appendChild(option);
    });

    // Pre-select if already assigned
    if (client.assignedInternId) {
        selectIntern.value = client.assignedInternId;
    } else {
        selectIntern.value = ''; // Ensure nothing is pre-selected if not assigned
    }

    // Show/hide unassign button
    const btnUnassignIntern = document.getElementById('btn-unassign-intern');
    if (client.assignedInternId && client.assignedInternName) {
        btnUnassignIntern.style.display = 'inline-flex';
    } else {
        btnUnassignIntern.style.display = 'none';
    }

    document.getElementById('modal-detalhes-cliente').style.display = 'none'; // Hide client details
    document.getElementById('modal-assign-intern').style.display = 'flex';
}

export function assignInternToClient() {
    const clientId = window.currentClientToAssignIntern;
    const client = db.clients.find(c => c.id === clientId);
    if (!client) {
        showNotification('Erro: Paciente não encontrado.', 'error');
        return;
    }

    const newAssignedInternId = parseInt(document.getElementById('select-intern-to-assign').value);
    const newAssignedIntern = db.users.find(u => u.id === newAssignedInternId && u.role === 'intern');

    if (!newAssignedIntern) {
        showNotification('Por favor, selecione um estagiário válido.', 'warning');
        return;
    }

    if (client.assignedInternId === newAssignedInternId) {
        showNotification('Este estagiário já está vinculado a este paciente.', 'info');
        document.getElementById('modal-assign-intern').style.display = 'none';
        showClientDetails(clientId);
        return;
    }

    const oldAssignedInternName = client.assignedInternName;

    client.assignedInternId = newAssignedIntern.id;
    client.assignedInternName = newAssignedIntern.name;

    // Add change history
    if (!client.changeHistory) client.changeHistory = [];
    client.changeHistory.push({
        id: db.nextChangeId,
        date: new Date().toISOString(),
        changedBy: getCurrentUser().name,
        changes: [{
            field: 'Estagiário Vinculado',
            oldValue: oldAssignedInternName || 'Nenhum',
            newValue: newAssignedIntern.name
        }]
    });

    saveDb();
    document.getElementById('modal-assign-intern').style.display = 'none';
    showClientDetails(clientId); // Refresh client details
    showNotification(`Paciente vinculado a ${newAssignedIntern.name} com sucesso!`, 'success');
}

export function unassignInternFromClient() {
    const clientId = window.currentClientToAssignIntern;
    const client = db.clients.find(c => c.id === clientId);
    if (!client) {
        showNotification('Erro: Paciente não encontrado.', 'error');
        return;
    }

    if (client.assignedInternId === null || client.assignedInternId === undefined) {
        showNotification('Este paciente não está vinculado a nenhum estagiário.', 'info');
        document.getElementById('modal-assign-intern').style.display = 'none';
        showClientDetails(clientId);
        return;
    }

    const oldAssignedInternName = client.assignedInternName;

    client.assignedInternId = null;
    client.assignedInternName = null;

    // Add change history
    if (!client.changeHistory) client.changeHistory = [];
    client.changeHistory.push({
        id: db.nextChangeId,
        date: new Date().toISOString(),
        changedBy: getCurrentUser().name,
        changes: [{
            field: 'Estagiário Vinculado',
            oldValue: oldAssignedInternName || 'Nenhum',
            newValue: 'Nenhum'
        }]
    });

    saveDb();
    document.getElementById('modal-assign-intern').style.display = 'none';
    showClientDetails(clientId); // Refresh client details
    showNotification('Paciente desvinculado do estagiário com sucesso!', 'success');
}

// NEW: Delete client (Coordinator only)
export function deleteClient(clientId) {
    const clientToDelete = db.clients.find(c => c.id === clientId);
    if (!clientToDelete) {
        showNotification('Cliente não encontrado.', 'error');
        return;
    }

    const clientName = clientToDelete.name;

    // Remove client from clients array
    db.clients = db.clients.filter(c => c.id !== clientId);

    // Remove any schedules associated with this client
    db.schedules = db.schedules.filter(s => s.clientId !== clientId);

    // Appointments are stored *within* the client object, so they are removed automatically.
    
    saveDb();
    document.getElementById('modal-detalhes-cliente').style.display = 'none'; // Close details modal
    renderClientList(); // Re-render the client list
    showNotification(`Cliente "${clientName}" excluído com sucesso!`, 'success');
}