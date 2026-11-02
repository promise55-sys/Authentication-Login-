'use strict';

const byId = (id) => document.getElementById(id);
const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_PROFILE_PHOTO_UPLOAD_SIZE = 3 * 1024 * 1024;
const loginView = byId('loginView');
const appView = byId('appView');
const steps = { setup: byId('setupStep'), login: byId('passwordStep'), signup: byId('signupStep'), recovery: byId('recoveryStep') };
let csrfToken = '';
let currentAccount = null;
let signingKey = null;
let splashProgressTimer = null;
let googleSignInClientId = '';
let googleSignInNonce = '';
let languageChosenBeforeSignIn = false;
const mobileMode = location.pathname === '/mobile' || location.pathname.startsWith('/mobile/') || new URLSearchParams(location.search).get('mobile') === '1';
let communityData = { posts: [], replies: [], gigs: [], musicians: [], tracks: [], comments: [], profile: {}, user: null };
let detectedCountry = '';
let worldTimeZoneId = '';
const countryCodesByName = new Map();
const countryNamesByCode = new Map();

function setPreferredLanguage(language) {
	const supported = ['en', 'es', 'fr', 'pt', 'sw'];
	const selected = supported.includes(language) ? language : 'en';
	window.MWLocale?.apply(selected);
	document.documentElement.lang = selected;
	localStorage.setItem('mw-language', selected);
	for (const id of ['introLanguage', 'headerLanguage', 'profileLanguage']) {
		const select = byId(id);
		if (select) select.value = selected;
	}
	localizeCountryOptions();
}

const savedLanguage = localStorage.getItem('mw-language');
const browserLanguage = navigator.language?.slice(0, 2);
setPreferredLanguage(savedLanguage || (['en', 'es', 'fr', 'pt', 'sw'].includes(browserLanguage) ? browserLanguage : 'en'));

function setStep(name) {
	if (!loginView) return;
	Object.entries(steps).forEach(([key, section]) => { if (section) section.hidden = key !== name; });
	loginView.hidden = false;
	if (appView) appView.hidden = true;
}

function formatAccountDate(value) {
	if (!value) return '—';
	const text = String(value);
	const date = new Date(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(text) ? `${text.replace(' ', 'T')}Z` : text);
	return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(communityData.profile?.language || 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function roleLabel(role) {
	const label = role === 'admin' ? 'Admin' : role === 'staff' ? 'Customer service' : 'Musician';
	return window.MWLocale?.translate(label) || label;
}

function memberTypeLabel(type) {
	const label = ({ singer: 'Singer / vocalist', instrumentalist: 'Instrumentalist', seller: 'Instrument and gear seller' })[type] || 'Musician';
	return window.MWLocale?.translate(label) || label;
}

function avatarIcon(preset) {
	return ({ guitar: '🎸', microphone: '🎤', drums: '🥁', keyboard: '🎹', notes: '🎵' })[preset] || '🎸';
}

function countryFlag(code) {
	const normalized = String(code || '').toUpperCase();
	return /^[A-Z]{2}$/.test(normalized)
		? String.fromCodePoint(...[...normalized].map((letter) => letter.charCodeAt(0) + 127397))
		: '';
}

function localizedCountryName(code, fallback) {
	if (!code) return fallback;
	try { return new Intl.DisplayNames([window.MWLocale?.language || 'en'], { type: 'region' }).of(code) || fallback; }
	catch { return fallback; }
}

const heroPromoVideos = [
	{ id: 'lwVRB-afOqg', title: 'Nkyinkyim Xperience 2025', channel: 'Nkyinkyim Band', category: 'Gospel concert', description: 'A festival-scale gospel celebration from Nkyinkyim Band.' },
	{ id: 'MrWEWiZDx9Q', title: 'The Praise · Live', channel: 'Diana Hamilton Official', category: 'Praise and worship', description: 'Join Diana Hamilton for an energetic live praise moment.' },
	{ id: 'iDQ4TFhQ2iU', title: 'Spirit Of Praise 7', channel: 'Spirit Network', category: 'Gospel ensemble', description: 'A collective worship performance from the Spirit Of Praise series.' },
	{ id: 'gIWCDgNt5ww', title: 'Full Worship Set · Live', channel: 'Worship Together', category: 'Worship set', description: 'Settle into a full worship session and sing along.' },
	{ id: 'FwU99s4pfzA', title: 'The Iconic Live Experience', channel: 'The Icons Music', category: 'Live experience', description: 'A concert-stage performance centered on the energy of The Icons.' },
];

function initializeHeroPromoCarousel() {
	const gallery = byId('heroPromoCarousel');
	const list = byId('heroPromoList');
	const video = byId('heroLiveVideo');
	if (!gallery || !list || !video || gallery.dataset.initialized) return;
	gallery.dataset.initialized = 'true';
	for (const promo of heroPromoVideos) {
		const card = document.createElement('article');
		card.className = 'hero-promo-card';
		const preview = document.createElement('button');
		preview.className = 'hero-promo-preview';
		preview.type = 'button';
		preview.setAttribute('aria-label', `Play ${promo.title} by ${promo.channel}`);
		preview.dataset.videoId = promo.id;
		const thumbnail = document.createElement('img');
		thumbnail.src = `https://i.ytimg.com/vi/${promo.id}/hqdefault.jpg`;
		thumbnail.alt = '';
		thumbnail.loading = 'lazy';
		thumbnail.decoding = 'async';
		const play = document.createElement('span');
		play.className = 'hero-promo-play';
		play.setAttribute('aria-hidden', 'true');
		play.textContent = '▶';
		preview.append(thumbnail, play);
		const details = document.createElement('div');
		details.className = 'hero-promo-details';
		addText(details, 'span', 'hero-promo-category', promo.category);
		addText(details, 'h4', '', promo.title);
		addText(details, 'p', 'hero-promo-channel', promo.channel);
		addText(details, 'p', 'hero-promo-description', promo.description);
		const watch = document.createElement('button');
		watch.className = 'hero-promo-action';
		watch.type = 'button';
		watch.textContent = 'Watch performance';
		card.append(preview, details);
		details.append(watch);
		list.append(card);
		const startPlayback = () => {
			const player = document.createElement('iframe');
			player.className = 'hero-promo-player';
			player.title = `Watch ${promo.title} by ${promo.channel}`;
			player.loading = 'lazy';
			player.referrerPolicy = 'strict-origin-when-cross-origin';
			player.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
			player.allowFullscreen = true;
			player.src = `https://www.youtube-nocookie.com/embed/${promo.id}?autoplay=1&playsinline=1&rel=0`;
			preview.replaceWith(player);
			watch.disabled = true;
			watch.textContent = 'Player opened';
		};
		preview.addEventListener('click', startPlayback, { once: true });
		watch.addEventListener('click', startPlayback, { once: true });
	}
	for (const [id, direction] of [['heroPromoPrevious', -1], ['heroPromoNext', 1]]) {
		byId(id)?.addEventListener('click', () => {
			const card = list.querySelector('.hero-promo-card');
			list.scrollBy({ left: direction * (card?.getBoundingClientRect().width || list.clientWidth), behavior: 'smooth' });
		});
	}
	const revealPromos = () => {
		if (video.dataset.promoShown === 'true') return;
		video.dataset.promoShown = 'true';
		video.pause();
		const skip = byId('heroVideoSkip');
		if (skip) skip.hidden = true;
	};
	video.addEventListener('ended', revealPromos, { once: true });
	video.addEventListener('error', revealPromos, { once: true });
	byId('heroVideoSkip')?.addEventListener('click', revealPromos);
}

initializeHeroPromoCarousel();

function initializeConcertGallery() {
	const gallery = byId('concertGalleryTrack');
	if (!gallery || gallery.dataset.initialized) return;
	gallery.dataset.initialized = 'true';
	const cards = [...gallery.querySelectorAll('.concert-gallery-card')];
	const dots = byId('concertGalleryDots');
	const previous = byId('concertPrevious');
	const next = byId('concertNext');
	if (!cards.length || !dots || !previous || !next) return;
	const moments = [
		{ category: 'The audience', description: 'Feel the shared energy as a festival crowd moves with the music.' },
		{ category: 'Solo spotlight', description: 'A closer look at the lights, presence, and emotion of a live set.' },
		{ category: 'Crowd moment', description: 'A room full of listeners sharing one unforgettable chorus.' },
		{ category: 'Stage lights', description: 'Color and late-night production set the mood for this performance.' },
		{ category: 'Band chemistry', description: 'Musicians play side by side, building a sound together on stage.' },
	];
	const photoDialog = document.createElement('dialog');
	photoDialog.className = 'concert-photo-dialog';
	photoDialog.setAttribute('aria-labelledby', 'concertPhotoDialogTitle');
	const dialogContent = document.createElement('div');
	dialogContent.className = 'concert-photo-dialog-content';
	const closeDialog = document.createElement('button');
	closeDialog.className = 'concert-photo-dialog-close';
	closeDialog.type = 'button';
	closeDialog.textContent = 'Close';
	closeDialog.setAttribute('aria-label', 'Close concert photo');
	const dialogImage = document.createElement('img');
	const dialogDetails = document.createElement('div');
	dialogDetails.className = 'concert-photo-dialog-details';
	const dialogTitle = document.createElement('h2');
	dialogTitle.id = 'concertPhotoDialogTitle';
	const dialogDescription = document.createElement('p');
	dialogContent.append(closeDialog, dialogImage, dialogDetails);
	dialogDetails.append(dialogTitle, dialogDescription);
	photoDialog.append(dialogContent);
	document.body.append(photoDialog);
	let photoTrigger = null;
	closeDialog.addEventListener('click', () => photoDialog.close());
	photoDialog.addEventListener('click', (event) => {
		if (event.target === photoDialog) photoDialog.close();
	});
	photoDialog.addEventListener('close', () => photoTrigger?.focus());

	const cardPosition = (card) => card.getBoundingClientRect().left - gallery.getBoundingClientRect().left + gallery.scrollLeft;
	const activeIndex = () => {
		const left = gallery.scrollLeft;
		return cards.reduce((nearest, card, index) =>
			Math.abs(cardPosition(card) - left) < Math.abs(cardPosition(cards[nearest]) - left) ? index : nearest, 0);
	};
	const showCard = (index) => gallery.scrollTo({ left: cardPosition(cards[index]), behavior: 'smooth' });
	cards.forEach((card, index) => {
		const image = card.querySelector('img');
		const caption = card.querySelector('.concert-gallery-caption');
		const title = caption?.querySelector('h3');
		const moment = moments[index];
		if (image && caption && title && moment) {
			addText(caption, 'p', 'concert-gallery-description', moment.description);
			const viewPhoto = document.createElement('button');
			viewPhoto.className = 'concert-gallery-view';
			viewPhoto.type = 'button';
			viewPhoto.textContent = 'View photo';
			viewPhoto.setAttribute('aria-label', `View photo: ${title.textContent}`);
			viewPhoto.addEventListener('click', () => {
				photoTrigger = viewPhoto;
				dialogImage.src = image.currentSrc || image.src;
				dialogImage.alt = image.alt;
				dialogTitle.textContent = title.textContent;
				dialogDescription.textContent = moment.description;
				photoDialog.showModal();
			});
			caption.append(viewPhoto);
		}
		const dot = document.createElement('button');
		dot.type = 'button';
		dot.className = 'concert-gallery-dot';
		dot.setAttribute('aria-label', `${window.MWLocale?.translate('Go to concert photo') || 'Go to concert photo'} ${index + 1}`);
		dot.addEventListener('click', () => showCard(index));
		dots.append(dot);
	});

	const updateDots = () => {
		const selected = activeIndex();
		for (const [index, dot] of [...dots.children].entries()) {
			dot.classList.toggle('active', index === selected);
			dot.setAttribute('aria-current', index === selected ? 'true' : 'false');
		}
	};
	previous.addEventListener('click', () => showCard((activeIndex() - 1 + cards.length) % cards.length));
	next.addEventListener('click', () => showCard((activeIndex() + 1) % cards.length));
	gallery.addEventListener('scroll', updateDots, { passive: true });
	updateDots();

	let timer = 0;
	const pause = () => window.clearInterval(timer);
	const resume = () => {
		pause();
		if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			timer = window.setInterval(() => {
				if (document.hidden || gallery.matches(':hover') || gallery.contains(document.activeElement)) return;
				showCard((activeIndex() + 1) % cards.length);
			}, 6000);
		}
	};
	gallery.addEventListener('pointerenter', pause);
	gallery.addEventListener('pointerleave', resume);
	gallery.addEventListener('focusin', pause);
	gallery.addEventListener('focusout', (event) => {
		if (!gallery.contains(event.relatedTarget)) resume();
	});
	document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else resume(); });
	resume();
}

