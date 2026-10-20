// Reading copy in Portuguese (Brazil) of the Handova agreements v3. NOT BINDING: the English text in src/agreement.js
// is what people sign and what is hashed. Each section is keyed by its exact English heading and holds
// [translated heading, [paragraphs in the same order as the English]]. When an English version changes, update this
// file and its `version`; until then the reading copy is hidden and the page says the agreement is in English only.
const PSEA = [
  "A exploração e o abuso sexual são faltas graves e motivo de remoção imediata do Handova.",
  "É proibida qualquer atividade sexual com pessoas menores de 18 anos, qualquer que seja a idade de consentimento local. Acreditar, por engano, que a pessoa tem mais idade não serve de justificativa.",
  "Nunca troque dinheiro, trabalho, ajuda, serviços ou favores por sexo ou favores sexuais, nem adote qualquer outro comportamento humilhante, degradante ou de exploração.",
  "É proibida qualquer relação sexual com as pessoas atendidas por uma organização que envolva uso indevido da própria posição. No Handova, os profissionais não têm nenhum contato pessoal com elas.",
  "Se você tiver uma preocupação ou suspeita de exploração ou abuso sexual por qualquer pessoa ligada ao Handova, você deve relatá-la.",
  "Todos são responsáveis por criar e manter um ambiente que previna a exploração e o abuso sexual.",
];
const POLICIES = "o Código de Conduta do Handova e as políticas do Handova sobre salvaguarda, assédio, proteção de dados, fraude e denúncia de irregularidades, publicados em handova.org/#policies";

