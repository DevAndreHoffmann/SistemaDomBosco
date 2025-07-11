-- Schema SQL para Sistema Dom Bosco - Supabase Migration (Versão Simplificada)
-- Baseado na estrutura do database.js atual

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('coordinator', 'staff', 'intern')),
    address TEXT,
    institution VARCHAR(100),
    graduation_period VARCHAR(50),
    education VARCHAR(100),
    discipline VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    cpf VARCHAR(20),
    change_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CLIENTS TABLE
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('adult', 'minor')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20),
    cpf VARCHAR(20),
    rg VARCHAR(20),
    naturalidade VARCHAR(100),
    estado_civil VARCHAR(30),
    escolaridade VARCHAR(50),
    profissao VARCHAR(100),
    contato_emergencia TEXT,
    cep VARCHAR(10),
    address TEXT,
    number VARCHAR(10),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(10),
    observations TEXT,
    
    -- Campos específicos para menores
    responsible_name VARCHAR(100),
    responsible_cpf VARCHAR(20),
    responsible_rg VARCHAR(20),
    responsible_phone VARCHAR(20),
    responsible_email VARCHAR(100),
    school_name VARCHAR(100),
    school_grade VARCHAR(50),
    school_period VARCHAR(20),
    school_phone VARCHAR(20),
    school_contact VARCHAR(100),
    
    -- Campos de controle
    assigned_intern_id INTEGER REFERENCES users(id),
    assigned_intern_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. APPOINTMENTS TABLE
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration_hours DECIMAL(3,2) DEFAULT 0,
    anamnesis_type VARCHAR(100),
    professional VARCHAR(100),
    status VARCHAR(20) DEFAULT 'scheduled',
    observations TEXT,
    materials_used JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SCHEDULES TABLE
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    anamnesis_type VARCHAR(100),
    professional VARCHAR(100),
    status VARCHAR(20) DEFAULT 'agendado',
    observations TEXT,
    cancellation_reason TEXT,
    cancellation_image TEXT,
    assigned_to_user_id INTEGER REFERENCES users(id),
    assigned_to_user_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. DAILY_NOTES TABLE (Financial Notes)
CREATE TABLE daily_notes (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('receita', 'despesa', 'observacao')),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    value DECIMAL(10,2),
    attachment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. GENERAL_DOCUMENTS TABLE
CREATE TABLE general_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    content TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ANAMNESIS_TYPES TABLE
CREATE TABLE anamnesis_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. STOCK_ITEMS TABLE
CREATE TABLE stock_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'unidade',
    description TEXT,
    unit_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. STOCK_MOVEMENTS TABLE
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('entrada', 'saida', 'exclusao')),
    quantity INTEGER NOT NULL,
    reason TEXT,
    item_unit_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    client_id INTEGER REFERENCES clients(id),
    appointment_id INTEGER REFERENCES appointments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. CLIENT_NOTES TABLE