initializeConcertGallery();

const musicQuotes = [
	'Music turns the spaces between us into a place to belong.',
	'Every voice carries a world; together, we make a song.',
	'One shared rhythm can make strangers feel like family.',
	'Keep creating. Somewhere, your next song is already finding its people.',
];

function initializeMusicQuote() {
	const popup = byId('musicQuotePopup');
	const quote = byId('musicQuoteText');
	if (!popup || !quote || popup.dataset.initialized) return;
	popup.dataset.initialized = 'true';
	let index = Math.floor(Math.random() * musicQuotes.length);
	const renderQuote = () => { quote.textContent = musicQuotes[index]; };
	byId('musicQuoteClose')?.addEventListener('click', () => { popup.hidden = true; });
	byId('musicQuoteNext')?.addEventListener('click', () => {
		index = (index + 1) % musicQuotes.length;
		renderQuote();
	});
	renderQuote();
}

initializeMusicQuote();

document.querySelectorAll('#introLanguage, #headerLanguage, #profileLanguage').forEach((select) => select.addEventListener('change', async () => {
	if (!currentAccount) languageChosenBeforeSignIn = true;
	setPreferredLanguage(select.value);
	if (!currentAccount) return;
	try {
		const result = await request('update-language', 'POST', { language: select.value });
		communityData.profile.language = result.language;
		showMessage('accountMessage', result.message, true);
	} catch (error) {
		showMessage('accountMessage', error.message);
	}
}));

function showMessage(id, message, success = false) {
	const element = byId(id);
	element.textContent = window.MWLocale?.translate(message) || message;
	element.classList.toggle('success', success);
}

async function request(action, method = 'POST', payload = null) {
	if (location.protocol === 'file:') throw new Error('Open this app through the Node.js server at http://127.0.0.1:8001. Do not open the HTML file directly.');
	const options = { method, credentials: 'same-origin', headers: {} };
	const params = new URLSearchParams({ action });
	if (method === 'POST') {
		options.headers['Content-Type'] = 'application/json';
		options.headers['X-CSRF-Token'] = csrfToken;
		options.body = JSON.stringify(payload || {});
	} else if (payload && typeof payload === 'object') {
		for (const [key, value] of Object.entries(payload)) params.set(key, String(value));
	}
	let response;
	try {
		response = await fetch(`/api?${params}`, options);
	} catch {
		throw new Error('Cannot reach the Node.js server. In this folder, run npm.cmd install and npm.cmd start, then open http://127.0.0.1:8001.');
	}
	let result;
	try { result = await response.json(); }
	catch { throw new Error('The Node.js API is not responding. Start the app with npm.cmd start and open http://127.0.0.1:8001, not VS Code Go Live.'); }
	if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('The server returned an invalid response.');
	if (!response.ok) {
		const reference = result.requestId ? ` (Reference: ${result.requestId})` : '';
		throw new Error(`${result.error || 'The request could not be completed.'}${reference}`);
	}
	return result;
}

function formValues(form) {
	return Object.fromEntries(new FormData(form));
}

async function attachProfilePhoto(values, file) {
	if (!(file instanceof File) || !file.size) return;
	if (file.size > MAX_PROFILE_PHOTO_SIZE) throw new Error('Choose a profile picture that is 5 MB or smaller.');
	if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP profile picture.');
	let uploadFile = file;
	if (file.size > MAX_PROFILE_PHOTO_UPLOAD_SIZE) {
		const imageUrl = URL.createObjectURL(file);
		try {
			const image = new Image();
			image.src = imageUrl;
			await new Promise((resolve, reject) => {
				image.onload = resolve;
				image.onerror = () => reject(new Error('The profile picture could not be decoded.'));
			});
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			if (!context) throw new Error('This browser cannot process the selected profile picture.');
			let maxDimension = 2048;
			for (let attempt = 0; attempt < 8; attempt += 1) {
				const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
				canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
				canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
				context.fillStyle = '#fff';
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.drawImage(image, 0, 0, canvas.width, canvas.height);
				for (const quality of [0.86, 0.75, 0.64, 0.52]) {
					const compressed = await new Promise((resolve, reject) => {
						canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The profile picture could not be compressed.')), 'image/jpeg', quality);
					});
					if (compressed.size <= MAX_PROFILE_PHOTO_UPLOAD_SIZE) {
						uploadFile = compressed;
						break;
					}
				}
				if (uploadFile !== file) break;
				maxDimension = Math.floor(maxDimension * 0.8);
			}
			if (uploadFile === file) throw new Error('The selected profile picture could not be reduced enough to upload.');
		} finally {
			URL.revokeObjectURL(imageUrl);
		}
	}
	const dataUrl = await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ''));
		reader.onerror = () => reject(new Error('The profile picture could not be read.'));
		reader.readAsDataURL(uploadFile);
	});
	values.avatarBase64 = String(dataUrl).split(',')[1] || '';
	values.avatarMime = uploadFile.type || file.type;
}

function initializeCountryOptions(countries) {
	const select = byId('signupCountry');
	if (!Array.isArray(countries) || !countries.length) throw new Error('The country list could not be loaded. Refresh the page and try again.');
	for (const country of countries) {
		countryCodesByName.set(country.name.toLocaleLowerCase('en'), country.code);
		countryNamesByCode.set(country.code, country.name);
	}
	if (!select) return;
	select.replaceChildren(new Option(window.MWLocale?.translate('Choose your country') || 'Choose your country', ''), ...countries.map(({ code, name }) => new Option(localizedCountryName(code, name), code)));
}

function localizeCountryOptions() {
	const select = byId('signupCountry');
	if (!select) return;
	for (const option of select.options) {
		if (!option.value) option.textContent = window.MWLocale?.translate('Choose your country') || 'Choose your country';
		else option.textContent = localizedCountryName(option.value, countryNamesByCode.get(option.value) || option.textContent);
	}
}

function openPendingWorldTab() {
	if (mobileMode) return null;
	try {
		const tab = window.open('about:blank', '_blank');
		if (tab) tab.opener = null;
		return tab;
	} catch { return null; }
}

function openWorldTab(tab) {
	if (mobileMode) return;
	if (tab && !tab.closed) tab.location.replace('/world.html');
}

function handleGoogleCredential(response) {
	const messageId = byId('signupStep').hidden ? 'googleLoginMessage' : 'googleSignupMessage';
	(async () => {
		try {
			const countryCode = byId('signupCountry')?.value || '';
			if (messageId === 'googleSignupMessage' && !countryCode) {
				showMessage(messageId, 'Choose the country you are joining from before continuing with Google.');
				byId('signupCountry').focus();
				return;
			}
			const result = await request('google-login', 'POST', { credential: response.credential, countryCode });
			if (result.pendingApproval) {
				let message = result.emailSent
					? `${result.message} A confirmation email has been sent.`
					: `${result.message} Email delivery could not be confirmed.`;
				if (!result.adminNotified) message += ' The request remains visible in the administrator dashboard.';
				showMessage(messageId, message, true);
				return;
			}
			csrfToken = result.csrfToken;
			showMessage(messageId, '');
			openWorkspace(result.user);
		} catch (error) {
			showMessage(messageId, error.message);
		}
	})();
}

function initializeGoogleSignIn(clientId) {
	if (!loginView) return;
	googleSignInClientId = clientId;
	const sections = [byId('googleSignInSection'), byId('googleSignupSection')];
	sections.forEach((section) => { section.hidden = !clientId; });
	if (!clientId) return;

	const script = document.createElement('script');
	script.src = 'https://accounts.google.com/gsi/client';
	script.async = true;
	script.defer = true;
	script.onload = () => {
		const card = loginView.querySelector('.mobile-card, .auth-card');
		const cardStyles = card ? getComputedStyle(card) : null;
		const cardContentWidth = card && cardStyles
			? card.clientWidth - parseFloat(cardStyles.paddingLeft) - parseFloat(cardStyles.paddingRight)
			: 320;
		const buttonWidth = Math.max(200, Math.min(320, Math.floor(cardContentWidth)));
		window.google.accounts.id.initialize({ client_id: googleSignInClientId, nonce: googleSignInNonce, callback: handleGoogleCredential });
		window.google.accounts.id.renderButton(byId('googleSignInButton'), { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: buttonWidth });
		window.google.accounts.id.renderButton(byId('googleSignupButton'), { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: buttonWidth });
	};
	script.onerror = () => {
		sections.forEach((section) => {
			section.hidden = false;
			const message = section.id === 'googleSignInSection' ? 'googleLoginMessage' : 'googleSignupMessage';
			showMessage(message, 'Google sign-in could not be loaded. Please try again later.');
		});
	};
	document.head.append(script);
}

async function savePassword(values, checkboxId) {
	if (!byId(checkboxId).checked || typeof PasswordCredential === 'undefined' || !navigator.credentials?.store) return;
	try { await navigator.credentials.store(new PasswordCredential({ id: values.username, password: values.password })); } catch {}
}

function openWorkspace(user) {
	if (mobileMode && loginView) {
		location.replace('/world.html?mobile=1');
		return;
	}
	if (!appView) {
		location.replace('/world.html');
		return;
	}
	currentAccount = user;
	byId('welcomeSplash')?.setAttribute('hidden', '');
	window.clearInterval(splashProgressTimer);
	splashProgressTimer = null;
	if (loginView) loginView.hidden = true;
	appView.hidden = false;
	initializeMusicQuote();
	window.setTimeout(() => {
		const quotePopup = byId('musicQuotePopup');
		if (quotePopup) quotePopup.hidden = false;
	}, 900);
	if (!loginView && byId('worldOpenLink')) byId('worldOpenLink').hidden = true;
	history.replaceState(null, '', `${location.pathname}${location.search}`);
	window.scrollTo(0, 0);
	byId('welcomeText').textContent = `Signed in as ${user.name}`;
	byId('roleBadge').textContent = roleLabel(user.role);
	byId('roleBadge').title = user.role === 'admin' ? 'Community member and community administrator' : user.role === 'staff' ? 'Community member and staff' : 'Community member';
	byId('roleDescription').textContent = user.role === 'admin' ? 'Member access plus community and account administration.' : user.role === 'staff' ? 'Staff access with full musician community participation.' : 'Member access: discover, share, listen, and connect.';
	byId('adminNavButton').hidden = user.role !== 'admin';
	byId('adminAccountsTab').hidden = user.role !== 'admin';
	byId('community').before(byId('userDashboard'));
	byId('adminTools').hidden = user.role !== 'admin';
	byId('approvalsPanel').hidden = user.role !== 'admin';
	byId('pendingStatCard').hidden = user.role !== 'admin';
	byId('accessMetric').textContent = roleLabel(user.role);
	byId('userDashboardName').textContent = user.name;
	byId('userDashboardUsername').textContent = user.username;
	byId('userDashboardRole').textContent = roleLabel(user.role);
	byId('listeningRoomName').textContent = `${user.name}'s listening room`;
	byId('personalDashboardEyebrow').textContent = user.role === 'admin' ? 'Administrator workspace' : user.role === 'staff' ? 'Community staff workspace' : 'Musician workspace';
	byId('personalDashboardHeading').textContent = user.role === 'admin' ? 'Your admin dashboard' : user.role === 'staff' ? 'Your staff dashboard' : 'Your musician dashboard';
	byId('personalDashboardDescription').textContent = user.role === 'admin' ? 'Manage your own member profile here. Use the Account details tab for administrator account management.' : user.role === 'staff' ? 'See your member details and take part in the global musician community.' : 'See your member details and explore opportunities, collaborations, and music from around the world.';
	byId('dashboardDate').textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date());
	if (user.role === 'admin') {
		updateAdminPresenceClock();
		if (!window.adminPresenceTimer) window.adminPresenceTimer = window.setInterval(updateAdminPresenceClock, 1000);
	}
	if (user.country) byId('worldCountry').textContent = `Country: ${countryFlag(user.countryCode)} ${user.country}`.trim();
	selectDashboardTab('community');
	void loadCommunity();
	initializeWorldWidgets();
	void prepareSigningKey();
	void loadAccount();
	if (user.role === 'admin') {
		void loadUsers();
		void loadApprovals();
		void loadDeletedUsers();
		void loadBackups();
		void loadAdminActivity();
		if (!window.adminApprovalTimer) window.adminApprovalTimer = setInterval(() => { void loadApprovals(); }, 30_000);
		if (!window.adminActivityTimer) window.adminActivityTimer = setInterval(() => { void loadAdminActivity(); }, 60_000);
	}
	if (!window.chatRefreshTimer) window.chatRefreshTimer = setInterval(() => { void loadChatMessages(); }, 12_000);
}

