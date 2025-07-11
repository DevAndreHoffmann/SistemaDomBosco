// Form handling module
import { db, saveDb } from './database.js';
import { renderClientList } from './clients.js';
import { switchTab, showNotification } from './ui.js';
import { getCurrentUser } from './auth.js';

export function setupFormHandlers() {
    setupAgeSelection();
    setupCepHandlers();
    setupClientForms();
    setupEditClientModal();
}

function setupAgeSelection() {
    const ageRadios = document.querySelectorAll('input[name="age-type"]');
    const adultForm = document.getElementById('form-novo-cliente-adulto');
    const minorForm = document.getElementById('form-novo-cliente-menor');
    
    ageRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'adult') {
                adultForm.style.display = 'block';
                minorForm.style.display = 'none';
            } else {
                adultForm.style.display = 'none';
                minorForm.style.display = 'block';
            }
        });
    });
}

function setupCepHandlers() {
    document.getElementById('cep-cliente-adulto').addEventListener('blur', handleCepInputAdult);
    document.getElementById('cep-cliente-menor').addEventListener('blur', handleCepInputMinor);
}

async function handleCepInputAdult(e) {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('CEP não encontrado');
            const data = await response.json();
            if (data.erro) throw new Error('CEP inválido');

            document.getElementById('logradouro-cliente-adulto').value = data.logradouro;
            document.getElementById('bairro-cliente-adulto').value = data.bairro;
            document.getElementById('cidade-cliente-adulto').value = data.localidade;
            document.getElementById('estado-cliente-adulto').value = data.uf;
            document.getElementById('numero-cliente-adulto').focus();

        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            showNotification(error.message, 'error');
        }
    }
}

async function handleCepInputMinor(e) {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('CEP não encontrado');
            const data = await response.json();
            if (data.erro) throw new Error('CEP inválido');

            document.getElementById('logradouro-cliente-menor').value = data.logradouro;
            document.getElementById('bairro-cliente-menor').value = data.bairro;
            document.getElementById('cidade-cliente-menor').value = data.localidade;
            document.getElementById('estado-cliente-menor').value = data.uf;
            document.getElementById('numero-cliente-menor').focus();

        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            showNotification(error.message, 'error');
        }
    }
}

function setupClientForms() {
    document.getElementById('form-novo-cliente-adulto').addEventListener('submit', (e) => {
        e.preventDefault();
        
        try {
            const newClient = {
                type: 'adult',
                name: document.getElementById('nome-cliente-adulto').value,
                email: document.getElementById('email-cliente-adulto').value,
                phone: document.getElementById('telefone-cliente-adulto').value,
                birth_date: document.getElementById('data-nascimento-adulto').value,
                gender: document.getElementById('genero-adulto').value,
                cpf: document.getElementById('cpf-cliente-adulto').value,
                rg: document.getElementById('rg-adulto').value,
                naturalidade: document.getElementById('naturalidade-adulto').value,
                estado_civil: document.getElementById('estado-civil-adulto').value,
                escolaridade: document.getElementById('escolaridade-adulto').value,
                profissao: document.getElementById('profissao-adulto').value,
                contato_emergencia: document.getElementById('contato-emergencia-adulto').value,
                cep: document.getElementById('cep-cliente-adulto').value,
                address: document.getElementById('logradouro-cliente-adulto').value,
                number: document.getElementById('numero-cliente-adulto').value,
                complement: document.getElementById('complemento-cliente-adulto').value,
                neighborhood: document.getElementById('bairro-cliente-adulto').value,
                city: document.getElementById('cidade-cliente-adulto').value,
                state: document.getElementById('estado-cidade-adulto').value,
                observations: document.getElementById('observacoes-cliente-adulto').value
            };
            
            if (!newClient.name || !newClient.birth_date) {
                showNotification('Por favor, preencha pelo menos o nome e data de nascimento.', 'warning');
                return;
            }
            
            // Usar nova API do Supabase
            import('./database.js').then(async ({ clients }) => {
                const savedClient = await clients.create(newClient);
                if (savedClient) {
                    e.target.reset();
                    showNotification(`Cliente "${newClient.name}" cadastrado com sucesso!`, 'success');
                    renderClientList();
                    switchTab('historico');
                } else {
                    showNotification('Erro ao cadastrar cliente. Tente novamente.', 'error');
                }
            });
            return;
        } catch (error) {
            console.error('Erro ao cadastrar cliente adulto:', error);
            showNotification('Erro ao cadastrar cliente. Tente novamente.', 'error');
        }
    });

    document.getElementById('form-novo-cliente-menor').addEventListener('submit', (e) => {
        e.preventDefault();
        
        try {
            const newClient = {
                type: 'minor',
                name: document.getElementById('nome-cliente-menor').value,
                birth_date: document.getElementById('data-nascimento-menor').value,
                gender: document.getElementById('genero-menor').value,
                school_name: document.getElementById('escola-menor').value,
                school_grade: document.getElementById('ano-escolar-menor').value,
                school_period: document.getElementById('tipo-escola-menor').value,
                responsible_name: document.getElementById('nome-pai').value || document.getElementById('nome-mae').value,
                responsible_phone: document.getElementById('telefone-pai').value || document.getElementById('telefone-mae').value,
                cep: document.getElementById('cep-cliente-menor').value,
                address: document.getElementById('logradouro-cliente-menor').value,
                number: document.getElementById('numero-cliente-menor').value,
                complement: document.getElementById('complemento-cliente-menor').value,
                neighborhood: document.getElementById('bairro-cliente-menor').value,
                city: document.getElementById('cidade-cliente-menor').value,
                state: document.getElementById('estado-cliente-menor').value,
                observations: document.getElementById('observacoes-cliente-menor').value
            };
            
            if (!newClient.name || !newClient.birth_date) {
                showNotification('Por favor, preencha pelo menos o nome e data de nascimento.', 'warning');
                return;
            }
            
            // Usar nova API do Supabase
            import('./database.js').then(async ({ clients }) => {
                const savedClient = await clients.create(newClient);
                if (savedClient) {
                    e.target.reset();
                    showNotification(`Cliente "${newClient.name}" cadastrado com sucesso!`, 'success');
                    renderClientList();
                    switchTab('historico');
                } else {
                    showNotification('Erro ao cadastrar cliente. Tente novamente.', 'error');
                }
            });
            return;
        } catch (error) {
            console.error('Erro ao cadastrar cliente menor:', error);
            showNotification('Erro ao cadastrar cliente. Tente novamente.', 'error');
        }
    });
}

