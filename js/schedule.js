// Schedule management module
import { db, saveDb } from './database.js';
import { getCurrentUser } from './auth.js';
import { showNotification } from './ui.js';
import { showClientDetails } from './clients.js'; // Import showClientDetails to re-render client modal

// Define and export service names for consistent display and use in other modules
export const serviceNames = {
    'avaliacao-neuropsicologica': 'Avaliação Neuropsicológica',
    'reabilitacao-cognitiva': 'Reabilitação Cognitiva',
    'terapia-cognitiva': 'Terapia Cognitiva',
    'orientacao-familiar': 'Orientação Familiar',
    'psicoterapia': 'Psicoterapia'
};

export function renderSchedule(selectedDate = null) {
    const agendaList = document.getElementById('agenda-list');
    const dateToShow = selectedDate || new Date().toISOString().split('T')[0];
    const currentUser = getCurrentUser();
    
    // Filter schedules:
    // Coordinators see all schedules.
    // Staff see all schedules.
    // Interns only see schedules assigned to them.
    const daySchedules = db.schedules.filter(schedule => {
        if (schedule.date !== dateToShow) return false;
        if (currentUser.role === 'intern') {
            return schedule.assigned_to_user_id === currentUser.id || schedule.assignedToUserId === currentUser.id;
        }
        return true; // Coordinator and Staff see all
    });
    
    agendaList.innerHTML = '';
    
    if (daySchedules.length === 0) {
        agendaList.innerHTML = '<p>Nenhum agendamento para este dia.</p>';
        return;
    }
    
    // Sort by time
    daySchedules.sort((a, b) => a.time.localeCompare(b.time));
    
    daySchedules.forEach(schedule => {
        const client = db.clients.find(c => c.id === (schedule.client_id || schedule.clientId));
        
        const card = document.createElement('div');
        card.className = `schedule-card status-${schedule.status}`;
        
        let cancellationInfo = '';
        if (schedule.status === 'cancelado' && (schedule.cancellation_reason || schedule.cancelReason)) {
            cancellationInfo = `
                <div class="cancellation-info">
                    <h5>Motivo do Cancelamento:</h5>
                    <div class="cancellation-reason">${schedule.cancellation_reason || schedule.cancelReason}</div>
                    ${(schedule.cancellation_image || schedule.cancelImage) ? `
                        <img src="${schedule.cancellation_image || schedule.cancelImage}" alt="Comprovante do cancelamento" class="cancellation-image" onclick="window.open('${schedule.cancellation_image || schedule.cancelImage}', '_blank')">
                    ` : ''}
                    <small>Cancelado em ${new Date(schedule.cancelDate).toLocaleDateString('pt-BR')} por ${schedule.canceledBy}</small>
                </div>
            `;
        }

        let buttonsHtml = '';
        if (schedule.status === 'agendado') {
            // Coordinator and Staff have full control
            if (currentUser.role === 'coordinator' || currentUser.role === 'staff') {
                buttonsHtml = `
                    <button class="btn-confirm" onclick="updateScheduleStatus(${schedule.id}, 'confirmado')">Confirmar</button>
                    <button class="btn-edit" onclick="editSchedule(${schedule.id})">Editar</button>
                    <button class="btn-cancel" onclick="cancelScheduleWithReason(${schedule.id})">Cancelar</button>
                    ${currentUser.role === 'coordinator' ? `
                        <button class="btn-secondary btn-reassign" onclick="reassignSchedule(${schedule.id})">Redirecionar</button>
                    ` : ''}
                `;
            } 
            // Interns only have 'Confirmar' and 'Cancelar' if it's assigned to them
            else if (currentUser.role === 'intern' && (schedule.assigned_to_user_id === currentUser.id || schedule.assignedToUserId === currentUser.id)) {
                 buttonsHtml = `
                    <button class="btn-confirm" onclick="updateScheduleStatus(${schedule.id}, 'confirmado')">Confirmar</button>
                    <button class="btn-cancel" onclick="cancelScheduleWithReason(${schedule.id})">Cancelar</button>
                 `;
            }
        } else if (schedule.status === 'concluido') {
            buttonsHtml = `
                <span class="status-message success-message">Atendimento Concluído</span>
            `;
        } else if (schedule.status === 'cancelado') {
            buttonsHtml = `
                <span class="status-message danger-message">Agendamento Cancelado</span>
            `;
        }
        
        // CORRIGIDO: Campo correto é 'professional'
        const serviceDisplay = schedule.professional || schedule.service_type || schedule.serviceType || 'Não especificado';
        const serviceName = serviceNames[serviceDisplay] || serviceDisplay;
        
        card.innerHTML = `
            <div class="schedule-info">
                <h4>${schedule.time} - ${client ? `${client.name} (ID: ${client.id})` : 'Cliente não encontrado'}</h4>
                <p><strong>Serviço:</strong> ${serviceName}</p>
                <p><strong>Status:</strong> ${schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}</p>
                ${(schedule.assigned_to_user_name || schedule.assignedToUserName) ? `<p><strong>Atribuído a:</strong> ${schedule.assigned_to_user_name || schedule.assignedToUserName}</p>` : '<p><strong>Atribuído a:</strong> Não atribuído</p>'}
                ${schedule.observations ? `<p><strong>Obs:</strong> ${schedule.observations}</p>` : ''}
                ${cancellationInfo}
            </div>
            <div class="schedule-actions">
                ${buttonsHtml}
            </div>
        `;
        agendaList.appendChild(card);
    });
}

