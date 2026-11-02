'use strict';

(() => {
	const rows = [
		['Language', 'Idioma', 'Langue', 'Idioma', 'Lugha'],
		['A global home for music makers', 'Un hogar global para creadores de música', 'Un foyer mondial pour les créateurs de musique', 'Um lar global para criadores de música', 'Nyumbani pa kimataifa kwa watengenezaji wa muziki'],
		['Find your people.', 'Encuentra a tu gente.', 'Trouvez votre communauté.', 'Encontre sua comunidade.', 'Tafuta watu wako.'],
		['Make your sound.', 'Crea tu sonido.', 'Créez votre son.', 'Crie seu som.', 'Tengeneza sauti yako.'],
		['Singers, instrumentalists and music lovers—one world, one stage, an endless rhythm.', 'Cantantes, instrumentistas y amantes de la música: un mundo, un escenario y un ritmo infinito.', 'Chanteurs, instrumentistes et passionnés de musique : un monde, une scène, un rythme infini.', 'Cantores, instrumentistas e amantes da música: um mundo, um palco, um ritmo sem fim.', 'Waimbaji, wapiga ala na wapenzi wa muziki—ulimwengu mmoja, jukwaa moja, mdundo usio na mwisho.'],
		['Enter Musicians World', 'Entrar en Musicians World', 'Entrer dans Musicians World', 'Entrar no Musicians World', 'Ingia Musicians World'],
		['Continue', 'Continuar', 'Continuer', 'Continuar', 'Endelea'],
		['Welcome screen progress', 'Progreso de la pantalla de bienvenida', 'Progression de l’écran d’accueil', 'Progresso da tela de boas-vindas', 'Maendeleo ya skrini ya makaribisho'],
		['You can continue now.', 'Ya puedes continuar.', 'Vous pouvez continuer maintenant.', 'Você já pode continuar.', 'Sasa unaweza kuendelea.'],
		['Skip intro', 'Saltar introducción', 'Passer l’introduction', 'Pular introdução', 'Ruka utangulizi'],
		['CREATE · CONNECT · PLAY TOGETHER', 'CREA · CONECTA · TOCA EN COMPAÑÍA', 'CRÉEZ · CONNECTEZ · JOUEZ ENSEMBLE', 'CRIE · CONECTE · TOQUE JUNTO', 'UNDA · UNGANISHA · CHEZA PAMOJA'],
		['Global artist network', 'Red global de artistas', 'Réseau mondial d’artistes', 'Rede global de artistas', 'Mtandao wa wasanii wa kimataifa'],
		['Make the world your music scene.', 'Haz del mundo tu escenario musical.', 'Faites du monde votre scène musicale.', 'Faça do mundo seu palco musical.', 'Fanya ulimwengu kuwa jukwaa lako la muziki.'],
		['Meet musicians across borders, share ideas, and discover opportunities to play together.', 'Conoce músicos de todo el mundo, comparte ideas y descubre oportunidades para tocar juntos.', 'Rencontrez des musiciens du monde entier, partagez des idées et découvrez des occasions de jouer ensemble.', 'Conheça músicos do mundo todo, compartilhe ideias e descubra oportunidades para tocar juntos.', 'Kutana na wanamuziki kutoka nchi mbalimbali, shiriki mawazo na ugundue nafasi za kucheza pamoja.'],
		['Meet musicians around the world', 'Conoce músicos de todo el mundo', 'Rencontrez des musiciens du monde entier', 'Conheça músicos do mundo todo', 'Kutana na wanamuziki duniani kote'],
		['Find gigs and collaborations', 'Encuentra conciertos y colaboraciones', 'Trouvez des concerts et des collaborations', 'Encontre shows e colaborações', 'Pata nafasi za muziki na ushirikiano'],
		['Share ideas across borders', 'Comparte ideas sin fronteras', 'Partagez des idées sans frontières', 'Compartilhe ideias sem fronteiras', 'Shiriki mawazo bila mipaka'],
		['Keep your community moving', 'Mantén activa a tu comunidad', 'Faites vivre votre communauté', 'Mantenha sua comunidade ativa', 'Lifanye jumuiya yako iendelee'],
		['Initial setup · Admin', 'Configuración inicial · Admin', 'Configuration initiale · Admin', 'Configuração inicial · Admin', 'Mipangilio ya kwanza · Msimamizi'],
		['Create your admin account', 'Crea tu cuenta de administrador', 'Créez votre compte administrateur', 'Crie sua conta de administrador', 'Fungua akaunti yako ya msimamizi'],
		['Set up the account that manages staff access. Use a unique password with at least 12 characters.', 'Configura la cuenta que gestiona el acceso del equipo. Usa una contraseña única de al menos 12 caracteres.', 'Configurez le compte qui gère l’accès du personnel. Utilisez un mot de passe unique d’au moins 12 caractères.', 'Configure a conta que gerencia o acesso da equipe. Use uma senha exclusiva com pelo menos 12 caracteres.', 'Sanidi akaunti inayosimamia ufikiaji wa wafanyakazi. Tumia nenosiri la kipekee lenye angalau herufi 12.'],
		['Full name', 'Nombre completo', 'Nom complet', 'Nome completo', 'Jina kamili'],
		['Username', 'Nombre de usuario', 'Nom d’utilisateur', 'Nome de usuário', 'Jina la mtumiaji'],
		['Password', 'Contraseña', 'Mot de passe', 'Senha', 'Nenosiri'],
		['Create admin account', 'Crear cuenta de administrador', 'Créer un compte administrateur', 'Criar conta de administrador', 'Fungua akaunti ya msimamizi'],
		['Account sign in', 'Inicio de sesión', 'Connexion au compte', 'Acesso à conta', 'Ingia kwenye akaunti'],
		['Welcome back', 'Te damos la bienvenida', 'Ravi de vous revoir', 'Boas-vindas de volta', 'Karibu tena'],
		['Sign in to your Musicians World account and continue your journey.', 'Inicia sesión en Musicians World y continúa tu camino.', 'Connectez-vous à Musicians World et poursuivez votre parcours.', 'Entre no Musicians World e continue sua jornada.', 'Ingia kwenye Musicians World na uendelee na safari yako.'],
		['Email or username', 'Correo electrónico o usuario', 'E-mail ou nom d’utilisateur', 'E-mail ou nome de usuário', 'Barua pepe au jina la mtumiaji'],
		['Use the email address on your account or your username.', 'Usa el correo electrónico de tu cuenta o tu nombre de usuario.', 'Utilisez l’adresse e-mail de votre compte ou votre nom d’utilisateur.', 'Use o e-mail da sua conta ou seu nome de usuário.', 'Tumia barua pepe ya akaunti yako au jina lako la mtumiaji.'],
		['Enter your password', 'Escribe tu contraseña', 'Saisissez votre mot de passe', 'Digite sua senha', 'Weka nenosiri lako'],
		['Show', 'Mostrar', 'Afficher', 'Mostrar', 'Onyesha'],
		['Save password in this browser', 'Guardar la contraseña en este navegador', 'Enregistrer le mot de passe dans ce navigateur', 'Salvar a senha neste navegador', 'Hifadhi nenosiri kwenye kivinjari hiki'],
		['Uses your browser password manager. This app never stores your plain-text password.', 'Usa el gestor de contraseñas del navegador. La aplicación nunca guarda tu contraseña en texto sin cifrar.', 'Utilise le gestionnaire de mots de passe du navigateur. Cette application ne stocke jamais votre mot de passe en clair.', 'Usa o gerenciador de senhas do navegador. Este app nunca armazena sua senha em texto simples.', 'Hutumia kidhibiti cha nenosiri cha kivinjari. Programu hii haihifadhi nenosiri lako lisilosimbwa.'],
		['Continue securely', 'Continuar de forma segura', 'Continuer en toute sécurité', 'Continuar com segurança', 'Endelea kwa usalama'],
		['Or continue with', 'O continúa con', 'Ou continuer avec', 'Ou continue com', 'Au endelea na'],
		['New Google accounts receive a confirmation email and need administrator approval.', 'Las cuentas nuevas de Google reciben un correo de confirmación y requieren aprobación del administrador.', 'Les nouveaux comptes Google reçoivent un e-mail de confirmation et nécessitent l’approbation d’un administrateur.', 'Novas contas do Google recebem um e-mail de confirmação e precisam da aprovação do administrador.', 'Akaunti mpya za Google hupokea barua pepe ya uthibitisho na zinahitaji idhini ya msimamizi.'],
		['Forgot your password? Recover it with a code', '¿Olvidaste tu contraseña? Recupérala con un código', 'Mot de passe oublié ? Récupérez-le avec un code', 'Esqueceu a senha? Recupere com um código', 'Umesahau nenosiri? Lipate tena kwa msimbo'],
		['Create a viewer account', 'Crear una cuenta de usuario', 'Créer un compte membre', 'Criar uma conta de membro', 'Fungua akaunti ya mwanachama'],
		['Passwords and permissions are checked by the Node.js server. New viewer accounts need administrator approval.', 'El servidor Node.js verifica las contraseñas y los permisos. Las cuentas nuevas requieren aprobación del administrador.', 'Les mots de passe et les autorisations sont vérifiés par le serveur Node.js. Les nouveaux comptes nécessitent l’approbation d’un administrateur.', 'O servidor Node.js verifica senhas e permissões. Novas contas precisam da aprovação do administrador.', 'Nenosiri na ruhusa hukaguliwa na seva ya Node.js. Akaunti mpya zinahitaji idhini ya msimamizi.'],
		['Account recovery', 'Recuperación de cuenta', 'Récupération du compte', 'Recuperação da conta', 'Urejeshaji wa akaunti'],
		['Reset your password', 'Restablece tu contraseña', 'Réinitialisez votre mot de passe', 'Redefina sua senha', 'Weka upya nenosiri lako'],
		['Email', 'Correo electrónico', 'E-mail', 'E-mail', 'Barua pepe'],
		['Send verification code', 'Enviar código de verificación', 'Envoyer le code de vérification', 'Enviar código de verificação', 'Tuma msimbo wa uthibitisho'],
		['Six-digit verification code', 'Código de verificación de seis dígitos', 'Code de vérification à six chiffres', 'Código de verificação de seis dígitos', 'Msimbo wa uthibitisho wa tarakimu sita'],
		['New password', 'Nueva contraseña', 'Nouveau mot de passe', 'Nova senha', 'Nenosiri jipya'],
		['Confirm new password', 'Confirma la nueva contraseña', 'Confirmez le nouveau mot de passe', 'Confirme a nova senha', 'Thibitisha nenosiri jipya'],
		['Reset password securely', 'Restablecer contraseña de forma segura', 'Réinitialiser le mot de passe en toute sécurité', 'Redefinir senha com segurança', 'Weka upya nenosiri kwa usalama'],
		['Send another code', 'Enviar otro código', 'Envoyer un autre code', 'Enviar outro código', 'Tuma msimbo mwingine'],
		['← Back to sign in', '← Volver al inicio de sesión', '← Retour à la connexion', '← Voltar ao acesso', '← Rudi kwenye kuingia'],
		['New account', 'Cuenta nueva', 'Nouveau compte', 'Nova conta', 'Akaunti mpya'],
		['Create your account', 'Crea tu cuenta', 'Créez votre compte', 'Crie sua conta', 'Fungua akaunti yako'],
		['Full name', 'Nombre completo', 'Nom complet', 'Nome completo', 'Jina kamili'],
		['Country you’re joining from', 'País desde el que te unes', 'Pays depuis lequel vous nous rejoignez', 'País de onde você está entrando', 'Nchi unayojiunga kutoka'],
		['Choose your country', 'Elige tu país', 'Choisissez votre pays', 'Escolha seu país', 'Chagua nchi yako'],
		['Only administrators can see this registration detail.', 'Solo los administradores pueden ver este dato de registro.', 'Seuls les administrateurs peuvent voir cette information d’inscription.', 'Somente administradores podem ver este dado de cadastro.', 'Wasimamizi pekee wanaweza kuona maelezo haya ya usajili.'],
		['Submit access request', 'Enviar solicitud de acceso', 'Envoyer une demande d’accès', 'Enviar solicitação de acesso', 'Tuma ombi la ufikiaji'],
		['Musicians World', 'Musicians World', 'Musicians World', 'Musicians World', 'Musicians World'],
		['Global musician community', 'Comunidad mundial de músicos', 'Communauté mondiale de musiciens', 'Comunidade global de músicos', 'Jumuiya ya wanamuziki duniani'],
		['Your local date', 'Tu fecha local', 'Votre date locale', 'Sua data local', 'Tarehe yako ya eneo'],
		['Local time', 'Hora local', 'Heure locale', 'Horário local', 'Saa ya eneo'],
		['Country: waiting for location permission', 'País: esperando permiso de ubicación', 'Pays : en attente de l’autorisation de localisation', 'País: aguardando permissão de localização', 'Nchi: inasubiri ruhusa ya eneo'],
		['Local weather', 'Clima local', 'Météo locale', 'Clima local', 'Hali ya hewa ya eneo'],
		['Location not set', 'Ubicación no configurada', 'Emplacement non défini', 'Localização não definida', 'Eneo halijawekwa'],
		['Use my location', 'Usar mi ubicación', 'Utiliser ma position', 'Usar minha localização', 'Tumia eneo langu'],
		['Choose a place', 'Elegir un lugar', 'Choisir un lieu', 'Escolher um local', 'Chagua mahali'],
		['Search city or country', 'Buscar ciudad o país', 'Rechercher une ville ou un pays', 'Buscar cidade ou país', 'Tafuta jiji au nchi'],
		['Show weather', 'Mostrar el clima', 'Afficher la météo', 'Mostrar clima', 'Onyesha hali ya hewa'],
		['Weather by Open-Meteo', 'Clima por Open-Meteo', 'Météo par Open-Meteo', 'Clima por Open-Meteo', 'Hali ya hewa kupitia Open-Meteo'],
		['Dark mode', 'Modo oscuro', 'Mode sombre', 'Modo escuro', 'Hali ya giza'],
		['Account', 'Cuenta', 'Compte', 'Conta', 'Akaunti'],
		['Admin tools', 'Herramientas de administración', 'Outils d’administration', 'Ferramentas de administração', 'Zana za msimamizi'],
		['Sign out', 'Cerrar sesión', 'Se déconnecter', 'Sair', 'Ondoka'],
		['My dashboard', 'Mi panel', 'Mon tableau de bord', 'Meu painel', 'Dashibodi yangu'],
		['My account', 'Mi cuenta', 'Mon compte', 'Minha conta', 'Akaunti yangu'],
		['Account details', 'Detalles de la cuenta', 'Détails du compte', 'Detalhes da conta', 'Maelezo ya akaunti'],
		['One world.', 'Un mundo.', 'Un monde.', 'Um mundo.', 'Ulimwengu mmoja.'],
		['Infinite rhythm.', 'Ritmo infinito.', 'Rythme infini.', 'Ritmo infinito.', 'Mdundo usio na mwisho.'],
		['A world of music, together', 'Un mundo de música, juntos', 'Un monde de musique, ensemble', 'Um mundo de música, juntos', 'Ulimwengu wa muziki, pamoja'],
		['Meet the community', 'Conoce a la comunidad', 'Rencontrer la communauté', 'Conheça a comunidade', 'Kutana na jumuiya'],
		['Explore opportunities', 'Explorar oportunidades', 'Découvrir les opportunités', 'Explorar oportunidades', 'Gundua nafasi'],
		['Your member workspace', 'Tu espacio de miembro', 'Votre espace membre', 'Seu espaço de membro', 'Eneo lako la mwanachama'],
		['FEATURED BAND PERFORMANCE', 'ACTUACIÓN DESTACADA DE LA BANDA', 'PRESTATION DU GROUPE À LA UNE', 'APRESENTAÇÃO EM DESTAQUE', 'ONESHO LA BENDI LILILOCHAGULIWA'],
		['GOSPEL CONCERT PICKS', 'CONCIERTOS DE GÓSPEL', 'SÉLECTION DE CONCERTS GOSPEL', 'SHOWS DE GOSPEL EM DESTAQUE', 'CHAGUO LA TAMASHA ZA GOSPEL'],
		['Skip intro to concert picks', 'Saltar a los conciertos', 'Passer aux concerts', 'Pular para os shows', 'Ruka hadi kwenye matamasha'],
		['From the gospel stage', 'Desde el escenario góspel', 'Depuis la scène gospel', 'Do palco gospel', 'Kutoka jukwaani gospel'],
		['Concert picks', 'Conciertos destacados', 'Concerts à découvrir', 'Shows em destaque', 'Matamasha yaliyopendekezwa'],
		['The scene', 'La escena', 'La scène', 'A cena', 'Jukwaa'],
		['Find a gig', 'Buscar un concierto', 'Trouver un concert', 'Encontrar um show', 'Tafuta nafasi ya muziki'],
		['Meet musicians', 'Conocer músicos', 'Rencontrer des musiciens', 'Conhecer músicos', 'Kutana na wanamuziki'],
		['Listen together', 'Escuchar juntos', 'Écouter ensemble', 'Ouvir juntos', 'Sikiliza pamoja'],
		['Chat rooms', 'Salas de chat', 'Salons de discussion', 'Salas de conversa', 'Vyumba vya mazungumzo'],
		['Instrument shop', 'Tienda de instrumentos', 'Boutique d’instruments', 'Loja de instrumentos', 'Duka la ala za muziki'],
		['Your creative corner', 'Tu rincón creativo', 'Votre coin créatif', 'Seu espaço criativo', 'Eneo lako la ubunifu'],
		['What are you working on?', '¿En qué estás trabajando?', 'Sur quoi travaillez-vous ?', 'No que você está trabalhando?', 'Unafanyia kazi nini?'],
		['Share an idea or find collaborators', 'Comparte una idea o busca colaboradores', 'Partagez une idée ou trouvez des collaborateurs', 'Compartilhe uma ideia ou encontre colaboradores', 'Shiriki wazo au tafuta washirika'],
		['Musical idea', 'Idea musical', 'Idée musicale', 'Ideia musical', 'Wazo la muziki'],
		['Looking to collaborate', 'Busco colaborar', 'Recherche de collaboration', 'Buscando colaboração', 'Natafuta kushirikiana'],
		['A melody, a lyric, a sound you can’t stop thinking about...', 'Una melodía, una letra o un sonido que no puedes dejar de pensar...', 'Une mélodie, des paroles ou un son qui vous obsède...', 'Uma melodia, uma letra ou um som que não sai da cabeça...', 'Melodi, maneno au sauti ambayo huwezi kuacha kuwaza...'],
		['Share a work in progress, ask for feedback, or invite musicians to make something with you.', 'Comparte algo en proceso, pide opiniones o invita a músicos a crear contigo.', 'Partagez une œuvre en cours, demandez des avis ou invitez des musiciens à créer avec vous.', 'Compartilhe algo em andamento, peça opiniões ou convide músicos para criar com você.', 'Shiriki kazi inayoendelea, omba maoni au alika wanamuziki watengeneze kitu pamoja nawe.'],
		['Share with the world', 'Compartir con el mundo', 'Partager avec le monde', 'Compartilhar com o mundo', 'Shiriki na ulimwengu'],
		['Across the community', 'En toda la comunidad', 'Dans toute la communauté', 'Por toda a comunidade', 'Katika jumuiya nzima'],
		['Fresh from the scene', 'Lo último de la escena', 'Les nouveautés de la scène', 'Novidades da cena', 'Habari mpya za jukwaani'],
		['Live community', 'Comunidad activa', 'Communauté active', 'Comunidade ativa', 'Jumuiya hai'],
		['Loading the latest music conversations…', 'Cargando las últimas conversaciones musicales…', 'Chargement des dernières conversations musicales…', 'Carregando as conversas musicais mais recentes…', 'Inapakia mazungumzo mapya ya muziki…'],
		['Make it a live thing', 'Llévalo al escenario', 'Faites-en un événement live', 'Leve para o palco', 'Lipeleke jukwaani'],
		['There’s a stage with your name on it.', 'Hay un escenario esperándote.', 'Une scène vous attend.', 'Há um palco esperando por você.', 'Kuna jukwaa linalokusubiri.'],
		['Explore opportunities posted by musicians in the community.', 'Descubre oportunidades publicadas por músicos de la comunidad.', 'Découvrez les opportunités publiées par les musiciens de la communauté.', 'Explore oportunidades publicadas por músicos da comunidade.', 'Gundua nafasi zilizotangazwa na wanamuziki wa jumuiya.'],
		['Explore the gig board', 'Explorar la cartelera', 'Découvrir les offres', 'Explorar o mural de shows', 'Gundua nafasi za muziki'],
		['Loading opportunities', 'Cargando oportunidades', 'Chargement des opportunités', 'Carregando oportunidades', 'Inapakia nafasi'],
		['Your people are out there', 'Tu gente está ahí fuera', 'Votre communauté vous attend', 'Sua comunidade está por aí', 'Watu wako wapo huko'],
		['Find your next bandmate.', 'Encuentra a tu próximo compañero de banda.', 'Trouvez votre prochain partenaire musical.', 'Encontre seu próximo parceiro musical.', 'Tafuta mshiriki wako wa bendi anayefuata.'],
		['Connect with singers, songwriters, and players around the world.', 'Conecta con cantantes, compositores e instrumentistas de todo el mundo.', 'Rencontrez des chanteurs, auteurs-compositeurs et instrumentistes du monde entier.', 'Conecte-se com cantores, compositores e instrumentistas do mundo todo.', 'Ungana na waimbaji, watunzi na wapiga ala duniani kote.'],
		['Loading musicians', 'Cargando músicos', 'Chargement des musiciens', 'Carregando músicos', 'Inapakia wanamuziki'],
		['The gig board', 'Cartelera de conciertos', 'Le tableau des concerts', 'Mural de shows', 'Ubao wa nafasi za muziki'],
		['Find your next stage.', 'Encuentra tu próximo escenario.', 'Trouvez votre prochaine scène.', 'Encontre seu próximo palco.', 'Tafuta jukwaa lako linalofuata.'],
		['Tour dates, open mics, session work, and opportunities to play together.', 'Giras, micrófonos abiertos, sesiones y oportunidades para tocar juntos.', 'Tournées, scènes ouvertes, séances studio et occasions de jouer ensemble.', 'Turnês, microfones abertos, sessões e oportunidades para tocar juntos.', 'Ziara, maikrofoni wazi, kazi za studio na nafasi za kucheza pamoja.'],
		['Open calls', 'Convocatorias abiertas', 'Appels ouverts', 'Oportunidades abertas', 'Nafasi zilizo wazi'],
		['Upcoming opportunities', 'Próximas oportunidades', 'Prochaines opportunités', 'Próximas oportunidades', 'Nafasi zijazo'],
		['Post an opportunity', 'Publicar una oportunidad', 'Publier une opportunité', 'Publicar uma oportunidade', 'Tangaza nafasi'],
		['Opportunity type', 'Tipo de oportunidad', 'Type d’opportunité', 'Tipo de oportunidade', 'Aina ya nafasi'],
		['Gig or live show', 'Concierto o actuación', 'Concert ou spectacle', 'Show ou apresentação', 'Tamasha au onyesho la moja kwa moja'],
		['Audition', 'Audición', 'Audition', 'Audição', 'Usaili'],
		['Collaboration', 'Colaboración', 'Collaboration', 'Colaboração', 'Ushirikiano'],
		['Session work', 'Trabajo de sesión', 'Travail en studio', 'Trabalho de sessão', 'Kazi ya kipindi'],
		['Festival', 'Festival', 'Festival', 'Festival', 'Tamasha'],
		['Lesson or teaching', 'Clase o enseñanza', 'Cours ou enseignement', 'Aula ou ensino', 'Somo au ufundishaji'],
		['City, country or online', 'Ciudad, país o en línea', 'Ville, pays ou en ligne', 'Cidade, país ou online', 'Jiji, nchi au mtandaoni'],
		['Date', 'Fecha', 'Date', 'Data', 'Tarehe'],
		['optional', 'opcional', 'facultatif', 'opcional', 'hiari'],
		['Tell musicians about it', 'Cuéntaselo a los músicos', 'Présentez l’opportunité aux musiciens', 'Conte aos músicos sobre a oportunidade', 'Waeleze wanamuziki kuhusu nafasi hii'],
		['Public contact email', 'Correo de contacto público', 'E-mail de contact public', 'E-mail público para contato', 'Barua pepe ya mawasiliano ya umma'],
		['Post to the gig board', 'Publicar en la cartelera', 'Publier sur le tableau', 'Publicar no mural de shows', 'Tangaza kwenye ubao wa nafasi'],
		['The world is your music scene', 'El mundo es tu escena musical', 'Le monde est votre scène musicale', 'O mundo é sua cena musical', 'Ulimwengu ni jukwaa lako la muziki'],
		['Meet the musicians.', 'Conoce a los músicos.', 'Rencontrez les musiciens.', 'Conheça os músicos.', 'Kutana na wanamuziki.'],
		['Find your sound, your collaborators, and your people across the map.', 'Encuentra tu sonido, colaboradores y comunidad en todo el mundo.', 'Trouvez votre son, vos collaborateurs et votre communauté partout dans le monde.', 'Encontre seu som, colaboradores e sua comunidade pelo mundo.', 'Tafuta sauti yako, washirika na watu wako kote duniani.'],
		['Set up your musician profile', 'Configura tu perfil musical', 'Configurez votre profil de musicien', 'Configure seu perfil de músico', 'Sanidi wasifu wako wa mwanamuziki'],
		['Tell the community what you play and where to find you.', 'Cuéntale a la comunidad qué tocas y dónde encontrarte.', 'Dites à la communauté ce que vous jouez et où vous trouver.', 'Conte à comunidade o que você toca e onde encontrar você.', 'Liambie jumuiya unachopiga na mahali pa kukupata.'],
		['Page language', 'Idioma de la página', 'Langue de la page', 'Idioma da página', 'Lugha ya ukurasa'],
		['Choose an avatar', 'Elige un avatar', 'Choisissez un avatar', 'Escolha um avatar', 'Chagua avatar'],
		['Save my profile', 'Guardar mi perfil', 'Enregistrer mon profil', 'Salvar meu perfil', 'Hifadhi wasifu wangu'],
		['Your dashboard', 'Tu panel', 'Votre tableau de bord', 'Seu painel', 'Dashibodi yako'],
		['View your account details and manage your personal access settings.', 'Consulta los datos de tu cuenta y administra tu acceso personal.', 'Consultez les informations de votre compte et gérez vos paramètres d’accès.', 'Veja os dados da sua conta e gerencie seu acesso pessoal.', 'Tazama maelezo ya akaunti yako na udhibiti mipangilio yako ya ufikiaji.'],
		['Your account tools', 'Herramientas de tu cuenta', 'Outils de votre compte', 'Ferramentas da sua conta', 'Zana za akaunti yako'],
		['Account settings', 'Configuración de cuenta', 'Paramètres du compte', 'Configurações da conta', 'Mipangilio ya akaunti'],
		['Update your sign-in email and manage personal digital signatures.', 'Actualiza tu correo de acceso y administra tus firmas digitales.', 'Mettez à jour votre e-mail de connexion et gérez vos signatures numériques.', 'Atualize seu e-mail de acesso e gerencie suas assinaturas digitais.', 'Sasisha barua pepe ya kuingia na udhibiti sahihi zako za kidijitali.'],
		['Account details are available to administrators only.', 'Los detalles de la cuenta solo están disponibles para administradores.', 'Les détails du compte sont réservés aux administrateurs.', 'Os detalhes da conta estão disponíveis apenas para administradores.', 'Maelezo ya akaunti yanapatikana kwa wasimamizi pekee.'],
		['Admin only', 'Solo administradores', 'Administrateurs uniquement', 'Somente administradores', 'Wasimamizi pekee'],
		['Admin account details', 'Detalles de cuentas de administrador', 'Détails des comptes administrateur', 'Detalhes da conta do administrador', 'Maelezo ya akaunti ya msimamizi'],
		['Approve members sooner, or let requests auto-approve after 24 hours.', 'Aprueba miembros antes o deja que las solicitudes se aprueben automáticamente después de 24 horas.', 'Approuvez les membres plus tôt ou laissez les demandes être approuvées après 24 heures.', 'Aprove membros antes ou deixe as solicitações serem aprovadas automaticamente após 24 horas.', 'Idhinisha wanachama mapema au acha maombi yaidhinishwe yenyewe baada ya saa 24.'],
		['Manage accounts and roles', 'Administrar cuentas y roles', 'Gérer les comptes et les rôles', 'Gerenciar contas e funções', 'Dhibiti akaunti na majukumu'],
		['Export directory', 'Exportar directorio', 'Exporter le répertoire', 'Exportar diretório', 'Hamisha orodha'],
		['Recent sign-ins and sign-outs', 'Inicios y cierres de sesión recientes', 'Connexions et déconnexions récentes', 'Acessos e saídas recentes', 'Kuingia na kutoka kwa hivi karibuni'],
		['Refresh', 'Actualizar', 'Actualiser', 'Atualizar', 'Onyesha upya'],
		['Add a team account', 'Añadir una cuenta al equipo', 'Ajouter un compte à l’équipe', 'Adicionar uma conta à equipe', 'Ongeza akaunti ya timu'],
		['Create account', 'Crear cuenta', 'Créer un compte', 'Criar conta', 'Fungua akaunti'],
		['Deleted accounts', 'Cuentas eliminadas', 'Comptes supprimés', 'Contas excluídas', 'Akaunti zilizofutwa'],
		['Backup & restore', 'Copia de seguridad y restauración', 'Sauvegarde et restauration', 'Backup e restauração', 'Hifadhi na urejeshe'],
		['Back up now', 'Crear copia ahora', 'Sauvegarder maintenant', 'Fazer backup agora', 'Hifadhi nakala sasa'],
		['Email sign-in', 'Acceso por correo electrónico', 'Connexion par e-mail', 'Acesso por e-mail', 'Kuingia kwa barua pepe'],
		['Save email', 'Guardar correo', 'Enregistrer l’e-mail', 'Salvar e-mail', 'Hifadhi barua pepe'],
		['Change password', 'Cambiar contraseña', 'Modifier le mot de passe', 'Alterar senha', 'Badilisha nenosiri'],
		['Digital signatures', 'Firmas digitales', 'Signatures numériques', 'Assinaturas digitais', 'Sahihi za kidijitali'],
		['Sign statement', 'Firmar declaración', 'Signer la déclaration', 'Assinar declaração', 'Saini taarifa'],
		['Verify record', 'Verificar registro', 'Vérifier l’enregistrement', 'Verificar registro', 'Thibitisha rekodi'],
		['Try again', 'Intentar de nuevo', 'Réessayer', 'Tentar novamente', 'Jaribu tena'],
		['Reload', 'Recargar', 'Recharger', 'Recarregar', 'Pakia upya'],
		['Open Musicians World', 'Abrir Musicians World', 'Ouvrir Musicians World', 'Abrir Musicians World', 'Fungua Musicians World'],
		['Connect your site', 'Conecta tu sitio', 'Connectez votre site', 'Conecte seu site', 'Unganisha tovuti yako'],
		['Website address', 'Dirección del sitio web', 'Adresse du site web', 'Endereço do site', 'Anwani ya tovuti'],
		['Admin', 'Admin', 'Admin', 'Admin', 'Msimamizi'],
		['Customer service', 'Atención al cliente', 'Service client', 'Atendimento ao cliente', 'Huduma kwa wateja'],
		['Musician', 'Músico', 'Musicien', 'Músico', 'Mwanamuziki'],
		['Singer / vocalist', 'Cantante / vocalista', 'Chanteur / chanteuse', 'Cantor / vocalista', 'Mwimbaji'],
		['Instrumentalist', 'Instrumentista', 'Instrumentiste', 'Instrumentista', 'Mpiga ala'],
		['Instrument and gear seller', 'Vendedor de instrumentos y equipos', 'Vendeur d’instruments et de matériel', 'Vendedor de instrumentos e equipamentos', 'Muuzaji wa ala na vifaa'],
		['Member access plus community and account administration.', 'Acceso de miembro y administración de la comunidad y las cuentas.', 'Accès membre et gestion de la communauté et des comptes.', 'Acesso de membro e administração da comunidade e das contas.', 'Ufikiaji wa mwanachama pamoja na usimamizi wa jumuiya na akaunti.'],
		['Staff access with full musician community participation.', 'Acceso del equipo con participación plena en la comunidad musical.', 'Accès du personnel avec pleine participation à la communauté musicale.', 'Acesso da equipe com participação completa na comunidade musical.', 'Ufikiaji wa wafanyakazi na ushiriki kamili katika jumuiya ya wanamuziki.'],
		['Member access: discover, share, listen, and connect.', 'Acceso de miembro: descubre, comparte, escucha y conecta.', 'Accès membre : découvrez, partagez, écoutez et échangez.', 'Acesso de membro: descubra, compartilhe, ouça e conecte-se.', 'Ufikiaji wa mwanachama: gundua, shiriki, sikiliza na ungana.'],
		['Music without borders', 'Música sin fronteras', 'La musique sans frontières', 'Música sem fronteiras', 'Muziki bila mipaka'],
		['Feel the energy. Find your scene.', 'Siente la energía. Encuentra tu escena.', 'Vivez l’énergie. Trouvez votre scène.', 'Sinta a energia. Encontre sua cena.', 'Hisi nguvu. Tafuta jukwaa lako.'],
		['Explore live moments from stages around the world.', 'Descubre momentos en vivo desde escenarios de todo el mundo.', 'Découvrez des moments live sur les scènes du monde entier.', 'Explore momentos ao vivo em palcos pelo mundo.', 'Gundua matukio ya moja kwa moja kutoka majukwaani duniani.'],
		['Previous concert pictures', 'Fotos de conciertos anteriores', 'Photos de concert précédentes', 'Fotos dos shows anteriores', 'Picha za tamasha zilizotangulia'],
		['Next concert pictures', 'Fotos de conciertos siguientes', 'Photos de concert suivantes', 'Próximas fotos de shows', 'Picha zinazofuata za tamasha'],
		['Concert photos carousel', 'Carrusel de fotos de conciertos', 'Carrousel de photos de concerts', 'Carrossel de fotos de shows', 'Mzunguko wa picha za matamasha'],
		['One crowd. One heartbeat.', 'Una multitud. Un solo latido.', 'Une foule. Un seul cœur.', 'Uma multidão. Um só coração.', 'Umati mmoja. Mpigo mmoja wa moyo.'],
		['Every song has a story.', 'Cada canción tiene una historia.', 'Chaque chanson a une histoire.', 'Toda música tem uma história.', 'Kila wimbo una hadithi.'],
		['Music brings us closer.', 'La música nos acerca.', 'La musique nous rapproche.', 'A música nos aproxima.', 'Muziki hutuleta karibu.'],
		['Make the night yours.', 'Haz tuya la noche.', 'Faites vôtre cette nuit.', 'Faça a noite ser sua.', 'Ifanye usiku uwe wako.'],
		['Find your people. Play out loud.', 'Encuentra a tu gente. Toca sin miedo.', 'Trouvez votre communauté. Jouez sans retenue.', 'Encontre sua turma. Toque sem limites.', 'Tafuta watu wako. Cheza kwa sauti.'],
		['Live music, everywhere.', 'Música en vivo, en todas partes.', 'La musique live, partout.', 'Música ao vivo, em todo lugar.', 'Muziki wa moja kwa moja, kila mahali.'],
		['Concert photography via Unsplash', 'Fotografías de conciertos vía Unsplash', 'Photos de concert via Unsplash', 'Fotos de shows via Unsplash', 'Picha za tamasha kupitia Unsplash'],
		['Go to concert photo', 'Ir a la foto del concierto', 'Accéder à la photo du concert', 'Ir para a foto do show', 'Nenda kwenye picha ya tamasha'],
		['The praise · Live', 'Alabanza · En vivo', 'Louange · En direct', 'Louvor · Ao vivo', 'Sifa · Moja kwa moja'],
		['Concert picks', 'Conciertos destacados', 'Concerts à découvrir', 'Shows em destaque', 'Matamasha yaliyopendekezwa'],
		['Personal dashboard', 'Panel personal', 'Tableau de bord personnel', 'Painel pessoal', 'Dashibodi binafsi'],
		['My dashboard', 'Mi panel', 'Mon tableau de bord', 'Meu painel', 'Dashibodi yangu'],
		['My account', 'Mi cuenta', 'Mon compte', 'Minha conta', 'Akaunti yangu'],
		['Account details', 'Detalles de la cuenta', 'Détails du compte', 'Detalhes da conta', 'Maelezo ya akaunti'],
		['Musicians World community', 'Comunidad Musicians World', 'Communauté Musicians World', 'Comunidade Musicians World', 'Jumuiya ya Musicians World'],
		['Your local date and weather', 'Tu fecha y clima locales', 'Votre date et météo locales', 'Sua data e clima locais', 'Tarehe na hali ya hewa ya eneo lako'],
		['Workspace summary', 'Resumen del espacio de trabajo', 'Résumé de l’espace de travail', 'Resumo do espaço de trabalho', 'Muhtasari wa eneo la kazi'],
		['Your account summary', 'Resumen de tu cuenta', 'Résumé de votre compte', 'Resumo da sua conta', 'Muhtasari wa akaunti yako'],
		['Approved artists', 'Artistas aprobados', 'Artistes approuvés', 'Artistas aprovados', 'Wasanii walioidhinishwa'],
		['Awaiting review', 'Pendiente de revisión', 'En attente de vérification', 'Aguardando análise', 'Inasubiri ukaguzi'],
		['Access requests', 'Solicitudes de acceso', 'Demandes d’accès', 'Solicitações de acesso', 'Maombi ya ufikiaji'],
		['Your role', 'Tu rol', 'Votre rôle', 'Sua função', 'Jukumu lako'],
		['Assigned access', 'Acceso asignado', 'Accès attribué', 'Acesso atribuído', 'Ufikiaji uliokabidhiwa'],
		['Digital signing', 'Firma digital', 'Signature numérique', 'Assinatura digital', 'Sahihi ya kidijitali'],
		['Preparing', 'Preparando', 'Préparation', 'Preparando', 'Inaandaa'],
		['Community access', 'Acceso a la comunidad', 'Accès à la communauté', 'Acesso à comunidade', 'Ufikiaji wa jumuiya'],
		['New member requests', 'Solicitudes de nuevos miembros', 'Demandes de nouveaux membres', 'Solicitações de novos membros', 'Maombi ya wanachama wapya'],
		['Team member', 'Miembro del equipo', 'Membre de l’équipe', 'Membro da equipe', 'Mwanatimu'],
		['Username / email', 'Usuario / correo', 'Nom d’utilisateur / e-mail', 'Usuário / e-mail', 'Jina la mtumiaji / barua pepe'],
		['Country joined from', 'País desde el que se unió', 'Pays d’inscription', 'País de entrada', 'Nchi aliyojiunga kutoka'],
		['Role / type', 'Rol / tipo', 'Rôle / type', 'Função / tipo', 'Jukumu / aina'],
		['Joined', 'Se unió', 'Inscription', 'Entrou', 'Alijiunga'],
		['Last sign-in', 'Último acceso', 'Dernière connexion', 'Último acesso', 'Kuingia kwa mwisho'],
		['Last sign-out', 'Última salida', 'Dernière déconnexion', 'Última saída', 'Kutoka kwa mwisho'],
		['Access', 'Acceso', 'Accès', 'Acesso', 'Ufikiaji'],
		['Account history', 'Historial de la cuenta', 'Historique du compte', 'Histórico da conta', 'Historia ya akaunti'],
		['Explicit sign-in and sign-out actions for approved accounts.', 'Acciones de inicio y cierre de sesión de cuentas aprobadas.', 'Actions de connexion et déconnexion des comptes approuvés.', 'Ações de acesso e saída de contas aprovadas.', 'Vitendo vya kuingia na kutoka kwa akaunti zilizoidhinishwa.'],
		['Temporary password', 'Contraseña temporal', 'Mot de passe temporaire', 'Senha temporária', 'Nenosiri la muda'],
		['Community staff', 'Equipo de la comunidad', 'Équipe communautaire', 'Equipe da comunidade', 'Wafanyakazi wa jumuiya'],
		['Musician', 'Músico', 'Musicien', 'Músico', 'Mwanamuziki'],
		['Restore', 'Restaurar', 'Restaurer', 'Restaurar', 'Rejesha'],
		['Backup', 'Copia de seguridad', 'Sauvegarde', 'Backup', 'Hifadhi rudufu'],
		['System', 'Sistema', 'Système', 'Sistema', 'Mfumo'],
		['Archive', 'Archivo', 'Archive', 'Arquivo', 'Kumbukumbu'],
		['Sign-in name', 'Nombre de acceso', 'Identifiant de connexion', 'Nome de acesso', 'Jina la kuingia'],
		['Email sign-in', 'Acceso por correo electrónico', 'Connexion par e-mail', 'Acesso por e-mail', 'Kuingia kwa barua pepe'],
		['Current password', 'Contraseña actual', 'Mot de passe actuel', 'Senha atual', 'Nenosiri la sasa'],
		['Statement to sign', 'Declaración para firmar', 'Déclaration à signer', 'Declaração para assinar', 'Taarifa ya kusaini'],
		['Signed record', 'Registro firmado', 'Document signé', 'Registro assinado', 'Rekodi iliyosainiwa'],
		['Verify a signed record', 'Verificar un registro firmado', 'Vérifier un document signé', 'Verificar um registro assinado', 'Thibitisha rekodi iliyosainiwa'],
		['Choose a profile picture that is 5 MB or smaller.', 'Elige una foto de perfil de 5 MB o menos.', 'Choisissez une photo de profil de 5 Mo maximum.', 'Escolha uma foto de perfil de até 5 MB.', 'Chagua picha ya wasifu isiyozidi MB 5.'],
		['Choose a JPEG, PNG, or WebP profile picture.', 'Elige una foto de perfil JPEG, PNG o WebP.', 'Choisissez une photo de profil JPEG, PNG ou WebP.', 'Escolha uma foto de perfil JPEG, PNG ou WebP.', 'Chagua picha ya wasifu ya JPEG, PNG au WebP.'],
		['Secure access', 'Acceso seguro', 'Accès sécurisé', 'Acesso seguro', 'Ufikiaji salama'],
		['Light mode', 'Modo claro', 'Mode clair', 'Modo claro', 'Hali ya mwanga'],
		['Concert photo pages', 'Páginas de fotos de conciertos', 'Pages de photos de concerts', 'Páginas de fotos de shows', 'Kurasa za picha za matamasha'],
		['Your member details and account settings stay private.', 'Los datos de tu cuenta y configuración son privados.', 'Les informations de votre compte restent privées.', 'Os dados da sua conta permanecem privados.', 'Maelezo na mipangilio ya akaunti yako ni ya faragha.'],
		['The sound of a global community', 'El sonido de una comunidad global', 'Le son d’une communauté mondiale', 'O som de uma comunidade global', 'Sauti ya jumuiya ya kimataifa'],
		['Your creative corner', 'Tu rincón creativo', 'Votre coin créatif', 'Seu espaço criativo', 'Eneo lako la ubunifu'],
		['Choose the language for the entire interface.', 'Elige el idioma de toda la interfaz.', 'Choisissez la langue de toute l’interface.', 'Escolha o idioma de toda a interface.', 'Chagua lugha ya kiolesura kizima.'],
		['Your preferred language is saved with your account.', 'Tu idioma preferido se guarda en tu cuenta.', 'Votre langue préférée est enregistrée dans votre compte.', 'Seu idioma preferido é salvo na sua conta.', 'Lugha unayopendelea huhifadhiwa kwenye akaunti yako.'],
		['Explore the world of music', 'Explora el mundo de la música', 'Explorez le monde de la musique', 'Explore o mundo da música', 'Gundua ulimwengu wa muziki'],
		['Local musicians', 'Músicos locales', 'Musiciens locaux', 'Músicos locais', 'Wanamuziki wa eneo'],
		['All countries', 'Todos los países', 'Tous les pays', 'Todos os países', 'Nchi zote'],
		['Contact seller', 'Contactar al vendedor', 'Contacter le vendeur', 'Contatar vendedor', 'Wasiliana na muuzaji'],
		['Play', 'Reproducir', 'Lire', 'Reproduzir', 'Cheza'],
		['Like', 'Me gusta', 'J’aime', 'Curtir', 'Penda'],
		['Unlike', 'Ya no me gusta', 'Je n’aime plus', 'Descurtir', 'Usipende'],
		['Reply', 'Responder', 'Répondre', 'Responder', 'Jibu'],
		['Edit', 'Editar', 'Modifier', 'Editar', 'Hariri'],
		['Delete', 'Eliminar', 'Supprimer', 'Excluir', 'Futa'],
		['Save', 'Guardar', 'Enregistrer', 'Salvar', 'Hifadhi'],
		['Cancel', 'Cancelar', 'Annuler', 'Cancelar', 'Ghairi'],
		['Post', 'Publicar', 'Publier', 'Publicar', 'Chapisha'],
		['Send', 'Enviar', 'Envoyer', 'Enviar', 'Tuma'],
		['Refresh', 'Actualizar', 'Actualiser', 'Atualizar', 'Onyesha upya'],
		['Loading tracks…', 'Cargando pistas…', 'Chargement des morceaux…', 'Carregando faixas…', 'Inapakia nyimbo…'],
		['No upcoming gigs yet. Know a stage that needs a sound? Post the first opportunity.', 'Aún no hay conciertos. ¿Conoces un escenario que necesite música? Publica la primera oportunidad.', 'Aucun concert à venir. Une scène cherche un artiste ? Publiez la première annonce.', 'Ainda não há shows. Conhece um palco que precisa de música? Publique a primeira oportunidade.', 'Bado hakuna nafasi zijazo. Unajua jukwaa linalohitaji muziki? Tangaza nafasi ya kwanza.'],
		['Find a musician', 'Buscar un músico', 'Trouver un musicien', 'Encontrar um músico', 'Tafuta mwanamuziki'],
		['Get in touch', 'Ponerse en contacto', 'Contacter', 'Entrar em contato', 'Wasiliana'],
		['Pending', 'Pendiente', 'En attente', 'Pendente', 'Inasubiri'],
		['Approved', 'Aprobado', 'Approuvé', 'Aprovado', 'Imeidhinishwa'],
		['Not provided', 'No indicado', 'Non renseigné', 'Não informado', 'Haijatolewa'],
		['No musicians found in this country yet.', 'Aún no hay músicos en este país.', 'Aucun musicien trouvé dans ce pays pour le moment.', 'Ainda não há músicos neste país.', 'Bado hakuna wanamuziki katika nchi hii.'],
		['Write a message…', 'Escribe un mensaje…', 'Écrivez un message…', 'Escreva uma mensagem…', 'Andika ujumbe…'],
		['Share a public video link', 'Comparte un enlace de video público', 'Partagez un lien vidéo public', 'Compartilhe um link público de vídeo', 'Shiriki kiungo cha video ya umma'],
		['Share your music', 'Comparte tu música', 'Partagez votre musique', 'Compartilhe sua música', 'Shiriki muziki wako'],
		['Shop instruments and gear', 'Compra instrumentos y equipos', 'Achetez des instruments et du matériel', 'Compre instrumentos e equipamentos', 'Nunua ala na vifaa'],
		['Browse the marketplace', 'Explorar el mercado', 'Parcourir la boutique', 'Explorar o mercado', 'Vinjari soko'],
		['Opportunity', 'Oportunidad', 'Opportunité', 'Oportunidade', 'Nafasi'],
		['Live show', 'Actuación en vivo', 'Spectacle en direct', 'Show ao vivo', 'Onyesho la moja kwa moja'],
		['Your profile', 'Tu perfil', 'Votre profil', 'Seu perfil', 'Wasifu wako'],
		['Share your location with the community', 'Comparte tu ubicación con la comunidad', 'Partagez votre position avec la communauté', 'Compartilhe sua localização com a comunidade', 'Shiriki eneo lako na jumuiya'],
		['Your location is private unless you choose to share it.', 'Tu ubicación es privada a menos que decidas compartirla.', 'Votre position reste privée sauf si vous choisissez de la partager.', 'Sua localização é privada, a menos que você escolha compartilhá-la.', 'Eneo lako ni la faragha isipokuwa uchague kulishiriki.'],
		['Your account email is private and visible only to you and administrators.', 'El correo de tu cuenta es privado y solo tú y los administradores pueden verlo.', 'L’e-mail de votre compte est privé et visible uniquement par vous et les administrateurs.', 'O e-mail da sua conta é privado e visível apenas para você e administradores.', 'Barua pepe ya akaunti yako ni ya faragha na inaonekana kwako na kwa wasimamizi pekee.'],
		['Music quote', 'Cita musical', 'Citation musicale', 'Frase musical', 'Nukuu ya muziki'],
		['A note from Musicians World', 'Una nota de Musicians World', 'Un mot de Musicians World', 'Uma mensagem do Musicians World', 'Ujumbe kutoka Musicians World'],
		['Dismiss quote', 'Cerrar cita', 'Fermer la citation', 'Fechar frase', 'Funga nukuu'],
		['New quote', 'Otra cita', 'Nouvelle citation', 'Nova frase', 'Nukuu nyingine'],
		['Music turns the spaces between us into a place to belong.', 'La música convierte la distancia entre nosotros en un lugar al que pertenecer.', 'La musique transforme la distance entre nous en un lieu où chacun a sa place.', 'A música transforma a distância entre nós em um lugar de pertencimento.', 'Muziki hubadilisha nafasi kati yetu kuwa mahali pa kuwa pamoja.'],
		['Every voice carries a world; together, we make a song.', 'Cada voz lleva un mundo; juntos, creamos una canción.', 'Chaque voix porte un monde ; ensemble, nous créons une chanson.', 'Cada voz carrega um mundo; juntos, criamos uma canção.', 'Kila sauti hubeba ulimwengu; pamoja, tunatengeneza wimbo.'],
		['One shared rhythm can make strangers feel like family.', 'Un ritmo compartido puede hacer que desconocidos se sientan familia.', 'Un rythme partagé peut rapprocher des inconnus comme une famille.', 'Um ritmo compartilhado pode fazer desconhecidos se sentirem família.', 'Mdundo wa pamoja unaweza kuwafanya wageni wajihisi kama familia.'],
		['Keep creating. Somewhere, your next song is already finding its people.', 'Sigue creando. En algún lugar, tu próxima canción ya está encontrando a su gente.', 'Continuez à créer. Quelque part, votre prochaine chanson trouve déjà son public.', 'Continue criando. Em algum lugar, sua próxima música já está encontrando seu público.', 'Endelea kubuni. Mahali fulani, wimbo wako unaofuata tayari unawapata watu wake.'],
		['Public profile', 'Perfil público', 'Profil public', 'Perfil público', 'Wasifu wa umma'],
		['Admin profile', 'Perfil del administrador', 'Profil de l’administrateur', 'Perfil do administrador', 'Wasifu wa msimamizi'],
		['Your photo and short introduction appear in the community directory.', 'Tu foto y una breve presentación aparecen en el directorio de la comunidad.', 'Votre photo et une courte présentation apparaissent dans l’annuaire de la communauté.', 'Sua foto e uma breve apresentação aparecem no diretório da comunidade.', 'Picha yako na utangulizi mfupi huonekana kwenye orodha ya jumuiya.'],
		['Profile picture', 'Foto de perfil', 'Photo de profil', 'Foto do perfil', 'Picha ya wasifu'],
		['JPEG, PNG, or WebP up to 5 MB.', 'JPEG, PNG o WebP de hasta 5 MB.', 'JPEG, PNG ou WebP jusqu’à 5 Mo.', 'JPEG, PNG ou WebP de até 5 MB.', 'JPEG, PNG au WebP hadi MB 5.'],
		['Remove current profile picture', 'Quitar la foto de perfil actual', 'Supprimer la photo de profil actuelle', 'Remover a foto atual do perfil', 'Ondoa picha ya sasa ya wasifu'],
		['Short description', 'Breve descripción', 'Courte présentation', 'Breve descrição', 'Maelezo mafupi'],
		['Introduce yourself to the music community…', 'Preséntate a la comunidad musical…', 'Présentez-vous à la communauté musicale…', 'Apresente-se à comunidade musical…', 'Jitambulishe kwa jumuiya ya muziki…'],
		['Up to 300 characters.', 'Hasta 300 caracteres.', 'Jusqu’à 300 caractères.', 'Até 300 caracteres.', 'Hadi herufi 300.'],
		['Save admin profile', 'Guardar perfil del administrador', 'Enregistrer le profil administrateur', 'Salvar perfil do administrador', 'Hifadhi wasifu wa msimamizi'],
	];
	const languages = ['en', 'es', 'fr', 'pt', 'sw'];
	const dictionaries = Object.fromEntries(languages.map((language, index) => [
		language,
		Object.fromEntries(rows.map((row) => [row[0].normalize('NFC'), row[index].normalize('NFC')])),
	]));
	const originalTexts = new WeakMap();
	const originalAttributes = new WeakMap();
	let selectedLanguage = 'en';

	function sourceText(node) {
		const text = node.nodeValue || '';
		const saved = originalTexts.get(node);
		if (saved !== undefined && languages.some((language) => dictionaries[language][saved] === text.trim())) return saved;
		originalTexts.set(node, text.trim());
		return text.trim();
	}

	function translateNode(node) {
		if (node.nodeType !== Node.TEXT_NODE || !node.parentElement) return;
		if (node.parentElement.closest('script,style,[data-no-translate]')) return;
		const original = sourceText(node);
		const translated = dictionaries[selectedLanguage][original];
		if (!translated) return;
		const leading = node.nodeValue.match(/^\s*/)?.[0] || '';
		const trailing = node.nodeValue.match(/\s*$/)?.[0] || '';
		const nextValue = `${leading}${translated}${trailing}`;
		if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
	}

	function translateAttribute(element, attribute) {
		const value = element.getAttribute(attribute);
		if (!value) return;
		let saved = originalAttributes.get(element);
		if (!saved) {
			saved = new Map();
			originalAttributes.set(element, saved);
		}
		const original = saved.has(attribute) && languages.some((language) => dictionaries[language][saved.get(attribute)] === value)
			? saved.get(attribute)
			: value;
		saved.set(attribute, original);
		const translated = dictionaries[selectedLanguage][original];
		if (translated && element.getAttribute(attribute) !== translated) element.setAttribute(attribute, translated);
	}

	function translateTree(root) {
		if (root.nodeType === Node.TEXT_NODE) {
			translateNode(root);
			return;
		}
		if (root.nodeType === Node.ELEMENT_NODE) {
			for (const attribute of ['placeholder', 'aria-label', 'title']) translateAttribute(root, attribute);
		}
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		let node;
		while ((node = walker.nextNode())) translateNode(node);
	}

	function apply(language) {
		selectedLanguage = languages.includes(language) ? language : 'en';
		document.documentElement.lang = selectedLanguage;
		if (document.title) {
			const match = document.title.match(/^(Musicians World)(.*)$/);
			if (match) document.title = `${match[1]}${dictionaries[selectedLanguage][match[2].trim()] ? ` ${dictionaries[selectedLanguage][match[2].trim()]}` : match[2]}`;
		}
		translateTree(document.body);
	}

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'characterData') translateNode(mutation.target);
			for (const node of mutation.addedNodes) translateTree(node);
			if (mutation.type === 'attributes') translateAttribute(mutation.target, mutation.attributeName);
		}
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['placeholder', 'aria-label', 'title'],
		characterData: true,
		childList: true,
		subtree: true,
	});

	window.MWLocale = {
		apply,
		translate: (text) => dictionaries[selectedLanguage][String(text).normalize('NFC')] || text,
		get language() { return selectedLanguage; },
	};
})();
