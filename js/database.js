// Database module for neuropsychology system - Supabase Migration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configurações do Supabase via variáveis de ambiente
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado de loading global
let isLoading = false;
let loadingOperations = new Set();

// Cache local para melhor performance
const cache = {
    users: [],
    clients: [],
    appointments: [],
    schedules: [],
    dailyNotes: [],
    generalDocuments: [],
    anamnesisTypes: [],
    stockItems: [],
    stockMovements: [],
    lastSync: null
};

// Utilitários para loading states
export function setLoading(operation, state) {
    if (state) {
        loadingOperations.add(operation);
    } else {
        loadingOperations.delete(operation);
    }
    isLoading = loadingOperations.size > 0;
    
    // Atualizar UI de loading se necessário
    const loadingElement = document.querySelector('.loading-overlay');
    if (loadingElement) {
        loadingElement.style.display = isLoading ? 'flex' : 'none';
    }
}

export function getLoadingState(operation = null) {
    return operation ? loadingOperations.has(operation) : isLoading;
}

// Tratamento de erros
function handleError(error, operation = '') {
    console.error(`Erro ${operation}:`, error);
    
    // Notificar usuário
    if (typeof showNotification === 'function') {
        showNotification('Erro de conexão', 'Verifique sua conexão e tente novamente.', 'error');
    }
    
    throw error;
}

// Conversion utilities para manter compatibilidade
function convertDateToString(date) {
    if (!date) return null;
    return date instanceof Date ? date.toISOString().split('T')[0] : date;
}

function convertTimeToString(time) {
    if (!time) return null;
    return time;
}

function convertStringToDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
}