function setupEditClientModal() {
    // Check if edit button exists before adding event listener
    const editButton = document.getElementById('btn-edit-client');
    if (editButton) {
        editButton.addEventListener('click', showEditClientModal);
    }
    
    document.getElementById('form-editar-cliente').addEventListener('submit', (e) => {
        e.preventDefault();
        saveClientChanges();
    });
}

function showEditClientModal() {
    const client = db.clients.find(c => c.id === window.currentClientId);
    if (!client) return;

    const container = document.getElementById('edit-form-container');
    container.innerHTML = '';

    if (client.type === 'adult') {
        container.innerHTML = `
            <div class="edit-form-section">
                <h4>Dados Pessoais</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-nome">Nome Completo</label>
                        <input type="text" id="edit-nome" value="${client.name || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-email">Email</label>
                        <input type="email" id="edit-email" value="${client.email || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-telefone">Telefone</label>
                        <input type="tel" id="edit-telefone" value="${client.phone || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-cpf">CPF</label>
                        <input type="text" id="edit-cpf" value="${client.cpf || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-rg">RG</label>
                        <input type="text" id="edit-rg" value="${client.rg || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-profissao">Profissão</label>
                        <input type="text" id="edit-profissao" value="${client.profissao || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-contato-emergencia">Contato de Emergência</label>
                        <input type="text" id="edit-contato-emergencia" value="${client.contatoEmergencia || ''}">
                    </div>
                </div>
            </div>
            <div class="edit-form-section">
                <h4>Endereço</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-cep">CEP</label>
                        <input type="text" id="edit-cep" value="${client.cep || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group form-group-large">
                        <label for="edit-logradouro">Logradouro</label>
                        <input type="text" id="edit-logradouro" value="${client.address || ''}">
                    </div>
                    <div class="form-group form-group-small">
                        <label for="edit-numero">Número</label>
                        <input type="text" id="edit-numero" value="${client.number || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-bairro">Bairro</label>
                        <input type="text" id="edit-bairro" value="${client.neighborhood || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-cidade">Cidade</label>
                        <input type="text" id="edit-cidade" value="${client.city || ''}">
                    </div>
                </div>
            </div>
            <div class="edit-form-section">
                <h4>Observações</h4>
                <div class="form-group">
                    <label for="edit-observacoes">Observações Gerais</label>
                    <textarea id="edit-observacoes" rows="4">${client.observations || ''}</textarea>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="edit-form-section">
                <h4>Dados do Menor</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-nome">Nome Completo</label>
                        <input type="text" id="edit-nome" value="${client.name || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-escola">Escola</label>
                        <input type="text" id="edit-escola" value="${client.escola || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-ano-escolar">Ano Escolar</label>
                        <input type="text" id="edit-ano-escolar" value="${client.anoEscolar || ''}">
                    </div>
                </div>
            </div>
            <div class="edit-form-section">
                <h4>Dados dos Pais</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-nome-pai">Nome do Pai</label>
                        <input type="text" id="edit-nome-pai" value="${client.nomePai || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-telefone-pai">Telefone do Pai</label>
                        <input type="tel" id="edit-telefone-pai" value="${client.telefonePai || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-nome-mae">Nome da Mãe</label>
                        <input type="text" id="edit-nome-mae" value="${client.nomeMae || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-telefone-mae">Telefone da Mãe</label>
                        <input type="tel" id="edit-telefone-mae" value="${client.telefoneMae || ''}">
                    </div>
                </div>
            </div>
            <div class="edit-form-section">
                <h4>Endereço</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-cep">CEP</label>
                        <input type="text" id="edit-cep" value="${client.cep || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group form-group-large">
                        <label for="edit-logradouro">Logradouro</label>
                        <input type="text" id="edit-logradouro" value="${client.address || ''}">
                    </div>
                    <div class="form-group form-group-small">
                        <label for="edit-numero">Número</label>
                        <input type="text" id="edit-numero" value="${client.number || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-bairro">Bairro</label>
                        <input type="text" id="edit-bairro" value="${client.neighborhood || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-cidade">Cidade</label>
                        <input type="text" id="edit-cidade" value="${client.city || ''}">
                    </div>
                </div>
            </div>
            <div class="edit-form-section">
                <h4>Observações</h4>
                <div class="form-group">
                    <label for="edit-observacoes">Observações Gerais</label>
                    <textarea id="edit-observacoes" rows="4">${client.observations || ''}</textarea>
                </div>
            </div>
        `;
    }

    document.getElementById('modal-detalhes-cliente').style.display = 'none';
    document.getElementById('modal-editar-cliente').style.display = 'flex';
}

