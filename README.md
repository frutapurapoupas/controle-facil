# Contas ARS 💰

Gerenciador inteligente de contas a pagar e a receber com suporte a recorrências, filtros avançados e extratos mensais.

## ✨ Features

- 📊 Dashboard com resumo financeiro em tempo real
- 💳 Gerenciamento completo de contas a pagar e receber
- 🔄 Recorrências com entrada por digitação (semanal, quinzenal, mensal)
- 📈 Relatórios com filtros avançados (período, tipo, categoria)
- 🎨 Design moderno com cores roxo/azul gradiente
- 📱 Interface totalmente responsiva
- 📸 Suporte a anexação de fotos/recibos
- 💾 Sincronização em tempo real com Supabase
- 📲 Aplicativo PWA (instalável em celular)
- ⚡ Performance otimizada com Vite

## 🚀 Deploy na Vercel

O projeto está totalmente preparado para deploy na Vercel:

1. **Conecte seu repositório GitHub** na Vercel
2. **Adicione as variáveis de ambiente**:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```
3. **Deploy automático** a cada push para main
4. **Acesse em**: https://seu-app.vercel.app

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (http://localhost:5173)
npm run dev

# Build para produção
npm run build

# Preview do build produção
npm run preview

# Linting
npm run lint
```

## 📂 Estrutura do Projeto

```
src/
├── components/        # Componentes reutilizáveis
│   ├── AccountForm    # Formulário de contas
│   ├── AccountList    # Lista de contas
│   ├── Dashboard      # Resumo financeiro
│   ├── CategoryBreakdown  # Análise por categoria
│   └── NavBar         # Navegação
├── pages/            # Páginas da aplicação
│   ├── Home          # Dashboard principal
│   ├── Accounts      # Gerenciar contas
│   └── Reports       # Extratos e relatórios
├── hooks/            # Hooks customizados
│   └── useAccounts   # Hook para gerenciar contas
├── services/         # Serviços
│   ├── supabase      # Integração Supabase
│   └── storage       # Armazenamento local
└── types.ts          # Definições de tipos TypeScript
```

## 🔧 Tecnologias

- **React 19** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navegação
- **Supabase** - Backend & DB
- **Lucide Icons** - Ícones
- **PWA Plugin** - App instalável
- **Tailwind-inspired CSS** - Estilos

## 📝 Uso

### Adicionar Conta
1. Clique em **"+ Nova Conta"**
2. Preencha tipo, categoria, valor e vencimento
3. Para recorrências: ative a checkbox e **digite a quantidade** de vezes
4. Opcionalmente, anexe uma foto/recibo
5. Clique em **"Registrar"**

### Visualizar Extratos
1. Acesse a página **"Extratos"**
2. Use os **filtros avançados**:
   - 📅 **Mês**: Selecione o período
   - 💵 **Tipo**: Pagar / Receber
   - 🏷️ **Categoria**: Mercado, Fatura, Serviços, etc.
3. Veja o saldo total, gastos e receitas

## 🌐 Ambiente de Produção

O arquivo `vercel.json` está configurado para:
- Build automático com `npm run build`
- Output directory: `dist`
- Rewrites para SPA (React Router)
- Variáveis de ambiente automáticas

Não é necessário adicionar nenhuma configuração adicional na Vercel.

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
