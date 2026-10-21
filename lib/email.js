'use strict';

function html(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function emailConfigured() {
	return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendEmail(to, subject, text, htmlContent) {
	if (!emailConfigured() || !to) return false;
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
			console.error(`Email delivery failed with status ${response.status}.`);
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
		text: `Hello ${user.full_name}, your access request was received. An administrator will review it and email you when it is approved.`,
		html: `<p>Hello ${name},</p><p>Your access request was received. An administrator will review it and email you when it is approved.</p><p>— Musicians World</p>`,
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
	const appUrl = process.env.APP_URL || (vercelHost ? `https://${vercelHost}` : 'http://127.0.0.1:8000');
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
	return {
		subject: `Access request from ${user.full_name}`,
		text: `A new account is waiting for review. Name: ${user.full_name}. Username: ${user.username}. Email: ${user.email}. Sign in to the admin dashboard to approve or decline it.`,
		html: `<p>A new account is waiting for review.</p><ul><li>Name: ${name}</li><li>Username: ${username}</li><li>Email: ${email}</li></ul><p>Sign in to the admin dashboard to approve or decline it.</p>`,
	};
}

module.exports = { adminRequestNotice, emailConfigured, recoveryCodeNotice, requestReceived, reviewNotice, sendEmail };