CREATE TABLE client_notes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. CLIENT_DOCUMENTS TABLE
CREATE TABLE client_documents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. CLIENT_CHANGE_HISTORY TABLE
CREATE TABLE client_change_history (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    user_id INTEGER REFERENCES users(id),
    user_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes para melhor performance
CREATE INDEX idx_clients_type ON clients(type);
CREATE INDEX idx_clients_assigned_intern ON clients(assigned_intern_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_schedules_client_id ON schedules(client_id);
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_daily_notes_date ON daily_notes(date);
CREATE INDEX idx_daily_notes_type ON daily_notes(type);
CREATE INDEX idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX idx_client_change_history_client_id ON client_change_history(client_id);

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_notes_updated_at BEFORE UPDATE ON daily_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_general_documents_updated_at BEFORE UPDATE ON general_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_movements_updated_at BEFORE UPDATE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_notes_updated_at BEFORE UPDATE ON client_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_documents_updated_at BEFORE UPDATE ON client_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais
INSERT INTO anamnesis_types (id, name) VALUES
    ('anamnese-1', 'Anamnese 1'),
    ('anamnese-2', 'Anamnese 2'),
    ('anamnese-3', 'Anamnese 3'),
    ('anamnese-4', 'Anamnese 4'),
    ('anamnese-5', 'Anamnese 5'),
    ('anamnese-6', 'Anamnese 6'),
    ('anamnese-7', 'Anamnese 7'),
    ('anamnese-8', 'Anamnese 8'),
    ('anamnese-9', 'Anamnese 9'),
    ('anamnese-10', 'Anamnese 10'),
    ('anamnese-11', 'Anamnese 11'),
    ('anamnese-12', 'Anamnese 12'),
    ('anamnese-13', 'Anamnese 13'),
    ('anamnese-14', 'Anamnese 14'),
    ('anamnese-15', 'Anamnese 15'),
    ('anamnese-16', 'Anamnese 16'),
    ('anamnese-17', 'Anamnese 17'),
    ('anamnese-18', 'Anamnese 18'),
    ('anamnese-19', 'Anamnese 19'),
    ('anamnese-20', 'Anamnese 20'),
    ('anamnese-21', 'Anamnese 21'),
    ('anamnese-22', 'Anamnese 22'),
    ('anamnese-23', 'Anamnese 23'),
    ('anamnese-24', 'Anamnese 24'),
    ('anamnese-25', 'Anamnese 25'),
    ('anamnese-26', 'Anamnese 26'),
    ('anamnese-27', 'Anamnese 27'),
    ('anamnese-28', 'Anamnese 28'),
    ('anamnese-29', 'Anamnese 29'),
    ('anamnese-30', 'Anamnese 30'),
    ('anamnese-31', 'Anamnese 31'),
    ('anamnese-32', 'Anamnese 32'),
    ('anamnese-33', 'Anamnese 33'),
    ('anamnese-34', 'Anamnese 34'),
    ('anamnese-35', 'Anamnese 35'),
    ('anamnese-36', 'Anamnese 36'),
    ('anamnese-37', 'Anamnese 37'),
    ('anamnese-38', 'Anamnese 38'),
    ('anamnese-39', 'Anamnese 39'),
    ('anamnese-40', 'Anamnese 40');

-- Inserir usuários iniciais
INSERT INTO users (id, username, password, name, role, address, institution, graduation_period, education, discipline, phone, email, cpf, change_history) VALUES
    (1, 'admin', 'admin123', 'Coordenador', 'coordinator', '', '', '', '', '', '', '', '', '[]'),
    (2, 'staff', 'staff123', 'Funcionário', 'staff', '', '', '', '', '', '', '', '', '[]'),
    (18, 'raquel', 'admin123', 'Coordenadora Raquel', 'coordinator', '', '', '', '', '', '', '', '', '[]'),
    (19, 'tatiana_admin', 'admin123', 'Coordenadora Tatiana', 'coordinator', '', '', '', '', '', '', '', '', '[]'),
    (5, 'frances', 'intern123', 'Frances Jane Bifano Freddi', 'intern', 'rua Castelo de Windsor 475/301 - bairro Castelo - Belo Horizonte MG.', 'IESLA', '5°', 'Análise e Desenvolvimento de Sistemas', 'Neuropsicologia Infantil', '(31)99826-6514', 'fjanebifano@gmail.com', '629.398.156-15', '[]'),
    (6, 'vanessa', 'intern123', 'Vanessa', 'intern', 'Av. B, 456', 'Centro Universitário', '7º Semestre', 'Psicologia', 'Reabilitação Cognitiva', '(21) 92222-2222', 'vanessa@example.com', '222.333.444-55', '[]'),
    (7, 'luciana', 'intern123', 'Luciana Villela Moyses', 'intern', 'Rua Deputado Gregoriano Canedo 18 Trevo', 'IESLA', '7º Semestre', 'Letras', 'Psicodiagnóstico', '(31) 99745-2225', 'luttivillela@gmail.com', '781.904.106-44', '[]'),
    (8, 'debora', 'intern123', 'Debora', 'intern', 'Travessa D, 101', 'Universidade Estadual', '8º Semestre', 'Psicologia', 'Neurociências', '(21) 94444-4444', 'debora@example.com', '444.555.666-77', '[]'),
    (9, 'renata', 'intern123', 'Renata', 'intern', 'Estrada E, 202', 'Universidade Federal', '5º Semestre', 'Terapia Ocupacional', 'Cognição', '(21) 95555-5555', 'renata@example.com', '555.666.777-88', '[]'),
    (10, 'nathalia', 'intern123', 'Nathalia', 'intern', 'Rua F, 303', 'Centro Universitário', '7º Semestre', 'Psicopedagogia', 'Aprendizagem', '(21) 96666-6666', 'nathalia@example.com', '666.777.888-99', '[]'),
    (11, 'walisson', 'intern123', 'Walisson', 'intern', 'Av. G, 404', 'Faculdade Particular', '6º Semestre', 'Fonoaudiologia', 'Linguagem', '(21) 97777-7777', 'walisson@example.com', '777.888.999-00', '[]'),
    (12, 'tatiana', 'intern123', 'Tatiana', 'intern', 'Rua H, 505', 'Universidade Estadual', '8º Semestre', 'Psicologia', 'Saúde Mental', '(21) 98888-8888', 'tatiana@example.com', '888.999.000-11', '[]'),
    (13, 'luiz', 'intern123', 'Luiz', 'intern', 'Alameda I, 606', 'Universidade Federal', '5º Semestre', 'Psicologia', 'Avaliação Psicológica', '(21) 99999-9999', 'luiz@example.com', '999.000.111-22', '[]'),
    (14, 'pedro', 'intern123', 'Pedro', 'intern', 'Rua J, 707', 'Centro Universitário', '7º Semestre', 'Psicologia', 'Neuropsicologia Adulto', '(21) 90000-0000', 'pedro@example.com', '000.111.222-33', '[]'),
    (15, 'pedro_alexandre', 'intern123', 'Pedro Alexandre Carneiro', 'intern', 'Rua Perdoes 781', 'PUC Minas coração eucarístico', '4°', 'Psicologia', 'Neuropsicologia Adulto', '(31)992384630', 'pedrinalex@gmail.com', '018.582.366-14', '[]'),
    (16, 'wallisson', 'intern123', 'Wallisson Henrique Santos', 'intern', 'Rua Higienópolis, 137, Piratininga. Ibirité', 'Pós graduação - Fumec', 'N/A', 'Psicólogo', 'N/A', '99889-7105 / 98693-3477', 'wallissonpsicologo@gmail.com', '011.922.196-12', '[]'),
    (20, 'renata_cantagalli', 'intern123', 'Renata Grichtolik Cantagalli Paiva', 'intern', 'Rua Bibliotecários, Bairro Alipio de Melo, BH/MG - 30840-070', 'IESLA', 'Pós-Graduação / último semestre', '08/2025', 'N/A', '(31) 98598-7608', 'renatacantagalli@gmail.com', '06050524688', '[]');

-- Alterar sequência para próximos IDs
ALTER SEQUENCE users_id_seq RESTART WITH 21;
ALTER SEQUENCE clients_id_seq RESTART WITH 2;
ALTER SEQUENCE appointments_id_seq RESTART WITH 1;
ALTER SEQUENCE schedules_id_seq RESTART WITH 1;
ALTER SEQUENCE daily_notes_id_seq RESTART WITH 1;
ALTER SEQUENCE general_documents_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_items_id_seq RESTART WITH 143;
ALTER SEQUENCE stock_movements_id_seq RESTART WITH 1;
ALTER SEQUENCE client_notes_id_seq RESTART WITH 1;
ALTER SEQUENCE client_documents_id_seq RESTART WITH 1;
ALTER SEQUENCE client_change_history_id_seq RESTART WITH 1; 