function updateAdminPresenceClock() {
	if (currentAccount?.role !== 'admin') return;
	const clock = byId('adminCurrentTime');
	if (!clock) return;
	const now = new Date();
	clock.dateTime = now.toISOString();
	clock.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(now);
}

document.querySelectorAll('[data-enter-site]').forEach((button) => button.addEventListener('click', () => {
	if (button.disabled) return;
	const splash = byId('welcomeSplash');
	if (splash) splash.hidden = true;
	window.clearInterval(splashProgressTimer);
	requestAnimationFrame(() => byId('username')?.focus());
}));

function initializeSplashProgress() {
	const splash = byId('welcomeSplash');
	const continueButton = splash?.querySelector('[data-enter-site]');
	const progress = byId('splashProgress');
	const progressTrack = byId('splashProgressTrack');
	const announcement = byId('splashProgressAnnouncement');
	if (!splash || !continueButton || !progress || !progressTrack) return;
	const duration = 30_000;
	const startedAt = performance.now();
	const update = () => {
		const elapsed = Math.min(duration, performance.now() - startedAt);
		progress.value = elapsed / 1000;
		progressTrack.style.setProperty('--progress', `${elapsed / duration * 100}%`);
		if (elapsed < duration) {
			return;
		}
		window.clearInterval(splashProgressTimer);
		splashProgressTimer = null;
		continueButton.disabled = false;
		if (announcement) announcement.textContent = window.MWLocale?.translate('You can continue now.') || 'You can continue now.';
	};
	continueButton.disabled = true;
	update();
	splashProgressTimer = window.setInterval(update, 100);
}

initializeSplashProgress();

function selectCommunityTab(name) {
	for (const button of document.querySelectorAll('[data-community-tab]')) {
		const selected = button.dataset.communityTab === name;
		button.classList.toggle('active', selected);
		button.setAttribute('aria-selected', String(selected));
	}
	for (const panel of document.querySelectorAll('.community-tab-panel')) panel.hidden = panel.id !== `${name}Tab`;
}

function selectDashboardTab(name) {
	const panels = ['community', 'userDashboard', 'accountServices', 'adminDashboard'];
	const allowed = panels.includes(name) && (name !== 'adminDashboard' || currentAccount?.role === 'admin');
	const selectedPanel = allowed ? name : 'community';
	for (const button of document.querySelectorAll('[data-dashboard-tab]')) {
		const selected = button.dataset.dashboardTab === selectedPanel;
		button.classList.toggle('active', selected);
		button.setAttribute('aria-selected', String(selected));
	}
	for (const panelId of panels) {
		const panel = byId(panelId);
		if (panel) panel.hidden = panelId !== selectedPanel;
	}
}

function initials(name) {
	return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

function communityDate(value, options = { dateStyle: 'medium' }) {
	const raw = String(value || '');
	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
	const date = new Date(normalized);
	const language = communityData.profile?.language || 'en';
	return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(language, options).format(date);
}

function addText(parent, tag, className, text) {
	const element = document.createElement(tag);
	if (className) element.className = className;
	element.textContent = text;
	parent.append(element);
	return element;
}

function createCommunityEditor(initialText, submitLabel, onSubmit, cancelLabel = 'Cancel') {
	const form = document.createElement('form');
	form.className = 'post-inline-editor';
	const textarea = document.createElement('textarea');
	textarea.maxLength = 1200;
	textarea.required = true;
	textarea.value = initialText;
	textarea.setAttribute('aria-label', 'Message text');
	const actions = document.createElement('div');
	actions.className = 'feed-post-actions';
	const submit = document.createElement('button');
	submit.type = 'submit';
	submit.className = 'text-button';
	submit.textContent = submitLabel;
	const cancel = document.createElement('button');
	cancel.type = 'button';
	cancel.className = 'feed-action-button';
	cancel.textContent = cancelLabel;
	cancel.addEventListener('click', () => form.remove());
	const message = document.createElement('span');
	message.className = 'feed-inline-message';
	message.setAttribute('role', 'status');
	actions.append(submit, cancel, message);
	form.append(textarea, actions);
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		submit.disabled = true;
		message.textContent = '';
		try {
			await onSubmit(textarea.value.trim());
			await loadCommunity();
		} catch (error) {
			message.textContent = error.message;
			submit.disabled = false;
		}
	});
	return form;
}

function addCommunityAction(parent, label, callback, destructive = false) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = `feed-action-button${destructive ? ' destructive' : ''}`;
	button.textContent = label;
	button.addEventListener('click', callback);
	parent.append(button);
	return button;
}

function renderCommunity() {
	const feed = byId('musicFeed');
	feed.replaceChildren();
	if (!communityData.posts.length) addText(feed, 'p', 'community-empty', 'The scene is warming up. Be the first to share a musical idea or invite someone to collaborate.');
	for (const post of communityData.posts) {
		const card = document.createElement('article');
		card.className = 'feed-item';
		const person = document.createElement('div');
		person.className = 'feed-person';
		addText(person, 'span', 'avatar', initials(post.full_name));
		const identity = document.createElement('div');
		addText(identity, 'strong', '', post.full_name);
		addText(identity, 'small', '', `@${post.username} · ${communityDate(post.created_at)}`);
		person.append(identity);
		const tag = addText(person, 'span', `post-kind ${post.kind === 'collab' ? 'collab' : ''}`, post.kind === 'collab' ? 'Collaboration' : 'Musical idea');
		tag.setAttribute('aria-label', post.kind === 'collab' ? 'Looking to collaborate' : 'Musical idea');
		card.append(person);
		addText(card, 'p', 'feed-body', post.body);
		const isAuthor = Number(post.author_id) === Number(communityData.user?.id);
		const canModerate = communityData.user?.role === 'admin';
		const actions = document.createElement('div');
		actions.className = 'feed-post-actions';
		addCommunityAction(actions, 'Reply', () => {
			if (card.querySelector('.post-reply-form')) return;
			const form = createCommunityEditor('', 'Send reply', async (body) => request('community-reply', 'POST', { postId: post.id, body }));
			form.classList.add('post-reply-form');
			card.append(form);
			form.querySelector('textarea')?.focus();
		});
		if (isAuthor) addCommunityAction(actions, 'Edit', () => {
			if (card.querySelector('.post-inline-editor')) return;
			const body = card.querySelector('.feed-body');
			const form = createCommunityEditor(post.body, 'Save post', async (nextBody) => request('community-post-edit', 'POST', { id: post.id, body: nextBody }));
			body.replaceWith(form);
		});
		if (isAuthor || canModerate) addCommunityAction(actions, 'Delete', async (event) => {
			if (!window.confirm('Delete this post and its replies?')) return;
			try { await request('community-post-delete', 'POST', { id: post.id }); await loadCommunity(); }
			catch (error) { window.alert(error.message); }
		}, true);
		card.append(actions);
		const replies = (communityData.replies || []).filter((reply) => Number(reply.post_id) === Number(post.id));
		if (replies.length) {
			const replyList = document.createElement('div');
			replyList.className = 'post-replies';
			for (const reply of replies) {
				const replyCard = document.createElement('article');
				replyCard.className = 'post-reply';
				const replyHeader = document.createElement('div');
				replyHeader.className = 'post-reply-header';
				addText(replyHeader, 'strong', '', reply.full_name);
				addText(replyHeader, 'small', '', `@${reply.username} · ${communityDate(reply.created_at)}`);
				addText(replyCard, 'p', 'feed-body', reply.body);
				replyCard.prepend(replyHeader);
				const replyAuthor = Number(reply.author_id) === Number(communityData.user?.id);
				if (replyAuthor || canModerate) {
					const replyActions = document.createElement('div');
					replyActions.className = 'feed-post-actions';
					if (replyAuthor) addCommunityAction(replyActions, 'Edit', () => {
						if (replyCard.querySelector('.post-inline-editor')) return;
						const body = replyCard.querySelector('.feed-body');
						const form = createCommunityEditor(reply.body, 'Save reply', async (nextBody) => request('community-reply-edit', 'POST', { id: reply.id, body: nextBody }));
						body.replaceWith(form);
					});
					addCommunityAction(replyActions, 'Delete', async () => {
						if (!window.confirm('Delete this reply?')) return;
						try { await request('community-reply-delete', 'POST', { id: reply.id }); await loadCommunity(); }
						catch (error) { window.alert(error.message); }
					}, true);
					replyCard.append(replyActions);
				}
				replyList.append(replyCard);
			}
			card.append(replyList);
		}
		feed.append(card);
	}

	const gigList = byId('gigList');
	gigList.replaceChildren();
	byId('gigCount').textContent = `${communityData.gigs.length} ${communityData.gigs.length === 1 ? 'gig' : 'gigs'}`;
	byId('featuredGigCount').textContent = `${communityData.gigs.length} upcoming ${communityData.gigs.length === 1 ? 'opportunity' : 'opportunities'}`;
	if (!communityData.gigs.length) addText(gigList, 'p', 'community-empty', 'No upcoming gigs yet. Know a stage that needs a sound? Post the first opportunity.');
	for (const gig of communityData.gigs) {
		const card = document.createElement('article');
		card.className = 'gig-item';
		const dateBadge = document.createElement('div');
		dateBadge.className = 'gig-date';
		const date = new Date(`${gig.event_date}T12:00:00`);
		addText(dateBadge, 'span', '', Number.isNaN(date.getTime()) ? 'TBA' : new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date));
		addText(dateBadge, 'strong', '', Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date));
		const details = document.createElement('div');
		details.className = 'gig-details';
		addText(details, 'h4', '', gig.title);
		addText(details, 'p', 'gig-meta', `${gig.location} · ${communityDate(gig.event_date, { dateStyle: 'long' })}`);
		addText(details, 'p', 'gig-description', gig.description);
		addText(details, 'span', 'gig-kind', ({ gig: 'Live show', audition: 'Audition', collaboration: 'Collaboration', session: 'Session work', festival: 'Festival', lesson: 'Lesson' })[gig.opportunity_type] || 'Opportunity');
		if (gig.compensation) addText(details, 'p', 'gig-compensation', gig.compensation);
		addText(details, 'small', 'gig-poster', `Posted by ${gig.full_name}`);
		const action = gig.contact_email ? document.createElement('a') : null;
		if (action) { action.className = 'text-button gig-contact'; action.href = `mailto:${encodeURIComponent(gig.contact_email)}?subject=${encodeURIComponent(`Musicians World: ${gig.title}`)}`; action.textContent = 'Get in touch'; }
		card.append(dateBadge, details);
		if (action) card.append(action);
		gigList.append(card);
	}

	const countries = renderMusicianDirectory();
	renderTracks();
	renderMarketplaceListings();
	void loadChatMessages();

	const countryOptions = byId('countryOptions');
	if (countryOptions) countryOptions.replaceChildren(...countries.map((country) => new Option(country, country)));
	for (const [field, key] of [['profileLocation', 'location'], ['profileCountry', 'country'], ['profileInstruments', 'instruments'], ['profileGenres', 'genres'], ['profileBio', 'bio'], ['profileContactEmail', 'contact_email']]) {
		const input = byId(field);
		if (input && document.activeElement !== input) input.value = communityData.profile?.[key] || (field === 'profileCountry' ? detectedCountry : '');
	}
	const memberType = byId('profileMemberType');
	if (memberType && document.activeElement !== memberType) memberType.value = communityData.profile?.member_type || 'singer';
	const language = byId('profileLanguage');
	if (language && document.activeElement !== language) language.value = communityData.profile?.language || 'en';
	const preset = communityData.profile?.avatar_preset || 'guitar';
	const presetSelect = byId('profileAvatarPreset');
	if (presetSelect && document.activeElement !== presetSelect) presetSelect.value = preset;
	const shareLocation = byId('profileShareLocation');
	if (shareLocation && document.activeElement !== shareLocation) shareLocation.checked = Boolean(communityData.profile?.share_location);
	byId('profileLatitude').value = communityData.profile?.latitude ?? '';
	byId('profileLongitude').value = communityData.profile?.longitude ?? '';
	renderProfileAvatar();
	renderAdminProfile();
}