export default {
  lang: "pt",
  ui: {
    name: "Português",
    summaryTitle: "Com o que você está concordando",
    summaryNote: "Este resumo é uma ajuda. O que você assina é o acordo completo abaixo, e é ele que vale se algo for diferente.",
    toTranslation: "Ler em português (cópia de leitura; a versão em inglês é a que vincula)",
    toEnglish: "Ver o texto em inglês (a versão que vincula)",
    englishNote: "Você assina o texto em inglês, que é a única versão com valor jurídico. A cópia de leitura em português existe para ajudar você a entendê-lo.",
    readingNote: "Cópia de leitura em português. Ela não é assinada e não tem valor jurídico: o acordo que vincula as partes é o texto em inglês.",
    englishOnly: "Por enquanto, este acordo está disponível apenas em inglês.",
    readingCopy: "Cópia de leitura em português",
    download: "Baixar PDF",
    textLabel: "Texto do acordo",
    englishText: "texto em inglês",
  },

  professional: {
    version: "professional-2026-10-20-v3",
    title: "Acordo profissional do Handova",
    summary: [
      "O Handova é gratuito e você atua como voluntário(a), sem remuneração. Este acordo é entre você e a Ethical Bridge LLC, que administra o Handova.",
      "Você participa com sua própria identidade, tem 18 anos ou mais e verifica sua identidade antes do seu primeiro acordo de contribuição.",
      "Você oferece pelo menos 4 horas por mês. Após três meses sem atividade, seu perfil é marcado como inativo e, após seis, é fechado. Você pode publicá-lo novamente quando quiser.",
      "Todo o trabalho é remoto. Você nunca entra em contato com as pessoas atendidas por uma organização e trabalha com informações anonimizadas.",
      "Antes de começar qualquer trabalho, você assina um acordo de contribuição. Você respeita o escopo combinado e registra só as horas que realmente trabalhou.",
      "Sem pagamentos, presentes ou favores, sem vender seus serviços, e você nunca lida com o dinheiro de uma organização.",
      "Você mantém em sigilo as informações da organização e nunca insere informações pessoais ou confidenciais em ferramentas de IA.",
      "Você relata qualquer preocupação em até 24 horas e segue o Código de Conduta e as políticas do Handova.",
      "A organização pode usar livremente, para sua missão, o trabalho que você entrega, e você pode descrevê-lo no seu CV de impacto.",
      "Se você descumprir o acordo, podemos pausar ou fechar seu perfil. Você pode pedir uma revisão em até 30 dias.",
    ],
    sections: {
      "About this agreement": ["Sobre este acordo", [
        "O Handova é uma plataforma gratuita, administrada pela Ethical Bridge LLC, sociedade registrada em Wyoming (EUA), que conecta profissionais qualificados a organizações sem fins lucrativos de liderança local. Este acordo é entre você e a Ethical Bridge LLC. Ele define o que pedimos a você, o que você pode esperar de nós e como protegemos todas as pessoas: você, as organizações e as pessoas que elas atendem. Leia com atenção. Você o assina uma única vez, e guardamos um registro.",
      ]],
      "1. Who can join": ["1. Quem pode participar", [
        "Você tem 18 anos ou mais.",
        "Você participa com sua própria identidade. Seu nome, foto, experiência e formação são verdadeiros e correspondem ao seu perfil no LinkedIn. Podemos pedir uma videochamada curta ou uma referência antes de aprovar você.",
        "Antes de assinar seu primeiro acordo de contribuição, você verifica sua identidade com nosso fornecedor de verificação de identidade, a Didit, usando um passaporte ou documento de identidade válido e uma selfie ao vivo. O Handova recebe apenas o resultado e o nome que consta no seu documento, nunca as imagens. Se preferir não usar a Didit, você pode pedir uma videochamada curta em que mostra seu documento de identidade ao Handova pela câmera.",
        "Você confirma que nunca foi demitido(a), nem saiu durante uma investigação, por exploração, abuso ou assédio sexual; que nunca foi condenado(a) por crime contra criança ou adulto em situação de risco; e que não está impedido(a) de trabalhar com crianças ou adultos em situação de risco. Registramos apenas que você confirmou isso. Nunca pedimos detalhes nem antecedentes.",
        "Você nos avisa prontamente se algo importante mudar, inclusive qualquer aspecto do item anterior.",
      ]],
      "2. Your monthly commitment": ["2. Seu compromisso mensal", [
        "Você se compromete com um número de horas por mês, no mínimo 4. Você escolhe o número no seu perfil e pode alterá-lo a qualquer momento.",
        "As organizações se planejam com base nas horas que você mostra, então ofereça apenas o tempo que você realmente pode dedicar.",
      ]],
      "3. Keeping the community active": ["3. Manter a comunidade ativa", [
        "O Handova funciona porque as organizações podem contar com as pessoas que encontram aqui. O tempo delas é precioso, e não queremos que o gastem contatando perfis que não estão mais ativos.",
        "Contam como atividade: candidatar-se a uma necessidade, aceitar um convite, trabalhar em uma colaboração ou ter um trabalho recomendado por uma organização.",
        "Se três meses se passarem sem nenhuma atividade, seu perfil é marcado como inativo. Ele continua on-line, mas as organizações veem que você não tem tido atividade recentemente.",
        "Se seis meses se passarem sem nenhuma atividade, fechamos seu perfil. Ele deixa de ser publicado e não fica mais visível para as organizações.",
        "Avisaremos você por e-mail duas semanas antes de cada etapa. Qualquer atividade torna seu perfil ativo novamente na hora, e uma colaboração em andamento sempre conta. Uma contribuição encerrada porque você relatou uma preocupação nunca conta contra você.",
        "O fechamento não é uma penalidade. Você pode publicar seu perfil novamente quando estiver pronto(a), e o revisaremos antes que ele volte a ficar on-line.",
      ]],
      "4. Voluntary, unpaid and remote": ["4. Voluntário, não remunerado e remoto", [
        "As contribuições são voluntárias e não remuneradas. Elas não criam emprego, contrato de trabalho, sociedade nem relação de representação com o Handova, a Ethical Bridge LLC ou a organização.",
        "Você nunca pede nem aceita pagamentos, presentes, hospitalidade ou favores ligados a uma contribuição no Handova. Qualquer despesa exige termos escritos à parte, combinados com a organização antes de você gastar qualquer valor.",
        "Você nunca recebe, guarda ou movimenta dinheiro de uma organização.",
        "Você não usa o Handova para vender serviços, captar clientes ou oferecer trabalho remunerado. Se surgir de forma independente uma vaga remunerada na organização, você se candidata pelo processo seletivo aberto normal dela, e não pelo Handova.",
        "As contribuições no Handova são remotas. Encontros presenciais não fazem parte do Handova, e horas dedicadas presencialmente não são registradas no Handova.",
      ]],
      "5. How engagements work": ["5. Como funcionam as colaborações", [
        "Antes de começar qualquer trabalho, você e a organização assinam um acordo de contribuição que define o resultado, as horas, o acesso e a confidencialidade. Você não faz nenhum trabalho nem recebe informações confidenciais antes de ele ser assinado.",
        "Você respeita o escopo e as horas combinados. Se o trabalho aumentar, você combina a mudança com a organização antes.",
        "Você registra suas horas com honestidade e apenas pelo trabalho que realmente fez. Inventar ou inflar horas, recomendações ou evidências é fraude e leva à remoção.",
        "Você entrega o trabalho de forma que a equipe possa continuar usando, com a explicação ou capacitação necessária.",
        "Se não puder mais continuar, você avisa a organização o quanto antes e encerra a colaboração pelo Handova.",
      ]],
      "6. Safeguarding and do no harm": ["6. Salvaguarda e não causar danos", [
        `Você segue ${POLICIES}, e o código de conduta e a política de salvaguarda da própria organização, quando houver. Se forem diferentes, vale a regra mais rigorosa.`,
        "Você nunca contata, encontra pessoalmente, envia mensagens ou segue nas redes sociais as pessoas atendidas por uma organização, e nunca leva o contato com elas para fora do Handova. Você pode elaborar pesquisas, entrevistas ou testes, mas quem os aplica é a equipe da própria organização.",
        "Você trabalha com informações anonimizadas ou agregadas. Você só vê dados pessoais identificáveis das pessoas atendidas por uma organização se o trabalho não puder ser feito sem eles e isso for combinado por escrito nas Mensagens do Handova antes do compartilhamento. Você nunca recebe dados ou imagens de crianças, prontuários ou fichas de casos, documentos de identidade, localização de abrigos ou qualquer coisa que revele a situação migratória, de detenção, de saúde, de sobrevivente ou a orientação sexual de uma pessoa identificada.",
        "Se uma necessidade acabar envolvendo contato ou dados além do combinado, você para e relata.",
        "Se você já conhecer alguém atendido pela organização, você avisa a organização e o Handova antes de o trabalho começar.",
        "Você nunca abusa, explora, assedia, intimida ou discrimina ninguém, on-line ou off-line.",
        "Você não tira, pede ou compartilha fotos, vídeos, histórias ou informações sobre as pessoas atendidas por uma organização, e nunca usa imagens de crianças.",
        "Você respeita a liderança local: a organização decide do que precisa e como seu trabalho é feito.",
        "Você não usa uma colaboração para promover opiniões religiosas, políticas ou comerciais.",
      ]],
      "7. Protection from sexual exploitation and abuse": ["7. Proteção contra exploração e abuso sexual", PSEA],
      "8. Reporting concerns": ["8. Como relatar preocupações", [
        "Se você presenciar, suspeitar ou for informado(a) de dano, abuso, exploração ou fraude, você relata em até 24 horas ao ponto focal de salvaguarda da organização e ao Handova em safeguarding@handova.org, ou com a função Relatar uma preocupação. Se alguém estiver em perigo imediato, entre em contato primeiro com os serviços de emergência locais.",
        "Se você mesmo(a) sofrer assédio, recomendamos que relate assim que puder, mas a decisão é sua.",
        "Se a preocupação envolver a própria organização ou seu ponto focal, relate apenas ao Handova. Se for sobre a fundadora do Handova, ela vai para o contato independente do Handova, conforme previsto na nossa Política de Denúncia de Irregularidades.",
        "Relate qualquer preocupação em que você acredite honestamente. Você não precisa de provas. Você não será penalizado(a) por relatar uma preocupação, mesmo que ela se revele infundada, e nunca retalia quem relata uma.",
        "Você não investiga uma preocupação por conta própria. Você coopera com qualquer análise da organização, do Handova ou das autoridades, e mantém o sigilo.",
      ]],
      "9. Confidentiality, data and security": ["9. Confidencialidade, dados e segurança", [
        "Você mantém em sigilo as informações da organização, durante a colaboração e depois dela, e as usa apenas para o trabalho combinado.",
        "Com quaisquer dados pessoais, você age apenas conforme as instruções da organização. Você vê e guarda só o que o trabalho exige, e devolve ou exclui tudo na entrega.",
        "Você nunca insere informações pessoais, confidenciais, de relatos, de identidade ou de salvaguarda em ferramentas de IA, contas pessoais na nuvem ou outros serviços.",
        "Você usa apenas as contas e os acessos que a organização fornece, com senhas fortes e verificação em duas etapas quando disponível. Você nunca compartilha senhas, dados de cartão de pagamento, PINs ou códigos de acesso pelo Handova, e devolve todos os acessos quando o trabalho termina.",
        "Se dados forem perdidos, compartilhados por engano ou acessados por quem não deveria, você avisa a organização e o Handova em até 24 horas e ajuda a corrigir a situação.",
      ]],
      "10. Conflicts of interest and your other commitments": ["10. Conflitos de interesse e seus outros compromissos", [
        "Você declara por escrito à organização e ao Handova qualquer conflito de interesse, por exemplo um vínculo pessoal, familiar, financeiro ou profissional com a organização, sua equipe, financiadores ou fornecedores. Você só segue adiante se o Handova e a organização concordarem sobre como ele será gerido.",
        "Você nunca recebe recomendação de uma organização que você dirige, na qual trabalha ou com a qual tem vínculo familiar próximo.",
        "Você se certifica de que sua contribuição é permitida pelo seu empregador ou por qualquer outro contrato que tenha, e não usa informações confidenciais, tempo ou recursos do seu empregador sem permissão.",
        "Você cumpre a lei aplicável a você, inclusive as normas tributárias, de proteção de dados e quaisquer regras sobre voluntariado do lugar onde vive.",
      ]],
      "11. Professional advice, quality and insurance": ["11. Aconselhamento profissional, qualidade e seguro", [
        "Sua contribuição apoia as decisões da própria organização. Aconselhamento jurídico, médico, financeiro, tributário ou outro aconselhamento regulamentado só é prestado se você tiver a habilitação necessária, se isso estiver previsto no acordo de contribuição e se existirem os termos à parte que sua profissão exigir.",
        "Você faz seu trabalho com cuidado e competência razoáveis, e é honesto(a) sobre o que pode e o que não pode fazer.",
        "Você avisa a organização se usou ferramentas de IA para produzir uma parte substancial do trabalho, e revisa tudo o que elas produzirem.",
        "O Handova não oferece seguro aos profissionais. Se o seu trabalho exigir seguro de responsabilidade civil profissional ou outro seguro, providenciá-lo é responsabilidade sua.",
      ]],
      "12. Representing the organisation and talking about the work": ["12. Representar a organização e falar sobre o trabalho", [
        "Você não fala, publica, assina, capta recursos nem assume compromissos em nome da organização, a menos que ela peça por escrito.",
        "Você só usa o nome, o logotipo ou os materiais dela para o trabalho combinado e para descrever sua contribuição em termos gerais. Qualquer coisa mais detalhada, você combina antes com a organização, e nunca compartilha nada confidencial.",
      ]],
      "13. The work you hand over": ["13. O trabalho que você entrega", [
        "Salvo acordo escrito em contrário com a organização, você concede à organização um direito gratuito, permanente, irrevogável e mundial de usar, copiar, adaptar e compartilhar o trabalho que você entrega para a missão dela, inclusive com seus parceiros e financiadores. Na medida em que a lei permitir, você não se oporá a que a organização o modifique.",
        "Você mantém tudo o que criou antes da colaboração ou fora dela, e seu conhecimento geral. Quando algo disso for incluído no trabalho, o mesmo direito se aplica.",
        "Você só entrega trabalho que tem o direito de compartilhar, sem material de terceiros que a organização não possa usar.",
        "Você pode descrever o trabalho no seu CV de impacto do Handova e mostrar em outros lugares as partes não confidenciais, por exemplo em um portfólio.",
      ]],
      "14. Your wellbeing": ["14. Seu bem-estar", [
        "Estabeleça limites que funcionem para você. Nunca se espera que você faça mais do que as horas combinadas, trabalhe em horários inadequados ou continue se não se sentir seguro(a) ou se sentir desconfortável. Avise-nos se uma organização pressionar você.",
      ]],
      "15. Our role": ["15. Nosso papel", [
        "O Handova analisa organizações e perfis e oferece as ferramentas para combinar, acompanhar e revisar o trabalho. Não somos parte do trabalho entre você e a organização, não o supervisionamos e não podemos garantir nenhum resultado.",
        "Nossas análises e verificações de identidade não são checagens de antecedentes, e um perfil ou a página de uma organização não é uma licença nem uma garantia.",
        "Na medida em que a lei permitir, a Ethical Bridge LLC não é responsável por perdas decorrentes do trabalho combinado entre você e uma organização. Nada neste acordo limita a responsabilidade por nossa própria negligência, por fraude ou por qualquer outra coisa que não possa ser legalmente limitada.",
      ]],
      "16. Breaches, suspension and reviews": ["16. Descumprimentos, suspensão e revisões", [
        "Se você descumprir este acordo ou colocar alguém em risco, podemos pausar suas colaborações, ocultar ou fechar seu perfil, reter ou remover recomendações e itens do seu CV de impacto, e informar as organizações com que você trabalha. Diante de preocupações graves, podemos agir imediatamente, e podemos compartilhar informações com as autoridades quando a lei ou a segurança de alguém exigir.",
        "Se suspendermos ou fecharmos seu perfil, você pode pedir uma revisão em até 30 dias escrevendo para hello@handova.org. As revisões são conduzidas pelo contato independente do Handova, conforme previsto nas nossas políticas.",
      ]],
      "17. Your data and this record": ["17. Seus dados e este registro", [
        "Tratamos seus dados conforme descrito no nosso aviso de privacidade e na nossa Política de Proteção de Dados. Seu perfil só é público quando você o publica e nós o aprovamos.",
        "Quando você assina, guardamos seu nome, endereço de e-mail, a data e a hora, seu endereço IP e navegador, as horas com que você se comprometeu, as confirmações que você marcou e o texto exato com que concordou. Mantemos este registro por seis anos após o encerramento da sua conta, para que as duas partes possam contar com ele, mesmo que você exclua sua conta.",
        "Para a verificação de identidade, a Didit trata seu documento e sua selfie como nossa prestadora de serviços, nos termos de um acordo de tratamento de dados conosco. Comparar sua selfie com a foto do seu documento envolve dados biométricos, que só são tratados com seu consentimento explícito, dado e registrado quando você inicia a verificação. Guardamos apenas o resultado, a data e o nome que consta no documento, que só nossos administradores podem ver.",
      ]],
      "18. Law, changes and contact": ["18. Lei aplicável, alterações e contato", [
        "Este acordo é regido pela legislação do estado de Wyoming (EUA). Isso não retira nenhuma proteção que você tenha pelas normas imperativas do país onde vive. Se surgir uma divergência, primeiro tentaremos resolvê-la com você de maneira informal.",
        "Se alterarmos este acordo, avisaremos você e pediremos que assine a nova versão antes que seu perfil possa ser publicado novamente ou que você assine um novo acordo de contribuição.",
        "Dúvidas? Escreva para hello@handova.org. Preocupações: safeguarding@handova.org.",
      ]],
    },
  },

  organisation: {
    version: "organisation-2026-10-20-v3",
    title: "Acordo de organização do Handova",
    summary: [
      "O Handova é gratuito. Este acordo é entre sua organização e a Ethical Bridge LLC, que administra o Handova.",
      "Sua organização é uma organização sem fins lucrativos de liderança local listada no diretório da Ethical Bridge, e a pessoa que assina está autorizada a assinar em nome dela.",
      "Cada necessidade é real e remota, tem um único resultado claro, leva no máximo 16 horas e nunca substitui um cargo remunerado.",
      "As necessidades nunca envolvem contato entre profissionais e crianças ou adultos em situação de risco. Dados pessoais só são compartilhados se o trabalho não puder ser feito sem eles e isso for combinado por escrito antes.",
      "Antes de começar qualquer trabalho, sua organização e o profissional assinam um acordo de contribuição, e você indica um ponto focal de salvaguarda.",
      "Não há dinheiro envolvido: nada de taxas, presentes ou pagamentos, e os profissionais nunca lidam com o dinheiro da sua organização.",
      "Você informa o Handova sobre qualquer preocupação em até 24 horas, segue o Código de Conduta e as políticas do Handova e nunca retalia quem relata uma preocupação.",
      "Você revisa as horas registradas em até 14 dias, escreve uma recomendação honesta e responde a um breve acompanhamento seis meses depois.",
      "Você pode usar livremente o trabalho para sua missão. Sua organização continua responsável pelas próprias decisões e dados.",
      "Se sua organização descumprir o acordo, podemos pausá-la ou removê-la. Você pode pedir uma revisão em até 30 dias.",
    ],
    sections: {
      "About this agreement": ["Sobre este acordo", [
        "O Handova é uma plataforma gratuita, administrada pela Ethical Bridge LLC, sociedade registrada em Wyoming (EUA), que conecta organizações sem fins lucrativos de liderança local a profissionais qualificados que dedicam seu tempo como voluntários. Este acordo é entre sua organização e a Ethical Bridge LLC. Ele define o que pedimos à sua organização, o que ela pode esperar de nós e como protegemos todas as pessoas: sua equipe, os profissionais e as pessoas que vocês atendem. Quem assina o faz em nome da organização.",
      ]],
      "1. Who can join": ["1. Quem pode participar", [
        "Sua organização não tem fins lucrativos e é de liderança local: sua direção está no lugar onde ela atua, e ela não distribui lucros a proprietários. Empresas e sociedades com fins lucrativos não podem participar. Ela é legalmente registrada, ou conta com patrocínio fiscal de uma organização sem fins lucrativos registrada, e está listada no diretório da Ethical Bridge.",
        "A pessoa que assina está autorizada a agir em nome da organização e a aceitar este acordo em nome dela. Podemos confirmar isso com o contato da ficha da sua organização no diretório da Ethical Bridge, ou por um e-mail do endereço web próprio da sua organização.",
        "Tudo o que vocês nos informam sobre a organização é verdadeiro e está atualizado. Podemos pedir documentos de registro, uma referência ou uma chamada curta antes de aprovar vocês.",
        "Sua organização, seus líderes e seus parceiros não estão envolvidos em terrorismo, violência, ódio, discriminação, tráfico de pessoas, corrupção ou qualquer outra atividade ilícita. A ajuda nunca é condicionada à religião, à política ou à identidade de ninguém.",
        "Vocês nos avisam prontamente sobre qualquer mudança no que está acima, ou sobre qualquer incidente grave ou investigação que envolva sua organização.",
      ]],
      "2. Needs you publish": ["2. As necessidades que vocês publicam", [
        "Cada necessidade é real, descreve um único resultado claro e leva no máximo 16 horas. Vocês só pedem trabalho que realmente vão usar.",
        "As necessidades são remotas. Elas nunca envolvem contato direto entre profissionais e crianças ou adultos em situação de risco, inclusive pesquisas, entrevistas, testes, grupos ou linhas de atendimento. A própria equipe de vocês realiza qualquer uma dessas atividades.",
        "Os profissionais trabalham com informações anonimizadas ou agregadas. Dados pessoais identificáveis das pessoas que vocês atendem só são compartilhados se o trabalho não puder ser feito sem eles, se vocês puderem compartilhá-los legalmente e se isso for combinado por escrito nas Mensagens do Handova antes do compartilhamento. Vocês nunca compartilham dados ou imagens de crianças, prontuários ou fichas de casos, documentos de identidade, localização de abrigos ou qualquer coisa que revele a situação migratória, de detenção, de saúde, de sobrevivente ou a orientação sexual de uma pessoa identificada.",
        "As necessidades nunca envolvem profissionais recebendo, guardando ou movimentando dinheiro da sua organização, nem aconselhamento regulamentado sem a habilitação adequada e termos à parte.",
        "As necessidades não substituem um cargo remunerado nem tarefas permanentes da equipe, e não são períodos de experiência não remunerados para um emprego.",
        "Vocês não usam o Handova para fazer publicidade, captar recursos entre os profissionais ou recrutar para trabalho remunerado.",
      ]],
      "3. How you work with professionals": ["3. Como vocês trabalham com os profissionais", [
        "Antes de começar qualquer trabalho, vocês assinam um acordo de contribuição com o profissional. Vocês não compartilham informações confidenciais nem dão acesso antes de ele ser assinado.",
        "Vocês dão ao profissional uma pessoa de contato, um briefing claro, as informações de que ele precisa e retornos no tempo certo. Vocês respondem a candidaturas e mensagens em um prazo razoável, normalmente em até uma semana.",
        "Vocês respeitam o escopo e as horas combinados. Vocês nunca pressionam um profissional a fazer mais, a trabalhar em horários inadequados ou a continuar se ele quiser parar.",
        "Vocês nunca pedem aos profissionais dinheiro, taxas, presentes ou favores, e nunca lhes oferecem pagamento, presentes ou hospitalidade. Qualquer despesa exige termos escritos à parte, combinados antes de ser feita.",
        "Vocês declaram qualquer conflito de interesse com um profissional, por exemplo um vínculo familiar ou de trabalho, e só seguem adiante se o Handova concordar sobre como ele será gerido. Vocês nunca recomendam um profissional que dirige sua organização ou trabalha nela, ou que seja parente próximo de alguém que faça isso.",
        "Vocês revisam com honestidade as horas registradas em até 14 dias. Quando o trabalho estiver concluído, a pessoa que acompanhou o trabalho escreve uma recomendação justa e verdadeira com suas próprias palavras, e vocês respondem, seis meses depois, a um breve acompanhamento sobre se o trabalho continua em uso.",
      ]],
      "4. Safeguarding": ["4. Salvaguarda", [
        `Vocês seguem ${POLICIES} em toda contribuição no Handova, e a política de salvaguarda própria de vocês, quando houver. Se forem diferentes, vale a regra mais rigorosa.`,
        "Vocês indicam um ponto focal de salvaguarda para cada contribuição ao assinar o respectivo acordo de contribuição, e explicam ao profissional como relatar uma preocupação antes de o trabalho começar.",
        "Vocês oferecem às pessoas que atendem uma forma de relatar preocupações, e encaminham ao Handova qualquer preocupação sobre um profissional do Handova.",
        "Vocês nunca compartilham imagens de crianças para uma contribuição no Handova, e não compartilham fotos, vídeos ou histórias de adultos sem o próprio processo de consentimento de vocês.",
        "Vocês tratam os profissionais com dignidade e respeito, e nunca os assediam, exploram ou discriminam.",
      ]],
      "5. Protection from sexual exploitation and abuse": ["5. Proteção contra exploração e abuso sexual", PSEA],
      "6. Reporting and responding to concerns": ["6. Como relatar e responder a preocupações", [
        "Se vocês souberem de uma preocupação envolvendo um profissional, uma colaboração do Handova ou qualquer pessoa ligada a ela, vocês informam o Handova em até 24 horas em safeguarding@handova.org ou com a função Relatar uma preocupação. Se alguém estiver em perigo imediato, entre em contato primeiro com os serviços de emergência locais. Preocupações sobre a fundadora do Handova vão para o contato independente do Handova, conforme previsto na nossa Política de Denúncia de Irregularidades.",
        "Vocês respondem às preocupações de acordo com a lei e com as próprias políticas, colocam em primeiro lugar a segurança e a vontade da pessoa afetada, mantêm o sigilo das informações e cooperam com qualquer análise do Handova ou das autoridades.",
        "Vocês nunca retaliam quem relata uma preocupação em que acredita honestamente.",
      ]],
      "7. Data protection and security": ["7. Proteção de dados e segurança", [
        "Sua organização continua responsável pelos dados pessoais que mantém. Vocês compartilham apenas o mínimo que o trabalho exige, anonimizado sempre que possível, por um canal seguro que escolherem.",
        "Vocês nunca pedem a um profissional que insira informações pessoais ou confidenciais em ferramentas de IA ou contas pessoais.",
        "Vocês nunca compartilham senhas, dados de cartão de pagamento, PINs ou códigos de acesso pelo Handova. Quando um profissional precisa acessar um sistema, vocês lhe dão uma conta própria com o mínimo de acesso necessário, e a removem quando o trabalho termina.",
        "Vocês avisam o profissional e o Handova em até 24 horas se suspeitarem que informações ligadas a uma contribuição no Handova foram perdidas, compartilhadas por engano ou acessadas sem permissão.",
      ]],
      "8. Using the work": ["8. Uso do trabalho", [
        "Salvo acordo escrito em contrário, o profissional concede à sua organização um direito gratuito, permanente, irrevogável e mundial de usar, copiar, adaptar e compartilhar o trabalho que ele entrega para a missão de vocês, inclusive com seus parceiros e financiadores.",
        "O trabalho apoia as decisões de vocês; sua organização continua responsável por elas e pelas próprias obrigações legais, financeiras e regulatórias. Busquem aconselhamento qualificado próprio quando necessário.",
        "O profissional pode descrever o trabalho no seu CV de impacto do Handova e mostrar em outros lugares as partes não confidenciais. Vocês não nomeiam nem mostram publicamente um profissional sem a concordância dele.",
      ]],
      "9. Visibility": ["9. Visibilidade", [
        "Depois da aprovação, o nome, o logotipo, a localização, o resumo e as necessidades publicadas da sua organização ficam públicos no Handova. O trabalho concluído, a recomendação de vocês e as horas entregues podem aparecer no CV de impacto do profissional e nos relatórios de impacto anonimizados do Handova.",
      ]],
      "10. Our role": ["10. Nosso papel", [
        "O Handova analisa organizações e perfis e oferece as ferramentas para combinar, acompanhar e revisar o trabalho. Não somos parte do trabalho entre vocês e um profissional, não o supervisionamos e não podemos garantir nenhum resultado.",
        "Nossas análises e verificações de identidade não são checagens de antecedentes, e um perfil não é uma licença nem uma garantia. Vocês continuam responsáveis pelas próprias verificações, políticas e decisões.",
        "Na medida em que a lei permitir, a Ethical Bridge LLC não é responsável por perdas decorrentes do trabalho combinado entre vocês e um profissional. Nada neste acordo limita a responsabilidade por nossa própria negligência, por fraude ou por qualquer outra coisa que não possa ser legalmente limitada.",
      ]],
      "11. Breaches, suspension and reviews": ["11. Descumprimentos, suspensão e revisões", [
        "Se sua organização descumprir este acordo ou colocar alguém em risco, podemos pausar suas necessidades e colaborações, reter ou remover recomendações, suspendê-la ou removê-la, e informar os profissionais envolvidos. Diante de preocupações graves, podemos agir imediatamente, e podemos compartilhar informações com as autoridades, com o diretório da Ethical Bridge ou com os órgãos reguladores competentes quando a lei ou a segurança de alguém exigir.",
        "Vocês podem pedir a revisão de uma suspensão ou remoção em até 30 dias escrevendo para hello@handova.org. As revisões são conduzidas pelo contato independente do Handova, conforme previsto nas nossas políticas.",
      ]],
      "12. Data and this record": ["12. Dados e este registro", [
        "Tratamos dados pessoais conforme descrito no nosso aviso de privacidade e na nossa Política de Proteção de Dados.",
        "Quando vocês assinam, guardamos o nome, o cargo e o endereço de e-mail de quem assina, a data e a hora, o endereço IP e o navegador, as confirmações marcadas e o texto exato aceito. Mantemos este registro por seis anos após o encerramento da conta da organização, para que as duas partes possam contar com ele.",
      ]],
      "13. Law, changes and contact": ["13. Lei aplicável, alterações e contato", [
        "Este acordo é regido pela legislação do estado de Wyoming (EUA). Isso não retira nenhuma proteção que sua organização tenha pelas normas imperativas do país onde está registrada. Se surgir uma divergência, primeiro tentaremos resolvê-la com vocês de maneira informal.",
        "Se alterarmos este acordo, avisaremos vocês e pediremos que assinem a nova versão antes de publicarem novas necessidades.",
        "Dúvidas? Escreva para hello@handova.org. Preocupações: safeguarding@handova.org.",
      ]],
    },
  },

  // Contribution agreement v3, built from the same scope as the English (src/agreement.js, contributionSections).
  contribution: {
    version: "contribution-2026-10-v3",
    org: "a organização",
    pro: "o profissional",
    sections: (v) => ({
      "1. Parties": ["1. Partes", [
        `Este acordo é celebrado entre ${v.org}${v.orgCountry}, que assina por meio da pessoa indicada abaixo, e ${v.pro}${v.proCountry}. O Handova, administrado pela Ethical Bridge LLC (Wyoming, EUA), fornece a plataforma e mantém o registro deste acordo, mas não é parte dele.`,
      ]],
      "2. Agreed contribution": ["2. Contribuição combinada", [
        v.output,
        `Contexto: ${v.description}`,
        `Horas estimadas: ${v.hours}. Idiomas de trabalho: ${v.languages}. Remoto. Data de entrega: combinada pelas duas partes na primeira chamada e registrada nas Mensagens do Handova.`,
      ]],
      "3. Scope, changes and communication": ["3. Escopo, alterações e comunicação", [
        "Antes de o trabalho começar, as duas partes combinam nas Mensagens do Handova o cronograma, a pessoa de contato da organização, como o trabalho será revisado e o que fica fora do escopo. Qualquer mudança no resultado, nas horas ou no prazo é combinada por escrito nas Mensagens antes de o trabalho adicional começar. Passar de 16 horas exige uma nova necessidade e um novo acordo. As mensagens ficam no Handova; dados de contato pessoais só são compartilhados depois que as duas partes assinarem, e só se ambas quiserem.",
      ]],
      "4. Confidentiality, data and access": ["4. Confidencialidade, dados e acesso", [
        "Cada parte usa as informações confidenciais apenas para esta contribuição e compartilha o mínimo necessário, por um canal seguro combinado. **Senhas, dados de cartão de pagamento, PINs e códigos de acesso nunca são compartilhados pelo Handova.** Qualquer acesso a sistemas usa contas individuais e limitadas, removidas quando o trabalho termina. Informações pessoais, confidenciais, de relatos, de identidade ou de salvaguarda nunca são inseridas em ferramentas de IA ou contas pessoais, e são devolvidas ou excluídas na entrega. Qualquer suspeita de violação de dados é comunicada à outra parte e ao Handova em até 24 horas.",
        `${v.org} é responsável (o “controlador”) pelos dados pessoais que compartilha. O profissional os usa apenas conforme as instruções da organização, como voluntário que atua sob a autoridade dela, e para nenhuma outra finalidade. O profissional trabalha com informações anonimizadas ou agregadas. Dados pessoais identificáveis das pessoas atendidas pela organização só são compartilhados se o trabalho não puder ser feito sem eles, se a organização puder compartilhá-los legalmente com o profissional no país dele e se as duas partes registrarem antes, nas Mensagens, quais dados, por quê, como serão mantidos seguros e quando serão excluídos. Dados ou imagens de crianças, prontuários ou fichas de casos, documentos de identidade e localização de abrigos nunca são compartilhados. Na entrega ou quando a contribuição terminar, o profissional exclui ou devolve quaisquer dados pessoais e confirma isso nas Mensagens.`,
      ]],
      "5. Use of the work and public evidence": ["5. Uso do trabalho e evidência pública", [
        `O profissional concede à organização um direito gratuito, permanente, irrevogável e mundial de usar, copiar, adaptar e compartilhar os entregáveis para a missão dela, inclusive com seus parceiros e financiadores. Na medida em que a lei permitir, o profissional não se oporá a que a organização modifique o trabalho. O profissional mantém os materiais, ferramentas e conhecimentos que criou antes desta contribuição ou fora dela; quando algum deles for incluído nos entregáveis, o mesmo direito se aplica. O profissional informa a organização sobre qualquer material de terceiros, de código aberto ou gerado por IA incluído nos entregáveis, e sobre os respectivos termos de licença.`,
        "Nada confidencial aparece em um CV de impacto público. O profissional decide se o registro revisado é publicado, e pode mostrar em outros lugares as partes não confidenciais do trabalho.",
      ]],
      "6. Safeguarding": ["6. Salvaguarda", [
        "Esta contribuição é remota e não envolve nenhum contato direto com crianças ou adultos em situação de risco. As duas partes seguem a Política de Salvaguarda e o Código de Conduta do Handova, e a política de salvaguarda própria da organização, quando houver; se forem diferentes, vale a regra mais rigorosa. O ponto focal de salvaguarda da organização para esta contribuição é indicado junto com a assinatura dela, abaixo. Qualquer das partes pausa o trabalho e relata qualquer preocupação em até 24 horas à outra parte e ao Handova em safeguarding@handova.org.",
      ]],
      "7. Relationship, responsibility and liability": ["7. Relação, responsabilidade e obrigações", [
        "Esta é uma contribuição profissional voluntária. Ela não cria emprego, pagamento, sociedade nem relação de representação. Não se dão nem se aceitam presentes, pagamentos ou favores, e o profissional nunca recebe, guarda ou movimenta dinheiro da organização. Qualquer despesa exige termos escritos à parte. Trabalho jurídico, médico, financeiro ou de outra forma regulamentado exige a habilitação adequada e termos à parte.",
        "O profissional dedica seu tempo como voluntário e trabalha com cuidado e competência razoáveis, mas não garante nenhum resultado. A organização decide se e como usar o trabalho, e o revisa antes de se basear nele. Na medida em que a lei permitir, nenhuma das partes responde perante a outra por danos indiretos, e o profissional só responde por dolo ou culpa grave. Diante de um erro comum, inclusive com dados, o profissional avisa imediatamente a organização e o Handova e ajuda a corrigi-lo. Nem o Handova nem a organização oferecem seguro ao profissional. Cada parte também se compromete, em benefício da outra, a cumprir o acordo do Handova que assinou.",
        "O Handova verifica a identidade dos profissionais, mas não verifica qualificações nem resultados.",
      ]],
      "8. Ending the contribution": ["8. Encerramento da contribuição", [
        "Qualquer das partes pode encerrar a contribuição a qualquer momento por esta página, informando um motivo breve. Quando ela termina, o profissional entrega o trabalho em andamento que a organização pedir, e devolve ou exclui as informações e os acessos da organização em até 7 dias. As obrigações de confidencialidade, de dados, de uso do trabalho e de salvaguarda continuam após o encerramento. O trabalho concluído é revisado pela organização antes de contar.",
      ]],
      "9. Disagreements and applicable law": ["9. Divergências e lei aplicável", [
        "Este acordo é regido pela lei do país onde a organização está registrada. Se surgir uma divergência, as duas partes tentam primeiro resolvê-la de boa-fé. Qualquer uma delas pode pedir ajuda ao Handova. O Handova não decide disputas sobre o trabalho, mas pode agir de acordo com as próprias políticas, por exemplo diante de uma preocupação de salvaguarda ou de conduta. Nada aqui retira qualquer direito que uma das partes tenha pela lei do lugar onde vive.",
      ]],
      "10. Language and record": ["10. Idioma e registro", [
        "Este acordo é redigido em inglês. Se uma tradução exibida no Handova for diferente, prevalece a versão em inglês. O Handova guarda o texto assinado, cada assinatura e seu horário por seis anos após o fim da contribuição ou o encerramento da conta, para que as duas partes possam contar com eles.",
      ]],
    }),
  },
};
