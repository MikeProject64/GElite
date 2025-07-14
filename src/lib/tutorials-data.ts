export interface TutorialContent {
  title: string;
  description: string;
  details: string[];
}

export const tutorials: Record<string, TutorialContent> = {
  servicos: {
    title: 'Gestão de Serviços',
    description: 'Aprenda a gerenciar todo o ciclo de vida dos seus serviços, desde o cadastro até a finalização. Esta funcionalidade é o coração da sua operação diária.',
    details: [
      '**Cadastro Completo:** Ao criar um novo serviço, você pode registrar informações essenciais como dados do cliente, descrição detalhada do trabalho, equipamentos envolvidos, valores acordados e prazos de entrega. Isso centraliza toda a informação em um único lugar.',
      '**Acompanhamento de Status:** Na tela principal de serviços, você tem uma visão clara do andamento de cada trabalho. Utilize os status (Pendente, Em Andamento, Concluído) para organizar seu fluxo e identificar prioridades.',
      '**Modelos para Agilizar:** Se você realiza serviços parecidos com frequência, crie "Modelos de Serviço". Eles funcionam como um template, pré-preenchendo informações e economizando um tempo precioso no seu dia a dia.',
    ],
  },
  orcamentos: {
    title: 'Criação de Orçamentos',
    description: 'Transforme suas propostas em orçamentos profissionais e padronizados em poucos minutos. Facilite o processo de aprovação com seus clientes.',
    details: [
      '**Criação Rápida:** A partir da seção "Orçamentos", clique em "Criar Novo". O formulário guia você pelo preenchimento de itens, mão de obra, impostos e descontos, calculando o total automaticamente.',
      '**Envio e Acompanhamento:** Após criar o orçamento, você pode gerá-lo em PDF para enviar ao cliente. Altere o status para "Enviado" e, posteriormente, para "Aprovado" ou "Recusado", mantendo um registro claro de cada negociação.',
      '**Converter em Serviço:** Um orçamento aprovado pode ser convertido diretamente em uma Ordem de Serviço com apenas um clique, transferindo todas as informações e dando início ao trabalho sem necessidade de redigitação.',
    ],
  },
  prazos: {
    title: 'Controle de Prazos',
    description: 'Nunca mais perca uma data de entrega. Esta tela centraliza todos os seus compromissos e ajuda a visualizar o que precisa ser priorizado.',
    details: [
      '**Visão Centralizada:** A página de Prazos reúne todas as Ordens de Serviço que possuem uma data de entrega definida. Ela as organiza de forma cronológica, mostrando os prazos mais próximos primeiro.',
      '**O Que Aparece Aqui?:** Para que um serviço apareça nesta lista, é crucial que você preencha o campo "Data de Entrega" ao cadastrá-lo ou editá-lo. Serviços sem data de entrega não são listados aqui.',
      '**Gerenciamento de Status:** Conforme você avança no trabalho, pode clicar em um serviço para ser levado à sua página de detalhes e atualizar o status (por exemplo, de "Em Andamento" para "Concluído"), mantendo a lista de prazos sempre atualizada com as pendências reais.',
    ]
  },
  atividades: {
    title: 'Histórico de Atividades',
    description: 'Tenha uma visão completa e cronológica de tudo o que acontece na sua conta. Esta tela funciona como um registro de auditoria para todas as ações importantes.',
    details: [
      '**Linha do Tempo Unificada:** O Histórico de Atividades centraliza as ações realizadas em Clientes, Serviços e Orçamentos em um único local. Cada vez que um item é criado, editado ou tem seu status alterado, um registro é adicionado aqui.',
      '**Rastreabilidade Total:** Saiba quem fez a alteração e quando ela ocorreu. Isso ajuda a manter a transparência da operação, especialmente ao trabalhar em equipe.',
      '**Filtros Inteligentes:** Está procurando por algo específico? Utilize os filtros no topo da página para visualizar atividades apenas de um tipo (ex: somente "Serviços") ou para encontrar ações que ocorreram em um período de tempo específico (ex: "Últimos 7 dias").',
      '**Navegação Rápida:** Cada registro na linha do tempo é um atalho. Clique em qualquer atividade para ser direcionado instantaneamente para a página de detalhes do cliente, serviço ou orçamento correspondente.'
    ]
  },
  clientes: {
    title: 'Base de Clientes (CRM)',
    description: 'Centralize e gerencie as informações de todos os seus clientes em um único lugar. Um CRM simples e poderoso para o seu negócio.',
    details: [
      '**Cadastro Unificado:** Clique em "Adicionar Cliente" para abrir o formulário de cadastro. Preencha informações de contato, endereço, documentos e até a data de nascimento para ações de relacionamento.',
      '**Busca Inteligente:** Encontre qualquer cliente rapidamente usando a barra de busca. Você pode pesquisar por nome, telefone, e-mail ou CPF/CNPJ.',
      '**Segmentação com Tags:** Crie e aplique etiquetas (tags) aos seus clientes para organizá-los em grupos. Isso é perfeito para segmentar campanhas, identificar tipos de cliente (ex: "VIP", "Manutenção Mensal") e filtrar sua base.',
      '**Campos Personalizados:** Nas configurações do sistema, você pode criar campos extras para o cadastro de clientes. Precisa registrar o "Modelo do Carro" ou o "Nome do Pet"? Sem problemas. Os campos que você criar aparecerão automaticamente no formulário.',
      '**Histórico Individual:** Ao clicar em um cliente na lista, você acessa sua página de perfil, onde pode visualizar todo o histórico de serviços e orçamentos associados a ele, tendo uma visão de 360 graus do seu relacionamento.'
    ]
  },
  colaboradores: {
    title: 'Equipes e Colaboradores',
    description: 'Gerencie as pessoas e as equipes que executam os trabalhos. Estes cadastros servem para atribuir responsabilidades nas Ordens de Serviço.',
    details: [
      '**Colaborador ou Setor?:** Você pode cadastrar tanto pessoas individuais ("Colaborador") quanto equipes inteiras ("Setor"). Por exemplo, você pode ter "João Silva" como colaborador e "Equipe de Instalação" como um setor.',
      '**Para que serve?:** O principal objetivo desta lista é popular o campo "Responsável" quando você cria ou edita uma Ordem de Serviço. Isso permite saber exatamente quem está encarregado de cada tarefa.',
      '**Visão da Carga de Trabalho:** A página exibe um contador ao lado de cada colaborador ou setor, mostrando o número de Ordens de Serviço ativas atualmente atribuídas a ele. Isso oferece um panorama rápido de quem está ocupado.',
      '**Isto NÃO é um cadastro de usuário:** É importante notar que cadastrar alguém aqui não cria um acesso de login e senha para a pessoa. Este cadastro serve apenas para fins de atribuição e organização interna dos serviços.'
    ]
  },
  inventario: {
    title: 'Controle de Inventário',
    description: 'Gerencie suas peças, produtos e materiais. Saiba exatamente o que você tem em estoque e qual o valor do seu inventário.',
    details: [
      '**Cadastro de Itens:** Adicione novos itens ao seu estoque informando o nome, a quantidade inicial e o custo por unidade. Você também pode adicionar uma descrição para detalhar o produto.',
      '**Estoque Mínimo:** Ao cadastrar um item, defina a "Quantidade Mínima". Quando o estoque atingir esse número, o sistema irá sinalizar, ajudando você a nunca ficar sem peças ou materiais importantes.',
      '**Visão Financeira:** O sistema calcula e exibe automaticamente o "Valor Total em Estoque", somando o custo de todos os itens do seu inventário. Isso te dá uma visão clara do capital investido em produtos.',
      '**Movimentação de Estoque:** Cada item possui um histórico detalhado de movimentações (entradas e saídas). Para visualizar ou dar baixa/entrada em um item, clique sobre ele na lista para acessar sua página de detalhes.',
      '**Uso em Serviços:** Os itens cadastrados aqui podem ser vinculados diretamente nas suas Ordens de Serviço, garantindo que o estoque seja atualizado automaticamente quando uma peça é utilizada.'
    ]
  },
  contratos: {
    title: 'Gestão de Contratos',
    description: 'Automatize a criação de serviços recorrentes. Ideal para contratos de manutenção, assinaturas ou qualquer trabalho que se repita em uma frequência definida.',
    details: [
      '**Como Funciona?:** Um contrato é uma regra de automação. Ele usa um "Modelo de Ordem de Serviço" como base para criar, automaticamente, novas Ordens de Serviço para um cliente específico em uma frequência (mensal, trimestral, etc.) que você define.',
      '**Pré-requisitos:** Para criar um contrato, você primeiro precisa ter o cliente cadastrado na sua "Base de Clientes" e um "Modelo de Ordem de Serviço" salvo na tela de "Serviços". O modelo contém todos os detalhes (valor, descrição) que serão replicados.',
      '**Geração Automática:** Uma vez que o contrato está ativo, o sistema cuida de tudo. Quando a data de vencimento de uma nova parcela chega (ex: todo dia 5 do mês), uma nova Ordem de Serviço é criada automaticamente na sua lista com o status "Pendente", pronta para ser executada.',
      '**Controle Total:** Você pode pausar um contrato a qualquer momento para interromper a geração de novas ordens de serviço, sem perder o histórico. Também é possível reativá-lo quando desejar.',
      '**Rastreabilidade:** Todas as Ordens de Serviço geradas por um contrato são devidamente identificadas, permitindo que você saiba exatamente quais trabalhos são avulsos e quais são parte de um contrato recorrente.'
    ]
  },
}; 