function renderMusicianDirectory() {
	const grid = byId('musicianGrid');
	grid.replaceChildren();
	const countryFilter = byId('musicianCountryFilter');
	const selectedCountry = countryFilter?.value || '';
	const countries = [...new Set([...communityData.musicians.map((musician) => musician.country), detectedCountry].filter(Boolean))].sort((a, b) => a.localeCompare(b));
	if (countryFilter) {
		countryFilter.replaceChildren(new Option('All countries', ''), ...countries.map((country) => new Option(country, country)));
		countryFilter.value = countries.includes(selectedCountry) ? selectedCountry : '';
	}
	const visibleMusicians = communityData.musicians.filter((musician) => !selectedCountry || String(musician.country || '').toLocaleLowerCase() === selectedCountry.toLocaleLowerCase());
	byId('musicianCount').textContent = `${visibleMusicians.length} ${visibleMusicians.length === 1 ? 'musician' : 'musicians'}${selectedCountry ? ` in ${selectedCountry}` : ''}`;
	byId('featuredMusicianCount').textContent = `${communityData.musicians.length} musicians in the community`;
	if (!visibleMusicians.length) addText(grid, 'p', 'community-empty', selectedCountry ? `No musicians have shared a profile from ${selectedCountry} yet.` : 'The community directory is ready for its first musicians.');
	for (const musician of visibleMusicians) {
		const card = document.createElement('article');
		card.className = 'musician-card';
		const top = document.createElement('div');
		top.className = 'musician-top';
		const avatar = document.createElement('span');
		avatar.className = 'avatar musician-avatar';
		if (musician.has_avatar) {
			const image = document.createElement('img');
			image.src = `/api?action=member-avatar&id=${encodeURIComponent(musician.id)}`;
			image.alt = `${musician.full_name}'s profile picture`;
			avatar.append(image);
		} else avatar.textContent = avatarIcon(musician.avatar_preset);
		top.append(avatar);
		const name = document.createElement('div');
		addText(name, 'h4', '', musician.full_name);
		addText(name, 'p', 'musician-handle', `@${musician.username}`);
		top.append(name);
		card.append(top);
		addText(card, 'p', 'musician-focus', musician.instruments || memberTypeLabel(musician.member_type));
		const place = [musician.location, musician.country].filter(Boolean).join(', ');
		if (place) addText(card, 'p', 'musician-location', `⌖ ${place}`);
		if (musician.share_location && Number.isFinite(Number(musician.latitude)) && Number.isFinite(Number(musician.longitude))) {
			const coordinates = `${Number(musician.latitude).toFixed(5)}, ${Number(musician.longitude).toFixed(5)}`;
			const map = document.createElement('a');
			map.className = 'musician-location';
			map.href = `https://maps.google.com/?q=${encodeURIComponent(`${musician.latitude},${musician.longitude}`)}`;
			map.target = '_blank';
			map.rel = 'noopener noreferrer';
			map.textContent = `⌖ Shared exact location · ${coordinates}`;
			card.append(map);
		}
		if (musician.genres) addText(card, 'p', 'genre-tags', musician.genres);
		if (musician.bio) addText(card, 'p', 'musician-bio', musician.bio);
		if (musician.contact_email && musician.id !== communityData.user.id) {
			const contact = document.createElement('a');
			contact.className = 'text-button';
			contact.href = `mailto:${encodeURIComponent(musician.contact_email)}?subject=${encodeURIComponent('Hello from Musicians World')}`;
			contact.textContent = 'Contact musician';
			card.append(contact);
		} else if (musician.id === communityData.user.id) addText(card, 'span', 'you-label', 'Your profile');
		else addText(card, 'span', 'private-contact', 'Contact details not shared');
		grid.append(card);
	}
	return countries;
}

async function loadCommunity() {
	try {
		communityData = await request('community', 'GET');
		if (communityData.profile?.language) {
			if (languageChosenBeforeSignIn && currentAccount) {
				const language = localStorage.getItem('mw-language') || communityData.profile.language;
				languageChosenBeforeSignIn = false;
				setPreferredLanguage(language);
				try {
					const result = await request('update-language', 'POST', { language });
					communityData.profile.language = result.language;
				} catch (error) {
					showMessage('accountMessage', error.message);
				}
			} else setPreferredLanguage(communityData.profile.language);
		}
		renderCommunity();
	} catch (error) {
		for (const id of ['musicFeed', 'gigList', 'musicianGrid']) {
			const container = byId(id);
			container.replaceChildren();
			addText(container, 'p', 'community-empty', error.message);
		}
		byId('featuredGigCount').textContent = 'Unavailable';
		byId('featuredMusicianCount').textContent = 'Unavailable';
	}
}

function renderTracks() {
	const feed = byId('trackFeed');
	feed.replaceChildren();
	if (!communityData.tracks?.length) {
		addText(feed, 'p', 'community-empty', 'No tracks shared yet. Add the first sound to the listening room.');
		return;
	}
	const commentsByTrack = new Map();
	for (const comment of communityData.comments || []) {
		if (!commentsByTrack.has(Number(comment.track_id))) commentsByTrack.set(Number(comment.track_id), []);
		commentsByTrack.get(Number(comment.track_id)).push(comment);
	}
	for (const track of communityData.tracks) {
		const card = document.createElement('article');
		card.className = 'track-card';
		const heading = document.createElement('div');
		heading.className = 'track-heading';
		const avatar = addText(heading, 'span', 'avatar', initials(track.full_name));
		avatar.setAttribute('aria-hidden', 'true');
		const titleGroup = document.createElement('div');
		addText(titleGroup, 'h4', '', track.title);
		addText(titleGroup, 'small', '', `${track.full_name} · ${communityDate(track.created_at)}`);
		heading.append(titleGroup);
		card.append(heading);
		if (track.genre) addText(card, 'span', 'track-genre', track.genre);
		if (track.note) addText(card, 'p', 'track-note', track.note);
		const source = track.has_upload ? null : new URL(track.audio_url);
		const isVideo = track.media_type === 'video';
		const audioFile = !isVideo && (Boolean(track.has_upload) || /\.(mp3|m4a|ogg|oga|wav|webm|aac|flac)$/i.test(source.pathname));
		let player;
		if (isVideo) {
			player = document.createElement('iframe');
			player.className = 'stream-embed video-embed';
			player.loading = 'lazy';
			player.title = `${currentAccount?.name || 'Your'}'s listening room: ${track.title} by ${track.full_name}`;
			player.referrerPolicy = 'strict-origin-when-cross-origin';
			player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			player.allowFullscreen = true;
			if (source.hostname === 'youtu.be') {
				player.src = `https://www.youtube-nocookie.com/embed/${source.pathname.slice(1).split('/')[0]}`;
			} else if (['youtube.com', 'www.youtube.com', 'music.youtube.com'].includes(source.hostname)) {
				const videoId = source.searchParams.get('v') || source.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/)[1];
				player.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
			} else {
				const videoId = source.pathname.split('/').filter(Boolean).at(-1);
				player.src = `https://player.vimeo.com/video/${videoId}`;
			}
		} else if (audioFile) {
			player = document.createElement('audio');
			player.controls = true;
			player.preload = 'none';
			player.src = track.has_upload ? `/api?action=community-audio&id=${encodeURIComponent(track.id)}` : source.href;
			player.setAttribute('aria-label', `${currentAccount?.name || 'Your'}'s listening room: ${track.title} by ${track.full_name}`);
		} else {
			player = document.createElement('iframe');
			player.className = 'stream-embed';
			player.loading = 'lazy';
			player.title = `Listen to ${track.title} by ${track.full_name}`;
			player.referrerPolicy = 'strict-origin-when-cross-origin';
			player.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
			player.allowFullscreen = true;
			if (source.hostname === 'open.spotify.com') {
				const [, kind, id] = source.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(track|episode|album|playlist)\/([A-Za-z0-9]+)/i);
				player.src = `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator`;
			} else if (source.hostname.endsWith('youtube.com') || source.hostname === 'youtu.be') {
				player.classList.add('youtube-embed');
				const videoId = source.hostname === 'youtu.be' ? source.pathname.slice(1).split('/')[0] : (source.searchParams.get('v') || source.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/)[1]);
				player.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
			} else {
				player.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(source.href)}&color=%23176b52&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
			}
		}
		const fallback = document.createElement('a');
		fallback.className = 'track-fallback';
		fallback.href = track.has_upload ? `/api?action=community-audio&id=${encodeURIComponent(track.id)}` : track.audio_url;
		fallback.target = '_blank';
		fallback.rel = 'noopener noreferrer';
		fallback.textContent = isVideo ? 'Open video source' : 'Open audio source';
		fallback.hidden = true;
		player.addEventListener('error', () => { fallback.hidden = false; });
		card.append(player);
		addText(card, 'small', 'track-personal-label', `${currentAccount?.name || 'Your'}'s listening room`);
		card.append(fallback);
		const actions = document.createElement('div');
		actions.className = 'track-actions';
		const like = document.createElement('button');
		like.className = `like-button${track.liked ? ' liked' : ''}`;
		like.type = 'button';
		like.setAttribute('aria-pressed', String(Boolean(track.liked)));
		like.textContent = `${track.liked ? '♥' : '♡'} Listen love · ${Number(track.like_count || 0)}`;
		like.addEventListener('click', async () => {
			like.disabled = true;
			try { await request('community-like', 'POST', { trackId: track.id }); await loadCommunity(); }
			catch (error) { like.title = error.message; }
			finally { like.disabled = false; }
		});
		actions.append(like);
		addText(actions, 'span', 'comment-count', `${(commentsByTrack.get(Number(track.id)) || []).length} recent comments`);
		card.append(actions);
		const comments = document.createElement('div');
		comments.className = 'track-comments';
		for (const comment of (commentsByTrack.get(Number(track.id)) || []).slice(0, 3).reverse()) {
			const item = document.createElement('p');
			addText(item, 'strong', '', comment.full_name);
			item.append(document.createTextNode(` ${comment.body}`));
			comments.append(item);
		}
		const form = document.createElement('form');
		form.className = 'track-comment-form';
		const input = document.createElement('input');
		input.name = 'body'; input.maxLength = 500; input.placeholder = 'Leave a kind note or musical thought…'; input.setAttribute('aria-label', `Comment on ${track.title}`); input.required = true;
		const submit = document.createElement('button');
		submit.type = 'submit'; submit.textContent = 'Comment';
		form.append(input, submit);
		form.addEventListener('submit', async (event) => {
			event.preventDefault(); submit.disabled = true;
			try { await request('community-comment', 'POST', { trackId: track.id, body: input.value.trim() }); await loadCommunity(); }
			catch (error) { input.setCustomValidity(error.message); input.reportValidity(); input.addEventListener('input', () => input.setCustomValidity(''), { once: true }); }
			finally { submit.disabled = false; }
		});
		comments.append(form);
		card.append(comments);
		feed.append(card);
	}
}

function renderProfileAvatar() {
	const preview = byId('profileAvatarPreview');
	if (!preview) return;
	preview.replaceChildren();
	if (communityData.profile?.has_avatar) {
		const image = document.createElement('img');
		image.src = `/api?action=member-avatar&id=${encodeURIComponent(communityData.user.id)}`;
		image.alt = 'Your profile picture';
		preview.append(image);
	} else preview.textContent = avatarIcon(byId('profileAvatarPreset')?.value || communityData.profile?.avatar_preset);
}

function renderAdminProfile() {
	if (communityData.user?.role !== 'admin') return;
	const profile = communityData.profile || {};
	const bio = byId('adminProfileBio');
	if (bio && document.activeElement !== bio) bio.value = profile.bio || '';
	const preview = byId('adminProfilePreview');
	if (preview) {
		preview.replaceChildren();
		if (profile.has_avatar && communityData.user.id) {
			const image = document.createElement('img');
			image.src = `/api?action=member-avatar&id=${encodeURIComponent(communityData.user.id)}`;
			image.alt = 'Admin profile picture';
			preview.append(image);
		} else preview.textContent = 'MW';
	}
	const removeLabel = byId('adminProfileRemoveLabel');
	if (removeLabel) removeLabel.hidden = !profile.has_avatar;
}

const communityChatRooms = {
	singers: { title: 'Singers and vocalists', icon: '🎤' },
	instrumentalists: { title: 'Instrumentalists', icon: '🎸' },
	marketplace: { title: 'Instrument and gear', icon: '🎹' },
	support: { title: 'Customer service', icon: '♪' },
};

