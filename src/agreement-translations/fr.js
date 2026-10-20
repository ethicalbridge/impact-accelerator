// Reading copy in French (international) of the Handova agreements v3. NOT BINDING: the English text in src/agreement.js
// is what people sign and what is hashed. Each section is keyed by its exact English heading and holds
// [translated heading, [paragraphs in the same order as the English]]. When an English version changes, update this
// file and its `version`; until then the reading copy is hidden and the page says the agreement is in English only.
const PSEA = [
  "L’exploitation et les abus sexuels constituent des fautes graves et entraînent l’exclusion immédiate de Handova.",
  "Aucune activité sexuelle avec une personne de moins de 18 ans, quel que soit l’âge du consentement local. Se tromper sur l’âge d’une personne ne constitue pas une excuse.",
  "N’échangez jamais d’argent, de travail, d’aide, de services ou de faveurs contre des relations ou des faveurs sexuelles, et ne vous livrez à aucun autre comportement humiliant, dégradant ou relevant de l’exploitation.",
  "Toute relation sexuelle avec les personnes qu’accompagne une organisation impliquant un usage abusif de sa position est interdite. Sur Handova, les professionnels n’ont aucun contact personnel avec elles.",
  "Si vous avez une préoccupation ou un soupçon d’exploitation ou d’abus sexuels de la part de toute personne liée à Handova, vous devez le signaler.",
  "Chacun est responsable de créer et de maintenir un environnement qui prévient l’exploitation et les abus sexuels.",
];
const POLICIES = "le Code de conduite de Handova et les politiques de Handova en matière de protection, de lutte contre le harcèlement, de protection des données, de fraude et d’alerte, publiés sur handova.org/#policies";

