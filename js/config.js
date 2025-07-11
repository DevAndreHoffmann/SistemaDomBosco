// Configuração do Supabase
// IMPORTANTE: Este arquivo contém informações sensíveis
// Não compartilhe estas chaves publicamente

const SUPABASE_CONFIG = {
    url: 'https://ociltyicsrrgzdpdgeva.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWx0eWljc3JyZ3pkcGRnZXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDE5NTUsImV4cCI6MjA2NzgxNzk1NX0.98vWfX8j0VjcY2Y4RSz80wFymLY-By_8OsHqSdMSjfY'
};

// Exportar configuração
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
} else {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
} 