function selectChatRoom(room) {
	const selectedRoom = communityChatRooms[room];
	if (!selectedRoom) return;
	const select = byId('chatRoomSelect');
	if (select) select.value = room;
	for (const button of document.querySelectorAll('[data-chat-room]')) {
		const selected = button.dataset.chatRoom === room;
		button.classList.toggle('active', selected);
		button.setAttribute('aria-pressed', String(selected));
	}
	const title = byId('chatRoomTitle');
	if (title) title.textContent = selectedRoom.title;
	const avatar = byId('chatRoomAvatar');
	if (avatar) avatar.textContent = selectedRoom.icon;
}

document.querySelectorAll('[data-chat-room]').forEach((button) => {
	button.addEventListener('click', () => {
		selectChatRoom(button.dataset.chatRoom);
		void loadChatMessages();
	});
});

async function loadChatMessages() {
	const room = byId('chatRoomSelect')?.value;
	const list = byId('chatMessages');
	if (!room || !list || appView?.hidden) return;
	selectChatRoom(room);
	const wasAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;
	try {
		const { messages } = await request('community-messages', 'GET', { room });
		if (byId('chatRoomSelect')?.value !== room) return;
		list.replaceChildren();
		if (!messages.length) {
			addText(list, 'p', 'community-empty', 'This room is ready for its first message.');
			return;
		}
		for (const message of messages) {
			const item = document.createElement('article');
			item.className = `chat-message${Number(message.author_id) === Number(communityData.user?.id) ? ' own-message' : ''}`;
			const initials = String(message.full_name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
			addText(item, 'span', 'chat-message-avatar', initials || '?');
			const bubble = document.createElement('div');
			bubble.className = 'chat-message-bubble';
			const meta = document.createElement('header');
			meta.className = 'chat-message-meta';
			const identity = addText(meta, 'strong', '', message.full_name);
			identity.title = `@${message.username}`;
			const timestamp = addText(meta, 'time', '', communityDate(message.created_at, { timeStyle: 'short' }));
			const createdAt = String(message.created_at || '');
			timestamp.dateTime = /^\d{4}-\d{2}-\d{2}$/.test(createdAt) ? `${createdAt}T12:00:00` : createdAt.includes('T') ? createdAt : `${createdAt.replace(' ', 'T')}Z`;
			timestamp.title = communityDate(message.created_at, { dateStyle: 'medium', timeStyle: 'short' });
			addText(bubble, 'p', 'chat-message-body', message.body);
			bubble.prepend(meta);
			item.append(bubble);
			list.append(item);
		}
		if (wasAtBottom) list.scrollTop = list.scrollHeight;
	} catch (error) {
		if (byId('chatRoomSelect')?.value !== room) return;
		list.replaceChildren();
		addText(list, 'p', 'community-empty', error.message);
	}
}

function renderMarketplaceListings() {
	const list = byId('marketplaceListings');
	if (!list) return;
	list.replaceChildren();
	const listings = communityData.listings || [];
	if (!listings.length) {
		addText(list, 'p', 'community-empty', 'No gear has been listed yet. Add the first item for sale.');
		return;
	}
	for (const listing of listings) {
		const card = document.createElement('article');
		card.className = 'marketplace-item';
		addText(card, 'span', 'marketplace-category', ({ instrument: 'Instrument', equipment: 'Audio equipment', accessory: 'Accessory', other: 'Other' })[listing.category] || 'Music gear');
		addText(card, 'h4', '', listing.title);
		if (listing.price) addText(card, 'strong', 'marketplace-price', listing.price);
		addText(card, 'p', 'gig-meta', listing.location);
		addText(card, 'p', '', listing.description);
		addText(card, 'small', 'gig-poster', `Listed by ${listing.full_name}`);
		if (listing.contact_email) {
			const contact = document.createElement('a');
			contact.className = 'text-button';
			contact.href = `mailto:${encodeURIComponent(listing.contact_email)}?subject=${encodeURIComponent(`Musicians World: ${listing.title}`)}`;
			contact.textContent = 'Contact seller';
			card.append(contact);
		}
		if (Number(listing.seller_id) === Number(communityData.user?.id) || communityData.user?.role === 'admin') {
			addCommunityAction(card, 'Remove listing', async () => {
				if (!window.confirm(`Remove "${listing.title}" from the marketplace?`)) return;
				try { await request('marketplace-delete', 'POST', { id: listing.id }); await loadCommunity(); }
				catch (error) { window.alert(error.message); }
			}, true);
		}
		list.append(card);
	}
}

function weatherDescription(code) {
	if (code === 0) return ['Clear sky', '☀'];
	if (code === 1) return ['Mainly clear', '🌤'];
	if (code === 2) return ['Partly cloudy', '⛅'];
	if (code === 3) return ['Overcast', '☁'];
	if ([45, 48].includes(code)) return ['Foggy', '🌫'];
	if ([51, 53, 55, 56, 57].includes(code)) return ['Drizzle', '🌦'];
	if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['Rain showers', '🌧'];
	if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Snow', '❄'];
	if ([95, 96, 99].includes(code)) return ['Thunderstorms', '⛈'];
	return ['Current conditions', '🌤'];
}

function displayWeather(data, place, unit) {
	const current = data.current;
	if (!current || !Number.isFinite(Number(current.temperature_2m))) throw new Error('Weather details are not available for this location right now.');
	if (typeof data.timezone === 'string' && data.timezone) worldTimeZoneId = data.timezone;
	const [label, icon] = weatherDescription(Number(current.weather_code));
	byId('weatherTemperature').textContent = `${Math.round(Number(current.temperature_2m))}°${unit === 'fahrenheit' ? 'F' : 'C'}`;
	byId('weatherDescription').textContent = label;
	byId('weatherPlace').textContent = place || 'Your local area';
	byId('weatherSymbol').textContent = icon;
	showMessage('weatherMessage', '');
}

async function fetchWeather(latitude, longitude, place) {
	const region = new Intl.Locale(navigator.language || 'en').region;
	const unit = ['US', 'BS', 'BZ', 'KY', 'LR', 'PW'].includes(region) ? 'fahrenheit' : 'celsius';
	const url = new URL('https://api.open-meteo.com/v1/forecast');
	url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'temperature_2m,weather_code', temperature_unit: unit, timezone: 'auto' });
	const response = await fetch(url);
	if (!response.ok) throw new Error('Could not load local weather. Try again in a moment.');
	const data = await response.json();
	displayWeather(data, place, unit);
	localStorage.setItem('mw-weather-location', JSON.stringify({ latitude, longitude, place }));
}

async function requestCountryWeather(country) {
	if (!country) return false;
	showMessage('weatherMessage', `Finding local weather for ${country}…`);
	try {
		const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
		url.search = new URLSearchParams({ name: country, count: '1', language: navigator.language?.slice(0, 2) || 'en', format: 'json' });
		const response = await fetch(url);
		if (!response.ok) throw new Error('Could not look up the selected country.');
		const result = await response.json();
		const match = result.results?.[0];
		if (!match) throw new Error('Weather for the selected country could not be found.');
		await fetchWeather(match.latitude, match.longitude, [match.name, match.country].filter(Boolean).join(', '));
		detectedCountry = String(match.country || country);
		byId('worldCountry').textContent = `Country: ${countryFlag(currentAccount?.countryCode)} ${detectedCountry}`.trim();
		return true;
	} catch (error) {
		showMessage('weatherMessage', error.message);
		return false;
	}
}

async function detectCountry(latitude, longitude) {
	const output = byId('worldCountry');
	if (!output) return '';
	output.textContent = 'Country: detecting…';
	try {
		const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
		url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), localityLanguage: navigator.language?.slice(0, 2) || 'en' });
		const response = await fetch(url);
		if (!response.ok) throw new Error('Country lookup unavailable');
		const location = await response.json();
		const country = String(location.countryName || '').trim();
		if (!country) throw new Error('Country not found');
		detectedCountry = country;

		const profileCountry = byId('profileCountry');
		const countryOptions = byId('countryOptions');
		if (countryOptions && ![...countryOptions.options].some((option) => option.value === country)) countryOptions.add(new Option(country, country));
		const countryFilter = byId('musicianCountryFilter');
		if (countryFilter && ![...countryFilter.options].some((option) => option.value === country)) countryFilter.add(new Option(country, country));
		if (profileCountry && !profileCountry.value) profileCountry.value = country;
		output.textContent = `Country: ${country}`;
		return country;
	} catch {
		output.textContent = 'Country: unavailable';
		return '';
	}
}

function initializeWorldWidgets() {
	const updateClock = () => {
		const zone = worldTimeZoneId || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time';
		const locale = communityData.profile?.language || navigator.language;
		byId('worldDate').textContent = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: zone }).format(new Date());
		byId('worldClock').textContent = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: zone }).format(new Date());
		byId('worldTimeZone').textContent = zone.replaceAll('_', ' ');
	};
	updateClock();
	if (!window.worldClockTimer) window.worldClockTimer = setInterval(updateClock, 30_000);
	const cached = localStorage.getItem('mw-weather-location');
	if (cached) {
		try { const location = JSON.parse(cached); void fetchWeather(location.latitude, location.longitude, location.place).catch((error) => showMessage('weatherMessage', error.message)); }
		catch { localStorage.removeItem('mw-weather-location'); }
	} else {
		byId('weatherDescription').textContent = 'Set your location for local weather';
		byId('weatherMessage').textContent = 'Allow location access for local weather, or use your signup country as an approximate location. Coordinates go to Open-Meteo and BigDataCloud.';
		requestCurrentWeatherLocation();
	}
}

function requestCurrentWeatherLocation() {
	if (!navigator.geolocation) {
		byId('worldCountry').textContent = `Country: ${countryFlag(currentAccount?.countryCode)} ${currentAccount?.country || 'location detection unavailable'}`.trim();
		if (!currentAccount?.country) showMessage('weatherMessage', 'This browser does not provide location access. Search for a city instead.');
		else void requestCountryWeather(currentAccount.country);
		return;
	}
	showMessage('weatherMessage', 'Waiting for your location permission…');
	navigator.geolocation.getCurrentPosition(async ({ coords }) => {
		void detectCountry(coords.latitude, coords.longitude);
		try { await fetchWeather(coords.latitude, coords.longitude, 'Your current location'); }
		catch (error) { showMessage('weatherMessage', error.message); }
	}, (error) => {
		const message = error.code === error.PERMISSION_DENIED ? 'Location access was declined. Search for your city to get local weather.' : 'Could not read your location. Search for your city instead.';
		byId('worldCountry').textContent = `Country: ${countryFlag(currentAccount?.countryCode)} ${currentAccount?.country || 'location permission needed'}`.trim();
		if (currentAccount?.country) void requestCountryWeather(currentAccount.country);
		else showMessage('weatherMessage', message);
	}, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 30 * 60 * 1000 });
}

byId('weatherLocationButton')?.addEventListener('click', requestCurrentWeatherLocation);

byId('weatherSearchForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const place = byId('weatherPlaceSearch').value.trim();
	showMessage('weatherMessage', 'Finding local weather…');
	try {
		const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
		url.search = new URLSearchParams({ name: place, count: '1', language: navigator.language?.slice(0, 2) || 'en', format: 'json' });
		const response = await fetch(url);
		if (!response.ok) throw new Error('Could not search for that place.');
		const result = await response.json();
		const match = result.results?.[0];
		if (!match) throw new Error('No matching city found. Try adding its country name.');
		await fetchWeather(match.latitude, match.longitude, [match.name, match.country].filter(Boolean).join(', '));
		byId('worldCountry').textContent = `Country: ${match.country || 'unavailable'}`;
		if (match.country) {
			detectedCountry = match.country;
			const profileCountry = byId('profileCountry');
			if (profileCountry && !profileCountry.value) profileCountry.value = match.country;
			const options = byId('countryOptions');
			if (options && ![...options.options].some((option) => option.value === match.country)) options.add(new Option(match.country, match.country));
			const filter = byId('musicianCountryFilter');
			if (filter && ![...filter.options].some((option) => option.value === match.country)) filter.add(new Option(match.country, match.country));
		}
		byId('weatherSearchForm').reset();
	} catch (error) { showMessage('weatherMessage', error.message); }
});

if (appView) {
	if (localStorage.getItem('mw-theme-version') !== '2') {
		localStorage.setItem('mw-theme', 'dark');
		localStorage.setItem('mw-theme-version', '2');
	}
	const savedTheme = localStorage.getItem('mw-theme') || 'dark';
	appView.classList.toggle('theme-dark', savedTheme === 'dark');
	byId('themeToggle').setAttribute('aria-pressed', String(savedTheme === 'dark'));
	byId('themeToggle').querySelector('span').textContent = savedTheme === 'dark' ? 'Light mode' : 'Dark mode';
	byId('themeToggle')?.addEventListener('click', () => {
		const enabled = appView.classList.toggle('theme-dark');
		localStorage.setItem('mw-theme', enabled ? 'dark' : 'light');
		byId('themeToggle').setAttribute('aria-pressed', String(enabled));
		byId('themeToggle').querySelector('span').textContent = enabled ? 'Light mode' : 'Dark mode';
	});
}

