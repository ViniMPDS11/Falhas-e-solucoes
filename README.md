# Aplicação Web Estática com Firebase Auth + Firestore

## O que foi implementado
- Aplicação **web** (sem Node.js no runtime e sem React Native) usando HTML/CSS/JS puro.
- Tela inicial de login.
- Opção de registro limitada a `@triviatrens.com.br`.
- Validação de lista permitida no Firestore (`allowed_emails`).
- Controle de troca obrigatória de senha via Firestore (`users/{uid}.mustChangePassword`).
- Tela provisória pós-login com mensagem de boas-vindas.

## Estrutura
- `index.html`: telas (login, registro, troca de senha, home).
- `main.js`: regras de autenticação, registro, login e troca de senha.
- `styles.css`: estilo básico.
- `render.yaml`: exemplo de configuração para Render Static Site.

## Como funciona a lista separada de e-mails
1. Crie a coleção `allowed_emails` no Firestore.
2. Use o e-mail como ID do documento, por exemplo:
   - `allowed_emails/maria.silva@triviatrens.com.br`
   - Campo sugerido: `mustChangePassword: true`
3. Só quem estiver nessa lista consegue registrar.

## Senha padrão e segurança (sem backend)
Como você não quer Node.js/backend, não existe ambiente confiável para lógica administrativa sensível.

Sugestão segura neste cenário:
- Pré-criar usuários no Firebase Authentication pelo console/importação.
- Definir senha inicial `Comporte@123` no processo administrativo.
- Gravar `users/{uid}.mustChangePassword = true` no Firestore.
- O app obriga troca de senha após login e então grava `mustChangePassword = false`.

> Observação: sem backend, regras críticas ficam mais limitadas do ponto de vista de segurança. Para produção, o ideal é adicionar um backend mínimo só para operações administrativas.

## Deploy no Render (site estático)
1. Suba este repositório no GitHub.
2. No Render, crie **Static Site** apontando para o repo.
3. Configure o publish directory para `webapp`.
4. Ou use o `webapp/render.yaml` como referência.

## Configuração Firebase
No arquivo `webapp/main.js`, preencha:
- `apiKey`
- `authDomain`
- `projectId`
- `appId`
