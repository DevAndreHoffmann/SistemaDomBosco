// Database module for neuropsychology system - Supabase Migration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Importar configurações do Supabase
import { SUPABASE_CONFIG } from './config.js';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

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
            
            const processedData = {
                ...userData,
                change_history: [],
                // Mapeamento correto dos campos
                graduation_period: userData.graduation_period || userData.graduationPeriod
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.graduationPeriod;
            
            const { data, error } = await supabase
                .from('users')
                .insert([processedData])
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
            
            const processedData = {
                ...userData,
                // Mapeamento correto dos campos
                graduation_period: userData.graduation_period || userData.graduationPeriod
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.graduationPeriod;
            
            const { data, error } = await supabase
                .from('users')
                .update(processedData)
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
                // Mapeamento correto dos campos
                estado_civil: clientData.estado_civil || clientData.estadoCivil,
                contato_emergencia: clientData.contato_emergencia || clientData.contatoEmergencia,
                assigned_intern_id: clientData.assigned_intern_id || clientData.assignedInternId,
                assigned_intern_name: clientData.assigned_intern_name || clientData.assignedInternName,
                school_name: clientData.school_name || clientData.schoolName,
                school_grade: clientData.school_grade || clientData.schoolGrade,
                school_period: clientData.school_period || clientData.schoolPeriod,
                responsible_name: clientData.responsible_name || clientData.responsibleName,
                responsible_phone: clientData.responsible_phone || clientData.responsiblePhone
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.birthDate;
            delete processedData.estadoCivil;
            delete processedData.contatoEmergencia;
            delete processedData.assignedInternId;
            delete processedData.assignedInternName;
            delete processedData.schoolName;
            delete processedData.schoolGrade;
            delete processedData.schoolPeriod;
            delete processedData.responsibleName;
            delete processedData.responsiblePhone;
            
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
            
            const processedData = {
                ...clientData,
                birth_date: convertDateToString(clientData.birth_date || clientData.birthDate),
                // Mapeamento correto dos campos
                estado_civil: clientData.estado_civil || clientData.estadoCivil,
                contato_emergencia: clientData.contato_emergencia || clientData.contatoEmergencia,
                assigned_intern_id: clientData.assigned_intern_id || clientData.assignedInternId,
                assigned_intern_name: clientData.assigned_intern_name || clientData.assignedInternName,
                school_name: clientData.school_name || clientData.schoolName,
                school_grade: clientData.school_grade || clientData.schoolGrade,
                school_period: clientData.school_period || clientData.schoolPeriod,
                responsible_name: clientData.responsible_name || clientData.responsibleName,
                responsible_phone: clientData.responsible_phone || clientData.responsiblePhone
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.birthDate;
            delete processedData.estadoCivil;
            delete processedData.contatoEmergencia;
            delete processedData.assignedInternId;
            delete processedData.assignedInternName;
            delete processedData.schoolName;
            delete processedData.schoolGrade;
            delete processedData.schoolPeriod;
            delete processedData.responsibleName;
            delete processedData.responsiblePhone;
            
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
                // Mapeamento correto dos campos
                duration_hours: appointmentData.duration_hours || appointmentData.durationHours || 0,
                anamnesis_type: appointmentData.anamnesis_type || appointmentData.anamnesisType,
                materials_used: appointmentData.materials_used || appointmentData.materialsUsed || [],
                service_type: appointmentData.service_type || appointmentData.serviceType,
                client_id: appointmentData.client_id || appointmentData.clientId,
                intern_id: appointmentData.intern_id || appointmentData.internId,
                attended_by: appointmentData.attended_by || appointmentData.attendedBy
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.durationHours;
            delete processedData.anamnesisType;
            delete processedData.materialsUsed;
            delete processedData.serviceType;
            delete processedData.clientId;
            delete processedData.internId;
            delete processedData.attendedBy;
            
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
                // Mapeamento correto dos campos
                duration_hours: appointmentData.duration_hours || appointmentData.durationHours,
                anamnesis_type: appointmentData.anamnesis_type || appointmentData.anamnesisType,
                materials_used: appointmentData.materials_used || appointmentData.materialsUsed,
                service_type: appointmentData.service_type || appointmentData.serviceType,
                client_id: appointmentData.client_id || appointmentData.clientId,
                intern_id: appointmentData.intern_id || appointmentData.internId,
                attended_by: appointmentData.attended_by || appointmentData.attendedBy
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.durationHours;
            delete processedData.anamnesisType;
            delete processedData.materialsUsed;
            delete processedData.serviceType;
            delete processedData.clientId;
            delete processedData.internId;
            delete processedData.attendedBy;
            
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
            
            // Campos CORRETOS baseados no schema real
            const processedData = {
                client_id: scheduleData.client_id || scheduleData.clientId,
                date: convertDateToString(scheduleData.date),
                time: convertTimeToString(scheduleData.time),
                status: scheduleData.status || 'agendado',
                observations: scheduleData.observations,
                // CORRETO: É 'professional' não 'service_type'!
                professional: scheduleData.service_type || scheduleData.serviceType || scheduleData.professional,
                anamnesis_type: scheduleData.anamnesis_type || scheduleData.anamnesisType,
                cancellation_reason: scheduleData.cancellation_reason || scheduleData.cancellationReason,
                cancellation_image: scheduleData.cancellation_image || scheduleData.cancellationImage,
                assigned_to_user_id: scheduleData.assigned_to_user_id || scheduleData.assignedToUserId,
                assigned_to_user_name: scheduleData.assigned_to_user_name || scheduleData.assignedToUserName
            };
            
            console.log('✅ Inserindo agendamento com campos corretos:', processedData);
            
            const { data, error } = await supabase
                .from('schedules')
                .insert([processedData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Erro ao inserir agendamento:', error);
                throw error;
            }
            
            console.log('✅ Agendamento criado com sucesso:', data);
            
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
            
            // Campos CORRETOS baseados no schema real
            const processedData = {
                client_id: scheduleData.client_id || scheduleData.clientId,
                date: convertDateToString(scheduleData.date),
                time: convertTimeToString(scheduleData.time),
                status: scheduleData.status,
                observations: scheduleData.observations,
                // CORRETO: É 'professional' não 'service_type'!
                professional: scheduleData.service_type || scheduleData.serviceType || scheduleData.professional,
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
                date: convertDateToString(noteData.date),
                // Mapeamento correto dos campos
                type: noteData.type || noteData.noteType,
                created_at: noteData.created_at || noteData.createdAt || new Date().toISOString()
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.noteType;
            delete processedData.createdAt;
            delete processedData.createdBy;
            
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
            
            const processedData = {
                ...documentData,
                // Mapeamento correto dos campos
                created_at: documentData.created_at || documentData.createdAt || new Date().toISOString(),
                created_by: documentData.created_by || documentData.createdBy,
                document_type: documentData.document_type || documentData.documentType,
                file_name: documentData.file_name || documentData.fileName,
                file_data: documentData.file_data || documentData.fileData
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.createdAt;
            delete processedData.createdBy;
            delete processedData.documentType;
            delete processedData.fileName;
            delete processedData.fileData;
            
            const { data, error } = await supabase
                .from('general_documents')
                .insert([processedData])
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
            
            const processedData = {
                ...documentData,
                // Mapeamento correto dos campos
                created_at: documentData.created_at || documentData.createdAt,
                created_by: documentData.created_by || documentData.createdBy,
                document_type: documentData.document_type || documentData.documentType,
                file_name: documentData.file_name || documentData.fileName,
                file_data: documentData.file_data || documentData.fileData
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.createdAt;
            delete processedData.createdBy;
            delete processedData.documentType;
            delete processedData.fileName;
            delete processedData.fileData;
            
            const { data, error } = await supabase
                .from('general_documents')
                .update(processedData)
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
            
            const processedData = {
                ...itemData,
                // Mapeamento correto dos campos
                min_stock: itemData.min_stock || itemData.minStock,
                unit_value: itemData.unit_value || itemData.unitValue,
                created_at: itemData.created_at || itemData.createdAt || new Date().toISOString()
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.minStock;
            delete processedData.unitValue;
            delete processedData.createdAt;
            delete processedData.createdBy;
            
            const { data, error } = await supabase
                .from('stock_items')
                .insert([processedData])
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
            
            const processedData = {
                ...itemData,
                // Mapeamento correto dos campos
                min_stock: itemData.min_stock || itemData.minStock,
                unit_value: itemData.unit_value || itemData.unitValue
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.minStock;
            delete processedData.unitValue;
            
            const { data, error } = await supabase
                .from('stock_items')
                .update(processedData)
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
            
            const processedData = {
                ...movementData,
                // Mapeamento correto dos campos
                item_id: movementData.item_id || movementData.itemId,
                created_at: movementData.created_at || movementData.createdAt || new Date().toISOString()
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.itemId;
            delete processedData.createdAt;
            delete processedData.createdBy;
            
            const { data, error } = await supabase
                .from('stock_movements')
                .insert([processedData])
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
            
            const processedData = {
                ...noteData,
                // Mapeamento correto dos campos
                client_id: noteData.client_id || noteData.clientId,
                created_at: noteData.created_at || noteData.createdAt || new Date().toISOString(),
                created_by: noteData.created_by || noteData.createdBy
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.clientId;
            delete processedData.createdAt;
            delete processedData.createdBy;
            
            const { data, error } = await supabase
                .from('client_notes')
                .insert([processedData])
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
            
            const processedData = {
                ...documentData,
                // Mapeamento correto dos campos
                client_id: documentData.client_id || documentData.clientId,
                created_at: documentData.created_at || documentData.createdAt || new Date().toISOString(),
                created_by: documentData.created_by || documentData.createdBy,
                file_name: documentData.file_name || documentData.fileName,
                file_data: documentData.file_data || documentData.fileData
            };
            
            // Remover campos que podem não existir no schema
            delete processedData.clientId;
            delete processedData.createdAt;
            delete processedData.createdBy;
            delete processedData.fileName;
            delete processedData.fileData;
            
            const { data, error } = await supabase
                .from('client_documents')
                .insert([processedData])
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
    get nextClientId() { return cache.clients.length > 0 ? Math.max(...cache.clients.map(c => c.id), 0) + 1 : 1; },
    get nextAppointmentId() { return cache.appointments.length > 0 ? Math.max(...cache.appointments.map(a => a.id), 0) + 1 : 1; },
    get nextScheduleId() { return cache.schedules.length > 0 ? Math.max(...cache.schedules.map(s => s.id), 0) + 1 : 1; },
    get nextNoteId() { 
        // Calcular ID baseado em todas as notas dos clientes
        const allNotes = cache.clients.flatMap(client => client.notes || []);
        return allNotes.length > 0 ? Math.max(...allNotes.map(n => n.id), 0) + 1 : 1;
    },
    get nextDocumentId() { 
        // Calcular ID baseado em todos os documentos dos clientes
        const allDocuments = cache.clients.flatMap(client => client.documents || []);
        return allDocuments.length > 0 ? Math.max(...allDocuments.map(d => d.id), 0) + 1 : 1;
    },
    get nextUserId() { return cache.users.length > 0 ? Math.max(...cache.users.map(u => u.id), 0) + 1 : 1; },
    get nextStockItemId() { return cache.stockItems.length > 0 ? Math.max(...cache.stockItems.map(i => i.id), 0) + 1 : 1; },
    get nextMovementId() { return cache.stockMovements.length > 0 ? Math.max(...cache.stockMovements.map(m => m.id), 0) + 1 : 1; },
    get nextDailyNoteId() { return cache.dailyNotes.length > 0 ? Math.max(...cache.dailyNotes.map(n => n.id), 0) + 1 : 1; },
    get nextGeneralDocumentId() { return cache.generalDocuments.length > 0 ? Math.max(...cache.generalDocuments.map(d => d.id), 0) + 1 : 1; },
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

// ==================== DEBUG SCHEMA ====================
export async function debugSchedulesSchema() {
    try {
        console.log('=== DEBUG: Verificando schema da tabela schedules ===');
        
        // Primeiro, tentar buscar registros existentes
        const { data, error } = await supabase
            .from('schedules')
            .select('*')
            .limit(5);
        
        if (error) {
            console.error('Erro ao buscar dados:', error);
        } else if (data && data.length > 0) {
            console.log('✅ Encontrados', data.length, 'registros existentes');
            console.log('📋 Campos disponíveis na tabela schedules:');
            console.log(Object.keys(data[0]));
            console.log('📄 Exemplo de registro completo:');
            console.log(data[0]);
        } else {
            console.log('⚠️ Tabela schedules está vazia');
        }
        
        // Agora tentar criar um registro mínimo para ver quais campos são obrigatórios
        const testData = {
            client_id: 1,
            date: '2024-01-01',
            time: '10:00',
            status: 'agendado'
        };
        
        console.log('🧪 Tentando inserir registro de teste básico...');
        console.log('📋 Dados do teste:', testData);
        
        const { data: insertData, error: insertError } = await supabase
            .from('schedules')
            .insert([testData])
            .select();
        
        if (insertError) {
            console.error('❌ Erro ao inserir (mostra campos obrigatórios/inválidos):', insertError);
            console.log('💡 Isso nos ajuda a entender o schema correto');
        } else if (insertData && insertData.length > 0) {
            console.log('✅ Registro de teste inserido com sucesso!');
            console.log('📋 Campos retornados pelo Supabase:', Object.keys(insertData[0]));
            console.log('📄 Registro completo:', insertData[0]);
            
            // Deletar o registro de teste
            await supabase.from('schedules').delete().eq('id', insertData[0].id);
            console.log('🗑️ Registro de teste removido');
        }
        
    } catch (error) {
        console.error('💥 Erro no debug:', error);
    }
}

// ==================== DEBUG ALL SCHEMAS ====================
export async function debugAllSchemas() {
    console.log('🚀 === DEBUG: Verificando schema de TODAS as tabelas ===');
    
    const tables = [
        'users',
        'clients', 
        'schedules',
        'appointments',
        'daily_notes',
        'general_documents',
        'anamnesis_types',
        'stock_items',
        'stock_movements',
        'client_notes',
        'client_documents'
    ];
    
    for (const tableName of tables) {
        await debugTableSchema(tableName);
        console.log('---'.repeat(20));
    }
}

async function debugTableSchema(tableName) {
    try {
        console.log(`🔍 === TABELA: ${tableName.toUpperCase()} ===`);
        
        // Buscar registros existentes
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);
        
        if (error) {
            console.error(`❌ Erro ao buscar ${tableName}:`, error);
            return;
        }
        
        if (data && data.length > 0) {
            console.log(`✅ Encontrados ${data.length} registros em ${tableName}`);
            
            // Mostrar campos de forma clara
            const campos = Object.keys(data[0]);
            console.log(`📋 CAMPOS (${campos.length}):`, campos.join(', '));
            
            // Mostrar exemplo de registro com campos separados
            console.log(`📄 EXEMPLO DE REGISTRO:`);
            campos.forEach(campo => {
                console.log(`   ${campo}: ${typeof data[0][campo]} = ${data[0][campo]}`);
            });
            
        } else {
            console.log(`⚠️ Tabela ${tableName} está vazia`);
            
            // Para tabelas vazias, tentar inserir um registro mínimo para descobrir campos obrigatórios
            await debugEmptyTable(tableName);
        }
        
    } catch (error) {
        console.error(`💥 Erro no debug da tabela ${tableName}:`, error);
    }
}

async function debugEmptyTable(tableName) {
    console.log(`🧪 Testando inserção mínima em ${tableName}...`);
    
    // Dados de teste corrigidos baseados nos schemas reais
    const testData = {
        users: {
            role: 'intern',
            username: 'test_user_' + Date.now(),
            password: 'test123',
            name: 'Test User'
        },
        clients: {
            type: 'adult',
            name: 'Cliente Teste ' + Date.now(),
            phone: '123456789'
        },
        schedules: {
            client_id: 1,
            date: '2024-01-01',
            time: '10:00',
            status: 'agendado'
        },
        appointments: {
            // Removido 'notes' que não existe - testando campos básicos
            client_id: 1,
            date: '2024-01-01',
            time: '10:00'
        },
        daily_notes: {
            // Removido 'category' que não existe - testando campos básicos  
            date: '2024-01-01',
            title: 'Teste ' + Date.now(),
            content: 'Conteúdo teste',
            value: 100
        },
        general_documents: {
            title: 'Documento Teste ' + Date.now(),
            type: 'document',
            content: 'Conteúdo teste'
        },
        anamnesis_types: {
            name: 'Tipo Teste ' + Date.now()
        },
        stock_items: {
            name: 'Item Teste ' + Date.now(),
            category: 'material',
            quantity: 10,
            unit: 'unidade'
        },
        stock_movements: {
            // Removido 'created_by' que não existe - testando campos básicos
            stock_item_id: 1,
            type: 'entrada',
            quantity: 5,
            reason: 'Teste',
            date: '2024-01-01'
        },
        client_notes: {
            // Removido 'created_by' que não existe - testando campos básicos
            client_id: 1,
            title: 'Nota Teste ' + Date.now(),
            content: 'Conteúdo teste'
        },
        client_documents: {
            // Removido 'file_data' que não existe - testando apenas campos básicos
            client_id: 1,
            title: 'Documento Teste ' + Date.now()
        }
    };
    
    const data = testData[tableName];
    if (!data) {
        console.log(`⚠️ Sem dados de teste definidos para ${tableName}`);
        return;
    }
    
    console.log(`📋 DADOS DE TESTE CORRIGIDOS:`);
    Object.keys(data).forEach(campo => {
        console.log(`   ${campo}: ${typeof data[campo]} = ${data[campo]}`);
    });
    
    const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert([data])
        .select();
    
    if (insertError) {
        console.error(`❌ ERRO DETALHADO em ${tableName}:`);
        console.error(`   Código: ${insertError.code}`);
        console.error(`   Mensagem: ${insertError.message}`);
        console.error(`   Detalhes:`, insertError.details);
        console.error(`   Dica:`, insertError.hint);
        
        // Tentar descobrir campos corretos testando variações
        if (tableName === 'client_documents') {
            console.log('🔧 Testando campos para client_documents...');
            await testClientDocumentsFields();
        }
        
    } else if (insertData && insertData.length > 0) {
        console.log(`✅ SUCESSO! Registro inserido em ${tableName}:`);
        
        const campos = Object.keys(insertData[0]);
        console.log(`📋 CAMPOS RETORNADOS (${campos.length}):`, campos.join(', '));
        
        console.log(`📄 REGISTRO COMPLETO:`);
        campos.forEach(campo => {
            console.log(`   ${campo}: ${typeof insertData[0][campo]} = ${insertData[0][campo]}`);
        });
        
        // Deletar o registro de teste
        await supabase.from(tableName).delete().eq('id', insertData[0].id);
        console.log(`🗑️ Registro de teste removido de ${tableName}`);
    }
}

// Função específica para testar campos de client_documents
async function testClientDocumentsFields() {
    const variations = [
        { title: 'Doc 1' },
        { title: 'Doc 2', description: 'Teste' },
        { title: 'Doc 3', content: 'Conteúdo' },
        { title: 'Doc 4', file_url: 'http://example.com/file.pdf' },
        { title: 'Doc 5', type: 'document' }
    ];
    
    for (const variation of variations) {
        const testData = {
            client_id: 1,
            ...variation
        };
        
        console.log('🧪 Testando client_documents com:', variation);
        
        const { data, error } = await supabase
            .from('client_documents')
            .insert([testData])
            .select();
        
        if (!error && data) {
            console.log('✅ SUCESSO client_documents com:', variation);
            console.log('📋 Campos retornados:', Object.keys(data[0]).join(', '));
            console.log('📄 Registro:', data[0]);
            await supabase.from('client_documents').delete().eq('id', data[0].id);
            break;
        } else {
            console.log('❌ Falhou client_documents:', variation, error.message);
        }
    }
}

// Inicializar automaticamente quando o módulo é carregado
initializeDatabase();