document.querySelectorAll('[data-scroll-target]').forEach((button) => button.addEventListener('click', () => {
	selectDashboardTab(button.dataset.scrollTarget === 'accountServices' ? 'accountServices' : button.dataset.scrollTarget);
	byId(button.dataset.scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

document.querySelectorAll('[data-dashboard-tab]').forEach((button) => {
	button.addEventListener('click', () => selectDashboardTab(button.dataset.dashboardTab));
});

byId('trackShareForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	button.disabled = true;
	showMessage('trackShareMessage', '');
	try {
		const values = formValues(form);
		const selectedFile = values.audioFile;
		delete values.audioFile;
		if (selectedFile instanceof File && selectedFile.size) {
			if (selectedFile.size > 3 * 1024 * 1024) throw new Error('Choose an audio file that is 3 MB or smaller.');
			const dataUrl = await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result || ''));
				reader.onerror = () => reject(new Error('The audio file could not be read.'));
				reader.readAsDataURL(selectedFile);
			});
			values.audioBase64 = String(dataUrl).split(',')[1] || '';
			const extensionMime = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm' }[selectedFile.name.split('.').pop().toLowerCase()];
			const normalizedMime = { 'audio/mp3': 'audio/mpeg', 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/x-m4a': 'audio/mp4' }[selectedFile.type] || selectedFile.type;
			values.audioMime = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'].includes(normalizedMime) ? normalizedMime : extensionMime || '';
		}
		const result = await request('community-track', 'POST', values);
		form.reset();
		showMessage('trackShareMessage', result.message, true);
		await loadCommunity();
	} catch (error) { showMessage('trackShareMessage', error.message); }
	finally { button.disabled = false; }
});

document.querySelectorAll('[data-community-tab]').forEach((button) => {
	button.addEventListener('click', () => selectCommunityTab(button.dataset.communityTab));
});
byId('musicianCountryFilter')?.addEventListener('change', () => renderMusicianDirectory());
document.querySelectorAll('[data-open-community-tab]').forEach((button) => {
	button.addEventListener('click', () => {
		const tab = button.dataset.openCommunityTab;
		selectDashboardTab('community');
		selectCommunityTab(tab);
		byId(tab === 'chat' ? 'chatTab' : 'community').scrollIntoView({ behavior: 'smooth', block: 'start' });
	});
});

byId('communityPostForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	button.disabled = true;
	showMessage('communityPostMessage', '');
	try {
		const result = await request('community-post', 'POST', formValues(form));
		form.reset();
		showMessage('communityPostMessage', result.message, true);
		await loadCommunity();
	} catch (error) { showMessage('communityPostMessage', error.message); }
	finally { button.disabled = false; }
});

byId('communityGigForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	button.disabled = true;
	showMessage('communityGigMessage', '');
	try {
		const result = await request('community-gig', 'POST', formValues(form));
		form.reset();
		showMessage('communityGigMessage', result.message, true);
		await loadCommunity();
	} catch (error) { showMessage('communityGigMessage', error.message); }
	finally { button.disabled = false; }
});

byId('chatRoomSelect')?.addEventListener('change', () => {
	selectChatRoom(byId('chatRoomSelect').value);
	void loadChatMessages();
});
byId('chatMessageBody')?.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
		event.preventDefault();
		byId('chatMessageForm')?.requestSubmit();
	}
});
byId('chatMessageForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const button = event.currentTarget.querySelector('[type="submit"]');
	button.disabled = true;
	showMessage('chatMessageStatus', '');
	try {
		const result = await request('community-message', 'POST', { room: byId('chatRoomSelect').value, body: byId('chatMessageBody').value.trim() });
		byId('chatMessageForm').reset();
		showMessage('chatMessageStatus', result.message, true);
		await loadChatMessages();
	} catch (error) { showMessage('chatMessageStatus', error.message); }
	finally { button.disabled = false; }
});

byId('marketplaceForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	button.disabled = true;
	showMessage('marketplaceMessage', '');
	try {
		const result = await request('marketplace-listing', 'POST', formValues(form));
		form.reset();
		showMessage('marketplaceMessage', result.message, true);
		await loadCommunity();
	} catch (error) { showMessage('marketplaceMessage', error.message); }
	finally { button.disabled = false; }
});

byId('trackMediaType')?.addEventListener('change', (event) => {
	const video = event.currentTarget.value === 'video';
	byId('trackAudioFileField').hidden = video;
	if (video) byId('trackAudioFile').value = '';
});

byId('musicianProfileForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	button.disabled = true;
	showMessage('profileMessage', '');
	try {
		const values = formValues(form);
		const imageFile = values.avatarFile;
		delete values.avatarFile;
		values.removeAvatar = byId('removeProfileAvatar').checked;
		await attachProfilePhoto(values, imageFile);
		const result = await request('update-musician-profile', 'POST', values);
		setPreferredLanguage(values.language);
		showMessage('profileMessage', result.message, true);
		await loadCommunity();
	} catch (error) { showMessage('profileMessage', error.message); }
	finally { button.disabled = false; }
});

byId('adminProfileForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (communityData.user?.role !== 'admin') return;
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	button.disabled = true;
	showMessage('adminProfileMessage', '');
	try {
		const profile = communityData.profile || {};
		const imageFile = byId('adminProfileFile').files?.[0];
		const values = {
			location: profile.location || '',
			country: profile.country || '',
			memberType: profile.member_type || 'singer',
			avatarPreset: profile.avatar_preset || 'guitar',
			instruments: profile.instruments || '',
			genres: profile.genres || '',
			bio: byId('adminProfileBio').value.trim(),
			contactEmail: profile.contact_email || '',
			language: profile.language || 'en',
			shareLocation: Boolean(profile.share_location),
			latitude: profile.latitude ?? '',
			longitude: profile.longitude ?? '',
			removeAvatar: byId('adminRemoveProfileAvatar').checked && !(imageFile instanceof File && imageFile.size),
		};
		await attachProfilePhoto(values, imageFile);
		const result = await request('update-musician-profile', 'POST', values);
		byId('adminProfileFile').value = '';
		byId('adminRemoveProfileAvatar').checked = false;
		showMessage('adminProfileMessage', result.message, true);
		await loadCommunity();
	} catch (error) {
		showMessage('adminProfileMessage', error.message);
	} finally {
		button.disabled = false;
	}
});

byId('adminProfileFile')?.addEventListener('change', (event) => {
	const file = event.currentTarget.files?.[0];
	if (!file) return renderAdminProfile();
	const preview = byId('adminProfilePreview');
	preview.replaceChildren();
	const image = document.createElement('img');
	image.src = URL.createObjectURL(file);
	image.alt = 'Selected admin profile picture preview';
	image.onload = () => URL.revokeObjectURL(image.src);
	preview.append(image);
});

byId('profileAvatarPreset')?.addEventListener('change', renderProfileAvatar);
byId('profileAvatarFile')?.addEventListener('change', (event) => {
	const file = event.currentTarget.files?.[0];
	if (!file) return renderProfileAvatar();
	const preview = byId('profileAvatarPreview');
	preview.replaceChildren();
	const image = document.createElement('img');
	image.src = URL.createObjectURL(file);
	image.alt = 'Selected profile picture preview';
	image.onload = () => URL.revokeObjectURL(image.src);
	preview.append(image);
});
byId('profileLocationButton')?.addEventListener('click', () => {
	if (!navigator.geolocation) { showMessage('profileMessage', 'Location access is not available in this browser.'); return; }
	showMessage('profileMessage', 'Waiting for your location permission…');
	navigator.geolocation.getCurrentPosition(({ coords }) => {
		byId('profileLatitude').value = String(coords.latitude);
		byId('profileLongitude').value = String(coords.longitude);
		showMessage('profileMessage', 'Location ready. It stays private unless you check the explicit sharing consent.', true);
	}, (error) => {
		const message = error.code === error.PERMISSION_DENIED ? 'Location permission was denied. You can still enter your city manually.' : 'Could not read your location. You can still enter your city manually.';
		showMessage('profileMessage', message);
	}, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60 * 1000 });
});

const gigDate = byId('gigDate');
if (gigDate) gigDate.min = new Date().toISOString().slice(0, 10);

function openKeyStore() {
	return new Promise((resolve, reject) => {
		const opening = indexedDB.open('northstar-signatures', 1);
		opening.onupgradeneeded = () => opening.result.createObjectStore('keys');
		opening.onsuccess = () => resolve(opening.result);
		opening.onerror = () => reject(opening.error || new Error('Could not open browser key storage.'));
	});
}

async function storedKey(mode, action, value) {
	const database = await openKeyStore();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('keys', mode);
		const store = transaction.objectStore('keys');
		const id = `account-signing-key:${currentAccount.username.toLowerCase()}`;
		const request = action === 'get' ? store.get(id) : store.put(value, id);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error || new Error('Could not access browser key storage.'));
		transaction.oncomplete = () => database.close();
		transaction.onerror = () => { database.close(); reject(transaction.error); };
	});
}