export function updateScheduleStatus(scheduleId, newStatus) {
    const schedule = db.schedules.find(s => s.id === scheduleId);
    if (schedule) {
        if (newStatus === 'confirmado') {
            const currentUser = getCurrentUser();

            // Check if intern is trying to confirm an appointment not assigned to them
            if (currentUser.role === 'intern' && (schedule.assigned_to_user_id || schedule.assignedToUserId) !== currentUser.id) {
                showNotification('Você só pode confirmar agendamentos atribuídos a você.', 'error');
                return;
            }

            window.currentConfirmingScheduleId = scheduleId;
            const client = db.clients.find(c => c.id === (schedule.client_id || schedule.clientId));
            
            // Pre-fill professional responsible field, preferring assigned user
            const profissionalResponsavelInput = document.getElementById('profissional-responsavel');
            
            // Reset form
            document.getElementById('form-confirmar-atendimento').reset();
            
            // Set professional responsible based on role
            if (currentUser.role === 'intern') {
                profissionalResponsavelInput.value = currentUser.name;
                profissionalResponsavelInput.readOnly = true; // Make it read-only
            } else {
                profissionalResponsavelInput.value = (schedule.assigned_to_user_name || schedule.assignedToUserName) || currentUser.name;
                profissionalResponsavelInput.readOnly = false; // Ensure it's editable for others
            }
            
            document.getElementById('materials-selection-confirm').innerHTML = '';
            
            // Set client info in modal
            const clientInfoElement = document.getElementById('confirm-attendance-client-info');
            if (clientInfoElement && client) {
                clientInfoElement.textContent = `Cliente: ${client.name} (ID: ${client.id})`;
            }
            
            // Show modal
            document.getElementById('modal-confirmar-atendimento').style.display = 'flex';
            
            // Populate materials list
            renderMaterialsForConfirmation();
        } else {
            schedule.status = newStatus;
            saveDb();
            renderSchedule(document.getElementById('date-selector').value);
            renderCalendar();
            showNotification('Status atualizado com sucesso!', 'success');
        }
    }
}

export function cancelScheduleWithReason(scheduleId) {
    const schedule = db.schedules.find(s => s.id === scheduleId);
    const currentUser = getCurrentUser();

    // Interns can only cancel appointments assigned to them
    if (currentUser.role === 'intern' && schedule.assignedToUserId !== currentUser.id) {
        showNotification('Você só pode cancelar agendamentos atribuídos a você.', 'error');
        return;
    }

    window.currentCancellingScheduleId = scheduleId;
    
    // Reset form
    document.getElementById('form-cancelar-agendamento').reset();
    document.getElementById('preview-imagem-cancelamento').style.display = 'none';
    
    // Show modal
    document.getElementById('modal-cancelar-agendamento').style.display = 'flex';
}

export function editSchedule(scheduleId) {
    const schedule = db.schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    const currentUser = getCurrentUser();
    // Interns cannot edit schedules. Only Coordinator and Staff.
    if (currentUser.role === 'intern') {
        showNotification('Você não tem permissão para editar agendamentos.', 'error');
        return;
    }

    window.currentEditingScheduleId = scheduleId;
    
    // Populate edit form - need to populate selects first
    populateEditClientSelectOptions();
    populateEditServiceTypeOptions();
    
    document.getElementById('edit-cliente-agenda').value = schedule.client_id || schedule.clientId;
    document.getElementById('edit-data-agendamento').value = schedule.date;
    document.getElementById('edit-hora-agendamento').value = schedule.time;
    // CORRETO: Campo é 'professional'
    document.getElementById('edit-tipo-servico').value = schedule.professional || schedule.service_type || schedule.serviceType;
    document.getElementById('edit-observacoes-agendamento').value = schedule.observations || '';
    
    document.getElementById('modal-editar-agendamento').style.display = 'flex';
}

