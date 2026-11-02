'use strict';

function html(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function emailConfigured() {
	return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

async function sendEmail(to, subject, text, htmlContent) {
	if (!to) return false;
	if (!emailConfigured()) {
		console.error('Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
		return false;
	}
	try {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html: htmlContent }),
		});
		if (!response.ok) {
			let providerError = '';
			try {
				const result = await response.json();
				providerError = [result.name, result.message].filter(Boolean).join(': ');
			} catch { }
			console.error(`Email delivery failed with status ${response.status}.${providerError ? ` ${providerError}` : ''}`);
			return false;
		}
		return true;
	} catch (error) {
		console.error('Email delivery failed:', error.message);
		return false;
	}
}

function requestReceived(user) {
	const name = html(user.full_name);
	return {
		subject: 'Your Musicians World access request was received',
		text: `Hello ${user.full_name}, your access request was received. An administrator may review it sooner; if no decision is made, your account will be approved automatically after 24 hours.`,
		html: `<p>Hello ${name},</p><p>Your access request was received. An administrator may review it sooner; if no decision is made, your account will be approved automatically after 24 hours.</p><p>— Musicians World</p>`,
	};
}

function recoveryCodeNotice(user, code) {
	const name = html(user.full_name);
	return {
		subject: 'Your Musicians World account recovery code',
		text: `Hello ${user.full_name}, your account recovery code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
		html: `<p>Hello ${name},</p><p>Your Musicians World account recovery code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:5px">${code}</p><p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`,
	};
}

function reviewNotice(user, approved) {
	const name = html(user.full_name);
	const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
	const appUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || (vercelHost ? `https://${vercelHost}` : 'http://127.0.0.1:8000');
	const status = approved ? 'approved' : 'declined';
	return {
		subject: `Your Musicians World access request was ${status}`,
		text: approved
			? `Hello ${user.full_name}, your account has been approved. You can now sign in at ${appUrl}.`
			: `Hello ${user.full_name}, your access request was declined. Contact the administrator if you believe this is an error.`,
		html: approved
			? `<p>Hello ${name},</p><p>Your account has been approved. You can now <a href="${html(appUrl)}">sign in</a>.</p><p>— Musicians World</p>`
			: `<p>Hello ${name},</p><p>Your access request was declined. Contact the administrator if you believe this is an error.</p><p>— Musicians World</p>`,
	};
}

function adminRequestNotice(user) {
	const name = html(user.full_name);
	const email = html(user.email);
	const username = html(user.username);
	const country = html(user.country || 'Not provided');
	return {
		subject: `Access request from ${user.full_name}`,
		text: `A new account is waiting for review. Name: ${user.full_name}. Username: ${user.username}. Email: ${user.email}. Country joining from: ${user.country || 'Not provided'}. Sign in to the admin dashboard to approve or decline it. If no decision is made, access is approved automatically after 24 hours.`,
		html: `<p>A new account is waiting for review.</p><ul><li>Name: ${name}</li><li>Username: ${username}</li><li>Email: ${email}</li><li>Country joining from: ${country}</li></ul><p>Sign in to the admin dashboard to approve or decline it. If no decision is made, access is approved automatically after 24 hours.</p>`,
	};
}

module.exports = { adminRequestNotice, emailConfigured, recoveryCodeNotice, requestReceived, reviewNotice, sendEmail };
