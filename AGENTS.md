# Organização do repositório

- `frontend/`: app Expo / React Native / TypeScript. Siga também `frontend/AGENTS.md`. Execute os comandos npm dentro dessa pasta.
- `backend/`: API PHP 8.3 / CodeIgniter 4 / MariaDB. Execute Docker Compose e Composer a partir dessa pasta, conforme `backend/README.md`.
- Mantenha configurações e dependências de cada aplicação em sua própria pasta.
- Preserve os volumes existentes do Docker; não altere o nome do projeto Compose ou remova volumes sem solicitação explícita.
- O frontend usa a API para autenticação e perfil. As finanças continuam locais, separadas por API/usuário; não há sincronização financeira. Preserve também os dados locais antigos sem vinculá-los automaticamente a uma conta.
