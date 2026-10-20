// Reading copy in Spanish (neutral Latin American) of the Handova agreements v3. NOT BINDING: the English text in
// src/agreement.js is what people sign and what is hashed. Each section is keyed by its exact English heading and
// holds [translated heading, [paragraphs in the same order as the English]]. When an English version changes, update
// this file and its `version`; until then the reading copy is hidden and the page says the agreement is in English only.
const PSEA = [
  "La explotación y el abuso sexuales constituyen faltas de conducta graves y son motivo de expulsión inmediata de Handova.",
  "Está prohibida toda actividad sexual con personas menores de 18 años, cualquiera sea la edad de consentimiento local. Creer erróneamente que una persona tiene más edad no constituye una defensa.",
  "Nunca intercambies dinero, trabajo, ayuda, servicios o favores por sexo o favores sexuales, ni incurras en cualquier otro comportamiento humillante, degradante o de explotación.",
  "Está prohibida toda relación sexual con las personas a las que atiende una organización que implique un uso indebido de la propia posición. En Handova, los profesionales no tienen ningún contacto personal con ellas.",
  "Si tienes una inquietud o sospecha de explotación o abuso sexual por parte de cualquier persona vinculada a Handova, debes reportarla.",
  "Todas las personas son responsables de crear y mantener un entorno que prevenga la explotación y el abuso sexuales.",
];
const POLICIES = "el Código de Conducta de Handova y las políticas de Handova sobre salvaguarda, acoso, protección de datos, fraude y denuncia de irregularidades, publicados en handova.org/#policies";