function populateEditClientSelectOptions() {
    const select = document.getElementById('edit-cliente-agenda');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um cliente</option>';
    
    db.clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.name} (ID: ${client.id})`;
        select.appendChild(option);
    });
}

function populateEditServiceTypeOptions() {
    const select = document.getElementById('edit-tipo-servico');
    if (!select) return;
    
    select.innerHTML = '';
    
    // Use the exported serviceNames
    Object.entries(serviceNames).forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    });
}

export async function saveEditedSchedule() {
    const schedule = db.schedules.find(s => s.id === window.currentEditingScheduleId);
    if (!schedule) return;
    
    const clientId = parseInt(document.getElementById('edit-cliente-agenda').value);
    const date = document.getElementById('edit-data-agendamento').value;
    const time = document.getElementById('edit-hora-agendamento').value;
    const serviceType = document.getElementById('edit-tipo-servico').value;
    const observations = document.getElementById('edit-observacoes-agendamento').value;

    if (!clientId || !date || !time || !serviceType) {
        showNotification('Por favor, preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    const updatedSchedule = {
        client_id: clientId,
        date: date,
        time: time,
        // CORRETO: Campo é 'professional'
        professional: serviceType,
        service_type: serviceType, // Mantemos para compatibilidade
        observations: observations
    };

    // Usar Supabase para salvar
    const { schedules } = await import('./database.js');
    const savedSchedule = await schedules.update(window.currentEditingScheduleId, updatedSchedule);
    
    if (savedSchedule) {
        document.getElementById('modal-editar-agendamento').style.display = 'none';
        renderSchedule(document.getElementById('date-selector').value);
        renderCalendar();
        
        showNotification('Agendamento atualizado com sucesso!', 'success');
    } else {
        showNotification('Erro ao atualizar agendamento. Tente novamente.', 'error');
    }
}

export function initializeCalendar() {
    const monthSelector = document.getElementById('month-selector');
    const today = new Date();
    const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    monthSelector.value = currentMonth;
    
    monthSelector.addEventListener('change', renderCalendar);
    renderCalendar();
}

export function renderCalendar() {
    const monthSelector = document.getElementById('month-selector');
    const calendarGrid = document.getElementById('calendar-grid');
    
    if (!monthSelector || !calendarGrid) return;
    
    const [year, month] = monthSelector.value.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const today = new Date();
    const selectedDate = document.getElementById('date-selector').value;
    const currentUser = getCurrentUser(); // Get current user

    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.textContent = day;
        header.style.fontWeight = 'bold';
        header.style.textAlign = 'center';
        header.style.padding = '8px';
        header.style.backgroundColor = 'var(--background-color)';
        calendarGrid.appendChild(header);
    });
    
    // Add empty cells for days before month starts
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const currentDate = new Date(year, month - 1, day);
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Check if it's today
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Check if it's selected
        if (dateString === selectedDate) {
            dayElement.classList.add('selected');
        }
        
        // Check if it has appointments (filtered by intern if applicable)
        let hasAppointments;
        if (currentUser.role === 'intern') {
            hasAppointments = db.schedules.some(schedule => 
                schedule.date === dateString && schedule.assignedToUserId === currentUser.id
            );
        } else {
            hasAppointments = db.schedules.some(schedule => schedule.date === dateString);
        }

        if (hasAppointments) {
            dayElement.classList.add('has-appointments');
        }
        
        // Add click handler
        dayElement.addEventListener('click', () => {
            document.getElementById('date-selector').value = dateString;
            renderSchedule(dateString);
            renderCalendar(); // Re-render to update selection
        });
        
        calendarGrid.appendChild(dayElement);
    }
}

export function reassignSchedule(scheduleId) {
    const currentUser = getCurrentUser();
    // Only Coordinators can reassign schedules
    if (currentUser.role !== 'coordinator') {
        showNotification('Você não tem permissão para redirecionar agendamentos.', 'error');
        return;
    }

    window.currentReassigningScheduleId = scheduleId;
    const schedule = db.schedules.find(s => s.id === scheduleId);
    if (!schedule) {
        showNotification('Agendamento não encontrado para redirecionamento.', 'error');
        return;
    }

    const client = db.clients.find(c => c.id === schedule.clientId);
    const clientName = client ? client.name : 'Cliente Desconhecido';

    document.getElementById('reassign-schedule-info').textContent = `Agendamento de ${clientName} (${schedule.time})`;
    
    // Populate the select dropdown with staff and intern users
    const selectAssignedUser = document.getElementById('select-assigned-user');
    selectAssignedUser.innerHTML = '<option value="">Selecione um profissional</option>';
    
    const assignableUsers = db.users.filter(user => user.role === 'staff' || user.role === 'intern');
    assignableUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.name} (${user.role === 'staff' ? 'Funcionário' : 'Estagiário'})`;
        selectAssignedUser.appendChild(option);
    });

    // Pre-select if already assigned
    if (schedule.assignedToUserId) {
        selectAssignedUser.value = schedule.assignedToUserId;
    } else {
        selectAssignedUser.value = ''; // Ensure nothing is pre-selected if not assigned
    }

    document.getElementById('modal-reassign-schedule').style.display = 'flex';
}