function toBase64(buffer) {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(value) {
	return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function signaturePayload(record) {
	return JSON.stringify({ format: record.format, algorithm: record.algorithm, signer: record.signer, signedAt: record.signedAt, message: record.message });
}

async function prepareSigningKey() {
	const status = byId('signatureKeyStatus');
	signingKey = null;
	byId('signMessageButton').disabled = true;
	try {
		if (!crypto.subtle || !indexedDB) throw new Error('Secure browser signing requires a modern browser over HTTPS or localhost.');
		signingKey = await storedKey('readonly', 'get');
		const { keys } = await request('signature-keys', 'GET');
		const registered = keys[currentAccount.username] || Object.entries(keys).find(([name]) => name.toLowerCase() === currentAccount.username.toLowerCase())?.[1];
		if (registered && !signingKey) throw new Error('This account has a signing key in another browser. Browser storage cannot recover its private key.');
		if (!signingKey) {
			const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
			const exported = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
			const privateKey = await crypto.subtle.importKey('pkcs8', exported, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
			signingKey = { privateKey, publicKey: toBase64(await crypto.subtle.exportKey('spki', pair.publicKey)) };
			new Uint8Array(exported).fill(0);
			await storedKey('readwrite', 'put', signingKey);
		}
		if (registered && registered !== signingKey.publicKey) throw new Error('The local signing key does not match the key registered to this account.');
		if (!registered) await request('register-signature-key', 'POST', { publicKey: signingKey.publicKey });
		status.textContent = 'Signing key ready in this browser';
		byId('signingMetric').textContent = 'Ready';
		byId('userSigningMetric').textContent = 'Ready';
		byId('signMessageButton').disabled = false;
	} catch (error) {
		status.textContent = error.message;
		byId('signingMetric').textContent = 'Unavailable';
		byId('userSigningMetric').textContent = 'Unavailable';
	}
}

async function loadAccount() {
	try {
		const result = await request('account', 'GET');
		currentAccount = result.user;
		byId('accountEmail').value = result.email || '';
	} catch (error) {
		showMessage('accountMessage', error.message);
	}
}

async function loadUsers() {
	try {
		const result = await request('users', 'GET');
		currentAccount = result.user;
		byId('memberCount').textContent = result.users.length.toLocaleString();
		renderUsers(result.users);
	} catch (error) {
		showMessage('directoryMessage', error.message);
	}
}

async function loadAdminActivity() {
	try {
		const { activity } = await request('admin-activity', 'GET');
		const rows = byId('activityRows');
		rows.replaceChildren();
		if (!activity.length) {
			const row = document.createElement('tr');
			const cell = document.createElement('td');
			cell.colSpan = 4;
			cell.className = 'empty';
			cell.textContent = 'No sign-in or sign-out activity recorded yet.';
			row.append(cell);
			rows.append(row);
			return;
		}
		for (const event of activity) {
			const row = document.createElement('tr');
			for (const value of [event.full_name || 'Deleted account', event.username, event.event === 'sign_in' ? 'Signed in' : 'Signed out', formatAccountDate(event.occurred_at)]) {
				const cell = document.createElement('td');
				cell.textContent = value || '—';
				row.append(cell);
			}
			rows.append(row);
		}
		showMessage('activityMessage', '');
	} catch (error) { showMessage('activityMessage', error.message); }
}

byId('refreshActivityButton')?.addEventListener('click', () => { void loadAdminActivity(); });

byId('exportUsersButton')?.addEventListener('click', async (event) => {
	const button = event.currentTarget;
	button.disabled = true;
	try {
		const { users } = await request('users', 'GET');
		const cell = (value) => {
			const safe = String(value ?? '').replace(/^[=+\-@\t\r]/, "'$&");
			return `"${safe.replaceAll('"', '""')}"`;
		};
		const rows = [['Name', 'Username', 'Email', 'Country joined from', 'Country code', 'Role', 'Member type', 'Joined', 'Last sign-in', 'Last sign-out'], ...users.map((user) => [user.name, user.username, user.email, user.country || 'Not provided', user.countryCode, roleLabel(user.role), memberTypeLabel(user.member_type), user.created_at, user.last_sign_in, user.last_sign_out])];
		const blob = new Blob([`\uFEFF${rows.map((row) => row.map(cell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'musicians-world-account-directory.csv';
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	} catch (error) { showMessage('directoryMessage', error.message); }
	finally { button.disabled = false; }
});

async function loadApprovals() {
	try {
		const result = await request('approvals', 'GET');
		byId('pendingCount').textContent = result.requests.length.toLocaleString();
		byId('requestCount').textContent = `${result.requests.length} pending`;
		renderApprovals(result.requests);
	} catch (error) { showMessage('approvalMessage', error.message); }
}

function renderApprovals(requests) {
	const list = byId('approvalRows');
	list.replaceChildren();
	if (!requests.length) {
		const empty = document.createElement('div');
		empty.className = 'approval-empty';
		empty.textContent = 'You’re all caught up. No accounts are waiting for review.';
		list.append(empty);
		return;
	}
	for (const accessRequest of requests) {
		const item = document.createElement('article');
		item.className = 'approval-item';
		const details = document.createElement('div');
		details.className = 'approval-person';
		const name = document.createElement('strong');
		name.textContent = accessRequest.full_name;
		const meta = document.createElement('span');
		meta.textContent = `${accessRequest.username} · ${accessRequest.email}`;
		const country = document.createElement('small');
		country.className = 'approval-country';
		country.textContent = `Joining from ${accessRequest.country || 'country not provided'}`;
		if (countryFlag(accessRequest.country_code)) country.textContent += ` ${countryFlag(accessRequest.country_code)}`;
		const date = document.createElement('small');
		date.textContent = `Requested ${formatAccountDate(accessRequest.created_at)} · Auto-approval ${formatAccountDate(accessRequest.approval_due_at)}`;
		details.append(name, meta, country, date);
		const actions = document.createElement('div');
		actions.className = 'approval-actions';
		const approve = document.createElement('button');
		approve.type = 'button';
		approve.className = 'review-button approve';
		approve.textContent = 'Approve';
		const decline = document.createElement('button');
		decline.type = 'button';
		decline.className = 'review-button decline';
		decline.textContent = 'Decline';
		approve.addEventListener('click', () => reviewRequest(accessRequest, 'approve', approve, decline));
		decline.addEventListener('click', () => reviewRequest(accessRequest, 'decline', approve, decline));
		actions.append(approve, decline);
		item.append(details, actions);
		list.append(item);
	}
}

async function reviewRequest(accessRequest, decision, approve, decline) {
	if (decision === 'decline' && !confirm(`Decline the access request from ${accessRequest.full_name}?`)) return;
	approve.disabled = true;
	decline.disabled = true;
	try {
		const result = await request('review-user', 'POST', { id: accessRequest.id, decision });
		showMessage('approvalMessage', result.noticeSent ? `${result.message} Email sent.` : `${result.message} Email notification could not be sent.`, true);
		await Promise.all([loadUsers(), loadApprovals()]);
	} catch (error) {
		showMessage('approvalMessage', error.message);
		approve.disabled = false;
		decline.disabled = false;
	}
}

function renderUsers(users) {
	const body = byId('staffRows');
	body.replaceChildren();
	if (!users.length) {
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 8;
		cell.className = 'empty';
		cell.textContent = 'No team members found.';
		row.append(cell);
		body.append(row);
		return;
	}
	for (const user of users) {
		const row = document.createElement('tr');
		const personCell = document.createElement('td');
		personCell.dataset.label = 'Team member';
		const person = document.createElement('div');
		person.className = 'person';
		const avatar = document.createElement('span');
		avatar.className = 'avatar';
		if (user.has_avatar) {
			const image = document.createElement('img');
			image.src = `/api?action=member-avatar&id=${encodeURIComponent(user.id)}`;
			image.alt = '';
			avatar.append(image);
		} else avatar.textContent = avatarIcon(user.member_type === 'instrumentalist' ? 'guitar' : user.member_type === 'seller' ? 'keyboard' : 'microphone');
		const name = document.createElement('span');
		name.textContent = user.name;
		person.append(avatar, name);
		personCell.append(person);
		const usernameCell = document.createElement('td');
		usernameCell.dataset.label = 'Username / email';
		usernameCell.textContent = `${user.username}${user.email ? ` · ${user.email}` : ''}`;
		const countryCell = document.createElement('td');
		countryCell.dataset.label = 'Country joined from';
		countryCell.textContent = `${countryFlag(user.countryCode)} ${user.country || 'Not provided'}`.trim();
		const roleCell = document.createElement('td');
		roleCell.dataset.label = 'Role / type';
		const roleType = `${roleLabel(user.role)} · ${memberTypeLabel(user.member_type)}`;
		if (currentAccount.role === 'admin' && user.id !== currentAccount.id) {
			const roleEditor = document.createElement('div');
			roleEditor.className = 'role-editor';
			const roleSelect = document.createElement('select');
			roleSelect.className = 'role-select';
			roleSelect.setAttribute('aria-label', `Role for ${user.name}`);
			for (const [value, label] of [['viewer', 'Musician'], ['staff', 'Staff'], ['admin', 'Admin']]) roleSelect.add(new Option(label, value));
			roleSelect.value = user.role;
			const saveRole = document.createElement('button');
			saveRole.type = 'button';
			saveRole.className = 'review-button';
			saveRole.textContent = 'Save';
			saveRole.addEventListener('click', () => changeUserRole(user, roleSelect.value, saveRole));
			roleEditor.append(roleSelect, saveRole);
			roleCell.append(roleEditor, document.createTextNode(roleType));
		} else roleCell.textContent = roleType;
		const joinedCell = document.createElement('td');
		joinedCell.dataset.label = 'Joined';
		joinedCell.textContent = formatAccountDate(user.created_at);
		const signInCell = document.createElement('td');
		signInCell.dataset.label = 'Last sign-in';
		signInCell.textContent = formatAccountDate(user.last_sign_in);
		const signOutCell = document.createElement('td');
		signOutCell.dataset.label = 'Last sign-out';
		signOutCell.textContent = formatAccountDate(user.last_sign_out);
		const accessCell = document.createElement('td');
		accessCell.dataset.label = 'Access';
		if (currentAccount.role === 'admin' && user.id !== currentAccount.id) {
			const remove = document.createElement('button');
			remove.className = 'remove-button';
			remove.type = 'button';
			remove.textContent = 'Delete account';
			remove.setAttribute('aria-label', `Delete ${user.name}`);
			remove.addEventListener('click', () => deleteAccount(user));
			accessCell.append(remove);
		} else {
			const viewOnly = document.createElement('span');
			viewOnly.className = 'view-only';
			viewOnly.textContent = 'VIEW ONLY';
			accessCell.append(viewOnly);
		}
		row.append(personCell, usernameCell, countryCell, roleCell, joinedCell, signInCell, signOutCell, accessCell);
		body.append(row);
	}
}

async function changeUserRole(user, role, button) {
	if (role === user.role) return;
	if (!confirm(`Change ${user.name}'s role from ${roleLabel(user.role)} to ${roleLabel(role)}?`)) return;
	button.disabled = true;
	try {
		const result = await request('change-user-role', 'POST', { id: user.id, role });
		showMessage('directoryMessage', result.message, true);
		await loadUsers();
	} catch (error) { showMessage('directoryMessage', error.message); }
	finally { button.disabled = false; }
}

async function deleteAccount(user) {
	if (!confirm(`Delete ${user.role} account ${user.name}? It will be moved to the deleted-accounts archive and can be restored by an admin.`)) return;
	try {
		const result = await request('delete-account', 'POST', { id: user.id });
		showMessage('directoryMessage', result.message, true);
		await loadUsers();
		await loadDeletedUsers();
	} catch (error) { showMessage('directoryMessage', error.message); }
}

byId('togglePassword')?.addEventListener('click', (event) => {
	const input = byId('password');
	const show = input.type === 'password';
	input.type = show ? 'text' : 'password';
	event.currentTarget.textContent = show ? 'Hide' : 'Show';
	event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

byId('setupForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const worldTab = openPendingWorldTab();
	try {
		const result = await request('setup', 'POST', formValues(event.currentTarget));
		csrfToken = result.csrfToken;
		openWorkspace(result.user);
		openWorldTab(worldTab);
	} catch (error) { if (worldTab && !worldTab.closed) worldTab.close(); showMessage('setupMessage', error.message); }
});

byId('loginForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const worldTab = openPendingWorldTab();
	showMessage('loginMessage', '');
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	const originalText = button.innerHTML;
	const values = formValues(form);
	button.disabled = true;
	button.textContent = 'Checking securely…';
	try {
		const result = await request('login', 'POST', values);
		csrfToken = result.csrfToken;
		void savePassword(values, 'savePassword');
		openWorkspace(result.user);
		openWorldTab(worldTab);
	} catch (error) { if (worldTab && !worldTab.closed) worldTab.close(); showMessage('loginMessage', error.message); }
	finally { button.disabled = false; button.innerHTML = originalText; }
});

byId('signupForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const values = formValues(form);
	try {
		const result = await request('signup', 'POST', values);
		form.reset();
		setStep('login');
		let message = result.emailSent
			? `${result.message} A confirmation email is on its way.`
			: `${result.message} Email could not be sent; contact the administrator if you need an update.`;
		if (!result.adminNotified) message += ' The request remains visible in the administrator dashboard.';
		showMessage('loginMessage', message, true);
	} catch (error) { showMessage('signupMessage', error.message); }
});

byId('showSignupButton')?.addEventListener('click', () => {
	showMessage('signupMessage', '');
	setStep('signup');
	byId('signupName').focus();
});
byId('cancelSignupButton')?.addEventListener('click', () => setStep('login'));

byId('showRecoveryButton')?.addEventListener('click', () => {
	byId('recoveryRequestForm').reset();
	byId('recoveryVerifyForm').reset();
	byId('recoveryRequestForm').hidden = false;
	byId('recoveryVerifyForm').hidden = true;
	byId('recoveryRequestIdentity').value = byId('username').value.trim();
	showMessage('recoveryRequestMessage', '');
	showMessage('recoveryVerifyMessage', '');
	setStep('recovery');
	byId('recoveryRequestIdentity').focus();
});

byId('recoveryRequestForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const button = form.querySelector('[type="submit"]');
	const identity = byId('recoveryRequestIdentity').value.trim();
	button.disabled = true;
	showMessage('recoveryRequestMessage', '');
	try {
		const result = await request('request-recovery-code', 'POST', { identity });
		byId('recoveryIdentity').value = identity;
		form.hidden = true;
		byId('recoveryVerifyForm').hidden = false;
		showMessage('recoveryVerifyMessage', result.message, true);
		byId('recoveryCode').focus();
	} catch (error) {
		showMessage('recoveryRequestMessage', error.message);
	} finally {
		button.disabled = false;
	}
});

byId('recoveryVerifyForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const values = formValues(event.currentTarget);
	if (values.newPassword !== values.confirmPassword) {
		showMessage('recoveryVerifyMessage', 'The new passwords do not match.');
		return;
	}
	const button = event.currentTarget.querySelector('[type="submit"]');
	button.disabled = true;
	try {
		const result = await request('recover-password', 'POST', values);
		const identity = values.identity;
		event.currentTarget.reset();
		byId('recoveryRequestForm').reset();
		byId('recoveryRequestForm').hidden = false;
		byId('recoveryVerifyForm').hidden = true;
		setStep('login');
		byId('username').value = identity;
		showMessage('loginMessage', result.message, true);
		byId('password').focus();
	} catch (error) {
		showMessage('recoveryVerifyMessage', error.message);
	} finally {
		button.disabled = false;
	}
});

byId('resendRecoveryButton')?.addEventListener('click', async (event) => {
	const button = event.currentTarget;
	button.disabled = true;
	try {
		const result = await request('request-recovery-code', 'POST', { identity: byId('recoveryIdentity').value });
		showMessage('recoveryVerifyMessage', result.message, true);
	} catch (error) {
		showMessage('recoveryVerifyMessage', error.message);
	} finally {
		button.disabled = false;
	}
});

byId('cancelRecoveryButton')?.addEventListener('click', () => {
	byId('recoveryRequestForm').reset();
	byId('recoveryVerifyForm').reset();
	byId('recoveryRequestForm').hidden = false;
	byId('recoveryVerifyForm').hidden = true;
	setStep('login');
});

byId('emailSettingsForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		const result = await request('update-email', 'POST', { email: byId('accountEmail').value.trim() });
		showMessage('accountMessage', result.message, true);
	} catch (error) { showMessage('accountMessage', error.message); }
});

byId('passwordSettingsForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const values = formValues(form);
	if (values.newPassword !== values.confirmPassword) {
		showMessage('passwordSettingsMessage', 'The new passwords do not match.');
		return;
	}
	try {
		const result = await request('change-password', 'POST', values);
		form.reset();
		showMessage('passwordSettingsMessage', result.message, true);
	} catch (error) { showMessage('passwordSettingsMessage', error.message); }
});

byId('staffForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = event.currentTarget instanceof HTMLFormElement ? event.currentTarget : byId('staffForm');
	try {
		const result = await request('create-user', 'POST', formValues(form));
		showMessage('staffMessage', result.message, true);
		if (form && typeof form.reset === 'function') form.reset();
		await loadUsers();
	} catch (error) { showMessage('staffMessage', error.message); }
});