// ==================== USERS ====================
export const users = {
    async getAll() {
        try {
            setLoading('users.getAll', true);
            
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            cache.users = data || [];
            return cache.users;
        } catch (error) {
            handleError(error, 'ao buscar usuários');
            return cache.users; // Retornar cache em caso de erro
        } finally {
            setLoading('users.getAll', false);
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao buscar usuário');
            return null;
        }
    },

    async authenticate(username, password) {
        try {
            setLoading('users.authenticate', true);
            
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'na autenticação');
            return null;
        } finally {
            setLoading('users.authenticate', false);
        }
    },

    async create(userData) {
        try {
            setLoading('users.create', true);
            
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    ...userData,
                    change_history: []
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            cache.users.push(data);
            return data;
        } catch (error) {
            handleError(error, 'ao criar usuário');
            return null;
        } finally {
            setLoading('users.create', false);
        }
    },

    async update(id, userData) {
        try {
            setLoading('users.update', true);
            
            const { data, error } = await supabase
                .from('users')
                .update(userData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            const index = cache.users.findIndex(user => user.id === id);
            if (index !== -1) {
                cache.users[index] = data;
            }
            
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar usuário');
            return null;
        } finally {
            setLoading('users.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('users.delete', true);
            
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Atualizar cache
            cache.users = cache.users.filter(user => user.id !== id);
            return true;
        } catch (error) {
            handleError(error, 'ao deletar usuário');
            return false;
        } finally {
            setLoading('users.delete', false);
        }
    }
};

// ==================== CLIENTS ====================
export const clients = {
    async getAll() {
        try {
            setLoading('clients.getAll', true);
            
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            cache.clients = data || [];
            return cache.clients;
        } catch (error) {
            handleError(error, 'ao buscar clientes');
            return cache.clients;
        } finally {
            setLoading('clients.getAll', false);
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao buscar cliente');
            return null;
        }
    },

    async create(clientData) {
        try {
            setLoading('clients.create', true);
            
            // Converter datas para string se necessário
            const processedData = {
                ...clientData,
                birth_date: convertDateToString(clientData.birth_date || clientData.birthDate),
                // Manter compatibilidade com nomes antigos
                estado_civil: clientData.estado_civil || clientData.estadoCivil,
                contato_emergencia: clientData.contato_emergencia || clientData.contatoEmergencia,
                assigned_intern_id: clientData.assigned_intern_id || clientData.assignedInternId,
                assigned_intern_name: clientData.assigned_intern_name || clientData.assignedInternName
            };
            
            const { data, error } = await supabase
                .from('clients')
                .insert([processedData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            cache.clients.push(data);
            return data;
        } catch (error) {
            handleError(error, 'ao criar cliente');
            return null;
        } finally {
            setLoading('clients.create', false);
        }
    },

    async update(id, clientData) {
        try {
            setLoading('clients.update', true);
            
            // Converter datas para string se necessário
            const processedData = {
                ...clientData,
                birth_date: convertDateToString(clientData.birth_date || clientData.birthDate),
                estado_civil: clientData.estado_civil || clientData.estadoCivil,
                contato_emergencia: clientData.contato_emergencia || clientData.contatoEmergencia,
                assigned_intern_id: clientData.assigned_intern_id || clientData.assignedInternId,
                assigned_intern_name: clientData.assigned_intern_name || clientData.assignedInternName
            };
            
            const { data, error } = await supabase
                .from('clients')
                .update(processedData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            const index = cache.clients.findIndex(client => client.id === id);
            if (index !== -1) {
                cache.clients[index] = data;
            }
            
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar cliente');
            return null;
        } finally {
            setLoading('clients.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('clients.delete', true);
            
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Atualizar cache
            cache.clients = cache.clients.filter(client => client.id !== id);
            return true;
        } catch (error) {
            handleError(error, 'ao deletar cliente');
            return false;
        } finally {
            setLoading('clients.delete', false);
        }
    },

    async getByType(type) {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('type', type)
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar clientes por tipo');
            return [];
        }
    },

    async getByIntern(internId) {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('assigned_intern_id', internId)
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar clientes do estagiário');
            return [];
        }
    }
};

// ==================== APPOINTMENTS ====================
export const appointments = {
    async getAll() {
        try {
            setLoading('appointments.getAll', true);
            
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) throw error;
            
            cache.appointments = data || [];
            return cache.appointments;
        } catch (error) {
            handleError(error, 'ao buscar atendimentos');
            return cache.appointments;
        } finally {
            setLoading('appointments.getAll', false);
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao buscar atendimento');
            return null;
        }
    },

    async create(appointmentData) {
        try {
            setLoading('appointments.create', true);
            
            const processedData = {
                ...appointmentData,
                date: convertDateToString(appointmentData.date),
                time: convertTimeToString(appointmentData.time),
                duration_hours: appointmentData.duration_hours || appointmentData.durationHours || 0,
                anamnesis_type: appointmentData.anamnesis_type || appointmentData.anamnesisType,
                materials_used: appointmentData.materials_used || appointmentData.materialsUsed || []
            };
            
            const { data, error } = await supabase
                .from('appointments')
                .insert([processedData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            cache.appointments.push(data);
            return data;
        } catch (error) {
            handleError(error, 'ao criar atendimento');
            return null;
        } finally {
            setLoading('appointments.create', false);
        }
    },

    async update(id, appointmentData) {
        try {
            setLoading('appointments.update', true);
            
            const processedData = {
                ...appointmentData,
                date: convertDateToString(appointmentData.date),
                time: convertTimeToString(appointmentData.time),
                duration_hours: appointmentData.duration_hours || appointmentData.durationHours,
                anamnesis_type: appointmentData.anamnesis_type || appointmentData.anamnesisType,
                materials_used: appointmentData.materials_used || appointmentData.materialsUsed
            };
            
            const { data, error } = await supabase
                .from('appointments')
                .update(processedData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            const index = cache.appointments.findIndex(appointment => appointment.id === id);
            if (index !== -1) {
                cache.appointments[index] = data;
            }
            
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar atendimento');
            return null;
        } finally {
            setLoading('appointments.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('appointments.delete', true);
            
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Atualizar cache
            cache.appointments = cache.appointments.filter(appointment => appointment.id !== id);
            return true;
        } catch (error) {
            handleError(error, 'ao deletar atendimento');
            return false;
        } finally {
            setLoading('appointments.delete', false);
        }
    },

    async getByClient(clientId) {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('client_id', clientId)
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar atendimentos do cliente');
            return [];
        }
    },

    async getByDateRange(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .gte('date', convertDateToString(startDate))
                .lte('date', convertDateToString(endDate))
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar atendimentos por período');
            return [];
        }
    }
};

// ==================== SCHEDULES ====================
export const schedules = {
    async getAll() {
        try {
            setLoading('schedules.getAll', true);
            
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) throw error;
            
            cache.schedules = data || [];
            return cache.schedules;
        } catch (error) {
            handleError(error, 'ao buscar agendamentos');
            return cache.schedules;
        } finally {
            setLoading('schedules.getAll', false);
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao buscar agendamento');
            return null;
        }
    },

    async create(scheduleData) {
        try {
            setLoading('schedules.create', true);
            
            const processedData = {
                ...scheduleData,
                date: convertDateToString(scheduleData.date),
                time: convertTimeToString(scheduleData.time),
                anamnesis_type: scheduleData.anamnesis_type || scheduleData.anamnesisType,
                cancellation_reason: scheduleData.cancellation_reason || scheduleData.cancellationReason,
                cancellation_image: scheduleData.cancellation_image || scheduleData.cancellationImage,
                assigned_to_user_id: scheduleData.assigned_to_user_id || scheduleData.assignedToUserId,
                assigned_to_user_name: scheduleData.assigned_to_user_name || scheduleData.assignedToUserName
            };
            
            const { data, error } = await supabase
                .from('schedules')
                .insert([processedData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            cache.schedules.push(data);
            return data;
        } catch (error) {
            handleError(error, 'ao criar agendamento');
            return null;
        } finally {
            setLoading('schedules.create', false);
        }
    },

    async update(id, scheduleData) {
        try {
            setLoading('schedules.update', true);
            
            const processedData = {
                ...scheduleData,
                date: convertDateToString(scheduleData.date),
                time: convertTimeToString(scheduleData.time),
                anamnesis_type: scheduleData.anamnesis_type || scheduleData.anamnesisType,
                cancellation_reason: scheduleData.cancellation_reason || scheduleData.cancellationReason,
                cancellation_image: scheduleData.cancellation_image || scheduleData.cancellationImage,
                assigned_to_user_id: scheduleData.assigned_to_user_id || scheduleData.assignedToUserId,
                assigned_to_user_name: scheduleData.assigned_to_user_name || scheduleData.assignedToUserName
            };
            
            const { data, error } = await supabase
                .from('schedules')
                .update(processedData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            const index = cache.schedules.findIndex(schedule => schedule.id === id);
            if (index !== -1) {
                cache.schedules[index] = data;
            }
            
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar agendamento');
            return null;
        } finally {
            setLoading('schedules.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('schedules.delete', true);
            
            const { error } = await supabase
                .from('schedules')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Atualizar cache
            cache.schedules = cache.schedules.filter(schedule => schedule.id !== id);
            return true;
        } catch (error) {
            handleError(error, 'ao deletar agendamento');
            return false;
        } finally {
            setLoading('schedules.delete', false);
        }
    },

    async getByClient(clientId) {
        try {
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('client_id', clientId)
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar agendamentos do cliente');
            return [];
        }
    },

    async getByDateRange(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .gte('date', convertDateToString(startDate))
                .lte('date', convertDateToString(endDate))
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar agendamentos por período');
            return [];
        }
    }
};

// ==================== DAILY NOTES ====================
export const dailyNotes = {
    async getAll() {
        try {
            setLoading('dailyNotes.getAll', true);
            
            const { data, error } = await supabase
                .from('daily_notes')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) throw error;
            
            cache.dailyNotes = data || [];
            return cache.dailyNotes;
        } catch (error) {
            handleError(error, 'ao buscar notas diárias');
            return cache.dailyNotes;
        } finally {
            setLoading('dailyNotes.getAll', false);
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('daily_notes')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao buscar nota diária');
            return null;
        }
    },

    async create(noteData) {
        try {
            setLoading('dailyNotes.create', true);
            
            const processedData = {
                ...noteData,
                date: convertDateToString(noteData.date)
            };
            
            const { data, error } = await supabase
                .from('daily_notes')
                .insert([processedData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            cache.dailyNotes.push(data);
            return data;
        } catch (error) {
            handleError(error, 'ao criar nota diária');
            return null;
        } finally {
            setLoading('dailyNotes.create', false);
        }
    },

    async update(id, noteData) {
        try {
            setLoading('dailyNotes.update', true);
            
            const processedData = {
                ...noteData,
                date: convertDateToString(noteData.date)
            };
            
            const { data, error } = await supabase
                .from('daily_notes')
                .update(processedData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            const index = cache.dailyNotes.findIndex(note => note.id === id);
            if (index !== -1) {
                cache.dailyNotes[index] = data;
            }
            
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar nota diária');
            return null;
        } finally {
            setLoading('dailyNotes.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('dailyNotes.delete', true);
            
            const { error } = await supabase
                .from('daily_notes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Atualizar cache
            cache.dailyNotes = cache.dailyNotes.filter(note => note.id !== id);
            return true;
        } catch (error) {
            handleError(error, 'ao deletar nota diária');
            return false;
        } finally {
            setLoading('dailyNotes.delete', false);
        }
    },

    async getByDateRange(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('daily_notes')
                .select('*')
                .gte('date', convertDateToString(startDate))
                .lte('date', convertDateToString(endDate))
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar notas por período');
            return [];
        }
    },

    async getByType(type) {
        try {
            const { data, error } = await supabase
                .from('daily_notes')
                .select('*')
                .eq('type', type)
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar notas por tipo');
            return [];
        }
    }
};

// ==================== GENERAL DOCUMENTS ====================
export const generalDocuments = {
    async getAll() {
        try {
            setLoading('generalDocuments.getAll', true);
            
            const { data, error } = await supabase
                .from('general_documents')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            cache.generalDocuments = data || [];
            return cache.generalDocuments;
        } catch (error) {
            handleError(error, 'ao buscar documentos gerais');
            return cache.generalDocuments;
        } finally {
            setLoading('generalDocuments.getAll', false);
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('general_documents')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao buscar documento geral');
            return null;
        }
    },

    async create(documentData) {
        try {
            setLoading('generalDocuments.create', true);
            
            const { data, error } = await supabase
                .from('general_documents')
                .insert([documentData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            cache.generalDocuments.push(data);
            return data;
        } catch (error) {
            handleError(error, 'ao criar documento geral');
            return null;
        } finally {
            setLoading('generalDocuments.create', false);
        }
    },

    async update(id, documentData) {
        try {
            setLoading('generalDocuments.update', true);
            
            const { data, error } = await supabase
                .from('general_documents')
                .update(documentData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            const index = cache.generalDocuments.findIndex(doc => doc.id === id);
            if (index !== -1) {
                cache.generalDocuments[index] = data;
            }
            
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar documento geral');
            return null;
        } finally {
            setLoading('generalDocuments.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('generalDocuments.delete', true);
            
            const { error } = await supabase
                .from('general_documents')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Atualizar cache
            cache.generalDocuments = cache.generalDocuments.filter(doc => doc.id !== id);
            return true;
        } catch (error) {
            handleError(error, 'ao deletar documento geral');
            return false;
        } finally {
            setLoading('generalDocuments.delete', false);
        }
    },

    async getByType(type) {
        try {
            const { data, error } = await supabase
                .from('general_documents')
                .select('*')
                .eq('type', type)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar documentos por tipo');
            return [];
        }
    }
};

// ==================== ANAMNESIS TYPES ====================
export const anamnesisTypes = {
    async getAll() {
        try {
            if (cache.anamnesisTypes.length === 0) {
                const { data, error } = await supabase
                    .from('anamnesis_types')
                    .select('*')
                    .order('name');
                
                if (error) throw error;
                cache.anamnesisTypes = data || [];
            }
            
            return cache.anamnesisTypes;
        } catch (error) {
            handleError(error, 'ao buscar tipos de anamnese');
            return cache.anamnesisTypes;
        }
    }
};

// ==================== STOCK ITEMS ====================
export const stockItems = {
    async getAll() {
        try {
            setLoading('stockItems.getAll', true);
            
            const { data, error } = await supabase
                .from('stock_items')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            cache.stockItems = data || [];
            return cache.stockItems;
        } catch (error) {
            handleError(error, 'ao buscar itens do estoque');
            return cache.stockItems;
        } finally {
            setLoading('stockItems.getAll', false);
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('stock_items')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao buscar item do estoque');
            return null;
        }
    },

    async create(itemData) {
        try {
            setLoading('stockItems.create', true);
            
            const { data, error } = await supabase
                .from('stock_items')
                .insert([itemData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            cache.stockItems.push(data);
            return data;
        } catch (error) {
            handleError(error, 'ao criar item do estoque');
            return null;
        } finally {
            setLoading('stockItems.create', false);
        }
    },

    async update(id, itemData) {
        try {
            setLoading('stockItems.update', true);
            
            const { data, error } = await supabase
                .from('stock_items')
                .update(itemData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            const index = cache.stockItems.findIndex(item => item.id === id);
            if (index !== -1) {
                cache.stockItems[index] = data;
            }
            
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar item do estoque');
            return null;
        } finally {
            setLoading('stockItems.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('stockItems.delete', true);
            
            const { error } = await supabase
                .from('stock_items')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Atualizar cache
            cache.stockItems = cache.stockItems.filter(item => item.id !== id);
            return true;
        } catch (error) {
            handleError(error, 'ao deletar item do estoque');
            return false;
        } finally {
            setLoading('stockItems.delete', false);
        }
    },

    async getByCategory(category) {
        try {
            const { data, error } = await supabase
                .from('stock_items')
                .select('*')
                .eq('category', category)
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar itens por categoria');
            return [];
        }
    },

    async getLowStock() {
        try {
            const { data, error } = await supabase
                .from('stock_items')
                .select('*')
                .lt('quantity', 'min_stock')
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar itens com estoque baixo');
            return [];
        }
    }
};

// ==================== STOCK MOVEMENTS ====================
export const stockMovements = {
    async getAll() {
        try {
            setLoading('stockMovements.getAll', true);
            
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            cache.stockMovements = data || [];
            return cache.stockMovements;
        } catch (error) {
            handleError(error, 'ao buscar movimentações do estoque');
            return cache.stockMovements;
        } finally {
            setLoading('stockMovements.getAll', false);
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao buscar movimentação do estoque');
            return null;
        }
    },

    async create(movementData) {
        try {
            setLoading('stockMovements.create', true);
            
            const { data, error } = await supabase
                .from('stock_movements')
                .insert([movementData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            cache.stockMovements.push(data);
            return data;
        } catch (error) {
            handleError(error, 'ao criar movimentação do estoque');
            return null;
        } finally {
            setLoading('stockMovements.create', false);
        }
    },

    async update(id, movementData) {
        try {
            setLoading('stockMovements.update', true);
            
            const { data, error } = await supabase
                .from('stock_movements')
                .update(movementData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar cache
            const index = cache.stockMovements.findIndex(movement => movement.id === id);
            if (index !== -1) {
                cache.stockMovements[index] = data;
            }
            
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar movimentação do estoque');
            return null;
        } finally {
            setLoading('stockMovements.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('stockMovements.delete', true);
            
            const { error } = await supabase
                .from('stock_movements')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Atualizar cache
            cache.stockMovements = cache.stockMovements.filter(movement => movement.id !== id);
            return true;
        } catch (error) {
            handleError(error, 'ao deletar movimentação do estoque');
            return false;
        } finally {
            setLoading('stockMovements.delete', false);
        }
    },

    async getByItem(itemId) {
        try {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*')
                .eq('item_id', itemId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar movimentações do item');
            return [];
        }
    },

    async getByDateRange(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*')
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar movimentações por período');
            return [];
        }
    },

    async getByType(type) {
        try {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*')
                .eq('type', type)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar movimentações por tipo');
            return [];
        }
    }
};

// ==================== CLIENT NOTES ====================
export const clientNotes = {
    async getByClient(clientId) {
        try {
            const { data, error } = await supabase
                .from('client_notes')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar notas do cliente');
            return [];
        }
    },

    async create(noteData) {
        try {
            setLoading('clientNotes.create', true);
            
            const { data, error } = await supabase
                .from('client_notes')
                .insert([noteData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao criar nota do cliente');
            return null;
        } finally {
            setLoading('clientNotes.create', false);
        }
    },

    async update(id, noteData) {
        try {
            setLoading('clientNotes.update', true);
            
            const { data, error } = await supabase
                .from('client_notes')
                .update(noteData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar nota do cliente');
            return null;
        } finally {
            setLoading('clientNotes.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('clientNotes.delete', true);
            
            const { error } = await supabase
                .from('client_notes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            handleError(error, 'ao deletar nota do cliente');
            return false;
        } finally {
            setLoading('clientNotes.delete', false);
        }
    }
};

// ==================== CLIENT DOCUMENTS ====================
export const clientDocuments = {
    async getByClient(clientId) {
        try {
            const { data, error } = await supabase
                .from('client_documents')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar documentos do cliente');
            return [];
        }
    },

    async create(documentData) {
        try {
            setLoading('clientDocuments.create', true);
            
            const { data, error } = await supabase
                .from('client_documents')
                .insert([documentData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao criar documento do cliente');
            return null;
        } finally {
            setLoading('clientDocuments.create', false);
        }
    },

    async update(id, documentData) {
        try {
            setLoading('clientDocuments.update', true);
            
            const { data, error } = await supabase
                .from('client_documents')
                .update(documentData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao atualizar documento do cliente');
            return null;
        } finally {
            setLoading('clientDocuments.update', false);
        }
    },

    async delete(id) {
        try {
            setLoading('clientDocuments.delete', true);
            
            const { error } = await supabase
                .from('client_documents')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            handleError(error, 'ao deletar documento do cliente');
            return false;
        } finally {
            setLoading('clientDocuments.delete', false);
        }
    }
};

// ==================== CLIENT CHANGE HISTORY ====================
export const clientChangeHistory = {
    async getByClient(clientId) {
        try {
            const { data, error } = await supabase
                .from('client_change_history')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, 'ao buscar histórico de alterações do cliente');
            return [];
        }
    },

    async create(changeData) {
        try {
            const { data, error } = await supabase
                .from('client_change_history')
                .insert([changeData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, 'ao criar histórico de alteração');
            return null;
        }
    }
};

// ==================== UTILITÁRIOS DE COMPATIBILIDADE ====================
// Manter interface antiga para compatibilidade
export const db = {
    get clients() { return cache.clients; },
    get appointments() { return cache.appointments; },
    get schedules() { return cache.schedules; },
    get dailyNotes() { return cache.dailyNotes; },
    get generalDocuments() { return cache.generalDocuments; },
    get users() { return cache.users; },
    get anamnesisTypes() { return cache.anamnesisTypes; },
    get stockItems() { return cache.stockItems; },
    get stockMovements() { return cache.stockMovements; },
    
    // IDs simulados para compatibilidade
    get nextClientId() { return Math.max(...cache.clients.map(c => c.id), 0) + 1; },
    get nextAppointmentId() { return Math.max(...cache.appointments.map(a => a.id), 0) + 1; },
    get nextScheduleId() { return Math.max(...cache.schedules.map(s => s.id), 0) + 1; },
    get nextNoteId() { return Math.max(...cache.dailyNotes.map(n => n.id), 0) + 1; },
    get nextDocumentId() { return Math.max(...cache.generalDocuments.map(d => d.id), 0) + 1; },
    get nextUserId() { return Math.max(...cache.users.map(u => u.id), 0) + 1; },
    get nextStockItemId() { return Math.max(...cache.stockItems.map(i => i.id), 0) + 1; },
    get nextMovementId() { return Math.max(...cache.stockMovements.map(m => m.id), 0) + 1; },
    get nextDailyNoteId() { return Math.max(...cache.dailyNotes.map(n => n.id), 0) + 1; },
    get nextGeneralDocumentId() { return Math.max(...cache.generalDocuments.map(d => d.id), 0) + 1; },
    get nextChangeId() { return 1; } // Não mais usado
};

// ==================== FUNÇÕES DE INICIALIZAÇÃO ====================
export async function initializeDatabase() {
    try {
        console.log('Inicializando banco de dados...');
        
        // Carregar dados iniciais em paralelo
        await Promise.all([
            users.getAll(),
            clients.getAll(),
            appointments.getAll(),
            schedules.getAll(),
            dailyNotes.getAll(),
            generalDocuments.getAll(),
            anamnesisTypes.getAll(),
            stockItems.getAll(),
            stockMovements.getAll()
        ]);
        
        cache.lastSync = new Date();
        console.log('Banco de dados inicializado com sucesso!');
        
        return true;
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        return false;
    }
}

export async function syncCache() {
    try {
        console.log('Sincronizando cache...');
        await initializeDatabase();
        console.log('Cache sincronizado!');
    } catch (error) {
        console.error('Erro ao sincronizar cache:', error);
    }
}

// Manter funções antigas para compatibilidade
export function saveDb() {
    console.log('saveDb() chamado - dados agora são salvos automaticamente no Supabase');
}

export function loadDb() {
    console.log('loadDb() chamado - dados são carregados automaticamente do Supabase');
}

// Inicializar automaticamente quando o módulo é carregado
initializeDatabase();