function saveClientChanges() {
    const client = db.clients.find(c => c.id === window.currentClientId);
    if (!client) return;

    const changes = [];
    const originalClient = { ...client };

    const fieldsToCheck = client.type === 'adult' 
        ? ['nome', 'email', 'telefone', 'cpf', 'rg', 'profissao', 'contato-emergencia', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'observacoes']
        : ['nome', 'escola', 'ano-escolar', 'nome-pai', 'telefone-pai', 'nome-mae', 'telefone-mae', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'observacoes'];

    fieldsToCheck.forEach(field => {
        const element = document.getElementById(`edit-${field}`);
        if (element) {
            const newValue = element.value.trim();
            const fieldMapping = {
                'nome': 'name',
                'email': 'email',
                'telefone': 'phone',
                'cpf': 'cpf',
                'rg': 'rg',
                'profissao': 'profissao',
                'contato-emergencia': 'contatoEmergencia',
                'escola': 'escola',
                'ano-escolar': 'anoEscolar',
                'nome-pai': 'nomePai',
                'telefone-pai': 'telefonePai',
                'nome-mae': 'nomeMae',
                'telefone-mae': 'telefoneMae',
                'cep': 'cep',
                'logradouro': 'address',
                'numero': 'number',
                'bairro': 'neighborhood',
                'cidade': 'city',
                'observacoes': 'observations'
            };
            
            const clientField = fieldMapping[field];
            const oldValue = client[clientField] || '';
            
            if (newValue !== oldValue) {
                changes.push({
                    field: field,
                    oldValue: oldValue,
                    newValue: newValue
                });
                client[clientField] = newValue;
            }
        }
    });

    if (changes.length > 0) {
        if (!client.changeHistory) {
            client.changeHistory = [];
        }
        
        client.changeHistory.push({
            id: db.nextChangeId++,
            date: new Date().toISOString(),
            changedBy: getCurrentUser().name,
            changes: changes
        });
        
        saveDb();
        document.getElementById('modal-editar-cliente').style.display = 'none';
        showClientDetails(window.currentClientId);
        showNotification('Dados do cliente atualizados com sucesso!', 'success');
    } else {
        showNotification('Nenhuma alteração foi feita.', 'info');
    }
}