export default {
  lang: "es",
  ui: {
    name: "Español",
    summaryTitle: "Lo que aceptas",
    summaryNote: "Este resumen es una ayuda. Lo que firmas es el acuerdo completo que aparece abajo, y es el que se aplica si algo difiere.",
    toTranslation: "Leer en español (copia de lectura; la versión en inglés es la vinculante)",
    toEnglish: "Ver el texto en inglés (la versión vinculante)",
    englishNote: "Firmas el texto en inglés, que es la única versión vinculante. La copia de lectura en español está para ayudarte a entenderlo.",
    readingNote: "Copia de lectura en español. No se firma y no tiene efecto legal: el acuerdo vinculante es el texto en inglés.",
    englishOnly: "Por ahora, este acuerdo solo está disponible en inglés.",
    readingCopy: "Copia de lectura en español",
    download: "Descargar PDF",
    textLabel: "Texto del acuerdo",
    englishText: "texto en inglés",
  },

  professional: {
    version: "professional-2026-10-20-v3",
    title: "Acuerdo profesional de Handova",
    summary: [
      "Handova es gratuita y colaboras como voluntario/a, sin remuneración. Este acuerdo es entre tú y Ethical Bridge LLC, que gestiona Handova.",
      "Te unes con tu propia identidad, tienes 18 años o más y verificas tu identidad antes de tu primer acuerdo de contribución.",
      "Ofreces al menos 4 horas al mes. Tras tres meses sin actividad tu perfil se marca como inactivo y, tras seis, se cierra. Puedes volver a publicarlo cuando quieras.",
      "Todo el trabajo es a distancia. Nunca contactas a las personas a las que atiende una organización y trabajas con información anonimizada.",
      "Antes de empezar cualquier trabajo firmas un acuerdo de contribución. Respetas el alcance acordado y registras solo las horas que realmente trabajaste.",
      "Sin pagos, regalos ni favores, sin vender tus servicios, y nunca manejas el dinero de una organización.",
      "Mantienes la confidencialidad de la información de la organización y nunca introduces información personal o confidencial en herramientas de IA.",
      "Reportas cualquier inquietud dentro de las 24 horas y sigues el Código de Conducta y las políticas de Handova.",
      "La organización puede usar libremente para su misión el trabajo que entregas, y tú puedes describirlo en tu CV de impacto.",
      "Si incumples el acuerdo, podemos pausar o cerrar tu perfil. Puedes pedir una revisión dentro de los 30 días.",
    ],
    sections: {
      "About this agreement": ["Acerca de este acuerdo", [
        "Handova es una plataforma gratuita, gestionada por Ethical Bridge LLC, sociedad registrada en Wyoming (EE. UU.), que conecta a profesionales con habilidades con organizaciones sin fines de lucro de liderazgo local. Este acuerdo es entre tú y Ethical Bridge LLC. Establece lo que te pedimos, lo que puedes esperar de nosotros y cómo protegemos a todas las personas: a ti, a las organizaciones y a las personas a las que atienden. Léelo con atención. Lo firmas una sola vez y conservamos un registro.",
      ]],
      "1. Who can join": ["1. Quién puede unirse", [
        "Tienes 18 años o más.",
        "Te unes con tu propia identidad. Tu nombre, foto, experiencia y formación son verdaderos y coinciden con tu perfil de LinkedIn. Podemos pedirte una videollamada breve o una referencia antes de aprobarte.",
        "Antes de firmar tu primer acuerdo de contribución, verificas tu identidad con nuestro proveedor de verificación de identidad, Didit, usando un pasaporte o documento de identidad válido y una selfie en vivo. Handova recibe solo el resultado y el nombre que figura en tu documento, nunca las imágenes. Si prefieres no usar Didit, puedes pedir una videollamada breve en la que muestras tu documento de identidad a Handova por cámara.",
        "Confirmas que nunca has sido despedido/a, ni te has retirado durante una investigación, por explotación, abuso o acoso sexual; que nunca has sido condenado/a por un delito contra un niño, una niña o un adulto en situación de riesgo, y que no tienes prohibido trabajar con niños, niñas o adultos en situación de riesgo. Solo registramos que lo confirmaste. Nunca pedimos detalles ni antecedentes.",
        "Nos avisas sin demora si cambia algo importante, incluido cualquier aspecto del punto anterior.",
      ]],
      "2. Your monthly commitment": ["2. Tu compromiso mensual", [
        "Te comprometes con una cantidad de horas al mes, como mínimo 4. Eliges la cantidad en tu perfil y puedes cambiarla en cualquier momento.",
        "Las organizaciones planifican en función de las horas que muestras, así que ofrece solo el tiempo que realmente puedes dar.",
      ]],
      "3. Keeping the community active": ["3. Mantener activa la comunidad", [
        "Handova funciona porque las organizaciones pueden contar con las personas que encuentran aquí. Su tiempo es valioso y no queremos que lo dediquen a contactar perfiles que ya no están activos.",
        "Se considera actividad postularte a una necesidad, aceptar una invitación, trabajar en una colaboración o que una organización avale tu trabajo.",
        "Si pasan tres meses sin ninguna actividad, tu perfil se marca como inactivo. Sigue en línea, pero las organizaciones ven que no has tenido actividad recientemente.",
        "Si pasan seis meses sin ninguna actividad, cerramos tu perfil. Deja de estar publicado y ya no es visible para las organizaciones.",
        "Te avisaremos por correo dos semanas antes de cada paso. Cualquier actividad vuelve a activar tu perfil de inmediato, y una colaboración en curso siempre cuenta. Una contribución que terminó porque planteaste una inquietud nunca cuenta en tu contra.",
        "El cierre no es una sanción. Puedes volver a publicar tu perfil cuando quieras, y lo revisaremos antes de que vuelva a estar en línea.",
      ]],
      "4. Voluntary, unpaid and remote": ["4. Voluntario, no remunerado y a distancia", [
        "Las contribuciones son voluntarias y no remuneradas. No crean un empleo, un contrato de trabajo, una sociedad ni una relación de representación con Handova, Ethical Bridge LLC ni la organización.",
        "Nunca pides ni aceptas pagos, regalos, invitaciones ni favores relacionados con una contribución en Handova. Cualquier gasto requiere condiciones escritas por separado, acordadas con la organización antes de gastar nada.",
        "Nunca recibes, guardas ni transfieres dinero de una organización.",
        "No usas Handova para vender servicios, captar clientes ni ofrecer trabajo remunerado. Si surge de forma independiente un puesto remunerado en la organización, te postulas mediante su proceso abierto habitual, no a través de Handova.",
        "Las contribuciones en Handova son a distancia. Las reuniones presenciales no forman parte de Handova, y las horas dedicadas en persona no se registran en Handova.",
      ]],
      "5. How engagements work": ["5. Cómo funcionan las colaboraciones", [
        "Antes de empezar cualquier trabajo, tú y la organización firman un acuerdo de contribución que establece el resultado, las horas, el acceso y la confidencialidad. No haces ningún trabajo ni recibes información confidencial antes de que esté firmado.",
        "Respetas el alcance y las horas acordados. Si el trabajo crece, acuerdas primero el cambio con la organización.",
        "Registras tus horas con honestidad y solo por el trabajo que realmente hiciste. Inventar o inflar horas, avales o pruebas es fraude y da lugar a la expulsión.",
        "Entregas el trabajo de manera que el equipo pueda seguir usándolo, con la explicación o la capacitación que necesite.",
        "Si ya no puedes continuar, se lo dices a la organización lo antes posible y finalizas la colaboración a través de Handova.",
      ]],
      "6. Safeguarding and do no harm": ["6. Salvaguarda y acción sin daño", [
        `Sigues ${POLICIES}, y el código de conducta y la política de salvaguarda propios de la organización, si los tiene. Si difieren, se aplica la norma más estricta.`,
        "Nunca contactas, conoces en persona, envías mensajes ni sigues en redes sociales a las personas a las que atiende una organización, y nunca trasladas fuera de Handova el contacto con ellas. Puedes diseñar encuestas, entrevistas o pruebas, pero las realiza el propio personal de la organización.",
        "Trabajas con información anonimizada o agregada. Solo ves datos personales identificables de las personas a las que atiende una organización si el trabajo no puede hacerse sin ellos y así se acuerda por escrito en los Mensajes de Handova antes de compartirlos. Nunca recibes datos ni imágenes de niños o niñas, expedientes de casos, documentos de identidad, ubicaciones de refugios ni nada que revele la situación migratoria, de detención, de salud, de sobreviviente o la orientación sexual de una persona identificada.",
        "Si resulta que una necesidad implica un contacto o datos que van más allá de lo acordado, te detienes y lo reportas.",
        "Si ya conoces a alguna persona a la que atiende la organización, se lo dices a la organización y a Handova antes de que empiece el trabajo.",
        "Nunca abusas, explotas, acosas, intimidas ni discriminas a nadie, en línea o fuera de línea.",
        "No tomas, pides ni compartes fotos, videos, historias ni información sobre las personas a las que atiende una organización, y nunca usas imágenes de niños o niñas.",
        "Respetas el liderazgo local: la organización decide lo que necesita y cómo se hace su trabajo.",
        "No usas una colaboración para promover opiniones religiosas, políticas ni comerciales.",
      ]],
      "7. Protection from sexual exploitation and abuse": ["7. Protección contra la explotación y el abuso sexuales", PSEA],
      "8. Reporting concerns": ["8. Reporte de inquietudes", [
        "Si ves, sospechas o te informan de un daño, abuso, explotación o fraude, lo reportas dentro de las 24 horas al punto focal de salvaguarda de la organización y a Handova en safeguarding@handova.org, o con la función Reportar un problema. Si alguien está en peligro inmediato, contacta primero a los servicios de emergencia locales.",
        "Si eres tú quien sufre acoso, te animamos a reportarlo lo antes posible, pero la decisión es tuya.",
        "Si la inquietud tiene que ver con la propia organización o con su punto focal, repórtala solo a Handova. Si se refiere a la fundadora de Handova, va al contacto independiente de Handova, como se establece en nuestra Política de Denuncia de Irregularidades.",
        "Reporta cualquier inquietud en la que creas honestamente. No necesitas pruebas. No se te sancionará por plantear una inquietud, aunque resulte infundada, y nunca tomas represalias contra quien plantea una.",
        "No investigas tú mismo/a una inquietud. Colaboras con cualquier revisión de la organización, de Handova o de las autoridades, y mantienes la confidencialidad.",
      ]],
      "9. Confidentiality, data and security": ["9. Confidencialidad, datos y seguridad", [
        "Mantienes la confidencialidad de la información de la organización, durante la colaboración y después, y la usas solo para el trabajo acordado.",
        "Con cualquier dato personal, actúas solo según las instrucciones de la organización. Ves y conservas solo lo que el trabajo necesita, y lo devuelves o eliminas en la entrega.",
        "Nunca introduces información personal, confidencial, de reportes, de identidad o de salvaguarda en herramientas de IA, cuentas personales en la nube ni otros servicios.",
        "Usas solo las cuentas y los accesos que te da la organización, con contraseñas seguras y verificación en dos pasos cuando esté disponible. Nunca compartes contraseñas, datos de tarjetas de pago, PIN ni códigos de acceso a través de Handova, y devuelves todos los accesos cuando termina el trabajo.",
        "Si se pierden datos, se comparten por error o accede a ellos alguien que no debería, se lo dices a la organización y a Handova dentro de las 24 horas y ayudas a remediarlo.",
      ]],
      "10. Conflicts of interest and your other commitments": ["10. Conflictos de intereses y tus otros compromisos", [
        "Declaras por escrito a la organización y a Handova cualquier conflicto de intereses, por ejemplo un vínculo personal, familiar, económico o profesional con la organización, su personal, sus financiadores o sus proveedores. Solo sigues adelante si Handova y la organización acuerdan cómo gestionarlo.",
        "Nunca recibes el aval de una organización que diriges, en la que trabajas o con la que tienes un vínculo familiar cercano.",
        "Te aseguras de que tu contribución esté permitida por tu empleador o por cualquier otro contrato que tengas, y no usas la información confidencial, el tiempo ni los recursos de tu empleador sin permiso.",
        "Cumples la ley que te resulta aplicable, incluidas las normas tributarias, de protección de datos y cualquier norma sobre voluntariado del lugar donde vives.",
      ]],
      "11. Professional advice, quality and insurance": ["11. Asesoramiento profesional, calidad y seguros", [
        "Tu contribución apoya las propias decisiones de la organización. Solo se presta asesoramiento legal, médico, financiero, tributario u otro asesoramiento regulado si tienes la habilitación correspondiente, se acuerda en el acuerdo de contribución y existen las condiciones separadas que exija tu profesión.",
        "Haces tu trabajo con un cuidado y una competencia razonables, y eres honesto/a sobre lo que puedes y no puedes hacer.",
        "Le dices a la organización si usaste herramientas de IA para producir una parte sustancial del trabajo, y revisas todo lo que produzcan.",
        "Handova no ofrece seguros a los profesionales. Si tu trabajo requiere un seguro de responsabilidad profesional u otro seguro, contratarlo es tu responsabilidad.",
      ]],
      "12. Representing the organisation and talking about the work": ["12. Representar a la organización y hablar del trabajo", [
        "No hablas, publicas, firmas, recaudas fondos ni asumes compromisos en nombre de la organización, salvo que ella te lo pida por escrito.",
        "Solo usas su nombre, logotipo o materiales para el trabajo acordado y para describir tu contribución en términos generales. Cualquier cosa más detallada la acuerdas antes con la organización, y nunca compartes nada confidencial.",
      ]],
      "13. The work you hand over": ["13. El trabajo que entregas", [
        "Salvo que acuerdes otra cosa por escrito con la organización, le concedes a la organización un derecho gratuito, permanente, irrevocable y mundial de usar, copiar, adaptar y compartir el trabajo que entregas para su misión, incluso con sus socios y financiadores. En la medida en que la ley lo permita, no te opondrás a que la organización lo modifique.",
        "Conservas todo lo que creaste antes de la colaboración o fuera de ella, y tus conocimientos generales. Cuando algo de ello se incluya en el trabajo, se le aplica el mismo derecho.",
        "Solo entregas trabajo que tienes derecho a compartir, sin material de terceros que la organización no pueda usar.",
        "Puedes describir el trabajo en tu CV de impacto de Handova y mostrar en otros lugares sus partes no confidenciales, por ejemplo en un portafolio.",
      ]],
      "14. Your wellbeing": ["14. Tu bienestar", [
        "Pon los límites que te sirvan. Nunca se espera que hagas más de las horas acordadas, que trabajes en horarios irrazonables ni que continúes si te sientes inseguro/a o incómodo/a. Avísanos si una organización te presiona.",
      ]],
      "15. Our role": ["15. Nuestro papel", [
        "Handova revisa organizaciones y perfiles y ofrece las herramientas para acordar, seguir y revisar el trabajo. No somos parte del trabajo entre tú y la organización, no lo supervisamos y no podemos garantizar ningún resultado.",
        "Nuestras revisiones y verificaciones de identidad no son verificaciones de antecedentes, y un perfil o la página de una organización no son una habilitación ni una garantía.",
        "En la medida en que la ley lo permita, Ethical Bridge LLC no es responsable de las pérdidas derivadas del trabajo acordado entre tú y una organización. Nada de este acuerdo limita la responsabilidad por nuestra propia negligencia, por fraude ni por nada que no pueda limitarse legalmente.",
      ]],
      "16. Breaches, suspension and reviews": ["16. Incumplimientos, suspensión y revisiones", [
        "Si incumples este acuerdo o pones a alguien en riesgo, podemos pausar tus colaboraciones, ocultar o cerrar tu perfil, retener o retirar avales y entradas de tu CV de impacto, e informar a las organizaciones con las que trabajas. Ante inquietudes graves podemos actuar de inmediato, y podemos compartir información con las autoridades cuando la ley o la seguridad de alguien lo exija.",
        "Si suspendemos o cerramos tu perfil, puedes pedir una revisión dentro de los 30 días escribiendo a hello@handova.org. Las revisiones las lleva a cabo el contacto independiente de Handova, como se establece en nuestras políticas.",
      ]],
      "17. Your data and this record": ["17. Tus datos y este registro", [
        "Tratamos tus datos como se describe en nuestro aviso de privacidad y en nuestra Política de Protección de Datos. Tu perfil es público solo cuando lo publicas y lo aprobamos.",
        "Cuando firmas, guardamos tu nombre, tu dirección de correo, la fecha y la hora, tu dirección IP y tu navegador, las horas con las que te comprometiste, las confirmaciones que marcaste y el texto exacto que aceptaste. Conservamos este registro durante seis años después del cierre de tu cuenta, para que ambas partes puedan contar con él, incluso si eliminas tu cuenta.",
        "Para la verificación de identidad, Didit trata tu documento y tu selfie como nuestro proveedor de servicios, en virtud de un acuerdo de tratamiento de datos con nosotros. Comparar tu selfie con la foto de tu documento implica datos biométricos, que solo se tratan con tu consentimiento explícito, otorgado y registrado cuando inicias la verificación. Solo conservamos el resultado, la fecha y el nombre que figura en el documento, que solo pueden ver nuestros administradores.",
      ]],
      "18. Law, changes and contact": ["18. Ley aplicable, cambios y contacto", [
        "Este acuerdo se rige por las leyes del estado de Wyoming (EE. UU.). Esto no te quita ninguna protección que te otorguen las normas imperativas del país donde vives. Si surge un desacuerdo, primero intentaremos resolverlo contigo de manera informal.",
        "Si modificamos este acuerdo, te lo informaremos y te pediremos que firmes la nueva versión antes de que tu perfil pueda volver a publicarse o de que firmes un nuevo acuerdo de contribución.",
        "¿Preguntas? Escribe a hello@handova.org. Inquietudes: safeguarding@handova.org.",
      ]],
    },
  },

  organisation: {
    version: "organisation-2026-10-20-v3",
    title: "Acuerdo de organización de Handova",
    summary: [
      "Handova es gratuita. Este acuerdo es entre tu organización y Ethical Bridge LLC, que gestiona Handova.",
      "Tu organización es una organización sin fines de lucro de liderazgo local que figura en el directorio de Ethical Bridge, y la persona que firma está autorizada para firmar en su nombre.",
      "Cada necesidad es real y a distancia, tiene un único resultado claro, lleva como máximo 16 horas y nunca reemplaza un puesto remunerado.",
      "Las necesidades nunca implican contacto entre profesionales y niños, niñas o adultos en situación de riesgo. Los datos personales solo se comparten si el trabajo no puede hacerse sin ellos y lo acuerdan antes por escrito.",
      "Antes de empezar cualquier trabajo, tu organización y el profesional firman un acuerdo de contribución y nombras un punto focal de salvaguarda.",
      "No hay dinero de por medio: ni honorarios, ni regalos, ni pagos, y los profesionales nunca manejan el dinero de tu organización.",
      "Informas a Handova de cualquier inquietud dentro de las 24 horas, sigues el Código de Conducta y las políticas de Handova y nunca tomas represalias contra quien plantea una inquietud.",
      "Revisas las horas registradas dentro de los 14 días, escribes un aval honesto y respondes un breve seguimiento seis meses después.",
      "Puedes usar libremente el trabajo para tu misión. Tu organización sigue siendo responsable de sus propias decisiones y datos.",
      "Si tu organización incumple el acuerdo, podemos pausarla o retirarla. Puedes pedir una revisión dentro de los 30 días.",
    ],
    sections: {
      "About this agreement": ["Acerca de este acuerdo", [
        "Handova es una plataforma gratuita, gestionada por Ethical Bridge LLC, sociedad registrada en Wyoming (EE. UU.), que conecta organizaciones sin fines de lucro de liderazgo local con profesionales con habilidades que dedican su tiempo como voluntarios. Este acuerdo es entre tu organización y Ethical Bridge LLC. Establece lo que le pedimos a tu organización, lo que puede esperar de nosotros y cómo protegemos a todas las personas: a tu equipo, a los profesionales y a las personas a las que atiendes. La persona que firma lo hace en nombre de la organización.",
      ]],
      "1. Who can join": ["1. Quién puede unirse", [
        "Tu organización no tiene fines de lucro y es de liderazgo local: su dirección está en el lugar donde trabaja y no distribuye ganancias entre propietarios. Las empresas y sociedades con fines de lucro no pueden unirse. Está legalmente registrada, o cuenta con el patrocinio fiscal de una organización sin fines de lucro registrada, y figura en el directorio de Ethical Bridge.",
        "La persona que firma está autorizada para actuar en nombre de la organización y aceptar este acuerdo en su nombre. Podemos confirmarlo con el contacto de la ficha de tu organización en el directorio de Ethical Bridge, o mediante un correo desde la dirección web propia de tu organización.",
        "Todo lo que nos dices sobre la organización es verdadero y está actualizado. Podemos pedir documentos de registro, una referencia o una llamada breve antes de aprobarte.",
        "Tu organización, sus líderes y sus socios no participan en terrorismo, violencia, odio, discriminación, trata, corrupción ni ninguna otra actividad ilícita. La ayuda nunca está condicionada a la religión, la política ni la identidad de nadie.",
        "Nos informas sin demora de cualquier cambio en lo anterior, o de cualquier incidente grave o investigación que involucre a tu organización.",
      ]],
      "2. Needs you publish": ["2. Las necesidades que publicas", [
        "Cada necesidad es real, describe un único resultado claro y lleva como máximo 16 horas. Solo pides trabajo que realmente vas a usar.",
        "Las necesidades son a distancia. Nunca implican contacto directo entre profesionales y niños, niñas o adultos en situación de riesgo, incluidas encuestas, entrevistas, pruebas, grupos o líneas de ayuda. Tu propio personal realiza cualquiera de estas actividades.",
        "Los profesionales trabajan con información anonimizada o agregada. Los datos personales identificables de las personas a las que atiendes solo se comparten si el trabajo no puede hacerse sin ellos, puedes compartirlos legalmente y así se acuerda por escrito en los Mensajes de Handova antes de compartirlos. Nunca compartes datos ni imágenes de niños o niñas, expedientes de casos, documentos de identidad, ubicaciones de refugios ni nada que revele la situación migratoria, de detención, de salud, de sobreviviente o la orientación sexual de una persona identificada.",
        "Las necesidades nunca implican que los profesionales reciban, guarden o transfieran dinero de tu organización, ni asesoramiento regulado sin la habilitación adecuada y condiciones separadas.",
        "Las necesidades no reemplazan un puesto remunerado ni tareas permanentes del personal, y no son períodos de prueba no remunerados para un empleo.",
        "No usas Handova para hacer publicidad, recaudar fondos entre los profesionales ni contratar para trabajos remunerados.",
      ]],
      "3. How you work with professionals": ["3. Cómo trabajas con los profesionales", [
        "Antes de empezar cualquier trabajo, firmas un acuerdo de contribución con el profesional. No compartes información confidencial ni das acceso antes de que esté firmado.",
        "Le das al profesional una persona de contacto, un encargo claro, la información que necesita y comentarios oportunos. Respondes a las postulaciones y los mensajes en un plazo razonable, normalmente dentro de una semana.",
        "Respetas el alcance y las horas acordados. Nunca presionas a un profesional para que haga más, trabaje en horarios irrazonables o continúe si quiere detenerse.",
        "Nunca pides a los profesionales dinero, honorarios, regalos ni favores, y nunca les ofreces pagos, regalos ni invitaciones. Cualquier gasto requiere condiciones escritas por separado, acordadas antes de efectuarlo.",
        "Declaras cualquier conflicto de intereses con un profesional, por ejemplo un vínculo familiar o laboral, y solo sigues adelante si Handova acuerda cómo gestionarlo. Nunca avalas a un profesional que dirige tu organización o trabaja en ella, ni a un familiar cercano de alguien que lo haga.",
        "Revisas con honestidad las horas registradas dentro de los 14 días. Cuando el trabajo está terminado, la persona que vio el trabajo escribe un aval justo y veraz con sus propias palabras, y respondes seis meses después un breve seguimiento sobre si el trabajo sigue en uso.",
      ]],
      "4. Safeguarding": ["4. Salvaguarda", [
        `Sigues ${POLICIES} en cada contribución en Handova, y tu propia política de salvaguarda, si la tienes. Si difieren, se aplica la norma más estricta.`,
        "Nombras un punto focal de salvaguarda para cada contribución cuando firmas su acuerdo de contribución, y le explicas al profesional cómo plantear una inquietud antes de que empiece el trabajo.",
        "Les das a las personas a las que atiendes una forma de plantear inquietudes, y transmites a Handova cualquier inquietud sobre un profesional de Handova.",
        "Nunca compartes imágenes de niños o niñas para una contribución en Handova, y no compartes fotos, videos ni historias de personas adultas sin tu propio proceso de consentimiento.",
        "Tratas a los profesionales con dignidad y respeto, y nunca los acosas, explotas ni discriminas.",
      ]],
      "5. Protection from sexual exploitation and abuse": ["5. Protección contra la explotación y el abuso sexuales", PSEA],
      "6. Reporting and responding to concerns": ["6. Reporte y respuesta ante inquietudes", [
        "Si tomas conocimiento de una inquietud que involucra a un profesional, a una colaboración de Handova o a cualquier persona vinculada a ella, se lo informas a Handova dentro de las 24 horas en safeguarding@handova.org o con la función Reportar un problema. Si alguien está en peligro inmediato, contacta primero a los servicios de emergencia locales. Las inquietudes sobre la fundadora de Handova van al contacto independiente de Handova, como se establece en nuestra Política de Denuncia de Irregularidades.",
        "Respondes a las inquietudes conforme a la ley y a tus propias políticas, priorizas la seguridad y los deseos de la persona afectada, mantienes la confidencialidad de la información y colaboras con cualquier revisión de Handova o de las autoridades.",
        "Nunca tomas represalias contra quien plantea una inquietud en la que cree honestamente.",
      ]],
      "7. Data protection and security": ["7. Protección de datos y seguridad", [
        "Tu organización sigue siendo responsable de los datos personales que tiene. Compartes solo el mínimo que el trabajo necesita, anonimizado siempre que sea posible, a través de un canal seguro que elijas.",
        "Nunca le pides a un profesional que introduzca información personal o confidencial en herramientas de IA o cuentas personales.",
        "Nunca compartes contraseñas, datos de tarjetas de pago, PIN ni códigos de acceso a través de Handova. Cuando un profesional necesita acceder a un sistema, le das su propia cuenta con el mínimo acceso necesario, y la eliminas cuando termina el trabajo.",
        "Le avisas al profesional y a Handova dentro de las 24 horas si sospechas que información relacionada con una contribución en Handova se perdió, se compartió por error o fue consultada sin permiso.",
      ]],
      "8. Using the work": ["8. Uso del trabajo", [
        "Salvo que acuerden otra cosa por escrito, el profesional le concede a tu organización un derecho gratuito, permanente, irrevocable y mundial de usar, copiar, adaptar y compartir el trabajo que entrega para tu misión, incluso con tus socios y financiadores.",
        "El trabajo apoya tus decisiones; tu organización sigue siendo responsable de ellas y de sus propias obligaciones legales, financieras y regulatorias. Busca tu propio asesoramiento calificado cuando sea necesario.",
        "El profesional puede describir el trabajo en su CV de impacto de Handova y mostrar en otros lugares sus partes no confidenciales. No nombras ni muestras públicamente a un profesional sin su consentimiento.",
      ]],
      "9. Visibility": ["9. Visibilidad", [
        "Una vez aprobada, el nombre, el logotipo, la ubicación, la descripción y las necesidades publicadas de tu organización son públicos en Handova. El trabajo terminado, tu aval y las horas entregadas pueden aparecer en el CV de impacto del profesional y en los informes de impacto anonimizados de Handova.",
      ]],
      "10. Our role": ["10. Nuestro papel", [
        "Handova revisa organizaciones y perfiles y ofrece las herramientas para acordar, seguir y revisar el trabajo. No somos parte del trabajo entre tú y un profesional, no lo supervisamos y no podemos garantizar ningún resultado.",
        "Nuestras revisiones y verificaciones de identidad no son verificaciones de antecedentes, y un perfil no es una habilitación ni una garantía. Sigues siendo responsable de tus propias verificaciones, políticas y decisiones.",
        "En la medida en que la ley lo permita, Ethical Bridge LLC no es responsable de las pérdidas derivadas del trabajo acordado entre tú y un profesional. Nada de este acuerdo limita la responsabilidad por nuestra propia negligencia, por fraude ni por nada que no pueda limitarse legalmente.",
      ]],
      "11. Breaches, suspension and reviews": ["11. Incumplimientos, suspensión y revisiones", [
        "Si tu organización incumple este acuerdo o pone a alguien en riesgo, podemos pausar sus necesidades y colaboraciones, retener o retirar avales, suspenderla o retirarla, e informar a los profesionales involucrados. Ante inquietudes graves podemos actuar de inmediato, y podemos compartir información con las autoridades, con el directorio de Ethical Bridge o con los organismos reguladores pertinentes cuando la ley o la seguridad de alguien lo exija.",
        "Puedes pedir una revisión de una suspensión o retiro dentro de los 30 días escribiendo a hello@handova.org. Las revisiones las lleva a cabo el contacto independiente de Handova, como se establece en nuestras políticas.",
      ]],
      "12. Data and this record": ["12. Datos y este registro", [
        "Tratamos los datos personales como se describe en nuestro aviso de privacidad y en nuestra Política de Protección de Datos.",
        "Cuando firmas, guardamos el nombre, el cargo y la dirección de correo de quien firma, la fecha y la hora, la dirección IP y el navegador, las confirmaciones marcadas y el texto exacto aceptado. Conservamos este registro durante seis años después del cierre de la cuenta de la organización, para que ambas partes puedan contar con él.",
      ]],
      "13. Law, changes and contact": ["13. Ley aplicable, cambios y contacto", [
        "Este acuerdo se rige por las leyes del estado de Wyoming (EE. UU.). Esto no le quita a tu organización ninguna protección que le otorguen las normas imperativas del país donde está registrada. Si surge un desacuerdo, primero intentaremos resolverlo contigo de manera informal.",
        "Si modificamos este acuerdo, te lo informaremos y te pediremos que firmes la nueva versión antes de publicar nuevas necesidades.",
        "¿Preguntas? Escribe a hello@handova.org. Inquietudes: safeguarding@handova.org.",
      ]],
    },
  },

  // Contribution agreement v3, built from the same scope as the English (src/agreement.js, contributionSections).
  // v: org, pro (names as written), orgCountry / proCountry (" (country)" or ""), output, description (people's own
  // words, never translated), hours, languages (already translated).
  contribution: {
    version: "contribution-2026-10-v3",
    org: "la organización",
    pro: "el profesional",
    sections: (v) => ({
      "1. Parties": ["1. Partes", [
        `Este acuerdo se celebra entre ${v.org}${v.orgCountry}, que firma por medio de la persona indicada abajo, y ${v.pro}${v.proCountry}. Handova, gestionada por Ethical Bridge LLC (Wyoming, EE. UU.), ofrece la plataforma y conserva el registro de este acuerdo, pero no es parte de él.`,
      ]],
      "2. Agreed contribution": ["2. Contribución acordada", [
        v.output,
        `Contexto: ${v.description}`,
        `Horas estimadas: ${v.hours}. Idiomas de trabajo: ${v.languages}. A distancia. Fecha de entrega: la acuerdan ambas partes en su primera llamada y queda registrada en los Mensajes de Handova.`,
      ]],
      "3. Scope, changes and communication": ["3. Alcance, cambios y comunicación", [
        "Antes de empezar el trabajo, ambas partes acuerdan en los Mensajes de Handova los plazos, la persona de contacto de la organización, cómo se revisará el trabajo y qué queda fuera del alcance. Cualquier cambio en el resultado, las horas o el plazo se acuerda por escrito en Mensajes antes de empezar el trabajo adicional. Superar las 16 horas requiere una nueva necesidad y un nuevo acuerdo. Los mensajes se quedan en Handova; los datos de contacto personales se comparten solo cuando ambas partes han firmado, y solo si ambas lo desean.",
      ]],
      "4. Confidentiality, data and access": ["4. Confidencialidad, datos y acceso", [
        "Cada parte usa la información confidencial solo para esta contribución y comparte el mínimo necesario, a través de un canal seguro acordado. **Las contraseñas, los datos de tarjetas de pago, los PIN y los códigos de acceso nunca se comparten a través de Handova.** Todo acceso a sistemas se hace con cuentas individuales y limitadas, que se eliminan cuando termina el trabajo. La información personal, confidencial, de reportes, de identidad o de salvaguarda nunca se introduce en herramientas de IA ni en cuentas personales, y se devuelve o se elimina en la entrega. Cualquier sospecha de violación de datos se informa a la otra parte y a Handova dentro de las 24 horas.",
        `${v.org} es responsable (el “responsable del tratamiento”) de los datos personales que comparte. El profesional los usa solo según las instrucciones de la organización, como voluntario que actúa bajo su autoridad, y para ningún otro fin. El profesional trabaja con información anonimizada o agregada. Los datos personales identificables de las personas a las que atiende la organización solo se comparten si el trabajo no puede hacerse sin ellos, la organización puede compartirlos legalmente con el profesional en su país y ambas partes registran antes en Mensajes qué datos, por qué, cómo se mantienen seguros y cuándo se eliminan. Nunca se comparten datos ni imágenes de niños o niñas, expedientes de casos, documentos de identidad ni ubicaciones de refugios. En la entrega o cuando termina la contribución, el profesional elimina o devuelve cualquier dato personal y lo confirma en Mensajes.`,
      ]],
      "5. Use of the work and public evidence": ["5. Uso del trabajo y evidencia pública", [
        `El profesional le concede a ${v.org} un derecho gratuito, permanente, irrevocable y mundial de usar, copiar, adaptar y compartir los entregables para su misión, incluso con sus socios y financiadores. En la medida en que la ley lo permita, el profesional no se opondrá a que la organización modifique el trabajo. El profesional conserva los materiales, las herramientas y los conocimientos que creó antes de esta contribución o fuera de ella; cuando alguno se incluya en los entregables, se le aplica el mismo derecho. El profesional informa a la organización sobre cualquier material de terceros, de código abierto o generado con IA incluido en los entregables, y sobre sus condiciones de licencia.`,
        "Nada confidencial aparece en un CV de impacto público. El profesional decide si se publica el registro revisado, y puede mostrar en otros lugares las partes no confidenciales del trabajo.",
      ]],
      "6. Safeguarding": ["6. Salvaguarda", [
        "Esta contribución es a distancia y no implica ningún contacto directo con niños, niñas ni adultos en situación de riesgo. Ambas partes siguen la Política de Salvaguarda y el Código de Conducta de Handova, y la política de salvaguarda propia de la organización, si la tiene; si difieren, se aplica la norma más estricta. El punto focal de salvaguarda de la organización para esta contribución figura junto a su firma, abajo. Cualquiera de las partes pausa el trabajo y reporta cualquier inquietud dentro de las 24 horas a la otra parte y a Handova en safeguarding@handova.org.",
      ]],
      "7. Relationship, responsibility and liability": ["7. Relación, responsabilidad y obligaciones", [
        "Esta es una contribución profesional voluntaria. No crea ningún empleo, pago, sociedad ni relación de representación. No se dan ni se aceptan regalos, pagos ni favores, y el profesional nunca recibe, guarda ni transfiere dinero de la organización. Cualquier gasto requiere condiciones escritas por separado. El trabajo legal, médico, financiero o regulado de otro modo requiere la habilitación adecuada y condiciones separadas.",
        "El profesional dedica su tiempo como voluntario y trabaja con un cuidado y una competencia razonables, pero no garantiza ningún resultado. La organización decide si usa el trabajo y cómo, y lo revisa antes de basarse en él. En la medida en que la ley lo permita, ninguna de las partes responde ante la otra por daños indirectos, y el profesional solo responde por actos intencionales (dolo) o negligencia grave. Ante un error común, incluso con datos, el profesional lo informa de inmediato a la organización y a Handova y ayuda a remediarlo. Ni Handova ni la organización ofrecen seguros al profesional. Cada parte también se compromete, en beneficio de la otra, a cumplir el acuerdo de Handova que firmó.",
        "Handova verifica la identidad de los profesionales, pero no verifica sus calificaciones ni los resultados.",
      ]],
      "8. Ending the contribution": ["8. Fin de la contribución", [
        "Cualquiera de las partes puede finalizar la contribución en cualquier momento desde esta página, indicando un motivo breve. Cuando termina, el profesional entrega el trabajo en curso que la organización le pida, y devuelve o elimina la información y los accesos de la organización dentro de los 7 días. Las obligaciones de confidencialidad, de datos, de uso del trabajo y de salvaguarda continúan después de que termina. El trabajo terminado lo revisa la organización antes de que cuente.",
      ]],
      "9. Disagreements and applicable law": ["9. Desacuerdos y ley aplicable", [
        "Este acuerdo se rige por la ley del país donde está registrada la organización. Si surge un desacuerdo, ambas partes intentan primero resolverlo de buena fe. Cualquiera de ellas puede pedir ayuda a Handova. Handova no decide controversias sobre el trabajo, pero puede actuar conforme a sus propias políticas, por ejemplo ante una inquietud de salvaguarda o de conducta. Nada de lo aquí previsto elimina ningún derecho que cualquiera de las partes tenga según la ley del lugar donde vive.",
      ]],
      "10. Language and record": ["10. Idioma y registro", [
        "Este acuerdo está redactado en inglés. Si una traducción que se muestra en Handova difiere, prevalece la versión en inglés. Handova conserva el texto firmado, cada firma y su hora durante seis años después de que termine la contribución o se cierre la cuenta, para que ambas partes puedan contar con ellos.",
      ]],
    }),
  },
};