export default {
  lang: "fr",
  ui: {
    name: "Français",
    summaryTitle: "Ce que vous acceptez",
    summaryNote: "Ce résumé est là pour vous aider. Ce que vous signez, c’est l’accord complet ci-dessous, et c’est lui qui s’applique en cas de différence.",
    toTranslation: "Lire en français (copie de lecture ; seule la version anglaise fait foi)",
    toEnglish: "Afficher le texte anglais (la version qui fait foi)",
    englishNote: "Vous signez le texte anglais, qui est la seule version qui fait foi. La copie de lecture en français est là pour vous aider à le comprendre.",
    readingNote: "Copie de lecture en français. Elle n’est pas signée et n’a pas de valeur juridique : l’accord qui engage les parties est le texte anglais.",
    englishOnly: "Pour l’instant, cet accord n’existe qu’en anglais.",
    readingCopy: "Copie de lecture en français",
    download: "Télécharger le PDF",
    textLabel: "Texte de l’accord",
    englishText: "texte anglais",
  },

  professional: {
    version: "professional-2026-10-20-v3",
    title: "Accord des professionnels Handova",
    summary: [
      "Handova est gratuit et vous intervenez bénévolement, sans rémunération. Cet accord est conclu entre vous et Ethical Bridge LLC, qui gère Handova.",
      "Vous vous inscrivez sous votre propre identité, vous avez 18 ans ou plus et vous vérifiez votre identité avant votre premier accord de contribution.",
      "Vous proposez au moins 4 heures par mois. Après trois mois sans activité, votre profil est marqué comme inactif et, après six mois, il est fermé. Vous pouvez le republier à tout moment.",
      "Tout le travail se fait à distance. Vous ne contactez jamais les personnes qu’accompagne une organisation, et vous travaillez avec des informations anonymisées.",
      "Avant tout travail, vous signez un accord de contribution. Vous respectez le périmètre convenu et ne saisissez que les heures réellement travaillées.",
      "Aucun paiement, cadeau ni faveur, aucune vente de vos services, et vous ne manipulez jamais l’argent d’une organisation.",
      "Vous préservez la confidentialité des informations de l’organisation et ne saisissez jamais d’informations personnelles ou confidentielles dans des outils d’IA.",
      "Vous signalez toute préoccupation dans les 24 heures et respectez le Code de conduite et les politiques de Handova.",
      "L’organisation peut utiliser librement, pour sa mission, le travail que vous remettez, et vous pouvez le décrire sur votre CV d’impact.",
      "Si vous ne respectez pas l’accord, nous pouvons suspendre ou fermer votre profil. Vous pouvez demander un réexamen dans un délai de 30 jours.",
    ],
    sections: {
      "About this agreement": ["À propos de cet accord", [
        "Handova est une plateforme gratuite, gérée par Ethical Bridge LLC, société enregistrée dans le Wyoming (États-Unis), qui met en relation des professionnels qualifiés avec des organisations à but non lucratif à direction locale. Cet accord est conclu entre vous et Ethical Bridge LLC. Il précise ce que nous vous demandons, ce que vous pouvez attendre de nous et comment nous assurons la sécurité de chacun : vous, les organisations et les personnes qu’elles accompagnent. Lisez-le attentivement. Vous le signez une seule fois et nous en conservons une trace.",
      ]],
      "1. Who can join": ["1. Qui peut s’inscrire", [
        "Vous avez 18 ans ou plus.",
        "Vous vous inscrivez sous votre propre identité. Votre nom, votre photo, votre expérience et votre formation sont exacts et correspondent à votre profil LinkedIn. Nous pouvons vous demander un court appel vidéo ou une référence avant de vous approuver.",
        "Avant de signer votre premier accord de contribution, vous vérifiez votre identité auprès de notre prestataire de vérification d’identité, Didit, à l’aide d’un passeport ou d’une carte d’identité en cours de validité et d’un selfie en direct. Handova ne reçoit que le résultat et le nom figurant sur votre document, jamais les images. Si vous préférez ne pas utiliser Didit, vous pouvez demander un court appel vidéo au cours duquel vous montrez votre pièce d’identité à Handova à la caméra.",
        "Vous confirmez que vous n’avez jamais été licencié, ni n’avez quitté un poste pendant une enquête, pour exploitation, abus ou harcèlement sexuels ; que vous n’avez jamais été condamné pour une infraction commise contre un enfant ou un adulte vulnérable ; et qu’il ne vous est pas interdit de travailler avec des enfants ou des adultes vulnérables. Nous enregistrons seulement que vous l’avez confirmé. Nous ne demandons jamais de détails ni d’extraits de casier.",
        "Vous nous informez sans tarder de tout changement important, y compris concernant le point ci-dessus.",
      ]],
      "2. Your monthly commitment": ["2. Votre engagement mensuel", [
        "Vous vous engagez sur un nombre d’heures par mois, au moins 4. Vous choisissez ce nombre sur votre profil et pouvez le modifier à tout moment.",
        "Les organisations s’organisent en fonction des heures que vous affichez : ne proposez que le temps que vous pouvez réellement donner.",
      ]],
      "3. Keeping the community active": ["3. Garder la communauté active", [
        "Handova fonctionne parce que les organisations peuvent compter sur les personnes qu’elles y trouvent. Leur temps est précieux, et nous ne voulons pas qu’elles le passent à contacter des profils qui ne sont plus actifs.",
        "Est considéré comme une activité le fait de postuler à un besoin, d’accepter une invitation, de travailler sur une mission ou de voir son travail recommandé par une organisation.",
        "Après trois mois sans aucune activité, votre profil est marqué comme inactif. Il reste en ligne, mais les organisations voient que vous n’avez pas été actif récemment.",
        "Après six mois sans aucune activité, nous fermons votre profil. Il est dépublié et n’est plus visible par les organisations.",
        "Nous vous prévenons par e-mail deux semaines avant chaque étape. Toute activité rend immédiatement votre profil de nouveau actif, et une mission en cours compte toujours. Une contribution interrompue parce que vous avez signalé une préoccupation n’est jamais retenue contre vous.",
        "La fermeture n’est pas une sanction. Vous pouvez republier votre profil quand vous le souhaitez, et nous l’examinerons avant sa remise en ligne.",
      ]],
      "4. Voluntary, unpaid and remote": ["4. Bénévole, non rémunéré et à distance", [
        "Les contributions sont bénévoles et non rémunérées. Elles ne créent ni emploi, ni contrat de travail, ni association, ni mandat avec Handova, Ethical Bridge LLC ou l’organisation.",
        "Vous ne demandez ni n’acceptez jamais de paiement, de cadeau, d’invitation ou de faveur en lien avec une contribution sur Handova. Toute dépense nécessite des conditions écrites distinctes, convenues avec l’organisation avant d’engager la moindre somme.",
        "Vous ne recevez, ne détenez ni ne transférez jamais l’argent d’une organisation.",
        "Vous n’utilisez pas Handova pour vendre des services, démarcher des clients ou proposer un travail rémunéré. Si un poste rémunéré se libère de façon indépendante au sein de l’organisation, vous postulez par sa procédure de recrutement ouverte habituelle, et non par Handova.",
        "Les contributions sur Handova se font à distance. Les rencontres en personne ne font pas partie de Handova, et les heures passées en personne ne sont pas saisies sur Handova.",
      ]],
      "5. How engagements work": ["5. Le déroulement des missions", [
        "Avant tout travail, vous et l’organisation signez un accord de contribution qui précise le livrable, les heures, les accès et la confidentialité. Vous n’effectuez aucun travail et ne recevez aucune information confidentielle avant sa signature.",
        "Vous respectez le périmètre et les heures convenus. Si le travail s’étend, vous convenez d’abord du changement avec l’organisation.",
        "Vous saisissez vos heures honnêtement et uniquement pour le travail réellement effectué. Inventer ou gonfler des heures, des recommandations ou des preuves constitue une fraude et entraîne l’exclusion.",
        "Vous remettez le travail de façon que l’équipe puisse continuer à s’en servir, avec les explications ou la formation nécessaires.",
        "Si vous ne pouvez plus continuer, vous prévenez l’organisation le plus tôt possible et mettez fin à la mission via Handova.",
      ]],
      "6. Safeguarding and do no harm": ["6. Protection et principe de ne pas nuire", [
        `Vous respectez ${POLICIES}, ainsi que le code de conduite et la politique de protection propres à l’organisation, le cas échéant. En cas de différence, la règle la plus stricte s’applique.`,
        "Vous ne contactez, ne rencontrez, n’écrivez ni ne suivez jamais sur les réseaux sociaux les personnes qu’accompagne une organisation, et vous ne déplacez jamais le contact avec elles en dehors de Handova. Vous pouvez concevoir des enquêtes, des entretiens ou des tests, mais c’est le personnel de l’organisation qui les mène.",
        "Vous travaillez avec des informations anonymisées ou agrégées. Vous ne voyez de données personnelles identifiantes sur les personnes qu’accompagne une organisation que si le travail ne peut pas se faire sans elles et si cela est convenu par écrit dans les Messages de Handova avant leur partage. Vous ne recevez jamais de données ni d’images d’enfants, de dossiers individuels, de pièces d’identité, d’adresses de lieux d’hébergement protégés, ni rien qui révèle la situation migratoire, de détention, de santé, de survivant ou l’orientation sexuelle d’une personne identifiée.",
        "Si un besoin s’avère impliquer des contacts ou des données au-delà de ce qui était convenu, vous vous arrêtez et le signalez.",
        "Si vous connaissez déjà une personne accompagnée par l’organisation, vous en informez l’organisation et Handova avant le début du travail.",
        "Vous ne maltraitez, n’exploitez, ne harcelez, n’intimidez ni ne discriminez jamais personne, en ligne comme hors ligne.",
        "Vous ne prenez, ne demandez ni ne partagez de photos, de vidéos, de témoignages ou d’informations sur les personnes qu’accompagne une organisation, et vous n’utilisez jamais d’images d’enfants.",
        "Vous respectez le leadership local : l’organisation décide de ce dont elle a besoin et de la façon dont son travail est mené.",
        "Vous n’utilisez pas une mission pour promouvoir des opinions religieuses, politiques ou commerciales.",
      ]],
      "7. Protection from sexual exploitation and abuse": ["7. Protection contre l’exploitation et les abus sexuels", PSEA],
      "8. Reporting concerns": ["8. Signaler une préoccupation", [
        "Si vous êtes témoin, soupçonnez ou êtes informé d’un préjudice, d’un abus, d’une exploitation ou d’une fraude, vous le signalez dans les 24 heures au point focal de protection de l’organisation et à Handova, à safeguarding@handova.org ou avec la fonction Signaler un problème. Si une personne est en danger immédiat, contactez d’abord les services d’urgence locaux.",
        "Si vous êtes vous-même victime de harcèlement, nous vous encourageons à le signaler dès que possible, mais le choix vous appartient.",
        "Si la préoccupation concerne l’organisation elle-même ou son point focal, signalez-la uniquement à Handova. Si elle concerne la fondatrice de Handova, elle est adressée au contact indépendant de Handova, comme prévu par notre Politique d’alerte.",
        "Signalez toute préoccupation à laquelle vous croyez sincèrement. Vous n’avez pas besoin de preuves. Vous ne serez pas pénalisé pour avoir signalé une préoccupation, même si elle s’avère infondée, et vous n’exercez jamais de représailles contre quiconque en signale une.",
        "Vous n’enquêtez pas vous-même sur une préoccupation. Vous coopérez à tout examen mené par l’organisation, par Handova ou par les autorités, et vous en préservez la confidentialité.",
      ]],
      "9. Confidentiality, data and security": ["9. Confidentialité, données et sécurité", [
        "Vous préservez la confidentialité des informations de l’organisation, pendant la mission et après, et ne les utilisez que pour le travail convenu.",
        "Pour toute donnée personnelle, vous agissez uniquement sur instruction de l’organisation. Vous ne consultez et ne conservez que ce dont le travail a besoin, et vous le restituez ou le supprimez lors de la remise.",
        "Vous ne saisissez jamais d’informations personnelles, confidentielles, liées à un signalement, à l’identité ou à la protection dans des outils d’IA, des comptes cloud personnels ou d’autres services.",
        "Vous n’utilisez que les comptes et les accès que l’organisation vous fournit, avec des mots de passe robustes et la validation en deux étapes lorsqu’elle est disponible. Vous ne partagez jamais de mots de passe, de données de carte de paiement, de codes PIN ou de codes d’accès via Handova, et vous restituez tous les accès à la fin du travail.",
        "Si des données sont perdues, partagées par erreur ou consultées par une personne qui ne devrait pas y avoir accès, vous en informez l’organisation et Handova dans les 24 heures et aidez à y remédier.",
      ]],
      "10. Conflicts of interest and your other commitments": ["10. Conflits d’intérêts et vos autres engagements", [
        "Vous déclarez par écrit à l’organisation et à Handova tout conflit d’intérêts, par exemple un lien personnel, familial, financier ou professionnel avec l’organisation, son personnel, ses bailleurs ou ses fournisseurs. Vous ne poursuivez que si Handova et l’organisation conviennent de la manière de le gérer.",
        "Vous n’êtes jamais recommandé par une organisation que vous dirigez, pour laquelle vous travaillez ou avec laquelle vous avez un lien familial proche.",
        "Vous vous assurez que votre contribution est autorisée par votre employeur ou par tout autre contrat qui vous lie, et vous n’utilisez pas les informations confidentielles, le temps ou les ressources de votre employeur sans autorisation.",
        "Vous respectez la loi qui vous est applicable, notamment en matière fiscale, de protection des données et de bénévolat dans votre lieu de résidence.",
      ]],
      "11. Professional advice, quality and insurance": ["11. Conseil professionnel, qualité et assurance", [
        "Votre contribution soutient les décisions propres à l’organisation. Un conseil juridique, médical, financier, fiscal ou tout autre conseil réglementé n’est fourni que si vous êtes qualifié, si cela est prévu dans l’accord de contribution et si les conditions distinctes exigées par votre profession sont en place.",
        "Vous effectuez votre travail avec un soin et une compétence raisonnables, et vous êtes honnête sur ce que vous pouvez et ne pouvez pas faire.",
        "Vous indiquez à l’organisation si vous avez utilisé des outils d’IA pour produire une part substantielle du travail, et vous vérifiez tout ce qu’ils produisent.",
        "Handova ne fournit pas d’assurance aux professionnels. Si votre travail nécessite une assurance responsabilité civile professionnelle ou une autre assurance, il vous appartient de la souscrire.",
      ]],
      "12. Representing the organisation and talking about the work": ["12. Représenter l’organisation et parler du travail", [
        "Vous ne vous exprimez pas, ne publiez pas, ne signez pas, ne collectez pas de fonds et ne prenez pas d’engagements au nom de l’organisation, sauf si elle vous le demande par écrit.",
        "Vous n’utilisez son nom, son logo ou ses documents que pour le travail convenu et pour décrire votre contribution en termes généraux. Pour tout élément plus détaillé, vous obtenez d’abord l’accord de l’organisation, et vous ne partagez jamais rien de confidentiel.",
      ]],
      "13. The work you hand over": ["13. Le travail que vous remettez", [
        "Sauf accord écrit contraire avec l’organisation, vous accordez à l’organisation un droit gratuit, permanent, irrévocable et mondial d’utiliser, de copier, d’adapter et de partager le travail que vous remettez pour sa mission, y compris avec ses partenaires et ses bailleurs. Dans la mesure permise par la loi, vous ne vous opposerez pas à ce que l’organisation le modifie.",
        "Vous conservez tout ce que vous avez créé avant la mission ou en dehors de celle-ci, ainsi que votre savoir-faire général. Lorsque l’un de ces éléments est intégré au travail, le même droit s’y applique.",
        "Vous ne remettez que du travail que vous avez le droit de partager, sans contenu de tiers que l’organisation ne pourrait pas utiliser.",
        "Vous pouvez décrire le travail sur votre CV d’impact Handova et en montrer ailleurs les parties non confidentielles, par exemple dans un portfolio.",
      ]],
      "14. Your wellbeing": ["14. Votre bien-être", [
        "Fixez les limites qui vous conviennent. On n’attend jamais de vous que vous dépassiez les heures convenues, que vous travailliez à des horaires déraisonnables ni que vous continuiez si vous vous sentez en danger ou mal à l’aise. Prévenez-nous si une organisation fait pression sur vous.",
      ]],
      "15. Our role": ["15. Notre rôle", [
        "Handova examine les organisations et les profils et fournit les outils pour convenir du travail, le suivre et l’évaluer. Nous ne sommes pas partie au travail entre vous et l’organisation, nous ne le supervisons pas et ne pouvons garantir aucun résultat.",
        "Nos examens et nos vérifications d’identité ne sont pas des vérifications des antécédents, et un profil ou une page d’organisation n’est ni une habilitation ni une garantie.",
        "Dans la mesure permise par la loi, Ethical Bridge LLC n’est pas responsable des pertes résultant du travail convenu entre vous et une organisation. Rien dans cet accord ne limite la responsabilité pour notre propre négligence, pour fraude, ni pour tout ce qui ne peut légalement être limité.",
      ]],
      "16. Breaches, suspension and reviews": ["16. Manquements, suspension et réexamen", [
        "Si vous manquez à cet accord ou mettez quelqu’un en danger, nous pouvons suspendre vos missions, masquer ou fermer votre profil, retenir ou retirer des recommandations et des entrées de votre CV d’impact, et en informer les organisations avec lesquelles vous travaillez. En cas de préoccupation grave, nous pouvons agir immédiatement, et nous pouvons communiquer des informations aux autorités lorsque la loi ou la sécurité d’une personne l’exige.",
        "Si nous suspendons ou fermons votre profil, vous pouvez demander un réexamen dans un délai de 30 jours en écrivant à hello@handova.org. Les réexamens sont confiés au contact indépendant de Handova, comme prévu par nos politiques.",
      ]],
      "17. Your data and this record": ["17. Vos données et cette trace", [
        "Nous traitons vos données comme décrit dans notre avis de confidentialité et notre Politique de protection des données. Votre profil n’est public que lorsque vous le publiez et que nous l’approuvons.",
        "Lorsque vous signez, nous conservons votre nom, votre adresse e-mail, la date et l’heure, votre adresse IP et votre navigateur, les heures sur lesquelles vous vous êtes engagé, les confirmations cochées et le texte exact accepté. Nous conservons cette trace pendant six ans après la fermeture de votre compte, afin que les deux parties puissent s’y référer, même si vous supprimez votre compte.",
        "Pour la vérification d’identité, Didit traite votre document et votre selfie en tant que notre prestataire, dans le cadre d’un accord de traitement des données conclu avec nous. La comparaison de votre selfie avec la photo de votre document fait appel à des données biométriques, traitées uniquement avec votre consentement explicite, donné et enregistré au début de la vérification. Nous ne conservons que le résultat, la date et le nom figurant sur le document, visibles uniquement par nos administrateurs.",
      ]],
      "18. Law, changes and contact": ["18. Droit applicable, modifications et contact", [
        "Cet accord est régi par le droit de l’État du Wyoming (États-Unis). Cela ne vous prive d’aucune protection dont vous bénéficiez en vertu des dispositions impératives du pays où vous vivez. En cas de désaccord, nous chercherons d’abord à le résoudre avec vous à l’amiable.",
        "Si nous modifions cet accord, nous vous en informerons et vous demanderons de signer la nouvelle version avant que votre profil puisse être republié ou que vous signiez un nouvel accord de contribution.",
        "Des questions ? Écrivez à hello@handova.org. Préoccupations : safeguarding@handova.org.",
      ]],
    },
  },

  organisation: {
    version: "organisation-2026-10-20-v3",
    title: "Accord des organisations Handova",
    summary: [
      "Handova est gratuit. Cet accord est conclu entre votre organisation et Ethical Bridge LLC, qui gère Handova.",
      "Votre organisation est une organisation à but non lucratif à direction locale, inscrite dans l’annuaire Ethical Bridge, et la personne qui signe est habilitée à signer en son nom.",
      "Chaque besoin est réel et à distance, a un seul livrable clair, prend au plus 16 heures et ne remplace jamais un poste rémunéré.",
      "Les besoins n’impliquent jamais de contact entre les professionnels et des enfants ou des adultes vulnérables. Les données personnelles ne sont partagées que si le travail ne peut pas se faire sans elles et que vous l’avez convenu par écrit au préalable.",
      "Avant tout travail, votre organisation et le professionnel signent un accord de contribution, et vous désignez un point focal de protection.",
      "Aucun argent n’est échangé : ni frais, ni cadeaux, ni paiements, et les professionnels ne manipulent jamais l’argent de votre organisation.",
      "Vous signalez toute préoccupation à Handova dans les 24 heures, respectez le Code de conduite et les politiques de Handova, et n’exercez jamais de représailles contre quiconque signale une préoccupation.",
      "Vous examinez les heures saisies dans les 14 jours, rédigez une recommandation honnête et répondez à un court suivi six mois plus tard.",
      "Vous pouvez utiliser librement le travail pour votre mission. Votre organisation reste responsable de ses propres décisions et données.",
      "Si votre organisation ne respecte pas l’accord, nous pouvons la suspendre ou la retirer. Vous pouvez demander un réexamen dans un délai de 30 jours.",
    ],
    sections: {
      "About this agreement": ["À propos de cet accord", [
        "Handova est une plateforme gratuite, gérée par Ethical Bridge LLC, société enregistrée dans le Wyoming (États-Unis), qui met en relation des organisations à but non lucratif à direction locale avec des professionnels qualifiés qui donnent leur temps bénévolement. Cet accord est conclu entre votre organisation et Ethical Bridge LLC. Il précise ce que nous demandons à votre organisation, ce qu’elle peut attendre de nous et comment nous assurons la sécurité de chacun : votre équipe, les professionnels et les personnes que vous accompagnez. La personne qui signe le fait au nom de l’organisation.",
      ]],
      "1. Who can join": ["1. Qui peut s’inscrire", [
        "Votre organisation est à but non lucratif et à direction locale : sa direction est basée là où elle agit, et elle ne distribue pas de bénéfices à des propriétaires. Les entreprises et sociétés à but lucratif ne peuvent pas s’inscrire. Elle est légalement enregistrée, ou bénéficie du parrainage fiscal d’une organisation à but non lucratif enregistrée, et elle est inscrite dans l’annuaire Ethical Bridge.",
        "La personne qui signe est habilitée à agir pour l’organisation et à accepter cet accord en son nom. Nous pouvons le vérifier auprès du contact de la fiche de votre organisation dans l’annuaire Ethical Bridge, ou par un e-mail provenant de l’adresse web propre à votre organisation.",
        "Tout ce que vous nous indiquez sur l’organisation est exact et à jour. Nous pouvons demander des documents d’enregistrement, une référence ou un court appel avant de vous approuver.",
        "Votre organisation, ses dirigeants et ses partenaires ne sont impliqués dans aucun acte de terrorisme, de violence, de haine, de discrimination, de traite, de corruption ni dans aucune autre activité illicite. L’aide n’est jamais conditionnée à la religion, aux opinions politiques ou à l’identité de quiconque.",
        "Vous nous informez sans tarder de tout changement concernant ce qui précède, ou de tout incident grave ou enquête impliquant votre organisation.",
      ]],
      "2. Needs you publish": ["2. Les besoins que vous publiez", [
        "Chaque besoin est réel, décrit un seul livrable clair et prend au plus 16 heures. Vous ne demandez que du travail que vous utiliserez vraiment.",
        "Les besoins se font à distance. Ils n’impliquent jamais de contact direct entre les professionnels et des enfants ou des adultes vulnérables, y compris pour des enquêtes, des entretiens, des tests, des groupes ou des lignes d’écoute. Votre propre personnel mène toutes ces activités.",
        "Les professionnels travaillent avec des informations anonymisées ou agrégées. Les données personnelles identifiantes des personnes que vous accompagnez ne sont partagées que si le travail ne peut pas se faire sans elles, si vous pouvez légalement les partager et si cela est convenu par écrit dans les Messages de Handova avant leur partage. Vous ne partagez jamais de données ni d’images d’enfants, de dossiers individuels, de pièces d’identité, d’adresses de lieux d’hébergement protégés, ni rien qui révèle la situation migratoire, de détention, de santé, de survivant ou l’orientation sexuelle d’une personne identifiée.",
        "Les besoins n’impliquent jamais que des professionnels reçoivent, détiennent ou transfèrent l’argent de votre organisation, ni un conseil réglementé sans les qualifications appropriées et des conditions distinctes.",
        "Les besoins ne remplacent ni un poste rémunéré ni des tâches permanentes du personnel, et ne sont pas des périodes d’essai non rémunérées pour un emploi.",
        "Vous n’utilisez pas Handova pour faire de la publicité, collecter des fonds auprès des professionnels ou recruter pour un travail rémunéré.",
      ]],
      "3. How you work with professionals": ["3. Comment vous travaillez avec les professionnels", [
        "Avant tout travail, vous signez un accord de contribution avec le professionnel. Vous ne partagez aucune information confidentielle et ne donnez aucun accès avant sa signature.",
        "Vous donnez au professionnel une personne de contact, un cahier des charges clair, les informations dont il a besoin et des retours en temps utile. Vous répondez aux candidatures et aux messages dans un délai raisonnable, généralement sous une semaine.",
        "Vous respectez le périmètre et les heures convenus. Vous ne faites jamais pression sur un professionnel pour qu’il en fasse plus, travaille à des horaires déraisonnables ou continue s’il souhaite arrêter.",
        "Vous ne demandez jamais aux professionnels d’argent, de frais, de cadeaux ou de faveurs, et vous ne leur offrez jamais de paiement, de cadeau ou d’invitation. Toute dépense nécessite des conditions écrites distinctes, convenues avant qu’elle soit engagée.",
        "Vous déclarez tout conflit d’intérêts avec un professionnel, par exemple un lien familial ou professionnel, et ne poursuivez que si Handova convient de la manière de le gérer. Vous ne recommandez jamais un professionnel qui dirige votre organisation ou y travaille, ni un proche parent d’une personne dans ce cas.",
        "Vous examinez honnêtement les heures saisies dans les 14 jours. Une fois le travail terminé, la personne qui a vu le travail rédige une recommandation juste et sincère avec ses propres mots, et vous répondez six mois plus tard à un court suivi indiquant si le travail est toujours utilisé.",
      ]],
      "4. Safeguarding": ["4. Protection", [
        `Vous respectez ${POLICIES} pour chaque contribution sur Handova, ainsi que votre propre politique de protection, le cas échéant. En cas de différence, la règle la plus stricte s’applique.`,
        "Vous désignez un point focal de protection pour chaque contribution lorsque vous signez son accord de contribution, et vous expliquez au professionnel comment signaler une préoccupation avant le début du travail.",
        "Vous offrez aux personnes que vous accompagnez un moyen de signaler des préoccupations, et vous transmettez à Handova toute préoccupation concernant un professionnel de Handova.",
        "Vous ne partagez jamais d’images d’enfants pour une contribution sur Handova, et vous ne partagez aucune photo, vidéo ni témoignage d’adultes sans votre propre procédure de consentement.",
        "Vous traitez les professionnels avec dignité et respect, et vous ne les harcelez, ne les exploitez ni ne les discriminez jamais.",
      ]],
      "5. Protection from sexual exploitation and abuse": ["5. Protection contre l’exploitation et les abus sexuels", PSEA],
      "6. Reporting and responding to concerns": ["6. Signaler les préoccupations et y répondre", [
        "Si vous avez connaissance d’une préoccupation concernant un professionnel, une mission Handova ou toute personne qui y est liée, vous en informez Handova dans les 24 heures à safeguarding@handova.org ou avec la fonction Signaler un problème. Si une personne est en danger immédiat, contactez d’abord les services d’urgence locaux. Les préoccupations concernant la fondatrice de Handova sont adressées au contact indépendant de Handova, comme prévu par notre Politique d’alerte.",
        "Vous répondez aux préoccupations conformément à la loi et à vos propres politiques, faites passer en premier la sécurité et les souhaits de la personne concernée, préservez la confidentialité des informations et coopérez à tout examen mené par Handova ou par les autorités.",
        "Vous n’exercez jamais de représailles contre quiconque signale une préoccupation à laquelle il croit sincèrement.",
      ]],
      "7. Data protection and security": ["7. Protection des données et sécurité", [
        "Votre organisation reste responsable des données personnelles qu’elle détient. Vous ne partagez que le minimum nécessaire au travail, anonymisé dans la mesure du possible, par un canal sécurisé de votre choix.",
        "Vous ne demandez jamais à un professionnel de saisir des informations personnelles ou confidentielles dans des outils d’IA ou des comptes personnels.",
        "Vous ne partagez jamais de mots de passe, de données de carte de paiement, de codes PIN ou de codes d’accès via Handova. Lorsqu’un professionnel a besoin d’accéder à un système, vous lui donnez son propre compte avec le minimum d’accès nécessaire, et vous le supprimez à la fin du travail.",
        "Vous informez le professionnel et Handova dans les 24 heures si vous soupçonnez que des informations liées à une contribution sur Handova ont été perdues, partagées par erreur ou consultées sans autorisation.",
      ]],
      "8. Using the work": ["8. Utilisation du travail", [
        "Sauf accord écrit contraire, le professionnel accorde à votre organisation un droit gratuit, permanent, irrévocable et mondial d’utiliser, de copier, d’adapter et de partager le travail qu’il remet pour votre mission, y compris avec vos partenaires et vos bailleurs.",
        "Le travail éclaire vos décisions ; votre organisation en reste responsable, ainsi que de ses propres obligations juridiques, financières et réglementaires. Faites appel à vos propres conseils qualifiés si nécessaire.",
        "Le professionnel peut décrire le travail sur son CV d’impact Handova et en montrer ailleurs les parties non confidentielles. Vous ne nommez ni ne montrez publiquement un professionnel sans son accord.",
      ]],
      "9. Visibility": ["9. Visibilité", [
        "Une fois approuvés, le nom, le logo, la localisation, la présentation et les besoins publiés de votre organisation sont publics sur Handova. Le travail terminé, votre recommandation et les heures remises peuvent apparaître sur le CV d’impact du professionnel et dans les rapports d’impact anonymisés de Handova.",
      ]],
      "10. Our role": ["10. Notre rôle", [
        "Handova examine les organisations et les profils et fournit les outils pour convenir du travail, le suivre et l’évaluer. Nous ne sommes pas partie au travail entre vous et un professionnel, nous ne le supervisons pas et ne pouvons garantir aucun résultat.",
        "Nos examens et nos vérifications d’identité ne sont pas des vérifications des antécédents, et un profil n’est ni une habilitation ni une garantie. Vous restez responsable de vos propres vérifications, politiques et décisions.",
        "Dans la mesure permise par la loi, Ethical Bridge LLC n’est pas responsable des pertes résultant du travail convenu entre vous et un professionnel. Rien dans cet accord ne limite la responsabilité pour notre propre négligence, pour fraude, ni pour tout ce qui ne peut légalement être limité.",
      ]],
      "11. Breaches, suspension and reviews": ["11. Manquements, suspension et réexamen", [
        "Si votre organisation manque à cet accord ou met quelqu’un en danger, nous pouvons suspendre ses besoins et ses missions, retenir ou retirer des recommandations, la suspendre ou la retirer, et en informer les professionnels concernés. En cas de préoccupation grave, nous pouvons agir immédiatement, et nous pouvons communiquer des informations aux autorités, à l’annuaire Ethical Bridge ou aux autorités de régulation compétentes lorsque la loi ou la sécurité d’une personne l’exige.",
        "Vous pouvez demander le réexamen d’une suspension ou d’un retrait dans un délai de 30 jours en écrivant à hello@handova.org. Les réexamens sont confiés au contact indépendant de Handova, comme prévu par nos politiques.",
      ]],
      "12. Data and this record": ["12. Données et cette trace", [
        "Nous traitons les données personnelles comme décrit dans notre avis de confidentialité et notre Politique de protection des données.",
        "Lorsque vous signez, nous conservons le nom, la fonction et l’adresse e-mail du signataire, la date et l’heure, l’adresse IP et le navigateur, les confirmations cochées et le texte exact accepté. Nous conservons cette trace pendant six ans après la fermeture du compte de l’organisation, afin que les deux parties puissent s’y référer.",
      ]],
      "13. Law, changes and contact": ["13. Droit applicable, modifications et contact", [
        "Cet accord est régi par le droit de l’État du Wyoming (États-Unis). Cela ne prive votre organisation d’aucune protection dont elle bénéficie en vertu des dispositions impératives du pays où elle est enregistrée. En cas de désaccord, nous chercherons d’abord à le résoudre avec vous à l’amiable.",
        "Si nous modifions cet accord, nous vous en informerons et vous demanderons de signer la nouvelle version avant de publier de nouveaux besoins.",
        "Des questions ? Écrivez à hello@handova.org. Préoccupations : safeguarding@handova.org.",
      ]],
    },
  },

  // Contribution agreement v3, built from the same scope as the English (src/agreement.js, contributionSections).
  contribution: {
    version: "contribution-2026-10-v3",
    org: "l’organisation",
    pro: "le professionnel",
    sections: (v) => ({
      "1. Parties": ["1. Parties", [
        `Cet accord est conclu entre ${v.org}${v.orgCountry}, représentée par la personne nommée ci-dessous, et ${v.pro}${v.proCountry}. Handova, géré par Ethical Bridge LLC (Wyoming, États-Unis), fournit la plateforme et conserve la trace de cet accord, mais n’y est pas partie.`,
      ]],
      "2. Agreed contribution": ["2. Contribution convenue", [
        v.output,
        `Contexte : ${v.description}`,
        `Heures estimées : ${v.hours}. Langues de travail : ${v.languages}. À distance. Date de livraison : convenue par les deux parties lors de leur premier appel et consignée dans les Messages de Handova.`,
      ]],
      "3. Scope, changes and communication": ["3. Périmètre, modifications et communication", [
        "Avant le début du travail, les deux parties conviennent dans les Messages de Handova du calendrier, de la personne de contact de l’organisation, de la manière dont le travail sera relu et de ce qui est hors périmètre. Toute modification du livrable, des heures ou de l’échéance est convenue par écrit dans les Messages avant le début du travail supplémentaire. Dépasser 16 heures nécessite un nouveau besoin et un nouvel accord. Les messages restent sur Handova ; les coordonnées personnelles ne sont partagées qu’une fois que les deux parties ont signé, et seulement si toutes deux le souhaitent.",
      ]],
      "4. Confidentiality, data and access": ["4. Confidentialité, données et accès", [
        "Chaque partie n’utilise les informations confidentielles que pour cette contribution et ne partage que le strict nécessaire, par un canal sécurisé convenu. **Les mots de passe, les données de carte de paiement, les codes PIN et les codes d’accès ne sont jamais partagés via Handova.** Tout accès à un système se fait par des comptes individuels et limités, supprimés à la fin du travail. Les informations personnelles, confidentielles, liées à un signalement, à l’identité ou à la protection ne sont jamais saisies dans des outils d’IA ou des comptes personnels, et sont restituées ou supprimées lors de la remise. Toute violation de données présumée est signalée à l’autre partie et à Handova dans les 24 heures.",
        `${v.org} est responsable (le « responsable du traitement ») des données personnelles qu’elle partage. Le professionnel ne les utilise que sur instruction de l’organisation, en tant que bénévole agissant sous son autorité, et à aucune autre fin. Le professionnel travaille avec des informations anonymisées ou agrégées. Les données personnelles identifiantes des personnes qu’accompagne l’organisation ne sont partagées que si le travail ne peut pas se faire sans elles, si l’organisation peut légalement les communiquer au professionnel dans son pays et si les deux parties consignent au préalable dans les Messages quelles données, pourquoi, comment elles sont sécurisées et quand elles sont supprimées. Les données ou images d’enfants, les dossiers individuels, les pièces d’identité et les adresses de lieux d’hébergement protégés ne sont jamais partagés. Lors de la remise ou à la fin de la contribution, le professionnel supprime ou restitue toute donnée personnelle et le confirme dans les Messages.`,
      ]],
      "5. Use of the work and public evidence": ["5. Utilisation du travail et preuves publiques", [
        `Le professionnel accorde à ${v.org} un droit gratuit, permanent, irrévocable et mondial d’utiliser, de copier, d’adapter et de partager les livrables pour sa mission, y compris avec ses partenaires et ses bailleurs. Dans la mesure permise par la loi, le professionnel ne s’opposera pas à ce que l’organisation modifie le travail. Le professionnel conserve les contenus, outils et savoir-faire qu’il a créés avant cette contribution ou en dehors de celle-ci ; lorsque l’un d’eux est intégré aux livrables, le même droit s’y applique. Le professionnel informe l’organisation de tout contenu de tiers, open source ou généré par IA figurant dans les livrables, ainsi que de ses conditions de licence.`,
        "Aucune information confidentielle n’apparaît sur un CV d’impact public. Le professionnel décide si la trace examinée est publiée, et peut montrer ailleurs les parties non confidentielles du travail.",
      ]],
      "6. Safeguarding": ["6. Protection", [
        "Cette contribution se fait à distance et n’implique aucun contact direct avec des enfants ou des adultes vulnérables. Les deux parties respectent la Politique de protection et le Code de conduite de Handova, ainsi que la politique de protection propre à l’organisation, le cas échéant ; en cas de différence, la règle la plus stricte s’applique. Le point focal de protection de l’organisation pour cette contribution est indiqué avec sa signature, ci-dessous. Chaque partie suspend le travail et signale toute préoccupation dans les 24 heures à l’autre partie et à Handova, à safeguarding@handova.org.",
      ]],
      "7. Relationship, responsibility and liability": ["7. Relation, responsabilités et responsabilité juridique", [
        "Il s’agit d’une contribution professionnelle bénévole. Elle ne crée ni emploi, ni rémunération, ni association, ni mandat. Aucun cadeau, paiement ou faveur n’est offert ni accepté, et le professionnel ne reçoit, ne détient ni ne transfère jamais l’argent de l’organisation. Toute dépense nécessite des conditions écrites distinctes. Un travail juridique, médical, financier ou autrement réglementé nécessite les qualifications appropriées et des conditions distinctes.",
        "Le professionnel donne son temps bénévolement et travaille avec un soin et une compétence raisonnables, mais ne garantit aucun résultat. L’organisation décide si et comment elle utilise le travail, et le vérifie avant de s’y fier. Dans la mesure permise par la loi, aucune partie n’est responsable envers l’autre des préjudices indirects, et le professionnel n’est responsable qu’en cas de faute intentionnelle ou de faute lourde. En cas d’erreur ordinaire, y compris concernant des données, le professionnel en informe immédiatement l’organisation et Handova et aide à y remédier. Ni Handova ni l’organisation ne fournissent d’assurance au professionnel. Chaque partie s’engage également, au bénéfice de l’autre, à respecter l’accord Handova qu’elle a signé.",
        "Handova vérifie l’identité des professionnels, mais ne vérifie ni les qualifications ni les résultats.",
      ]],
      "8. Ending the contribution": ["8. Fin de la contribution", [
        "Chaque partie peut mettre fin à la contribution à tout moment depuis cette page, en indiquant brièvement un motif. À la fin, le professionnel remet le travail en cours que l’organisation demande, et restitue ou supprime les informations et les accès de l’organisation dans un délai de 7 jours. Les obligations de confidentialité, relatives aux données, à l’utilisation du travail et à la protection perdurent après la fin. Le travail terminé est examiné par l’organisation avant d’être comptabilisé.",
      ]],
      "9. Disagreements and applicable law": ["9. Désaccords et droit applicable", [
        "Cet accord est régi par le droit du pays où l’organisation est enregistrée. En cas de désaccord, les deux parties cherchent d’abord à le résoudre de bonne foi. Chacune peut demander l’aide de Handova. Handova ne tranche pas les litiges relatifs au travail, mais peut agir en application de ses propres politiques, par exemple en cas de préoccupation liée à la protection ou à la conduite. Rien dans les présentes ne prive l’une ou l’autre partie d’un droit dont elle dispose en vertu de la loi du lieu où elle vit.",
      ]],
      "10. Language and record": ["10. Langue et trace", [
        "Cet accord est rédigé en anglais. Si une traduction affichée sur Handova diffère, la version anglaise prévaut. Handova conserve le texte signé, chaque signature et son heure pendant six ans après la fin de la contribution ou la fermeture du compte, afin que les deux parties puissent s’y référer.",
      ]],
    }),
  },
};