byId('logoutButton')?.addEventListener('click', async () => {
	try {
		await request('logout', 'POST');
		currentAccount = null;
		signingKey = null;
		window.clearInterval(window.adminPresenceTimer);
		window.adminPresenceTimer = null;
		byId('adminCurrentTime')?.replaceChildren();
		await loadState();
	} catch (error) { showMessage('directoryMessage', error.message); }
});

byId('signMessageButton')?.addEventListener('click', async () => {
	const message = byId('signatureMessage').value.trim();
	if (!message || !signingKey || !currentAccount) {
		showMessage('signatureMessageStatus', 'Enter a statement before signing.');
		return;
	}
	const button = byId('signMessageButton');
	button.disabled = true;
	try {
		const record = { format: 'northstar-ecdsa-v1', algorithm: 'ECDSA-P256-SHA256', signer: currentAccount.username, signedAt: new Date().toISOString(), message, publicKey: signingKey.publicKey };
		record.signature = toBase64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey.privateKey, new TextEncoder().encode(signaturePayload(record))));
		byId('signatureRecord').value = JSON.stringify(record, null, 2);
		byId('signatureResult').hidden = false;
		showMessage('signatureMessageStatus', 'Statement signed. Download the record to share it.', true);
	} catch (error) { showMessage('signatureMessageStatus', `Could not sign this statement: ${error.message}`); }
	finally { button.disabled = false; }
});

byId('downloadSignatureButton')?.addEventListener('click', () => {
	const record = byId('signatureRecord').value;
	if (!record) return;
	const fileUrl = URL.createObjectURL(new Blob([record], { type: 'application/json' }));
	const link = document.createElement('a');
	link.href = fileUrl;
	link.download = 'northstar-signed-record.json';
	link.click();
	URL.revokeObjectURL(fileUrl);
});

byId('verifySignatureButton')?.addEventListener('click', async () => {
	const file = byId('signatureFile').files[0];
	const status = byId('signatureVerifyStatus');
	status.textContent = '';
	if (!file) { status.textContent = 'Choose a signed JSON record first.'; return; }
	if (file.size > 100000) { status.textContent = 'That file is too large to verify.'; return; }
	try {
		const record = JSON.parse(await file.text());
		if (record.format !== 'northstar-ecdsa-v1' || record.algorithm !== 'ECDSA-P256-SHA256' || typeof record.signer !== 'string' || typeof record.signedAt !== 'string' || typeof record.message !== 'string' || typeof record.publicKey !== 'string' || typeof record.signature !== 'string') throw new Error('This is not a supported signed record.');
		const { keys } = await request('signature-keys', 'GET');
		const registered = keys[record.signer] || Object.entries(keys).find(([name]) => name.toLowerCase() === record.signer.toLowerCase())?.[1];
		if (!registered || registered !== record.publicKey) throw new Error('The signer key is not registered to that account, or the record contains a different key.');
		const publicKey = await crypto.subtle.importKey('spki', fromBase64(registered), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
		const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, fromBase64(record.signature), new TextEncoder().encode(signaturePayload(record)));
		status.textContent = valid ? `Signature is valid for this statement. Claimed signer: ${record.signer}.` : 'Signature is invalid or the statement changed.';
		status.classList.toggle('success', valid);
	} catch (error) {
		status.textContent = error instanceof SyntaxError ? 'The selected file is not valid JSON.' : (error.message || 'Could not verify this record.');
		status.classList.remove('success');
	}
});

async function loadDeletedUsers() {
	try {
		const result = await request('deleted-users', 'GET');
		renderDeletedUsers(result.deletedUsers);
	} catch (error) {
		showMessage('deletedMessage', error.message);
	}
}

async function restoreDeletedAccount(record) {
	if (!confirm(`Restore ${record.full_name} (${record.username}) back to the active directory?`)) return;
	try {
		const result = await request('restore-account', 'POST', { id: record.id });
		showMessage('deletedMessage', result.message, result.passwordRestored);
		await loadDeletedUsers();
		await loadUsers();
	} catch (error) {
		showMessage('deletedMessage', error.message);
	}
}

function renderDeletedUsers(deletedUsers) {
	const body = byId('deletedRows');
	const countEl = byId('deletedCount');
	body.replaceChildren();
	countEl.textContent = `${deletedUsers.length} record${deletedUsers.length !== 1 ? 's' : ''}`;
	if (!deletedUsers.length) {
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 7;
		cell.className = 'empty';
		cell.textContent = 'No deleted accounts on record.';
		row.append(cell);
		body.append(row);
		return;
	}
	for (const du of deletedUsers) {
		const row = document.createElement('tr');
		const nameCell = document.createElement('td');
		nameCell.dataset.label = 'Name';
		const person = document.createElement('div');
		person.className = 'person';
		const avatar = document.createElement('span');
		avatar.className = 'avatar';
		avatar.textContent = (du.full_name || '').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '—';
		const nameSpan = document.createElement('span');
		nameSpan.textContent = du.full_name || 'Unknown';
		person.append(avatar, nameSpan);
		nameCell.append(person);
		const usernameCell = document.createElement('td');
		usernameCell.dataset.label = 'Username';
		usernameCell.textContent = du.username || '—';
		const countryCell = document.createElement('td');
		countryCell.dataset.label = 'Country joined from';
		countryCell.textContent = du.country || 'Not provided';
		const roleCell = document.createElement('td');
		roleCell.dataset.label = 'Role';
		roleCell.textContent = du.role || '—';
		const deletedAtCell = document.createElement('td');
		deletedAtCell.dataset.label = 'Deleted';
		deletedAtCell.textContent = du.deleted_at ? new Date(`${du.deleted_at.replace(' ', 'T')}Z`).toLocaleDateString() : '—';
		const deletedByCell = document.createElement('td');
		deletedByCell.dataset.label = 'Deleted by';
		const badge = document.createElement('span');
		badge.className = 'view-only';
		badge.textContent = du.deleted_by_username || '—';
		deletedByCell.append(badge);
		const actionCell = document.createElement('td');
		actionCell.dataset.label = 'Restore';
		const restore = document.createElement('button');
		restore.type = 'button';
		restore.className = 'review-button approve';
		restore.textContent = 'Restore';
		restore.addEventListener('click', () => restoreDeletedAccount(du));
		actionCell.append(restore);
		row.append(nameCell, usernameCell, countryCell, roleCell, deletedAtCell, deletedByCell, actionCell);
		body.append(row);
	}
}

async function loadBackups() {
	try {
		const result = await request('list-backups', 'GET');
		renderBackups(result.backups || [], result.remote);
	} catch (error) {
		showMessage('backupMessage', error.message);
	}
}

function renderBackups(backups, remote) {
	const body = byId('backupRows');
	body.replaceChildren();
	if (remote) {
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 4; cell.className = 'empty';
		cell.textContent = 'Using remote Turso database — backups are managed by Turso.';
		row.append(cell); body.append(row);
		return;
	}
	if (!backups.length) {
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 4; cell.className = 'empty';
		cell.textContent = 'No backups found. Click "Back up now" to create one.';
		row.append(cell); body.append(row);
		return;
	}
	for (const b of backups) {
		const row = document.createElement('tr');
		const dateCell = document.createElement('td');
		dateCell.dataset.label = 'Date'; dateCell.textContent = b.date;
		const fileCell = document.createElement('td');
		fileCell.dataset.label = 'File'; fileCell.textContent = b.filename;
		fileCell.style.fontFamily = 'var(--mono)'; fileCell.style.fontSize = '10px';
		const sizeCell = document.createElement('td');
		sizeCell.dataset.label = 'Size';
		sizeCell.textContent = b.sizeBytes > 1024 ? `${Math.round(b.sizeBytes / 1024)} KB` : `${b.sizeBytes} B`;
		const actionCell = document.createElement('td');
		actionCell.dataset.label = 'Restore config';
		const btn = document.createElement('button');
		btn.type = 'button'; btn.className = 'review-button';
		btn.textContent = 'Restore config';
		btn.addEventListener('click', () => restoreConfig(b.filename, btn));
		actionCell.append(btn);
		row.append(dateCell, fileCell, sizeCell, actionCell);
		body.append(row);
	}
}

byId('manualBackupButton')?.addEventListener('click', async () => {
	const btn = byId('manualBackupButton');
	btn.disabled = true;
	btn.textContent = 'Backing up…';
	showMessage('backupMessage', '');
	try {
		const result = await request('manual-backup', 'POST');
		showMessage('backupMessage', result.message, true);
		renderBackups(result.backups || []);
	} catch (error) {
		showMessage('backupMessage', error.message);
	} finally {
		btn.disabled = false;
		btn.textContent = 'Back up now';
	}
});

async function restoreConfig(filename, btn) {
	if (!confirm(`Restore configuration (pepper key) from backup "${filename}"?\n\nThis changes the encryption configuration only — NO user data will be changed. You must restart the server after restoring.`)) return;
	btn.disabled = true;
	btn.textContent = 'Restoring…';
	showMessage('backupMessage', '');
	try {
		const result = await request('restore-config', 'POST', { filename });
		showMessage('backupMessage', result.message, true);
	} catch (error) {
		showMessage('backupMessage', error.message);
	} finally {
		btn.disabled = false;
		btn.textContent = 'Restore config';
	}
}

async function loadState() {
	if (location.protocol === 'file:') {
		if (loginView) {
			setStep('login');
			showMessage('loginMessage', 'Serve this page with the Node.js app at http://127.0.0.1:8001 instead of opening the HTML file.');
		} else location.replace('/');
		return;
	}
	try {
		const state = await request('state', 'GET');
		csrfToken = state.csrfToken;
		googleSignInNonce = state.googleNonce;
		initializeCountryOptions(state.countries);
		const recoveryButton = byId('recoveryCodeRequestButton');
		if (recoveryButton) recoveryButton.disabled = !state.emailRecoveryAvailable;
		const recoverySetupNote = byId('recoverySetupNote');
		if (recoverySetupNote) recoverySetupNote.hidden = Boolean(state.emailRecoveryAvailable);
		initializeGoogleSignIn(state.googleClientId);
		const splash = byId('welcomeSplash');
		if (state.user) {
			if (splash) splash.hidden = true;
		}
		if (state.user && mobileMode && loginView) {
			location.replace('/world.html?mobile=1');
			return;
		} else if (state.user) {
			openWorkspace(state.user);
		} else if (loginView) {
			history.replaceState(null, '', '#signin');
			setStep(state.setupRequired ? 'setup' : 'login');
		} else location.replace(mobileMode ? '/mobile' : '/');
	} catch (error) {
		if (loginView) {
			setStep('login');
			showMessage('loginMessage', error.message);
		} else location.replace(mobileMode ? '/mobile' : '/');
	}
}

void loadState();