export function saveReassignedSchedule() {
    const schedule = db.schedules.find(s => s.id === window.currentReassigningScheduleId);
    if (!schedule) {
        showNotification('Erro: Agendamento não encontrado.', 'error');
        return;
    }

    const client = db.clients.find(c => c.id === schedule.clientId);
    if (!client) {
        showNotification('Erro: Cliente do agendamento não encontrado.', 'error');
        return;
    }

    const newAssignedUserId = parseInt(document.getElementById('select-assigned-user').value);
    const newAssignedUser = db.users.find(u => u.id === newAssignedUserId);

    if (!newAssignedUser) {
        showNotification('Por favor, selecione um profissional válido.', 'warning');
        return;
    }

    // NEW LOGIC: If assigning to an intern, set this intern as the client's assigned intern
    if (newAssignedUser.role === 'intern') {
        const oldAssignedInternName = client.assignedInternName;
        const newAssignedInternName = newAssignedUser.name;

        // Check if the client is already assigned to a different intern
        if (client.assignedInternId !== newAssignedUserId) {
            client.assignedInternId = newAssignedUser.id;
            client.assignedInternName = newAssignedUser.name;
            
            // Add a change history entry for the client's intern assignment
            if (!client.changeHistory) client.changeHistory = [];
            client.changeHistory.push({
                id: db.nextChangeId,
                date: new Date().toISOString(),
                changedBy: getCurrentUser().name,
                changes: [
                    {
                        field: 'Estagiário Vinculado',
                        oldValue: oldAssignedInternName || 'Nenhum',
                        newValue: newAssignedInternName
                    }
                ]
            });
        }
    } else {
        // If assigning to staff or unassigning, ensure client's assigned intern remains unchanged unless explicitly handled elsewhere
        // For now, only intern assignments directly affect client.assignedInternId from this flow.
        // If it's reassigned to a staff, the client's assignedInternId (if it was an intern) is retained,
        // unless there's a specific 'unassign client from intern' action.
    }

    schedule.assignedToUserId = newAssignedUserId;
    schedule.assignedToUserName = newAssignedUser.name;

    saveDb();
    document.getElementById('modal-reassign-schedule').style.display = 'none';
    renderSchedule(document.getElementById('date-selector').value);
    // If the client details modal is open (e.g., reassigning from there), refresh it
    if (document.getElementById('modal-detalhes-cliente').style.display === 'flex') {
        showClientDetails(client.id);
    }
    showNotification('Agendamento redirecionado com sucesso!', 'success');
}

export function populateAssignableUsers() {
    const select = document.getElementById('select-assigned-professional');
    if (!select) return;
    
    select.innerHTML = ''; // Clear existing options
    const currentUser = getCurrentUser();

    if (currentUser.role === 'intern') {
        // Interns can only assign to themselves
        const option = document.createElement('option');
        option.value = currentUser.id;
        option.textContent = `${currentUser.name} (Estagiário)`;
        select.appendChild(option);
        select.value = currentUser.id; // Pre-select themselves
        select.disabled = true; // Disable the select box
    } else {
        // Staff and Coordinator can assign to any staff or intern
        select.innerHTML = '<option value="">Nenhum (selecione)</option>'; // Default option
        const assignableUsers = db.users.filter(user => user.role === 'staff' || user.role === 'intern');
        
        assignableUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.role === 'staff' ? 'Funcionário' : 'Estagiário'})`;
            select.appendChild(option);
        });
        select.disabled = false; // Ensure it's not disabled for other roles
        
        // Set default selection based on current user if they are staff (not intern, as intern is handled above)
        if (currentUser.role === 'staff') {
            select.value = currentUser.id;
        } else {
            select.value = ''; // Ensure no default selection for coordinator
        }
    }
}

// Make functions available globally for onclick handlers
window.cancelScheduleWithReason = cancelScheduleWithReason;
window.editSchedule = editSchedule;
window.reassignSchedule = reassignSchedule;
window.saveReassignedSchedule = saveReassignedSchedule;